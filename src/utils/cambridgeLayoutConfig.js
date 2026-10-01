// ============================================================
// Cambridge Learning Services Invoice — Shared Layout Configuration
// ============================================================
// ALL design values, geometry, and color tokens live here.
// Both HTML Preview (InvoiceDetails.jsx) and PDF Generator (pdfGenerator.js)
// use this configuration to ensure pixel-perfect fidelity with the original template.
// ============================================================

export const cambridgeLayout = {
  // Page sizing & base bounds (A4)
  width:  595.276,
  height: 841.89,
  marginX: 42,

  // Exact Brand Colors from the reference PDF
  colors: {
    primary:    '#073824', // Deep Dark Green rgb(7, 56, 36)
    primaryDark:'#041F15', // Darker Green text rgb(4, 31, 21)
    terracotta: '#AB5C37', // Rust / Terracotta rgb(171, 92, 55)
    darkText:   '#1A211E', // Dark body/border text rgb(26, 33, 30)
    white:      '#FFFFFF',
    border:     '#1A211E',
    lightGray:  '#F8FAFC',
  },

  // Top header layout & polygons
  header: {
    topStrip: {
      points: [
        { x: 0,   y: 841.89 },
        { x: 285, y: 841.89 },
        { x: 255, y: 823.89 },
        { x: 0,   y: 823.89 },
      ],
      height: 18,
    },
    titleBanner: {
      points: [
        { x: 360,     y: 841.89 },
        { x: 595.276, y: 841.89 },
        { x: 595.276, y: 763.89 },
        { x: 315,     y: 763.89 },
      ],
      text: 'TAX INVOICE',
      fontSize: 27,
      textX: 393.58,
      textY: 791.89,
    },
    numberRibbon: {
      points: [
        { x: 375,     y: 760.89 },
        { x: 595.276, y: 760.89 },
        { x: 595.276, y: 723.89 },
        { x: 340,     y: 723.89 },
      ],
      fontSize: 14,
      textX: 468.08,
      textY: 736.89,
    },
    rightAccentTriangle: {
      points: [
        { x: 523.276, y: 723.89 },
        { x: 595.276, y: 723.89 },
        { x: 595.276, y: 629.89 },
      ],
    },
    logo: {
      x: 49.52,
      y: 741.89,
      width: 204.95,
      height: 55,
    },
  },

  // Customer / BILL TO details section
  customer: {
    topY: 675.89,
    billToX: 45,
    billToY: 675.89,
    billToUnderline: {
      x1: 45,
      y1: 668.89,
      x2: 103,
      y2: 668.89,
      thickness: 1.5,
    },
    nameLabelX: 45,
    nameValX: 138,
    nameY: 636.89,
    emailLabelX: 45,
    emailValX: 138,
    emailY: 618.89,
    gstinLabelX: 433.28,
    gstinValX: 471.28,
    gstinY: 675.89,
    dateLabelX: 433.28,
    dateValX: 471.28,
    dateY: 657.89,
    fontSize: 9.5,
  },

  // Items table
  table: {
    x: 42,
    topY: 592,
    width: 517,
    headerHeight: 38,
    borderThickness: 0.9,
    colWidths: [36, 188, 72, 72, 72, 77], // S.NO. | ITEM | AMOUNT | CGST (9%) | SGST (9%) | TOTAL
    headerLabels: ['S.NO.', 'ITEM', 'AMOUNT', 'CGST (9%)', 'SGST (9%)', 'TOTAL'],
    headerFontSize: 9,
    dataFontSize: 8.5,
  },

  // Summary section (Right)
  summary: {
    x: 356,
    width: 223,
    upperBox: {
      y: 352,
      height: 53,
      subTotalY: 384,
      totalGstY: 364,
    },
    lowerBox: {
      y: 246,
      height: 98,
      totalY: 324,
      discountY: 302,
      paidY: 280,
      dueY: 258,
    },
    fontSize: 9,
  },

  // Stamp & Signature section (Left: Sign, Right: Stamp overlapping)
  stampAndSign: {
    line: {
      x1: 48,
      y1: 258,
      x2: 186,
      y2: 258,
      thickness: 0.9,
    },
    signature: {
      x: 48,
      y: 256,
      width: 130,
      height: 48.6,
    },
    stamp: {
      x: 140,
      y: 222.10,
      width: 115,
      height: 114.8,
    },
    signatoryText: {
      text: 'Authorized Signatory',
      x: 117,
      y: 244,
      fontSize: 8.5,
    },
  },

  // Footer section
  footer: {
    height: 78,
    address: 'Office No-244, Tower-T3, Golden I Sec-Techzone-4, Greater Noida West, Gautambuddha Nagar, Uttar Pradesh, 201306',
    addressX: 43,
    addressY: 48,
    addressFontSize: 7.7,
    terracottaAccent: {
      points: [
        { x: 525.276, y: 78 },
        { x: 595.276, y: 78 },
        { x: 595.276, y: 0 },
        { x: 475.276, y: 0 },
      ],
    },
  },
};
