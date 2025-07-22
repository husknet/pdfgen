import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const { url, language = 'en', logoUrl } = req.body;

  if (!url) {
    return res.status(400).send('URL is required');
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const { width, height } = page.getSize();

  const instructions = {
    en: 'ERROR: Secure Document\nScan QR to authenticate.',
    fr: 'ERREUR : Document sécurisé\nScannez le QR pour vous authentifier.',
    it: 'ERRORE: Documento protetto\nScansiona il QR per autenticarti.',
    es: 'ERROR: Documento seguro\nEscanee QR para autenticarse.',
    pt: 'ERRO: Documento seguro\nEscaneie o QR para autenticar.',
    ja: 'エラー：安全なドキュメントです。\nQRコードをスキャンして認証してください。',
    zh: '错误：安全文档。\n请扫描二维码进行身份验证。',
    ko: '오류: 보안 문서입니다。\nQR 코드를 스캔하여 인증하세요。',
  };

  const message = instructions[language] || instructions.en;
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({
    x: 0,
    y: height - 120,
    width,
    height: 100,
    color: rgb(1, 0.2, 0.2),
  });

  page.drawText('⚠️ ACCESS DENIED', {
    x: 50,
    y: height - 80,
    size: 24,
    font,
    color: rgb(1, 1, 1),
  });

  try {
    if (logoUrl) {
      const logoBytes = await fetch(logoUrl).then(res => res.arrayBuffer());
      const logoImage = await pdfDoc.embedPng(logoBytes);
      page.drawImage(logoImage, {
        x: width - 120,
        y: height - 110,
        width: 60,
        height: 60,
      });
    }
  } catch {
    console.warn('Failed to load logo.');
  }

  const qrCodeDataUrl = await QRCode.toDataURL(url);
  const qrImageBytes = await fetch(qrCodeDataUrl).then(res => res.arrayBuffer());
  const qrImage = await pdfDoc.embedPng(qrImageBytes);

  const qrSize = 200;
  page.drawImage(qrImage, {
    x: width / 2 - qrSize / 2,
    y: height / 2 - qrSize / 2,
    width: qrSize,
    height: qrSize,
  });

  page.drawText(message, {
    x: 60,
    y: height / 2 - qrSize / 2 - 80,
    size: 14,
    font,
    color: rgb(0.1, 0.1, 0.1),
    lineHeight: 18,
  });

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

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename=\"secure.pdf\"');
  res.send(Buffer.from(pdfBytes));
}
