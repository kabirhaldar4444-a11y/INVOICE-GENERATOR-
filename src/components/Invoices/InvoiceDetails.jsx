import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { generateInvoicePDF } from '../../utils/pdfGenerator';
import { eliteLayout } from '../../utils/eliteLayoutConfig';
import { harvardLayout } from '../../../shared/harvardInvoiceLayout.ts';
import { princetonLayout } from '../../utils/princetonLayoutConfig';
import { PMISFooter } from '../Shared/PMISFooter';
import { 
  ArrowLeft, 
  Download, 
  Mail, 
  Edit, 
  Trash2, 
  ReceiptText, 
  Building,
  Send,
  X,
  FileText
} from 'lucide-react';
import { generateCertificatePDF } from '../../utils/certificateGenerator';const isIsNodeName = (name) => {
  if (!name) return false;
  const n = name.toLowerCase();
  return n.includes('isuccessnode') || 
         n.includes('isucessnode') || 
         n.includes('successnode') || 
         n.includes('sucessnode') ||
         n.includes('i-successnode') || 
         n.includes('i-sucessnode');
};

const renderItemDescription = (item, isElite = false) => {
  let displayDesc = item.description || '';
  try {
    if (displayDesc.startsWith('{') && displayDesc.endsWith('}')) {
      const json = JSON.parse(displayDesc);
      displayDesc = json.text || '';
    }
  } catch (e) {}
  if (!displayDesc) return null;
  
  if (isElite) {
    return <span className="block text-[9px] text-slate-400 font-normal mt-0.5">({displayDesc})</span>;
  }
  return <span className="block text-[10px] text-slate-400 font-normal mt-0.5">({displayDesc})</span>;
};

