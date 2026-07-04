import fs from 'fs';

const content = fs.readFileSync('./src/components/Invoices/InvoiceDetails.jsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('eliteLayout.marginX')) {
    console.log(`Line ${idx + 1}: ${line.trim()}`);
  }
});
