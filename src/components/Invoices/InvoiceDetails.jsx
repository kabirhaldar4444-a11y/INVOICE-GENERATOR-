import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { generateInvoicePDF } from '../../utils/pdfGenerator';
import { 
  ArrowLeft, 
  Download, 
  Mail, 
  Edit, 
  Trash2, 
  ReceiptText, 
  Building,
  Send,
  X
} from 'lucide-react';

export const InvoiceDetails = () => {
  const { invoices, settings, deleteInvoice, showToast, confirm } = useApp();
  const navigate = useNavigate();
  const { id } = useParams();

  const [invoice, setInvoice] = useState(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  
  // Email state
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    const found = invoices.find(inv => inv.id === id);
    if (found) {
      setInvoice(found);
      setToEmail(found.customers?.email || '');
      const activeCompany = found.invoice_profile || settings;
      setSubject(`Tax Invoice ${found.invoice_number} from ${activeCompany?.company_name || 'I-SUCCESSNODE'}`);
      
      // Build clean itemized list
      const itemsText = found.invoice_items?.map(item => {
        const isComp = parseFloat(item.unit_price) === 0;
        if (isComp) {
          return `* ${item.program_name}\n  Qty: ${item.quantity} | Complementary`;
        }
        return `* ${item.program_name}\n  Qty: ${item.quantity} | Price: ${formatCurrency(item.unit_price)} (+18% GST)\n  Total: ${formatCurrency(item.total_amount)}`;
      }).join('\n\n') || '';

      const netBalance = Math.max(0, found.total_amount - found.paid_amount);

      const formattedMessage = 
`Dear ${found.customers?.name || 'Client'},\n\n` +
`Below is the detailed invoice statement for your records.\n\n` +
`===============================================\n` +
`                  TAX INVOICE                  \n` +
`===============================================\n` +
`Invoice Code : ${found.invoice_number}\n` +
`Issue Date   : ${formatDate(found.invoice_date)}\n` +
`Status       : ${found.status.toUpperCase()}\n\n` +
`-----------------------------------------------\n` +
`FROM:\n` +
`  ${activeCompany?.company_name || 'I-SUCCESSNODE'}\n` +
`  Email: ${activeCompany?.email || 'N/A'}\n` +
`  Phone: ${activeCompany?.phone || 'N/A'}\n` +
`  GSTIN: ${activeCompany?.gst_number || 'N/A'}\n\n` +
`BILL TO:\n` +
`  ${found.customers?.name || 'Client'}\n` +
`  Email: ${found.customers?.email || 'N/A'}\n` +
`  GSTIN: ${found.customers?.gst_number || 'N/A'}\n` +
`-----------------------------------------------\n` +
`ITEMS:\n` +
`${itemsText}\n` +
`-----------------------------------------------\n` +
`SUMMARY:\n` +
`  Subtotal     : ${formatCurrency(found.subtotal)}\n` +
`  Tax (18% GST): ${formatCurrency(found.gst_amount)}\n` +
`  Total Amount : ${formatCurrency(found.total_amount)}\n` +
`  Paid Amount  : ${formatCurrency(found.paid_amount)}\n` +
`  Balance Due  : ${formatCurrency(netBalance)}\n` +
`===============================================\n` +
`     Thank you for doing business with us!     \n` +
`===============================================`;

      setMessage(formattedMessage);
    }
  }, [id, invoices, settings]);

  if (!invoice) {
    return (
      <div className="text-center py-20">
        <ReceiptText className="w-12 h-12 text-slate-300 mx-auto mb-4 animate-bounce" />
        <p className="text-slate-500 font-semibold">Loading invoice details...</p>
      </div>
    );
  }

  const handleDownloadPDF = async () => {
    try {
      showToast('Generating PDF Document...', 'info');
      const pdfBytes = await generateInvoicePDF(invoice, settings);
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Sanitize filename to prevent browser crashes when invoice number contains "/"
      const safeFilename = invoice.invoice_number.replace(/[^a-zA-Z0-9-_]/g, '_');
      link.download = `${safeFilename}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Invoice PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate PDF. Make sure settings are saved.', 'error');
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!toEmail) return;

    setSendingEmail(true);
    try {
      // Build FormData without file attachments for compatibility with Web3Forms free plan
      const activeCompany = invoice.invoice_profile || settings;
      const formData = new FormData();
      formData.append("access_key", "33b16dfe-bac0-40f9-8137-1c00c3b758f8");
      formData.append("from_name", activeCompany?.company_name || 'I-SUCCESSNODE');
      formData.append("email", toEmail); // Sets customer email as reply-to/sender
      formData.append("subject", subject);
      formData.append("message", message);

      // Post to Web3Forms
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        showToast(`Invoice summary successfully emailed to ${toEmail}!`, 'success');
        setEmailModalOpen(false);
      } else {
        throw new Error(result.message || "Failed to submit form.");
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Failed to send email. Please try again.', 'error');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete Invoice',
      message: 'Are you sure you want to delete this invoice? This action is irreversible.',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      try {
        await deleteInvoice(invoice.id);
        navigate('/invoices');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const activeCompany = invoice.invoice_profile || settings;
  const netBalance = Math.max(0, invoice.total_amount - invoice.paid_amount);

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(parseFloat(num) || 0);
  };

  const companyName = (activeCompany?.company_name || '').toLowerCase();
  let themeKey = 'default';
  let localLogoPath = null;

  if (companyName.includes('elite')) {
    themeKey = 'elite';
    localLogoPath = '/logos/elite.png';
  } else if (companyName.includes('harvard') || companyName.includes('havard')) {
    themeKey = 'harvard';
    localLogoPath = '/logos/harvard.png';
  } else if (companyName.includes('pmi')) {
    themeKey = 'pmi';
    localLogoPath = '/logos/pmi.png';
  } else if (companyName.includes('princeton') || companyName.includes('princetion')) {
    themeKey = 'princeton';
    localLogoPath = '/logos/princeton.png';
  }

  // Brand data fallback overrides
  const brandData = {
    elite: {
      company_name: 'ELITETOOLISTIC',
      phone: '+91 7969325899',
      email: 'info@elitetoolistic.com',
      website: 'www.elitetoolistic.com',
      gst_number: '09AAOCP5868J1ZI',
      cin: 'U16229UP2024PTC199657',
      address: '301, 2nd Floor, The Capital, Science City Road, Sola, Ahmedabad - 380060',
      primary: '#2E41B4',
      secondary: '#EE0000',
      dark: '#102744',
      bg: '#F2F2F2'
    },
    harvard: {
      company_name: 'HAVARD LEARNING',
      phone: '+91 7969325899',
      email: 'support@harvardlearning.com',
      website: 'www.harvardlearning.com',
      gst_number: '09AAOCP5868J1ZI',
      cin: 'U16229UP2024PTC199657',
      address: 'SG Highway, Bodakdev, Ahmedabad, Gujarat - 380054, India',
      primary: '#77151D',
      secondary: '#081E42',
      dark: '#102744',
      bg: '#F2F2F2'
    },
    pmi: {
      company_name: 'PMI Services PMIS',
      phone: '+91 7969325899',
      email: 'support@pmiservices.in',
      website: 'www.pmiservices.in',
      gst_number: '09TRFPS5497N1Z6',
      address: 'Sarkhej Gandhinagar Service Road Near Wide Angle Cinema Ramdev Nagar, Satellite, Ahmedabad, Gujarat 380015',
      primary: '#3C0BB5',
      secondary: '#FFC000',
      dark: '#102744',
      bg: '#F8FAFC'
    },
    princeton: {
      company_name: 'Princeton Professional',
      email: 'support@princetonprofessional.com',
      website: 'www.princetonprofessional.com',
      gst_number: '09AAOCP5868J1ZI',
      address: '1203, Mondeal Heights, Sarkhej Gandhinagar Service Road, Ahmedabad, Gujarat 380015',
      primary: '#996633',
      secondary: '#102744',
      dark: '#102744',
      bg: '#F8FAFC'
    },
    default: {
      company_name: activeCompany?.company_name || 'I-SUCCESSNODE',
      phone: activeCompany?.phone || '',
      email: activeCompany?.email || '',
      website: activeCompany?.website || '',
      gst_number: activeCompany?.gst_number || '',
      cin: activeCompany?.cin || '',
      address: activeCompany?.address || '',
      primary: '#7c3aed',
      secondary: '#0ea5e9',
      dark: '#0f172a',
      bg: '#f8fafc'
    }
  };

  const activeTheme = brandData[themeKey];
  const companyNameText = activeTheme.company_name;
  const companyPhone = activeTheme.phone;
  const companyEmail = activeTheme.email;
  const companyWebsite = activeTheme.website;
  const companyGst = activeTheme.gst_number;
  const companyCin = activeTheme.cin;
  const companyAddress = activeTheme.address;
  const logoUrlToRender = localLogoPath || activeCompany?.logo_url;

  return (
    <div className="space-y-6">
      {/* Header controls bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors shadow-sm no-print">
        <button
          onClick={() => navigate('/invoices')}
          className="flex items-center gap-2 py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </button>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleDownloadPDF}
            className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 py-2 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-primary-500/10 hover:shadow-primary-500/25 active:scale-[0.98] text-sm"
            title="Download PDF Copy"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>
          
          <button
            onClick={() => setEmailModalOpen(true)}
            className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 py-2 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-colors text-sm"
            title="Email to Client"
          >
            <Mail className="w-4 h-4" /> Email Client
          </button>

          <Link
            to={`/invoices/${invoice.id}/edit`}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 transition-colors"
            title="Edit Invoice"
          >
            <Edit className="w-4 h-4" />
          </Link>
          
          <button
            onClick={handleDelete}
            className="p-2 rounded-xl border border-rose-200 dark:border-rose-950/30 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-450 transition-colors"
            title="Delete Invoice"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Invoice Sheet Preview matching template exactly */}
      {themeKey !== 'default' ? (
        <div className="bg-white text-slate-900 border border-slate-200 rounded-2xl max-w-4xl mx-auto shadow-md relative overflow-hidden transition-colors min-h-[1050px] flex flex-col justify-between w-full" style={{ fontFamily: 'Inter, sans-serif' }}>
          <div>
            {/* Top Banner Header */}
            <div 
              className="px-8 py-5 flex justify-between items-center text-white relative overflow-hidden"
              style={{ 
                backgroundColor: themeKey === 'elite' ? '#ffffff' : activeTheme.primary,
                borderBottom: themeKey === 'elite' ? '1px solid #e2e8f0' : 'none',
                borderTop: themeKey === 'elite' ? '8px solid #2E41B4' : 'none'
              }}
            >
              {/* Logo block */}
              <div className="flex items-center gap-6 z-10">
                {logoUrlToRender && (
                  themeKey === 'elite' ? (
                    <img src={logoUrlToRender} alt="Logo" className="h-[60px] max-w-[160px] object-contain" />
                  ) : (
                    <img src={logoUrlToRender} alt="Logo" className="h-[50px] max-w-[120px] object-contain" />
                  )
                )}
                {themeKey === 'pmi' && (
                  <span className="font-bold text-sm">PMI Services PMIS</span>
                )}
              </div>

              {/* Title & Metadata */}
              <div className="text-right z-10">
                {themeKey === 'elite' ? (
                  <div className="flex flex-col items-end gap-1.5 text-slate-800">
                    <h1 className="font-bold text-2xl tracking-wide font-display text-[#102744] leading-none">TAX INVOICE</h1>
                    <p className="text-xs font-bold text-[#2E41B4]">Invoice No: {invoice.invoice_number}</p>
                    <p className="text-[10px] text-slate-400">Date: {formatDate(invoice.invoice_date)}</p>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase ${
                        invoice.status === 'paid' 
                          ? 'bg-emerald-50 text-emerald-600' 
                          : invoice.status === 'cancelled'
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}>
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                ) : themeKey === 'pmi' ? (
                  <>
                    <h1 className="font-bold text-sm tracking-wider">TAX INVOICE</h1>
                    <h2 className="font-extrabold text-lg">INV-{invoice.invoice_number}</h2>
                  </>
                ) : (
                  <>
                    <h1 className="font-bold text-base tracking-wider">TAX INVOICE</h1>
                    <p className="text-[10px] opacity-90">Invoice No: {invoice.invoice_number}</p>
                    <p className="text-[10px] opacity-90">Date: {formatDate(invoice.invoice_date)}</p>
                  </>
                )}
              </div>
            </div>

            {/* Content area */}
            <div className="p-8 sm:p-12">
              {themeKey === 'princeton' ? (
                // PRINCETON SIDE-BY-SIDE PREVIEW
                <div className="grid grid-cols-1 md:grid-cols-5 gap-8 text-xs leading-relaxed">
                  {/* Left Column (40% width) */}
                  <div className="md:col-span-2 space-y-5">
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{companyNameText}</p>
                      <p className="italic text-[10px] text-slate-400">Aesthetic Accounting & Consulting</p>
                    </div>
                    
                    <div className="space-y-1 text-slate-500">
                      <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400">BILL TO:</p>
                      <p className="font-bold text-slate-800">{invoice.customers?.name || 'Client Name'}</p>
                      {invoice.customers?.email && <p>{invoice.customers.email}</p>}
                      {invoice.customers?.phone && <p>Phone: {invoice.customers.phone}</p>}
                      {invoice.customers?.address && <p className="text-slate-400">{invoice.customers.address}</p>}
                    </div>

                    <div className="space-y-1 text-slate-500">
                      <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400">SHIP TO:</p>
                      <p className="font-bold text-slate-800">{invoice.customers?.name || 'Client Name'}</p>
                      {invoice.customers?.address && <p className="text-slate-400">{invoice.customers.address}</p>}
                    </div>
                  </div>

                  {/* Right Column (60% width) */}
                  <div className="md:col-span-3 space-y-4">
                    <h3 className="font-bold text-sm text-slate-800 tracking-wider">TAX INVOICE</h3>
                    
                    {/* Items table */}
                    <div className="border border-slate-100 rounded-lg overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="text-[10px] font-bold text-white" style={{ backgroundColor: activeTheme.dark }}>
                            <th className="p-2">Description</th>
                            <th className="p-2 text-right">Qty</th>
                            <th className="p-2 text-right">Unit Price</th>
                            <th className="p-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoice.invoice_items?.map((item, idx) => {
                            const isComp = parseFloat(item.unit_price) === 0;
                            return (
                              <tr key={item.id || idx} className="border-b border-slate-50 text-[10px]">
                                <td className="p-2 text-slate-800 font-medium">{item.program_name}</td>
                                <td className="p-2 text-right text-slate-650 font-mono">{item.quantity || 1}</td>
                                <td className="p-2 text-right text-slate-600 font-mono">
                                  {isComp ? '-' : formatCurrency(item.unit_price)}
                                </td>
                                <td className={`p-2 text-right font-mono font-bold ${isComp ? 'text-amber-600 italic' : 'text-slate-850'}`}>
                                  {isComp ? 'Free' : formatCurrency(item.total_amount)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Calculations */}
                    <div className="flex justify-end text-[10px]">
                      <div className="w-48 space-y-2 py-1">
                        <div className="flex justify-between text-slate-500">
                          <span>Sub-Total</span>
                          <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>GST (18%)</span>
                          <span className="font-mono">{formatCurrency(invoice.gst_amount)}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-100 font-bold text-slate-800">
                          <span>Total</span>
                          <span className="font-mono" style={{ color: activeTheme.primary }}>{formatCurrency(invoice.total_amount)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-emerald-600">
                          <span>Paid</span>
                          <span className="font-mono">{formatCurrency(invoice.paid_amount)}</span>
                        </div>
                        {netBalance > 0 && (
                          <div className="flex justify-between font-bold text-amber-600 pt-1 border-t border-dashed border-slate-100">
                            <span>Balance Due</span>
                            <span className="font-mono">{formatCurrency(netBalance)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // STANDARD STACKED LAYOUTS (Elite, Harvard, PMI)
                <div className="space-y-8">
                  {/* Address Grid */}
                  {themeKey === 'elite' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs leading-relaxed text-slate-800">
                      {/* Left: Customer Info */}
                      <div className="space-y-1">
                        <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400">BILL TO</p>
                        <p className="font-bold text-slate-800 text-sm">{invoice.customers?.name || 'Client Name'}</p>
                        {invoice.customers?.email && <p className="text-slate-500">{invoice.customers.email}</p>}
                        {invoice.customers?.phone && <p className="text-slate-500">Phone: {invoice.customers.phone}</p>}
                        {invoice.customers?.address && <p className="text-slate-400">{invoice.customers.address}</p>}
                      </div>

                      {/* Right: Company details */}
                      <div className="space-y-1 sm:text-right flex flex-col sm:items-end">
                        <div className="text-left space-y-1.5">
                          <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400">TAX INFORMATION</p>
                          {companyGst && <p className="text-slate-600"><span className="font-bold text-slate-800">GSTIN:</span> {companyGst}</p>}
                          {companyCin && <p className="text-slate-600"><span className="font-bold text-slate-800">CIN:</span> {companyCin}</p>}
                          <p className="text-slate-500"><span className="font-bold text-slate-800">Issued By:</span> {companyNameText}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs leading-relaxed">
                      {/* FROM */}
                      <div className="space-y-1 text-slate-500">
                        <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400">FROM</p>
                        <p className="font-bold text-slate-800 text-sm">{companyNameText}</p>
                        {companyPhone && <p>Phone: {companyPhone}</p>}
                        {companyEmail && <p>Email: {companyEmail}</p>}
                        {companyWebsite && <p>Web: {companyWebsite}</p>}
                        {companyGst && <p className="font-medium text-slate-700">GST: {companyGst}</p>}
                        {companyCin && <p>CIN: {companyCin}</p>}
                        {companyAddress && <p className="pt-1 text-slate-400">{companyAddress}</p>}
                      </div>

                      {/* BILL TO */}
                      <div className="space-y-1 text-slate-500">
                        <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400">BILL TO</p>
                        <p className="font-bold text-slate-800 text-sm">{invoice.customers?.name || 'Client Name'}</p>
                        {invoice.customers?.phone && <p>Phone: {invoice.customers.phone}</p>}
                        {invoice.customers?.email && <p>Email: {invoice.customers.email}</p>}
                        {invoice.customers?.gst_number && <p className="font-medium text-slate-700">GSTIN: {invoice.customers.gst_number}</p>}
                        {invoice.customers?.address && <p className="pt-1 text-slate-400">{invoice.customers.address}</p>}
                      </div>
                    </div>
                  )}

                  {/* Itemized Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border" style={{ borderColor: themeKey === 'elite' ? '#f1f5f9' : '#e2e8f0' }}>
                      <thead>
                        {themeKey === 'elite' ? (
                          <tr className="text-white text-xs font-semibold" style={{ backgroundColor: '#2E41B4' }}>
                            <th className="p-3 text-left w-[45%]">ITEM DESCRIPTION</th>
                            <th className="p-3 text-right w-[15%]">UNIT PRICE</th>
                            <th className="p-3 text-right w-[20%]">GST (18%)</th>
                            <th className="p-3 text-right w-[20%]">AMOUNT</th>
                          </tr>
                        ) : themeKey === 'harvard' ? (
                          <tr className="text-xs font-semibold border-b border-slate-100" style={{ backgroundColor: '#F2F2F2' }}>
                            <th className="p-3.5 pl-4 rounded-tl-xl" style={{ color: activeTheme.primary }}>Item Description</th>
                            <th className="p-3.5 text-right" style={{ color: activeTheme.primary }}>Quantity</th>
                            <th className="p-3.5 text-right" style={{ color: activeTheme.primary }}>Rate</th>
                            <th className="p-3.5 pr-4 text-right rounded-tr-xl" style={{ color: activeTheme.primary }}>Amount</th>
                          </tr>
                        ) : (
                          // PMI Theme
                          <tr className="text-xs font-semibold border-b border-slate-100" style={{ backgroundColor: '#F2F2F2', color: activeTheme.dark }}>
                            <th className="p-3.5 pl-4 rounded-tl-xl">Description</th>
                            <th className="p-3.5 text-right">Qty</th>
                            <th className="p-3.5 text-right">Unit Price</th>
                            <th className="p-3.5 text-right">Tax (GST 18%)</th>
                            <th className="p-3.5 pr-4 text-right rounded-tr-xl">Amount</th>
                          </tr>
                        )}
                      </thead>
                      <tbody>
                        {themeKey === 'elite' ? (
                          (invoice.invoice_items || []).map((item, idx) => {
                            const isComp = parseFloat(item.unit_price) === 0;
                            return (
                              <tr 
                                key={item.id || idx} 
                                className={`border-b border-slate-100 text-xs hover:bg-slate-50/30 font-bold text-slate-800 ${
                                  idx % 2 === 1 ? 'bg-slate-50/20' : ''
                                }`}
                              >
                                <td className="p-3 text-left">{item.program_name}</td>
                                <td className="p-3 text-right font-normal font-mono">{isComp ? '-' : formatNumber(item.unit_price)}</td>
                                <td className="p-3 text-right font-normal font-mono">{isComp ? '-' : formatNumber(item.gst_amount)}</td>
                                <td className="p-3 text-right font-mono">{isComp ? 'Free' : formatNumber(item.total_amount)}</td>
                              </tr>
                            );
                          })
                        ) : (
                          invoice.invoice_items?.map((item, idx) => {
                            const isComp = parseFloat(item.unit_price) === 0;
                            return (
                              <tr key={item.id || idx} className="border-b border-slate-100/60 text-xs hover:bg-slate-50/30">
                                {themeKey === 'harvard' ? (
                                  <>
                                    <td className="p-3.5 pl-4 font-medium text-slate-800">{item.program_name}</td>
                                    <td className="p-3.5 text-right text-slate-600 font-mono">{item.quantity || 1}</td>
                                    <td className="p-3.5 text-right text-slate-600 font-mono">
                                      {isComp ? '-' : formatCurrency(item.unit_price)}
                                    </td>
                                    <td className={`p-3.5 pr-4 text-right font-mono font-bold ${isComp ? 'text-emerald-600 italic' : 'text-slate-850'}`}>
                                      {isComp ? 'Free' : formatCurrency(item.total_amount)}
                                    </td>
                                  </>
                                ) : (
                                  // PMI Theme
                                  <>
                                    <td className="p-3.5 pl-4 font-medium text-slate-800">{item.program_name}</td>
                                    <td className="p-3.5 text-right text-slate-600 font-mono">{item.quantity || 1}</td>
                                    <td className="p-3.5 text-right text-slate-600 font-mono">
                                      {isComp ? '-' : formatCurrency(item.unit_price)}
                                    </td>
                                    <td className="p-3.5 text-right text-slate-600 font-mono">
                                      {isComp ? '-' : formatCurrency(item.gst_amount)}
                                    </td>
                                    <td className={`p-3.5 pr-4 text-right font-mono font-bold ${isComp ? 'text-primary-600 italic' : 'text-slate-800'}`}>
                                      {isComp ? 'Free' : formatCurrency(item.total_amount)}
                                    </td>
                                  </>
                                )}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Calculations grid */}
                  {themeKey === 'elite' ? (
                    <div className="flex justify-end mt-6 text-xs text-slate-800">
                      <div className="w-56 space-y-2 py-2">
                        <div className="flex justify-between text-slate-500 font-semibold">
                          <span>Subtotal</span>
                          <span className="font-mono">{formatNumber(invoice.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500 font-semibold">
                          <span>GST (18%)</span>
                          <span className="font-mono">{formatNumber(invoice.gst_amount)}</span>
                        </div>
                        
                        <div className="border-t border-slate-100 my-1" />
                        
                        <div className="flex justify-between font-bold text-[#102744] text-sm">
                          <span>Total Amount</span>
                          <span className="font-mono">INR {formatNumber(invoice.total_amount)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-emerald-600">
                          <span>Paid Amount</span>
                          <span className="font-mono">INR {formatNumber(invoice.paid_amount)}</span>
                        </div>
                        <div className={`flex justify-between font-bold ${netBalance > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                          <span>Balance Due</span>
                          <span className="font-mono">INR {formatNumber(netBalance)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end text-xs">
                      <div className="w-72 space-y-2.5 py-2">
                        <div className="flex justify-between text-slate-500">
                          <span>Sub-Total</span>
                          <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
                        </div>
                        <div className="flex justify-between text-slate-500">
                          <span>Tax (18%)</span>
                          <span className="font-mono">{formatCurrency(invoice.gst_amount)}</span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-100 text-sm font-bold" style={{ color: activeTheme.primary }}>
                          <span>Total</span>
                          <span className="font-mono">{formatCurrency(invoice.total_amount)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold text-emerald-600">
                          <span>Paid</span>
                          <span className="font-mono">{formatCurrency(invoice.paid_amount)}</span>
                        </div>
                        {netBalance > 0 && (
                          <div className="flex justify-between text-xs font-bold text-amber-600 pt-1 border-t border-dashed border-slate-100 mt-1">
                            <span>Balance Due</span>
                            <span className="font-mono">{formatCurrency(netBalance)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div 
            className="px-8 py-5 text-white text-xs relative mt-auto overflow-hidden"
            style={{ 
              backgroundColor: themeKey === 'elite' ? '#102744' : (themeKey === 'harvard' ? activeTheme.secondary : activeTheme.primary),
              textAlign: themeKey === 'elite' ? 'left' : 'center',
              borderTop: themeKey === 'elite' ? '3px solid #2E41B4' : 'none'
            }}
          >
            {/* Top accent border */}
            {themeKey !== 'elite' && (themeKey === 'harvard' || themeKey === 'pmi') && (
              <div 
                className="absolute left-0 right-0 top-0 h-1" 
                style={{ backgroundColor: themeKey === 'harvard' ? activeTheme.primary : activeTheme.secondary }} 
              />
            )}

            {/* Contact details */}
            {themeKey === 'elite' ? (
              <div className="flex justify-between items-start gap-4 z-10 relative w-full pt-1.5">
                {/* Left Column */}
                <div className="space-y-1">
                  <p className="font-bold text-xs">Phone: {companyPhone}</p>
                  <p className="font-bold text-xs underline">Email: {companyEmail}</p>
                  <p className="font-bold text-xs">Web: {companyWebsite || 'www.elitetoolistic.com'}</p>
                </div>
                {/* Right Column */}
                <div className="text-right max-w-sm mr-16">
                  <p className="font-bold text-[10px] uppercase text-slate-400 tracking-wider">ADDRESS</p>
                  <p className="text-[10px] text-slate-300 font-normal mt-0.5 leading-normal">{companyAddress}</p>
                </div>
                
                {/* Bottom-right diagonal blue accent stripe */}
                <div 
                  className="absolute right-0 bottom-0 w-20 h-20 pointer-events-none" 
                  style={{
                    background: 'linear-gradient(135deg, transparent 50%, #2E41B4 50%)',
                    marginRight: '-2rem',
                    marginBottom: '-1.25rem'
                  }}
                />
              </div>
            ) : themeKey === 'harvard' ? (
              <p className="opacity-90 text-[10px]">
                Address: {companyAddress}  |  Phone: {companyPhone}  |  Email: {companyEmail}
              </p>
            ) : themeKey === 'pmi' ? (
              <div className="space-y-1 opacity-90 text-[10px]">
                <p>Address: {companyAddress}</p>
                <p>Phone: {companyPhone}  |  Email: {companyEmail}  |  Web: {companyWebsite}</p>
              </div>
            ) : (
              <p className="opacity-90 text-[10px]">
                Address: {companyAddress}  |  Email: {companyEmail}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white text-slate-900 border border-slate-200 rounded-2xl p-6 sm:p-12 max-w-4xl mx-auto shadow-md relative overflow-hidden transition-colors min-h-[1050px] flex flex-col justify-between">
          <div>
            {/* Header Row */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pb-6 border-b border-slate-100">
              <div>
                <h1 className="font-display font-black text-4xl tracking-tight text-slate-900 mb-2.5">INVOICE</h1>
                <div className="space-y-1 text-xs text-slate-500">
                  <p><span className="font-semibold text-slate-700">Invoice Code:</span> {invoice.invoice_number}</p>
                  <p><span className="font-semibold text-slate-700">Issue Date:</span> {formatDate(invoice.invoice_date)}</p>
                  {invoice.status !== 'pending' && (
                    <div className="pt-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        invoice.status === 'paid' 
                          ? 'bg-emerald-50 text-emerald-650' 
                          : invoice.status === 'cancelled'
                          ? 'bg-rose-50 text-rose-600'
                          : 'bg-amber-50 text-amber-600'
                      }`}>
                        {invoice.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Logo frame */}
              <div className="min-w-[150px] h-[60px] flex items-center justify-center bg-white rounded-lg">
                {activeCompany?.logo_url ? (
                  <img 
                    src={activeCompany.logo_url} 
                    alt="Corporate Logo" 
                    className="max-h-full object-contain"
                  />
                ) : (
                  <div className="text-right">
                    <p className="font-bold text-sm tracking-tight text-primary-600 leading-none">{activeCompany?.company_name || 'I-SUCCESSNODE'}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Senders & Bill To side by side info columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 my-8 text-xs leading-relaxed">
              {/* Sender Column */}
              <div className="space-y-1 text-slate-500">
                <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400">FROM</p>
                <p className="font-bold text-slate-800 text-sm">{activeCompany?.company_name || 'I-SUCCESSNODE'}</p>
                {activeCompany?.phone && <p>Phone: {activeCompany.phone}</p>}
                {activeCompany?.email && <p>Email: {activeCompany.email}</p>}
                {activeCompany?.website && <p>Web: {activeCompany.website}</p>}
                {activeCompany?.gst_number && <p className="font-medium text-slate-700">GST: {activeCompany.gst_number}</p>}
                {activeCompany?.address && <p className="pt-1 text-slate-400">{activeCompany.address}</p>}
              </div>

              {/* BILL TO Column */}
              <div className="space-y-1 text-slate-500">
                <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400">BILL TO</p>
                <p className="font-bold text-slate-800 text-sm">{invoice.customers?.name || 'Client Name'}</p>
                {invoice.customers?.phone && <p>Phone: {invoice.customers.phone}</p>}
                {invoice.customers?.email && <p>Email: {invoice.customers.email}</p>}
                {invoice.customers?.gst_number && <p className="font-medium text-slate-700">GSTIN: {invoice.customers.gst_number}</p>}
                {invoice.customers?.address && <p className="pt-1 text-slate-400">{invoice.customers.address}</p>}
              </div>
            </div>

            {/* Itemized Table */}
            <div className="my-8 overflow-x-auto rounded-xl border border-slate-100 shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-primary-600 text-white text-xs font-semibold">
                    <th className="p-3.5 pl-4 font-bold rounded-tl-xl">Description</th>
                    <th className="p-3.5 font-bold text-right">Unit Price</th>
                    <th className="p-3.5 font-bold text-right">GST (18%)</th>
                    <th className="p-3.5 pr-4 font-bold text-right rounded-tr-xl">Amount (INR)</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.invoice_items?.map((item, index) => {
                    const isComp = parseFloat(item.unit_price) === 0;
                    return (
                      <tr key={item.id || index} className="border-b border-slate-100/60 text-xs hover:bg-slate-50/30">
                        <td className="p-3.5 pl-4 font-medium text-slate-800">
                          <span className="font-semibold">{item.program_name}</span>
                          {(() => {
                            let displayDesc = item.description || '';
                            try {
                              if (displayDesc.startsWith('{') && displayDesc.endsWith('}')) {
                                const json = JSON.parse(displayDesc);
                                displayDesc = json.text || '';
                              }
                            } catch (e) {}
                            return displayDesc ? <span className="block text-[10px] text-slate-400 font-normal mt-0.5">({displayDesc})</span> : null;
                          })()}
                        </td>
                        <td className="p-3.5 text-right text-slate-650 font-mono">
                          {isComp ? '-' : formatCurrency(item.unit_price)}
                        </td>
                        <td className="p-3.5 text-right text-slate-650 font-mono">
                          {isComp ? '-' : formatCurrency(item.gst_amount)}
                        </td>
                        <td className={`p-3.5 pr-4 text-right font-mono font-bold ${isComp ? 'text-primary-600 italic' : 'text-slate-800'}`}>
                          {isComp ? 'Complementary' : formatCurrency(item.total_amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Calculations right aligned grid */}
            <div className="flex justify-end my-6 text-xs">
              <div className="w-72 space-y-2.5 py-2">
                <div className="flex justify-between text-slate-500">
                  <span>Sub-Total</span>
                  <span className="font-mono">{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Tax (18%)</span>
                  <span className="font-mono">{formatCurrency(invoice.gst_amount)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-100 text-sm font-bold text-primary-600">
                  <span>Total</span>
                  <span className="font-mono">{formatCurrency(invoice.total_amount)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-emerald-600">
                  <span>Paid</span>
                  <span className="font-mono">{formatCurrency(invoice.paid_amount)}</span>
                </div>
                {netBalance > 0 && (
                  <div className="flex justify-between text-xs font-bold text-amber-600 pt-1 border-t border-dashed border-slate-100 mt-1">
                    <span>Balance Due</span>
                    <span className="font-mono">{formatCurrency(netBalance)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer layout */}
          <div className="mt-12 text-center text-slate-400 text-xs">
            <p className="mb-4 text-slate-600 font-semibold">Thank you for doing business with us!</p>
            
            <div className="flex justify-center items-end mt-8 border-t border-slate-100 pt-4">
              <p className="text-[10px]">
                All rights reserved by © {activeCompany?.company_name || 'I-SUCCESSNODE'} (OPC) Private Limited 2025
              </p>
            </div>

            {/* Minimalist Indigo Bottom accent bar */}
            <div className="absolute bottom-0 left-0 right-0">
              <div className="h-3.5 bg-primary-600 w-full" />
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 shadow-2xl rounded-2xl overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-150 dark:border-slate-800">
              <h3 className="font-display font-bold text-base text-slate-800 dark:text-white">
                Email Invoice to Customer
              </h3>
              <button 
                onClick={() => setEmailModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSendEmail} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                  Recipient Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. client@example.com"
                  value={toEmail}
                  onChange={(e) => setToEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                  Subject Line
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                  Message Body
                </label>
                <textarea
                  required
                  rows="6"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm leading-relaxed"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-150 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEmailModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingEmail}
                  className="flex items-center gap-2 px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-primary-500/10 active:scale-[0.98]"
                >
                  {sendingEmail ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Send Invoice</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default InvoiceDetails;
