import threading
# Job tracking for cancellation
transcription_jobs = {}






"""
FastAPI backend for video and audio transcription using OpenAI Whisper.

This service exposes a single `/transcribe` endpoint that accepts either
uploaded files or a URL. It uses the `openai/whisper-large-v2` model via
Hugging Face Transformers to convert speech to text in the target language.

The endpoint will accept up to three files at once or a single URL.  For
videos, the audio track is extracted using MoviePy.  Downloads of remote
media are handled via `yt-dlp` so that common video platforms (such as
YouTube) are supported.

To run the server locally:

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The corresponding React front‑end is found in the `frontend/` directory.
"""

import os
import uuid
import shutil
from typing import List, Optional
from fastapi.responses import FileResponse

from fastapi import FastAPI, UploadFile, File, Form, HTTPException

from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from auth import router as auth_router


from transformers import WhisperProcessor, WhisperForConditionalGeneration
import torch
import numpy as np
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    # MoviePy is used to extract audio from video files.  If it's not
    # installed, videos cannot be processed.  See requirements.txt.
    import moviepy.editor as mp
except ImportError as exc:
    mp = None



# Directory to store exported transcriptions
EXPORT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "exports"))
os.makedirs(EXPORT_DIR, exist_ok=True)



app = FastAPI(title="Video & Audio Transcription API")

# List exported .txt files endpoint (protected)
from fastapi import Depends
from auth import get_current_user, User

@app.get("/exported-files")
def list_exported_files(current_user: User = Depends(get_current_user)):
    try:
        files = [
            {
                "filename": f,
                "download_url": f"/export/{f}"
            }
            for f in os.listdir(EXPORT_DIR) if f.endswith(".txt")
        ]
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
app.include_router(auth_router)

# Allow CORS from any origin during development.  In production this should
# be restricted to trusted domains (e.g. the React front‑end).
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


import logging
logging.basicConfig(level=logging.INFO, format='[%(asctime)s] %(levelname)s: %(message)s')

# Supported models
WHISPER_MODELS = {
    "base": "openai/whisper-base",
    "small": "openai/whisper-small",
    "large": "openai/whisper-large-v2"
}

MODEL_CACHE = {}

def get_model_and_processor(model_size: str):
    if model_size not in WHISPER_MODELS:
        raise ValueError(f"Unsupported model size: {model_size}")
    if model_size not in MODEL_CACHE:
        logging.info(f"Loading Whisper model: {model_size}")
        processor = WhisperProcessor.from_pretrained(WHISPER_MODELS[model_size])
        model = WhisperForConditionalGeneration.from_pretrained(WHISPER_MODELS[model_size])
        device = "cuda" if torch.cuda.is_available() else "cpu"
        model.to(device)
        MODEL_CACHE[model_size] = (processor, model, device)
    return MODEL_CACHE[model_size]


def extract_audio_from_video(video_path: str, temp_dir: str) -> str:
    """Extract the audio track from a video file and return the path to a temporary WAV file.

    The audio is resampled to 16 kHz mono PCM (`pcm_s16le`) to match Whisper's
    expectations.
    """
    if mp is None:
        raise RuntimeError(
            "moviepy is not installed. Please install moviepy to transcribe video files."
        )
    clip = mp.VideoFileClip(video_path)
    audio_path = os.path.join(temp_dir, f"{uuid.uuid4()}.wav")
    # Write audio as 16 kHz mono PCM WAV.  MoviePy will spawn ffmpeg
    # internally; ensure ffmpeg is installed on your system for this to work.
    clip.audio.write_audiofile(
        audio_path,
        fps=16000,
        codec="pcm_s16le",
        verbose=False,
        logger=None,
    )
    clip.close()
    return audio_path




def transcribe_audio(audio_path: str, language: str, task: str, model_size: str = "large", chunk_length_s: int = 30, max_workers: int = 2, job_id: str = None) -> str:
    """
    Transcribe a single audio file into the requested language, using chunking and parallel processing.
    Splits the audio into chunks of chunk_length_s seconds and transcribes them in parallel.
    Checks for cancellation if job_id is provided.
    """
    import soundfile as sf

    processor, model, device = get_model_and_processor(model_size)

    logging.info(f"Loading audio file: {audio_path}")
    audio_array, sample_rate = sf.read(audio_path)
    total_samples = audio_array.shape[0]
    chunk_size = chunk_length_s * sample_rate
    num_chunks = int(np.ceil(total_samples / chunk_size))
    logging.info(f"Audio length: {total_samples/sample_rate:.2f}s, sample_rate: {sample_rate}, chunks: {num_chunks}")

    def transcribe_chunk(chunk_idx):
        # Check for cancellation before each chunk
        if job_id and transcription_jobs.get(job_id, {}).get('cancelled'):
            raise Exception("Transcription cancelled")
        start = int(chunk_idx * chunk_size)
        end = int(min((chunk_idx + 1) * chunk_size, total_samples))
        chunk_audio = audio_array[start:end]
        if len(chunk_audio.shape) > 1:
            chunk_audio = np.mean(chunk_audio, axis=1)  # convert to mono if needed
        logging.info(f"Transcribing chunk {chunk_idx+1}/{num_chunks} ({(end-start)/sample_rate:.2f}s)")
        inputs = processor(chunk_audio, sampling_rate=sample_rate, return_tensors="pt").input_features.to(device)
        forced_decoder_ids = processor.get_decoder_prompt_ids(language=language, task=task)
        with torch.no_grad():
            generated_ids = model.generate(inputs, forced_decoder_ids=forced_decoder_ids)[0]
        transcription = processor.decode(generated_ids, skip_special_tokens=True)
        return transcription.strip()

    results = [None] * num_chunks
    try:
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_idx = {executor.submit(transcribe_chunk, idx): idx for idx in range(num_chunks)}
            for future in as_completed(future_to_idx):
                idx = future_to_idx[future]
                try:
                    results[idx] = future.result()
                except Exception as exc:
                    results[idx] = f"[Error in chunk {idx}: {exc}]"
    finally:
        if job_id:
            transcription_jobs.pop(job_id, None)

    return " ".join(results)


