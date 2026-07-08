// Shared configuration constants for PMIS footer to ensure 100% pixel-perfect matching
// between HTML/SVG preview and PDF export.

export const PMI_FOOTER_CONFIG = {
  height: 140,
  pmiPurple: '#4B2E9E',
  pmiOrange: '#F2A814',
  pmiGreen: '#2E9E5B',
  pmiWhite: '#FFFFFF',
  
  // Text content
  phone: '+91 7969325899',
  email: 'support@pmiservices.in',
  addressLine1: 'Address: Sarkhej Gandhinagar Service Road Near Wide Angle Cinema Ramdev',
  addressLine2: 'Nagar, Satellite, Ahmedabad, Gujarat 380015',
  leftPadding: 45,
  phoneY: 35,
  address1Y: 22,
  address2Y: 10,
  phoneSize: 9.5,
  addressSize: 8.5,

  // Geometry shapes defined in bottom-relative coordinates (y = 0 at bottom, y = 140 at top)
  shapes: [
    {
      id: 'purple_banner',
      type: 'polygon',
      colorKey: 'pmiPurple',
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 50 },
        { x: 420, y: 50 },
        { x: 370, y: 0 }
      ]
    },
    {
      id: 'white_mask',
      type: 'circle',
      colorKey: 'pmiWhite',
      cx: 451.2,
      cy: 60.0,
      r: 35.0
    },
    {
      id: 'orange_stripe',
      type: 'polygon',
      colorKey: 'pmiOrange',
      points: [
        { x: 391.2, y: 0 },
        { x: 465.3, y: 74.1 },
        { x: 482.3, y: 74.1 },
        { x: 408.2, y: 0 }
      ]
    },
    {
      id: 'orange_circle',
      type: 'circle',
      colorKey: 'pmiOrange',
      cx: 451.2,
      cy: 60.0,
      r: 20.0
    },
    {
      id: 'green_stripe',
      type: 'polygon',
      colorKey: 'pmiGreen',
      points: [
        { x: 430, y: 0 },
        { x: 570, y: 140 },
        { x: 595.276, y: 140 },
        { x: 595.276, y: 130 },
        { x: 465.3, y: 0 }
      ]
    },
    {
      id: 'purple_corner',
      type: 'polygon',
      colorKey: 'pmiPurple',
      points: [
        { x: 486.5, y: 0 },
        { x: 595.276, y: 108.77 },
        { x: 595.276, y: 0 }
      ]
    }
  ]
};


