export default function Home() {
  async function generateSecurePDF() {
    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://example.com/secure-file',
        language: 'ja', // Change language code here as needed
        logoUrl: 'https://example.com/logo.png', // Optional logo URL
      }),
    });

    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } else {
      alert('Failed to generate PDF');
    }
  }

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>PDF Generator with QR Code</h1>
      <button onClick={generateSecurePDF}>
        Generate Secure PDF
      </button>
    </div>
  );
}
