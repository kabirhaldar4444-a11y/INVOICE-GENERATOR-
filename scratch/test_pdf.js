import { generateInvoicePDF } from '../src/utils/pdfGenerator.js';
import fs from 'fs';
import path from 'path';

// Mock Invoice
const mockInvoice = {
  invoice_number: 'INV-2026-00005',
  invoice_date: '2026-06-08',
  subtotal: 83474.58,
  gst_amount: 15025.42,
  total_amount: 98500.00,
  paid_amount: 98500.00,
  status: 'paid',
  customers: {
    name: 'test',
    email: 'test@gmail.com',
    phone: '1234567890',
    gst_number: '09AAHCI9258G1Z3',
    address: '123 Test Street, Test City'
  },
  invoice_items: [
    {
      program_name: 'ABC',
      description: 'First program description',
      quantity: 1,
      unit_price: 41737.29,
      gst_percentage: 18,
      gst_amount: 7512.71,
      total_amount: 49250.00
    },
    {
      program_name: 'FRMC',
      description: '',
      quantity: 1,
      unit_price: 41737.29,
      gst_percentage: 18,
      gst_amount: 7512.71,
      total_amount: 49250.00
    },
    {
      program_name: 'ASDF (complementary)',
      description: '',
      quantity: 1,
      unit_price: 0,
      gst_percentage: 0,
      gst_amount: 0,
      total_amount: 0
    }
  ]
};

// Mock Settings
const mockSettings = {
  company_name: 'I-SUCCESSNODE',
  gst_number: '09AAHCI9258G1Z3',
  email: 'support@isuccessnode.com',
  phone: '+91-7969537567',
  website: 'www.isuccessnode.com',
  address: 'I-SUCCESSNODE Office, India',
  logo_url: '' // no logo for base test
};

async function test() {
  try {
    console.log("Generating mock PDF...");
    const pdfBytes = await generateInvoicePDF(mockInvoice, mockSettings);
    const outputPath = path.resolve('./scratch/test_output.pdf');
    fs.writeFileSync(outputPath, pdfBytes);
    console.log("PDF generated successfully at:", outputPath);
  } catch (error) {
    console.error("PDF generation failed inside test:", error);
  }
}

test();
