'use client';

import { useState } from 'react';

export default function HomePage() {
  const [url, setUrl] = useState('');
  const [language, setLanguage] = useState('en');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleGeneratePDF() {
    if (!url) {
      alert('Please enter a valid URL.');
      return;
    }

    setLoading(true);

    const res = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        language,
        logoUrl: logoDataUrl || logoUrl,
      }),
    });

    setLoading(false);

    if (!res.ok) {
      alert('❌ Failed to generate PDF');
      return;
    }

    const blob = await res.blob();
    const fileUrl = URL.createObjectURL(blob);
    window.open(fileUrl, '_blank');
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoDataUrl(reader.result); // base64 string
    };
    reader.readAsDataURL(file);
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.title}>🔐 Secure QR PDF Generator</h1>
        <p style={styles.subtitle}>Create a protected PDF with QR authentication</p>

        <div style={styles.field}>
          <label style={styles.label}>🔗 URL to Secure *</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://secure-link.com"
            style={styles.input}
            required
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>🌐 Language</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} style={styles.input}>
            <option value="en">English</option>
            <option value="fr">French</option>
            <option value="it">Italian</option>
            <option value="es">Spanish</option>
            <option value="pt">Portuguese</option>
            <option value="ja">Japanese</option>
            <option value="zh">Chinese</option>
            <option value="ko">Korean</option>
          </select>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>🖼️ Logo (URL or upload)</label>
          <input
            type="text"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://example.com/logo.png"
            style={styles.input}
          />
          <input type="file" accept="image/*" onChange={handleFileChange} style={{ marginTop: 10 }} />
        </div>

        <button
          onClick={handleGeneratePDF}
          disabled={loading}
          style={{ ...styles.button, opacity: loading ? 0.6 : 1 }}
        >
          {loading ? 'Generating...' : '📄 Generate PDF'}
        </button>
      </div>
    </main>
  );
}

const styles = {
  main: {
    minHeight: '100vh',
    background: 'linear-gradient(to bottom right, #eef2f7, #cfd9df)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    padding: '40px 30px',
    borderRadius: '16px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
    maxWidth: 500,
    width: '100%',
    textAlign: 'center',
  },
  title: {
    fontSize: '1.8rem',
    marginBottom: 10,
    color: '#222',
  },
  subtitle: {
    fontSize: '1rem',
    marginBottom: 30,
    color: '#555',
  },
  field: {
    marginBottom: 20,
    textAlign: 'left',
  },
  label: {
    display: 'block',
    marginBottom: 6,
    fontWeight: 'bold',
    fontSize: '0.95rem',
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    fontSize: '1rem',
    border: '1px solid #ccc',
    borderRadius: 8,
    outline: 'none',
    transition: 'border 0.2s ease-in-out',
  },
  button: {
    marginTop: 10,
    backgroundColor: '#0070f3',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    fontSize: '1rem',
    borderRadius: 10,
    cursor: 'pointer',
    transition: 'background 0.3s',
  },
};
