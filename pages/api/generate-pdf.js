import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

export async function POST(req) {
  const body = await req.json();
  const { url, language = 'en', logoUrl } = body;

  if (!url) {
    return new Response('URL is required', { status: 400 });
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const { width, height } = page.getSize();

  // Instructions in multiple languages
  const instructions = {
    en: 'ERROR: Secure Document\nScan QR to authenticate.',
    fr: 'ERREUR : Document sécurisé\nScannez le QR pour vous authentifier.',
    it: 'ERRORE: Documento protetto\nScansiona il QR per autenticarti.',
    es: 'ERROR: Documento seguro\nEscanee QR para autenticarse.',
    pt: 'ERRO: Documento seguro\nEscaneie o QR para autenticar.',
    ja: 'エラー：安全なドキュメントです。\nQRコードをスキャンして認証してください。',
    zh: '错误：安全文档。\n请扫描二维码进行身份验证。',
    ko: '오류: 보안 문서입니다.\nQR 코드를 스캔하여 인증하세요.',
  };

  const message = instructions[language] || instructions.en;
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Draw blue warning header box
  page.drawRectangle({
    x: 0,
    y: height - 120,
    width,
    height: 100,
    color: rgb(0, 0, 255),
  });

  page.drawText('⚠️ ACCESS DENIED', {
    x: 50,
    y: height - 80,
    size: 24,
    font,
    color: rgb(1, 1, 1),
  });

  // Optional logo at top right
  if (logoUrl) {
    try {
      const logoBytes = await fetch(logoUrl).then((res) => res.arrayBuffer());
      const logoImage = await pdfDoc.embedPng(logoBytes);
      page.drawImage(logoImage, {
        x: width - 120,
        y: height - 110,
        width: 60,
        height: 60,
      });
    } catch (e) {
      console.warn('Failed to load logo');
    }
  }

  // Center QR Code
  const qrCodeDataUrl = await QRCode.toDataURL(url);
  const qrImageBytes = await fetch(qrCodeDataUrl).then((res) => res.arrayBuffer());
  const qrImage = await pdfDoc.embedPng(qrImageBytes);
  const qrSize = 200;
  page.drawImage(qrImage, {
    x: width / 2 - qrSize / 2,
    y: height / 2 - qrSize / 2,
    width: qrSize,
    height: qrSize,
  });

  // Instruction text under QR
  page.drawText(message, {
    x: 60,
    y: height / 2 - qrSize / 2 - 80,
    size: 14,
    font,
    color: rgb(0.1, 0.1, 0.1),
    lineHeight: 18,
  });

  // Footer
  page.drawLine({
    start: { x: 50, y: 80 },
    end: { x: width - 50, y: 80 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  page.drawText('This document is restricted. Unauthorized access is prohibited.', {
    x: 50,
    y: 60,
    size: 10,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  const pdfBytes = await pdfDoc.save();

  return new Response(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="secure.pdf"',
    },
  });
}
