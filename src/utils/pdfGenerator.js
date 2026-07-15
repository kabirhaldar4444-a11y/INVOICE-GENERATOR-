import { 
  PDFDocument, 
  rgb, 
  StandardFonts,
  pushGraphicsState, 
  moveTo, 
  lineTo, 
  closePath, 
  setFillingColor, 
  setStrokingColor,
  setLineWidth,
  fill, 
  stroke,
  fillAndStroke,
  popGraphicsState,
  appendBezierCurve,
  PDFName,
  PDFString,
  PDFArray,
  degrees
} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { formatCurrency, formatDate } from './helpers.js';
import { PMI_FOOTER_CONFIG } from './pmiFooterConfig.js';
import { harvardLayout } from '../../shared/harvardInvoiceLayout.ts';
import { princetonLayout } from './princetonLayoutConfig.js';
import { eliteLayout } from './eliteLayoutConfig.js';


// Helper to manually create link annotations in pdf-lib (adds clickable hyperlinks to PDF)
const addLinkToPdf = (pdfDoc, page, x, y, width, height, url) => {
  const { context } = pdfDoc;

  // Create the URI action
  const uriAction = context.register(
    context.obj({
      Type: 'Action',
      S: 'URI',
      URI: PDFString.of(url),
    })
  );

  // Create the Link Annotation
  const linkAnnotation = context.register(
    context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [x, y, x + width, y + height], // [left, bottom, right, top]
      A: uriAction,
      Border: [0, 0, 0], // Invisible border
    })
  );

  // Add the annotation to the page
  const pageDict = page.node.lookup(PDFName.of('Annots'), PDFArray);
  if (pageDict) {
    pageDict.push(linkAnnotation);
  } else {
    page.node.set(PDFName.of('Annots'), context.obj([linkAnnotation]));
  }
};

const isIsNodeName = (name) => {
  if (!name) return false;
  const n = name.toLowerCase();
  return n.includes('isuccessnode') || 
         n.includes('isucessnode') || 
         n.includes('successnode') || 
         n.includes('sucessnode') ||
         n.includes('i-successnode') || 
         n.includes('i-sucessnode');
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
  let textString = String(text || '');

  // If the font doesn't support the rupee symbol (e.g. standard Helvetica fallback), replace it with 'Rs. '
  try {
    font.widthOfTextAtSize('₹', size);
  } catch (e) {
    textString = textString.replace(/₹/g, 'Rs. ');
  }

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

// Helper to draw a filled polygon using native PDF operators (bypasses SVG path rendering issues)
const drawPolygonHelper = (page, points, options = {}) => {
  if (!points || points.length < 3) return;
  const ops = [pushGraphicsState()];
  if (options.color) {
    ops.push(setFillingColor(options.color));
  }
  if (options.borderColor) {
    ops.push(setStrokingColor(options.borderColor));
  }
  if (options.borderWidth) {
    ops.push(setLineWidth(options.borderWidth));
  }
  ops.push(moveTo(points[0].x, points[0].y));
  for (let i = 1; i < points.length; i++) {
    ops.push(lineTo(points[i].x, points[i].y));
  }
  ops.push(closePath());
  
  if (options.color && options.borderColor) {
    ops.push(fillAndStroke());
  } else if (options.color) {
    ops.push(fill());
  } else if (options.borderColor) {
    ops.push(stroke());
  } else {
    ops.push(fill());
  }
  ops.push(popGraphicsState());
  page.pushOperators(...ops);
};

// Helper to draw a filled rounded rectangle using native PDF operators (bypasses SVG path rendering issues)
const drawRoundedRectangleHelper = (page, x, y, width, height, r, options = {}) => {
  const ops = [pushGraphicsState()];
  if (options.color) {
    ops.push(setFillingColor(options.color));
  }
  if (options.borderColor) {
    ops.push(setStrokingColor(options.borderColor));
  }
  if (options.borderWidth) {
    ops.push(setLineWidth(options.borderWidth));
  }

  const k = 0.5522847;
  const kr = k * r;

  ops.push(moveTo(x + r, y));
  ops.push(lineTo(x + width - r, y));
  ops.push(appendBezierCurve(x + width - r + kr, y, x + width, y + r - kr, x + width, y + r));
  ops.push(lineTo(x + width, y + height - r));
  ops.push(appendBezierCurve(x + width, y + height - r + kr, x + width - r + kr, y + height, x + width - r, y + height));
  ops.push(lineTo(x + r, y + height));
  ops.push(appendBezierCurve(x + r - kr, y + height, x, y + height - r + kr, x, y + height - r));
  ops.push(lineTo(x, y + r));
  ops.push(appendBezierCurve(x, y + r - kr, x + r - kr, y, x + r, y));
  ops.push(closePath());

  if (options.color && options.borderColor) {
    ops.push(fillAndStroke());
  } else if (options.color) {
    ops.push(fill());
  } else if (options.borderColor) {
    ops.push(stroke());
  } else {
    ops.push(fill());
  }

  ops.push(popGraphicsState());
  page.pushOperators(...ops);
};

// Helper to wrap text into lines based on a max width
const wrapText = (text, font, size, maxWidth) => {
  if (!text || text.trim() === '') return [];
  const words = String(text).split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, size);
    
    if (testWidth > maxWidth) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        lines.push(word);
        currentLine = '';
      }
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
};

const getItemDisplayName = (item) => {
  let displayDesc = '';
  if (item.description) {
    let rawDesc = item.description;
    try {
      if (rawDesc.startsWith('{') && rawDesc.endsWith('}')) {
        const json = JSON.parse(rawDesc);
        displayDesc = json.text || '';
      } else {
        displayDesc = rawDesc;
      }
    } catch (e) {
      displayDesc = rawDesc;
    }
  }
  if (displayDesc && displayDesc.trim() !== '') {
    return `${item.program_name} (${displayDesc.trim()})`;
  }
  return item.program_name;
};

