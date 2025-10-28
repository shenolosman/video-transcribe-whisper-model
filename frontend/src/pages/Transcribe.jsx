import React, { useState, useRef } from 'react';
import { transcribe as apiTranscribe } from '../api';

export default function Transcribe({ user }) {
  const [files, setFiles] = useState([]);
  const [url, setUrl] = useState('');
  const [language, setLanguage] = useState('english');
  const [modelSize, setModelSize] = useState('base');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef(null);
  const [jobId, setJobId] = useState(null);

  const handleFilesChange = (event) => {
    const selected = Array.from(event.target.files).slice(0, 10);
    setFiles(selected);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (files.length === 0 && url.trim() === '') return;
    setLoading(true);
    setResults([]);
    setJobId(null);
    abortControllerRef.current = new window.AbortController();
    try {
      const data = await apiTranscribe({
        files,
        url,
        language,
        modelSize,
        token: user?.token,
        signal: abortControllerRef.current.signal,
      });
      setResults(data.results || []);
      if (data.job_id) setJobId(data.job_id);
    } catch (error) {
      if (error.name === 'AbortError') {
        setResults([]);
      } else {
        // eslint-disable-next-line no-console
        console.error('Error during transcription:', error);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (jobId) {
      try {
        await fetch(`/cancel/${jobId}`, { method: 'POST' });
      } catch (e) {
        // ignore
      }
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold mb-2">Video &amp; Audio to Text</h1>
      <p className="mb-4">Convert your audio and video files into subtitles and transcripts.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Paste your link to get the video</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/video"
            className="border p-2 rounded w-full"
          />
        </div>
        <div>
          <label className="block mb-1">Select up to 10 files</label>
          <input type="file" multiple onChange={handleFilesChange} className="block" />
        </div>
        <div>
          <label className="block mb-1">Select language</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="border p-2 rounded w-full">
            <option value="english">English</option>
            <option value="french">French</option>
            <option value="german">German</option>
            <option value="spanish">Spanish</option>
            <option value="italian">Italian</option>
            <option value="turkish">Turkish</option>
          </select>
        </div>
        <div>
          <label className="block mb-1">Select model (speed/quality)</label>
          <select value={modelSize} onChange={e => setModelSize(e.target.value)} className="border p-2 rounded w-full">
            <option value="base">Fast (Base)</option>
            <option value="small">Medium (Small)</option>
            <option value="large">Best (Large)</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
            {loading ? 'Transcribing…' : 'Transcribe'}
          </button>
          {loading && (
            <button type="button" onClick={handleCancel} className="bg-red-500 text-white px-4 py-2 rounded">
              Cancel
            </button>
          )}
        </div>
      </form>
      {results.length > 0 && (
        <div className="results mt-8">
          <h2 className="text-xl font-bold mb-2">Results</h2>
          {results.map((res, idx) => (
            <div key={idx} className="result mb-4 p-4 bg-white rounded shadow">
              <h3 className="font-semibold">{res.filename}</h3>
              <pre className="bg-gray-100 p-2 rounded overflow-x-auto">{res.transcription}</pre>
              {res.download_url && (
                <a
                  href={res.download_url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline mt-2 inline-block"
                >
                  Download TXT
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    
  );
}
