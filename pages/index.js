import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { url, language = 'en', logoUrl } = req.body;
  if (!url) return res.status(400).send('URL is required');

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Instruction translations
  const instructions = {
    en: 'This document could not be decrypted.\nScan the QR code below using your phone camera to access the document.',
    fr: 'Ce document n’a pas pu être déchiffré.\nScannez le code QR ci-dessous avec la caméra de votre téléphone pour accéder au document.',
    it: 'Impossibile decifrare il documento.\nScansiona il codice QR qui sotto con la fotocamera del tuo telefono per accedere al documento.',
    es: 'No se pudo descifrar el documento.\nEscanee el código QR a continuación con la cámara de su teléfono para acceder al documento.',
    pt: 'Não foi possível descriptografar o documento.\nEscaneie o QR abaixo com a câmera do seu telefone para acessar o documento.',
  };
  const message = instructions[language] || instructions.en;

  // HEADER: Red Banner
  page.drawRectangle({
    x: 0,
    y: height - 120,
    width,
    height: 100,
    color: rgb(0.9, 0.1, 0.1),
  });

  page.drawText('ACCESS RESTRICTED', {
    x: 50,
    y: height - 80,
    size: 22,
    font,
    color: rgb(1, 1, 1),
  });

  // Optional Logo
  if (logoUrl) {
    try {
      const logoBytes = await fetch(logoUrl).then(res => res.arrayBuffer());
      const logoImage = await pdfDoc.embedPng(logoBytes);
      page.drawImage(logoImage, {
        x: width - 120,
        y: height - 110,
        width: 60,
        height: 60,
      });
    } catch {
      console.warn('Failed to load logo');
    }
  }

  // START CONTENT AREA
  let cursorY = height - 150;

  // Draw multiline instruction text (2 lines max assumed)
  const lineHeight = 18;
  const textLines = message.split('\n');
  for (let i = 0; i < textLines.length; i++) {
    page.drawText(textLines[i], {
      x: 60,
      y: cursorY - i * lineHeight,
      size: 13,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
  }

  cursorY -= textLines.length * lineHeight + 20;

  // Load scanner image
  let scannerImage;
  try {
    const scannerBytes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/scanneri.png`).then(res =>
      res.arrayBuffer()
    );
    scannerImage = await pdfDoc.embedPng(scannerBytes);
    page.drawImage(scannerImage, {
      x: width / 2 - 40,
      y: cursorY - 80,
      width: 80,
      height: 80,
    });
    cursorY -= 100; // Leave room for image + padding
  } catch {
    console.warn('scanneri.png not found or failed to load');
  }

  // Generate QR code
  const qrCodeDataUrl = await QRCode.toDataURL(url);
  const qrImageBytes = await fetch(qrCodeDataUrl).then(res => res.arrayBuffer());
  const qrImage = await pdfDoc.embedPng(qrImageBytes);

  // QR code inside black margin box
  const qrSize = 160;
  const boxPadding = 10;
  const boxSize = qrSize + 2 * boxPadding;

  page.drawRectangle({
    x: width / 2 - boxSize / 2,
    y: cursorY - boxSize,
    width: boxSize,
    height: boxSize,
    color: rgb(0, 0, 0),
  });

  page.drawImage(qrImage, {
    x: width / 2 - qrSize / 2,
    y: cursorY - qrSize - boxPadding,
    width: qrSize,
    height: qrSize,
  });

  // Footer
  page.drawLine({
    start: { x: 50, y: 80 },
    end: { x: width - 50, y: 80 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  page.drawText('This file is encrypted and requires secure device authentication.', {
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
