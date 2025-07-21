import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import fs from 'fs/promises';
import path from 'path';

// Helper: Read form-data in Next.js API Route (Edge Functions do NOT support multipart, so use Serverless Functions runtime)
export const config = {
  api: {
    bodyParser: false
  }
};

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const busboy = require('busboy');
    const bb = busboy({ headers: req.headers });
    const fields = {};
    const files = {};

    bb.on('file', (name, file, info) => {
      const buffers = [];
      file.on('data', d => buffers.push(d));
      file.on('end', () => {
        files[name] = {
          buffer: Buffer.concat(buffers),
          filename: info.filename,
          mime: info.mimeType
        };
      });
    });

    bb.on('field', (name, val) => {
      fields[name] = val;
    });

    bb.on('finish', () => resolve({ fields, files }));
    bb.on('error', err => reject(err));
    req.pipe(bb);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const { fields, files } = await parseMultipart(req);
  const url = fields.url;
  const lang = fields.lang || 'en';

  if (!url) {
    res.status(400).send('Missing url');
    return;
  }

  // Load locale text
  const localePath = path.join(process.cwd(), 'locales', `${lang}.json`);
  let t = {};
  try {
    const raw = await fs.readFile(localePath, 'utf8');
    t = JSON.parse(raw);
  } catch (e) {
    // fallback to English
    const raw = await fs.readFile(path.join(process.cwd(), 'locales', `en.json`), 'utf8');
    t = JSON.parse(raw);
  }

  // Generate QR code image as buffer
  const qrDataUrl = await QRCode.toDataURL(url, { width: 256 });
  const qrImageBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');

  // Generate PDF in-memory
  const doc = new PDFDocument({ margin: 50 });
  let pdfChunks = [];
  doc.on('data', chunk => pdfChunks.push(chunk));
  doc.on('end', () => {});

  // Optional logo
  if (files.logo && files.logo.buffer.length > 0) {
    try {
      doc.image(files.logo.buffer, doc.page.width / 2 - 60, undefined, { width: 120 });
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

  // Wait for PDF buffer
  await new Promise(resolve => doc.on('end', resolve));
  const pdfBuffer = Buffer.concat(pdfChunks);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=SecureFileAccess_${lang}.pdf`);
  res.status(200).send(pdfBuffer);
}
