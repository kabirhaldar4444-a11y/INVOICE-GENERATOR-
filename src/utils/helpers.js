/**
 * Format number to Indian Rupee (INR) currency style
 */
export const formatCurrency = (amount) => {
  const number = parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
};

/**
 * Format date string to Indian local format (e.g., 06 Jun 2026)
 */
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

/**
 * Automatically calculate the next invoice number in INV-YYYY-00001 sequence
 */
export const generateNextInvoiceNumber = (invoices) => {
  const currentYear = new Date().getFullYear().toString();
  const prefix = `INV-${currentYear}-`;
  
  // Find invoices from the current year that match the format
  const yearInvoices = invoices.filter(
    (inv) => inv.invoice_number && inv.invoice_number.startsWith(prefix)
  );

  let nextSeq = 1;

  if (yearInvoices.length > 0) {
    const seqNumbers = yearInvoices.map((inv) => {
      const parts = inv.invoice_number.split('-');
      // parts[0] = 'INV', parts[1] = 'YYYY', parts[2] = 'XXXXX'
      if (parts.length >= 3) {
        const seq = parseInt(parts[2], 10);
        return isNaN(seq) ? 0 : seq;
      }
      return 0;
    });
    
    nextSeq = Math.max(...seqNumbers) + 1;
  }

  return `${prefix}${nextSeq.toString().padStart(5, '0')}`;
};

/**
 * Export data array to CSV and trigger browser download
 */
export const exportToCSV = (data, headers, filename = 'export.csv') => {
  if (!data || !data.length) return;

  const csvRows = [];
  
  // Add Header Row
  csvRows.push(headers.join(','));

  // Add Data Rows
  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header] !== undefined ? row[header] : '';
      const escaped = ('' + val).replace(/"/g, '""'); // Escape double quotes
      return `"${escaped}"`;
    });
    csvRows.push(values.join(','));
  }

  // Create CSV file link and click it
  const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
