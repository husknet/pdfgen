'use client';
import { useState, useRef } from 'react';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'pt', label: 'Português' },
  { code: 'zh', label: '中文' }
];

export default function Home() {
  const [url, setUrl] = useState('');
  const [lang, setLang] = useState('en');
  const [loading, setLoading] = useState(false);
  const logoRef = useRef();

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('url', url);
    formData.append('lang', lang);
    if (logoRef.current?.files[0]) {
      formData.append('logo', logoRef.current.files[0]);
    }

    const res = await fetch(`/api/generate`, {
      method: 'POST',
      body: formData
    });

    if (res.ok) {
      const blob = await res.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `SecureFileAccess_${lang}.pdf`;
      link.click();
    }
    setLoading(false);
  };

  return (
    <main style={{ maxWidth: 440, margin: '50px auto', fontFamily: 'sans-serif' }}>
      <h2>PDF QR Generator</h2>
      <form onSubmit={handleSubmit}>
        <label>
          File Access URL:<br />
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            required
            style={{ width: '100%', marginBottom: 10 }}
          />
        </label>
        <br />
        <label>
          Language:<br />
          <select value={lang} onChange={e => setLang(e.target.value)} style={{ width: '100%' }}>
            {languages.map(l => <option value={l.code} key={l.code}>{l.label}</option>)}
          </select>
        </label>
        <br /><br />
        <label>
          (Optional) Logo: <input ref={logoRef} name="logo" type="file" accept="image/*" />
        </label>
        <br /><br />
        <button type="submit" disabled={loading || !url}>
          {loading ? "Generating..." : "Generate PDF"}
        </button>
      </form>
      <p style={{marginTop:24, color:'#888', fontSize:12}}>No files are stored. All processing is done in-memory.</p>
      <div style={{marginTop:24}}>
        <img src="/images/logo.png" alt="Sample logo" width={120} />
      </div>
    </main>
  );
}
