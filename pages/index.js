'use client';

import { useState } from 'react';

export default function HomePage() {
  const [url, setUrl] = useState('');
  const [language, setLanguage] = useState('en');
  const [logoUrl, setLogoUrl] = useState('');

  async function handleGeneratePDF() {
    if (!url) {
      alert('Please enter a valid URL.');
      return;
    }

    const res = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, language, logoUrl }),
    });

    if (!res.ok) {
      alert('Failed to generate PDF');
      return;
    }

    const blob = await res.blob();
    const fileUrl = URL.createObjectURL(blob);
    window.open(fileUrl, '_blank');
  }

  return (
    <main style={{ padding: 40, maxWidth: 600, margin: 'auto' }}>
      <h1 style={{ marginBottom: 20 }}>Generate Secure QR PDF</h1>

      <label>Target URL *</label>
      <input
        type="text"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://example.com/secure-file"
        style={inputStyle}
        required
      />

      <label>Language</label>
      <select value={language} onChange={(e) => setLanguage(e.target.value)} style={inputStyle}>
        <option value="en">English</option>
        <option value="fr">French</option>
        <option value="it">Italian</option>
        <option value="es">Spanish</option>
        <option value="pt">Portuguese</option>
        <option value="ja">Japanese</option>
        <option value="zh">Chinese</option>
        <option value="ko">Korean</option>
      </select>

      <label>Logo URL (optional)</label>
      <input
        type="text"
        value={logoUrl}
        onChange={(e) => setLogoUrl(e.target.value)}
        placeholder="https://example.com/logo.png"
        style={inputStyle}
      />

      <button onClick={handleGeneratePDF} style={{ marginTop: 20 }}>
        Generate PDF
      </button>
    </main>
  );
}

const inputStyle = {
  display: 'block',
  width: '100%',
  padding: '10px',
  marginTop: '5px',
  marginBottom: '15px',
  fontSize: '16px',
};
