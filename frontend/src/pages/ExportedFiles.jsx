import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getExportedFiles } from '../api';

export default function ExportedFiles({ user }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getExportedFiles(user?.token)
      .then(data => {
        setFiles(data.files || []);
        setLoading(false);
      })
      .catch(err => {
        if (err.message === 'Unauthorized') {
          navigate('/login');
        } else {
          setError('Failed to fetch exported files');
        }
        setLoading(false);
      });
  }, [user, navigate]);

  return (
    <div className="exported-files-container">
      <h2 className="text-2xl font-bold mb-4">Exported Transcriptions</h2>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && files.length === 0 && <p>No exported files found.</p>}
      <ul className="space-y-2">
        {files.map((file, idx) => (
          <li key={idx} className="flex items-center gap-2">
            <a
              href={file.download_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              {file.filename}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