export const generateInvoicePDF = async (invoice, settings) => {
  const activeCompany = invoice.invoice_profile || settings;
  settings = activeCompany;
  const hexToRgbHelper = (hex) => {
    if (!hex) return rgb(0, 0, 0);
    const cleanHex = hex.replace('#', '');
    const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
    const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
    const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
    return rgb(r, g, b);
  };
  try {
    // 1. Create a PDF Document and register fontkit
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    
    // 2. Add an A4 sized page (595.276 x 841.89 points)
    const page = pdfDoc.addPage([595.276, 841.89]);
    const { width, height } = page.getSize();
    
    // 3. Embed custom Roboto fonts (supports Rupee symbol ₹)
    let fontRegular, fontBold;
    try {
      const fontRegularBytes = await fetch('/fonts/Roboto-Regular.ttf').then(res => res.arrayBuffer());
      const fontBoldBytes = await fetch('/fonts/Roboto-Bold.ttf').then(res => res.arrayBuffer());
      fontRegular = await pdfDoc.embedFont(fontRegularBytes);
      fontBold = await pdfDoc.embedFont(fontBoldBytes);
    } catch (e) {
      console.warn('Failed to load Roboto fonts, falling back to Helvetica:', e);
      fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    }
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
    } else if (
      companyName.includes('isuccessnode') || 
      companyName.includes('i-successnode') || 
      companyName.includes('successnode') ||
      companyName.includes('isucessnode') || 
      companyName.includes('i-sucessnode') || 
      companyName.includes('sucessnode')
    ) {
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
        cin: 'U16229UP2024PTC199657',
        address: 'Sarkhej Gandhinagar Service Road Near Wide Angle Cinema Ramdev Nagar, Satellite, Ahmedabad, Gujarat 380015'
      },
      princeton: {
        company_name: 'Princeton Professional',
        email: 'support@princetonprofessional.com',
        website: 'www.princetonprofessional.com',
        gst_number: '09AAOCP5868J1ZI',
        cin: '',
        address: '1203, Mondeal Heights, Sarkhej Gandhinagar Service Road, Ahmedabad, Gujarat 380015'
      },
      isuccessnode: {
        company_name: 'I-SUCCESSNODE',
        phone: '+91-7969537567',
        email: 'support@isuccessnode.com',
        website: 'www.isuccessnode.com',
        gst_number: '09AAHCI9258G1Z3',
        cin: '',
        address: ''
      }
    };

    const brandOverride = brandData[themeKey] || {};
    const companyNameText = brandOverride.company_name || activeCompany?.company_name || 'I-SUCCESSNODE';
    const companyPhone = brandOverride.phone || activeCompany?.phone || '';
    const companyEmail = brandOverride.email || activeCompany?.email || '';
    const companyWebsite = brandOverride.website || activeCompany?.website || '';
    const companyGst = brandOverride.gst_number || activeCompany?.gst_number || '';
    const isIssuingNode = isIsNodeName(companyNameText);
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
    } // end if (logoUrlToFetch)

    // --- PRINCETON BACKGROUNDS LOADING ---
    let princetonHeaderBg = null;
    let princetonSideBg = null;
    let princetonEmailIcon = null;
    let princetonAddressIcon = null;
    if (themeKey === 'princeton') {
      try {
        const headerRes = await fetch('/princeton-header-bg.png');
        if (headerRes.ok) {
          const ab = await headerRes.arrayBuffer();
          princetonHeaderBg = await pdfDoc.embedPng(ab);
        }
      } catch (err) {
        console.warn("Failed to load Princeton header bg:", err);
      }
      try {
        const sideRes = await fetch('/princeton-side-bg.png');
        if (sideRes.ok) {
          const ab = await sideRes.arrayBuffer();
          princetonSideBg = await pdfDoc.embedPng(ab);
        }
      } catch (err) {
        console.warn("Failed to load Princeton side bg:", err);
      }
      try {
        const emailIconRes = await fetch('/princeton-email-icon.png');
        if (emailIconRes.ok) {
          const ab = await emailIconRes.arrayBuffer();
          princetonEmailIcon = await pdfDoc.embedPng(ab);
        }
      } catch (err) {
        console.warn("Failed to load Princeton email icon:", err);
      }
      try {
        const addressIconRes = await fetch('/princeton-address-icon.png');
        if (addressIconRes.ok) {
          const ab = await addressIconRes.arrayBuffer();
          princetonAddressIcon = await pdfDoc.embedPng(ab);
        }
      } catch (err) {
        console.warn("Failed to load Princeton address icon:", err);
      }
    }

    // ============================================================
    // ===  HARVARD LEARNING — EXACT FORMAT MATCH  ================
    // ============================================================
    if (themeKey === 'harvard') {
      const hBurgundy = hexToRgbHelper(harvardLayout.colors.burgundy);
      const hNavy = hexToRgbHelper(harvardLayout.colors.navy);
      const hGold = hexToRgbHelper(harvardLayout.colors.gold);
      const hWhite = hexToRgbHelper(harvardLayout.colors.white);
      const hBlack = hexToRgbHelper(harvardLayout.colors.black);

      const formatVal = (val) => {
        if (val === 0) return '-';
        return '₹' + new Intl.NumberFormat('en-IN', {
          minimumFractionDigits: val % 1 === 0 ? 0 : 2,
          maximumFractionDigits: 2
        }).format(val);
      };

      // ── TOP HEADER SECTION ────────────────────────────────────
      // Draw Burgundy Ribbon
      const ribbonPoints = harvardLayout.header.ribbon.points;
      drawPolygonHelper(page, ribbonPoints, { color: hBurgundy });
      
      // Draw Blue Strip
      const stripPoints = harvardLayout.header.strip.points;
      drawPolygonHelper(page, stripPoints, { color: hNavy });

      // Draw Top-Right decorative stripes
      harvardLayout.header.decorations.forEach(dec => {
        const color = hexToRgbHelper(harvardLayout.colors[dec.colorKey]);
        drawPolygonHelper(page, dec.points, { color });
      });

      // Draw Logo on the left
      if (logoImage) {
        const logoConfig = harvardLayout.logo;
        const dims = logoImage.scaleToFit(logoConfig.width, logoConfig.height);
        const logoY = logoConfig.y + (logoConfig.height - dims.height) / 2;
        page.drawImage(logoImage, {
          x: logoConfig.x,
          y: logoY,
          width: dims.width,
          height: dims.height
        });
      }

      // Draw INVOICE title text
      const fontSerifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
      drawTextHelper(page, harvardLayout.header.ribbon.text, harvardLayout.header.ribbon.textX, harvardLayout.header.ribbon.textY, {
        font: fontSerifBold,
        size: harvardLayout.header.ribbon.textSize,
        color: hWhite,
        align: 'left'
      });

      // Draw Invoice Number inside the blue strip
      drawTextHelper(page, invoice.invoice_number, harvardLayout.header.strip.textX + 90, harvardLayout.header.strip.textY, {
        font: fontBold,
        size: harvardLayout.header.strip.textSize,
        color: hWhite,
        align: 'center'
      });

      // ── CUSTOMER SECTION ─────────────────────────────────────
      const custY = harvardLayout.customer.topY;
      const custFontSz = harvardLayout.customer.fontSize;
      
      // Left side: BILL TO, Customer Name, Customer Email
      drawTextHelper(page, 'BILL TO:', harvardLayout.customer.leftX, custY, {
        font: fontBold,
        size: custFontSz + 1,
        color: hNavy
      });
      
      const nameLabel = 'Customer Name: ';
      const nameVal = invoice.customers?.name || 'Client Name';
      drawTextHelper(page, nameLabel, harvardLayout.customer.leftX, custY - 17, { font: fontBold, size: custFontSz, color: hBlack });
      const nameLabelW = fontBold.widthOfTextAtSize(nameLabel, custFontSz);
      drawTextHelper(page, nameVal, harvardLayout.customer.leftX + nameLabelW, custY - 17, { font: fontRegular, size: custFontSz, color: hBlack });

      if (invoice.customers?.email) {
        const emailLabel = 'Customer Email: ';
        const emailVal = invoice.customers.email;
        drawTextHelper(page, emailLabel, harvardLayout.customer.leftX, custY - 32, { font: fontBold, size: custFontSz, color: hBlack });
        const emailLabelW = fontBold.widthOfTextAtSize(emailLabel, custFontSz);
        drawTextHelper(page, emailVal, harvardLayout.customer.leftX + emailLabelW, custY - 32, { font: fontRegular, size: custFontSz, color: hBlack });
      }

      // Right side: GST
      const customerGst = isIssuingNode ? '09AAHCI9258G1Z3' : (invoice.customers?.gst_number || '09AAOCP5868J1ZI');
      const gstLabel = 'GST: ';
      const gstVal = customerGst;
      const gstLabelW = fontBold.widthOfTextAtSize(gstLabel, custFontSz);
      drawTextHelper(page, gstLabel, 350, custY, { font: fontBold, size: custFontSz, color: hBlack });
      drawTextHelper(page, gstVal, 350 + gstLabelW, custY, { font: fontRegular, size: custFontSz, color: hBlack });

      // Right side: CIN (Customer phone field holds CIN)
      const customerCin = invoice.customers?.phone || '';
      if (customerCin) {
        const cinLabel = 'CIN: ';
        const cinVal = customerCin;
        const cinLabelW = fontBold.widthOfTextAtSize(cinLabel, custFontSz);
        drawTextHelper(page, cinLabel, 350, custY - 15, { font: fontBold, size: custFontSz, color: hBlack });
        drawTextHelper(page, cinVal, 350 + cinLabelW, custY - 15, { font: fontRegular, size: custFontSz, color: hBlack });
      }

      // Right side: Date
      const dateLabel = 'Date: ';
      const dateVal = formatDate(invoice.invoice_date);
      const dateLabelW = fontBold.widthOfTextAtSize(dateLabel, custFontSz);
      const dateY = customerCin ? (custY - 30) : (custY - 15);
      drawTextHelper(page, dateLabel, 350, dateY, { font: fontBold, size: custFontSz, color: hBlack });
      drawTextHelper(page, dateVal, 350 + dateLabelW, dateY, { font: fontRegular, size: custFontSz, color: hBlack });

      // ── ITEMS TABLE ──────────────────────────────────────────
      const items = invoice.invoice_items || [];
      const hasGst = parseFloat(invoice.gst_amount) > 0 || items.some(item => (parseFloat(item.gst_amount) || 0) > 0);

      // Define dynamic columns based on whether GST is required
      const tHeaders = hasGst 
        ? ['ITEM', 'Unit Price', 'GST (18%)', 'AMMOUNT'] 
        : ['ITEM', 'Unit Price', 'AMMOUNT'];
      
      const tColWidths = hasGst 
        ? [180, 105, 105, 115] 
        : [275, 115, 115]; // Sums to 505pt exactly

      const tHeaderColors = hasGst 
        ? ['burgundy', 'navy', 'navy', 'navy'] 
        : ['burgundy', 'navy', 'navy'];

      let tableY = harvardLayout.table.topY;
      const tHeaderH = harvardLayout.table.headerHeight;
      const tRowH = harvardLayout.table.rowHeight;
      const tFontSz = harvardLayout.table.fontSize;

      // Draw Header row background & borders
      let xOffset = marginX;
      tHeaders.forEach((header, idx) => {
        const colW = tColWidths[idx];
        const bgCol = hexToRgbHelper(harvardLayout.colors[tHeaderColors[idx]]);
        
        page.drawRectangle({
          x: xOffset,
          y: tableY - tHeaderH,
          width: colW,
          height: tHeaderH,
          color: bgCol
        });

        page.drawRectangle({
          x: xOffset,
          y: tableY - tHeaderH,
          width: colW,
          height: tHeaderH,
          borderColor: hBlack,
          borderWidth: harvardLayout.table.borderThickness
        });

        const textW = fontBold.widthOfTextAtSize(header, tFontSz);
        const textH = tFontSz * 0.72;
        const tx = xOffset + (colW - textW) / 2;
        const ty = tableY - tHeaderH + (tHeaderH - textH) / 2;
        page.drawText(header, {
          x: tx,
          y: ty,
          size: tFontSz,
          font: fontBold,
          color: hWhite
        });

        xOffset += colW;
      });

      tableY -= tHeaderH;

      // Draw rows (Only draw actual items, no empty padding rows!)
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        let xRowOffset = marginX;
        
        for (let j = 0; j < tHeaders.length; j++) {
          const colW = tColWidths[j];
          
          page.drawRectangle({
            x: xRowOffset,
            y: tableY - tRowH,
            width: colW,
            height: tRowH,
            borderColor: hBlack,
            borderWidth: harvardLayout.table.borderThickness
          });

          const isComp = parseFloat(item.unit_price) === 0;
          let text = '';
          if (j === 0) {
            text = item.program_name;
          } else if (hasGst) {
            if (j === 1) text = isComp ? '₹0.00' : formatVal(parseFloat(item.unit_price) || 0);
            else if (j === 2) text = isComp ? '₹0.00' : formatVal(parseFloat(item.gst_amount) || 0);
            else if (j === 3) text = isComp ? '₹0.00' : formatVal(parseFloat(item.total_amount) || 0);
          } else {
            if (j === 1) text = isComp ? '₹0.00' : formatVal(parseFloat(item.unit_price) || 0);
            else if (j === 2) text = isComp ? '₹0.00' : formatVal(parseFloat(item.total_amount) || 0);
          }

          if (text !== '' && text !== '-') {
            const rowFont = fontBold;
            const textH = tFontSz * 0.72;
            const cx = xRowOffset + colW / 2;
            const ty = tableY - tRowH + (tRowH - textH) / 2;
            
            drawTextHelper(page, text, cx, ty, {
              font: rowFont,
              size: tFontSz,
              color: hBlack,
              align: 'center'
            });
          }

          xRowOffset += colW;
        }
        tableY -= tRowH;
      }

      // ── SUMMARY BOX ──────────────────────────────────────────
      const sumWidth = harvardLayout.summary.width;
      const sumBox1H = harvardLayout.summary.topSection.height;
      const sumBox2H = harvardLayout.summary.bottomSection.height;
      const sumBottomY = harvardLayout.summary.bottomY;
      const sumFontSz = harvardLayout.summary.fontSize;
      const sumLineH = harvardLayout.summary.lineHeight;

      const sumLeftX = width - marginX - sumWidth;

      // Draw Burgundy Top Section background
      page.drawRectangle({
        x: sumLeftX,
        y: sumBottomY + sumBox2H,
        width: sumWidth,
        height: sumBox1H,
        color: hBurgundy
      });

      // Draw Navy Bottom Section background
      page.drawRectangle({
        x: sumLeftX,
        y: sumBottomY,
        width: sumWidth,
        height: sumBox2H,
        color: hNavy
      });

      const padX = 16;
      let textYOffset = sumBottomY + sumBox2H + sumBox1H - 18;

      // Draw Top Section rows (SUB TOTAL, TOTAL GST)
      const subTotalFormatted = '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(invoice.subtotal || 0);
      const gstFormatted = '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(invoice.gst_amount || 0);
      
      drawTextHelper(page, 'SUB TOTAL :', sumLeftX + padX, textYOffset, { font: fontBold, size: sumFontSz, color: hWhite });
      drawTextHelper(page, subTotalFormatted, sumLeftX + sumWidth - padX, textYOffset, { font: fontBold, size: sumFontSz, color: hWhite, align: 'right' });
      
      textYOffset -= sumLineH;
      
      drawTextHelper(page, 'TOTAL GST :', sumLeftX + padX, textYOffset, { font: fontBold, size: sumFontSz, color: hWhite });
      drawTextHelper(page, gstFormatted, sumLeftX + sumWidth - padX, textYOffset, { font: fontBold, size: sumFontSz, color: hWhite, align: 'right' });

      // Draw Bottom Section rows (TOTAL, DISCOUNT, PAID, DUE)
      textYOffset = sumBottomY + sumBox2H - 18;
      
      const totalFormatted = '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(preDiscountTotal || 0);
      const discountFormatted = (discountAmount > 0 ? '-' : '') + '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(discountAmount || 0);
      const paidFormatted = '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(displayPaidAmount || 0);
      const dueFormatted = '₹' + new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(balanceDue || 0);

      const bottomRows = [
        { label: 'TOTAL :', val: totalFormatted },
        { label: 'DISCOUNT:', val: discountFormatted },
        { label: 'PAID :', val: paidFormatted },
        { label: 'DUE:', val: dueFormatted }
      ];

      bottomRows.forEach(row => {
        drawTextHelper(page, row.label, sumLeftX + padX, textYOffset, { font: fontBold, size: sumFontSz, color: hWhite });
        drawTextHelper(page, row.val, sumLeftX + sumWidth - padX, textYOffset, { font: fontBold, size: sumFontSz, color: hWhite, align: 'right' });
        textYOffset -= sumLineH;
      });

      // ── FOOTER SECTION ───────────────────────────────────────
      const footerConf = harvardLayout.footer;
      
      // Draw Navy background rect
      page.drawRectangle({
        x: footerConf.bg.x,
        y: footerConf.bg.y,
        width: footerConf.bg.w,
        height: footerConf.bg.h,
        color: hNavy
      });

      // Draw top gold border line
      page.drawLine({
        start: { x: footerConf.topBorder.x1, y: footerConf.topBorder.y1 },
        end: { x: footerConf.topBorder.x2, y: footerConf.topBorder.y2 },
        color: hGold,
        thickness: footerConf.topBorder.thickness
      });

      // Draw bottom-right decorative shapes
      footerConf.decorations.forEach(dec => {
        const color = hexToRgbHelper(harvardLayout.colors[dec.colorKey]);
        drawPolygonHelper(page, dec.points, { color });
      });

      // Draw footer texts
      const footerTxtSz = footerConf.fontSize;
      drawTextHelper(page, footerConf.phone, footerConf.textX, footerConf.phoneY, { font: fontBold, size: footerTxtSz, color: hWhite });
      drawTextHelper(page, footerConf.email, footerConf.textX, footerConf.emailY, { font: fontBold, size: footerTxtSz, color: hWhite });
      drawTextHelper(page, footerConf.address, footerConf.textX, footerConf.addressY, { font: fontBold, size: footerTxtSz, color: hWhite });
      
      // Save and return PDF bytes
      const pdfBytes = await pdfDoc.save();
      return pdfBytes;
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
      const logoAreaW = eliteLayout.header.logoWidth;   // max width reserved for logo from config
      const logoAreaH = eliteLayout.header.logoHeight;  // max height from config
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

      // ── "INVOICE" LARGE TITLE — right-aligned ─────────────────
      const invoiceBaselineY = hBandBot + 70;
      const titleRightX = width - marginX - 110;  // anchor right, leaving room for triangles
      drawTextHelper(page, 'INVOICE', titleRightX, invoiceBaselineY, {
        font: fontBold, size: 38, color: eDark, align: 'right'
      });

      // ── INVOICE NUMBER BADGE — right-aligned below title ──────
      const badgeText = invoice.invoice_number || '2026/ECM/1000';
      const badgeW    = fontBold.widthOfTextAtSize(badgeText, 11.5) + 30;
      const badgeH    = 22;
      const badgeX    = titleRightX - badgeW;    // right-align badge to same anchor
      const badgeY    = invoiceBaselineY - 12 - badgeH;
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
      drawTextHelper(page, 'BILL TO:', marginX, billY, { font: fontBold, size: 10, color: eDark });
      billY -= 15;
      
      const customerNameVal = invoice.customers?.name || invoice.customer_name || 'Client Name';
      drawTextHelper(page, customerNameVal, marginX, billY, { font: fontRegular, size: 10.5, color: eDark });
      billY -= 14;
      
      if (invoice.customers?.email) {
        drawTextHelper(page, invoice.customers.email, marginX, billY, { font: fontRegular, size: 9.5, color: eDark });
        billY -= 13;
      }
      // No customer CIN for Elite theme to prevent double CIN on page
      
      // Add Date under BILL TO
      drawTextHelper(page, 'Date: ', marginX, billY, { font: fontBold, size: 9.5, color: eDark });
      const dateLblW = fontBold.widthOfTextAtSize('Date: ', 9.5);
      const dateValStr = formatDate(invoice.invoice_date);
      drawTextHelper(page, dateValStr, marginX + dateLblW, billY, { font: fontRegular, size: 9.5, color: eDark });
      billY -= 13;

      // GST + CIN on the right (left-aligned block positioned on the right)
      let infoY = currentY;
      const gstLabel = 'GST: ';
      const cinLabel = 'CIN: ';
      
      const gstLabelW = fontBold.widthOfTextAtSize(gstLabel, 10);
      const gstValW = fontRegular.widthOfTextAtSize(companyGst || '', 10);
      const gstTotalW = gstLabelW + gstValW;
      
      let cinTotalW = 0;
      let cinLabelW = 0;
      if (companyCin) {
        cinLabelW = fontBold.widthOfTextAtSize(cinLabel, 10);
        const cinValW = fontRegular.widthOfTextAtSize(companyCin, 10);
        cinTotalW = cinLabelW + cinValW;
      }
      
      const maxInfoW = Math.max(gstTotalW, cinTotalW);
      const infoStartX = width - marginX - maxInfoW;
      
      // Draw GST
      drawTextHelper(page, gstLabel, infoStartX, infoY, { font: fontBold, size: 10, color: eDark, align: 'left' });
      drawTextHelper(page, companyGst || '', infoStartX + gstLabelW, infoY, { font: fontRegular, size: 10, color: eDark, align: 'left' });
      infoY -= 15;
      
      // Draw CIN
      if (companyCin) {
        drawTextHelper(page, cinLabel, infoStartX, infoY, { font: fontBold, size: 10, color: eDark, align: 'left' });
        drawTextHelper(page, companyCin, infoStartX + cinLabelW, infoY, { font: fontRegular, size: 10, color: eDark, align: 'left' });
        infoY -= 15;
      }



      currentY = billY - 22;

      // ── ITEMS TABLE ────────────────────────────────────────────
      // Column widths match HTML preview: 45% | 18% | 18% | 19%
      const tableW  = width - marginX * 2;   // 505pt
      const colWs   = [230, 91, 91, 93];    // ITEM | Unit Price | GST(18%) | AMMOUNT
      const hdrH    = 32;
      const hdrLabels = ['ITEM', 'Unit Price', 'GST (18%)', 'AMMOUNT'];

      // Table outer top border
      page.drawLine({ start: { x: marginX, y: currentY }, end: { x: width - marginX, y: currentY }, color: eBorder, thickness: 0.8 });

      // Header background — royal blue (matches HTML preview #2E41B4)
      page.drawRectangle({
        x: marginX, y: currentY - hdrH,
        width: tableW, height: hdrH,
        color: eBlue
      });

      // Header labels (centered in each column)
      let hx = marginX;
      hdrLabels.forEach((lbl, i) => {
        const cw = colWs[i];
        const tx = hx + cw / 2;
        drawTextHelper(page, lbl, tx, currentY - hdrH + 11, {
          font: fontBold, size: 10.5, color: eWhite, align: 'center'
        });
        // Header column divider
        if (i > 0) {
          page.drawLine({ start: { x: hx, y: currentY }, end: { x: hx, y: currentY - hdrH }, color: eDark, thickness: 0.6 });
        }
        hx += cw;
      });

      currentY -= hdrH;

      // ── DATA ROWS ──────────────────────────────────────────────
      const tableDataTop = currentY;
      const rowH_default = 30;
      const fontSize = 10.5;
      const lineHeight = 13;
      const items = invoice.invoice_items || [];
      const MIN_ROWS = items.length; // only show rows with content

      for (let rIdx = 0; rIdx < MIN_ROWS; rIdx++) {
        const item = items[rIdx];
        let rowHeight = rowH_default;
        let wrappedLines = [];

        if (item) {
          wrappedLines = wrapText(getItemDisplayName(item), fontBold, fontSize, colWs[0] - 12);
          const lineCount = wrappedLines.length;
          rowHeight = Math.max(rowH_default, lineCount * lineHeight + 14); // 7pt padding top/bottom
        }

        const cellY = currentY - rowHeight / 2 - fontSize / 2 + 1;
        const isComp = item ? parseFloat(item.unit_price) === 0 : false;

        if (item) {
          let cx = marginX;
          
          // Col 0: Item name — wrapped & vertically centered
          const lineCount = wrappedLines.length;
          const totalTextHeight = (lineCount - 1) * lineHeight + fontSize;
          const startY = currentY - (rowHeight - totalTextHeight) / 2 - fontSize;
          
          wrappedLines.forEach((lineText, lIdx) => {
            const lineY = startY - lIdx * lineHeight;
            drawTextHelper(page, lineText, cx + colWs[0] / 2, lineY, {
              font: fontBold,
              size: fontSize,
              color: eDark,
              align: 'center',
              width: colWs[0] - 12
            });
          });
          cx += colWs[0];

          // Col 1: Unit Price
          drawTextHelper(page, isComp ? '-' : `₹${eFmt(item.unit_price)}`, cx + colWs[1] / 2, cellY, { font: fontBold, size: fontSize, color: eDark, align: 'center' });
          cx += colWs[1];

          // Col 2: GST
          drawTextHelper(page, isComp ? '-' : `₹${eFmt(item.gst_amount)}`, cx + colWs[2] / 2, cellY, { font: fontBold, size: fontSize, color: eDark, align: 'center' });
          cx += colWs[2];

          // Col 3: Amount
          drawTextHelper(page, isComp ? '₹0.00' : `₹${eFmt(item.total_amount)}`, cx + colWs[3] / 2, cellY, { font: fontBold, size: fontSize, color: eDark, align: 'center' });
        }

        // Row bottom border
        page.drawLine({ start: { x: marginX, y: currentY - rowHeight }, end: { x: width - marginX, y: currentY - rowHeight }, color: eBorder, thickness: 0.6 });
        currentY -= rowHeight;
      }

      // Vertical column dividers (spanning header + data rows)
      const tableBottom = currentY;
      const tableTop = tableDataTop + hdrH;
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
      const box1H = 50;
      const box1Y = totY - box1H;
      page.drawRectangle({
        x: boxX, y: box1Y, width: boxW, height: box1H,
        borderColor: eBlue, borderWidth: 1.2, color: eWhite
      });
      // Row 1: SUB TOTAL
      drawTextHelper(page, 'SUB TOTAL:', boxX + 10, box1Y + 33, { font: fontBold, size: 9.5, color: eDark });
      drawTextHelper(page, `₹${eFmt(invoice.subtotal)}`, boxX + boxW - 10, box1Y + 33, { font: fontRegular, size: 9.5, color: eDark, align: 'right' });
      // Row 2: TOTAL GST
      drawTextHelper(page, 'TOTAL GST:', boxX + 10, box1Y + 13, { font: fontBold, size: 9.5, color: eDark });
      drawTextHelper(page, `₹${eFmt(invoice.gst_amount)}`, boxX + boxW - 10, box1Y + 13, { font: fontRegular, size: 9.5, color: eDark, align: 'right' });

      totY = box1Y - 10;

      // ── Box 2: Solid Royal Blue — TOTAL / (DISCOUNT) / PAID / DUE ─────
      const box2Rows = [
        { label: 'TOTAL:', val: `₹${eFmt(preDiscTotal)}` },
        ...(discountAmount > 0 ? [{ label: 'DISCOUNT:', val: `-₹${eFmt(discountAmount)}`, highlight: true }] : []),
        { label: 'PAID:', val: `₹${eFmt(paidAmt)}` },
        { label: 'DUE:', val: `₹${eFmtZeroAsPadded(dueAmt)}` }
      ];
      const box2H = box2Rows.length * 22;
      const box2Y = totY - box2H;
      page.drawRectangle({ x: boxX, y: box2Y, width: boxW, height: box2H, color: eBlue });

      const row2H = box2H / box2Rows.length;
      box2Rows.forEach((row, i) => {
        const ry = box2Y + box2H - (i + 1) * row2H + row2H / 2 - 4.5;
        const valColor = row.highlight ? rgb(255/255, 220/255, 80/255) : eWhite;
        drawTextHelper(page, row.label, boxX + 10, ry, { font: fontBold, size: 9.5, color: eWhite });
        drawTextHelper(page, row.val, boxX + boxW - 10, ry, { font: fontRegular, size: 9.5, color: valColor, align: 'right' });
      });

      currentY = box2Y - 16;

      // ── FOOTER ─────────────────────────────────────────────────
      const footerH = 80;
      // Dark navy footer background
      page.drawRectangle({ x: 0, y: 0, width, height: footerH, color: eDark });
      // Thin blue accent strip on top of footer (matches preview 3px border-top)
      page.drawRectangle({ x: 0, y: footerH, width, height: 3, color: eBlue });

      // Bottom-right corner accent triangles (mirror preview SVG exactly)
      drawPolygonHelper(page, [ { x: width, y: 0 }, { x: width - 80, y: 0 }, { x: width, y: footerH } ], {
        color: eBlue
      });
      drawPolygonHelper(page, [ { x: width, y: 0 }, { x: width - 40, y: 0 }, { x: width, y: footerH * 0.6 } ], {
        color: rgb(100/255, 130/255, 220/255)
      });

      // ── LEFT COLUMN: Phone / Email / Web ──────────────────────
      const footerTop = footerH - 16;  // start from top of footer
      const lineGap = 18;

      // Phone
      drawTextHelper(page, `Phone: ${companyPhone}`, marginX, footerTop, {
        font: fontBold, size: 10, color: eWhite
      });

      // Email with underline
      drawTextHelper(page, `Email:`, marginX, footerTop - lineGap, {
        font: fontBold, size: 10, color: eWhite
      });
      const emailLabelW = fontBold.widthOfTextAtSize('Email: ', 10);
      drawTextHelper(page, companyEmail, marginX + emailLabelW, footerTop - lineGap, {
        font: fontBold, size: 10, color: eWhite
      });
      const emailTxtW = fontBold.widthOfTextAtSize(companyEmail, 10);
      page.drawLine({
        start: { x: marginX + emailLabelW, y: footerTop - lineGap - 2 },
        end:   { x: marginX + emailLabelW + emailTxtW, y: footerTop - lineGap - 2 },
        color: eWhite, thickness: 0.7
      });
      // Register clickable mailto link in PDF
      addLinkToPdf(pdfDoc, page, marginX + emailLabelW, footerTop - lineGap - 2, emailTxtW, 12, `mailto:${companyEmail}`);

      // Web
      if (companyWebsite) {
        drawTextHelper(page, `Web: ${companyWebsite}`, marginX, footerTop - lineGap * 2, {
          font: fontBold, size: 10, color: eWhite
        });
        const webLabelW = fontBold.widthOfTextAtSize('Web: ', 10);
        const webTxtW = fontBold.widthOfTextAtSize(companyWebsite, 10);
        const webUrl = companyWebsite.startsWith('http') ? companyWebsite : `https://${companyWebsite}`;
        
        // Underline web link
        page.drawLine({
          start: { x: marginX + webLabelW, y: footerTop - lineGap * 2 - 2 },
          end:   { x: marginX + webLabelW + webTxtW, y: footerTop - lineGap * 2 - 2 },
          color: eWhite, thickness: 0.7
        });
        
        // Register clickable URL link in PDF
        addLinkToPdf(pdfDoc, page, marginX + webLabelW, footerTop - lineGap * 2 - 2, webTxtW, 12, webUrl);
      }

      // ── RIGHT COLUMN: ADDRESS label + address text ─────────────
      const addrRightEdge = width - 65; // aligned professionally closer to the right margin
      const addrMaxW = 220;
      const addrX = addrRightEdge - addrMaxW;

      // "ADDRESS" label (small caps, slate-400 style → use muted white)
      drawTextHelper(page, 'ADDRESS', addrRightEdge, footerTop, {
        font: fontBold, size: 7.5, color: rgb(150/255, 165/255, 195/255), align: 'right'
      });

      // Address text — wrapped, right-aligned
      const addrLines = wrapText(companyAddress, fontRegular, 8, addrMaxW);
      addrLines.forEach((line, i) => {
        drawTextHelper(page, line, addrRightEdge, footerTop - lineGap * (i + 1), {
          font: fontRegular, size: 8, color: rgb(200/255, 210/255, 230/255), align: 'right'
        });
      });

      const pdfBytes = await pdfDoc.save();
      return pdfBytes;
    }
    // ── end Elite dedicated path ──────────────────────────────────

    // ============================================================
    // ===  PMI SERVICES PMIS — EXACT 1:1 REPLICATION  ===========
    // ============================================================
    if (themeKey === 'pmi') {
      const hexToRgbHelper = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        return rgb(r, g, b);
      };

      const pmiPurple = hexToRgbHelper(PMI_FOOTER_CONFIG.pmiPurple);
      const pmiOrange = hexToRgbHelper(PMI_FOOTER_CONFIG.pmiGold || PMI_FOOTER_CONFIG.pmiOrange);
      const pmiGreen  = hexToRgbHelper(PMI_FOOTER_CONFIG.pmiGreen);
      const pmiBlack  = rgb(0, 0, 0);                    // #000000
      const pmiWhite  = hexToRgbHelper(PMI_FOOTER_CONFIG.pmiWhite);
      const pmiLightText = hexToRgbHelper(PMI_FOOTER_CONFIG.pmiLightText || '#E2E8F0');
      const pmiLightBg = rgb(242/255, 244/255, 247/255); // #F2F4F7 alternating rows
      const pmiFmt = (num, isSubTotal = false) => {
        const val = parseFloat(num) || 0;
        if (isSubTotal) {
          const str = val.toFixed(2);
          if (str.endsWith('.00')) return val.toLocaleString('en-IN', { minimumFractionDigits: 2 });
          return val.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        }
        return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
      };

      // ── TOP ACCENTS ─────────────────────────────────────────────
      // Purple top strip
      drawPolygonHelper(page, [
        { x: 0, y: height },
        { x: width * 0.48, y: height },
        { x: width * 0.43, y: height - 18 },
        { x: 0, y: height - 18 }
      ], { color: pmiPurple });

      // PMI Shield Logo
      if (logoImage) {
        page.drawImage(logoImage, {
          x: marginX,
          y: height - 165,
          width: 130,
          height: 130
        });
      }

      // Purple polygon behind "INVOICE"
      drawPolygonHelper(page, [
        { x: width * 0.65, y: height },
        { x: width, y: height },
        { x: width, y: height - 75 },
        { x: width * 0.53, y: height - 75 }
      ], { color: pmiPurple });

      drawTextHelper(page, 'INVOICE', width - 85, height - 48, { font: fontBold, size: 32, color: pmiWhite, align: 'center' });

      // Orange invoice ribbon
      drawPolygonHelper(page, [
        { x: width * 0.63, y: height - 78 },
        { x: width, y: height - 78 },
        { x: width, y: height - 108 },
        { x: width * 0.57, y: height - 108 }
      ], { color: pmiOrange });

      drawTextHelper(page, invoice.invoice_number, width - 90, height - 99, { font: fontBold, size: 14, color: pmiWhite, align: 'center' });

      // Green diagonal ribbon
      drawPolygonHelper(page, [
        { x: width, y: height - 108 },
        { x: width, y: height - 203 },
        { x: width - 85, y: height - 108 }
      ], { color: pmiGreen });

      // GST and BILL TO inline layout
      let clientY = height - 185;

      // BILL TO on left
      drawTextHelper(page, 'BILL TO:', marginX, clientY, { font: fontBold, size: 10, color: pmiBlack });

      // CIN on right, on top
      const cinLabelText = 'CIN: ';
      const cinValText = invoice.customers?.phone || companyCin || 'U16229UP2024PTC199657';
      const pmiCinLabelW = fontBold.widthOfTextAtSize(cinLabelText, 9.5);
      const pmiCinValW = fontRegular.widthOfTextAtSize(cinValText, 9.5);
      const pmiCinW = pmiCinLabelW + pmiCinValW;

      // GST on right, below CIN
      const gstLabelText = 'GST: ';
      const gstValText = companyGst || '09TRFPS5497N1Z6';
      const pmiGstLabelW = fontBold.widthOfTextAtSize(gstLabelText, 9.5);
      const pmiGstValW = fontRegular.widthOfTextAtSize(gstValText, 9.5);
      const pmiGstW = pmiGstLabelW + pmiGstValW;

      // Calculate column X position to left-align both labels but align the column to the right margin
      const pmiColW = Math.max(pmiCinW, pmiGstW);
      const pmiColX = width - marginX - pmiColW;

      // Draw CIN
      drawTextHelper(page, cinLabelText, pmiColX, clientY, { font: fontBold, size: 9.5, color: pmiBlack });
      drawTextHelper(page, cinValText, pmiColX + pmiCinLabelW, clientY, { font: fontRegular, size: 9.5, color: pmiBlack });

      // Draw GST
      drawTextHelper(page, gstLabelText, pmiColX, clientY - 12, { font: fontBold, size: 9.5, color: pmiBlack });
      drawTextHelper(page, gstValText, pmiColX + pmiGstLabelW, clientY - 12, { font: fontRegular, size: 9.5, color: pmiBlack });

      // Draw Date
      const dateLabelText = 'Date: ';
      const dateValText = formatDate(invoice.invoice_date);
      const pmiDateLabelW = fontBold.widthOfTextAtSize(dateLabelText, 9.5);
      drawTextHelper(page, dateLabelText, pmiColX, clientY - 24, { font: fontBold, size: 9.5, color: pmiBlack });
      drawTextHelper(page, dateValText, pmiColX + pmiDateLabelW, clientY - 24, { font: fontRegular, size: 9.5, color: pmiBlack });
      
      clientY -= 40;
      
      const cNameLabel = 'Customer Name: ';
      const cNameVal = invoice.customers?.name || invoice.customer_name || 'Client Name';
      drawTextHelper(page, cNameLabel, marginX, clientY, { font: fontBold, size: 10, color: pmiBlack });
      const cNameLabelW = fontBold.widthOfTextAtSize(cNameLabel, 10);
      drawTextHelper(page, cNameVal, marginX + cNameLabelW, clientY, { font: fontRegular, size: 10, color: pmiBlack });
      clientY -= 15;
      
      if (invoice.customers?.email) {
        const cEmailLabel = 'Customer Email: ';
        const cEmailVal = invoice.customers.email;
        drawTextHelper(page, cEmailLabel, marginX, clientY, { font: fontBold, size: 10, color: pmiBlack });
        const cEmailLabelW = fontBold.widthOfTextAtSize(cEmailLabel, 10);
        drawTextHelper(page, cEmailVal, marginX + cEmailLabelW, clientY, { font: fontRegular, size: 10, color: pmiBlack });
        clientY -= 15;
      }

      // ── ITEMS TABLE ────────────────────────────────────────────
      let tableY = clientY - 15;
      const colWs = [50, 255, 65, 65, 70];
      const tableW = width - marginX * 2;
      const hdrH = 32;
      
      // Header background
      page.drawRectangle({
        x: marginX, y: tableY - hdrH,
        width: tableW, height: hdrH,
        color: pmiPurple
      });
      
      // Table outer top border
      page.drawLine({ start: { x: marginX, y: tableY }, end: { x: width - marginX, y: tableY }, color: pmiBlack, thickness: 1 });
      
      // Header texts
      let hx = marginX;
      const hdrLabels = ['ITEM', 'DESCRIPTION', 'GST (18%)', 'AMOUNT', 'TOTAL'];
      hdrLabels.forEach((lbl, i) => {
        const cw = colWs[i];
        const tx = hx + cw / 2;
        drawTextHelper(page, lbl, tx, tableY - hdrH + 11, {
          font: fontBold, size: 10, color: pmiWhite, align: 'center'
        });
        // Header vertical dividers (black borders)
        if (i > 0) {
          page.drawLine({ start: { x: hx, y: tableY }, end: { x: hx, y: tableY - hdrH }, color: pmiBlack, thickness: 1 });
        }
        hx += cw;
      });
      
      tableY -= hdrH;

      // Data rows
      const items = invoice.invoice_items || [];
      const rowH_default = 30;
      const fontSize = 10;
      const lineHeight = 13;
      
      for (let rIdx = 0; rIdx < items.length; rIdx++) {
        const item = items[rIdx];
        let rowHeight = rowH_default;
        
        const wrappedLines = wrapText(getItemDisplayName(item), fontBold, fontSize, colWs[1] - 16);
        const lineCount = wrappedLines.length;
        rowHeight = Math.max(rowH_default, lineCount * lineHeight + 14); // 7pt padding top/bottom
        
        const isAlt = rIdx % 2 === 1;
        const rowBg = isAlt ? pmiLightBg : pmiWhite;
        
        // Draw row background
        page.drawRectangle({
          x: marginX, y: tableY - rowHeight,
          width: tableW, height: rowHeight,
          color: rowBg
        });
        
        const isComp = item ? parseFloat(item.unit_price) === 0 : false;
        const cellY = tableY - rowHeight / 2 - fontSize / 2 + 1;
        
        let cx = marginX;
        
        // Col 0: ITEM number
        const itemNoStr = String(rIdx + 1).padStart(2, '0');
        drawTextHelper(page, itemNoStr, cx + colWs[0] / 2, cellY, { font: fontBold, size: fontSize, color: pmiBlack, align: 'center' });
        cx += colWs[0];
        
        // Col 1: DESCRIPTION
        const totalTextHeight = (lineCount - 1) * lineHeight + fontSize;
        const startY = tableY - (rowHeight - totalTextHeight) / 2 - fontSize;
        wrappedLines.forEach((lineText, lIdx) => {
          const lineY = startY - lIdx * lineHeight;
          drawTextHelper(page, lineText, cx + 8, lineY, {
            font: fontBold,
            size: fontSize,
            color: pmiBlack,
            align: 'left',
            width: colWs[1] - 16
          });
        });
        cx += colWs[1];
        
        // Col 2: GST (18%) (centered)
        const gstVal = isComp ? '₹0.00' : `₹${pmiFmt(item.gst_amount)}`;
        drawTextHelper(page, gstVal, cx + colWs[2] / 2, cellY, { font: fontBold, size: fontSize, color: pmiBlack, align: 'center' });
        cx += colWs[2];
        
        // Col 3: AMOUNT (centered)
        const amtVal = isComp ? '₹0.00' : `₹${pmiFmt(item.unit_price)}`;
        drawTextHelper(page, amtVal, cx + colWs[3] / 2, cellY, { font: fontBold, size: fontSize, color: pmiBlack, align: 'center' });
        cx += colWs[3];
        
        // Col 4: TOTAL (centered)
        const totVal = isComp ? '₹0.00' : `₹${pmiFmt(item.total_amount)}`;
        drawTextHelper(page, totVal, cx + colWs[4] / 2, cellY, { font: fontBold, size: fontSize, color: pmiBlack, align: 'center' });
        
        // Row bottom border
        page.drawLine({ start: { x: marginX, y: tableY - rowHeight }, end: { x: width - marginX, y: tableY - rowHeight }, color: pmiBlack, thickness: 1 });
        
        tableY -= rowHeight;
      }
      
      // Draw vertical cell border lines
      const tableBottom = tableY;
      const tableTop = clientY - 15;
      let vx = marginX;
      colWs.forEach((cw, i) => {
        vx += cw;
        page.drawLine({ start: { x: vx, y: tableTop }, end: { x: vx, y: tableBottom }, color: pmiBlack, thickness: 1 });
      });
      page.drawLine({ start: { x: marginX, y: tableTop }, end: { x: marginX, y: tableBottom }, color: pmiBlack, thickness: 1 });

      // ── TOTALS ─────────────────────────────────────────────────
      const discountAmount = parseFloat(invoice.invoice_profile?.discount_amount) || 0;
      const preDiscTotal   = (parseFloat(invoice.subtotal) || 0) + (parseFloat(invoice.gst_amount) || 0);
      const paidAmt        = (discountAmount > 0 && Math.abs((invoice.paid_amount || 0) - preDiscTotal) < 0.05)
        ? (invoice.paid_amount || 0) - discountAmount
        : (invoice.paid_amount || 0);
      const dueAmt         = Math.max(0, preDiscTotal - discountAmount - paidAmt);

      const boxW  = 190;
      const boxX  = width - marginX - boxW;
      let totY    = tableY - 15;

      // Box 1: Bordered SUB TOTAL + TOTAL GST
      const box1H = 50;
      const box1Y = totY - box1H;
      page.drawRectangle({
        x: boxX, y: box1Y, width: boxW, height: box1H,
        borderColor: pmiBlack, borderWidth: 1, color: pmiWhite
      });

      const row1FontSz = 9.5;
      const val1FontSz = 9.5;

      // Row 1: SUB TOTAL
      drawTextHelper(page, 'SUB TOTAL :', boxX + 10, box1Y + 33, { font: fontBold, size: row1FontSz, color: pmiBlack });
      drawTextHelper(page, `₹${pmiFmt(invoice.subtotal, true)}`, boxX + boxW - 10, box1Y + 33, { font: fontBold, size: val1FontSz, color: pmiBlack, align: 'right' });

      // Row 2: TOTAL GST
      drawTextHelper(page, 'TOTAL GST :', boxX + 10, box1Y + 13, { font: fontBold, size: row1FontSz, color: pmiBlack });
      drawTextHelper(page, `₹${pmiFmt(invoice.gst_amount)}`, boxX + boxW - 10, box1Y + 13, { font: fontBold, size: val1FontSz, color: pmiBlack, align: 'right' });

      totY = box1Y - 10;

      // Box 2: Solid Green — TOTAL / DISCOUNT / PAID / DUE
      const box2Rows = [
        { label: 'TOTAL :', val: `₹${pmiFmt(invoice.total_amount)}` },
        ...(discountAmount > 0 ? [{ label: 'DISCOUNT :', val: `-₹${pmiFmt(discountAmount)}` }] : []),
        { label: 'PAID :', val: `₹${pmiFmt(paidAmt)}` },
        { label: 'DUE:', val: `₹${pmiFmt(dueAmt)}` }
      ];
      
      const box2H = box2Rows.length * 22;
      const box2Y = totY - box2H;
      page.drawRectangle({ x: boxX, y: box2Y, width: boxW, height: box2H, color: pmiGreen });

      const row2H = box2H / box2Rows.length;
      box2Rows.forEach((row, i) => {
        const ry = box2Y + box2H - (i + 1) * row2H + row2H / 2 - 4.5;
        drawTextHelper(page, row.label, boxX + 10, ry, { font: fontBold, size: 9.5, color: pmiWhite });
        drawTextHelper(page, row.val, boxX + boxW - 10, ry, { font: fontBold, size: 9.5, color: pmiWhite, align: 'right' });
      });

      // ── FOOTER ─────────────────────────────────────────────────
      const {
        phone,
        email,
        addressLine1,
        addressLine2,
        leftPadding,
        phoneY,
        address1Y,
        address2Y,
        phoneSize,
        addressSize,
        shapes
      } = PMI_FOOTER_CONFIG;

      // 1. Draw all configured shapes (polygons and circles)
      shapes.forEach(shape => {
        const hexColor = PMI_FOOTER_CONFIG[shape.colorKey] || shape.color;
        const pdfColor = hexToRgbHelper(hexColor);
        if (shape.type === 'polygon') {
          drawPolygonHelper(page, shape.points, { color: pdfColor });
        } else if (shape.type === 'circle') {
          const { cx, cy, r } = shape;
          drawRoundedRectangleHelper(
            page,
            cx - r,
            cy - r,
            2 * r,
            2 * r,
            r,
            { color: pdfColor }
          );
        }
      });

      // 2. Draw Text (matches the HTML SVG overlay and screenshot exactly)
      // Line 1: Phone | Email (Bold, size 9.5, baseline phoneY)
      drawTextHelper(page, `${phone} | ${email}`, leftPadding, phoneY, {
        font: fontBold, size: phoneSize || 9.5, color: pmiWhite
      });

      // Line 2: Address line 1 (Regular, size 8.5, baseline address1Y)
      drawTextHelper(page, addressLine1, leftPadding, address1Y, { 
        font: fontRegular, size: addressSize || 8.5, color: pmiWhite 
      });

      // Line 3: Address line 2 (Regular, size 8.5, baseline address2Y)
      drawTextHelper(page, addressLine2, leftPadding, address2Y, { 
        font: fontRegular, size: addressSize || 8.5, color: pmiWhite 
      });

      const pdfBytes = await pdfDoc.save();
      return pdfBytes;
    }

    // ── end PMI dedicated path ────────────────────────────────────

    // ============================================================
    // --- ISUCCESSNODE DEDICATED LAYOUT (matches reference image) ---
    // ============================================================
    if (themeKey === 'isuccessnode') {
      const isn_dark = rgb(0, 0, 0);         // Black text
      const isn_muted = rgb(100/255, 116/255, 139/255); // Slate-500 to match CSS text-slate-500
      const isn_border = rgb(0, 0, 0);       // Black border lines
      const isn_headerBg = rgb(188/255, 224/255, 253/255); // Light blue table header (#BCE0FD)

      let y = height - 50;
      const lx = marginX;  // Left margin X
      const rx = width - marginX; // Right edge

      // --- HEADER: INVOICE title (left) + Logo in bordered box (right) ---
      drawTextHelper(page, 'INVOICE', lx, y, { font: fontBold, size: 33, color: isn_dark });

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
      drawTextHelper(page, `Invoice Number: ${invoice.invoice_number}`, lx, y, { font: fontRegular, size: 10.5, color: isn_muted });
      y -= 14;
      drawTextHelper(page, `Invoice Date: ${formatDate(invoice.invoice_date)}`, lx, y, { font: fontRegular, size: 10.5, color: isn_muted });

      y -= 30;

      // --- TWO BORDERED ADDRESS BOXES ---
      const boxPad = 12;
      const halfW = (rx - lx - 20) / 2;
      const leftBoxX = lx;
      const rightBoxX = lx + halfW + 20;

      // Fixed height matching CSS min-h-[110px] (~83pt)
      const boxH = 85;

      // Draw left box border
      page.drawRectangle({ x: leftBoxX, y: y - boxH, width: halfW, height: boxH, borderColor: isn_border, borderWidth: 1, color: rgb(1,1,1) });
      // Draw right box border
      page.drawRectangle({ x: rightBoxX, y: y - boxH, width: halfW, height: boxH, borderColor: isn_border, borderWidth: 1, color: rgb(1,1,1) });

      // Left box content: Company info
      let leftY = y - boxPad - 3;
      drawTextHelper(page, companyNameText, leftBoxX + boxPad, leftY, { font: fontBold, size: 12.5, color: isn_dark });
      leftY -= 16;
      if (companyPhone) {
        drawTextHelper(page, companyPhone, leftBoxX + boxPad, leftY, { font: fontRegular, size: 10, color: isn_muted });
        leftY -= 13;
      }
      if (companyWebsite) {
        drawTextHelper(page, companyWebsite, leftBoxX + boxPad, leftY, { font: fontRegular, size: 10, color: isn_muted });
        leftY -= 13;
      }
      if (companyCin) {
        drawTextHelper(page, `CIN: ${companyCin}`, leftBoxX + boxPad, leftY, { font: fontRegular, size: 10, color: isn_muted });
        leftY -= 13;
      }
      if (companyEmail) {
        drawTextHelper(page, companyEmail, leftBoxX + boxPad, leftY, { font: fontRegular, size: 10, color: isn_muted });
      }

      // Right box content: Bill To
      let rightY = y - boxPad - 3;
      drawTextHelper(page, 'BILL TO', rightBoxX + boxPad, rightY, { font: fontBold, size: 12.5, color: isn_dark });
      rightY -= 16;
      drawTextHelper(page, invoice.customers?.name || 'Client Name', rightBoxX + boxPad, rightY, { font: fontRegular, size: 11, color: isn_dark });
      rightY -= 14;
      if (invoice.customers?.email) {
        drawTextHelper(page, invoice.customers.email, rightBoxX + boxPad, rightY, { font: fontRegular, size: 10, color: isn_muted });
        rightY -= 13;
      }
      // GST above CIN
      const custGst = invoice.customers?.gst_number || '09AAHCI9258G1Z3';
      drawTextHelper(page, `GST: ${custGst}`, rightBoxX + boxPad, rightY, { font: fontRegular, size: 10, color: isn_muted });
      rightY -= 13;
      if (invoice.customers?.phone) {
        drawTextHelper(page, `CIN: ${invoice.customers.phone}`, rightBoxX + boxPad, rightY, { font: fontRegular, size: 10, color: isn_muted });
      }

      y -= boxH + 25;

      // --- ITEMS TABLE ---
      const tableW = rx - lx;
      const colW = [227, 91, 76, 111]; // Program Name (45%) | Unit Price (18%) | GST (15%) | Amount (22%)
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
        drawTextHelper(page, h, tx, y - tHdrH + 7, { font: fontBold, size: 10.5, color: isn_dark, align: isRight ? 'right' : 'left' });
        hx += cw;
      });

      // Table top border
      page.drawLine({ start: { x: lx, y }, end: { x: rx, y }, color: isn_border, thickness: 1 });
      // Header bottom border
      page.drawLine({ start: { x: lx, y: y - tHdrH }, end: { x: rx, y: y - tHdrH }, color: isn_border, thickness: 1 });

      y -= tHdrH;

      const items = invoice.invoice_items || [];
      const issnFmt = (num) => new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(num) || 0);
      items.forEach((item) => {
        const isComp = parseFloat(item.unit_price) === 0;
        let cx = lx;

        // Parse description (may be stored as JSON or plain string)
        let displayDesc = '';
        if (item.description) {
          try {
            if (item.description.startsWith('{') && item.description.endsWith('}')) {
              const parsedDesc = JSON.parse(item.description);
              displayDesc = parsedDesc.text || '';
            } else {
              displayDesc = item.description;
            }
          } catch (e) {
            displayDesc = item.description;
          }
          displayDesc = displayDesc.trim();
        }

        const hasDesc = displayDesc !== '';
        const currentRowH = hasDesc ? 36 : 24;
        const cellY = y - currentRowH / 2 - 4;

        // Col 0: Program Name + optional description on second line
        if (hasDesc) {
          drawTextHelper(page, item.program_name, cx + 8, y - 14, { font: fontRegular, size: 10.5, color: isn_dark });
          drawTextHelper(page, `(${displayDesc})`, cx + 8, y - 26, { font: fontRegular, size: 9.5, color: isn_muted });
        } else {
          drawTextHelper(page, item.program_name, cx + 8, cellY, { font: fontRegular, size: 10.5, color: isn_dark });
        }
        cx += colW[0];

        // Col 1: Unit Price
        const upTxt = isComp ? '' : `₹${issnFmt(item.unit_price)}`;
        drawTextHelper(page, upTxt, cx + colW[1] - 8, cellY, { font: fontRegular, size: 10.5, color: isn_dark, align: 'right' });
        cx += colW[1];

        // Col 2: GST
        const gstTxt = isComp ? '' : `₹${issnFmt(item.gst_amount)}`;
        drawTextHelper(page, gstTxt, cx + colW[2] - 8, cellY, { font: fontRegular, size: 10.5, color: isn_dark, align: 'right' });
        cx += colW[2];

        // Col 3: Amount (bold for paid items)
        const amtTxt = isComp ? '0.00' : `₹${issnFmt(item.total_amount)}`;
        drawTextHelper(page, amtTxt, cx + colW[3] - 8, cellY, { font: fontRegular, size: 10.5, color: isn_dark, align: 'right' });

        // Row bottom border
        page.drawLine({ start: { x: lx, y: y - currentRowH }, end: { x: rx, y: y - currentRowH }, color: isn_border, thickness: 0.8 });
        y -= currentRowH;
      });

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
      const isnPreDiscountTotal = (parseFloat(invoice.subtotal) || 0) + (parseFloat(invoice.gst_amount) || 0);
      const isnTotals = [
        { label: 'Sub-Total', val: `₹${issnFmt(invoice.subtotal)}` },
        { label: 'Tax (18%)', val: `₹${issnFmt(invoice.gst_amount)}` },
        { label: 'Total', val: `₹${issnFmt(isnPreDiscountTotal)}`, bold: true }
      ];

      if (realDiscountAmt > 0) {
        isnTotals.push({ label: 'Discount', val: `-₹${issnFmt(realDiscountAmt)}`, isDiscount: true });
      }

      isnTotals.push(
        { label: 'Paid', val: `₹${issnFmt(displayPaidAmount)}`, bold: true }
      );

      if (balanceDue > 0) {
        isnTotals.push({ label: 'Balance Due', val: `₹${issnFmt(balanceDue)}`, bold: true, isPending: true });
      }

      const totalBoxH = isnTotals.length * totRowH + 2;
      page.drawRectangle({ x: totX - 8, y: y - totalBoxH, width: totW + 8, height: totalBoxH, borderColor: isn_border, borderWidth: 1, color: rgb(1,1,1) });

      // Draw vertical separator in totals box
      page.drawLine({
        start: { x: rx - 90, y },
        end: { x: rx - 90, y: y - totalBoxH },
        color: isn_border,
        thickness: 0.8
      });

      let totY = y - 2;
      isnTotals.forEach((row, i) => {
        const labelY = totY - totRowH + 6;
        let rowColor = isn_dark;
        if (row.isPending) {
          rowColor = rgb(217/255, 119/255, 6/255);
        } else if (row.isDiscount) {
          rowColor = rgb(225/255, 29/255, 72/255);
        }
        drawTextHelper(page, row.label, totLabelX, labelY, { font: row.bold ? fontBold : fontRegular, size: 12, color: rowColor });
        drawTextHelper(page, row.val, totValX, labelY, { font: row.bold ? fontBold : fontRegular, size: 12, color: rowColor, align: 'right' });
        if (i < isnTotals.length - 1) {
          page.drawLine({ start: { x: totX - 8, y: totY - totRowH }, end: { x: rx, y: totY - totRowH }, color: isn_border, thickness: 0.8 });
        }
        totY -= totRowH;
      });

      // --- FOOTER ---
      const footerY = 70;
      drawTextHelper(page, 'Thank you for doing business with us!', width / 2, footerY, { font: fontRegular, size: 13, color: isn_muted, align: 'center' });

      const copyrightText = `All rights reserved by © I-SUCCESSNODE (OPC) Private Limited 2025`;
      drawTextHelper(page, copyrightText, lx, footerY - 16, { font: fontRegular, size: 10.5, color: isn_muted });

      // Color accent bar at very bottom (Lime green on top of Purple)
      page.drawRectangle({ x: 0, y: 0, width: width, height: 8, color: rgb(107/255, 33/255, 168/255) }); // Purple (#6b21a8)
      page.drawRectangle({ x: 0, y: 8, width: width, height: 6, color: rgb(132/255, 204/255, 22/255) }); // Lime green (#84cc16)

      // Save and return early for isuccessnode
      const pdfBytes = await pdfDoc.save();
      return pdfBytes;
    }

    // --- DRAW TOP HEADER (all other themes) ---
    const bannerHeight = 85;
    if (themeKey !== 'default' && themeKey !== 'princeton') {
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
      // ============================================================
      // PRINCETON PROFESSIONALS — PIXEL-PERFECT PDF REPLICATION
      // All values read from princetonLayout config (single source of truth)
      // ============================================================
      const pl = princetonLayout;
      const pW = width;   // 595.276
      const pH = height;  // 841.89
      const mx = pl.marginX; // 45

      // ── Color helpers ─────────────────────────────────────────
      const pNavy   = hexToRgbHelper(pl.colors.navy);
      const pGold   = hexToRgbHelper(pl.colors.gold);
      const pBrown  = hexToRgbHelper(pl.colors.brown);
      const pGrey   = hexToRgbHelper(pl.colors.grey);
      const pWhite  = hexToRgbHelper(pl.colors.white);
      const pBlack  = hexToRgbHelper(pl.colors.black);
      const pDark   = hexToRgbHelper(pl.colors.darkText);
      const pMuted  = hexToRgbHelper(pl.colors.mutedText);
      const pBorder = hexToRgbHelper(pl.colors.border);
      const pInvCol = hexToRgbHelper(pl.header.invoiceColor);

      // ── Format helpers ────────────────────────────────────────
      const pNumFmt = (num) => {
        const v = parseFloat(num) || 0;
        return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
      };
      const pFmt = (num) => '\u20B9' + pNumFmt(num);

      const pDisc = parseFloat(invoice.invoice_profile?.discount_amount) || 0;
      const pPreDiscTotal = (parseFloat(invoice.subtotal) || 0) + (parseFloat(invoice.gst_amount) || 0);
      const pPaid = (pDisc > 0 && Math.abs(invoice.paid_amount - pPreDiscTotal) < 0.05)
        ? invoice.paid_amount - pDisc
        : (invoice.paid_amount || 0);
      const pDue = Math.max(0, pPreDiscTotal - pDisc - pPaid);

      // ── HEADER BAND ──────────────────────────────────────────
      const hH = pl.header.height; // 124
      const hTop = pH - hH;

      // Draw background image if loaded
      if (princetonHeaderBg) {
        page.drawImage(princetonHeaderBg, { x: 0, y: hTop, width: pW, height: hH });
      } else {
        page.drawRectangle({ x: 0, y: hTop, width: pW, height: hH, color: pNavy });

        // Draw Logo only as fallback if background image didn't load
        if (logoImage) {
          const dims = logoImage.scaleToFit(pl.header.logoMaxW, pl.header.logoMaxH);
          const logoY = hTop + (hH - dims.height) / 2;
          page.drawImage(logoImage, { x: mx, y: logoY, width: dims.width, height: dims.height });
        }

        // Draw INVOICE title only as fallback if background image didn't load
        const fontSerifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
        drawTextHelper(page, 'INVOICE', pW - mx, pH - 80, {
          font: fontSerifBold, size: pl.header.invoiceFontSize, color: pGold, align: 'right'
        });
      }

      // ── SIDE BORDER DECORATIVE STRIPS ──
      // Draw side border strips over the body area (below header, above bottom)
      const bodyH = hTop; // height from 0 to top of content area
      if (princetonSideBg) {
        // Left side border — image stretched to full body height
        page.drawImage(princetonSideBg, { x: 0, y: 0, width: 30, height: bodyH });
      } else {
        // Fallback: navy strip + gold inner line
        page.drawRectangle({ x: 0, y: 0, width: 28, height: bodyH, color: pNavy });
        page.drawLine({ start: { x: 28, y: 0 }, end: { x: 28, y: bodyH }, color: pGold, thickness: 2 });
      }
      // Right side border — mirror by drawing right-to-left
      if (princetonSideBg) {
        // Draw image flipped horizontally using negative width
        page.drawImage(princetonSideBg, { x: pW, y: 0, width: -30, height: bodyH });
      } else {
        page.drawRectangle({ x: pW - 28, y: 0, width: 28, height: bodyH, color: pNavy });
        page.drawLine({ start: { x: pW - 28, y: 0 }, end: { x: pW - 28, y: bodyH }, color: pGold, thickness: 2 });
      }

      // ── SUB-HEADER DETAILS (White background, BILL TO left, Invoice details right) ──
      const shH = pl.subheader.height; // 70
      const shTop = hTop - shH;

      // Left: BILL TO label + customer name + email
      let shLY = shTop + shH - 22;
      drawTextHelper(page, 'BILL TO:', mx, shLY, { font: fontBold, size: 10.5, color: pNavy });
      shLY -= 13;
      drawTextHelper(page, 'Customer Name: ', mx, shLY, { font: fontBold, size: 9.5, color: pDark });
      drawTextHelper(page, invoice.customers?.name || 'Client Name', mx + fontBold.widthOfTextAtSize('Customer Name: ', 9.5), shLY, { font: fontRegular, size: 9.5, color: pDark });
      shLY -= 13;
      if (invoice.customers?.email) {
        drawTextHelper(page, 'Customer Email: ', mx, shLY, { font: fontBold, size: 9.5, color: pDark });
        drawTextHelper(page, invoice.customers.email, mx + fontBold.widthOfTextAtSize('Customer Email: ', 9.5), shLY, { font: fontRegular, size: 9.5, color: pDark });
        shLY -= 13;
      }
      // Add Date under BILL TO
      const dateLabel = 'Date: ';
      const dateVal = formatDate(invoice.invoice_date);
      drawTextHelper(page, dateLabel, mx, shLY, { font: fontBold, size: 9.5, color: pDark });
      drawTextHelper(page, dateVal, mx + fontBold.widthOfTextAtSize(dateLabel, 9.5), shLY, { font: fontRegular, size: 9.5, color: pDark });

      // Right: Invoice details (Invoice No & GST & CIN) — positioned on the right but aligned left-to-right
      const rightBlockX = pW - mx - 180;
      let shRY = shTop + shH - 22;
      
      const invNoLabel = 'Invoice No: ';
      const invNoVal = invoice.invoice_number || '';
      drawTextHelper(page, invNoLabel, rightBlockX, shRY, { font: fontBold, size: 9.5, color: pDark });
      drawTextHelper(page, invNoVal, rightBlockX + fontBold.widthOfTextAtSize(invNoLabel, 9.5), shRY, { font: fontRegular, size: 9.5, color: pDark });

      shRY -= 13;
      const gstLabel = 'GST: ';
      const gstVal = companyGst || '09AAOCP5868J1ZI';
      drawTextHelper(page, gstLabel, rightBlockX, shRY, { font: fontBold, size: 9.5, color: pDark });
      drawTextHelper(page, gstVal, rightBlockX + fontBold.widthOfTextAtSize(gstLabel, 9.5), shRY, { font: fontRegular, size: 9.5, color: pDark });

      shRY -= 13;
      const cinLabel = 'CIN: ';
      const cinVal = activeCompany?.cin || 'U16229UP2024PTC199657';
      drawTextHelper(page, cinLabel, rightBlockX, shRY, { font: fontBold, size: 9.5, color: pDark });
      drawTextHelper(page, cinVal, rightBlockX + fontBold.widthOfTextAtSize(cinLabel, 9.5), shRY, { font: fontRegular, size: 9.5, color: pDark });

      // ── ITEMS TABLE ──────────────────────────────────────────
      const tableX = mx;
      const tableW = pW - mx * 2;  // 505.276
      const [cw0, cw1, cw2, cw3] = pl.table.colWidths;  // ITEM | Unit Price | GST (18%) | AMMOUNT

      // Column X-coordinates
      const colX = [
        tableX,
        tableX + cw0,
        tableX + cw0 + cw1,
        tableX + cw0 + cw1 + cw2,
      ];

      let tableY = shTop - 35;  // start table below sub-header details

      // Draw header row
      const hdrH = pl.table.headerHeight;
      page.drawRectangle({ x: tableX, y: tableY - hdrH, width: tableW, height: hdrH, color: pBrown });

      // Header borders
      [0, 1, 2, 3].forEach(i => {
        if (i > 0) {
          page.drawLine({ start: { x: colX[i], y: tableY }, end: { x: colX[i], y: tableY - hdrH }, color: pBlack, thickness: pl.table.borderThickness });
        }
      });
      page.drawRectangle({ x: tableX, y: tableY - hdrH, width: tableW, height: hdrH, color: pBrown, borderColor: pBlack, borderWidth: pl.table.borderThickness });

      const hdrLabels = ['ITEM', 'Unit Price', 'GST (18%)', 'AMMOUNT'];
      const hdrAlign  = ['center', 'center', 'center', 'center'];
      const hdrLabelY = tableY - hdrH + pl.table.cellPaddingY - 1;

      hdrLabels.forEach((lbl, i) => {
        const cx = colX[i] + pl.table.colWidths[i] / 2;
        drawTextHelper(page, lbl, cx, hdrLabelY, {
          font: fontBold, size: pl.table.headerFontSize, color: pWhite, align: 'center'
        });
      });

      tableY -= hdrH;

      // ── Data rows ───────────────────────────────────────────
      const items = invoice.invoice_items || [];
      const rowH  = pl.table.rowHeight;

      items.forEach((item, idx) => {
        const isComp = parseFloat(item.unit_price) === 0;
        const cellY  = tableY - rowH + pl.table.cellPaddingY;

        // Row background
        page.drawRectangle({ x: tableX, y: tableY - rowH, width: tableW, height: rowH, color: pWhite });

        // Row outline
        page.drawRectangle({ x: tableX, y: tableY - rowH, width: tableW, height: rowH, borderColor: pBlack, borderWidth: pl.table.borderThickness });

        // Vertical column dividers inside row
        [1, 2, 3].forEach(i => {
          page.drawLine({ start: { x: colX[i], y: tableY }, end: { x: colX[i], y: tableY - rowH }, color: pBlack, thickness: pl.table.borderThickness });
        });

        // ITEM — center, bold
        const itemName = getItemDisplayName(item);
        drawTextHelper(page, itemName, colX[0] + cw0 / 2, cellY, { font: fontBold, size: pl.table.fontSize, color: pDark, align: 'center', width: cw0 - 8 });

        // UNIT PRICE — right, bold
        const unitPriceStr = isComp ? '₹0.00' : pFmt(item.unit_price);
        drawTextHelper(page, unitPriceStr, colX[1] + cw1 - pl.table.cellPaddingX, cellY, { font: fontBold, size: pl.table.fontSize, color: pDark, align: 'right' });

        // GST (18%) — right, bold
        const gstStr = isComp ? '₹0.00' : pFmt(item.gst_amount);
        drawTextHelper(page, gstStr, colX[2] + cw2 - pl.table.cellPaddingX, cellY, { font: fontBold, size: pl.table.fontSize, color: pDark, align: 'right' });

        // AMOUNT — right, bold
        const totalStr = isComp ? '₹0.00' : pFmt(item.total_amount);
        drawTextHelper(page, totalStr, colX[3] + cw3 - pl.table.cellPaddingX, cellY, { font: fontBold, size: pl.table.fontSize, color: pDark, align: 'right' });

        tableY -= rowH;
      });

      // ── SUMMARY BOXES & CONTACT INFO ──
      const ps = pl.summary;
      const sumX = pW - mx - ps.width;
      let sumY = tableY - 25;

      // Contact details on the left (drawn at matching vertical range)
      let contactY = sumY - 10;
      
      // Email
      if (princetonEmailIcon) {
        page.drawImage(princetonEmailIcon, { x: mx, y: contactY - 1, width: 10, height: 10 });
      } else {
        page.drawText('\u2709', { x: mx, y: contactY, size: 12, font: fontRegular, color: pNavy });
      }
      drawTextHelper(page, companyEmail, mx + 16, contactY + 1, { font: fontRegular, size: 9.5, color: pDark });
      
      // Address (handles wrapping)
      contactY -= 20;
      if (princetonAddressIcon) {
        page.drawImage(princetonAddressIcon, { x: mx, y: contactY - 1, width: 10, height: 10 });
      } else {
        page.drawText('\u25CE', { x: mx, y: contactY, size: 12, font: fontRegular, color: pNavy });
      }
      
      const wrappedAddress = wrapText(companyAddress, fontRegular, 9.5, 230);
      let addrY = contactY + 2;
      wrappedAddress.forEach(line => {
        drawTextHelper(page, line, mx + 16, addrY, { font: fontRegular, size: 9.5, color: pDark });
        addrY -= 13;
      });

      // Upper grey box: SUB TOTAL + TOTAL GST — regular weight
      const upperRows = [
        { label: 'SUB TOTAL :', val: pFmt(invoice.subtotal) },
        { label: 'TOTAL GST :', val: pFmt(invoice.gst_amount) },
      ];
      const upperH = upperRows.length * ps.lineGap + ps.upperBoxPaddingY * 2;
      page.drawRectangle({ x: sumX, y: sumY - upperH, width: ps.width, height: upperH, color: pGrey, borderColor: pNavy, borderWidth: 1.5 });
      let rowY = sumY - ps.upperBoxPaddingY - 8;
      upperRows.forEach(({ label, val }) => {
        drawTextHelper(page, label, sumX + ps.paddingX, rowY, { font: fontRegular, size: ps.fontSize, color: pDark });
        drawTextHelper(page, val, sumX + ps.width - ps.paddingX, rowY, { font: fontRegular, size: ps.fontSize, color: pDark, align: 'right' });
        rowY -= ps.lineGap;
      });
      sumY -= upperH + 8;

      // Lower navy box: TOTAL, DISCOUNT, PAID, DUE — labels bold, values regular
      const lowerRows = [
        { label: 'TOTAL:', val: pFmt(pPreDiscTotal) },
        { label: 'DISCOUNT:', val: pDisc > 0 ? '-' + pFmt(pDisc) : pFmt(0) },
        { label: 'PAID:', val: pFmt(pPaid) },
        { label: 'DUE:', val: pFmt(pDue) },
      ];
      const lowerH = lowerRows.length * ps.lineGap + ps.lowerBoxPaddingY * 2;
      page.drawRectangle({ x: sumX, y: sumY - lowerH, width: ps.width, height: lowerH, color: pNavy });
      let lRowY = sumY - ps.lowerBoxPaddingY - 8;
      lowerRows.forEach(({ label, val }) => {
        drawTextHelper(page, label, sumX + ps.paddingX, lRowY, { font: fontBold, size: ps.fontSize, color: pWhite });
        drawTextHelper(page, val, sumX + ps.width - ps.paddingX, lRowY, { font: fontRegular, size: ps.fontSize, color: pWhite, align: 'right' });
        lRowY -= ps.lineGap;
      });

      // Save and return early for Princeton
      const pdfBytes = await pdfDoc.save();
      return pdfBytes;
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
        drawTextHelper(page, `CIN: ${invoice.customers.phone}`, rightColX, rightY, { font: fontRegular, size: 8.5, color: colorMuted });
        rightY -= 12;
      }
      if (invoice.customers?.email) {
        drawTextHelper(page, `Email: ${invoice.customers.email}`, rightColX, rightY, { font: fontRegular, size: 8.5, color: colorMuted });
        rightY -= 12;
      }
      const customerGst = isIssuingNode ? '09AAHCI9258G1Z3' : (invoice.customers?.gst_number || '');
      if (customerGst) {
        drawTextHelper(page, `GSTIN: ${customerGst}`, rightColX, rightY, { font: fontRegular, size: 8.5, color: colorMuted });
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
                drawTextHelper(page, getItemDisplayName(item), colX + 8, cellTextY, { font: fontBold, size: 9, color: colorDark, width: curW - 16 });
              } else if (idx === 1) {
                drawTextHelper(page, String(item.quantity || 1), colX + curW - 8, cellTextY, { font: fontRegular, size: 8.5, color: colorDark, align: 'right' });
              } else if (idx === 2) {
                const txt = isComp ? '₹0.00' : formatCurrency(item.unit_price);
                drawTextHelper(page, txt, colX + curW - 8, cellTextY, { font: fontRegular, size: 8.5, color: colorDark, align: 'right' });
              } else if (idx === 3) {
                const txt = isComp ? '₹0.00' : formatCurrency(item.total_amount);
                drawTextHelper(page, txt, colX + curW - 8, cellTextY, { font: fontBold, size: 9, color: colorDark, align: 'right' });
              }
            } else if (themeKey === 'pmi') {
              if (idx === 0) {
                drawTextHelper(page, getItemDisplayName(item), colX + 8, cellTextY, { font: fontBold, size: 9, color: colorDark, width: curW - 16 });
              } else if (idx === 1) {
                drawTextHelper(page, String(item.quantity || 1), colX + curW - 8, cellTextY, { font: fontRegular, size: 8.5, color: colorDark, align: 'right' });
              } else if (idx === 2) {
                const txt = isComp ? '₹0.00' : formatCurrency(item.unit_price);
                drawTextHelper(page, txt, colX + curW - 8, cellTextY, { font: fontRegular, size: 8.5, color: colorDark, align: 'right' });
              } else if (idx === 3) {
                const txt = isComp ? '₹0.00' : formatCurrency(item.gst_amount);
                drawTextHelper(page, txt, colX + curW - 8, cellTextY, { font: fontRegular, size: 8.5, color: colorDark, align: 'right' });
              } else if (idx === 4) {
                const txt = isComp ? '₹0.00' : formatCurrency(item.total_amount);
                drawTextHelper(page, txt, colX + curW - 8, cellTextY, { font: fontBold, size: 9, color: colorDark, align: 'right' });
              }
            } else {
              if (idx === 0) {
                drawTextHelper(page, getItemDisplayName(item), colX + 8, cellTextY, { font: fontBold, size: 9, color: colorDark, width: curW - 16 });
              } else if (idx === 1) {
                const txt = isComp ? '₹0.00' : formatCurrency(item.unit_price);
                drawTextHelper(page, txt, colX + curW - 8, cellTextY, { font: fontRegular, size: 8.5, color: colorDark, align: 'right' });
              } else if (idx === 2) {
                const txt = isComp ? '₹0.00' : formatCurrency(item.gst_amount);
                drawTextHelper(page, txt, colX + curW - 8, cellTextY, { font: fontRegular, size: 8.5, color: colorDark, align: 'right' });
              } else if (idx === 3) {
                const txt = isComp ? '₹0.00' : formatCurrency(item.total_amount);
                drawTextHelper(page, txt, colX + curW - 8, cellTextY, { font: fontBold, size: 9, color: colorDark, align: 'right' });
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
          { text: 'Total', val: formatCurrency(preDiscountTotal), isBold: true, isFinal: true },
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

