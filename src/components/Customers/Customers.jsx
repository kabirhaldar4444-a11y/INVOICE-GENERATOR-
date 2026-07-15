import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatDate, formatCurrency } from '../../utils/helpers';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  User, 
  Mail, 
  Phone, 
  FileText, 
  MapPin,
  X,
  CreditCard,
  ChevronRight,
  TrendingUp,
  Receipt,
  Download
} from 'lucide-react';
import { generateCertificatePDF } from '../../utils/certificateGenerator';

const isIsNodeName = (name) => {
  if (!name) return false;
  const n = name.toLowerCase();
  return n.includes('isuccessnode') || 
         n.includes('isucessnode') || 
         n.includes('successnode') || 
         n.includes('sucessnode') ||
         n.includes('i-successnode') || 
         n.includes('i-sucessnode');
};

export const Customers = () => {
  const { 
    customers, 
    invoices, 
    addCustomer, 
    updateCustomer, 
    deleteCustomer, 
    loadingStates,
    confirm,
    settings
  } = useApp();

  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [customerId, setCustomerId] = useState(null);
  
  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [address, setAddress] = useState('');

  // Certificate generation state
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certStudentName, setCertStudentName] = useState('');
  const [certCourseName, setCertCourseName] = useState('CSLP');
  const [certDuration, setCertDuration] = useState('90 Days');
  const [certEnrollmentDate, setCertEnrollmentDate] = useState('');
  const [certValidityDate, setCertValidityDate] = useState('');
  const [certNo, setCertNo] = useState('');
  const [certStatus, setCertStatus] = useState('UNDER TRAINING');
  const [generatingCert, setGeneratingCert] = useState(false);

  // Filter customers based on search
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.gst_number && c.gst_number.toLowerCase().includes(search.toLowerCase()))
  );

  const openAddModal = () => {
    setName('');
    setEmail('');
    setPhone('');
    setGstNumber('');
    setAddress('');
    setEditMode(false);
    setCustomerId(null);
    setModalOpen(true);
  };

  const openEditModal = (c) => {
    setName(c.name);
    setEmail(c.email);
    setPhone(c.phone || '');
    setGstNumber(c.gst_number || '');
    setAddress(c.address || '');
    setEditMode(true);
    setCustomerId(c.id);
    setModalOpen(true);
  };

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

  const openCertificateModal = (customer) => {
    setCertStudentName(customer.name);
    setCertCourseName('CSLP');
    setCertDuration('90 Days');
    
    // Default today
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    setCertEnrollmentDate(todayStr);

    // Default 10 years later
    const tenYearsLater = `${yyyy + 10}-${mm}-${dd}`;
    setCertValidityDate(tenYearsLater);

    setCertNo(generateDefaultCertNo(customer.name));
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
    } catch (err) {
      console.error('Error generating certificate:', err);
    } finally {
      setGeneratingCert(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name || !email) return;

    const finalGst = isIsNodeName(name) ? '09AAHCI9258G1Z3' : gstNumber;
    const payload = { name, email, phone, gst_number: finalGst, address };

    try {
      if (editMode) {
        await updateCustomer(customerId, payload);
      } else {
        await addCustomer(payload);
      }
      setModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Delete Customer',
      message: 'Are you sure you want to delete this customer?',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      try {
        await deleteCustomer(id);
        if (selectedCustomer?.id === id) {
          setSelectedCustomer(null);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Get customer specific stats
  const getCustomerStats = (cId) => {
    const custInvs = invoices.filter(i => i.customer_id === cId);
    const totalCount = custInvs.length;
    const paidCount = custInvs.filter(i => i.status === 'paid').length;
    const pendingCount = custInvs.filter(i => i.status === 'pending').length;
    const totalBilled = custInvs.reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0);
    const totalPaid = custInvs.reduce((acc, curr) => acc + (parseFloat(curr.paid_amount) || 0), 0);
    const totalPending = totalBilled - totalPaid;

    return {
      totalCount,
      paidCount,
      pendingCount,
      totalBilled,
      totalPaid,
      totalPending,
      invoices: custInvs
    };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors">
        <div className="relative flex-grow max-w-md w-full">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search className="w-4.5 h-4.5" />
          </span>
          <input
            type="text"
            placeholder="Search customers by name, email, GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
          />
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-primary-500/10 hover:shadow-primary-500/20 active:scale-[0.98] text-sm"
        >
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Customers Table Column */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 transition-colors shadow-sm">
          <h3 className="font-display font-bold text-base text-slate-800 dark:text-white mb-4">Customer Directory</h3>
          
          {loadingStates.customers ? (
            <div className="space-y-3 py-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-16 w-full bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-slate-150 dark:border-slate-800 rounded-2xl">
              <User className="w-12 h-12 text-slate-350 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">No customers found</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Try resetting search or click "Add Customer" to start</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="pb-3 pl-2">Name / Email</th>
                    <th className="pb-3">CIN</th>
                    <th className="pb-3">GSTIN</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredCustomers.map((c) => (
                    <tr 
                      key={c.id} 
                      onClick={() => setSelectedCustomer(c)}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors group ${
                        selectedCustomer?.id === c.id ? 'bg-primary-50/20 dark:bg-primary-950/10' : ''
                      }`}
                    >
                      <td className="py-4 pl-2">
                        <div className="font-semibold text-sm text-slate-800 dark:text-slate-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {c.name}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-0.5">
                          <Mail className="w-3.5 h-3.5" /> {c.email}
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 font-mono">
                          {c.phone || '—'}
                        </span>
                      </td>
                      <td className="py-4">
                        <span className="px-2.5 py-1 text-[10px] font-bold rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                          {c.gst_number || 'UNREGISTERED'}
                        </span>
                      </td>
                      <td className="py-4 text-right pr-2" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(c)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit customer details"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                            title="Delete customer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-slate-350 dark:text-slate-600 ml-1" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Invoice History Details Panel Column */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 transition-colors shadow-sm">
          {selectedCustomer ? (
            (() => {
              const stats = getCustomerStats(selectedCustomer.id);
              return (
                <div className="space-y-6">
                  {/* Customer title */}
                  <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div>
                      <h3 className="font-display font-bold text-lg text-slate-800 dark:text-white leading-tight">
                        {selectedCustomer.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">Account History & Stats</p>
                    </div>
                    <button 
                      onClick={() => setSelectedCustomer(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                    >
                      <X className="w-4.5 h-4.5" />
                    </button>
                  </div>

                  {/* Customer Metadata Card */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-xl p-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
                    {selectedCustomer.phone && (
                      <p className="flex items-center gap-2 font-mono">
                        <FileText className="w-4 h-4 text-slate-400" /> CIN: {selectedCustomer.phone}
                      </p>
                    )}
                    {selectedCustomer.gst_number && (
                      <p className="flex items-center gap-2 font-mono">
                        <CreditCard className="w-4 h-4 text-slate-400" /> GSTIN: {selectedCustomer.gst_number}
                      </p>
                    )}
                    {selectedCustomer.address && (
                      <p className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 mt-0.5" /> 
                        <span className="leading-relaxed">{selectedCustomer.address}</span>
                      </p>
                    )}
                  </div>

                  {/* Certificate Generation Action for iSuccessNode */}
                  {isIsNodeName(settings?.company_name) && (
                    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border border-purple-100 dark:border-purple-900/30 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                        <FileText className="w-4.5 h-4.5" />
                        <span className="font-bold text-xs uppercase tracking-wider">Professional Certificate</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-450 leading-relaxed">
                        Generate and download a professional student certificate with signature and stamp for this customer.
                      </p>
                      <button
                        onClick={() => openCertificateModal(selectedCustomer)}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-purple-600 hover:bg-purple-700 active:scale-[0.98] text-white font-semibold rounded-lg text-xs shadow-md shadow-purple-500/10 hover:shadow-purple-500/20 transition-all cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" /> Generate Certificate
                      </button>
                    </div>
                  )}

                  {/* Quick Billed Stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 bg-indigo-50/30 dark:bg-indigo-950/15 border border-indigo-100/30 dark:border-indigo-950/30 rounded-xl">
                      <div className="flex items-center justify-between text-indigo-500 mb-1">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-[10px] font-semibold tracking-wider uppercase">Billed</span>
                      </div>
                      <p className="text-sm font-bold text-indigo-950 dark:text-indigo-300">
                        {formatCurrency(stats.totalBilled)}
                      </p>
                    </div>

                    <div className="p-3.5 bg-amber-50/30 dark:bg-amber-950/15 border border-amber-100/30 dark:border-amber-950/30 rounded-xl">
                      <div className="flex items-center justify-between text-amber-500 mb-1">
                        <Receipt className="w-4 h-4" />
                        <span className="text-[10px] font-semibold tracking-wider uppercase">Balance Due</span>
                      </div>
                      <p className="text-sm font-bold text-amber-950 dark:text-amber-300">
                        {formatCurrency(stats.totalPending)}
                      </p>
                    </div>
                  </div>

                  {/* Invoice list history */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      <span>Invoices ({stats.totalCount})</span>
                      <span>Billed Amount</span>
                    </div>

                    {stats.invoices.length === 0 ? (
                      <div className="text-center py-10 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800 rounded-xl">
                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-semibold">No invoice history found</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {stats.invoices.map((inv) => (
                          <div 
                            key={inv.id}
                            className="flex justify-between items-center p-3 border border-slate-100 dark:border-slate-800 rounded-xl text-xs hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-all"
                          >
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">{inv.invoice_number}</p>
                              <div className="flex flex-wrap gap-x-1.5 items-center mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                                <span>{formatDate(inv.invoice_date)}</span>
                                <span>•</span>
                                <span className="font-medium text-slate-500 dark:text-slate-450">
                                  {inv.invoice_profile?.company_name || settings?.company_name || 'I-SUCCESSNODE'}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-slate-800 dark:text-slate-100">{formatCurrency(inv.total_amount)}</p>
                              <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1 ${
                                inv.status === 'paid' 
                                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450' 
                                  : inv.status === 'cancelled'
                                  ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450'
                                  : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450'
                              }`}>
                                {inv.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="text-center py-24">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">No Customer Selected</p>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Click a customer on the left to see invoice logs, balance metrics, and profile details.</p>
            </div>
          )}
        </div>
      </div>

      {/* Customer Modal (Add / Edit) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 shadow-2xl rounded-2xl overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-150 dark:border-slate-800">
              <h3 className="font-display font-bold text-base text-slate-800 dark:text-white">
                {editMode ? 'Edit Customer Details' : 'Add New Customer'}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. client@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                    CIN Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. U16229UP2024PTC199657"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                    GST Number (GSTIN)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 27AAAAA1111A1Z1"
                    value={isIsNodeName(name) ? '09AAHCI9258G1Z3' : gstNumber}
                    onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                    disabled={isIsNodeName(name)}
                    className={`w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-455 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm font-mono ${
                      isIsNodeName(name) 
                        ? 'bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed opacity-80' 
                        : 'bg-slate-50 dark:bg-slate-800'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                  Billing Address
                </label>
                <textarea
                  placeholder="e.g. 123 Business Lane, Mumbai, Maharashtra 400001"
                  rows="3"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-150 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-md shadow-primary-500/10"
                >
                  Save Customer
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
export default Customers;
