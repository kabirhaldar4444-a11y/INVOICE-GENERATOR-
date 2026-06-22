import fs from 'fs';
import path from 'path';

const dirs = ['elite_unzipped', 'havard_unzipped', 'pmis_unzipped', 'princeton_unzipped'];

dirs.forEach(dir => {
  const wordPath = path.join('d:\\isn invoice generator\\scratch', dir, 'word');
  console.log(`\n==================== ${dir.toUpperCase()} ANALYSIS ====================`);
  
  if (!fs.existsSync(wordPath)) {
    return;
  }
  
  const docPath = path.join(wordPath, 'document.xml');
  const docContent = fs.readFileSync(docPath, 'utf8');

  // Find all hex colors
  const colorMatches = docContent.match(/w:val="([A-Fa-f0-9]{6})"/g) || [];
  const fillMatches = docContent.match(/w:fill="([A-Fa-f0-9]{6})"/g) || [];
  const colors = new Set([
    ...colorMatches.map(m => m.match(/"([A-Fa-f0-9]{6})"/)[1]),
    ...fillMatches.map(m => m.match(/"([A-Fa-f0-9]{6})"/)[1])
  ]);
  
  console.log('Hex colors used in document:', Array.from(colors));

  // Find font families
  const fontMatches = docContent.match(/w:ascii="([^"]+)"/g) || [];
  const fonts = new Set(fontMatches.map(m => m.match(/"([^"]+)"/)[1]));
  console.log('Fonts used:', Array.from(fonts));

  // Look for text run properties and shading colors
  // Let's find table shading colors specifically
  const shadingFills = docContent.match(/<w:shd[^>]*w:fill="([A-Fa-f0-9]{6})"/g) || [];
  const tableShadings = new Set(shadingFills.map(m => m.match(/w:fill="([A-Fa-f0-9]{6})"/)[1]));
  console.log('Table/paragraph shading fills:', Array.from(tableShadings));

  // Check structure: check if there are paragraphs containing specific text and print their surrounding styles
  const pMatches = docContent.match(/<w:p\b[^>]*>(.*?)<\/w:p>/g) || [];
  console.log(`Total paragraphs: ${pMatches.length}`);

  // Let's look for images and their relationship IDs (rId) in document.xml
  const drawingMatches = docContent.match(/<w:drawing\b[^>]*>.*?<\/w:drawing>/g) || [];
  console.log(`Total drawings (images/shapes): ${drawingMatches.length}`);
});
