import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs/promises';
import fsSync from 'fs'; // For existence check
import path from 'path';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const form = await request.formData();
    const url = form.get('url');
    const lang = form.get('lang') || 'en';
    const logo = form.get('logo');

    if (!url) {
      return new Response('Missing url', { status: 400 });
    }

    // Load translation JSON
    let t = {};
    try {
      const localePath = path.join(process.cwd(), 'locales', `${lang}.json`);
      const raw = await fs.readFile(localePath, 'utf8');
      t = JSON.parse(raw);
    } catch (e) {
      // fallback to English
      const fallbackPath = path.join(process.cwd(), 'locales', `en.json`);
      const raw = await fs.readFile(fallbackPath, 'utf8');
      t = JSON.parse(raw);
    }

    // Generate QR code image as buffer
    const qrDataUrl = await QRCode.toDataURL(url, { width: 256 });
    const qrImageBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

    // LOG AND CHECK FONT PATH
    const helveticaPath = path.join(process.cwd(), 'public', 'fonts', 'Helvetica.ttf');
    console.log('Helvetica font path:', helveticaPath);
    console.log('Font exists:', fsSync.existsSync(helveticaPath));
    if (!fsSync.existsSync(helveticaPath)) {
      throw new Error('Helvetica.ttf is missing at ' + helveticaPath);
    }

    // Create PDF in memory
    const doc = new PDFDocument({ margin: 50 });
    let pdfChunks = [];
    doc.on('data', chunk => pdfChunks.push(chunk));
    doc.on('end', () => {});

    // SET THE CUSTOM FONT (only do this after existence is confirmed!)
    doc.font(helveticaPath);

    // Optional logo at the top
    if (logo && typeof logo.arrayBuffer === 'function') {
      const logoBuffer = Buffer.from(await logo.arrayBuffer());
      try {
        doc.image(logoBuffer, doc.page.width / 2 - 60, undefined, { width: 120 });
        doc.moveDown(2);
      } catch (err) {
        // skip logo if image failed
      }
    }

    // PDF layout
    doc.fontSize(22).fillColor('red').text('🚫', { continued: true }).fillColor('black').text(` ${t.header}`);
    doc.moveDown(1.2);

    doc.fontSize(14).fillColor('black').text(t.unavailable, { align: 'center' });
    doc.moveDown(2);

    doc.fontSize(15).fillColor('black').text('📱 ' + t.to_view, { underline: true });
    doc.moveDown(0.7);
    doc.fontSize(12).fillColor('black').text(t.step1);
    doc.text(t.step2);
    doc.text(t.step3);
    doc.moveDown(2);

    doc.image(qrImageBuffer, { width: 180, align: 'center' });
    doc.moveDown(2);

    doc.fontSize(12).fillColor('gray').text(t.protection, { align: 'center' });

    doc.end();

    await new Promise(resolve => doc.on('end', resolve));
    const pdfBuffer = Buffer.concat(pdfChunks);

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=SecureFileAccess_${lang}.pdf`
      }
    });
  } catch (e) {
    console.error('API error:', e);
    return new Response(
      typeof e === 'string' ? e : e.message || 'Unknown error',
      { status: 500 }
    );
  }
}
