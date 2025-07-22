import { NextResponse } from 'next/server';
import { pdf, Document, Page, Text, View, Image, Font, StyleSheet } from '@react-pdf/renderer';
import QRCode from 'qrcode';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

const fontPath = path.join(process.cwd(), 'public', 'fonts', 'DejaVuSans.ttf');
if (fsSync.existsSync(fontPath)) {
  Font.register({ family: 'DejaVuSans', src: fontPath });
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'DejaVuSans' },
  header: { fontSize: 22, color: 'red', marginBottom: 8 },
  subheader: { fontSize: 14, marginBottom: 20 },
  steps: { fontSize: 12, marginBottom: 10 },
  qr: { width: 150, height: 150, margin: '20px auto' },
  logo: { width: 120, margin: '0 auto 20px' },
  footer: { color: 'gray', fontSize: 12, marginTop: 30, textAlign: 'center' }
});

function MyDoc({ t, qrDataUrl, logoDataUrl }) {
  return (
    <Document>
      <Page style={styles.page}>
        {logoDataUrl && <Image style={styles.logo} src={logoDataUrl} />}
        <Text style={styles.header}>🚫 {t.header}</Text>
        <Text style={styles.subheader}>{t.unavailable}</Text>
        <Text style={styles.steps}>{t.to_view}</Text>
        <Text style={styles.steps}>{t.step1}</Text>
        <Text style={styles.steps}>{t.step2}</Text>
        <Text style={styles.steps}>{t.step3}</Text>
        <Image style={styles.qr} src={qrDataUrl} />
        <Text style={styles.footer}>{t.protection}</Text>
      </Page>
    </Document>
  );
}

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const form = await request.formData();
    const url = form.get('url');
    const lang = form.get('lang') || 'en';
    const logo = form.get('logo');

    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    // Load translation JSON
    let t = {};
    try {
      const localePath = path.join(process.cwd(), 'locales', `${lang}.json`);
      const raw = await fs.readFile(localePath, 'utf8');
      t = JSON.parse(raw);
    } catch (e) {
      const fallbackPath = path.join(process.cwd(), 'locales', `en.json`);
      const raw = await fs.readFile(fallbackPath, 'utf8');
      t = JSON.parse(raw);
    }

    // Generate QR code as DataURL
    const qrDataUrl = await QRCode.toDataURL(url);

    // Optional logo DataURL
    let logoDataUrl = null;
    if (logo && typeof logo.arrayBuffer === 'function') {
      const logoBuffer = Buffer.from(await logo.arrayBuffer());
      logoDataUrl = 'data:image/png;base64,' + logoBuffer.toString('base64');
    }

    const pdfBuffer = await pdf(
      <MyDoc t={t} qrDataUrl={qrDataUrl} logoDataUrl={logoDataUrl} />
    ).toBuffer();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=SecureFileAccess_${lang}.pdf`
      }
    });
  } catch (e) {
    console.error('API error:', e);
    return new NextResponse(
      typeof e === 'string' ? e : e.message || 'Unknown error',
      { status: 500 }
    );
  }
}
