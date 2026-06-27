import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { formatCurrency, formatDate } from './helpers.js';

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

// Helper to draw a filled polygon using SVG path
const drawPolygonHelper = (page, points, options = {}) => {
  if (!points || points.length < 3) return;
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  path += ' Z';
  page.drawSvgPath(path, options);
};

// Helper to draw a filled rounded rectangle using SVG path
const drawRoundedRectangleHelper = (page, x, y, width, height, r, options = {}) => {
  const path = `M ${x + r} ${y} ` +
               `A ${r} ${r} 0 0 1 ${x} ${y + r} ` +
               `L ${x} ${y + height - r} ` +
               `A ${r} ${r} 0 0 1 ${x + r} ${y + height} ` +
               `L ${x + width - r} ${y + height} ` +
               `A ${r} ${r} 0 0 1 ${x + width} ${y + height - r} ` +
               `L ${x + width} ${y + r} ` +
               `A ${r} ${r} 0 0 1 ${x + width - r} ${y} Z`;
  page.drawSvgPath(path, options);
};

export const generateInvoicePDF = async (invoice, settings) => {
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
    
    // Detect theme
    const companyName = (activeCompany?.company_name || '').toLowerCase();
    let themeKey = 'default';
    let localLogoPath = null;

    if (companyName.includes('elite')) {
      themeKey = 'elite';
      localLogoPath = '/logo-elite.png';
    } else if (companyName.includes('harvard') || companyName.includes('havard')) {
      themeKey = 'harvard';
      localLogoPath = '/logos/harvard.png';
    } else if (companyName.includes('pmi')) {
      themeKey = 'pmi';
      localLogoPath = '/logo-pmi.jpg';
    } else if (companyName.includes('princeton') || companyName.includes('princetion')) {
      themeKey = 'princeton';
      localLogoPath = '/logos/princeton.png';
    } else if (companyName.includes('isuccessnode') || companyName.includes('i-successnode') || companyName.includes('successnode')) {
      themeKey = 'isuccessnode';
      localLogoPath = '/logos/isuccessnode.png';
    }

    // Color definitions
    const themeColors = {
      default: {
        primary: rgb(79/255, 70/255, 229/255),    // Indigo
        secondary: rgb(14/255, 165/255, 233/255),  // Sky Blue
        dark: rgb(15/255, 23/255, 42/255),        // Slate-900
        muted: rgb(71/255, 85/255, 105/255),       // Slate-600
        lightBg: rgb(248/255, 250/255, 252/255),   // Slate-50
        border: rgb(226/255, 232/255, 240/255),    // Slate-200
        white: rgb(1, 1, 1),
      },
      elite: {
        primary: rgb(46/255, 65/255, 180/255),    // Royal Blue #2E41B4
        secondary: rgb(238/255, 0, 0),             // Red #EE0000
        dark: rgb(16/255, 39/255, 68/255),         // Dark Navy #102744
        muted: rgb(100/255, 116/255, 139/255),
        lightBg: rgb(242/255, 242/255, 242/255),   // Light Gray #F2F2F2
        border: rgb(218/255, 224/255, 233/255),
        white: rgb(1, 1, 1),
      },
      harvard: {
        primary: rgb(119/255, 21/255, 29/255),     // Crimson #77151D
        secondary: rgb(8/255, 30/255, 66/255),     // Deep Navy #081E42
        dark: rgb(16/255, 39/255, 68/255),         // Navy #102744
        muted: rgb(100/255, 116/255, 139/255),
        lightBg: rgb(242/255, 242/255, 242/255),   // Light Gray #F2F2F2
        border: rgb(218/255, 224/255, 233/255),
        white: rgb(1, 1, 1),
      },
      pmi: {
        primary: rgb(60/255, 11/255, 181/255),     // Purple #3C0BB5
        secondary: rgb(255/255, 192/255, 0),       // Gold #FFC000
        dark: rgb(16/255, 39/255, 68/255),         // Dark Navy #102744
        muted: rgb(100/255, 116/255, 139/255),
        lightBg: rgb(248/255, 250/255, 252/255),
        border: rgb(226/255, 232/255, 240/255),
        white: rgb(1, 1, 1),
      },
      princeton: {
        primary: rgb(153/255, 102/255, 51/255),    // Bronze #996633
        secondary: rgb(16/255, 39/255, 68/255),    // Navy #102744
        dark: rgb(16/255, 39/255, 68/255),         // Deep Navy #102744
        muted: rgb(100/255, 116/255, 139/255),
        lightBg: rgb(248/255, 250/255, 252/255),
        border: rgb(226/255, 232/255, 240/255),
        white: rgb(1, 1, 1),
      },
      isuccessnode: {
        primary: rgb(79/255, 70/255, 229/255),    // Indigo
        secondary: rgb(14/255, 165/255, 233/255),  // Sky Blue
        dark: rgb(15/255, 23/255, 42/255),        // Slate-900
        muted: rgb(71/255, 85/255, 105/255),       // Slate-600
        lightBg: rgb(248/255, 250/255, 252/255),   // Slate-50
        border: rgb(226/255, 232/255, 240/255),    // Slate-200
        white: rgb(1, 1, 1),
      }
    };

    const activeTheme = themeColors[themeKey];
    const colorPrimary = activeTheme.primary;
    const colorSecondary = activeTheme.secondary;
    const colorDark = activeTheme.dark;
    const colorMuted = activeTheme.muted;
    const colorLightBg = activeTheme.lightBg;
    const colorBorder = activeTheme.border;
    const colorWhite = activeTheme.white;

    // Brand details fallback overrides
    const brandData = {
      elite: {
        company_name: 'ELITETOOLISTIC',
        phone: '+91 7969325899',
        email: 'info@elitetoolistic.com',
        website: 'www.elitetoolistic.com',
        gst_number: '09AAOCP5868J1ZI',
        cin: 'U16229UP2024PTC199657',
        address: '301, 2nd Floor, The Capital, Science City Road, Sola, Ahmedabad - 380060'
      },
      harvard: {
        company_name: 'HAVARD LEARNING',
        phone: '+91 7969325899',
        email: 'support@harvardlearning.com',
        website: 'www.harvardlearning.com',
        gst_number: '09AAOCP5868J1ZI',
        cin: 'U16229UP2024PTC199657',
        address: 'SG Highway, Bodakdev, Ahmedabad, Gujarat - 380054, India'
      },
      pmi: {
        company_name: 'PMI Services PMIS',
        phone: '+91 7969325899',
        email: 'support@pmiservices.in',
        website: 'www.pmiservices.in',
        gst_number: '09TRFPS5497N1Z6',
        address: 'Sarkhej Gandhinagar Service Road Near Wide Angle Cinema Ramdev Nagar, Satellite, Ahmedabad, Gujarat 380015'
      },
      princeton: {
        company_name: 'Princeton Professional',
        email: 'support@princetonprofessional.com',
        website: 'www.princetonprofessional.com',
        gst_number: '09AAOCP5868J1ZI',
        address: '1203, Mondeal Heights, Sarkhej Gandhinagar Service Road, Ahmedabad, Gujarat 380015'
      },
      isuccessnode: {
        company_name: 'I-SUCCESSNODE',
        phone: '+91-7969537567',
        email: 'support@isuccessnode.com',
        website: 'www.isuccessnode.com',
        gst_number: '09AAHCI9258G1Z3',
        address: ''
      }
    };

    const brandOverride = brandData[themeKey] || {};
    const companyNameText = brandOverride.company_name || activeCompany?.company_name || 'I-SUCCESSNODE';
    const companyPhone = brandOverride.phone || activeCompany?.phone || '';
    const companyEmail = brandOverride.email || activeCompany?.email || '';
    const companyWebsite = brandOverride.website || activeCompany?.website || '';
    const companyGst = brandOverride.gst_number || activeCompany?.gst_number || '';
    const companyCin = brandOverride.cin || activeCompany?.cin || '';
    const companyAddress = brandOverride.address || activeCompany?.address || '';
    const discountAmount = parseFloat(invoice.invoice_profile?.discount_amount) || 0;
    const preDiscountTotal = (parseFloat(invoice.subtotal) || 0) + (parseFloat(invoice.gst_amount) || 0);
    const displayPaidAmount = (discountAmount > 0 && Math.abs(invoice.paid_amount - preDiscountTotal) < 0.05)
      ? invoice.paid_amount - discountAmount
      : invoice.paid_amount;
    const balanceDue = Math.max(0, preDiscountTotal - discountAmount - displayPaidAmount);

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

    let currentY = height - 50;
    const marginX = 45;

    // --- LOGO LOADING ---
    let logoImage = null;
    const logoUrlToFetch = localLogoPath || settings?.logo_url;
    if (logoUrlToFetch) {
      try {
        if (logoUrlToFetch.startsWith('data:')) {
          const commaIndex = logoUrlToFetch.indexOf(',');
          if (commaIndex !== -1) {
            const base64Part = logoUrlToFetch.substring(commaIndex + 1);
            let bytes;
            if (typeof Buffer !== 'undefined') {
              bytes = new Uint8Array(Buffer.from(base64Part, 'base64'));
            } else {
              const binaryString = atob(base64Part);
              bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
            }
            try { logoImage = await pdfDoc.embedPng(bytes.buffer); } catch(e) { logoImage = await pdfDoc.embedJpg(bytes.buffer); }
          }
        } else {
          const response = await fetch(logoUrlToFetch);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            const urlLower = logoUrlToFetch.toLowerCase();
            try {
              if (urlLower.endsWith('.jpg') || urlLower.endsWith('.jpeg')) {
                logoImage = await pdfDoc.embedJpg(arrayBuffer);
              } else {
                logoImage = await pdfDoc.embedPng(arrayBuffer);
              }
            } catch(e) {
              try { logoImage = await pdfDoc.embedJpg(arrayBuffer); } catch(e2) {
                try { logoImage = await pdfDoc.embedPng(arrayBuffer); } catch(e3) {}
              }
            }
          }
        }
      } catch (err) {
        console.warn("Logo loading failed, using brand text fallback:", err);
      }
    }

    // ============================================================
    // ===  ELITE TOOLISTIC — EXACT FORMAT MATCH  =================
    // ============================================================
    if (themeKey === 'elite') {
      const eBlue    = rgb(46/255, 65/255, 180/255);  // #2E41B4 Royal blue
      const eDark    = rgb(16/255, 24/255, 56/255);   // #101838 dark navy
      const eWhite   = rgb(1, 1, 1);
      const eBorder  = rgb(200/255, 210/255, 230/255);
      const eMuted   = rgb(90/255, 100/255, 120/255);
      const eFmt     = (num) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(num) || 0);
      const eFmtZeroAsPadded = (num) => {
        const parsed = parseFloat(num) || 0;
        return parsed === 0 ? '0,000.00' : eFmt(parsed);
      };
      const eFmtTableAmount = (num) => {
        const parsed = parseFloat(num) || 0;
        if (parsed % 1 === 0) {
          return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(parsed);
        }
        return eFmt(parsed);
      };

      // ── TOP THIN BLUE STRIP ────────────────────────────────────
      // Blue strip: occupies the very top 6pt of the page
      // y=835.89 to y=841.89 in pdf-lib coordinates (0=bottom, height=top)
      page.drawRectangle({ x: 0, y: height - 6, width, height: 6, color: eBlue });

      // ──────────────────────────────────────────────────────────────────
      // HEADER BLOCK — correct PDF coordinate math
      //
      // pdf-lib: (0,0) = bottom-left, y increases UPWARD
      // Page height = 841.89 pt
      //
      // Blue strip occupies: y = 835.89 → 841.89
      // Header block:        y = 725.89 → 835.89  (110 pt tall)
      //
      // "INVOICE" text, size 38:
      //   • Helvetica cap-height ≈ 72% of size = 27.4 pt above baseline
      //   • Place baseline at y = 800  → top of letters at y ≈ 827 ✓ (< 835)
      //
      // Badge (22 pt tall) sits 10 pt below the text baseline:
      //   • badgeY = 800 − 10 − 22 = 768
      // ──────────────────────────────────────────────────────────────────
      const hBandTop = height - 6;    // 835.89  — bottom of blue strip
      const hBandH   = 110;           // height of white header band
      const hBandBot = hBandTop - hBandH;   // 725.89

      // ── WHITE BACKGROUND for entire header band ───────────────
      page.drawRectangle({ x: 0, y: hBandBot, width, height: hBandH, color: eWhite });

      // ── GEOMETRIC ACCENT — top-right corner ───────────────────
      // Triangles span from y=height (841.89) downward — drawn AFTER
      // white bg so they overlay it correctly.
      // Layer 1: large dark-navy triangle (100×100 pt)
      drawPolygonHelper(page, [
        { x: width,       y: height },
        { x: width - 110, y: height },
        { x: width,       y: height - 110 }
      ], { color: eDark });
      // Layer 2: royal-blue triangle (64×64 pt)
      drawPolygonHelper(page, [
        { x: width,     y: height },
        { x: width - 64, y: height },
        { x: width,     y: height - 64 }
      ], { color: eBlue });
      // Layer 3: lighter-blue accent sliver
      drawPolygonHelper(page, [
        { x: width,      y: height - 68 },
        { x: width - 38, y: height - 68 },
        { x: width,      y: height - 110 }
      ], { color: rgb(110/255, 140/255, 225/255) });

      // ── LOGO — left side, full brand visible ──────────────────
      // Logo is a 1:1 square → scale to 88pt tall = same as hBandH - padding
      const logoAreaX = marginX;
      const logoAreaW = 160;   // max width reserved for logo
      const logoAreaH = 90;    // max height
      if (logoImage) {
        const dims = logoImage.scaleToFit(logoAreaW, logoAreaH);
        const logoX = logoAreaX;
        const logoY = hBandBot + (hBandH - dims.height) / 2; // vertically centred
        page.drawImage(logoImage, {
          x: logoX, y: logoY,
          width: dims.width, height: dims.height
        });
      } else {
        // Text fallback
        drawTextHelper(page, 'ELITETOOLISTIC', marginX, hBandBot + 56, {
          font: fontBold, size: 13, color: eDark
        });
        drawTextHelper(page, '\u2014 Where skills meet innovation \u2014', marginX, hBandBot + 40, {
          font: fontOblique, size: 7, color: eBlue
        });
      }

      // ── VERTICAL DIVIDER LINE ─────────────────────────────────
      const divX = logoAreaX + logoAreaW + 10;   // ~215 pt from left margin
      page.drawLine({
        start: { x: divX, y: hBandTop - 4 },
        end:   { x: divX, y: hBandBot + 6 },
        color: eBorder, thickness: 1.2
      });

      // ── "INVOICE" LARGE TITLE ─────────────────────────────────
      // Baseline at y=795 — fully inside header band
      // Left-aligned starting 16pt after the vertical divider line (divX + 16)
      const invoiceBaselineY = hBandBot + 70;          // y=795
      const titleLeftX       = divX + 16;
      drawTextHelper(page, 'INVOICE', titleLeftX, invoiceBaselineY, {
        font: fontBold, size: 38, color: eDark, align: 'left'
      });

      // ── INVOICE NUMBER BADGE ──────────────────────────────────
      const badgeText = invoice.invoice_number || '2026/ECM/1000';
      const badgeW    = fontBold.widthOfTextAtSize(badgeText, 11.5) + 30;
      const badgeH    = 22;
      const badgeX    = titleLeftX;
      const badgeY    = invoiceBaselineY - 12 - badgeH;  // 12pt gap below baseline
      drawRoundedRectangleHelper(page, badgeX, badgeY, badgeW, badgeH, 5, { color: eBlue });
      drawTextHelper(page, badgeText, badgeX + badgeW / 2, badgeY + 6, {
        font: fontBold, size: 11.5, color: eWhite, align: 'center'
      });

      currentY = hBandBot - 6;

      // ── SEPARATOR LINE ─────────────────────────────────────────
      page.drawLine({
        start: { x: marginX, y: currentY },
        end:   { x: width - marginX, y: currentY },
        color: eBorder, thickness: 0.8
      });
      currentY -= 16;

      // ── BILL TO (left) + GST/CIN (right) ──────────────────────
      let billY = currentY;
      drawTextHelper(page, 'BILL TO:', marginX, billY, { font: fontBold, size: 8.5, color: eDark });
      billY -= 14;
      
      drawTextHelper(page, 'Customer Name: ', marginX, billY, { font: fontBold, size: 9, color: eDark });
      const nameLabelW = fontBold.widthOfTextAtSize('Customer Name: ', 9);
      drawTextHelper(page, invoice.customers?.name || '', marginX + nameLabelW, billY, { font: fontRegular, size: 9, color: eDark });
      billY -= 13;
      
      if (invoice.customers?.email) {
        drawTextHelper(page, 'Customer Email: ', marginX, billY, { font: fontBold, size: 9, color: eDark });
        const emailLabelW = fontBold.widthOfTextAtSize('Customer Email: ', 9);
        drawTextHelper(page, invoice.customers.email, marginX + emailLabelW, billY, { font: fontRegular, size: 9, color: eDark });
        billY -= 13;
      }
      if (invoice.customers?.phone) {
        drawTextHelper(page, 'Phone: ', marginX, billY, { font: fontBold, size: 8.5, color: eDark });
        const phoneLabelW = fontBold.widthOfTextAtSize('Phone: ', 8.5);
        drawTextHelper(page, invoice.customers.phone, marginX + phoneLabelW, billY, { font: fontRegular, size: 8.5, color: eMuted });
      }

      // GST + CIN on the right (right-aligned to the margin)
      let infoY = currentY;
      
      const gstVal = companyGst;
      const gstValW = fontRegular.widthOfTextAtSize(gstVal, 9);
      drawTextHelper(page, gstVal, width - marginX, infoY, { font: fontRegular, size: 9, color: eDark, align: 'right' });
      drawTextHelper(page, 'GST: ', width - marginX - gstValW, infoY, { font: fontBold, size: 9, color: eDark, align: 'right' });
      infoY -= 14;
      
      if (companyCin) {
        const cinVal = companyCin;
        const cinValW = fontRegular.widthOfTextAtSize(cinVal, 9);
        drawTextHelper(page, cinVal, width - marginX, infoY, { font: fontRegular, size: 9, color: eDark, align: 'right' });
        drawTextHelper(page, 'CIN: ', width - marginX - cinValW, infoY, { font: fontBold, size: 9, color: eDark, align: 'right' });
      }

      currentY = billY - 22;

      // ── ITEMS TABLE ────────────────────────────────────────────
      // Column widths match HTML preview: 45% | 18% | 18% | 19%
      const tableW  = width - marginX * 2;   // 505pt
      const colWs   = [230, 91, 91, 93];    // ITEM | Unit Price | GST(18%) | AMMOUNT
      const hdrH    = 28;
      const hdrLabels = ['ITEM', 'Unit Price', 'GST (18%)', 'AMMOUNT'];

      // Table outer top border
      page.drawLine({ start: { x: marginX, y: currentY }, end: { x: width - marginX, y: currentY }, color: eBorder, thickness: 0.8 });

      // Header background — dark navy (matches HTML preview #101838)
      page.drawRectangle({
        x: marginX, y: currentY - hdrH,
        width: tableW, height: hdrH,
        color: eDark
      });

      // Header labels (centered in each column)
      let hx = marginX;
      hdrLabels.forEach((lbl, i) => {
        const cw = colWs[i];
        const tx = hx + cw / 2;
        drawTextHelper(page, lbl, tx, currentY - hdrH + 10, {
          font: fontBold, size: 9.5, color: eWhite, align: 'center'
        });
        // Header column divider
        if (i > 0) {
          page.drawLine({ start: { x: hx, y: currentY }, end: { x: hx, y: currentY - hdrH }, color: rgb(45/255, 58/255, 94/255), thickness: 0.6 });
        }
        hx += cw;
      });

      currentY -= hdrH;

      // ── DATA ROWS ──────────────────────────────────────────────
      const rowH = 26;  // taller rows = cleaner, matches preview
      const items = invoice.invoice_items || [];
      const MIN_ROWS = Math.max(items.length, 7); // always show at least 7 rows

      for (let rIdx = 0; rIdx < MIN_ROWS; rIdx++) {
        const item = items[rIdx];
        const cellY = currentY - rowH + 9;
        const isComp = item ? parseFloat(item.unit_price) === 0 : false;

        if (item) {
          let cx = marginX;
          // Col 0: Item name — bold, centered
          drawTextHelper(page, item.program_name, cx + colWs[0] / 2, cellY, { font: fontBold, size: 9, color: eDark, align: 'center', width: colWs[0] - 12 });
          cx += colWs[0];
          // Col 1: Unit Price — bold, always 2 decimals (matches preview)
          drawTextHelper(page, isComp ? '-' : eFmt(item.unit_price), cx + colWs[1] / 2, cellY, { font: fontBold, size: 9, color: eDark, align: 'center' });
          cx += colWs[1];
          // Col 2: GST — bold, always 2 decimals
          drawTextHelper(page, isComp ? '-' : eFmt(item.gst_amount), cx + colWs[2] / 2, cellY, { font: fontBold, size: 9, color: eDark, align: 'center' });
          cx += colWs[2];
          // Col 3: Amount — bold, always 2 decimals (matches preview formatNumber)
          drawTextHelper(page, isComp ? 'Free' : eFmt(item.total_amount), cx + colWs[3] / 2, cellY, { font: fontBold, size: 9, color: eDark, align: 'center' });
        }
        // Row bottom border
        page.drawLine({ start: { x: marginX, y: currentY - rowH }, end: { x: width - marginX, y: currentY - rowH }, color: eBorder, thickness: 0.6 });
        currentY -= rowH;
      }

      // Vertical column dividers (spanning header + data rows)
      const tableBottom = currentY;
      const tableTop    = currentY + hdrH + MIN_ROWS * rowH;
      let vx = marginX;
      colWs.forEach((cw, i) => {
        if (i > 0) {
          page.drawLine({ start: { x: vx, y: tableTop }, end: { x: vx, y: tableBottom }, color: eBorder, thickness: 0.6 });
        }
        vx += cw;
      });
      // Right border
      page.drawLine({ start: { x: vx, y: tableTop }, end: { x: vx, y: tableBottom }, color: eBorder, thickness: 0.6 });
      // Left border
      page.drawLine({ start: { x: marginX, y: tableTop }, end: { x: marginX, y: tableBottom }, color: eBorder, thickness: 0.6 });

      // ── TOTALS ─────────────────────────────────────────────────
      const discountAmount = parseFloat(invoice.invoice_profile?.discount_amount) || 0;
      const preDiscTotal   = (parseFloat(invoice.subtotal) || 0) + (parseFloat(invoice.gst_amount) || 0);
      const paidAmt        = (discountAmount > 0 && Math.abs((invoice.paid_amount || 0) - preDiscTotal) < 0.05)
        ? (invoice.paid_amount || 0) - discountAmount
        : (invoice.paid_amount || 0);
      const dueAmt         = Math.max(0, preDiscTotal - discountAmount - paidAmt);

      const boxW  = 190;
      const boxX  = width - marginX - boxW;
      let totY    = currentY - 16;

      // ── Box 1: Bordered — SUB TOTAL + TOTAL GST ───────────────
      const box1H = 44;
      const box1Y = totY - box1H;
      page.drawRectangle({
        x: boxX, y: box1Y, width: boxW, height: box1H,
        borderColor: eBlue, borderWidth: 1.2, color: eWhite
      });
      // Internal divider line
      page.drawLine({ start: { x: boxX, y: box1Y + box1H / 2 }, end: { x: boxX + boxW, y: box1Y + box1H / 2 }, color: eBorder, thickness: 0.6 });
      // Row 1: SUB TOTAL
      drawTextHelper(page, 'SUB TOTAL:', boxX + 10, box1Y + 29, { font: fontBold, size: 8.5, color: eDark });
      drawTextHelper(page, eFmt(invoice.subtotal), boxX + boxW - 10, box1Y + 29, { font: fontRegular, size: 8.5, color: eDark, align: 'right' });
      // Row 2: TOTAL GST
      drawTextHelper(page, 'TOTAL GST:', boxX + 10, box1Y + 12, { font: fontBold, size: 8.5, color: eDark });
      drawTextHelper(page, eFmt(invoice.gst_amount), boxX + boxW - 10, box1Y + 12, { font: fontRegular, size: 8.5, color: eDark, align: 'right' });

      totY = box1Y - 10;

      // ── Box 2: Solid navy — TOTAL / DISCOUNT / PAID / DUE ─────
      const box2H = 76;
      const box2Y = totY - box2H;
      page.drawRectangle({ x: boxX, y: box2Y, width: boxW, height: box2H, color: eDark });

      // Internal horizontal dividers
      const row2H = box2H / 4;
      for (let i = 1; i < 4; i++) {
        page.drawLine({
          start: { x: boxX, y: box2Y + i * row2H },
          end:   { x: boxX + boxW, y: box2Y + i * row2H },
          color: rgb(50/255, 60/255, 100/255), thickness: 0.5
        });
      }

      const box2Rows = [
        { label: 'TOTAL:', val: eFmt(invoice.total_amount) },
        { label: 'DISCOUNT:', val: eFmtZeroAsPadded(discountAmount) },
        { label: 'PAID:', val: eFmt(paidAmt) },
        { label: 'DUE:', val: eFmtZeroAsPadded(dueAmt) }
      ];
      box2Rows.forEach((row, i) => {
        const ry = box2Y + box2H - (i + 1) * row2H + row2H / 2 - 4;
        drawTextHelper(page, row.label, boxX + 10, ry, { font: fontBold, size: 8.5, color: eWhite });
        drawTextHelper(page, row.val, boxX + boxW - 10, ry, { font: fontRegular, size: 8.5, color: eWhite, align: 'right' });
      });

      currentY = box2Y - 16;

      // ── FOOTER ─────────────────────────────────────────────────
      const footerH = 72;
      // Dark navy footer background
      page.drawRectangle({ x: 0, y: 0, width, height: footerH, color: eDark });
      // Thin blue accent strip on top of footer
      page.drawRectangle({ x: 0, y: footerH, width, height: 3, color: eBlue });

      // Bottom-right corner accent triangles
      drawPolygonHelper(page, [ { x: width, y: 0 }, { x: width - 80, y: 0 }, { x: width, y: 50 } ], {
        color: eBlue
      });
      drawPolygonHelper(page, [ { x: width, y: 30 }, { x: width - 40, y: 0 }, { x: width, y: 0 } ], {
        color: rgb(100/255, 130/255, 220/255)
      });

      // Contact info stacked left-aligned
      const footerTextStartY = footerH - 16;
      drawTextHelper(page, `+91 ${companyPhone.replace(/\+91[-\s]?/, '')}`, marginX, footerTextStartY, {
        font: fontBold, size: 8.5, color: eWhite
      });
      
      drawTextHelper(page, companyEmail, marginX, footerTextStartY - 14, {
        font: fontBold, size: 8.5, color: eWhite
      });
      // Draw underline for email
      const emailWidth = fontBold.widthOfTextAtSize(companyEmail, 8.5);
      page.drawLine({
        start: { x: marginX, y: footerTextStartY - 14 - 1 },
        end: { x: marginX + emailWidth, y: footerTextStartY - 14 - 1 },
        color: eWhite,
        thickness: 0.8
      });

      drawTextHelper(page, `Address: ${companyAddress}`, marginX, footerTextStartY - 28, {
        font: fontRegular, size: 7.5, color: eWhite, width: width - marginX * 2 - 100
      });

      const pdfBytes = await pdfDoc.save();
      return pdfBytes;
    }
    // ── end Elite dedicated path ──────────────────────────────────

    // --- DRAW TOP HEADER (all other themes) ---
    const bannerHeight = 85;
    if (themeKey !== 'default') {
      // Draw background banner rectangle
      page.drawRectangle({
        x: 0,
        y: height - bannerHeight,
        width: width,
        height: bannerHeight,
        color: colorPrimary
      });

      // Draw bottom accent lines for specific brands
      if (themeKey === 'pmi') {
        page.drawRectangle({
          x: 0,
          y: height - bannerHeight - 4,
          width: width,
          height: 4,
          color: colorSecondary
        });
      }

        // Draw logo inside banner (Left for Harvard/PMI/Princeton, inside White Box on Right for Elite)
        if (logoImage) {
          const maxLogoW = 120;
          const maxLogoH = 55;
          const logoX = marginX;
          const logoY = height - bannerHeight + (bannerHeight - maxLogoH) / 2;
          const dims = logoImage.scaleToFit(maxLogoW, maxLogoH);
          page.drawImage(logoImage, {
            x: logoX,
            y: logoY + (maxLogoH - dims.height) / 2,
            width: dims.width,
            height: dims.height
          });
        }

        // Draw banner texts in white
        if (themeKey === 'pmi') {
          drawTextHelper(page, 'TAX INVOICE', width - marginX, height - 38, {
            font: fontBold,
            size: 13,
            color: colorWhite,
            align: 'right'
          });
          drawTextHelper(page, `INV-${invoice.invoice_number}`, width - marginX, height - 58, {
            font: fontBold,
            size: 16,
            color: colorWhite,
            align: 'right'
          });
          drawTextHelper(page, 'PMI Services PMIS', marginX + 130, height - 48, {
            font: fontBold,
            size: 13,
            color: colorWhite
          });
        } else {
          // Harvard and Princeton
          drawTextHelper(page, 'TAX INVOICE', width - marginX, height - 34, {
            font: fontBold,
            size: 14,
            color: colorWhite,
            align: 'right'
          });
          drawTextHelper(page, `Invoice No: ${invoice.invoice_number}`, width - marginX, height - 50, {
            font: fontRegular,
            size: 9,
            color: colorWhite,
            align: 'right'
          });
          drawTextHelper(page, `Date: ${formatDate(invoice.invoice_date)}`, width - marginX, height - 64, {
            font: fontRegular,
            size: 9,
            color: colorWhite,
            align: 'right'
          });
        }

      currentY = height - bannerHeight - (themeKey === 'pmi' ? 25 : 20);
    } else {
      // Default standard header
      drawTextHelper(page, 'INVOICE', marginX, currentY - 20, { font: fontBold, size: 26, color: colorDark });
      let metaY = currentY - 45;
      drawTextHelper(page, 'Invoice Code:', marginX, metaY, { font: fontBold, size: 9, color: colorMuted });
      drawTextHelper(page, invoice.invoice_number, marginX + 70, metaY, { font: fontRegular, size: 9, color: colorDark });
      metaY -= 14;
      drawTextHelper(page, 'Issue Date:', marginX, metaY, { font: fontBold, size: 9, color: colorMuted });
      drawTextHelper(page, formatDate(invoice.invoice_date), marginX + 70, metaY, { font: fontRegular, size: 9, color: colorDark });

      if (logoImage) {
        const dims = logoImage.scaleToFit(140, 50);
        page.drawImage(logoImage, {
          x: width - marginX - dims.width,
          y: currentY - dims.height - 10,
          width: dims.width,
          height: dims.height,
        });
      }
      currentY -= 105;
    }

    // --- SENDER & RECIPIENT INFORMATION ---
    if (themeKey === 'princeton') {
      // PRINCETON SIDE-BY-SIDE LAYOUT
      page.drawLine({
        start: { x: marginX, y: currentY },
        end: { x: width - marginX, y: currentY },
        color: colorBorder,
        thickness: 1
      });
      currentY -= 20;

      const leftColW = 200;
      const rightColW = width - marginX * 2 - leftColW - 15; // 290pt
      const rightColX = marginX + leftColW + 15;

      // Draw Left Column: Company subheader + BILL TO + SHIP TO
      let leftY = currentY;
      drawTextHelper(page, companyNameText, marginX, leftY, { font: fontBold, size: 10, color: colorDark });
      leftY -= 12;
      drawTextHelper(page, 'Aesthetic Accounting & Consulting', marginX, leftY, { font: fontOblique, size: 8, color: colorMuted });
      leftY -= 25;

      // BILL TO
      drawTextHelper(page, 'BILL TO:', marginX, leftY, { font: fontBold, size: 8, color: colorMuted });
      leftY -= 12;
      drawTextHelper(page, invoice.customers?.name || 'Client Name', marginX, leftY, { font: fontBold, size: 9, color: colorDark });
      leftY -= 11;
      if (invoice.customers?.email) {
        drawTextHelper(page, invoice.customers.email, marginX, leftY, { font: fontRegular, size: 8, color: colorMuted });
        leftY -= 10;
      }
      if (invoice.customers?.phone) {
        drawTextHelper(page, `Phone: ${invoice.customers.phone}`, marginX, leftY, { font: fontRegular, size: 8, color: colorMuted });
        leftY -= 10;
      }
      if (invoice.customers?.address) {
        drawTextHelper(page, invoice.customers.address, marginX, leftY, { font: fontRegular, size: 8, color: colorMuted, width: leftColW });
        leftY -= 25;
      } else {
        leftY -= 15;
      }

      // SHIP TO (Duplicate of customer details to match screenshot layout)
      drawTextHelper(page, 'SHIP TO:', marginX, leftY, { font: fontBold, size: 8, color: colorMuted });
      leftY -= 12;
      drawTextHelper(page, invoice.customers?.name || 'Client Name', marginX, leftY, { font: fontBold, size: 9, color: colorDark });
      leftY -= 11;
      if (invoice.customers?.address) {
        drawTextHelper(page, invoice.customers.address, marginX, leftY, { font: fontRegular, size: 8, color: colorMuted, width: leftColW });
      }

      // Draw Right Column: Item Table (Description, Qty, Unit Price, Amount)
      let tableY = currentY;
      
      // Draw "TAX INVOICE" header above table
      drawTextHelper(page, 'TAX INVOICE', rightColX, tableY, { font: fontBold, size: 12, color: colorDark });
      tableY -= 18;

      // Draw Table Header
      const headerH = 18;
      page.drawRectangle({
        x: rightColX,
        y: tableY - headerH,
        width: rightColW,
        height: headerH,
        color: colorDark // Navy
      });

      const colDescX = rightColX + 5;
      const colQtyX = rightColX + 130;
      const colPriceX = rightColX + 160;
      const colAmtX = rightColX + 225;

      const headerLabelY = tableY - headerH + 5;
      drawTextHelper(page, 'Description', colDescX, headerLabelY, { font: fontBold, size: 7.5, color: colorWhite });
      drawTextHelper(page, 'Qty', colQtyX + 10, headerLabelY, { font: fontBold, size: 7.5, color: colorWhite, align: 'right' });
      drawTextHelper(page, 'Unit Price', colPriceX + 35, headerLabelY, { font: fontBold, size: 7.5, color: colorWhite, align: 'right' });
      drawTextHelper(page, 'Amount', colAmtX + 55, headerLabelY, { font: fontBold, size: 7.5, color: colorWhite, align: 'right' });

      tableY -= headerH;

      const items = invoice.invoice_items || [];
      const rowH = 22;

      items.forEach((item) => {
        // Draw row bottom border
        page.drawLine({
          start: { x: rightColX, y: tableY - rowH },
          end: { x: rightColX + rightColW, y: tableY - rowH },
          color: colorBorder,
          thickness: 0.5
        });

        const cellY = tableY - 15;
        drawTextHelper(page, item.program_name, colDescX, cellY, { font: fontRegular, size: 8, color: colorDark, width: 125 });
        drawTextHelper(page, String(item.quantity || 1), colQtyX + 10, cellY, { font: fontRegular, size: 8, color: colorDark, align: 'right' });
        
        const isComp = parseFloat(item.unit_price) === 0;
        if (!isComp) {
          drawTextHelper(page, formatCurrency(item.unit_price), colPriceX + 35, cellY, { font: fontRegular, size: 8, color: colorDark, align: 'right' });
          drawTextHelper(page, formatCurrency(item.total_amount), colAmtX + 55, cellY, { font: fontBold, size: 8, color: colorDark, align: 'right' });
        } else {
          drawTextHelper(page, '-', colPriceX + 35, cellY, { font: fontRegular, size: 8, color: colorMuted, align: 'right' });
          drawTextHelper(page, 'Free', colAmtX + 55, cellY, { font: fontOblique, size: 8, color: colorPrimary, align: 'right' });
        }

        tableY -= rowH;
      });

      // Draw Totals below the table
      tableY -= 15;
      const rightAlignLabelX = rightColX + 190;
      const rightAlignValueX = rightColX + rightColW - 5;
      const totalsRowH = 14;

      const realDiscountAmt = parseFloat(invoice.invoice_profile?.discount_amount) || 0;
      const rows = [
        { label: 'Sub-Total', val: formatCurrency(invoice.subtotal) },
        { label: `GST (18%)`, val: formatCurrency(invoice.gst_amount) }
      ];
      if (realDiscountAmt > 0) {
        rows.push({
          label: invoice.invoice_profile?.discount_type === 'percentage'
            ? `Discount (${invoice.invoice_profile?.discount_value}%)`
            : 'Discount',
          val: `-${formatCurrency(realDiscountAmt)}`
        });
      }
      rows.push(
        { label: 'Total', val: formatCurrency(invoice.total_amount), isBold: true },
        { label: 'Paid', val: formatCurrency(invoice.paid_amount), isBold: true },
        { label: 'Balance Due', val: formatCurrency(balanceDue), isBold: true }
      );

      rows.forEach(r => {
        if (r.isBold && r.label === 'Total') {
          page.drawLine({
            start: { x: rightColX + 100, y: tableY + 2 },
            end: { x: rightColX + rightColW, y: tableY + 2 },
            color: colorBorder,
            thickness: 0.8
          });
        }

        drawTextHelper(page, r.label, rightAlignLabelX, tableY - 10, {
          font: r.isBold ? fontBold : fontRegular,
          size: 8,
          color: r.label === 'Balance Due' && balanceDue > 0 ? rgb(217/255, 119/255, 6/255) : colorDark,
          align: 'right'
        });
        drawTextHelper(page, r.val, rightAlignValueX, tableY - 10, {
          font: r.isBold ? fontBold : fontRegular,
          size: 8,
          color: r.label === 'Balance Due' && balanceDue > 0 ? rgb(217/255, 119/255, 6/255) : colorDark,
          align: 'right'
        });

        tableY -= totalsRowH;
      });

      currentY = Math.min(leftY, tableY) - 20;
    } else {
      // STANDARD STACKED LAYOUT (Harvard, PMI, and Default)
      page.drawLine({
        start: { x: marginX, y: currentY },
        end: { x: width - marginX, y: currentY },
        color: colorBorder,
        thickness: 1
      });
      currentY -= 20;

      const colWidth = 230;
      const rightColX = width - marginX - colWidth;

      // Sender info (From)
      let leftY = currentY;
      drawTextHelper(page, 'FROM', marginX, leftY, { font: fontBold, size: 8, color: colorMuted });
      leftY -= 14;
      drawTextHelper(page, companyNameText, marginX, leftY, { font: fontBold, size: 10, color: colorDark });
      leftY -= 13;
      if (companyPhone) {
        drawTextHelper(page, `Phone: ${companyPhone}`, marginX, leftY, { font: fontRegular, size: 8.5, color: colorMuted });
        leftY -= 12;
      }
      if (companyEmail) {
        drawTextHelper(page, `Email: ${companyEmail}`, marginX, leftY, { font: fontRegular, size: 8.5, color: colorMuted });
        leftY -= 12;
      }
      if (companyWebsite) {
        drawTextHelper(page, `Web: ${companyWebsite}`, marginX, leftY, { font: fontRegular, size: 8.5, color: colorMuted });
        leftY -= 12;
      }
      if (companyGst) {
        drawTextHelper(page, `GST: ${companyGst}`, marginX, leftY, { font: fontBold, size: 8.5, color: colorMuted });
        leftY -= 12;
      }
      if (companyCin) {
        drawTextHelper(page, `CIN: ${companyCin}`, marginX, leftY, { font: fontRegular, size: 8.5, color: colorMuted });
        leftY -= 12;
      }
      if (companyAddress) {
        drawTextHelper(page, companyAddress, marginX, leftY, { font: fontRegular, size: 8.5, color: colorMuted, width: colWidth });
      }

      // Customer info (Bill To)
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

      currentY = Math.min(leftY, rightY) - 25;
    }

      // --- TABLE SECTION ---
      // Define headers and column layouts
      let headers = [];
      let colWidths = [];

      if (themeKey === 'harvard') {
        headers = ['Item Description', 'Quantity', 'Rate', 'Amount'];
        colWidths = [265, 70, 80, 90]; // total 505pt
      } else if (themeKey === 'pmi') {
        headers = ['Description', 'Qty', 'Unit Price', 'Tax (GST 18%)', 'Amount'];
        colWidths = [215, 50, 80, 80, 80]; // total 505pt
      } else {
        // default
        headers = ['Description', 'Unit Price', 'GST (18%)', 'Amount (INR)'];
        colWidths = [225, 100, 90, 90]; // total 505pt
      }

      const tableWidth = width - marginX * 2; // 505pt
      const tableHeaderHeight = 22;

      // Draw header row background
      if (themeKey === 'harvard' || themeKey === 'pmi') {
        page.drawRectangle({
          x: marginX,
          y: currentY - tableHeaderHeight,
          width: tableWidth,
          height: tableHeaderHeight,
          color: rgb(242/255, 242/255, 242/255) // Gray
        });
      } else {
        page.drawRectangle({
          x: marginX,
          y: currentY - tableHeaderHeight,
          width: tableWidth,
          height: tableHeaderHeight,
          color: colorPrimary
        });
      }

      // Draw Header Labels
      const labelY = currentY - tableHeaderHeight + 7;
      let startX = marginX;

      headers.forEach((h, idx) => {
        const curW = colWidths[idx];
        let align = 'left';
        let labelColor = colorWhite;
        let fontStyle = fontBold;

        if (themeKey === 'harvard') {
          labelColor = colorPrimary; // Crimson text
        } else if (themeKey === 'pmi') {
          labelColor = colorDark; // Dark Navy text
        }

        if (idx > 0 && (h.includes('Qty') || h.includes('Price') || h.includes('Rate') || h.includes('Total') || h.includes('Amount') || h.includes('GST'))) {
          align = 'right';
        }

        const labelTextX = align === 'center' ? startX + curW / 2 : (align === 'right' ? startX + curW - 8 : startX + 8);
        drawTextHelper(page, h, labelTextX, labelY, {
          font: fontStyle,
          size: 8.5,
          color: labelColor,
          align
        });

        startX += curW;
      });

      currentY -= tableHeaderHeight;

      // Draw rows
      let tableY = currentY;
      const items = invoice.invoice_items || [];
      const formatNumber = (num) => {
        return new Intl.NumberFormat('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(parseFloat(num) || 0);
      };

      {
        const rowHeight = 32;
        items.forEach((item, rIdx) => {
          page.drawLine({
            start: { x: marginX, y: tableY - rowHeight },
            end: { x: width - marginX, y: tableY - rowHeight },
            color: colorBorder,
            thickness: 0.5
          });

          const cellTextY = tableY - 18;
          let colX = marginX;

          headers.forEach((h, idx) => {
            const curW = colWidths[idx];
            const isComp = parseFloat(item.unit_price) === 0;

            if (themeKey === 'harvard') {
              if (idx === 0) {
                drawTextHelper(page, item.program_name, colX + 8, cellTextY, { font: fontBold, size: 9, color: colorDark, width: curW - 16 });
              } else if (idx === 1) {
                drawTextHelper(page, String(item.quantity || 1), colX + curW - 8, cellTextY, { font: fontRegular, size: 8.5, color: colorDark, align: 'right' });
              } else if (idx === 2) {
                const txt = isComp ? '-' : formatCurrency(item.unit_price);
                drawTextHelper(page, txt, colX + curW - 8, cellTextY, { font: fontRegular, size: 8.5, color: colorDark, align: 'right' });
              } else if (idx === 3) {
                const txt = isComp ? 'Free' : formatCurrency(item.total_amount);
                drawTextHelper(page, txt, colX + curW - 8, cellTextY, { font: isComp ? fontOblique : fontBold, size: 9, color: isComp ? colorPrimary : colorDark, align: 'right' });
              }
            } else if (themeKey === 'pmi') {
              if (idx === 0) {
                drawTextHelper(page, item.program_name, colX + 8, cellTextY, { font: fontBold, size: 9, color: colorDark, width: curW - 16 });
              } else if (idx === 1) {
                drawTextHelper(page, String(item.quantity || 1), colX + curW - 8, cellTextY, { font: fontRegular, size: 8.5, color: colorDark, align: 'right' });
              } else if (idx === 2) {
                const txt = isComp ? '-' : formatCurrency(item.unit_price);
                drawTextHelper(page, txt, colX + curW - 8, cellTextY, { font: fontRegular, size: 8.5, color: colorDark, align: 'right' });
              } else if (idx === 3) {
                const txt = isComp ? '-' : formatCurrency(item.gst_amount);
                drawTextHelper(page, txt, colX + curW - 8, cellTextY, { font: fontRegular, size: 8.5, color: colorDark, align: 'right' });
              } else if (idx === 4) {
                const txt = isComp ? 'Free' : formatCurrency(item.total_amount);
                drawTextHelper(page, txt, colX + curW - 8, cellTextY, { font: isComp ? fontOblique : fontBold, size: 9, color: isComp ? colorPrimary : colorDark, align: 'right' });
              }
            } else {
              if (idx === 0) {
                drawTextHelper(page, item.program_name, colX + 8, cellTextY, { font: fontBold, size: 9, color: colorDark, width: curW - 16 });
              } else if (idx === 1) {
                const txt = isComp ? '-' : formatCurrency(item.unit_price);
                drawTextHelper(page, txt, colX + curW - 8, cellTextY, { font: fontRegular, size: 8.5, color: colorDark, align: 'right' });
              } else if (idx === 2) {
                const txt = isComp ? '-' : formatCurrency(item.gst_amount);
                drawTextHelper(page, txt, colX + curW - 8, cellTextY, { font: fontRegular, size: 8.5, color: colorDark, align: 'right' });
              } else if (idx === 3) {
                const txt = isComp ? 'Free' : formatCurrency(item.total_amount);
                drawTextHelper(page, txt, colX + curW - 8, cellTextY, { font: isComp ? fontOblique : fontBold, size: 9, color: isComp ? colorPrimary : colorDark, align: 'right' });
              }
            }

            colX += curW;
          });

          tableY -= rowHeight;
        });
      }

      currentY = tableY;

      // --- TOTALS SECTION ---
      {
        currentY -= 15;
        const realDiscountAmt = parseFloat(invoice.invoice_profile?.discount_amount) || 0;
        const summaryLabels = [
          { text: 'Sub-Total', val: formatCurrency(invoice.subtotal) },
          { text: `GST (${items[0]?.gst_percentage || 18}%)`, val: formatCurrency(invoice.gst_amount) }
        ];
        if (realDiscountAmt > 0) {
          summaryLabels.push({
            text: invoice.invoice_profile?.discount_type === 'percentage'
              ? `Discount (${invoice.invoice_profile?.discount_value}%)`
              : 'Discount',
            val: `-${formatCurrency(realDiscountAmt)}`
          });
        }
        summaryLabels.push(
          { text: 'Total', val: formatCurrency(invoice.total_amount), isBold: true, isFinal: true },
          { text: 'Paid', val: formatCurrency(displayPaidAmount), isBold: true, isPaid: true }
        );

        if (balanceDue > 0) {
          summaryLabels.push({ text: 'Balance Due', val: formatCurrency(balanceDue), isBold: true, isPending: true });
        }

        const labelAlignX = width - marginX - 115;
        const valueAlignX = width - marginX - 8;
        const rowHeightSum = 18;

        summaryLabels.forEach((row) => {
          if (row.isFinal) {
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
          if (row.isPaid) textColor = rgb(16/255, 124/255, 65/255);
          else if (row.isPending) textColor = rgb(217/255, 119/255, 6/255);

          drawTextHelper(page, row.text, labelAlignX, labelTextY, {
            font: row.isBold ? fontBold : fontRegular,
            size: row.isFinal ? 10 : 8.5,
            color: row.isFinal ? colorPrimary : textColor,
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
      }

    // ============================================================
    // --- ISUCCESSNODE DEDICATED LAYOUT (matches reference image) ---
    // ============================================================
    if (themeKey === 'isuccessnode') {
      const isn_dark = rgb(0, 0, 0);         // Black text
      const isn_muted = rgb(80/255, 80/255, 80/255); // Dark gray
      const isn_border = rgb(0, 0, 0);       // Black border lines
      const isn_headerBg = rgb(188/255, 224/255, 253/255); // Light blue table header (#BCE0FD)

      let y = height - 50;
      const lx = marginX;  // Left margin X
      const rx = width - marginX; // Right edge

      // --- HEADER: INVOICE title (left) + Logo in bordered box (right) ---
      drawTextHelper(page, 'INVOICE', lx, y, { font: fontBold, size: 30, color: isn_dark });

      // Logo box on right
      const logoBoxW = 130;
      const logoBoxH = 55;
      const logoBoxX = rx - logoBoxW;
      const logoBoxY = y - logoBoxH + 8;
      page.drawRectangle({ x: logoBoxX - 4, y: logoBoxY - 4, width: logoBoxW + 8, height: logoBoxH + 8, color: rgb(1,1,1) });
      page.drawRectangle({ x: logoBoxX - 4, y: logoBoxY - 4, width: logoBoxW + 8, height: logoBoxH + 8, borderColor: isn_border, borderWidth: 1.5, color: rgb(1,1,1) });
      if (logoImage) {
        const dims = logoImage.scaleToFit(logoBoxW, logoBoxH);
        page.drawImage(logoImage, {
          x: logoBoxX + (logoBoxW - dims.width) / 2,
          y: logoBoxY + (logoBoxH - dims.height) / 2,
          width: dims.width,
          height: dims.height
        });
      }

      y -= 38;
      drawTextHelper(page, `Invoice Number: ${invoice.invoice_number}`, lx, y, { font: fontRegular, size: 9, color: isn_muted });
      y -= 14;
      drawTextHelper(page, `Invoice Date: ${formatDate(invoice.invoice_date)}`, lx, y, { font: fontRegular, size: 9, color: isn_muted });

      y -= 30;

      // --- TWO BORDERED ADDRESS BOXES ---
      const boxPad = 10;
      const halfW = (rx - lx - 20) / 2;
      const leftBoxX = lx;
      const rightBoxX = lx + halfW + 20;

      // Measure left box height
      let lLines = 0;
      lLines += 1; // company name
      if (companyPhone) lLines++;
      if (companyWebsite) lLines++;
      if (companyGst) lLines++;
      if (companyEmail) lLines++;
      const boxH = Math.max(lLines * 14 + boxPad * 2 + 16, 80);

      // Draw left box border
      page.drawRectangle({ x: leftBoxX, y: y - boxH, width: halfW, height: boxH, borderColor: isn_border, borderWidth: 1, color: rgb(1,1,1) });
      // Draw right box border
      page.drawRectangle({ x: rightBoxX, y: y - boxH, width: halfW, height: boxH, borderColor: isn_border, borderWidth: 1, color: rgb(1,1,1) });

      // Left box content: Company info
      let leftY = y - boxPad - 4;
      drawTextHelper(page, companyNameText, leftBoxX + boxPad, leftY, { font: fontBold, size: 10, color: isn_dark });
      leftY -= 14;
      if (companyPhone) {
        drawTextHelper(page, companyPhone, leftBoxX + boxPad, leftY, { font: fontRegular, size: 8.5, color: isn_muted });
        leftY -= 12;
      }
      if (companyWebsite) {
        drawTextHelper(page, companyWebsite, leftBoxX + boxPad, leftY, { font: fontRegular, size: 8.5, color: isn_muted });
        leftY -= 12;
      }
      if (companyGst) {
        drawTextHelper(page, `GST: ${companyGst}`, leftBoxX + boxPad, leftY, { font: fontRegular, size: 8.5, color: isn_muted });
        leftY -= 12;
      }
      if (companyEmail) {
        drawTextHelper(page, companyEmail, leftBoxX + boxPad, leftY, { font: fontRegular, size: 8.5, color: isn_muted });
      }

      // Right box content: Bill To
      let rightY = y - boxPad - 4;
      drawTextHelper(page, 'BILL TO', rightBoxX + boxPad, rightY, { font: fontBold, size: 10, color: isn_dark });
      rightY -= 14;
      drawTextHelper(page, invoice.customers?.name || 'Client Name', rightBoxX + boxPad, rightY, { font: fontRegular, size: 9, color: isn_muted });
      rightY -= 12;
      if (invoice.customers?.email) {
        drawTextHelper(page, invoice.customers.email, rightBoxX + boxPad, rightY, { font: fontRegular, size: 8.5, color: isn_muted });
        rightY -= 12;
      }
      if (invoice.customers?.phone) {
        drawTextHelper(page, invoice.customers.phone, rightBoxX + boxPad, rightY, { font: fontRegular, size: 8.5, color: isn_muted });
      }

      y -= boxH + 25;

      // --- ITEMS TABLE ---
      const tableW = rx - lx;
      const colW = [220, 90, 75, 120]; // Program Name | Unit Price | GST (18%) | Amount (INR)
      const tHeaders = ['Program Name', 'Unit Price', 'GST (18%)', 'Amount (INR)'];
      const tHdrH = 22;
      const tableTopY = y;

      // Table header background
      page.drawRectangle({ x: lx, y: y - tHdrH, width: tableW, height: tHdrH, color: isn_headerBg });

      // Header labels
      let hx = lx;
      tHeaders.forEach((h, i) => {
        const cw = colW[i];
        const isRight = i > 0;
        const tx = isRight ? hx + cw - 8 : hx + 8;
        drawTextHelper(page, h, tx, y - tHdrH + 7, { font: fontBold, size: 8.5, color: isn_dark, align: isRight ? 'right' : 'left' });
        hx += cw;
      });

      // Table top border
      page.drawLine({ start: { x: lx, y }, end: { x: rx, y }, color: isn_border, thickness: 1 });
      // Header bottom border
      page.drawLine({ start: { x: lx, y: y - tHdrH }, end: { x: rx, y: y - tHdrH }, color: isn_border, thickness: 1 });

      y -= tHdrH;

      const items = invoice.invoice_items || [];
      const issnFmt = (num) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(num) || 0);
      const rowH = 24;

      items.forEach((item) => {
        const isComp = parseFloat(item.unit_price) === 0;
        let cx = lx;
        const cellY = y - rowH + 8;

        // Col 0: Program Name
        drawTextHelper(page, item.program_name, cx + 8, cellY, { font: fontRegular, size: 9, color: isn_dark, width: colW[0] - 16 });
        cx += colW[0];

        // Col 1: Unit Price
        const upTxt = isComp ? '' : issnFmt(item.unit_price);
        drawTextHelper(page, upTxt, cx + colW[1] - 8, cellY, { font: fontRegular, size: 9, color: isn_dark, align: 'right' });
        cx += colW[1];

        // Col 2: GST
        const gstTxt = isComp ? '' : issnFmt(item.gst_amount);
        drawTextHelper(page, gstTxt, cx + colW[2] - 8, cellY, { font: fontRegular, size: 9, color: isn_dark, align: 'right' });
        cx += colW[2];

        // Col 3: Amount
        const amtTxt = isComp ? '0.00' : issnFmt(item.total_amount);
        drawTextHelper(page, amtTxt, cx + colW[3] - 8, cellY, { font: fontRegular, size: 9, color: isn_dark, align: 'right' });

        // Row bottom border
        page.drawLine({ start: { x: lx, y: y - rowH }, end: { x: rx, y: y - rowH }, color: isn_border, thickness: 0.8 });
        y -= rowH;
      });

      // Table bottom border
      page.drawLine({ start: { x: lx, y }, end: { x: rx, y }, color: isn_border, thickness: 0.8 });

      // Draw vertical grid lines for the items table
      let vx = lx;
      page.drawLine({ start: { x: vx, y: tableTopY }, end: { x: vx, y }, color: isn_border, thickness: 1 });
      colW.forEach((w) => {
        vx += w;
        page.drawLine({
          start: { x: vx, y: tableTopY },
          end: { x: vx, y },
          color: isn_border,
          thickness: 1
        });
      });

      y -= 25;

      // --- TOTALS TABLE (right aligned, with border lines per row) ---
      const totW = 200;
      const totX = rx - totW;
      const totLabelX = totX;
      const totValX = rx - 8;
      const totRowH = 20;

      // Draw border box around totals
      const realDiscountAmt = parseFloat(invoice.invoice_profile?.discount_amount) || 0;
      const preDiscountTotal = invoice.subtotal + invoice.gst_amount;
      const isnTotals = [
        { label: 'Sub-Total', val: `₹${issnFmt(invoice.subtotal)}` },
        { label: 'Tax (18%)', val: `₹${issnFmt(invoice.gst_amount)}` },
        { label: 'Total', val: `₹${issnFmt(preDiscountTotal)}`, bold: true }
      ];

      if (realDiscountAmt > 0) {
        isnTotals.push({ label: 'Discount', val: `₹${issnFmt(realDiscountAmt)}` });
      }

      isnTotals.push({ label: 'Paid', val: `₹${issnFmt(displayPaidAmount)}`, bold: true });

      const totalBoxH = isnTotals.length * totRowH + 2;
      page.drawRectangle({ x: totX - 8, y: y - totalBoxH, width: totW + 8, height: totalBoxH, borderColor: isn_border, borderWidth: 1, color: rgb(1,1,1) });

      // Draw vertical separator in totals box
      page.drawLine({
        start: { x: rx - 85, y },
        end: { x: rx - 85, y: y - totalBoxH },
        color: isn_border,
        thickness: 0.8
      });

      let totY = y - 2;
      isnTotals.forEach((row, i) => {
        const labelY = totY - totRowH + 6;
        drawTextHelper(page, row.label, totLabelX, labelY, { font: row.bold ? fontBold : fontRegular, size: 9, color: isn_dark });
        drawTextHelper(page, row.val, totValX, labelY, { font: row.bold ? fontBold : fontRegular, size: 9, color: isn_dark, align: 'right' });
        if (i < isnTotals.length - 1) {
          page.drawLine({ start: { x: totX - 8, y: totY - totRowH }, end: { x: rx, y: totY - totRowH }, color: isn_border, thickness: 0.8 });
        }
        totY -= totRowH;
      });

      // --- FOOTER ---
      const footerY = 70;
      drawTextHelper(page, 'Thank you for doing business with us!', width / 2, footerY, { font: fontRegular, size: 10, color: isn_muted, align: 'center' });

      const copyrightText = `All rights reserved by © I-SUCCESSNODE (OPC) Private Limited 2025`;
      drawTextHelper(page, copyrightText, lx, footerY - 16, { font: fontRegular, size: 7.5, color: isn_muted });

      // Color accent bar at very bottom (Lime green on top of Purple)
      page.drawRectangle({ x: 0, y: 0, width: width, height: 8, color: rgb(107/255, 33/255, 168/255) }); // Purple (#6b21a8)
      page.drawRectangle({ x: 0, y: 8, width: width, height: 6, color: rgb(132/255, 204/255, 22/255) }); // Lime green (#84cc16)

      // Save and return early for isuccessnode
      const pdfBytes = await pdfDoc.save();
      return pdfBytes;
    }

    // --- DRAW BOTTOM FOOTER ---
    const footerHeight = 70;
    if (themeKey !== 'default') {
      page.drawRectangle({
        x: 0,
        y: 0,
        width: width,
        height: footerHeight,
        color: themeKey === 'harvard' ? colorSecondary : colorPrimary
      });

      if (themeKey === 'harvard' || themeKey === 'pmi') {
        const borderCol = themeKey === 'harvard' ? colorPrimary : colorSecondary;
        page.drawRectangle({
          x: 0,
          y: footerHeight,
          width: width,
          height: 3,
          color: borderCol
        });
      }

      const footerTextY = footerHeight / 2;
      
      if (themeKey === 'harvard') {
        const contactLine = `Address: ${companyAddress}  |  Phone: ${companyPhone}  |  Email: ${companyEmail}`;
        drawTextHelper(page, contactLine, width / 2, footerTextY, {
          font: fontRegular,
          size: 7.5,
          color: colorWhite,
          align: 'center'
        });
      } else if (themeKey === 'pmi') {
        const contactLine1 = `Address: ${companyAddress}`;
        const contactLine2 = `Phone: ${companyPhone}  |  Email: ${companyEmail}  |  Website: ${companyWebsite}`;
        drawTextHelper(page, contactLine1, width / 2, footerTextY + 6, {
          font: fontRegular,
          size: 7.5,
          color: colorWhite,
          align: 'center'
        });
        drawTextHelper(page, contactLine2, width / 2, footerTextY - 6, {
          font: fontRegular,
          size: 7.5,
          color: colorWhite,
          align: 'center'
        });
      } else if (themeKey === 'princeton') {
        const contactLine = `Address: ${companyAddress}  |  Email: ${companyEmail}`;
        drawTextHelper(page, contactLine, width / 2, footerTextY, {
          font: fontRegular,
          size: 7.5,
          color: colorWhite,
          align: 'center'
        });
      }
    } else {
      // Default standard footer
      page.drawLine({
        start: { x: marginX, y: 75 },
        end: { x: width - marginX, y: 75 },
        color: colorBorder,
        thickness: 1
      });

      drawTextHelper(page, 'Thank you for doing business with us!', width / 2, 55, {
        font: fontRegular,
        size: 9,
        color: colorMuted,
        align: 'center'
      });

      const copyrightText = `All rights reserved by © ${companyNameText} (OPC) Private Limited 2025`;
      drawTextHelper(page, copyrightText, width / 2, 38, {
        font: fontRegular,
        size: 7,
        color: colorMuted,
        align: 'center'
      });

      page.drawRectangle({
        x: 0,
        y: 0,
        width: width,
        height: 12,
        color: colorPrimary
      });
    }

    // Save and return PDF bytes
    const pdfBytes = await pdfDoc.save();
    return pdfBytes;
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
};

