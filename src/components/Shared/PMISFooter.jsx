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
    const fill = PMI_FOOTER_CONFIG[shape.colorKey] || shape.color;

    if (shape.type === 'polygon') {
      const pointsString = shape.points
        .map(p => `${p.x},${height - p.y}`)
        .join(' ');
      return <polygon key={shape.id} points={pointsString} fill={fill} />;
    }
    
    if (shape.type === 'circle') {
      return (
        <circle
          key={shape.id}
          cx={shape.cx}
          cy={height - shape.cy}
          r={shape.r}
          fill={fill}
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
        <g fill={pmiWhite} className="select-none pointer-events-none" style={{ fontFamily: "'Inter', 'Poppins', sans-serif" }}>
          {/* Bold Phone & Email */}
          <text x={leftPadding} y={height - phoneY} fontSize={`${phoneSize}px`} fontWeight="bold" letterSpacing="0.2px">
            {phone} | {email}
          </text>
          {/* Regular Address Lines */}
          <text x={leftPadding} y={height - address1Y} fontSize={`${addressSize}px`} fontWeight="500">
            {addressLine1}
          </text>
          <text x={leftPadding} y={height - address2Y} fontSize={`${addressSize}px`} fontWeight="500">
            {addressLine2}
          </text>
        </g>
      </svg>
    </div>
  );
};

export default PMISFooter;