@app.post("/transcribe")
async def transcribe(
    files: List[UploadFile] = File([]),
    url: Optional[str] = Form(None),
    language: str = Form("english"),
    task: str = Form("transcribe"),
    model_size: str = Form("large"),
    job_id: Optional[str] = Form(None),
):
    """Transcribe uploaded audio/video files or a remote video/audio URL.

    Either `files` or `url` must be provided.  A maximum of three files
    may be uploaded at once.  The optional `language` and `task` form
    fields allow the caller to specify the target language and whether
    to perform transcription (speech recognition) or translation.
    """

    if not files and not url:
        raise HTTPException(status_code=400, detail="No files or URL provided")


    # Generate or use job_id for this transcription
    if not job_id:
        job_id = str(uuid.uuid4())
    transcription_jobs[job_id] = {"cancelled": False, "thread": threading.current_thread()}

    results = []
    temp_dir = os.path.join("/tmp" if os.name != "nt" else os.environ.get("TEMP", "C:\\Temp"), f"transcribe-{uuid.uuid4()}")
    os.makedirs(temp_dir, exist_ok=True)
    try:
        # Process uploaded files
        if files:
            if len(files) > 10:
                raise HTTPException(status_code=400, detail="Maximum of 10 files allowed")
            for uploaded in files:
                filename = uploaded.filename
                file_path = os.path.join(temp_dir, filename)
                with open(file_path, "wb") as f:
                    shutil.copyfileobj(uploaded.file, f)
                ext = os.path.splitext(filename)[1].lower()
                audio_path = file_path
                if ext in [".mp4", ".mkv", ".mov", ".avi", ".webm", ".flv", ".mpeg", ".mpg"]:
                    audio_path = extract_audio_from_video(file_path, temp_dir)
                logging.info(f"Transcribing file: {filename} using model: {model_size}")
                try:
                    transcript = transcribe_audio(audio_path, language, task, model_size=model_size, job_id=job_id)
                except Exception as exc:
                    transcript = f"[Cancelled or error: {exc}]"
                base_name = os.path.splitext(filename)[0]
                export_filename = f"{base_name}.txt"
                export_path = os.path.join(EXPORT_DIR, export_filename)
                with open(export_path, "w", encoding="utf-8") as txtf:
                    txtf.write(transcript)
                download_url = f"/export/{export_filename}"
                results.append({
                    "filename": filename,
                    "transcription": transcript,
                    "download_url": download_url
                })

        # Process a remote URL
        if url:
            import yt_dlp

            ydl_opts = {
                'outtmpl': os.path.join(temp_dir, '%(id)s.%(ext)s'),
                'format': 'bestvideo+bestaudio/best',
                'merge_output_format': 'mp4',
                'quiet': True,
            }
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                file_path = ydl.prepare_filename(info)
            ext = os.path.splitext(file_path)[1].lower()
            audio_path = file_path
            if ext not in [".wav", ".flac", ".mp3", ".m4a", ".ogg"]:
                audio_path = extract_audio_from_video(file_path, temp_dir)
            logging.info(f"Transcribing URL file: {os.path.basename(file_path)} using model: {model_size}")
            transcript = transcribe_audio(audio_path, language, task, model_size=model_size, job_id=job_id)
            base_name = os.path.splitext(os.path.basename(file_path))[0]
            export_filename = f"{base_name}.txt"
            export_path = os.path.join(EXPORT_DIR, export_filename)
            with open(export_path, "w", encoding="utf-8") as txtf:
                txtf.write(transcript)
            download_url = f"/export/{export_filename}"
            results.append({
                "filename": os.path.basename(file_path),
                "transcription": transcript,
                "download_url": download_url
            })
        return {"results": results, "job_id": job_id}
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)

# Cancel endpoint
@app.post("/cancel/{job_id}")
def cancel_transcription(job_id: str):
    temp_dir = os.path.join("/tmp" if os.name != "nt" else os.environ.get("TEMP", "C:\\Temp"), f"transcribe-{uuid.uuid4()}")
    os.makedirs(temp_dir, exist_ok=True)
    try:
        if job_id in transcription_jobs:
            transcription_jobs[job_id]["cancelled"] = True
            return {"status": "cancelling"}
        return {"status": "not_found"}
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


# Endpoint to serve exported .txt files
@app.get("/export/{filename}")
def download_transcription(filename: str):
    file_path = os.path.join(EXPORT_DIR, filename)
    if not os.path.isfile(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path, media_type="text/plain", filename=filename)