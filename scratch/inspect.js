import fs from 'fs';
import path from 'path';

const dirs = ['elite_unzipped', 'havard_unzipped', 'pmis_unzipped', 'princeton_unzipped'];

dirs.forEach(dir => {
  const wordPath = path.join('d:\\isn invoice generator\\scratch', dir, 'word');
  console.log(`\n==================== ${dir.toUpperCase()} ====================`);
  
  if (!fs.existsSync(wordPath)) {
    console.log(`Word folder does not exist at ${wordPath}`);
    return;
  }
  
  const files = fs.readdirSync(wordPath);
  console.log('Files in word directory:', files.filter(f => !fs.statSync(path.join(wordPath, f)).isDirectory()));
  
  // Check if media folder exists and list files
  const mediaPath = path.join(wordPath, 'media');
  if (fs.existsSync(mediaPath)) {
    console.log('Media files:', fs.readdirSync(mediaPath));
  } else {
    console.log('No media folder');
  }

  // Look for header/footer files and extract some text
  files.forEach(file => {
    if (file.startsWith('header') || file.startsWith('footer') || file === 'document.xml') {
      const filePath = path.join(wordPath, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extract w:t tag content (text)
      const matches = content.match(/<w:t[^>]*>(.*?)<\/w:t>/g) || [];
      const text = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ').substring(0, 400);
      console.log(`- ${file} text snippet: ${text}...`);
    }
  });
});
