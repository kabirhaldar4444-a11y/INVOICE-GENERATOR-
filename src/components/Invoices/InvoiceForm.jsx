import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { generateNextInvoiceNumber } from '../../utils/helpers';
import CustomSelect from '../Shared/CustomSelect';
import confetti from 'canvas-confetti';
import { 
  Plus, 
  Trash2, 
  Save, 
  ArrowLeft, 
  Calendar, 
  Calculator,
  User,
  ShoppingBag,
  FileText,
  Building2,
  Sparkles,
  X,
  ChevronDown
} from 'lucide-react';

// Helper to safely parse inputs that may contain currency symbols or commas
const parseAmount = (val) => {
  if (val === undefined || val === null) return 0;
  const str = typeof val === 'string' ? val : val.toString();
  const cleaned = str.replace(/[^0-9.]/g, ''); // Keep only numbers and decimal point
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

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

export const InvoiceForm = () => {
  const { invoices, customers, addInvoice, updateInvoice, showToast, profiles, settings, addCustomer, updateCustomer } = useApp();
  const navigate = useNavigate();
  const { id } = useParams();
  
  const isEditMode = !!id;

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState('pending');
  const [pendingAmount, setPendingAmount] = useState('0');
  const [discountType, setDiscountType] = useState('percentage');
  const [discountValue, setDiscountValue] = useState('0');

  // Inline Customer detail fields
  const [newCustName, setNewCustName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustGst, setNewCustGst] = useState('');
  const [newCustAddress, setNewCustAddress] = useState('');

  // Dropdown for line item descriptions
  const [openDescriptionIndex, setOpenDescriptionIndex] = useState(null);

  const [items, setItems] = useState([
    { program_name: '', description: '', quantity: 1, unit_price: '0', gross_price: '', gst_percentage: 18, gst_amount: 0, total_amount: 0, paid_amount: '', isPaidManuallyEdited: false }
  ]);

  const [subtotal, setSubtotal] = useState(0);
  const [gstAmount, setGstAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  const activeProfile = profiles.find(p => p.id === selectedProfileId) || (isEditMode && invoices.find(inv => inv.id === id)?.invoice_profile) || settings;
  const isIssuingNode = activeProfile && isIsNodeName(activeProfile.company_name);

  useEffect(() => {
    if (isEditMode) {
      const source = invoices.find(inv => inv.id === id);
      if (source) {
        setInvoiceNumber(source.invoice_number);
        setInvoiceDate(source.invoice_date);
        setCustomerId(source.customer_id);
        const cust = customers.find(c => c.id === source.customer_id);
        if (cust) {
          setNewCustName(cust.name || '');
          setNewCustEmail(cust.email || '');
          setNewCustPhone(cust.phone || '');
          setNewCustGst(cust.gst_number || '');
          setNewCustAddress(cust.address || '');
        }
        setStatus(source.status);

        // Initialize issuing profile selection
        if (source.invoice_profile) {
          const matchedProfile = profiles.find(p => p.company_name === source.invoice_profile.company_name || p.gst_number === source.invoice_profile.gst_number);
          if (matchedProfile) {
            setSelectedProfileId(matchedProfile.id);
          } else {
            setSelectedProfileId('custom-invoice-profile');
          }
          setDiscountType(source.invoice_profile.discount_type || 'percentage');
          setDiscountValue((source.invoice_profile.discount_value || 0).toString());
          setPendingAmount((source.invoice_profile.pending_amount || (source.total_amount - source.paid_amount) || 0).toString());
        } else {
          const defaultProf = profiles.find(p => p.is_default);
          setSelectedProfileId(defaultProf?.id || (profiles[0]?.id || 'default-profile'));
          setDiscountType('percentage');
          setDiscountValue('0');
          setPendingAmount((source.total_amount - source.paid_amount || 0).toString());
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
      setInvoiceNumber('');
      const defaultProf = profiles.find(p => p.is_default);
      setSelectedProfileId(defaultProf?.id || (profiles[0]?.id || 'default-profile'));
      setDiscountType('percentage');
      setDiscountValue('0');
      setPendingAmount('0');
    }
  }, [id, invoices, isEditMode, profiles, customers]);

  useEffect(() => {
    if (isIssuingNode) {
      setNewCustGst('09AAHCI9258G1Z3');
    }
  }, [isIssuingNode, selectedProfileId]);

  // Click outside to close description preset dropdown
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.description-preset-container')) {
        setOpenDescriptionIndex(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // On-the-fly calculations
  // totalBeforeDiscount represents the pre-discount sum of item prices
  const totalBeforeDiscount = items.reduce((sum, item) => sum + parseAmount(item.paid_amount), 0);
  const parsedPendingAmt = parseAmount(pendingAmount);
  const parsedDiscountVal = parseAmount(discountValue);
  const discountAmt = discountType === 'percentage' 
    ? (totalBeforeDiscount * parsedDiscountVal / 100) 
    : parsedDiscountVal;
  const finalTotalAmount = Math.max(0, totalBeforeDiscount - discountAmt);
  const actualPaidAmount = Math.max(0, finalTotalAmount - parsedPendingAmt);

  const computedItems = items.map(item => {
    const itemTotal = parseAmount(item.paid_amount);
    const qty = parseInt(item.quantity, 10) || 1;
    const gstPct = parseAmount(item.gst_percentage);

    let itemPending = 0;
    if (parsedPendingAmt > 0 && totalBeforeDiscount > 0) {
      itemPending = parsedPendingAmt * (itemTotal / totalBeforeDiscount);
    }

    const grossPrice = itemTotal / qty;
    const unitPrice = grossPrice / (1 + gstPct / 100);
    const itemGst = qty * unitPrice * (gstPct / 100);

    return {
      ...item,
      unit_price: unitPrice.toFixed(2),
      gross_price: grossPrice.toFixed(2),
      gst_amount: parseFloat(itemGst.toFixed(2)),
      total_amount: parseFloat(itemTotal.toFixed(2)),
      pending_amount: itemPending
    };
  });

  const calculatedSubtotal = parseFloat(computedItems.reduce((sum, item) => sum + (parseAmount(item.unit_price) * (parseInt(item.quantity, 10) || 1)), 0).toFixed(2));
  const calculatedGstAmount = parseFloat(computedItems.reduce((sum, item) => sum + item.gst_amount, 0).toFixed(2));
  const calculatedTotalAmount = finalTotalAmount;

  useEffect(() => {
    if (status === 'cancelled') return;
    if (parsedPendingAmt === 0 && finalTotalAmount > 0) {
      setStatus('paid');
    } else {
      setStatus('pending');
    }
  }, [parsedPendingAmt, finalTotalAmount]);

  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    if (newStatus === 'paid') {
      setPendingAmount('0');
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
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!newCustName.trim()) {
      showToast('Please enter customer name', 'error');
      return;
    }

    const invalidItem = computedItems.some(item => !item.program_name.trim() || item.quantity <= 0 || parseAmount(item.unit_price) < 0);
    if (invalidItem) {
      showToast('Ensure all items have a program name, valid quantity and unit rate.', 'error');
      return;
    }

    // Create or reuse customer
    let finalCustomerId = customerId;
    if (!finalCustomerId) {
      try {
        const newCust = await addCustomer({
          name: newCustName.trim(),
          email: newCustEmail.trim(),
          phone: newCustPhone.trim(),
          gst_number: isIssuingNode ? '09AAHCI9258G1Z3' : newCustGst.trim(),
          address: newCustAddress.trim()
        });
        if (newCust && newCust.id) {
          finalCustomerId = newCust.id;
        } else {
          showToast('Failed to create customer', 'error');
          return;
        }
      } catch (err) {
        return;
      }
    } else {
      try {
        await updateCustomer(finalCustomerId, {
          name: newCustName.trim(),
          email: newCustEmail.trim(),
          phone: newCustPhone.trim(),
          gst_number: isIssuingNode ? '09AAHCI9258G1Z3' : newCustGst.trim(),
          address: newCustAddress.trim()
        });
      } catch (err) {
        console.error("Failed to update customer", err);
      }
    }

    const invoicePayload = {
      invoice_number: invoiceNumber,
      customer_id: finalCustomerId,
      invoice_date: invoiceDate,
      subtotal: calculatedSubtotal,
      gst_amount: calculatedGstAmount,
      total_amount: calculatedTotalAmount,
      paid_amount: actualPaidAmount,
      status
    };

    const metadataItem = {
      program_name: '__profile_metadata__',
      description: JSON.stringify({
        company_name: activeProfile?.company_name || 'I-SUCCESSNODE',
        gst_number: activeProfile?.gst_number || '',
        email: activeProfile?.email || '',
        phone: activeProfile?.phone || '',
        website: activeProfile?.website || '',
        address: activeProfile?.address || '',
        logo_url: activeProfile?.logo_url || '',
        discount_type: discountType,
        discount_value: parseAmount(discountValue),
        discount_amount: discountAmt,
        pending_amount: parsedPendingAmt
      }),
      quantity: 1,
      unit_price: 0,
      gst_percentage: 0,
      gst_amount: 0,
      total_amount: 0
    };

    const serializedItems = computedItems.map(item => ({
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
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
      navigate('/invoices');
    } catch (err) {
      console.error(err);
    }
  };

  const balanceDue = Math.max(0, calculatedTotalAmount - actualPaidAmount);

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
                <CustomSelect
                  required
                  value={selectedProfileId}
                  onChange={setSelectedProfileId}
                  options={[
                    ...profiles.map(p => ({
                      value: p.id,
                      label: p.company_name + (p.is_default ? ' (Default)' : ''),
                    })),
                    ...(selectedProfileId === 'custom-invoice-profile' ? [{
                      value: 'custom-invoice-profile',
                      label: (invoices.find(inv => inv.id === id)?.invoice_profile?.company_name || 'Saved') + ' (Saved Profile)',
                    }] : []),
                  ]}
                />
              </div>

              {/* Profile Details Mini-Preview Card */}
              <div className="md:col-span-2">
                {(() => {
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
                  placeholder="e.g. INV-2026-00014"
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
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. client@example.com"
                  value={newCustEmail}
                  onChange={(e) => setNewCustEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                  CIN Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. U16229UP2024PTC199657"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 uppercase tracking-wide mb-1.5">
                  GST Number (GSTIN)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 27AAAAA1111A1Z1"
                  value={isIssuingNode ? '09AAHCI9258G1Z3' : newCustGst}
                  onChange={(e) => setNewCustGst(e.target.value.toUpperCase())}
                  disabled={isIssuingNode}
                  className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm font-mono ${
                    isIssuingNode 
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
                rows="2"
                value={newCustAddress}
                onChange={(e) => setNewCustAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
              />
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
                      <CustomSelect
                        size="sm"
                        value={item.gst_percentage}
                        onChange={(v) => handleItemFieldChange(index, 'gst_percentage', parseInt(v, 10))}
                        options={[
                          { value: 0,  label: '0% GST (Exempted)' },
                          { value: 5,  label: '5% GST' },
                          { value: 12, label: '12% GST' },
                          { value: 18, label: '18% GST (Standard)' },
                          { value: 28, label: '28% GST (Luxury)' },
                        ]}
                      />
                    </div>
                  </div>

                  {/* Row Bottom Details: Description, Qty, Excl. Rate, Incl. Rate */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      <div className="md:col-span-6 relative description-preset-container">
                        <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                          Description (Optional)
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="e.g. Training / complementary"
                            value={item.description}
                            onChange={(e) => handleItemFieldChange(index, 'description', e.target.value)}
                            className="w-full pl-3 pr-8 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-850 dark:text-slate-205 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-xs font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => setOpenDescriptionIndex(openDescriptionIndex === index ? null : index)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-655 dark:text-slate-500 dark:hover:text-slate-350 rounded-md transition-colors cursor-pointer"
                            title="Select Description Preset"
                          >
                            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDescriptionIndex === index ? 'rotate-180 text-primary-500' : ''}`} />
                          </button>
                        </div>

                        {/* Presets suggestions dropdown */}
                        {openDescriptionIndex === index && (
                          <div className="absolute z-30 right-0 mt-1 w-52 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 shadow-xl overflow-hidden py-1 animate-dropdown-in">
                            <div className="px-3.5 py-1.5 border-b border-slate-100 dark:border-slate-800 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                              Quick Presets
                            </div>
                            {[
                              { label: '🎁 complementary (₹0)', value: 'complementary' },
                              { label: '🎈 Free Item (₹0)', value: 'Free' },
                              { label: '📚 Training Module', value: 'Training' },
                              { label: '⚙️ Service Fee', value: 'Service Fee' },
                              { label: '🛠️ Support Services', value: 'Support' }
                            ].map((preset) => (
                              <button
                                key={preset.value}
                                type="button"
                                onClick={() => {
                                  handleItemFieldChange(index, 'description', preset.value);
                                  if (preset.value.toLowerCase() === 'complementary' || preset.value.toLowerCase() === 'free') {
                                    handleItemFieldChange(index, 'paid_amount', '0');
                                    handleItemFieldChange(index, 'gst_percentage', 0);
                                  }
                                  setOpenDescriptionIndex(null);
                                }}
                                className="w-full text-left px-3.5 py-2 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer font-medium"
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        )}
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
                        <label className="block text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wide mb-1 text-right">
                          Price (incl. GST) (₹)
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="0.00"
                          value={item.paid_amount}
                          onChange={(e) => handleItemFieldChange(index, 'paid_amount', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-850 dark:text-slate-100 text-right focus:outline-none focus:ring-2 focus:ring-primary-500/10 focus:border-primary-500 transition-all text-xs font-mono font-bold"
                          title="Original price of the course inclusive of GST (pre-discount)"
                        />
                      </div>

                      <div className="md:col-span-3 flex justify-between items-center pl-2 pb-1.5">
                        <div className="text-[10px] text-right font-semibold text-slate-400 leading-tight">
                          <div>Total: <span className="text-slate-800 dark:text-slate-200 font-bold">₹{computedItems[index]?.total_amount}</span></div>
                          <div className="mt-0.5">
                            Pending: <span className={`${(computedItems[index]?.pending_amount || 0) > 0 ? 'text-amber-600 font-bold' : 'text-slate-400 font-medium'}`}>
                              ₹{(computedItems[index]?.pending_amount || 0).toFixed(2)}
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
                <span className="font-bold">₹{calculatedSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Total GST Collected</span>
                <span className="font-bold">₹{calculatedGstAmount.toFixed(2)}</span>
              </div>
              
              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <span>Gross Amount (Pre-Discount)</span>
                <span className="font-bold">₹{totalBeforeDiscount.toFixed(2)}</span>
              </div>

              {discountAmt > 0 && (
                <div className="flex justify-between items-center text-rose-600">
                  <span>Discount ({discountType === 'percentage' ? `${discountValue}%` : '₹'})</span>
                  <span className="font-bold">-₹{discountAmt.toFixed(2)}</span>
                </div>
              )}
              
              <div className="h-px bg-slate-100 dark:bg-slate-800" />
              
              <div className="flex justify-between items-center text-sm font-bold text-slate-800 dark:text-white">
                <span>Gross Payable</span>
                <span className="text-primary-600 dark:text-primary-400">₹{calculatedTotalAmount.toFixed(2)}</span>
              </div>
              
              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                     <div>
                      <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-455 uppercase tracking-wide mb-1">
                        Discount Type
                      </label>
                      <CustomSelect
                        size="sm"
                        value={discountType}
                        onChange={setDiscountType}
                        options={[
                          { value: 'percentage', label: 'Percentage (%)' },
                          { value: 'rupees',     label: 'Rupees (₹)' },
                        ]}
                      />
                    </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-455 uppercase tracking-wide mb-1">
                      Discount Value
                    </label>
                    <input
                      type="text"
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-right focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm font-semibold"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-450 uppercase tracking-wide mb-1">
                    Amount Paid (₹)
                  </label>
                  <div className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-right text-sm font-semibold">
                    ₹{actualPaidAmount.toFixed(2)}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-450 uppercase tracking-wide mb-1">
                    Pending Amt (₹)
                  </label>
                  <input
                    type="text"
                    required
                    value={pendingAmount}
                    onChange={(e) => setPendingAmount(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-right focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm font-semibold"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-450 uppercase tracking-wide mb-1">
                    Invoice Payment Status
                  </label>
                  <CustomSelect
                    size="sm"
                    value={status}
                    onChange={handleStatusChange}
                    options={[
                      { value: 'pending',   label: '🕐 Pending Receipt' },
                      { value: 'paid',      label: '✅ Paid Invoice' },
                      { value: 'cancelled', label: '❌ Cancelled' },
                    ]}
                  />
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


    </div>
  );
};
export default InvoiceForm;
