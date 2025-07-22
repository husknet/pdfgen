import { NextResponse } from 'next/server';
import PdfPrinter from 'pdfmake'; // ESM import for server use!
import QRCode from 'qrcode';
import fs from 'fs/promises';
import path from 'path';

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

    // Load font as buffer
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'DejaVuSans.ttf');
    const fontBuffer = await fs.readFile(fontPath);

    // Generate QR code as DataURL
    const qrDataUrl = await QRCode.toDataURL(url);

    // Prepare optional logo as Data URL
    let logoDataUrl = null;
    if (logo && typeof logo.arrayBuffer === 'function') {
      const logoBuffer = Buffer.from(await logo.arrayBuffer());
      logoDataUrl = 'data:image/png;base64,' + logoBuffer.toString('base64');
    }

    // PDF doc definition
    const docDefinition = {
      content: [
        logoDataUrl
          ? { image: logoDataUrl, width: 120, alignment: 'center', margin: [0, 0, 0, 12] }
          : {},
        { text: '🚫 ' + t.header, fontSize: 22, color: 'red', bold: true, alignment: 'center', margin: [0, 0, 0, 10] },
        { text: t.unavailable, fontSize: 14, alignment: 'center', margin: [0, 0, 0, 18] },
        { text: t.to_view, fontSize: 15, alignment: 'center', margin: [0, 0, 0, 7], decoration: 'underline' },
        { text: t.step1, fontSize: 12 },
        { text: t.step2, fontSize: 12 },
        { text: t.step3, fontSize: 12, margin: [0, 0, 0, 18] },
        { image: qrDataUrl, width: 160, alignment: 'center', margin: [0, 0, 0, 18] },
        { text: t.protection, fontSize: 12, color: 'gray', alignment: 'center' }
      ],
      defaultStyle: {
        font: 'DejaVuSans'
      }
    };

    // PdfPrinter expects a { [fontname]: { normal: fontBuffer } } map
    const printer = new PdfPrinter({
      DejaVuSans: {
        normal: fontBuffer
      }
    });

    // Generate PDF Buffer
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks = [];
    pdfDoc.on('data', chunk => chunks.push(chunk));
    pdfDoc.end();
    await new Promise(resolve => pdfDoc.on('end', resolve));
    const pdfBuffer = Buffer.concat(chunks);

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
