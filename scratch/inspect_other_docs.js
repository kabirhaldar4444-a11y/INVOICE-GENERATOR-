import fs from 'fs';
import path from 'path';

function inspectXml(dir) {
  const filePath = path.join('d:\\isn invoice generator\\scratch', dir, 'word', 'document.xml');
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');

  console.log(`\n================ INSPECTING TEXT STRUCTURE FOR ${dir.toUpperCase()} ================`);
  
  const pRegex = /<w:p\b[^>]*>(.*?)<\/w:p>/g;
  let pMatch;
  let index = 0;

  while ((pMatch = pRegex.exec(content)) !== null) {
    const pContent = pMatch[1];
    
    let align = 'left';
    const jcMatch = pContent.match(/<w:jc w:val="([^"]+)"/);
    if (jcMatch) align = jcMatch[1];

    const rRegex = /<w:r\b[^>]*>(.*?)<\/w:r>/g;
    let rMatch;
    let runs = [];
    while ((rMatch = rRegex.exec(pContent)) !== null) {
      const rContent = rMatch[1];
      const textMatch = rContent.match(/<w:t[^>]*>(.*?)<\/w:t>/);
      const text = textMatch ? textMatch[1] : '';
      
      const isBold = rContent.includes('<w:b/>') || rContent.includes('<w:b w:val="true"');
      const isItalic = rContent.includes('<w:i/>') || rContent.includes('<w:i w:val="true"');
      const colorMatch = rContent.match(/<w:color w:val="([^"]+)"/);
      const color = colorMatch ? colorMatch[1] : null;

      if (text.trim() !== '') {
        runs.push({ text, isBold, isItalic, color });
      }
    }

    // Filter to only display key content lines to keep output clean and readable
    if (runs.length > 0) {
      const formattedRuns = runs.map(r => {
        let style = [];
        if (r.isBold) style.push('B');
        if (r.isItalic) style.push('I');
        if (r.color) style.push(`color:#${r.color}`);
        const styleStr = style.length > 0 ? ` [${style.join(',')}]` : '';
        return `"${r.text}"${styleStr}`;
      }).join(' + ');
      
      // Let's only print runs that contain letters or numbers, or interesting text
      const fullText = runs.map(r => r.text).join(' ');
      if (fullText.match(/[A-Za-z0-9]/) && (fullText.includes('GST') || fullText.includes('BILL') + fullText.includes('INVOICE') || fullText.includes('TOTAL') || fullText.includes('Address') || fullText.includes('Course') || index < 15 || index > 50)) {
        console.log(`P[${index}] (${align}): ${formattedRuns}`);
      }
    }
    index++;
  }
}

inspectXml('havard_unzipped');
inspectXml('pmis_unzipped');
inspectXml('princeton_unzipped');
