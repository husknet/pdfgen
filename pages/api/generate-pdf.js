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

  const localizedText = {
    en: {
      heading: 'ACCESS RESTRICTED',
      message:
        'This document could not be decrypted.\nScan the QR code below using your phone camera to access the document.',
      footer: 'This file is encrypted and requires secure device authentication.',
    },
    fr: {
      heading: 'ACCÈS REFUSÉ',
      message:
        'Ce document n’a pas pu être déchiffré.\nScannez le code QR ci-dessous avec la caméra de votre téléphone pour accéder au document.',
      footer: 'Ce fichier est chiffré et nécessite une authentification sécurisée.',
    },
    it: {
      heading: 'ACCESSO NEGATO',
      message:
        'Impossibile decifrare il documento.\nScansiona il codice QR qui sotto con la fotocamera del tuo telefono per accedere al documento.',
      footer: 'Questo file è crittografato e richiede autenticazione sicura.',
    },
    es: {
      heading: 'ACCESO DENEGADO',
      message:
        'No se pudo descifrar el documento.\nEscanee el código QR a continuación con la cámara de su teléfono para acceder al documento.',
      footer: 'Este archivo está cifrado y requiere autenticación segura.',
    },
    pt: {
      heading: 'ACESSO NEGADO',
      message:
        'Não foi possível descriptografar o documento.\nEscaneie o QR abaixo com a câmera do seu telefone para acessar ao documento.',
      footer: 'Este arquivo está criptografado e requer autenticação segura.',
    },
  };

  const langData = localizedText[language] || localizedText.en;

  // Draw red header
  page.drawRectangle({
    x: 0,
    y: height - 120,
    width,
    height: 100,
    color: rgb(0.9, 0.1, 0.1),
  });

  // Draw heading
  page.drawText(langData.heading, {
    x: 120,
    y: height - 80,
    size: 22,
    font,
    color: rgb(1, 1, 1),
  });

  // Optional logo on right
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

  // Instruction block
  let cursorY = height - 150;
  const lineHeight = 18;

  function wrapText(text, maxChars) {
    const words = text.split(' ');
    const lines = [];
    let line = '';

    for (const word of words) {
      if ((line + word).length <= maxChars) {
        line += word + ' ';
      } else {
        lines.push(line.trim());
        line = word + ' ';
      }
    }
    if (line) lines.push(line.trim());
    return lines;
  }

  const wrappedLines = wrapText(langData.message.replace(/\n/g, ' '), 55);

  for (let i = 0; i < wrappedLines.length; i++) {
    page.drawText(wrappedLines[i], {
      x: 50,
      y: cursorY - i * lineHeight,
      size: 12,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
  }

  cursorY -= wrappedLines.length * lineHeight + 40;

  // Generate QR Code
  const qrCodeDataUrl = await QRCode.toDataURL(url);
  const qrImageBytes = await fetch(qrCodeDataUrl).then((res) => res.arrayBuffer());
  const qrImage = await pdfDoc.embedPng(qrImageBytes);

  const qrSize = 160;
  const boxPadding = 10;
  const boxSize = qrSize + boxPadding * 2;
  const qrBoxX = width / 2 - boxSize / 2;
  const qrBoxY = cursorY - boxSize;

  // Draw black QR box
  page.drawRectangle({
    x: qrBoxX,
    y: qrBoxY,
    width: boxSize,
    height: boxSize,
    color: rgb(0, 0, 0),
  });

  // Draw QR code inside
  page.drawImage(qrImage, {
    x: width / 2 - qrSize / 2,
    y: qrBoxY + boxPadding,
    width: qrSize,
    height: qrSize,
  });

  // Draw scanneri.png below QR
  try {
    const scannerBytes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/scanneri.png`).then((res) =>
      res.arrayBuffer()
    );
    const scannerImage = await pdfDoc.embedPng(scannerBytes);

    const scannerWidth = 113;
    const scannerHeight = 113;
    const scannerY = qrBoxY - scannerHeight - 20;

    page.drawImage(scannerImage, {
      x: width / 2 - scannerWidth / 2,
      y: scannerY,
      width: scannerWidth,
      height: scannerHeight,
    });
  } catch {
    console.warn('Failed to load scanneri.png');
  }

  // Footer
  page.drawLine({
    start: { x: 50, y: 80 },
    end: { x: width - 50, y: 80 },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  });

  page.drawText(langData.footer, {
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
