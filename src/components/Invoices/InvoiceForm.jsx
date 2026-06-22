import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { generateNextInvoiceNumber } from '../../utils/helpers';
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft, 
  Calendar, 
  UserPlus, 
  Calculator,
  User,
  ShoppingBag,
  FileText,
  Building2,
  X
} from 'lucide-react';

// Helper to safely parse inputs that may contain currency symbols or commas
const parseAmount = (val) => {
  if (val === undefined || val === null) return 0;
  const str = typeof val === 'string' ? val : val.toString();
  const cleaned = str.replace(/[^0-9.]/g, ''); // Keep only numbers and decimal point
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

export const InvoiceForm = () => {
  const { invoices, customers, addInvoice, updateInvoice, showToast, profiles, settings, addCustomer } = useApp();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const isEditMode = !!id;

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState('pending');
  const [paidAmount, setPaidAmount] = useState('0');
  const [isPaidManuallyEdited, setIsPaidManuallyEdited] = useState(isEditMode);

  // Customer Modal state
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustGst, setNewCustGst] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName || !newCustEmail) {
      showToast('Name and Email are required', 'error');
      return;
    }
    setIsSavingCustomer(true);
    try {
      const newCust = await addCustomer({
        name: newCustName,
        email: newCustEmail,
        phone: newCustPhone,
        gst_number: newCustGst,
        address: newCustAddress
      });
      if (newCust && newCust.id) {
        setCustomerId(newCust.id);
      }
      // Reset form fields
      setNewCustName('');
      setNewCustEmail('');
      setNewCustPhone('');
      setNewCustGst('');
      setNewCustAddress('');
      setShowAddCustomerModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const [items, setItems] = useState([
    { program_name: '', description: '', quantity: 1, unit_price: '0', gross_price: '', gst_percentage: 18, gst_amount: 0, total_amount: 0, paid_amount: '', isPaidManuallyEdited: false }
  ]);

  const [subtotal, setSubtotal] = useState(0);
  const [gstAmount, setGstAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  useEffect(() => {
    if (isEditMode) {
      const source = invoices.find(inv => inv.id === id);
      if (source) {
        setInvoiceNumber(source.invoice_number);
        setInvoiceDate(source.invoice_date);
        setCustomerId(source.customer_id);
        setStatus(source.status);
        setPaidAmount(source.paid_amount.toString());

        // Initialize issuing profile selection
        if (source.invoice_profile) {
          const matchedProfile = profiles.find(p => p.company_name === source.invoice_profile.company_name || p.gst_number === source.invoice_profile.gst_number);
          if (matchedProfile) {
            setSelectedProfileId(matchedProfile.id);
          } else {
            setSelectedProfileId('custom-invoice-profile');
          }
        } else {
          const defaultProf = profiles.find(p => p.is_default);
          setSelectedProfileId(defaultProf?.id || (profiles[0]?.id || 'default-profile'));
        }

        const hydItems = source.invoice_items.map(item => {
          const uPrice = parseFloat(item.unit_price) || 0;
          const gstPct = parseFloat(item.gst_percentage) || 0;
          const gross = uPrice * (1 + gstPct / 100);
          
          let parsedDesc = item.description || '';
          let itemPaidAmount = (item.total_amount || 0).toString();
          let isPaidManuallyEdited = false;
          try {
            if (parsedDesc.startsWith('{') && parsedDesc.endsWith('}')) {
              const json = JSON.parse(parsedDesc);
              parsedDesc = json.text || '';
              itemPaidAmount = (json.paid_amount !== undefined) ? json.paid_amount.toString() : (item.total_amount || 0).toString();
              isPaidManuallyEdited = true;
            }
          } catch (e) {
            // Keep default
          }

          return {
            id: item.id,
            program_name: item.program_name,
            description: parsedDesc,
            quantity: item.quantity,
            unit_price: item.unit_price.toString(),
            gross_price: gross.toFixed(2),
            gst_percentage: gstPct,
            gst_amount: parseFloat(item.gst_amount),
            total_amount: parseFloat(item.total_amount),
            paid_amount: itemPaidAmount,
            isPaidManuallyEdited: isPaidManuallyEdited
          };
        });
        setItems(hydItems);
      } else {
        showToast('Invoice not found', 'error');
        navigate('/invoices');
      }
    } else {
      setInvoiceNumber(generateNextInvoiceNumber(invoices));
      const defaultProf = profiles.find(p => p.is_default);
      setSelectedProfileId(defaultProf?.id || (profiles[0]?.id || 'default-profile'));
    }
  }, [id, invoices, isEditMode, profiles]);

  // Recalculate invoice summaries based on active items array
  useEffect(() => {
    let tempSubtotal = 0;
    let tempGstAmount = 0;
    let tempTotalAmount = 0;
    let tempTotalPaid = 0;

    items.forEach(item => {
      const qty = parseInt(item.quantity, 10) || 0;
      const unitPrice = parseAmount(item.unit_price);
      const itemPaid = parseAmount(item.paid_amount);
      
      tempSubtotal += unitPrice * qty;
      tempGstAmount += parseAmount(item.gst_amount);
      tempTotalAmount += parseAmount(item.total_amount);
      tempTotalPaid += itemPaid;
    });

    const finalSubtotal = parseFloat(tempSubtotal.toFixed(2));
    const finalGstAmount = parseFloat(tempGstAmount.toFixed(2));
    const finalTotalAmount = parseFloat(tempTotalAmount.toFixed(2));
    const finalTotalPaid = parseFloat(tempTotalPaid.toFixed(2));

    setSubtotal(finalSubtotal);
    setGstAmount(finalGstAmount);
    setTotalAmount(finalTotalAmount);
    setPaidAmount(finalTotalPaid.toFixed(2));

    // Update status based on total paid vs total amount
    if (finalTotalPaid >= finalTotalAmount && finalTotalAmount > 0) {
      setStatus('paid');
    } else {
      setStatus('pending');
    }
  }, [items]);

  const handlePaidAmountChange = (val) => {
    setIsPaidManuallyEdited(true); // Flag manual edit
    setPaidAmount(val);
    const numericPaid = parseAmount(val);
    if (numericPaid >= totalAmount && totalAmount > 0) {
      setStatus('paid');
    } else if (numericPaid > 0 && numericPaid < totalAmount) {
      setStatus('pending');
    } else if (numericPaid === 0) {
      setStatus('pending');
    }
  };

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    setIsPaidManuallyEdited(true); // Flag manual edit to stop auto-sync
    if (newStatus === 'paid') {
      setPaidAmount(totalAmount.toFixed(2));
    } else if (newStatus === 'pending') {
      const currentPaid = parseAmount(paidAmount);
      if (currentPaid >= totalAmount) {
        setPaidAmount('0.00');
      }
    } else if (newStatus === 'cancelled') {
      setPaidAmount('0.00');
    }
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      { program_name: '', description: '', quantity: 1, unit_price: '0', gross_price: '', gst_percentage: 18, gst_amount: 0, total_amount: 0, paid_amount: '', isPaidManuallyEdited: false }
    ]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) {
      showToast('An invoice must contain at least one line item.', 'error');
      return;
    }
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleItemFieldChange = (index, field, value) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        const updated = { ...item, [field]: value };
        
        const qty = parseInt(updated.quantity, 10) || 0;
        const gstPct = parseAmount(updated.gst_percentage);

        if (field === 'unit_price') {
          // Input Base Rate (Exclusive of tax) -> Calculate Inclusive Rate
          const price = parseAmount(value);
          const gross = price * (1 + gstPct / 100);
          updated.gross_price = value === '' ? '' : gross.toFixed(2);
          updated.gst_amount = parseFloat((qty * price * (gstPct / 100)).toFixed(2));
          updated.total_amount = parseFloat((qty * gross).toFixed(2));
          if (!updated.isPaidManuallyEdited) {
            updated.paid_amount = updated.total_amount.toString();
          }
        } 
        else if (field === 'gross_price') {
          // Input Inclusive Rate -> Calculate Base Rate (Exclusive)
          const gross = parseAmount(value);
          const price = gross / (1 + gstPct / 100);
          updated.unit_price = value === '' ? '' : price.toFixed(2);
          updated.gst_amount = parseFloat((qty * (gross - price)).toFixed(2));
          updated.total_amount = parseFloat((qty * gross).toFixed(2));
          if (!updated.isPaidManuallyEdited) {
            updated.paid_amount = updated.total_amount.toString();
          }
        } 
        else if (field === 'quantity' || field === 'gst_percentage') {
          // Adjust Quantity or tax rate -> Re-calculate amounts using Inclusive Rate as locked anchor
          const gross = parseAmount(updated.gross_price);
          const price = gross / (1 + gstPct / 100);
          updated.unit_price = price.toFixed(2);
          updated.gst_amount = parseFloat((qty * (gross - price)).toFixed(2));
          updated.total_amount = parseFloat((qty * gross).toFixed(2));
          if (!updated.isPaidManuallyEdited) {
            updated.paid_amount = updated.total_amount.toString();
          }
        }
        else if (field === 'paid_amount') {
          updated.isPaidManuallyEdited = true;
        }

        return updated;
      }
      return item;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!customerId) {
      showToast('Please select a customer', 'error');
      return;
    }

    const invalidItem = items.some(item => !item.program_name.trim() || item.quantity <= 0 || parseAmount(item.unit_price) < 0);
    if (invalidItem) {
      showToast('Ensure all items have a program name, valid quantity and unit rate.', 'error');
      return;
    }

    const invoicePayload = {
      invoice_number: invoiceNumber,
      customer_id: customerId,
      invoice_date: invoiceDate,
      subtotal,
      gst_amount: gstAmount,
      total_amount: totalAmount,
      paid_amount: parseAmount(paidAmount),
      status
    };

    const activeProfile = profiles.find(p => p.id === selectedProfileId) || (isEditMode && invoices.find(inv => inv.id === id)?.invoice_profile) || settings;

    const metadataItem = {
      program_name: '__profile_metadata__',
      description: JSON.stringify({
        company_name: activeProfile?.company_name || 'I-SUCCESSNODE',
        gst_number: activeProfile?.gst_number || '',
        email: activeProfile?.email || '',
        phone: activeProfile?.phone || '',
        website: activeProfile?.website || '',
        address: activeProfile?.address || '',
        logo_url: activeProfile?.logo_url || ''
      }),
      quantity: 1,
      unit_price: 0,
      gst_percentage: 0,
      gst_amount: 0,
      total_amount: 0
    };

    const serializedItems = items.map(item => ({
      program_name: item.program_name,
      description: JSON.stringify({
        text: item.description || '',
        paid_amount: parseAmount(item.paid_amount)
      }),
      quantity: parseInt(item.quantity, 10) || 1,
      unit_price: parseAmount(item.unit_price),
      gst_percentage: parseAmount(item.gst_percentage),
      gst_amount: parseAmount(item.gst_amount),
      total_amount: parseAmount(item.total_amount)
    }));

    const itemsWithMetadata = [...serializedItems, metadataItem];

    try {
      if (isEditMode) {
        await updateInvoice(id, invoicePayload, itemsWithMetadata);
      } else {
        await addInvoice(invoicePayload, itemsWithMetadata);
        if (typeof window !== 'undefined' && window.confetti) {
          window.confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        }
      }
      navigate('/invoices');
    } catch (err) {
      console.error(err);
    }
  };

  const balanceDue = Math.max(0, totalAmount - parseAmount(paidAmount));

  return (
    <div className="space-y-6">
      
      {/* Header back bar */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors">
        <button
          onClick={() => navigate('/invoices')}
          className="flex items-center gap-2 py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Invoices
        </button>
        <span className="text-xs font-bold font-mono text-slate-400 dark:text-slate-500 uppercase">
          {isEditMode ? 'EDIT INVOICE PORTAL' : 'NEW INVOICE PORTAL'}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main fields column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 0: Issuing Profile */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 transition-colors shadow-sm space-y-4 animate-fade-in">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Building2 className="w-5 h-5 text-primary-500" />
              <h3 className="font-display font-bold text-base text-slate-800 dark:text-white">Issuing Company Profile</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="md:col-span-1">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                  Select Profile *
                </label>
                <select
                  required
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm font-medium"
                >
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.company_name} {p.is_default ? '(Default)' : ''}
                    </option>
                  ))}
                  {selectedProfileId === 'custom-invoice-profile' && (
                    <option value="custom-invoice-profile">
                      {invoices.find(inv => inv.id === id)?.invoice_profile?.company_name} (Saved Profile)
                    </option>
                  )}
                </select>
              </div>

              {/* Profile Details Mini-Preview Card */}
              <div className="md:col-span-2">
                {(() => {
                  const activeProfile = profiles.find(p => p.id === selectedProfileId) || (isEditMode && invoices.find(inv => inv.id === id)?.invoice_profile) || settings;
                  if (!activeProfile) return null;
                  return (
                    <div className="bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100/80 dark:border-slate-800/80 rounded-xl p-3 flex items-center gap-3 transition-all duration-200 hover:border-slate-200 dark:hover:border-slate-700">
                      <div className="w-10 h-10 bg-white dark:bg-slate-850 rounded-lg border border-slate-200/60 dark:border-slate-700 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                        {activeProfile.logo_url ? (
                          <img src={activeProfile.logo_url} alt="Profile Logo" className="max-h-full max-w-full object-contain p-1" />
                        ) : (
                          <span className="font-bold text-sm text-slate-400">
                            {activeProfile.company_name?.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-grow">
                        <p className="font-semibold text-xs text-slate-850 dark:text-white truncate">{activeProfile.company_name}</p>
                        <p className="text-[10px] text-slate-450 dark:text-slate-500 font-mono truncate">
                          GST: {activeProfile.gst_number || 'N/A'} • {activeProfile.email || 'No Email'}
                        </p>
                        <p className="text-[10px] text-slate-450 dark:text-slate-500 truncate leading-tight mt-0.5">
                          {activeProfile.address || 'No Address'}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Section 1: Customer and General Details */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 transition-colors shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <User className="w-5 h-5 text-primary-500" />
              <h3 className="font-display font-bold text-base text-slate-800 dark:text-white">Customer & Meta details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                  Invoice Code *
                </label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                  Invoice Date *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide">
                    Recipient Client *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddCustomerModal(true)}
                    className="text-[10px] text-primary-600 hover:text-primary-700 font-bold flex items-center gap-0.5"
                  >
                    <UserPlus className="w-3 h-3" /> Add New
                  </button>
                </div>
                <select
                  required
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm font-medium"
                >
                  <option value="">Select customer...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.gst_number ? `(${c.gst_number})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Multiple Line Items */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 transition-colors shadow-sm space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-primary-500" />
                <h3 className="font-display font-bold text-base text-slate-800 dark:text-white">Product & Program Line Items</h3>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-255 rounded-lg text-xs font-bold transition-all shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            {/* Helpful navigation/usage hint */}
            <div className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-150/45 dark:border-slate-800 flex items-center justify-between no-print lg:hidden">
              <span>
                👉 <strong>On smaller screens or zoomed in?</strong> Scroll down to the bottom of the page to find the <strong>Valuation Summary</strong> where you can edit the <strong>Amount Paid</strong> and see the calculated <strong>Net Balance Due (Pending Balance)</strong>.
              </span>
            </div>

            {/* Line items dynamic builder */}
            <div className="space-y-4">
              {items.map((item, index) => (
                <div 
                  key={index}
                  className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl space-y-4 bg-slate-50/30 dark:bg-slate-850/10 transition-colors"
                >
                  {/* Row Top Details: Program Name & GST Selector */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <input
                        type="text"
                        required
                        placeholder="Program or Service Name * (e.g. FAC)"
                        value={item.program_name}
                        onChange={(e) => handleItemFieldChange(index, 'program_name', e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <select
                        value={item.gst_percentage}
                        onChange={(e) => handleItemFieldChange(index, 'gst_percentage', parseInt(e.target.value, 10))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-xs font-medium"
                      >
                        <option value={0}>0% GST (Exempted)</option>
                        <option value={5}>5% GST</option>
                        <option value={12}>12% GST</option>
                        <option value={18}>18% GST (Standard)</option>
                        <option value={28}>28% GST (Luxury)</option>
                      </select>
                    </div>
                  </div>

                  {/* Row Bottom Details: Description, Qty, Excl. Rate, Incl. Rate */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      <div className="md:col-span-4">
                        <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                          Description (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Training / complementary"
                          value={item.description}
                          onChange={(e) => handleItemFieldChange(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-850 dark:text-slate-205 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-xs"
                        />
                      </div>

                      <div className="md:col-span-1">
                        <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1 text-center">
                          Qty
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleItemFieldChange(index, 'quantity', e.target.value)}
                          className="w-full px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-100 text-center focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-xs"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1 text-right">
                          Course Amt (₹)
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="0.00"
                          value={item.gross_price}
                          onChange={(e) => handleItemFieldChange(index, 'gross_price', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-850 dark:text-slate-100 text-right focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-xs font-mono font-bold"
                          title="Total actual amount of course"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wide mb-1 text-right">
                          Amt Paid (₹)
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="0.00"
                          value={item.paid_amount}
                          onChange={(e) => handleItemFieldChange(index, 'paid_amount', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-850 dark:text-slate-100 text-right focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-xs font-mono font-bold"
                          title="Amount paid by client for this course"
                        />
                      </div>

                      <div className="md:col-span-3 flex justify-between items-center pl-2 pb-1.5">
                        <div className="text-[10px] text-right font-semibold text-slate-400 leading-tight">
                          <div>Total: <span className="text-slate-800 dark:text-slate-200 font-bold">₹{item.total_amount}</span></div>
                          <div className="mt-0.5">
                            Pending: <span className={`${(item.total_amount - parseAmount(item.paid_amount)) > 0 ? 'text-amber-600 font-bold' : 'text-slate-400 font-medium'}`}>
                              ₹{(item.total_amount - parseAmount(item.paid_amount)).toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                        >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Floating summaries and actions column */}
        <div className="space-y-6">
          
          {/* Summary calculations */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 transition-colors shadow-sm space-y-4 sticky top-24">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              <Calculator className="w-5 h-5 text-primary-500" />
              <h3 className="font-display font-bold text-base text-slate-800 dark:text-white">Valuation Summary</h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Subtotal Billed</span>
                <span className="font-bold">₹{subtotal}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Total GST Collected</span>
                <span className="font-bold">₹{gstAmount}</span>
              </div>
              
              <div className="h-px bg-slate-100 dark:bg-slate-800" />
              
              <div className="flex justify-between items-center text-sm font-bold text-slate-800 dark:text-white">
                <span>Gross Payable</span>
                <span className="text-primary-600 dark:text-primary-400">₹{totalAmount}</span>
              </div>
              
              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-450 uppercase tracking-wide mb-1">
                    Amount Paid (₹)
                  </label>
                  <input
                    type="text"
                    required
                    value={paidAmount}
                    onChange={(e) => handlePaidAmountChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-right focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-450 uppercase tracking-wide mb-1">
                    Invoice Payment Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm font-semibold"
                  >
                    <option value="pending">Pending Receipt</option>
                    <option value="paid">Paid Invoice</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />
              
              <div className="flex justify-between items-center text-xs font-bold text-amber-600 dark:text-amber-450">
                <span>Net Balance Due</span>
                <span>₹{balanceDue.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold transition-all shadow-lg shadow-primary-500/20 hover:shadow-primary-500/35 active:scale-[0.98] flex items-center justify-center gap-2 text-sm"
              >
                <Save className="w-4.5 h-4.5" /> Save GST Invoice
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Inline Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 shadow-2xl rounded-2xl overflow-hidden animate-scale-up">
            
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-150 dark:border-slate-800">
              <h3 className="font-display font-bold text-base text-slate-800 dark:text-white">
                Add New Customer
              </h3>
              <button 
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe"
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
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
                    value={newCustEmail}
                    onChange={(e) => setNewCustEmail(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +91 98765 43210"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
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
                    value={newCustGst}
                    onChange={(e) => setNewCustGst(e.target.value.toUpperCase())}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm font-mono"
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
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end items-center gap-3 pt-3 border-t border-slate-150 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCustomer}
                  className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-md shadow-primary-500/10 flex items-center justify-center"
                >
                  {isSavingCustomer ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                      Saving...
                    </>
                  ) : (
                    'Save Customer'
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
export default InvoiceForm;
