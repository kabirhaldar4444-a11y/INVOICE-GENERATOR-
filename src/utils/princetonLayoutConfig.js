// ============================================================
// Princeton Professionals Invoice — Shared Layout Configuration
// ============================================================
// ALL design values live here.
// Both HTML Preview (InvoiceDetails.jsx) and PDF Generator (pdfGenerator.js)
// must import from this file so the two outputs are pixel-identical.
//
// COORDINATE SYSTEM (PDF): bottom-relative, y=0 at bottom, y=841.89 at top.
// COORDINATE SYSTEM (HTML): top-relative CSS pixels — 1pt ≈ 1px at screen.
// ============================================================

export const princetonLayout = {
  // ── Page ────────────────────────────────────────────────────
  page: {
    width:  595.276,  // A4 width  in pt/px
    height: 841.89,   // A4 height in pt/px
  },

  // ── Margins ─────────────────────────────────────────────────
  marginX: 45,        // left/right margin in pt/px
  marginY: 30,        // top/bottom margin in pt/px

  // ── Brand Colors ────────────────────────────────────────────
  colors: {
    navy:       '#102744',  // Dark Navy — headers, borders
    gold:       '#C9933A',  // Gold/Amber — decorative lines, accents
    brown:      '#996633',  // Rich Brown — table header background, INVOICE title
    grey:       '#E5E7EB',  // Light Grey — upper summary box background
    white:      '#FFFFFF',
    black:      '#000000',
    darkText:   '#000000',  // Body text
    mutedText:  '#475569',  // Labels, sub-text
    border:     '#000000',  // Table & box borders
  },

  // ── Header Band ─────────────────────────────────────────────
  header: {
    height:           124,  // height of the top decorative band in pt/px
    logoMaxW:         150,  // max logo width in pt/px
    logoMaxH:          90,  // max logo height in pt/px
    invoiceFontSize:   34,  // "INVOICE" text size in pt/px
    invoiceColor:   '#996633',  // golden-brown for the INVOICE title
  },

  // ── Sub-header details row (BILL TO | Invoice No / GST) ──
  subheader: {
    height:        70,   // pt height of this row
    bgColor:   '#FFFFFF',  // white background
    textColor: '#102744',  // navy text
    fontSize:       9.5,
    labelFontSize:  9.5,
    paddingX:      0,
    lineGap:       14,   // vertical spacing between each detail line
  },

  // ── Items Table ─────────────────────────────────────────────
  table: {
    // Column widths (must sum to page.width - 2*marginX = 505.276)
    // ITEM | Unit Price | GST (18%) | AMMOUNT
    colWidths:  [205, 100, 100, 100],  // pt/px each column
    headerHeight:   30,   // table header row height
    rowHeight:      28,   // each data row height
    borderColor: '#000000',
    borderThickness: 0.8,
    headerBg:    '#996633',  // brown
    headerText:  '#FFFFFF',  // white
    altRowBg:    '#FFFFFF',  // no alt row bg to keep it clean, or keep it white
    fontSize:       10,
    headerFontSize: 10,
    cellPaddingX:   6,
    cellPaddingY:   9,   // from bottom of cell to text baseline
  },

  // ── Summary Boxes ───────────────────────────────────────────
  summary: {
    width:          200,  // box width in pt/px
    upperBoxPaddingY: 10,
    lowerBoxPaddingY: 10,
    paddingX:        12,
    lineGap:         18,  // gap between each summary line
    upperBg:    '#E5E7EB',  // light grey
    upperBorder:'#000000',
    lowerBg:    '#102744',  // dark navy
    lowerText:  '#FFFFFF',
    fontSize:        9.5,
    fontSizeLarge:  10.5,
  },

  // ── Footer / Bottom Contact Info ────────────────────────────
  footer: {
    height:       70,   // pt/px
    bgColor:  '#FFFFFF',  // white
    textColor:'#000000',
    fontSize:      9.5,
    lineGap:       16,
    paddingX:      0,
    iconSize:       10,  // approximate icon glyph size
  }
};

