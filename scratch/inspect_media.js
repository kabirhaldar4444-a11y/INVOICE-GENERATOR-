import fs from 'fs';
import path from 'path';

const dirs = ['elite_unzipped', 'havard_unzipped', 'pmis_unzipped', 'princeton_unzipped'];

dirs.forEach(dir => {
  const mediaPath = path.join('d:\\isn invoice generator\\scratch', dir, 'word', 'media');
  console.log(`\n==================== ${dir.toUpperCase()} MEDIA ====================`);
  if (!fs.existsSync(mediaPath)) {
    console.log('No media folder');
    return;
  }
  const files = fs.readdirSync(mediaPath);
  files.forEach(file => {
    const filePath = path.join(mediaPath, file);
    const stats = fs.statSync(filePath);
    console.log(`File: ${file}, Size: ${stats.size} bytes`);
  });
});
