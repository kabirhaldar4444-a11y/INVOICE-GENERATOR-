import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

// Helper functions from helpers.js
const formatCurrency = (amount) => {
  const number = parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

// Helper to draw text easily with custom color, alignment, and wrapping
const drawTextHelper = (page, text, x, y, options = {}) => {
  const {
    size = 10,
    font,
    color = rgb(15/255, 23/255, 42/255), // Default to slate-900
    align = 'left',
    width = 500
  } = options;

  let finalX = x;
  let textString = String(text || '').replace(/₹/g, 'Rs. ');

  // Sanitize textString to prevent WinAnsi encoding errors
  let cleanedString = '';
  for (let i = 0; i < textString.length; i++) {
    const char = textString[i];
    try {
      font.widthOfTextAtSize(char, size);
      cleanedString += char;
    } catch (e) {
      cleanedString += ' ';
    }
  }
  textString = cleanedString;

  if (align === 'right') {
    const textWidth = font.widthOfTextAtSize(textString, size);
    finalX = x - textWidth;
  } else if (align === 'center') {
    const textWidth = font.widthOfTextAtSize(textString, size);
    finalX = x - textWidth / 2;
  }

  page.drawText(textString, {
    x: finalX,
    y,
    size,
    font,
    color,
    maxWidth: width
  });
};

const generateInvoicePDF = async (invoice, settings) => {
  const activeCompany = invoice.invoice_profile || settings;
  settings = activeCompany;
  try {
    // 1. Create a PDF Document
    const pdfDoc = await PDFDocument.create();
    
    // 2. Add an A4 sized page (595.276 x 841.89 points)
    const page = pdfDoc.addPage([595.276, 841.89]);
    const { width, height } = page.getSize();
    
    // 3. Embed standard fonts
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
    
    // Modern Professional Color Palette
    const colorPrimary = rgb(79/255, 70/255, 229/255);    // Premium Indigo #4f46e5
    const colorSecondary = rgb(14/255, 165/255, 233/255);  // Sky Blue #0ea5e9
    const colorDark = rgb(15/255, 23/255, 42/255);        // Slate-900 #0f172a
    const colorMuted = rgb(71/255, 85/255, 105/255);       // Slate-600 #475569
    const colorLightBg = rgb(248/255, 250/255, 252/255);   // Slate-50 #f8fafc
    const colorBorder = rgb(226/255, 232/255, 240/255);    // Slate-200 #e2e8f0
    const colorWhite = rgb(1, 1, 1);

    // Status Badge colors
    const status = (invoice.status || 'pending').toLowerCase();
    let colorStatusBg, colorStatusText;
    if (status === 'paid') {
      colorStatusBg = rgb(240/255, 253/255, 244/255);   // Emerald-50
      colorStatusText = rgb(22/255, 163/255, 74/255);   // Emerald-600
    } else if (status === 'cancelled') {
      colorStatusBg = rgb(255/255, 241/255, 242/255);   // Rose-50
      colorStatusText = rgb(225/255, 29/255, 72/255);   // Rose-600
    } else {
      colorStatusBg = rgb(254/255, 243/255, 199/255);   // Amber-50
      colorStatusText = rgb(217/255, 119/255, 6/255);   // Amber-600
    }

    let currentY = height - 50; // Start at ~792
    const marginX = 45;

    // --- LOGO & INVOICE HEADER SECTION ---
    // Header Title
    drawTextHelper(page, 'INVOICE', marginX, currentY - 20, { font: fontBold, size: 26, color: colorDark });
    
    // Invoice Metadata Group
    let metaY = currentY - 45;
    drawTextHelper(page, 'Invoice Code:', marginX, metaY, { font: fontBold, size: 9, color: colorMuted });
    drawTextHelper(page, invoice.invoice_number, marginX + 70, metaY, { font: fontRegular, size: 9, color: colorDark });
    
    metaY -= 14;
    drawTextHelper(page, 'Issue Date:', marginX, metaY, { font: fontBold, size: 9, color: colorMuted });
    drawTextHelper(page, formatDate(invoice.invoice_date), marginX + 70, metaY, { font: fontRegular, size: 9, color: colorDark });

    // Status Badge next to date
    metaY -= 20;
    const badgeW = 60;
    const badgeH = 14;
    page.drawRectangle({
      x: marginX,
      y: metaY,
      width: badgeW,
      height: badgeH,
      color: colorStatusBg,
      opacity: 1
    });
    drawTextHelper(page, status.toUpperCase(), marginX + (badgeW / 2), metaY + 3.5, {
      font: fontBold,
      size: 7,
      color: colorStatusText,
      align: 'center'
    });

    // Right side: Company Logo loading
    let logoImage = null;
    if (settings?.logo_url) {
      try {
        if (settings.logo_url.startsWith('data:')) {
          const commaIndex = settings.logo_url.indexOf(',');
          if (commaIndex !== -1) {
            const mimePart = settings.logo_url.substring(0, commaIndex);
            const base64Part = settings.logo_url.substring(commaIndex + 1);
            
            // Environment-safe atob convert
            let bytes;
            if (typeof window !== 'undefined' && typeof window.atob === 'function') {
              const binaryString = window.atob(base64Part);
              bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
            } else if (typeof Buffer !== 'undefined') {
              bytes = new Uint8Array(Buffer.from(base64Part, 'base64'));
            } else {
              const binaryString = atob(base64Part);
              bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
            }
            const arrayBuffer = bytes.buffer;
            
            if (mimePart.includes('image/png')) {
              logoImage = await pdfDoc.embedPng(arrayBuffer);
            } else if (mimePart.includes('image/jpeg') || mimePart.includes('image/jpg')) {
              logoImage = await pdfDoc.embedJpg(arrayBuffer);
            }
          }
        } else {
          const response = await fetch(settings.logo_url);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const urlPath = settings.logo_url.split('?')[0].toLowerCase();
            
            if (urlPath.endsWith('.png')) {
              logoImage = await pdfDoc.embedPng(arrayBuffer);
            } else if (urlPath.endsWith('.jpg') || urlPath.endsWith('.jpeg')) {
              logoImage = await pdfDoc.embedJpg(arrayBuffer);
            } else {
              // Try PNG first, fallback to JPEG
              try {
                logoImage = await pdfDoc.embedPng(arrayBuffer);
              } catch (e) {
                logoImage = await pdfDoc.embedJpg(arrayBuffer);
              }
            }
          }
        }
        
        if (logoImage) {
          const dims = logoImage.scaleToFit(140, 50);
          page.drawImage(logoImage, {
            x: width - marginX - dims.width,
            y: currentY - dims.height - 10,
            width: dims.width,
            height: dims.height,
          });
        } else {
          throw new Error("Logo image format unsupported.");
        }
      } catch (err) {
        console.warn("Logo loading failed, falling back to programmatic brand text:", err);
        const mockLogoX = width - marginX - 180;
        drawTextHelper(page, settings?.company_name || 'I-SUCCESSNODE', mockLogoX + 180, currentY - 30, {
          font: fontBold,
          size: 15,
          align: 'right',
          color: colorPrimary
        });
      }
    } else {
      const mockLogoX = width - marginX - 180;
      drawTextHelper(page, settings?.company_name || 'I-SUCCESSNODE', mockLogoX + 180, currentY - 30, {
        font: fontBold,
        size: 15,
        align: 'right',
        color: colorPrimary
      });
    }

    currentY -= 105;

    // --- SENDER & RECIPIENT INFORMATION (Two columns, no heavy box) ---
    // Draw horizontal separator line above address sections
    page.drawLine({
      start: { x: marginX, y: currentY },
      end: { x: width - marginX, y: currentY },
      color: colorBorder,
      thickness: 1
    });

    currentY -= 20;

    const colWidth = 230;
    const rightColX = width - marginX - colWidth;

    // Left Column: FROM (Sender Details)
    let leftY = currentY;
    drawTextHelper(page, 'FROM', marginX, leftY, { font: fontBold, size: 8, color: colorMuted });
    leftY -= 14;
    drawTextHelper(page, settings?.company_name || 'I-SUCCESSNODE', marginX, leftY, { font: fontBold, size: 10, color: colorDark });
    leftY -= 13;
    if (settings?.phone) {
      drawTextHelper(page, `Phone: ${settings.phone}`, marginX, leftY, { font: fontRegular, size: 8.5, color: colorMuted });
      leftY -= 12;
    }
    if (settings?.email) {
      drawTextHelper(page, `Email: ${settings.email}`, marginX, leftY, { font: fontRegular, size: 8.5, color: colorMuted });
      leftY -= 12;
    }
    if (settings?.website) {
      drawTextHelper(page, `Web: ${settings.website}`, marginX, leftY, { font: fontRegular, size: 8.5, color: colorMuted });
      leftY -= 12;
    }
    if (settings?.gst_number) {
      drawTextHelper(page, `GST: ${settings.gst_number}`, marginX, leftY, { font: fontRegular, size: 8.5, color: colorMuted });
      leftY -= 12;
    }
    if (settings?.address) {
      drawTextHelper(page, settings.address, marginX, leftY, { font: fontRegular, size: 8.5, color: colorMuted, width: colWidth });
    }

    // Right Column: BILL TO (Customer Details)
    let rightY = currentY;
    drawTextHelper(page, 'BILL TO', rightColX, rightY, { font: fontBold, size: 8, color: colorMuted });
    rightY -= 14;
    drawTextHelper(page, invoice.customers?.name || 'Client Name', rightColX, rightY, { font: fontBold, size: 10, color: colorDark });
    rightY -= 13;
    if (invoice.customers?.phone) {
      drawTextHelper(page, `Phone: ${invoice.customers.phone}`, rightColX, rightY, { font: fontRegular, size: 8.5, color: colorMuted });
      rightY -= 12;
    }
    if (invoice.customers?.email) {
      drawTextHelper(page, `Email: ${invoice.customers.email}`, rightColX, rightY, { font: fontRegular, size: 8.5, color: colorMuted });
      rightY -= 12;
    }
    if (invoice.customers?.gst_number) {
      drawTextHelper(page, `GSTIN: ${invoice.customers.gst_number}`, rightColX, rightY, { font: fontRegular, size: 8.5, color: colorMuted });
      rightY -= 12;
    }
    if (invoice.customers?.address) {
      drawTextHelper(page, invoice.customers.address, rightColX, rightY, { font: fontRegular, size: 8.5, color: colorMuted, width: colWidth });
    }

    // Adjust currentY to below the tallest address column
    const lowestY = Math.min(leftY, rightY) - 15;
    currentY = lowestY;

    // --- PRODUCTS & ITEMS TABLE ---
    currentY -= 15;

    // Table Column Coordinates
    const colDescX = marginX;
    const colPriceX = width - marginX - 220; // right-aligned center
    const colGstX = width - marginX - 110;   // right-aligned center
    const colAmountX = width - marginX;      // right-aligned end

    // Draw header background rectangle (modern style, no border, subtle bg)
    const tableHeaderHeight = 22;
    page.drawRectangle({
      x: marginX,
      y: currentY - tableHeaderHeight,
      width: width - marginX * 2,
      height: tableHeaderHeight,
      color: colorLightBg
    });

    // Draw header labels
    const labelY = currentY - tableHeaderHeight + 7;
    drawTextHelper(page, 'Description', colDescX + 8, labelY, { font: fontBold, size: 8.5, color: colorMuted });
    drawTextHelper(page, 'Unit Price', colPriceX, labelY, { font: fontBold, size: 8.5, color: colorMuted, align: 'right' });
    drawTextHelper(page, 'GST (18%)', colGstX, labelY, { font: fontBold, size: 8.5, color: colorMuted, align: 'right' });
    drawTextHelper(page, 'Amount (INR)', colAmountX - 8, labelY, { font: fontBold, size: 8.5, color: colorMuted, align: 'right' });

    currentY -= tableHeaderHeight;

    // Draw rows
    let tableY = currentY;
    const items = invoice.invoice_items || [];
    const rowHeight = 32;

    items.forEach((item) => {
      // Draw horizontal thin row line at the bottom
      page.drawLine({
        start: { x: marginX, y: tableY - rowHeight },
        end: { x: width - marginX, y: tableY - rowHeight },
        color: colorBorder,
        thickness: 0.5
      });

      const cellTextY = tableY - 18;

      // Column 1: Description
      let nameStr = item.program_name;
      drawTextHelper(page, nameStr, colDescX + 8, cellTextY, { font: fontBold, size: 9, color: colorDark, width: 220 });
      
      if (item.description) {
        drawTextHelper(page, item.description, colDescX + 8, cellTextY - 10, { font: fontOblique, size: 7.5, color: colorMuted, width: 220 });
      }

      // Financial columns
      const isComplementary = parseFloat(item.unit_price) === 0;

      if (!isComplementary) {
        // Column 2: Unit Price
        drawTextHelper(page, formatCurrency(item.unit_price), colPriceX, cellTextY, { font: fontRegular, size: 8.5, color: colorDark, align: 'right' });
        
        // Column 3: GST
        drawTextHelper(page, formatCurrency(item.gst_amount), colGstX, cellTextY, { font: fontRegular, size: 8.5, color: colorDark, align: 'right' });
      } else {
        drawTextHelper(page, '-', colPriceX, cellTextY, { font: fontRegular, size: 8.5, color: colorMuted, align: 'right' });
        drawTextHelper(page, '-', colGstX, cellTextY, { font: fontRegular, size: 8.5, color: colorMuted, align: 'right' });
      }

      // Column 4: Total Amount
      const displayTotal = isComplementary ? 'Complementary' : formatCurrency(item.total_amount);
      const totalColor = isComplementary ? colorSecondary : colorDark;
      drawTextHelper(page, displayTotal, colAmountX - 8, cellTextY, {
        font: isComplementary ? fontOblique : fontBold,
        size: isComplementary ? 8 : 9,
        color: totalColor,
        align: 'right'
      });

      tableY -= rowHeight;
    });

    currentY = tableY;

    // --- TOTALS GRID SECTION ---
    currentY -= 15;

    const summaryLabels = [
      { text: 'Sub-Total', val: formatCurrency(invoice.subtotal), isBold: false },
      { text: `GST (${items[0]?.gst_percentage || 18}%)`, val: formatCurrency(invoice.gst_amount), isBold: false },
      { text: 'Total', val: formatCurrency(invoice.total_amount), isBold: true, isFinal: true },
      { text: 'Paid', val: formatCurrency(invoice.paid_amount), isBold: true, isPaid: true }
    ];

    const labelAlignX = width - marginX - 110;
    const valueAlignX = width - marginX - 8;
    const rowHeightSum = 18;

    summaryLabels.forEach((row) => {
      if (row.isFinal) {
        // Draw line separator above grand total
        page.drawLine({
          start: { x: width - marginX - 180, y: currentY - 3 },
          end: { x: width - marginX, y: currentY - 3 },
          color: colorBorder,
          thickness: 1
        });
        currentY -= 6;
      }

      const labelTextY = currentY - 12;
      let textColor = colorDark;
      if (row.isPaid) textColor = rgb(16/255, 124/255, 65/255); // Green accent for paid

      drawTextHelper(page, row.text, labelAlignX, labelTextY, {
        font: row.isBold ? fontBold : fontRegular,
        size: row.isFinal ? 10 : 8.5,
        color: row.isBold && !row.isPaid && !row.isFinal ? colorDark : (row.isFinal ? colorPrimary : textColor),
        align: 'right'
      });

      drawTextHelper(page, row.val, valueAlignX, labelTextY, {
        font: row.isBold ? fontBold : fontRegular,
        size: row.isFinal ? 10 : 8.5,
        color: row.isFinal ? colorPrimary : textColor,
        align: 'right'
      });

      currentY -= rowHeightSum;
    });

    // --- FOOTER SECTION ---
    // Horizontal separator
    page.drawLine({
      start: { x: marginX, y: 75 },
      end: { x: width - marginX, y: 75 },
      color: colorBorder,
      thickness: 1
    });

    // Thank you text
    drawTextHelper(page, 'Thank you for doing business with us!', width / 2, 55, {
      font: fontRegular,
      size: 9,
      color: colorMuted,
      align: 'center'
    });

    // Copyright
    const copyrightText = `All rights reserved by © ${settings?.company_name || 'I-SUCCESSNODE'} (OPC) Private Limited 2025`;
    drawTextHelper(page, copyrightText, width / 2, 38, {
      font: fontRegular,
      size: 7,
      color: colorMuted,
      align: 'center'
    });

    // Minimalist indigo bottom accent bar
    page.drawRectangle({
      x: 0,
      y: 0,
      width: width,
      height: 12,
      color: colorPrimary
    });

    // Save and return PDF bytes
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;

  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
};

// Mock Data
const mockInvoice = {
  invoice_number: '2026/MCG/1903', // seeded invoice with slash
  invoice_date: '2026-06-08',
  subtotal: 83474.58,
  gst_amount: 15025.42,
  total_amount: 98500.00,
  paid_amount: 98500.00,
  status: 'paid',
  customers: {
    name: 'test',
    email: 'test@gmail.com',
    phone: '1234567890',
    gst_number: '09AAHCI9258G1Z3',
    address: '123 Test Street, Test City'
  },
  invoice_items: [
    {
      program_name: 'ABC',
      description: 'First program description',
      quantity: 1,
      unit_price: 41737.29,
      gst_percentage: 18,
      gst_amount: 7512.71,
      total_amount: 49250.00
    },
    {
      program_name: 'FRMC',
      description: '',
      quantity: 1,
      unit_price: 41737.29,
      gst_percentage: 18,
      gst_amount: 7512.71,
      total_amount: 49250.00
    },
    {
      program_name: 'ASDF (complementary)',
      description: '',
      quantity: 1,
      unit_price: 0,
      gst_percentage: 0,
      gst_amount: 0,
      total_amount: 0
    }
  ]
};

const mockSettings = {
  company_name: 'I-SUCCESSNODE',
  gst_number: '09AAHCI9258G1Z3',
  email: 'support@isuccessnode.com',
  phone: '+91-7969537567',
  website: 'www.isuccessnode.com',
  address: 'I-SUCCESSNODE Office, India',
  logo_url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' // base64 URL check
};

async function runTest() {
  try {
    console.log("Running self-contained modern PDF generation...");
    const pdfBytes = await generateInvoicePDF(mockInvoice, mockSettings);
    const outputPath = path.resolve('./scratch/test_output_self.pdf');
    fs.writeFileSync(outputPath, pdfBytes);
    console.log("PDF self-contained generated successfully at:", outputPath);
  } catch (error) {
    console.error("Self-contained PDF generation failed:", error);
  }
}

runTest();
