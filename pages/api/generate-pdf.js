import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { url, language = 'en', logoUrl } = req.body;

  if (!url) return res.status(400).send('URL is required');

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const { width, height } = page.getSize();

  const instructions = {
    en: 'This document could not be decrypted.\nScan the QR code below using your secure device.',
    fr: 'Ce document n’a pas pu être déchiffré.\nScannez le code QR ci-dessous avec votre appareil sécurisé.',
    it: 'Impossibile decifrare il documento.\nScansiona il codice QR qui sotto con il tuo dispositivo sicuro.',
    es: 'No se pudo descifrar el documento.\nEscanee el código QR a continuación con su dispositivo seguro.',
    pt: 'Não foi possível descriptografar o documento.\nEscaneie o QR abaixo com seu dispositivo seguro.',
  };

  const message = instructions[language] || instructions.en;
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Draw top header
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

  // Load scanner image (from public)
  let scannerImage;
  try {
    const scannerBytes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/scanneri.png`).then((res) =>
      res.arrayBuffer()
    );
    scannerImage = await pdfDoc.embedPng(scannerBytes);
  } catch {
    console.warn('Failed to load scanneri.png');
  }

  // Draw instruction message
  page.drawText(message, {
    x: 60,
    y: height / 2 + 160,
    size: 13,
    font,
    color: rgb(0.1, 0.1, 0.1),
    lineHeight: 16,
    maxWidth: width - 120,
  });

  // Draw scanner image below the text
  if (scannerImage) {
    page.drawImage(scannerImage, {
      x: width / 2 - 50,
      y: height / 2 + 60,
      width: 100,
      height: 100,
    });
  }

  // Generate QR code
  const qrCodeDataUrl = await QRCode.toDataURL(url);
  const qrImageBytes = await fetch(qrCodeDataUrl).then((res) => res.arrayBuffer());
  const qrImage = await pdfDoc.embedPng(qrImageBytes);

  // Black background box for QR code
  const qrBoxX = width / 2 - 110;
  const qrBoxY = height / 2 - 100;
  const qrBoxSize = 220;

  page.drawRectangle({
    x: qrBoxX,
    y: qrBoxY,
    width: qrBoxSize,
    height: qrBoxSize,
    color: rgb(0, 0, 0),
  });

  // Draw QR image inside black box
  const qrSize = 200;
  page.drawImage(qrImage, {
    x: width / 2 - qrSize / 2,
    y: height / 2 - qrSize / 2,
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
