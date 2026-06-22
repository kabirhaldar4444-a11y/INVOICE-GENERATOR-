import fs from 'fs';
import path from 'path';

function getPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  // Verify PNG signature
  if (buffer.readUInt32BE(0) !== 0x89504E47 || buffer.readUInt32BE(4) !== 0x0D0A1A0A) {
    console.log(`${filePath} is not a valid PNG`);
    return null;
  }
  // IHDR chunk starts at byte 12. Width is at 16, Height is at 20
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

const logos = [
  'ELITETOOLISTIC LOGO.png',
  'HavardLearning logo.png',
  'Princeton.png',
  'logo successnode_edited 1.png'
];

logos.forEach(logoName => {
  const logoPath = path.join('d:\\isn invoice generator\\LOGOS', logoName);
  if (fs.existsSync(logoPath)) {
    const dim = getPngDimensions(logoPath);
    if (dim) {
      console.log(`${logoName}: Width = ${dim.width}px, Height = ${dim.height}px, Aspect Ratio = ${(dim.width / dim.height).toFixed(3)}`);
    }
  } else {
    console.log(`${logoName} not found`);
  }
});
