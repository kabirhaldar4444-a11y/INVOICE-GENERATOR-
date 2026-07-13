// Single source of truth layout configuration for the Harvard Learning Invoice template.
// All dimensions and coordinates are in points/pixels (1 point = 1 pixel).
// Coordinate system is bottom-relative (y = 0 at the bottom of the page, y = 841.89 at the top).

export interface Point {
  x: number;
  y: number;
}

export interface Shape {
  id: string;
  type: 'polygon' | 'rect' | 'line';
  colorKey: keyof typeof harvardLayout.colors;
  points?: Point[];
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  thickness?: number;
}

export const harvardLayout = {
  // Page Size (A4 Portrait)
  width: 595.276,
  height: 841.89,
  marginX: 45,

  // Color Palette
  colors: {
    burgundy: '#77151D',   // Dark Burgundy
    navy: '#081E42',       // Dark Navy Blue
    gold: '#D4AF37',       // Gold Accent
    white: '#FFFFFF',      // White
    black: '#000000',      // Thin black borders
    blueAccent: '#1E65B8',  // Blue accent color for diagonal strips
    lightGray: '#F2F2F2',  // Light background for default fallback
    border: '#000000',     // Thin black cell borders
    textDark: '#102744'    // Dark color for billing info labels
  },

  // Logo Config (Left aligned - scaled to occupy correct width)
  logo: {
    x: 45,
    y: 698,                // Vertically centered inside the header area
    width: 260,
    height: 90.2
  },

  // Header Ribbons and Shapes
  header: {
    // Large Burgundy "INVOICE" Ribbon (shifted right to leave room for logo, height increased)
    ribbon: {
      points: [
        { x: 310, y: 742 },
        { x: 343, y: 792 },
        { x: 514, y: 792 },
        { x: 548, y: 742 }
      ],
      text: 'INVOICE',
      textSize: 24,         // Reduced slightly from 28 to fit perfectly in safe area
      textX: 375,           // Start coordinate for Georgia text
      textY: 759
    },

    // Blue Invoice Number Strip underneath
    strip: {
      points: [
        { x: 285, y: 705 },
        { x: 306, y: 737 },
        { x: 551, y: 737 },
        { x: 572, y: 705 }
      ],
      textSize: 12,
      textX: 338,           // Left start of text container
      textY: 717
    },

    // Top-Right decorative corner polygons (drawn in back-to-front order)
    decorations: [
      {
        id: 'top_gold_stripe',
        type: 'polygon' as const,
        colorKey: 'gold' as const,
        points: [
          { x: 485, y: 841.89 },
          { x: 493, y: 841.89 },
          { x: 591, y: 695 },
          { x: 583, y: 695 }
        ]
      },
      {
        id: 'top_navy_stripe',
        type: 'polygon' as const,
        colorKey: 'navy' as const,
        points: [
          { x: 493, y: 841.89 },
          { x: 523, y: 841.89 },
          { x: 595.276, y: 733.5 },
          { x: 595.276, y: 695 },
          { x: 591, y: 695 }
        ]
      },
      {
        id: 'top_burgundy_triangle',
        type: 'polygon' as const,
        colorKey: 'burgundy' as const,
        points: [
          { x: 523, y: 841.89 },
          { x: 595.276, y: 841.89 },
          { x: 595.276, y: 733.5 }
        ]
      }
    ]
  },

  // Customer Details Block
  customer: {
    topY: 665,
    leftX: 45,
    rightX: 350,
    fontSize: 9.5,
    lineHeight: 15
  },

  // Table Config
  table: {
    topY: 590,
    headerHeight: 30,
    rowHeight: 26,
    maxRows: 8,
    borderThickness: 0.6,
    fontSize: 10,
    // Column definitions: ITEM | Unit Price | GST (18%) | AMMOUNT
    colWidths: [180, 105, 105, 115], // Sums to 505pt exactly
    colHeaders: ['ITEM', 'Unit Price', 'GST (18%)', 'AMMOUNT'],
    // Header background colors
    headerColors: ['burgundy', 'navy', 'navy', 'navy'] as const
  },

  // Summary Box (Bottom-Right)
  summary: {
    width: 200,
    bottomY: 195,
    fontSize: 9.5,
    lineHeight: 17,
    topSection: {
      height: 50,
      colorKey: 'burgundy' as const,
      rows: ['SUB TOTAL :', 'TOTAL GST :']
    },
    bottomSection: {
      height: 90,
      colorKey: 'navy' as const,
      rows: ['TOTAL :', 'DISCOUNT:', 'PAID :', 'DUE:']
    }
  },

  // Footer Config (Bottom)
  footer: {
    height: 75,
    // Solid navy background rect
    bg: {
      x: 0,
      y: 0,
      w: 595.276,
      h: 75,
      colorKey: 'navy' as const
    },
    // Top border line
    topBorder: {
      x1: 0,
      y1: 75,
      x2: 490, // Ends where the blue stripe starts
      y2: 75,
      thickness: 2,
      colorKey: 'gold' as const
    },
    // Diagonal bottom-right decorative shapes (drawn back-to-front)
    decorations: [
      {
        id: 'footer_blue_stripe',
        type: 'polygon' as const,
        colorKey: 'blueAccent' as const,
        points: [
          { x: 420, y: 0 },
          { x: 490, y: 75 },
          { x: 500, y: 75 },
          { x: 430, y: 0 }
        ]
      },
      {
        id: 'footer_gold_stripe',
        type: 'polygon' as const,
        colorKey: 'gold' as const,
        points: [
          { x: 430, y: 0 },
          { x: 500, y: 75 },
          { x: 508, y: 75 },
          { x: 438, y: 0 }
        ]
      },
      {
        id: 'footer_burgundy_corner',
        type: 'polygon' as const,
        colorKey: 'burgundy' as const,
        points: [
          { x: 438, y: 0 },
          { x: 508, y: 75 },
          { x: 595.276, y: 75 },
          { x: 595.276, y: 0 }
        ]
      }
    ],
    // Contact information
    phone: '+91 7969325899',
    email: 'support@harvardlearning.com',
    address: 'Address: SG Highway, Bodakdev, Ahmedabad, Gujarat – 380054, India',
    textX: 45,
    phoneY: 52,
    emailY: 38,
    addressY: 24,
    fontSize: 8.5
  }
};
