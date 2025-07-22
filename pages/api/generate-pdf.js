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
    en: 'This document could not be decrypted.\nPlease scan the QR code using your secure device.',
    fr: 'Ce document n’a pas pu être déchiffré.\nVeuillez scanner le code QR avec votre appareil sécurisé.',
    it: 'Impossibile decifrare il documento.\nScansiona il codice QR con il tuo dispositivo protetto.',
    es: 'No se pudo descifrar el documento.\nEscanee el código QR con su dispositivo seguro.',
    pt: 'Não foi possível descriptografar o documento.\nEscaneie o QR com seu dispositivo seguro.',
  };

  const message = instructions[language] || instructions.en;
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Header
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

  // Optional logo
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
    } catch {
      console.warn('Failed to load logo');
    }
  }

  // QR Code
  const qrCodeDataUrl = await QRCode.toDataURL(url);
  const qrImageBytes = await fetch(qrCodeDataUrl).then((res) => res.arrayBuffer());
  const qrImage = await pdfDoc.embedPng(qrImageBytes);
  const qrSize = 200;

  page.drawImage(qrImage, {
    x: width / 2 - qrSize / 2,
    y: height / 2 + 20,
    width: qrSize,
    height: qrSize,
  });

  // Scanner image below QR
  try {
    const scannerBytes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/scanneri.png`).then((res) =>
      res.arrayBuffer()
    );
    const scannerImg = await pdfDoc.embedPng(scannerBytes);
    page.drawImage(scannerImg, {
      x: width / 2 - 50,
      y: height / 2 - 80,
      width: 100,
      height: 100,
    });
  } catch {
    console.warn('Scanner image not found or failed to load.');
  }

  // Instruction text
  page.drawText(message, {
    x: 60,
    y: height / 2 - 120,
    size: 13,
    font,
    color: rgb(0.1, 0.1, 0.1),
    lineHeight: 16,
    maxWidth: width - 120,
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
  res.setHeader('Content-Disposition', 'inline; filename="secure.pdf"');
  res.send(Buffer.from(pdfBytes));
}
