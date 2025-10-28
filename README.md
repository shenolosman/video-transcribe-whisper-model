# Whisper Web Application

This project is a simple full‑stack application for converting video or audio files to text using OpenAI’s Whisper model.  It consists of a Python FastAPI backend and a Vite/React frontend.

## Features

- Upload up to three audio or video files at once and receive transcriptions.
- Provide a URL to a remote video or audio (e.g. YouTube) and get a transcript.
- Choose the target language for transcription or translation using the Whisper model.

## Project structure

```
whisper_webapp/
├── backend/            # FastAPI service
│   ├── main.py         # API implementation
│   └── requirements.txt# Python dependencies
├── frontend/           # React/Vite client
│   ├── index.html      # Main HTML entry point
│   ├── package.json    # NPM dependencies and scripts
│   ├── vite.config.js  # Vite configuration (includes dev proxy)
│   └── src/
│       ├── App.jsx     # Main React component
│       ├── main.jsx    # Entry point for React
│       └── style.css   # Basic styling
└── README.md           # This file
```

## Prerequisites

- **Python 3.9+** with pip.
- **Node.js 18+** with npm.
- **ffmpeg** installed and available on your PATH (required by MoviePy to extract audio from videos).  On macOS you can `brew install ffmpeg`; on Ubuntu run `sudo apt install ffmpeg`.

## Backend setup

1. Navigate into the backend directory:

   ```bash
   cd whisper_webapp/backend
   ```

2. Create a virtual environment (optional but recommended) and install the requirements:

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. Run the server:

   ```bash
   uvicorn main:app --reload --port 8000
   ```

   The API will be available at `http://localhost:8000/transcribe`.

## Frontend setup

1. Open a new terminal and navigate into the frontend directory:

   ```bash
   cd whisper_webapp/frontend
   ```

2. Install the dependencies:

   ```bash
   npm install
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

   The app should be available at `http://localhost:5173`.  Vite is configured to proxy API requests to the backend running on port 8000 during development.

## Deployment notes

- In production, consider serving both frontend and backend from the same domain to avoid CORS issues.  You can build the React app (`npm run build`) and serve the static files from FastAPI using `fastapi.staticfiles`.
- For large production workloads you may wish to fine‑tune or quantize the Whisper model to improve throughput and reduce memory usage.

## Limitations

- Whisper models can be large and will consume significant memory.  The `large‑v2` checkpoint is over 3 GB and may require a machine with at least 16 GB of RAM for smooth operation.
- Video transcription requires `ffmpeg` and `moviepy`.  If `moviepy` is not installed or `ffmpeg` is not available, only pure audio files will be processed.
- The demo UI provides a handful of language options.  Whisper supports many more; add additional `<option>` entries in `src/App.jsx` as needed.