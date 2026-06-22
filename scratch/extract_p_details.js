import fs from 'fs';
import path from 'path';

function inspectXml(dir) {
  const filePath = path.join('d:\\isn invoice generator\\scratch', dir, 'word', 'document.xml');
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');

  console.log(`\n================ INSPECTING TEXT STRUCTURE FOR ${dir.toUpperCase()} ================`);
  
  // Find all text blocks inside paragraphs w:p
  // We want to print paragraphs in order, with some indication of their alignment, font, and text content
  const pRegex = /<w:p\b[^>]*>(.*?)<\/w:p>/g;
  let pMatch;
  let index = 0;

  while ((pMatch = pRegex.exec(content)) !== null) {
    const pContent = pMatch[1];
    
    // Check alignment
    let align = 'left';
    const jcMatch = pContent.match(/<w:jc w:val="([^"]+)"/);
    if (jcMatch) align = jcMatch[1];

    // Check if in a table row
    // (This is a simple check - if we're inside w:tc)
    
    // Extract text runs
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

    if (runs.length > 0) {
      const formattedRuns = runs.map(r => {
        let style = [];
        if (r.isBold) style.push('B');
        if (r.isItalic) style.push('I');
        if (r.color) style.push(`color:#${r.color}`);
        const styleStr = style.length > 0 ? ` [${style.join(',')}]` : '';
        return `"${r.text}"${styleStr}`;
      }).join(' + ');
      console.log(`P[${index}] (${align}): ${formattedRuns}`);
    }
    index++;
  }
}

inspectXml('elite_unzipped');
