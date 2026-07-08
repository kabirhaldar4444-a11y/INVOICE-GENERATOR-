import React from 'react';
import { PMI_FOOTER_CONFIG } from '../../utils/pmiFooterConfig';

export const PMISFooter = () => {
  const {
    height,
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
    shapes,
    pmiWhite
  } = PMI_FOOTER_CONFIG;

  const renderShape = (shape) => {
    const color = PMI_FOOTER_CONFIG[shape.colorKey];
    
    if (shape.type === 'polygon') {
      // Map points (y_rel_bot to y_svg): y_svg = height - y_rel_bot
      const pointsString = shape.points
        .map(p => `${p.x},${height - p.y}`)
        .join(' ');
      return <polygon key={shape.id} points={pointsString} fill={color} />;
    }
    
    if (shape.type === 'circle') {
      // Map center (cy_rel_bot to cy_svg): cy_svg = height - cy_rel_bot
      return (
        <circle
          key={shape.id}
          cx={shape.cx}
          cy={height - shape.cy}
          r={shape.r}
          fill={color}
        />
      );
    }
    
    return null;
  };

  return (
    <div className="absolute bottom-0 left-0 w-full text-white overflow-hidden z-10 text-left select-none" style={{ height: `${height}px` }}>
      {/* Background SVG containing precise shapes matching coordinates exactly */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 595.276 ${height}`} preserveAspectRatio="none">
        {shapes.map(renderShape)}

        {/* Contact Info overlay inside the SVG to scale perfectly with the shapes */}
        <g fill={pmiWhite} className="font-bold font-sans select-none pointer-events-none">
          <text x={leftPadding} y={height - phoneY} fontSize={`${phoneSize}px`} letterSpacing="0.3px">{phone} | {email}</text>
          <text x={leftPadding} y={height - address1Y} fontSize={`${addressSize}px`}>{addressLine1}</text>
          <text x={leftPadding} y={height - address2Y} fontSize={`${addressSize}px`}>{addressLine2}</text>
        </g>
      </svg>
    </div>
  );
};

export default PMISFooter;
