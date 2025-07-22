import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

export default async function handler(req, res) {
  const { url, language = 'en', logoUrl } = req.body;

  if (!url) {
    return res.status(400).send('URL is required');
  }

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);

  // Generate QR Code
  const qrCodeDataUrl = await QRCode.toDataURL(url);
  const qrImageBytes = await fetch(qrCodeDataUrl).then((res) => res.arrayBuffer());
  const qrImage = await pdfDoc.embedPng(qrImageBytes);

  // PDF dimensions
  const { width, height } = page.getSize();
  const qrSize = 200;

  // Instruction messages in multiple languages
  const instructions = {
    en: 'ERROR: Secure Document. Scan QR to authenticate.',
    fr: 'ERREUR : Document sécurisé. Scannez le QR pour vous authentifier.',
    it: 'ERRORE: Documento protetto. Scansiona il QR per autenticarti.',
    es: 'ERROR: Documento seguro. Escanee QR para autenticarse.',
    pt: 'ERRO: Documento seguro. Escaneie o QR para autenticar.',
    ja: 'エラー：安全なドキュメントです。認証するにはQRコードをスキャンしてください。',
    zh: '错误：安全文档。请扫描二维码进行身份验证。',
    ko: '오류: 보안 문서입니다. 인증하려면 QR 코드를 스캔하십시오.'
  };

  const chosenInstruction = instructions[language] || instructions.en;

  // Embed fonts
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Draw instruction text
  page.drawText(chosenInstruction, {
    x: 50,
    y: height / 2 + qrSize / 2 + 20,
    size: 16,
    font,
    color: rgb(0.9, 0.1, 0.1),
    maxWidth: 500,
    lineHeight: 18
  });

  // Optional logo embedding
  if (logoUrl) {
    try {
      const logoBytes = await fetch(logoUrl).then((res) => res.arrayBuffer());
      const logoImage = await pdfDoc.embedPng(logoBytes);
      page.drawImage(logoImage, {
        x: width / 2 - 50,
        y: height - 120,
        width: 100,
        height: 100,
      });
    } catch (err) {
      console.warn("Logo URL failed to load, proceeding without logo.");
    }
  }

  // Draw QR code image
  page.drawImage(qrImage, {
    x: width / 2 - qrSize / 2,
    y: height / 2 - qrSize / 2,
    width: qrSize,
    height: qrSize,
  });

  // Create PDF buffer
  const pdfBytes = await pdfDoc.save();

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="secure.pdf"');
  res.send(Buffer.from(pdfBytes));
}