export const InvoiceDetails = () => {
  const { invoices, customers, settings, deleteInvoice, showToast, confirm } = useApp();
  const navigate = useNavigate();
  const { id } = useParams();

  const [invoice, setInvoice] = useState(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  
  // Email state
  const [toEmail, setToEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Certificate state
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certStudentName, setCertStudentName] = useState('');
  const [certCourseName, setCertCourseName] = useState('CSLP');
  const [certDuration, setCertDuration] = useState('90 Days');
  const [certEnrollmentDate, setCertEnrollmentDate] = useState('');
  const [certValidityDate, setCertValidityDate] = useState('');
  const [certNo, setCertNo] = useState('');
  const [certStatus, setCertStatus] = useState('UNDER TRAINING');
  const [generatingCert, setGeneratingCert] = useState(false);

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

      const discountAmount = parseFloat(found.invoice_profile?.discount_amount) || 0;
      const preDiscountTotal = (parseFloat(found.subtotal) || 0) + (parseFloat(found.gst_amount) || 0);
      const displayPaidAmount = (discountAmount > 0 && Math.abs(found.paid_amount - preDiscountTotal) < 0.05)
        ? found.paid_amount - discountAmount
        : found.paid_amount;
      const netBalance = Math.max(0, preDiscountTotal - discountAmount - displayPaidAmount);

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
`  Total Amount : ${formatCurrency(preDiscountTotal - discountAmount)}\n` +
`  Paid Amount  : ${formatCurrency(displayPaidAmount)}\n` +
`  Balance Due  : ${formatCurrency(netBalance)}\n` +
`===============================================\n` +
`     Thank you for doing business with us!     \n` +
`===============================================`;

      setMessage(formattedMessage);
    }
  }, [id, invoices, settings, customers]);

  const generateDefaultCertNo = (studentName) => {
    const cleanName = (studentName || '').toUpperCase().replace(/[^A-Z]/g, '');
    const initials = cleanName.length >= 3 ? cleanName.substring(0, 3) : 'JLE';
    const prefix = Math.floor(100 + Math.random() * 900);
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${initials}${suffix}`;
  };

  const formatDateToDDMMYYYY = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const handleEnrollmentDateChange = (val) => {
    setCertEnrollmentDate(val);
    if (val) {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        d.setFullYear(d.getFullYear() + 10);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setCertValidityDate(`${yyyy}-${mm}-${dd}`);
      }
    }
  };

  const openCertificateModal = () => {
    const resolvedCust = (customers || []).find(c => c.id === invoice.customer_id) || invoice.customers || null;
    setCertStudentName(resolvedCust?.name || 'Student Name');
    
    const firstItem = invoice.invoice_items?.[0]?.program_name || 'CSLP';
    setCertCourseName(firstItem);
    setCertDuration('90 Days');
    
    let invDateStr = invoice.invoice_date || '';
    if (invDateStr) {
      const d = new Date(invDateStr);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        invDateStr = `${yyyy}-${mm}-${dd}`;
      }
    }
    if (!invDateStr) {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      invDateStr = `${yyyy}-${mm}-${dd}`;
    }
    setCertEnrollmentDate(invDateStr);

    const d = new Date(invDateStr);
    d.setFullYear(d.getFullYear() + 10);
    const valY = d.getFullYear();
    const valM = String(d.getMonth() + 1).padStart(2, '0');
    const valD = String(d.getDate()).padStart(2, '0');
    setCertValidityDate(`${valY}-${valM}-${valD}`);

    setCertNo(generateDefaultCertNo(resolvedCust?.name || 'Student'));
    setCertStatus('UNDER TRAINING');
    setCertModalOpen(true);
  };

  const handleGenerateCertificate = async (e) => {
    e.preventDefault();
    setGeneratingCert(true);
    try {
      const pdfBytes = await generateCertificatePDF({
        studentName: certStudentName,
        courseName: certCourseName,
        duration: certDuration,
        enrollmentDate: formatDateToDDMMYYYY(certEnrollmentDate),
        certificateNo: certNo,
        validityDate: formatDateToDDMMYYYY(certValidityDate),
        status: certStatus
      });

      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Certificate_${certStudentName.replace(/\s+/g, '_')}.pdf`;
      link.click();
      setCertModalOpen(false);
      showToast('Certificate PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error('Error generating certificate:', err);
      showToast('Failed to generate Certificate PDF.', 'error');
    } finally {
      setGeneratingCert(false);
    }
  };

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
      // Resolve customer with fallback so PDF always has the name
      const resolvedCust = (customers || []).find(c => c.id === invoice.customer_id) || invoice.customers || null;
      const pdfBytes = await generateInvoicePDF({ ...invoice, customers: resolvedCust }, settings);
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const cxName = resolvedCustomer?.name || invoice.customers?.name || 'Customer';
      const safeCxName = cxName.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '_');
      link.download = `${safeCxName}_GST.pdf`;
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

  // ── Customer resolution: always resolve from multiple sources so name never disappears
  // Priority: invoice.customers join → customers[] array lookup by customer_id → null
  const resolvedCustomer = (customers || []).find(c => c.id === invoice.customer_id) || invoice.customers || null;

  const discountAmount = parseFloat(invoice.invoice_profile?.discount_amount) || 0;
  const preDiscountTotal = (parseFloat(invoice.subtotal) || 0) + (parseFloat(invoice.gst_amount) || 0);
  const displayPaidAmount = (discountAmount > 0 && Math.abs(invoice.paid_amount - preDiscountTotal) < 0.05)
    ? invoice.paid_amount - discountAmount
    : invoice.paid_amount;
  const netBalance = Math.max(0, preDiscountTotal - discountAmount - displayPaidAmount);

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
    localLogoPath = '/logo-elite.png';
  } else if (companyName.includes('harvard') || companyName.includes('havard')) {
    themeKey = 'harvard';
    localLogoPath = '/logos/harvard.png';
  } else if (companyName.includes('pmi')) {
    themeKey = 'pmi';
    localLogoPath = '/logo-pmi.jpg';
  } else if (companyName.includes('princeton') || companyName.includes('princetion')) {
    themeKey = 'princeton';
    localLogoPath = '/logos/princeton.png';
  } else if (
    companyName.includes('isuccessnode') || 
    companyName.includes('i-successnode') || 
    companyName.includes('successnode') ||
    companyName.includes('isucessnode') || 
    companyName.includes('i-sucessnode') || 
    companyName.includes('sucessnode')
  ) {
    themeKey = 'isuccessnode';
    localLogoPath = '/logos/isuccessnode.png';
  }

  const eliteMarginX = 20;

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
      cin: 'U16229UP2024PTC199657',
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
      cin: 'U16229UP2024PTC199657',
      address: '1203, Mondeal Heights, Sarkhej Gandhinagar Service Road, Ahmedabad, Gujarat 380015',
      primary: '#996633',
      secondary: '#102744',
      dark: '#102744',
      bg: '#F8FAFC'
    },
    isuccessnode: {
      company_name: 'I-SUCCESSNODE',
      phone: '+91-7969537567',
      email: 'support@isuccessnode.com',
      website: 'www.isuccessnode.com',
      gst_number: '09AAHCI9258G1Z3',
      cin: '',
      address: '',
      primary: '#6b21a8',
      secondary: '#84cc16',
      dark: '#000050',
      bg: '#ffffff'
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
          {themeKey === 'isuccessnode' && (
            <button
              onClick={openCertificateModal}
              className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-purple-500/10 hover:shadow-purple-500/25 active:scale-[0.98] text-sm cursor-pointer"
              title="Generate Student Certificate"
            >
              <FileText className="w-4 h-4" /> Download PC
            </button>
          )}

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
        <div 
          className="bg-white text-slate-900 border border-slate-200 rounded-2xl mx-auto shadow-md relative overflow-hidden transition-colors flex flex-col justify-between" 
          style={{ 
            fontFamily: 'Inter, sans-serif',
            width: (themeKey === 'elite' || themeKey === 'pmi' || themeKey === 'harvard' || themeKey === 'princeton') ? '595.276px' : '100%',
            maxWidth: (themeKey === 'elite' || themeKey === 'pmi' || themeKey === 'harvard' || themeKey === 'princeton') ? '595.276px' : '56rem',
            minHeight: (themeKey === 'elite' || themeKey === 'pmi' || themeKey === 'harvard' || themeKey === 'princeton') ? '841.89px' : '1050px',
          }}
        >
          {themeKey === 'isuccessnode' ? (
            <>
              <div>
                {/* Header Row */}
                <div className="px-8 pt-8 pb-5 flex justify-between items-start">
                  <div>
                    <h1 className="text-5xl font-extrabold text-black tracking-tight mb-2">INVOICE</h1>
                    <p className="text-sm text-slate-500 font-medium">Invoice Number: {invoice.invoice_number}</p>
                    <p className="text-sm text-slate-500 font-medium mt-1">Invoice Date: {formatDate(invoice.invoice_date)}</p>
                  </div>
                  {/* Logo boxed frame */}
                  <div className="border border-black p-2 bg-white flex items-center justify-center min-w-[130px] min-h-[55px] max-w-[150px] shadow-sm">
                    {logoUrlToRender ? (
                      <img src={logoUrlToRender} alt="Logo" className="max-h-12 object-contain" />
                    ) : (
                      <span className="font-extrabold text-sm text-black">I-SUCCESSNODE</span>
                    )}
                  </div>
                </div>

                {/* Content Area */}
                <div className="px-8 py-6">
                  {/* Two Address Boxes */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm mb-8">
                    {/* Company Info Box */}
                    <div className="border border-black p-4 bg-white flex flex-col justify-between min-h-[110px]">
                      <div>
                        <p className="font-bold text-black text-base mb-2">{companyNameText}</p>
                        <div className="space-y-1 text-slate-500">
                          {companyPhone && <p>{companyPhone}</p>}
                          {companyWebsite && <p>{companyWebsite}</p>}
                          {companyCin && <p>CIN: {companyCin}</p>}
                          {companyEmail && <p>{companyEmail}</p>}
                        </div>
                      </div>
                    </div>
                    {/* Bill To Box */}
                    <div className="border border-black p-4 bg-white flex flex-col justify-between min-h-[110px]">
                      <div>
                        <p className="font-bold text-black text-base mb-2">BILL TO</p>
                        <div className="space-y-1 text-slate-500">
                          <p className="font-bold text-slate-800">{resolvedCustomer?.name || invoice.customers?.name || 'Client Name'}</p>
                          {(resolvedCustomer?.email || invoice.customers?.email) && <p>{resolvedCustomer?.email || invoice.customers?.email}</p>}
                          {/* GST above CIN */}
                          <p>GST: {resolvedCustomer?.gst_number || '09AAHCI9258G1Z3'}</p>
                          {(resolvedCustomer?.phone || invoice.customers?.phone) && (
                            <p>CIN: {resolvedCustomer?.phone || invoice.customers?.phone}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items Table with full black borders */}
                  <div className="overflow-x-auto border border-black rounded-none">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-black" style={{ backgroundColor: '#BCE0FD' }}>
                          <th className="p-3 text-left font-bold text-black text-sm border-r border-black w-[45%]">Program Name</th>
                          <th className="p-3 text-right font-bold text-black text-sm border-r border-black w-[18%]">Unit Price</th>
                          <th className="p-3 text-right font-bold text-black text-sm border-r border-black w-[15%]">GST (18%)</th>
                          <th className="p-3 text-right font-bold text-black text-sm w-[22%]">Amount (INR)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(invoice.invoice_items || []).map((item, idx) => {
                          const isComp = parseFloat(item.unit_price) === 0;
                          return (
                            <tr key={item.id || idx} className="text-sm font-semibold text-slate-800">
                              <td className="p-3 text-left border-r border-b border-black font-medium">
                                {item.program_name}
                                {renderItemDescription(item)}
                              </td>
                              <td className="p-3 text-right border-r border-b border-black font-mono font-normal">
                                {isComp ? '' : `₹${formatNumber(item.unit_price)}`}
                              </td>
                              <td className="p-3 text-right border-r border-b border-black font-mono font-normal">
                                {isComp ? '' : `₹${formatNumber(item.gst_amount)}`}
                              </td>
                              <td className="p-3 text-right border-b border-black font-mono font-bold">
                                {isComp ? '0.00' : `₹${formatNumber(item.total_amount)}`}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals Table right aligned */}
                  <div className="flex justify-end mt-8">
                    <div className="w-[260px] bg-white border border-black flex flex-col text-sm">
                      {/* Row Sub-Total */}
                      <div className="flex justify-between items-center border-b border-black">
                        <span className="p-2 font-medium text-slate-800 border-r border-black w-[110px]">Sub-Total</span>
                        <span className="p-2 text-right font-mono font-medium flex-grow">₹{formatNumber(invoice.subtotal)}</span>
                      </div>
                      {/* Row Tax */}
                      <div className="flex justify-between items-center border-b border-black">
                        <span className="p-2 font-medium text-slate-800 border-r border-black w-[110px]">Tax (18%)</span>
                        <span className="p-2 text-right font-mono font-medium flex-grow">₹{formatNumber(invoice.gst_amount)}</span>
                      </div>
                      {/* Row Total (Pre-Discount Total) */}
                      <div className="flex justify-between items-center border-b border-black">
                        <span className="p-2 font-bold text-slate-800 border-r border-black w-[110px]">Total</span>
                        <span className="p-2 text-right font-mono font-bold flex-grow">₹{formatNumber(preDiscountTotal)}</span>
                      </div>
                      {/* Row Discount (Only shown if discountAmount > 0) */}
                      {discountAmount > 0 && (
                        <div className="flex justify-between items-center border-b border-black text-rose-600">
                          <span className="p-2 font-medium border-r border-black w-[110px]">Discount</span>
                          <span className="p-2 text-right font-mono font-medium flex-grow">
                            -₹{formatNumber(discountAmount)}
                          </span>
                        </div>
                      )}
                      {/* Row Paid */}
                      <div className={`flex justify-between items-center ${netBalance > 0 ? 'border-b border-black' : ''}`}>
                        <span className="p-2 font-bold text-slate-800 border-r border-black w-[110px]">Paid</span>
                        <span className="p-2 text-right font-mono font-bold flex-grow">₹{formatNumber(displayPaidAmount)}</span>
                      </div>
                      {/* Row Balance Due */}
                      {netBalance > 0 && (
                        <div className="flex justify-between items-center text-amber-650 font-bold bg-amber-50/10">
                          <span className="p-2 border-r border-black w-[110px]">Balance Due</span>
                          <span className="p-2 text-right font-mono flex-grow">₹{formatNumber(netBalance)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Footer Stripes */}
              <div className="mt-auto relative w-full pt-10">
                <p className="text-center text-slate-500 font-medium text-sm mb-6">
                  Thank you for doing business with us!
                </p>
                <div className="px-8 pb-5 flex justify-between items-end">
                  <p className="text-xs text-slate-400">
                    All rights reserved by © I-SUCCESSNODE (OPC) Private Limited 2025
                  </p>
                </div>
                <div className="w-full flex flex-col">
                  <div className="h-[6px] w-full bg-[#84cc16]" />
                  <div className="h-[8px] w-full bg-[#6b21a8]" />
                </div>
              </div>
            </>
          ) : themeKey === 'pmi' ? (
            <>
              {/* Purple top strip */}
              <div className="absolute top-0 left-0 w-full h-[18px] bg-[#4A15B7] z-10" style={{ clipPath: 'polygon(0 0, 48% 0, 43% 100%, 0 100%)' }} />

              {/* Logo & Shield */}
              <div className="absolute left-[45px] top-[24px] flex flex-col items-center">
                {logoUrlToRender && (
                  <img src={logoUrlToRender} alt="Logo" className="w-[130px] h-[130px] object-contain" />
                )}
              </div>

              {/* Purple polygon behind "INVOICE" */}
              <div className="absolute right-0 top-0 h-[75px] bg-[#4A15B7] flex items-center justify-end pr-10 z-10"
                   style={{
                     width: '280px',
                     clipPath: 'polygon(25% 0, 100% 0, 100% 100%, 0 100%)'
                   }}>
                <span className="font-black text-white text-[32px] tracking-wide">INVOICE</span>
              </div>

              {/* Orange invoice ribbon */}
              <div className="absolute right-0 top-[78px] h-[30px] bg-[#F19D12] flex items-center justify-center z-10"
                   style={{
                     width: '256px',
                     clipPath: 'polygon(14% 0, 100% 0, 100% 100%, 0 100%)'
                   }}>
                <span className="font-black text-white text-[14px] uppercase tracking-wide pr-6">{invoice.invoice_number}</span>
              </div>

              {/* Green diagonal ribbon */}
              <div className="absolute right-0 top-[108px] w-[85px] h-[95px] bg-[#1E8457] z-10"
                   style={{
                     clipPath: 'polygon(100% 0, 100% 100%, 0 0)'
                   }}
              />

              {/* Content area */}
              <div className="flex-grow flex flex-col justify-between" style={{ paddingTop: '145px', paddingLeft: '45px', paddingRight: '45px', paddingBottom: '90px' }}>
                <div>
                  {/* BILL TO */}
                  <div className="mt-5 text-[10px] text-black leading-normal text-left">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-black text-[10px] tracking-wide text-black">BILL TO:</span>
                      <div className="flex flex-col items-start text-black font-bold text-[9.5px]">
                        <span>CIN: {resolvedCustomer?.phone || companyCin || 'U16229UP2024PTC199657'}</span>
                        <span className="mt-0.5">GST: {companyGst || '09TRFPS5497N1Z6'}</span>
                        <span className="mt-0.5">Date: {formatDate(invoice.invoice_date)}</span>
                      </div>
                    </div>
                    <p className="text-black"><span className="font-bold">Customer Name: </span>{resolvedCustomer?.name || 'Client Name'}</p>
                    {resolvedCustomer?.email && (
                      <p className="text-black"><span className="font-bold">Customer Email: </span>{resolvedCustomer.email}</p>
                    )}
                  </div>

                  {/* ITEMS TABLE */}
                  <div className="mt-6">
                    <table className="w-full border-collapse border border-black text-[10px] text-left" style={{ tableLayout: 'fixed' }}>
                      <thead>
                        <tr className="bg-[#4A15B7] text-white text-[10px] font-bold" style={{ height: '32px' }}>
                          <th className="border border-black text-center" style={{ width: '50px' }}>ITEM</th>
                          <th className="border border-black text-center" style={{ width: '255px' }}>DESCRIPTION</th>
                          <th className="border border-black text-center" style={{ width: '65px' }}>GST (18%)</th>
                          <th className="border border-black text-center" style={{ width: '65px' }}>AMOUNT</th>
                          <th className="border border-black text-center" style={{ width: '70px' }}>TOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const items = invoice.invoice_items || [];
                          const pmiFmt = (num, isSubTotal = false) => {
                            const val = parseFloat(num) || 0;
                            if (isSubTotal) {
                              const str = val.toFixed(2);
                              if (str.endsWith('.00')) return val.toLocaleString('en-IN', { minimumFractionDigits: 2 });
                              return val.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
                            }
                            return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
                          };
                          return items.map((item, rIdx) => {
                            const isAlt = rIdx % 2 === 1;
                            const isComp = item ? parseFloat(item.unit_price) === 0 : false;
                            const getItemDisplayName = (itm) => {
                              if (itm.course_type === 'Course' && itm.course_details) {
                                const d = itm.course_details;
                                if (d.course_name && d.mode && d.admission_type) {
                                  return `${d.course_name} (${d.mode} - ${d.admission_type})`;
                                }
                              }
                              return itm.program_name || '';
                            };
                            return (
                              <tr key={rIdx} className="font-bold text-black border-b border-black" style={{ backgroundColor: isAlt ? '#F2F4F7' : '#FFFFFF', minHeight: '30px' }}>
                                <td className="border border-black p-2 text-center">{String(rIdx + 1).padStart(2, '0')}</td>
                                <td className="border border-black p-2 text-left leading-tight break-words">{getItemDisplayName(item)}</td>
                                <td className="border border-black p-2 text-center">{isComp ? '₹0.00' : `₹${pmiFmt(item.gst_amount)}`}</td>
                                <td className="border border-black p-2 text-center">{isComp ? '₹0.00' : `₹${pmiFmt(item.unit_price)}`}</td>
                                <td className="border border-black p-2 text-center">{isComp ? '₹0.00' : `₹${pmiFmt(item.total_amount)}`}</td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* SUMMARY BOX */}
                  {(() => {
                    const discountAmount = parseFloat(invoice.invoice_profile?.discount_amount) || 0;
                    const preDiscTotal   = (parseFloat(invoice.subtotal) || 0) + (parseFloat(invoice.gst_amount) || 0);
                    const paidAmt        = (discountAmount > 0 && Math.abs((invoice.paid_amount || 0) - preDiscTotal) < 0.05)
                      ? (invoice.paid_amount || 0) - discountAmount
                      : (invoice.paid_amount || 0);
                    const dueAmt         = Math.max(0, preDiscTotal - discountAmount - paidAmt);
                    const pmiFmt = (num, isSubTotal = false) => {
                      const val = parseFloat(num) || 0;
                      if (isSubTotal) {
                        const str = val.toFixed(2);
                        if (str.endsWith('.00')) return val.toLocaleString('en-IN', { minimumFractionDigits: 2 });
                        return val.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
                      }
                      return new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
                    };
                    return (
                      <div className="flex justify-end mt-4 text-[9.5px] text-left">
                        <div className="flex flex-col gap-2.5 w-[190px]">
                          {/* Upper Box */}
                          <div className="border border-black p-2 space-y-1.5 bg-white text-black font-bold">
                            <div className="flex justify-between">
                              <span>SUB TOTAL :</span>
                              <span className="font-bold">₹{pmiFmt(invoice.subtotal, true)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>TOTAL GST :</span>
                              <span className="font-bold">₹{pmiFmt(invoice.gst_amount)}</span>
                            </div>
                          </div>
                          {/* Lower Box */}
                          <div className="bg-[#1E8457] text-white p-2 space-y-1.5 font-bold">
                            <div className="flex justify-between">
                              <span>TOTAL :</span>
                              <span>₹{pmiFmt(preDiscTotal)}</span>
                            </div>
                            {discountAmount > 0 && (
                              <div className="flex justify-between">
                                <span>DISCOUNT :</span>
                                <span>-₹{pmiFmt(discountAmount)}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span>PAID :</span>
                              <span>₹{pmiFmt(paidAmt)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>DUE:</span>
                              <span>₹{pmiFmt(dueAmt)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Footer */}
              <PMISFooter />
            </>
          ) : themeKey === 'harvard' ? (
            <>
              {/* Top Header Section */}
              <div 
                className="absolute top-0 left-0 w-full overflow-hidden bg-white" 
                style={{ height: '147px' }}
              >
                {/* SVG for slanted ribbons and decorations */}
                <svg className="absolute top-0 right-0 pointer-events-none" width={harvardLayout.width} height="147" style={{ zIndex: 1 }}>
                  {/* Burgundy Ribbon */}
                  <polygon 
                    points={harvardLayout.header.ribbon.points.map(p => `${p.x},${harvardLayout.height - p.y}`).join(' ')} 
                    fill={harvardLayout.colors.burgundy} 
                  />
                  {/* Blue Strip */}
                  <polygon 
                    points={harvardLayout.header.strip.points.map(p => `${p.x},${harvardLayout.height - p.y}`).join(' ')} 
                    fill={harvardLayout.colors.navy} 
                  />
                  {/* Top-Right Decorations */}
                  {harvardLayout.header.decorations.map(dec => (
                    <polygon 
                      key={dec.id}
                      points={dec.points.map(p => `${p.x},${harvardLayout.height - p.y}`).join(' ')} 
                      fill={harvardLayout.colors[dec.colorKey]} 
                    />
                  ))}
                </svg>

                {/* Left Logo */}
                <div 
                  className="absolute" 
                  style={{ 
                    left: `${harvardLayout.logo.x}px`, 
                    top: `${harvardLayout.height - harvardLayout.logo.y - harvardLayout.logo.height}px`,
                    width: `${harvardLayout.logo.width}px`, 
                    height: `${harvardLayout.logo.height}px`,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  {logoUrlToRender && (
                    <img 
                      src={logoUrlToRender} 
                      alt="Harvard Learning" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '100%', 
                        objectFit: 'contain' 
                      }} 
                    />
                  )}
                </div>

                {/* INVOICE Title Text */}
                <div 
                  className="absolute font-serif font-extrabold text-white flex items-center"
                  style={{ 
                    left: `${harvardLayout.header.ribbon.textX}px`, 
                    top: `${harvardLayout.height - 792}px`,
                    height: `${792 - 742}px`,
                    fontSize: `${harvardLayout.header.ribbon.textSize}px`,
                    letterSpacing: '0.05em',
                    fontFamily: 'Georgia, serif',
                    zIndex: 2
                  }}
                >
                  {harvardLayout.header.ribbon.text}
                </div>

                {/* Invoice Number Strip Text */}
                <div 
                  className="absolute font-sans font-bold text-white flex items-center justify-center text-center"
                  style={{ 
                    left: `${harvardLayout.header.strip.textX}px`,
                    width: '215px',
                    top: `${harvardLayout.height - 737}px`,
                    height: `${737 - 705}px`,
                    fontSize: `${harvardLayout.header.strip.textSize}px`,
                    zIndex: 2
                  }}
                >
                  {invoice.invoice_number}
                </div>
              </div>

              {/* Customer Details Section */}
              <div 
                className="absolute text-left"
                style={{ 
                  left: `${harvardLayout.customer.leftX}px`, 
                  top: `${harvardLayout.height - harvardLayout.customer.topY}px`,
                  width: `${harvardLayout.width - harvardLayout.customer.leftX * 2}px`,
                  fontSize: `${harvardLayout.customer.fontSize}px`,
                  color: harvardLayout.colors.textDark,
                  fontFamily: 'sans-serif'
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-1" style={{ width: '300px' }}>
                    <p className="font-extrabold" style={{ color: harvardLayout.colors.navy, fontSize: '11px', letterSpacing: '0.5px' }}>BILL TO:</p>
                    <p className="text-black font-semibold mt-1">
                      <span className="font-extrabold">Customer Name: </span>{resolvedCustomer?.name || 'Client Name'}
                    </p>
                    {resolvedCustomer?.email && (
                      <p className="text-black font-semibold">
                        <span className="font-extrabold">Customer Email: </span>{resolvedCustomer.email}
                      </p>
                    )}
                  </div>
                  <div className="text-left" style={{ width: '200px' }}>
                    <p className="text-black font-semibold">
                      <span className="font-extrabold">GST: </span>{resolvedCustomer?.gst_number || '09AAOCP5868J1ZI'}
                    </p>
                    {resolvedCustomer?.phone && themeKey !== 'elite' && (
                      <p className="text-black font-semibold mt-1">
                        <span className="font-extrabold">CIN: </span>{resolvedCustomer.phone}
                      </p>
                    )}
                    <p className="text-black font-semibold mt-1">
                      <span className="font-extrabold">Date: </span>{formatDate(invoice.invoice_date)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Table Section */}
              <div 
                className="absolute"
                style={{ 
                  left: `${harvardLayout.marginX}px`, 
                  top: `${harvardLayout.height - harvardLayout.table.topY}px`,
                  width: `${harvardLayout.width - harvardLayout.marginX * 2}px`
                }}
              >
                {(() => {
                  const items = invoice.invoice_items || [];
                  const hasGst = parseFloat(invoice.gst_amount) > 0 || items.some(item => (parseFloat(item.gst_amount) || 0) > 0);

                  const tHeaders = hasGst 
                    ? ['ITEM', 'Unit Price', 'GST (18%)', 'AMMOUNT'] 
                    : ['ITEM', 'Unit Price', 'AMMOUNT'];
                  
                  const tColWidths = hasGst 
                    ? [180, 105, 105, 115] 
                    : [275, 115, 115];

                  const tHeaderColors = hasGst 
                    ? ['burgundy', 'navy', 'navy', 'navy'] 
                    : ['burgundy', 'navy', 'navy'];

                  return (
                    <table className="w-full border-collapse border border-black text-center" style={{ tableLayout: 'fixed', borderColor: harvardLayout.colors.black }}>
                      <thead>
                        <tr style={{ height: `${harvardLayout.table.headerHeight}px` }}>
                          {tHeaders.map((header, idx) => {
                            const bgKey = tHeaderColors[idx];
                            const bgVal = harvardLayout.colors[bgKey];
                            const widthVal = tColWidths[idx];
                            return (
                              <th 
                                key={header}
                                className="border border-black text-white font-extrabold text-center uppercase" 
                                style={{ 
                                  width: `${widthVal}px`, 
                                  backgroundColor: bgVal, 
                                  borderColor: harvardLayout.colors.black,
                                  fontSize: `${harvardLayout.table.fontSize}px`,
                                  verticalAlign: 'middle'
                                }}
                              >
                                {header}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((item, i) => {
                          const unitPrice = parseFloat(item.unit_price) || 0;
                          const gstAmount = parseFloat(item.gst_amount) || 0;
                          const totalAmount = parseFloat(item.total_amount) || 0;
                          const isComp = unitPrice === 0;

                          const formatVal = (val, forceZero = false) => {
                            if (forceZero && val === 0) return '₹0.00';
                            if (val === 0) return '-';
                            return '₹' + new Intl.NumberFormat('en-IN', {
                              minimumFractionDigits: val % 1 === 0 ? 0 : 2,
                              maximumFractionDigits: 2
                            }).format(val);
                          };

                          return (
                            <tr key={item.id || i} style={{ height: `${harvardLayout.table.rowHeight}px` }}>
                              <td className="border border-black font-extrabold text-black text-center" style={{ fontSize: `${harvardLayout.table.fontSize}px`, borderColor: harvardLayout.colors.black, verticalAlign: 'middle' }}>
                                {item.program_name}
                              </td>
                              <td className="border border-black font-extrabold text-black text-center font-mono" style={{ fontSize: `${harvardLayout.table.fontSize}px`, borderColor: harvardLayout.colors.black, verticalAlign: 'middle' }}>
                                {formatVal(unitPrice)}
                              </td>
                              {hasGst && (
                                <td className="border border-black font-extrabold text-black text-center font-mono" style={{ fontSize: `${harvardLayout.table.fontSize}px`, borderColor: harvardLayout.colors.black, verticalAlign: 'middle' }}>
                                  {formatVal(gstAmount)}
                                </td>
                              )}
                              <td className="border border-black font-extrabold text-black text-center font-mono" style={{ fontSize: `${harvardLayout.table.fontSize}px`, borderColor: harvardLayout.colors.black, verticalAlign: 'middle' }}>
                                {isComp ? '₹0.00' : formatVal(totalAmount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  );
                })()}
              </div>

              {/* Summary Box Section */}
              <div 
                className="absolute text-white"
                style={{ 
                  right: `${harvardLayout.marginX}px`, 
                  top: `${harvardLayout.height - harvardLayout.summary.bottomY - (harvardLayout.summary.topSection.height + harvardLayout.summary.bottomSection.height)}px`,
                  width: `${harvardLayout.summary.width}px`,
                  fontFamily: 'sans-serif',
                  fontSize: `${harvardLayout.summary.fontSize}px`,
                  fontWeight: 'bold'
                }}
              >
                {/* Burgundy Top Section */}
                <div 
                  className="flex flex-col justify-center px-4"
                  style={{ 
                    height: `${harvardLayout.summary.topSection.height}px`,
                    backgroundColor: harvardLayout.colors.burgundy,
                    gap: '4px'
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span>SUB TOTAL :</span>
                    <span className="font-mono">₹{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(invoice.subtotal || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>TOTAL GST :</span>
                    <span className="font-mono">₹{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(invoice.gst_amount || 0)}</span>
                  </div>
                </div>

                {/* Navy Bottom Section */}
                <div 
                  className="flex flex-col justify-center px-4"
                  style={{ 
                    height: `${harvardLayout.summary.bottomSection.height}px`,
                    backgroundColor: harvardLayout.colors.navy,
                    gap: '4px'
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span>TOTAL :</span>
                    <span className="font-mono">₹{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(preDiscountTotal || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>DISCOUNT:</span>
                    <span className="font-mono">{discountAmount > 0 ? '-' : ''}₹{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(discountAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>PAID :</span>
                    <span className="font-mono">₹{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(displayPaidAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>DUE:</span>
                    <span className="font-mono">₹{new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(netBalance || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Footer Section */}
              <div 
                className="absolute bottom-0 left-0 w-full overflow-hidden text-white text-left font-sans"
                style={{ 
                  height: `${harvardLayout.footer.height}px`,
                  backgroundColor: harvardLayout.colors.navy
                }}
              >
                {/* SVG for slanted decorations */}
                <svg className="absolute bottom-0 right-0 pointer-events-none" width={harvardLayout.width} height={harvardLayout.footer.height} style={{ zIndex: 1 }}>
                  {/* Top gold border line */}
                  <line 
                    x1={harvardLayout.footer.topBorder.x1} 
                    y1={harvardLayout.footer.height - harvardLayout.footer.topBorder.y1 + 1} 
                    x2={harvardLayout.footer.topBorder.x2} 
                    y2={harvardLayout.footer.height - harvardLayout.footer.topBorder.y2 + 1} 
                    stroke={harvardLayout.colors.gold} 
                    strokeWidth={harvardLayout.footer.topBorder.thickness} 
                  />
                  {/* Diagonal shapes */}
                  {harvardLayout.footer.decorations.map(dec => (
                    <polygon 
                      key={dec.id}
                      points={dec.points.map(p => `${p.x},${harvardLayout.footer.height - p.y}`).join(' ')} 
                      fill={harvardLayout.colors[dec.colorKey]} 
                    />
                  ))}
                </svg>

                {/* Left Contact details */}
                <div 
                  className="absolute z-10 space-y-1 font-semibold"
                  style={{ 
                    left: `${harvardLayout.footer.textX}px`,
                    bottom: '10px',
                    fontSize: `${harvardLayout.footer.fontSize}px`,
                    lineHeight: '1.4'
                  }}
                >
                  <p>{harvardLayout.footer.phone}</p>
                  <p>
                    <a href={`mailto:${harvardLayout.footer.email}`} className="hover:underline">{harvardLayout.footer.email}</a>
                  </p>
                  <p>{harvardLayout.footer.address}</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                {/* ── ELITE TOOLISTIC TOP BANNER — matches reference exactly ── */}
                {themeKey === 'elite' ? (
                  <div className="relative overflow-hidden bg-white" style={{ borderTop: `${eliteLayout.footer.blueStripHeight}px solid ${eliteLayout.colors.primary}` }}>
                    {/* Corner triangles — top right */}
                    <svg className="absolute top-0 right-0 pointer-events-none z-10" width="110" height="110" viewBox="0 0 110 110">
                      <polygon points="110,0 0,0 110,110" fill={eliteLayout.colors.dark} />
                      <polygon points="110,0 46,0 110,64" fill={eliteLayout.colors.primary} />
                      <polygon points="110,68 72,68 110,110" fill={eliteLayout.colors.lightBlue} />
                    </svg>

                    {/* Main header content */}
                    <div className="flex items-center gap-0" style={{ height: `${eliteLayout.header.height}px`, paddingLeft: `${eliteMarginX}px`, paddingRight: `${eliteMarginX}px` }}>
                      {/* LEFT: Logo */}
                      <div className="flex-shrink-0 z-10" style={{ width: `${eliteLayout.header.logoWidth}px` }}>
                        {logoUrlToRender ? (
                          <img src={logoUrlToRender} alt="ELITETOOLISTIC" className="object-contain"
                            style={{ 
                              width: `${eliteLayout.header.logoWidth - 5}px`, 
                              height: `${eliteLayout.header.logoHeight - 10}px`, 
                              objectFit: 'contain', 
                              objectPosition: 'left center' 
                            }} 
                          />
                        ) : (
                          <div>
                            <p className="font-extrabold text-sm leading-tight" style={{ color: eliteLayout.colors.dark }}>ELITETOOLISTIC</p>
                            <p className="text-[9px] italic" style={{ color: eliteLayout.colors.primary }}>— Where skills meet innovation —</p>
                          </div>
                        )}
                      </div>

                      {/* CENTER: Vertical divider */}
                      <div className="flex-shrink-0 mx-4 self-stretch" style={{ width: '1px', background: eliteLayout.colors.border }} />

                      {/* RIGHT: INVOICE + badge — right-aligned */}
                      <div className="flex-1 flex flex-col items-end justify-center z-10" style={{ paddingRight: '115px' }}>
                        <h1 className="font-extrabold leading-none" style={{ fontSize: `${eliteLayout.header.invoiceTitleSize}px`, color: eliteLayout.colors.dark, letterSpacing: '-0.5px' }}>INVOICE</h1>
                        <div className="mt-2 px-5 py-1.5 rounded" style={{ backgroundColor: eliteLayout.colors.primary, display: 'inline-block' }}>
                          <span className="font-bold text-white" style={{ fontSize: `${eliteLayout.header.badgeTextSize}px`, letterSpacing: '0.3px' }}>{invoice.invoice_number}</span>
                        </div>
                      </div>
                    </div>

                    {/* Separator line */}
                    <div style={{ height: '1px', backgroundColor: eliteLayout.colors.border, marginLeft: `${eliteMarginX}px`, marginRight: `${eliteMarginX}px` }} />

                    {/* BILL TO (left) + GST/CIN (right) */}
                    <div className="py-4 flex justify-between items-start text-xs" style={{ paddingLeft: `${eliteMarginX}px`, paddingRight: `${eliteMarginX}px` }}>
                      <div className="space-y-1">
                        <p className="font-extrabold text-[11px] uppercase tracking-wide" style={{ color: eliteLayout.colors.dark }}>BILL TO:</p>
                        <p className="" style={{ color: eliteLayout.colors.dark }}>{resolvedCustomer?.name || 'Client Name'}</p>
                        {resolvedCustomer?.email && <p style={{ color: eliteLayout.colors.dark }}>{resolvedCustomer.email}</p>}
                        <p style={{ color: eliteLayout.colors.dark }}><span className="font-bold">Date: </span>{formatDate(invoice.invoice_date)}</p>
                      </div>
                      <div className="space-y-1 text-left">
                        {companyGst && <p style={{ color: eliteLayout.colors.dark }}><span className="font-bold">GST: </span>{companyGst}</p>}
                        {companyCin && <p style={{ color: eliteLayout.colors.dark }}><span className="font-bold">CIN: </span>{companyCin}</p>}
                      </div>
                    </div>
                  </div>
                ) : themeKey === 'princeton' ? (
                  <div
                    className="relative overflow-hidden"
                    style={{
                      height: `${princetonLayout.header.height}px`,
                      width: '100%',
                      backgroundImage: "url('/princeton-header-bg.png')",
                      backgroundSize: '100% 100%',
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'center'
                    }}
                  />
                ) : (
                <div 
                  className="px-8 py-5 flex justify-between items-center text-white relative overflow-hidden"
                  style={{ 
                    backgroundColor: activeTheme.primary,
                    borderBottom: 'none'
                  }}
                >
                  {/* Logo block */}
                  <div className="flex items-center gap-6 z-10">
                    {logoUrlToRender && (
                      <img src={logoUrlToRender} alt="Logo" className="h-[50px] max-w-[120px] object-contain" />
                    )}
                    {themeKey === 'pmi' && (
                      <span className="font-bold text-sm">PMI Services PMIS</span>
                    )}
                  </div>
                  {/* Title & Metadata */}
                  <div className="text-right z-10">
                    {themeKey === 'pmi' ? (
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
                )}

            {/* Content area */}
            <div className={themeKey === 'princeton' ? 'relative pb-10 min-h-[680px]' : 'p-8 sm:p-12'}>
              {themeKey === 'princeton' ? (
                // ── PRINCETON PROFESSIONALS — PIXEL-PERFECT PREVIEW ──
                (() => {
                  const pFmt = (num) => `₹${formatNumber(num)}`;
                  const pDisc = parseFloat(invoice.invoice_profile?.discount_amount) || 0;
                  const pPreDiscTotal = (parseFloat(invoice.subtotal) || 0) + (parseFloat(invoice.gst_amount) || 0);
                  const pPaid = (pDisc > 0 && Math.abs(invoice.paid_amount - pPreDiscTotal) < 0.05)
                    ? invoice.paid_amount - pDisc
                    : (invoice.paid_amount || 0);
                  const pDue = Math.max(0, pPreDiscTotal - pDisc - pPaid);
                  const pl = princetonLayout;
                  const tableW = pl.page.width - pl.marginX * 2; // 505.276px
                  const [cw0, cw1, cw2, cw3] = pl.table.colWidths; // ITEM | Unit Price | GST (18%) | AMMOUNT
                  return (
                    <div style={{ fontFamily: 'Inter, sans-serif' }}>
                      {/* Left vertical border strip — full content height */}
                      <div 
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: '30px',
                          backgroundImage: "url('/princeton-side-bg.png')",
                          backgroundSize: '100% 100%',
                          backgroundRepeat: 'no-repeat',
                          pointerEvents: 'none',
                          zIndex: 5
                        }}
                      />
                      
                      {/* Right vertical border strip (mirrored) */}
                      <div 
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: 0,
                          bottom: 0,
                          width: '30px',
                          backgroundImage: "url('/princeton-side-bg.png')",
                          backgroundSize: '100% 100%',
                          backgroundRepeat: 'no-repeat',
                          transform: 'scaleX(-1)',
                          pointerEvents: 'none',
                          zIndex: 5
                        }}
                      />


                      {/* ── Details row (BILL TO left, Invoice details right) ── */}
                      <div
                        className="flex justify-between items-start"
                        style={{
                          backgroundColor: '#FFFFFF',
                          color: '#102744',
                          paddingLeft: `${pl.marginX}px`,
                          paddingRight: `${pl.marginX}px`,
                          paddingTop: '25px',
                          paddingBottom: '20px',
                          fontSize: `${pl.subheader.fontSize}px`,
                        }}
                      >
                        {/* Left: BILL TO info */}
                        <div className="space-y-1 text-[10px]" style={{ color: '#102744' }}>
                          <p className="font-extrabold text-[#102744] tracking-wider text-[10.5px] mb-2 uppercase">BILL TO:</p>
                          <p><span className="font-bold">Customer Name:</span> {resolvedCustomer?.name || 'Client Name'}</p>
                          <p><span className="font-bold">Customer Email:</span> {resolvedCustomer?.email || 'Client Email'}</p>
                          <p><span className="font-bold">Date:</span> {formatDate(invoice.invoice_date)}</p>
                        </div>

                        {/* Right: Invoice details (positioned on the right, but text is left-aligned) */}
                        <div className="space-y-1 text-[10px] w-[180px]" style={{ color: '#102744' }}>
                          <p><span className="font-bold">Invoice No:</span> {invoice.invoice_number}</p>
                          <p><span className="font-bold">GST:</span> {companyGst || '09AAOCP5868J1ZI'}</p>
                          <p><span className="font-bold">CIN:</span> {companyCin || 'U16229UP2024PTC199657'}</p>
                        </div>
                      </div>

                      {/* ── Items Table ── */}
                      <div style={{ paddingLeft: `${pl.marginX}px`, paddingRight: `${pl.marginX}px`, paddingTop: '5px' }}>
                        <table
                          className="border-collapse"
                          style={{
                            width: `${tableW}px`,
                            tableLayout: 'fixed',
                            borderCollapse: 'collapse',
                            fontSize: `${pl.table.fontSize}px`,
                          }}
                        >
                          <colgroup>
                            <col style={{ width: `${cw0}px` }} />
                            <col style={{ width: `${cw1}px` }} />
                            <col style={{ width: `${cw2}px` }} />
                            <col style={{ width: `${cw3}px` }} />
                          </colgroup>

                          {/* Header row */}
                          <thead>
                            <tr
                              style={{
                                backgroundColor: pl.table.headerBg,
                                color: pl.table.headerText,
                                height: `${pl.table.headerHeight}px`,
                                fontSize: `${pl.table.headerFontSize}px`,
                              }}
                            >
                              <th style={{ border: `${pl.table.borderThickness}px solid ${pl.table.borderColor}`, textAlign: 'center', padding: `0 ${pl.table.cellPaddingX}px`, fontWeight: 700 }}>ITEM</th>
                              <th style={{ border: `${pl.table.borderThickness}px solid ${pl.table.borderColor}`, textAlign: 'center', padding: `0 ${pl.table.cellPaddingX}px`, fontWeight: 700 }}>Unit Price</th>
                              <th style={{ border: `${pl.table.borderThickness}px solid ${pl.table.borderColor}`, textAlign: 'center', padding: `0 ${pl.table.cellPaddingX}px`, fontWeight: 700 }}>GST (18%)</th>
                              <th style={{ border: `${pl.table.borderThickness}px solid ${pl.table.borderColor}`, textAlign: 'center', padding: `0 ${pl.table.cellPaddingX}px`, fontWeight: 700 }}>AMMOUNT</th>
                            </tr>
                          </thead>

                          {/* Data rows — dynamic only */}
                          <tbody>
                            {(invoice.invoice_items || []).map((item, idx) => {
                              const isComp = parseFloat(item.unit_price) === 0;
                              return (
                                <tr
                                  key={item.id || idx}
                                  style={{
                                    backgroundColor: '#FFFFFF',
                                    height: `${pl.table.rowHeight}px`,
                                    color: pl.colors.darkText,
                                  }}
                                >
                                  <td style={{ border: `${pl.table.borderThickness}px solid ${pl.table.borderColor}`, textAlign: 'center', padding: `${pl.table.cellPaddingY}px ${pl.table.cellPaddingX}px`, verticalAlign: 'middle', fontWeight: 700 }}>
                                    {item.program_name}
                                  </td>
                                  <td style={{ border: `${pl.table.borderThickness}px solid ${pl.table.borderColor}`, textAlign: 'right', padding: `${pl.table.cellPaddingY}px ${pl.table.cellPaddingX}px`, verticalAlign: 'middle', fontWeight: 700 }}>
                                    {isComp ? '₹0.00' : `₹${formatNumber(item.unit_price)}`}
                                  </td>
                                  <td style={{ border: `${pl.table.borderThickness}px solid ${pl.table.borderColor}`, textAlign: 'right', padding: `${pl.table.cellPaddingY}px ${pl.table.cellPaddingX}px`, verticalAlign: 'middle', fontWeight: 700 }}>
                                    {isComp ? '₹0.00' : `₹${formatNumber(item.gst_amount)}`}
                                  </td>
                                  <td style={{ border: `${pl.table.borderThickness}px solid ${pl.table.borderColor}`, textAlign: 'right', padding: `${pl.table.cellPaddingY}px ${pl.table.cellPaddingX}px`, verticalAlign: 'middle', fontWeight: 700 }}>
                                    {isComp ? '₹0.00' : `₹${formatNumber(item.total_amount)}`}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* ── Bottom Section (Contact on left, Summaries on right) ── */}
                      <div className="flex justify-between items-start" style={{ paddingLeft: `${pl.marginX}px`, paddingRight: `${pl.marginX}px`, paddingTop: '30px' }}>
                        {/* Left: Contact Info — regular weight */}
                        <div className="space-y-4 max-w-[250px] text-[10px]" style={{ color: '#102744', paddingTop: '10px' }}>
                          <div className="flex items-center gap-2">
                            <img src="/princeton-email-icon.png" alt="Email" className="w-3.5 h-3.5 object-contain flex-shrink-0" />
                            <span className="font-normal">{companyEmail}</span>
                          </div>
                          
                          <div className="flex items-start gap-2">
                            <img src="/princeton-address-icon.png" alt="Address" className="w-3.5 h-3.5 object-contain mt-0.5 flex-shrink-0" />
                            <span className="font-normal leading-normal">{companyAddress}</span>
                          </div>
                        </div>

                        {/* Right: Summary Panels */}
                        <div style={{ width: `${pl.summary.width}px` }}>
                          {/* Upper Grey Box: SUB TOTAL + TOTAL GST — regular weight */}
                          <div
                            style={{
                              backgroundColor: pl.summary.upperBg,
                              border: `1.5px solid ${pl.colors.navy}`,
                              padding: `${pl.summary.upperBoxPaddingY}px ${pl.summary.paddingX}px`,
                              fontSize: `${pl.summary.fontSize}px`,
                              lineHeight: '1.8',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#000000', fontWeight: 500 }}>
                              <span>SUB TOTAL :</span>
                              <span>₹{formatNumber(invoice.subtotal)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#000000', fontWeight: 500 }}>
                              <span>TOTAL GST :</span>
                              <span>₹{formatNumber(invoice.gst_amount)}</span>
                            </div>
                          </div>

                          {/* Lower Navy Box: TOTAL, DISCOUNT, PAID, DUE — Labels bold, values regular */}
                          <div
                            style={{
                              backgroundColor: pl.summary.lowerBg,
                              color: pl.summary.lowerText,
                              padding: `${pl.summary.lowerBoxPaddingY}px ${pl.summary.paddingX}px`,
                              fontSize: `${pl.summary.fontSize}px`,
                              lineHeight: '1.8',
                              marginTop: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span className="font-bold">TOTAL:</span>
                              <span className="font-normal">{pFmt(pPreDiscTotal)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span className="font-bold">DISCOUNT:</span>
                              <span className="font-normal">{pDisc > 0 ? `-${pFmt(pDisc)}` : pFmt(0)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span className="font-bold">PAID:</span>
                              <span className="font-normal">{pFmt(pPaid)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span className="font-bold">DUE:</span>
                              <span className="font-normal">{pFmt(pDue)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })()
              ) : (
                // STANDARD STACKED LAYOUTS (Elite, Harvard, PMI)
                <div className="space-y-8">
                  {/* Address Grid — Elite section now in header, skip here */}
                  {themeKey === 'elite' ? (
                    <div style={{ display: 'none' }} />
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
                        <p className="font-bold text-slate-800 text-sm">{resolvedCustomer?.name || 'Client Name'}</p>
                        {resolvedCustomer?.phone && <p>CIN: {resolvedCustomer.phone}</p>}
                        {resolvedCustomer?.email && <p>Email: {resolvedCustomer.email}</p>}
                        {(isIsNodeName(companyNameText) || resolvedCustomer?.gst_number) && (
                          <p className="font-medium text-slate-700">
                            GSTIN: {isIsNodeName(companyNameText) ? '09AAHCI9258G1Z3' : resolvedCustomer.gst_number}
                          </p>
                        )}
                        {resolvedCustomer?.address && <p className="pt-1 text-slate-400">{resolvedCustomer.address}</p>}
                      </div>
                    </div>
                  )}

                  {/* Itemized Table */}
                  <div style={{ paddingLeft: themeKey === 'elite' ? `${eliteMarginX}px` : '0', paddingRight: themeKey === 'elite' ? `${eliteMarginX}px` : '0' }}>
                    <table className="w-full text-left border-collapse border" style={{ width: '100%', borderColor: themeKey === 'elite' ? eliteLayout.colors.border : '#e2e8f0' }}>
                      <thead>
                        {themeKey === 'elite' ? (
                          <tr className="text-white text-xs font-bold" style={{ backgroundColor: eliteLayout.colors.primary, height: `${eliteLayout.table.headerHeight}px` }}>
                            <th className="p-3 text-center" style={{ width: '45.5%', borderRight: `1px solid ${eliteLayout.colors.dark}` }}>ITEM</th>
                            <th className="p-3 text-center" style={{ width: '18%', borderRight: `1px solid ${eliteLayout.colors.dark}` }}>Unit Price</th>
                            <th className="p-3 text-center" style={{ width: '18%', borderRight: `1px solid ${eliteLayout.colors.dark}` }}>GST (18%)</th>
                            <th className="p-3 text-center" style={{ width: '18.5%' }}>AMMOUNT</th>
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
                          (() => {
                            const items = invoice.invoice_items || [];
                            const MIN_ROWS = items.length; // only show rows with content
                            const rows = [];
                            for (let rIdx = 0; rIdx < MIN_ROWS; rIdx++) {
                              const item = items[rIdx];
                              const isComp = item ? parseFloat(item.unit_price) === 0 : false;
                              if (item) {
                                rows.push(
                                  <tr 
                                    key={item.id || rIdx} 
                                    className="border-b text-xs font-bold"
                                    style={{ borderColor: eliteLayout.colors.border, color: eliteLayout.colors.dark }}
                                  >
                                    <td className="p-3 text-center" style={{ width: '45.5%', borderRight: `1px solid ${eliteLayout.colors.border}`, verticalAlign: 'middle' }}>
                                      {item.program_name}
                                      {renderItemDescription(item, true)}
                                    </td>
                                    <td className="p-3 text-center font-bold font-mono" style={{ width: '18%', borderRight: `1px solid ${eliteLayout.colors.border}`, verticalAlign: 'middle' }}>{isComp ? '₹0.00' : `₹${formatNumber(item.unit_price)}`}</td>
                                    <td className="p-3 text-center font-bold font-mono" style={{ width: '18%', borderRight: `1px solid ${eliteLayout.colors.border}`, verticalAlign: 'middle' }}>{isComp ? '₹0.00' : `₹${formatNumber(item.gst_amount)}`}</td>
                                    <td className="p-3 text-center font-bold font-mono" style={{ width: '18.5%', verticalAlign: 'middle' }}>{isComp ? '₹0.00' : `₹${formatNumber(item.total_amount)}`}</td>
                                  </tr>
                                );
                              }
                            }
                            return rows;
                          })()
                        ) : (
                          invoice.invoice_items?.map((item, idx) => {
                            const isComp = parseFloat(item.unit_price) === 0;
                            return (
                              <tr key={item.id || idx} className="border-b border-slate-100/60 text-xs hover:bg-slate-50/30">
                                {themeKey === 'harvard' ? (
                                  <>
                                    <td className="p-3.5 pl-4 font-medium text-slate-800">
                                      {item.program_name}
                                      {renderItemDescription(item)}
                                    </td>
                                    <td className="p-3.5 text-right text-slate-600 font-mono">{item.quantity || 1}</td>
                                    <td className="p-3.5 text-right text-slate-600 font-mono">
                                      {isComp ? '₹0.00' : formatCurrency(item.unit_price)}
                                    </td>
                                    <td className={`p-3.5 pr-4 text-right font-mono font-bold ${isComp ? 'text-emerald-600 italic' : 'text-slate-850'}`}>
                                      {isComp ? '₹0.00' : formatCurrency(item.total_amount)}
                                    </td>
                                  </>
                                ) : (
                                  // PMI Theme
                                  <>
                                    <td className="p-3.5 pl-4 font-medium text-slate-800">
                                      {item.program_name}
                                      {renderItemDescription(item)}
                                    </td>
                                    <td className="p-3.5 text-right text-slate-600 font-mono">{item.quantity || 1}</td>
                                    <td className="p-3.5 text-right text-slate-600 font-mono">
                                      {isComp ? '₹0.00' : formatCurrency(item.unit_price)}
                                    </td>
                                    <td className="p-3.5 text-right text-slate-600 font-mono">
                                      {isComp ? '₹0.00' : formatCurrency(item.gst_amount)}
                                    </td>
                                    <td className={`p-3.5 pr-4 text-right font-mono font-bold ${isComp ? 'text-primary-600 italic' : 'text-slate-800'}`}>
                                      {isComp ? '₹0.00' : formatCurrency(item.total_amount)}
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
                    <div className="flex justify-end mt-6 text-xs" style={{ paddingLeft: `${eliteMarginX}px`, paddingRight: `${eliteMarginX}px` }}>
                      <div className="flex flex-col gap-3" style={{ width: `${eliteLayout.summary.width}px` }}>
                        {/* Box 1: Bordered Box */}
                        <div className="p-3 space-y-2 rounded-none text-xs" style={{ border: `${eliteLayout.summary.borderThickness}px solid ${eliteLayout.colors.primary}`, color: eliteLayout.colors.dark }}>
                          <div className="flex justify-between">
                            <span className="font-bold">SUB TOTAL:</span>
                            <span className="font-mono">₹{formatNumber(invoice.subtotal)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-bold">TOTAL GST:</span>
                            <span className="font-mono">₹{formatNumber(invoice.gst_amount)}</span>
                          </div>
                        </div>

                        {/* Box 2: Solid Box */}
                        <div className="text-white p-3 space-y-2 rounded-none text-xs" style={{ backgroundColor: eliteLayout.colors.primary }}>
                          <div className="flex justify-between">
                            <span className="font-bold">TOTAL:</span>
                            <span className="font-mono">₹{formatNumber(preDiscountTotal)}</span>
                          </div>
                          {discountAmount > 0 && (
                            <div className="flex justify-between text-yellow-300">
                              <span className="font-bold">DISCOUNT:</span>
                              <span className="font-mono">-₹{formatNumber(discountAmount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="font-bold">PAID:</span>
                            <span className="font-mono">₹{formatNumber(displayPaidAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-bold">DUE:</span>
                            <span className="font-mono">₹{formatNumber(netBalance)}</span>
                          </div>
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
                        {parseFloat(invoice.invoice_profile?.discount_amount) > 0 && (
                          <div className="flex justify-between text-rose-600">
                            <span>Discount {invoice.invoice_profile?.discount_type === 'percentage' && `(${invoice.invoice_profile?.discount_value}%)`}</span>
                            <span className="font-mono">-{formatCurrency(invoice.invoice_profile?.discount_amount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-slate-100 text-sm font-bold" style={{ color: activeTheme.primary }}>
                          <span>Total</span>
                          <span className="font-mono">{formatCurrency(preDiscountTotal)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-bold text-emerald-600">
                          <span>Paid</span>
                          <span className="font-mono">{formatCurrency(displayPaidAmount)}</span>
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

          {themeKey !== 'princeton' && (
            <div 
              className="px-8 py-5 text-white text-xs relative mt-auto overflow-hidden"
              style={{ 
                backgroundColor: themeKey === 'elite' ? '#101838' : (themeKey === 'harvard' ? activeTheme.secondary : activeTheme.primary),
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
                    <p className="font-bold text-xs">
                      Email: <a href={`mailto:${companyEmail}`} className="underline hover:text-blue-200 transition-colors">{companyEmail}</a>
                    </p>
                    <p className="font-bold text-xs">
                      Web: <a href={(companyWebsite || 'www.elitetoolistic.com').startsWith('http') ? (companyWebsite || 'www.elitetoolistic.com') : `https://${companyWebsite || 'www.elitetoolistic.com'}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-200 transition-colors">{companyWebsite || 'www.elitetoolistic.com'}</a>
                    </p>
                  </div>
                  {/* Right Column */}
                  <div className="text-right max-w-sm mr-16">
                    <p className="font-bold text-[10px] uppercase text-slate-400 tracking-wider">ADDRESS</p>
                    <p className="text-[10px] text-slate-300 font-normal mt-0.5 leading-normal">{companyAddress}</p>
                  </div>
                  
                  {/* Bottom-right corner accent triangles */}
                  <svg className="absolute right-0 bottom-0 pointer-events-none" width="80" height="50" viewBox="0 0 80 50">
                    <polygon points="80,50 0,50 80,0" fill="#2E41B4" />
                    <polygon points="80,50 40,50 80,20" fill="#6482DC" />
                  </svg>
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
          )}
        </>
      )}
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
                {activeCompany?.cin && <p className="text-slate-500">CIN: {activeCompany.cin}</p>}
                {activeCompany?.address && <p className="pt-1 text-slate-400">{activeCompany.address}</p>}
              </div>

              {/* BILL TO Column */}
              <div className="space-y-1 text-slate-500">
                <p className="font-bold text-[10px] uppercase tracking-wider text-slate-400">BILL TO</p>
                <p className="font-bold text-slate-800 text-sm">{resolvedCustomer?.name || invoice.customers?.name || 'Client Name'}</p>
                {(resolvedCustomer?.email || invoice.customers?.email) && <p>Email: {resolvedCustomer?.email || invoice.customers?.email}</p>}
                {/* GST above CIN */}
                {(isIsNodeName(activeCompany?.company_name || 'I-SUCCESSNODE') || resolvedCustomer?.gst_number) && (
                  <p>
                    GST: {isIsNodeName(activeCompany?.company_name || 'I-SUCCESSNODE') ? '09AAHCI9258G1Z3' : resolvedCustomer.gst_number}
                  </p>
                )}
                {(resolvedCustomer?.phone || invoice.customers?.phone) && (
                  <p>CIN: {resolvedCustomer?.phone || invoice.customers?.phone}</p>
                )}
                {(resolvedCustomer?.address || invoice.customers?.address) && (
                  <p className="pt-1 text-slate-400">{resolvedCustomer?.address || invoice.customers?.address}</p>
                )}
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
                          {renderItemDescription(item)}
                        </td>
                        <td className="p-3.5 text-right text-slate-650 font-mono">
                          {isComp ? '-' : formatCurrency(item.unit_price)}
                        </td>
                        <td className="p-3.5 text-right text-slate-650 font-mono">
                          {isComp ? '-' : formatCurrency(item.gst_amount)}
                        </td>
                        <td className={`p-3.5 pr-4 text-right font-mono font-bold ${isComp ? 'text-primary-600 italic' : 'text-slate-800'}`}>
                                                          {isComp ? '₹0.00' : formatCurrency(item.total_amount)}
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
                {parseFloat(invoice.invoice_profile?.discount_amount) > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Discount {invoice.invoice_profile?.discount_type === 'percentage' && `(${invoice.invoice_profile?.discount_value}%)`}</span>
                    <span className="font-mono">-{formatCurrency(invoice.invoice_profile?.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-100 text-sm font-bold text-primary-600">
                  <span>Total</span>
                  <span className="font-mono">{formatCurrency(preDiscountTotal)}</span>
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

      {/* Professional Certificate Modal */}
      {certModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 shadow-2xl rounded-2xl overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-150 dark:border-slate-800">
              <h3 className="font-display font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
                <span>Generate Professional Certificate</span>
              </h3>
              <button 
                onClick={() => setCertModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleGenerateCertificate} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                    Student Name
                  </label>
                  <input
                    type="text"
                    required
                    value={certStudentName}
                    onChange={(e) => setCertStudentName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                    Status
                  </label>
                  <select
                    value={certStatus}
                    onChange={(e) => setCertStatus(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                  >
                    <option value="UNDER TRAINING">UNDER TRAINING</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CERTIFIED">CERTIFIED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                    Course Name
                  </label>
                  <input
                    type="text"
                    required
                    value={certCourseName}
                    onChange={(e) => setCertCourseName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                    Course Duration
                  </label>
                  <input
                    type="text"
                    required
                    value={certDuration}
                    onChange={(e) => setCertDuration(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                    Enrollment Date
                  </label>
                  <input
                    type="date"
                    required
                    value={certEnrollmentDate}
                    onChange={(e) => handleEnrollmentDateChange(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                    Validity Date (10 Years Later)
                  </label>
                  <input
                    type="date"
                    required
                    value={certValidityDate}
                    onChange={(e) => setCertValidityDate(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                  Certificate Number
                </label>
                <input
                  type="text"
                  required
                  value={certNo}
                  onChange={(e) => setCertNo(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm font-mono"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-150 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCertModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={generatingCert}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-md shadow-purple-500/10 disabled:opacity-50 flex items-center gap-2"
                >
                  {generatingCert ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                      Generating...
                    </>
                  ) : (
                    'Download PDF'
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
