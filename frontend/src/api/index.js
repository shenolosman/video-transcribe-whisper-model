// src/api/index.js

const API_BASE = '';

export async function login(username, password) {
  // FastAPI OAuth2PasswordRequestForm expects x-www-form-urlencoded
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);
  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  if (!res.ok) throw new Error('Invalid credentials');
  return res.json();
}

export async function transcribe({ files, url, language, modelSize, token, signal }) {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  if (url) formData.append('url', url);
  formData.append('language', language);
  formData.append('task', 'transcribe');
  formData.append('model_size', modelSize);
  const res = await fetch(`${API_BASE}/transcribe`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
    signal,
  });
  if (!res.ok) throw new Error('Transcription failed');
  return res.json();
}

export async function getExportedFiles(token) {
  const res = await fetch(`${API_BASE}/exported-files`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Unauthorized');
  return res.json();
}
