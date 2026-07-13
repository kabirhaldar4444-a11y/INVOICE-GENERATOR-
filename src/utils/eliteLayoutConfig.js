export const eliteLayout = {
  // Page sizing & base bounds
  width: 595.276, // A4 Width in points/pixels
  height: 841.89, // A4 Height in points/pixels
  marginX: 45,

  // Colors matching the Word document exactly
  colors: {
    primary: '#2E41B4',      // Royal Blue #2E41B4
    secondary: '#EE0000',    // Red #EE0000
    dark: '#101838',         // Dark Navy #101838
    muted: '#64748B',        // Slate-500
    lightBg: '#F2F2F2',      // Light Gray #F2F2F2
    border: '#dde4f0',       // Border #dde4f0
    white: '#ffffff',
    lightBlue: '#6E8CE1',    // Header triangle light blue
    accentBlue: '#6482DC',   // Footer triangle light blue
  },

  // Header band layout
  header: {
    height: 110,
    dividerX: 250,
    logoWidth: 195,
    logoHeight: 92,
    invoiceTitleSize: 38,
    badgeTextSize: 11.5,
    badgeHeight: 22,
    badgePaddingX: 30,
    badgeOffsetY: 12,
  },

  // Billing (BILL TO) details spacing
  billing: {
    labelSize: 8.5,
    valSize: 9.0,
    phoneSize: 8.5,
  },

  // Items table structure
  table: {
    colWidths: [230, 91, 91, 93], // ITEM (230) | Unit Price (91) | GST (91) | AMMOUNT (93)
    headerHeight: 28,
    rowHeight: 26,
    borderThickness: 0.6,
  },

  // Totals / summary panels
  summary: {
    width: 190,
    box1Height: 44,
    box2Height: 76,
    borderThickness: 1.2,
  },

  // Footer layout
  footer: {
    height: 72,
    blueStripHeight: 3,
  }
};
