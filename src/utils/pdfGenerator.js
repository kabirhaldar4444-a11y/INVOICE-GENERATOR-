import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { formatCurrency, formatDate } from './helpers';

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
      localLogoPath = '/logos/elite.png';
    } else if (companyName.includes('harvard') || companyName.includes('havard')) {
      themeKey = 'harvard';
      localLogoPath = '/logos/harvard.png';
    } else if (companyName.includes('pmi')) {
      themeKey = 'pmi';
      localLogoPath = '/logos/pmi.png';
    } else if (companyName.includes('princeton') || companyName.includes('princetion')) {
      themeKey = 'princeton';
      localLogoPath = '/logos/princeton.png';
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
    const balanceDue = Math.max(0, (parseFloat(invoice.total_amount) || 0) - (parseFloat(invoice.paid_amount) || 0));

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
            logoImage = await pdfDoc.embedPng(bytes.buffer);
          }
        } else {
          // Fetch from Vite server or URL
          const response = await fetch(logoUrlToFetch);
          if (response.ok) {
            const arrayBuffer = await response.arrayBuffer();
            logoImage = await pdfDoc.embedPng(arrayBuffer);
          }
        }
      } catch (err) {
        console.warn("Logo loading failed, using brand text fallback:", err);
      }
    }

    // --- DRAW TOP HEADER ---
    const bannerHeight = 85;
    if (themeKey !== 'default') {
      if (themeKey === 'elite') {
        // Draw a top royal blue strip
        page.drawRectangle({
          x: 0,
          y: height - 8,
          width: width,
          height: 8,
          color: rgb(46/255, 65/255, 180/255) // Royal Blue
        });

        // Draw logo on the left (only the logo image, fully visible)
        if (logoImage) {
          const maxLogoW = 160;
          const maxLogoH = 65;
          const logoX = marginX;
          const logoY = height - maxLogoH - 24;
          const dims = logoImage.scaleToFit(maxLogoW, maxLogoH);
          page.drawImage(logoImage, {
            x: logoX,
            y: logoY + (maxLogoH - dims.height) / 2,
            width: dims.width,
            height: dims.height
          });
        }

        // Draw TAX INVOICE title in bold dark blue on the right
        drawTextHelper(page, 'TAX INVOICE', width - marginX, height - 48, {
          font: fontBold,
          size: 24,
          color: rgb(16/255, 39/255, 68/255), // Dark Navy
          align: 'right'
        });

        // Draw clean invoice number and date details
        drawTextHelper(page, `Invoice No: ${invoice.invoice_number}`, width - marginX, height - 63, {
          font: fontBold,
          size: 10,
          color: rgb(46/255, 65/255, 180/255), // Royal Blue
          align: 'right'
        });

        drawTextHelper(page, `Date: ${formatDate(invoice.invoice_date)}`, width - marginX, height - 76, {
          font: fontRegular,
          size: 9,
          color: colorMuted,
          align: 'right'
        });

        // Draw Status Badge under the date
        const statusText = status.toUpperCase();
        const statusWidth = fontBold.widthOfTextAtSize(statusText, 7.5) + 14;
        const statusHeight = 15;
        const statusX = width - marginX - statusWidth;
        const statusY = height - 96;

        page.drawRectangle({
          x: statusX,
          y: statusY,
          width: statusWidth,
          height: statusHeight,
          color: colorStatusBg,
        });

        drawTextHelper(page, statusText, statusX + statusWidth / 2, statusY + 3.5, {
          font: fontBold,
          size: 7.5,
          color: colorStatusText,
          align: 'center'
        });

        // Draw a clean horizontal separator line below the header details
        page.drawLine({
          start: { x: marginX, y: height - 110 },
          end: { x: width - marginX, y: height - 110 },
          color: colorBorder,
          thickness: 1
        });

        currentY = height - 130;

      } else {
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
      }

      currentY = height - bannerHeight - (themeKey === 'elite' || themeKey === 'pmi' ? 25 : 20);
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

      const rows = [
        { label: 'Sub-Total', val: formatCurrency(invoice.subtotal) },
        { label: `GST (18%)`, val: formatCurrency(invoice.gst_amount) },
        { label: 'Total', val: formatCurrency(invoice.total_amount), isBold: true },
        { label: 'Paid', val: formatCurrency(invoice.paid_amount), isBold: true },
        { label: 'Balance Due', val: formatCurrency(balanceDue), isBold: true }
      ];

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

      currentY = Math.min(leftY, tableY) - 20;    } else {
      // Elite and other standard layouts
      if (themeKey === 'elite') {
        const colWidth = 230;
        const rightColX = 390;

        // Customer info on the left
        let leftY = currentY;
        drawTextHelper(page, 'BILL TO', marginX, leftY, { font: fontBold, size: 8, color: rgb(46/255, 65/255, 180/255) });
        leftY -= 14;
        
        drawTextHelper(page, invoice.customers?.name || 'Client Name', marginX, leftY, { font: fontBold, size: 10, color: colorDark });
        leftY -= 12;
        
        if (invoice.customers?.email) {
          drawTextHelper(page, invoice.customers.email, marginX, leftY, { font: fontRegular, size: 8.5, color: colorMuted });
          leftY -= 11;
        }
        
        if (invoice.customers?.phone) {
          drawTextHelper(page, `Phone: ${invoice.customers.phone}`, marginX, leftY, { font: fontRegular, size: 8.5, color: colorMuted });
          leftY -= 11;
        }
        if (invoice.customers?.address) {
          drawTextHelper(page, invoice.customers.address, marginX, leftY, { font: fontRegular, size: 8.5, color: colorMuted, width: colWidth });
        }

        // Company metadata on the right
        let rightY = currentY;
        drawTextHelper(page, 'TAX INFORMATION', rightColX, rightY, { font: fontBold, size: 8, color: rgb(46/255, 65/255, 180/255) });
        rightY -= 14;

        if (companyGst) {
          drawTextHelper(page, 'GSTIN:', rightColX, rightY, { font: fontBold, size: 8.5, color: colorDark });
          drawTextHelper(page, companyGst, rightColX + 40, rightY, { font: fontRegular, size: 8.5, color: colorDark });
          rightY -= 12;
        }
        if (companyCin) {
          drawTextHelper(page, 'CIN:', rightColX, rightY, { font: fontBold, size: 8.5, color: colorDark });
          drawTextHelper(page, companyCin, rightColX + 40, rightY, { font: fontRegular, size: 8.5, color: colorDark });
          rightY -= 12;
        }
        
        drawTextHelper(page, 'Issued By:', rightColX, rightY, { font: fontBold, size: 8.5, color: colorMuted });
        drawTextHelper(page, companyNameText, rightColX + 50, rightY, { font: fontRegular, size: 8.5, color: colorMuted });

        currentY = Math.min(leftY, rightY) - 25;
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
      };

      // --- TABLE SECTION ---
      // Define headers and column layouts
      let headers = [];
      let colWidths = [];

      if (themeKey === 'elite') {
        headers = ['ITEM DESCRIPTION', 'UNIT PRICE', 'GST (18%)', 'AMOUNT'];
        colWidths = [225, 90, 90, 100]; // total 505pt
      } else if (themeKey === 'harvard') {
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
      const tableHeaderHeight = themeKey === 'elite' ? 24 : 22;

      // Draw header row background
      if (themeKey === 'elite') {
        page.drawRectangle({
          x: marginX,
          y: currentY - tableHeaderHeight,
          width: tableWidth,
          height: tableHeaderHeight,
          color: rgb(46/255, 65/255, 180/255) // Medium Blue (#2E41B4)
        });
      } else if (themeKey === 'harvard' || themeKey === 'pmi') {
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
      const labelY = currentY - tableHeaderHeight + (themeKey === 'elite' ? 8 : 7);
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

        if (themeKey === 'elite') {
          align = idx === 0 ? 'left' : 'right';
        } else if (idx > 0 && (h.includes('Qty') || h.includes('Price') || h.includes('Rate') || h.includes('Total') || h.includes('Amount') || h.includes('GST'))) {
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

      // Elite draws border lines around table headers
      if (themeKey === 'elite') {
        page.drawLine({
          start: { x: marginX, y: currentY },
          end: { x: width - marginX, y: currentY },
          color: rgb(0, 0, 0),
          thickness: 0.8
        });
        page.drawLine({
          start: { x: marginX, y: currentY - tableHeaderHeight },
          end: { x: width - marginX, y: currentY - tableHeaderHeight },
          color: rgb(0, 0, 0),
          thickness: 0.8
        });
      }

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

      if (themeKey === 'elite') {
        const rowHeight = 26;
        const formatNumber = (num) => {
          return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(parseFloat(num) || 0);
        };

        items.forEach((item, rIdx) => {
          const cellTextY = tableY - 17;
          const isComp = parseFloat(item.unit_price) === 0;

          // Alternate row backgrounds
          if (rIdx % 2 === 1) {
            page.drawRectangle({
              x: marginX,
              y: tableY - rowHeight,
              width: tableWidth,
              height: rowHeight,
              color: rgb(250/255, 251/255, 253/255)
            });
          }

          let colX = marginX;
          colWidths.forEach((curW, idx) => {
            let align = idx === 0 ? 'left' : 'right';
            const cellX = align === 'right' ? colX + curW - 8 : colX + 8;
            
            if (idx === 0) {
              drawTextHelper(page, item.program_name, cellX, cellTextY, {
                font: fontBold,
                size: 9,
                color: colorDark,
                width: curW - 16
              });
            } else if (idx === 1) {
              const txt = isComp ? '-' : formatNumber(item.unit_price);
              drawTextHelper(page, txt, cellX, cellTextY, {
                font: fontRegular,
                size: 9,
                color: colorDark,
                align
              });
            } else if (idx === 2) {
              const txt = isComp ? '-' : formatNumber(item.gst_amount);
              drawTextHelper(page, txt, cellX, cellTextY, {
                font: fontRegular,
                size: 9,
                color: colorDark,
                align
              });
            } else if (idx === 3) {
              const txt = isComp ? 'Free' : formatNumber(item.total_amount);
              drawTextHelper(page, txt, cellX, cellTextY, {
                font: fontBold,
                size: 9,
                color: colorDark,
                align
              });
            }
            colX += curW;
          });

          // Draw bottom horizontal border line
          page.drawLine({
            start: { x: marginX, y: tableY - rowHeight },
            end: { x: width - marginX, y: tableY - rowHeight },
            color: rgb(241/255, 245/255, 249/255),
            thickness: 1
          });

          tableY -= rowHeight;
        });

      } else {
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
      if (themeKey === 'elite') {
        const formatNumber = (num) => {
          return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(parseFloat(num) || 0);
        };

        let boxY = currentY - 15;
        const boxW = 200;
        const boxX = width - marginX - boxW;

        let lineY = boxY - 10;
        const drawSummaryRow = (label, val, isBold = false, valColor = colorDark) => {
          drawTextHelper(page, label, boxX, lineY, {
            font: isBold ? fontBold : fontRegular,
            size: isBold ? 9.5 : 8.5,
            color: isBold ? colorDark : colorMuted
          });
          drawTextHelper(page, val, width - marginX, lineY, {
            font: isBold ? fontBold : fontRegular,
            size: isBold ? 9.5 : 8.5,
            color: valColor,
            align: 'right'
          });
          lineY -= 15;
        };

        drawSummaryRow('Subtotal:', formatNumber(invoice.subtotal));
        drawSummaryRow('GST (18%):', formatNumber(invoice.gst_amount));
        
        // Horizontal divider line
        page.drawLine({
          start: { x: boxX, y: lineY + 6 },
          end: { x: width - marginX, y: lineY + 6 },
          color: rgb(226/255, 232/255, 240/255),
          thickness: 0.8
        });
        lineY -= 4;

        drawSummaryRow('Total Amount:', `INR ${formatNumber(invoice.total_amount)}`, true, rgb(16/255, 39/255, 68/255));
        drawSummaryRow('Paid Amount:', `INR ${formatNumber(invoice.paid_amount)}`, true, rgb(22/255, 163/255, 74/255));
        
        const dueColor = balanceDue > 0 ? rgb(220/255, 38/255, 38/255) : colorDark;
        drawSummaryRow('Balance Due:', `INR ${formatNumber(balanceDue)}`, true, dueColor);

        currentY = lineY - 10;
      } else {
        currentY -= 15;
        const summaryLabels = [
          { text: 'Sub-Total', val: formatCurrency(invoice.subtotal) },
          { text: `GST (${items[0]?.gst_percentage || 18}%)`, val: formatCurrency(invoice.gst_amount) },
          { text: 'Total', val: formatCurrency(invoice.total_amount), isBold: true, isFinal: true },
          { text: 'Paid', val: formatCurrency(invoice.paid_amount), isBold: true, isPaid: true }
        ];

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
    }

    // --- DRAW BOTTOM FOOTER ---
    const footerHeight = 70;
    if (themeKey !== 'default') {
      page.drawRectangle({
        x: 0,
        y: 0,
        width: width,
        height: footerHeight,
        color: themeKey === 'elite' ? colorDark : (themeKey === 'harvard' ? colorSecondary : colorPrimary)
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
      
      if (themeKey === 'elite') {
        // Draw a top border/accent line on the footer
        page.drawRectangle({
          x: 0,
          y: footerHeight,
          width: width,
          height: 3,
          color: rgb(46/255, 65/255, 180/255) // Royal Blue
        });

        // Left Column: Contact details
        drawTextHelper(page, `Phone: ${companyPhone}`, marginX, footerHeight - 20, {
          font: fontBold,
          size: 9,
          color: colorWhite
        });
        drawTextHelper(page, `Email: ${companyEmail}`, marginX, footerHeight - 34, {
          font: fontBold,
          size: 9,
          color: colorWhite
        });
        drawTextHelper(page, `Web: ${companyWebsite || 'www.elitetoolistic.com'}`, marginX, footerHeight - 48, {
          font: fontBold,
          size: 9,
          color: colorWhite
        });

        // Middle/Right Column: Address details
        const addressX = 240;
        const addressW = width - addressX - 100; // Leave space for diagonal accent
        drawTextHelper(page, 'ADDRESS', addressX, footerHeight - 20, {
          font: fontBold,
          size: 8.5,
          color: rgb(156/255, 163/255, 175/255) // Slate-400
        });
        drawTextHelper(page, companyAddress, addressX, footerHeight - 34, {
          font: fontRegular,
          size: 8,
          color: colorWhite,
          width: addressW
        });

        // Bottom-right diagonal blue accent stripe
        page.drawPolygon({
          points: [
            { x: width, y: 0 },
            { x: width - 80, y: 0 },
            { x: width, y: 35 }
          ],
          color: rgb(46/255, 65/255, 180/255)
        });
      } else if (themeKey === 'harvard') {
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

