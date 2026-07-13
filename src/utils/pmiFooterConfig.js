// Shared configuration constants for PMIS footer to ensure 100% pixel-perfect matching
// between HTML/SVG preview and PDF export.
//
// COORDINATE SYSTEM: bottom-relative (y = 0 at footer bottom, y = 140 at footer top)
//
// DRAWING ORDER matters (later = on top):
//   purple_banner → orange_stripe → green_stripe → white_mask → orange_circle → purple_corner
//
// This order makes the white_mask act as a "cookie-cutter" that:
//   1. Covers the upper ends of the stripes (hiding them inside the white circle)
//   2. Reveals the orange_circle on top as the clean gold ball at the end of the stripe
//
// The orange_stripe centerline is mathematically aligned so it passes EXACTLY through
// the orange_circle center (451.2, 60), creating a seamless comet/lollipop connection.
//
// Proof: stripe bottom center at x = 451.2 - 60 = 391.2 (at y = 0)
//        stripe direction 45° → at y=60: x = 391.2 + 60 = 451.2 ✓

export const PMI_FOOTER_CONFIG = {
  height: 140,
  pmiPurple: '#4A15B7',
  pmiGold: '#FFC000',
  pmiOrange: '#FFC000', // Alias for safety
  pmiGreen: '#00A859',
  pmiWhite: '#FFFFFF',
  pmiLightText: '#E2E8F0',

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
  // NOTE: DRAWING ORDER IS CRITICAL — do not reorder without rechecking the visual output.
  shapes: [
    // 1. Left purple banner — the base purple slab
    {
      id: 'purple_banner',
      type: 'polygon',
      colorKey: 'pmiPurple',
      points: [
        { x: 0,   y: 0  },
        { x: 0,   y: 50 },
        { x: 420, y: 50 },
        { x: 370, y: 0  }
      ]
    },

    // 2. White mask — drawn UNDER the stripes/circle to create the clean circular end for the purple banner
    {
      id: 'white_mask',
      type: 'circle',
      colorKey: 'pmiWhite',
      cx: 490.0,
      cy: 60.0,
      r: 36.0
    },

    // 3. Gold stripe — drawn ON TOP of the white mask so they are joint
    //    Right edge matches the green stripe left edge exactly (x = y + 430)
    //    Width is 17 (half-width 8.5)
    {
      id: 'orange_stripe',
      type: 'polygon',
      colorKey: 'pmiGold',
      points: [
        { x: 413.0, y: 0    },  // bottom-left  (430 - 17)
        { x: 473.0, y: 60.0 },  // top-left     (490.0 - 17)
        { x: 490.0, y: 60.0 },  // top-right    (60.0 + 430)
        { x: 430.0, y: 0    }   // bottom-right (0 + 430)
      ]
    },

    // 4. Gold circle — drawn ON TOP of the gold stripe
    //    Centered at (490.0, 60.0) with radius 28.0 to bulge out on the left
    {
      id: 'orange_circle',
      type: 'circle',
      colorKey: 'pmiGold',
      cx: 490.0,
      cy: 60.0,
      r: 28.0
    },

    // 5. Green stripe — drawn ON TOP of the gold stripe/circle to cover the right side and make a clean diagonal division
    {
      id: 'green_stripe',
      type: 'polygon',
      colorKey: 'pmiGreen',
      points: [
        { x: 430,     y: 0   },
        { x: 570,     y: 140 },
        { x: 595.276, y: 140 },
        { x: 595.276, y: 130 },
        { x: 465.3,   y: 0   }
      ]
    },

    // 6. Purple corner — top-right triangle, covers the far-right area.
    {
      id: 'purple_corner',
      type: 'polygon',
      colorKey: 'pmiPurple',
      points: [
        { x: 486.5,   y: 0      },
        { x: 595.276, y: 108.77 },
        { x: 595.276, y: 0      }
      ]
    }
  ]
};
