import { NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import fs from 'fs/promises';
import path from 'path';

export const runtime = 'nodejs';

function wrapLines(text, maxLen = 48) {
  const words = text.split(' ');
  const lines = [];
  let current = '';
  for (const word of words) {
    if ((current + word).length > maxLen) {
      lines.push(current.trim());
      current = word + ' ';
    } else {
      current += word + ' ';
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

export async function POST(request) {
  try {
    const form = await request.formData();
    const url = form.get('url');
    const lang = form.get('lang') || 'en';
    const logo = form.get('logo');

    if (!url) {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    // Load translations
    let t = {};
    try {
      const localePath = path.join(process.cwd(), 'locales', `${lang}.json`);
      const raw = await fs.readFile(localePath, 'utf8');
      t = JSON.parse(raw);
    } catch {
      const fallbackPath = path.join(process.cwd(), 'locales', `en.json`);
      const raw = await fs.readFile(fallbackPath, 'utf8');
      t = JSON.parse(raw);
    }

    // Create new PDF
    const pdfDoc = await PDFDocument.create();

    // Add custom font (DejaVuSans) or fallback to StandardFonts.Helvetica
    let font;
    try {
      const fontPath = path.join(process.cwd(), 'public', 'fonts', 'DejaVuSans.ttf');
      const fontBytes = await fs.readFile(fontPath);
      font = await pdfDoc.embedFont(fontBytes);
    } catch {
      font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    }

    // Page settings
    const page = pdfDoc.addPage([420, 595]); // A5
    const { width, height } = page.getSize();
    let y = height - 60;

    // Draw logo if provided
    if (logo && typeof logo.arrayBuffer === 'function') {
      const logoBuffer = Buffer.from(await logo.arrayBuffer());
      try {
        const img = await pdfDoc.embedPng(logoBuffer);
        const imgDims = img.scale(120 / img.width);
        page.drawImage(img, {
          x: width / 2 - imgDims.width / 2,
          y: y - imgDims.height,
          width: imgDims.width,
          height: imgDims.height
        });
        y -= imgDims.height + 15;
      } catch {
        // ignore logo error
      }
    }

    // Draw header
    page.drawText('🚫 ' + t.header, {
      x: 40,
      y: y,
      size: 20,
      font,
      color: rgb(0.8, 0.1, 0.1)
    });
    y -= 28;

    // Draw unavailable message
    wrapLines(t.unavailable, 38).forEach(line => {
      page.drawText(line, { x: 40, y, size: 12, font, color: rgb(0, 0, 0) });
      y -= 17;
    });
    y -= 10;

    // Draw instructions
    page.drawText(t.to_view, {
      x: 40, y, size: 13, font, color: rgb(0,0,0), underline: true
    }); y -= 18;

    [t.step1, t.step2, t.step3].forEach(step => {
      page.drawText(step, { x: 40, y, size: 11, font, color: rgb(0, 0, 0) });
      y -= 15;
    });

    // Draw QR code
    const qrDataUrl = await QRCode.toDataURL(url, { margin: 1 });
    const qrBase64 = qrDataUrl.split(',')[1];
    const qrImage = await pdfDoc.embedPng(Buffer.from(qrBase64, 'base64'));
    const qrW = 130, qrH = 130;
    page.drawImage(qrImage, {
      x: width / 2 - qrW / 2,
      y: y - qrH - 10,
      width: qrW,
      height: qrH
    });
    y = y - qrH - 25;

    // Draw protection footer
    wrapLines(t.protection, 44).forEach(line => {
      page.drawText(line, {
        x: 40, y, size: 10, font, color: rgb(0.5, 0.5, 0.5)
      });
      y -= 13;
    });

    // Finish PDF
    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
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
