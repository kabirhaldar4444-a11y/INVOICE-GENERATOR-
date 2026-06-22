import fs from 'fs';
import path from 'path';

function inspectXml(dir) {
  const filePath = path.join('d:\\isn invoice generator\\scratch', dir, 'word', 'document.xml');
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');

  console.log(`\n================ TEXT STRUCTURE FOR ${dir.toUpperCase()} ================`);
  
  const pRegex = /<w:p\b[^>]*>(.*?)<\/w:p>/g;
  let pMatch;
  let index = 0;

  while ((pMatch = pRegex.exec(content)) !== null) {
    const pContent = pMatch[1];
    const rRegex = /<w:r\b[^>]*>(.*?)<\/w:r>/g;
    let rMatch;
    let runs = [];
    while ((rMatch = rRegex.exec(pContent)) !== null) {
      const rContent = rMatch[1];
      const textMatch = rContent.match(/<w:t[^>]*>(.*?)<\/w:t>/);
      const text = textMatch ? textMatch[1] : '';
      if (text.trim() !== '') {
        runs.push(text);
      }
    }
    const fullText = runs.join(' ').trim();
    // Print lines containing company details or address/email
    if (fullText !== '' && (
      fullText.includes('@') || 
      fullText.toLowerCase().includes('address') || 
      fullText.toLowerCase().includes('phone') || 
      fullText.toLowerCase().includes('gst') || 
      fullText.toLowerCase().includes('cin') || 
      fullText.toLowerCase().includes('invoice') || 
      fullText.toLowerCase().includes('total') || 
      index < 10 || 
      index > 75
    )) {
      console.log(`P[${index}]: ${fullText}`);
    }
    index++;
  }
}

inspectXml('havard_unzipped');
inspectXml('princeton_unzipped');
inspectXml('pmis_unzipped');
