import { generateInvoicePDF } from '../src/utils/pdfGenerator.js';
import fs from 'fs';
import path from 'path';

// Mock global fetch for local files in Node.js
global.fetch = async (url) => {
  // Normalize url
  let relativePath = url;
  if (url.startsWith('http://localhost:5173')) {
    relativePath = url.replace('http://localhost:5173', '');
  }
  
  if (relativePath.startsWith('/')) {
    // Look inside public directory
    const filePath = path.join(process.cwd(), 'public', relativePath);
    if (fs.existsSync(filePath)) {
      const buffer = fs.readFileSync(filePath);
      return {
        ok: true,
        arrayBuffer: async () => {
          // Return ArrayBuffer representation of the file buffer
          return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        }
      };
    }
  }
  console.log("Mock fetch fallback for URL:", url);
  return { ok: false };
};

// Base Invoice
const mockInvoiceBase = {
  invoice_number: '2026/MCG/1903',
  invoice_date: '2026-06-03',
  subtotal: 83474.58,
  gst_amount: 15025.42,
  total_amount: 98500.00,
  paid_amount: 98500.00,
  status: 'paid',
  customers: {
    name: 'Pratibha Manwar',
    email: 'manwarpratibha12@gmail.com',
    phone: '+91-9876543210',
    gst_number: '27AAACT2234G1Z2',
    address: '123 Client Street, Mumbai, MH, 400001'
  },
  invoice_items: [
    {
      program_name: 'FAC Program Course with a very long title that should wrap onto multiple lines in the generated PDF table row',
      description: 'Full Course Access',
      quantity: 1,
      unit_price: 41737.29,
      gst_percentage: 18,
      gst_amount: 7512.71,
      total_amount: 49250.00
    },
    {
      program_name: 'FRMC Certification',
      description: 'Certification Exam Fee',
      quantity: 1,
      unit_price: 41737.29,
      gst_percentage: 18,
      gst_amount: 7512.71,
      total_amount: 49250.00
    },
    {
      program_name: 'FMVAC (Complementary)',
      description: 'Bonus Materials',
      quantity: 1,
      unit_price: 0,
      gst_percentage: 0,
      gst_amount: 0,
      total_amount: 0
    }
  ]
};

const companiesToTest = [
  {
    key: 'isn',
    settings: {
      company_name: 'I-SUCCESSNODE',
      gst_number: '09AAHCI9258G1Z3',
      email: 'support@isuccessnode.com',
      phone: '+91-7969537567',
      website: 'www.isuccessnode.com',
      address: 'I-SUCCESSNODE Office, India',
      logo_url: '/logo-isn.png'
    }
  },
  {
    key: 'elite',
    settings: {
      company_name: 'EliteToolistic',
      gst_number: '09AAOCP5868J1ZI',
      email: 'info@elitetoolistic.com',
      phone: '+91-7969325899',
      website: 'www.elitetoolistic.com',
      address: '301, 2nd Floor, The Capital, Science City Road, Sola, Ahmedabad - 380060',
      logo_url: '/logo-elite.png'
    }
  },
  {
    key: 'harvard',
    settings: {
      company_name: 'Harvard Learning',
      gst_number: '09AAOCP5868J1ZI',
      email: 'support@harvardlearning.com',
      phone: '+91-7969325899',
      website: 'www.harvardlearning.com',
      address: 'SG Highway, Bodakdev, Ahmedabad, Gujarat - 380054, India',
      logo_url: '/logo-harvard.png'
    }
  },
  {
    key: 'princeton',
    settings: {
      company_name: 'Princeton Professionals',
      gst_number: '09AAOCP5868J1ZI',
      email: 'support@princetonprofessional.com',
      phone: '+91-7969325899',
      website: 'www.princetonprofessional.com',
      address: '1203, Mondeal Heights, Sarkhej Gandhinagar Service Road, Near Wide Angle Cinema, Ramdevnagar, Satellite, Ahmedabad, Gujarat 380015',
      logo_url: '/logo-princeton.png'
    }
  },
  {
    key: 'pmi',
    settings: {
      company_name: 'PMI Services',
      gst_number: '09TRFPS5497N1Z6',
      email: 'support@pmiservices.in',
      phone: '+91-7969325899',
      website: 'www.pmiservices.in',
      address: 'Sarkhej Gandhinagar Service Road, Near Wide Angle Cinema, Ramdevnagar, Satellite, Ahmedabad, Gujarat 380015',
      logo_url: '/logo-pmi.jpg'
    }
  }
];

async function generateAll() {
  for (const company of companiesToTest) {
    try {
      console.log(`Generating PDF for ${company.settings.company_name}...`);
      const invoice = {
        ...mockInvoiceBase,
        invoice_profile: company.settings
      };
      const pdfBytes = await generateInvoicePDF(invoice, company.settings);
      const outputPath = path.resolve(`./scratch/test_output_${company.key}.pdf`);
      fs.writeFileSync(outputPath, pdfBytes);
      console.log(`Saved: ${outputPath}`);
    } catch (error) {
      console.error(`Failed to generate PDF for ${company.key}:`, error);
    }
  }
}

generateAll();
