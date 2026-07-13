import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { formatCurrency, formatDate } from '../../utils/helpers';
import { generateInvoicePDF } from '../../utils/pdfGenerator';
import CustomSelect from '../Shared/CustomSelect';
import { 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  Trash2, 
  Copy, 
  Download, 
  ReceiptText, 
  Filter, 
  Calendar,
  ChevronDown
} from 'lucide-react';

export const InvoiceList = () => {
  const { invoices, settings, deleteInvoice, duplicateInvoice, showToast, loadingStates, confirm, profiles } = useApp();
  const navigate = useNavigate();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    const confirmed = await confirm({
      title: 'Delete Invoice',
      message: 'Are you sure you want to delete this invoice?',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (confirmed) {
      try {
        await deleteInvoice(id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleDuplicate = async (id, e) => {
    e.stopPropagation();
    try {
      await duplicateInvoice(id);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadPDF = async (inv, e) => {
    e.stopPropagation();
    try {
      showToast('Generating PDF Document...', 'info');
      const pdfBytes = await generateInvoicePDF(inv, settings);
      
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const cxName = inv.customers?.name || inv.customer_name || 'Customer';
      const safeCxName = cxName.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '_');
      link.download = `${safeCxName}_GST.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Invoice PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate PDF. Verify company settings.', 'error');
    }
  };

  // Run filters
  const filteredInvoices = invoices.filter((inv) => {
    // 1. Search Query (invoice number, customer name, customer email, company name)
    const invCompany = inv.invoice_profile?.company_name || settings?.company_name || 'I-SUCCESSNODE';
    const matchesSearch = 
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.customers?.name && inv.customers.name.toLowerCase().includes(search.toLowerCase())) ||
      (inv.customers?.email && inv.customers.email.toLowerCase().includes(search.toLowerCase())) ||
      invCompany.toLowerCase().includes(search.toLowerCase());

    // 2. Status
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;

    // 3. Company Filter
    let matchesCompany = true;
    if (companyFilter !== 'all') {
      matchesCompany = invCompany.toLowerCase() === companyFilter.toLowerCase();
    }

    // 4. Date Range
    let matchesDate = true;
    if (dateFrom) {
      matchesDate = matchesDate && new Date(inv.invoice_date) >= new Date(dateFrom);
    }
    if (dateTo) {
      matchesDate = matchesDate && new Date(inv.invoice_date) <= new Date(dateTo);
    }

    return matchesSearch && matchesStatus && matchesCompany && matchesDate;
  });

  return (
    <div className="space-y-6">
      
      {/* Search and Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors shadow-sm">
        <div className="flex flex-grow gap-2 max-w-lg">
          <div className="relative flex-grow">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
              <Search className="w-4.5 h-4.5" />
            </span>
            <input
              type="text"
              placeholder="Search by invoice number, customer, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
            />
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3.5 rounded-xl border border-slate-205 dark:border-slate-700 transition-all text-sm font-semibold ${
              showFilters || statusFilter !== 'all' || companyFilter !== 'all' || dateFrom || dateTo
                ? 'bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 border-primary-300'
                : 'bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-305'
            }`}
          >
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>

        <Link
          to="/invoices/new"
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all shadow-md shadow-primary-500/10 hover:shadow-primary-500/20 active:scale-[0.98] text-sm"
        >
          <Plus className="w-4 h-4" /> Create Invoice
        </Link>
      </div>

      {/* Advanced Filter Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl transition-colors shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-scale-up">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-455 uppercase tracking-wide mb-1.5">
              Payment Status
            </label>
            <CustomSelect
              size="sm"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'all',       label: 'All Statuses' },
                { value: 'paid',      label: '✅ Paid' },
                { value: 'pending',   label: '🕐 Pending' },
                { value: 'cancelled', label: '❌ Cancelled' },
              ]}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-455 uppercase tracking-wide mb-1.5">
              Company Profile
            </label>
            <CustomSelect
              size="sm"
              value={companyFilter}
              onChange={setCompanyFilter}
              options={[
                { value: 'all', label: 'All Companies' },
                ...profiles.map(p => ({ value: p.company_name, label: p.company_name })),
              ]}
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-455 uppercase tracking-wide mb-1.5">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-455 uppercase tracking-wide mb-1.5">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all"
            />
          </div>
        </div>
      )}

      {/* Invoice Directory List Grid */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 transition-colors shadow-sm">
        <h3 className="font-display font-bold text-base text-slate-800 dark:text-white mb-4">Invoice Log</h3>

        {loadingStates.invoices ? (
          <div className="space-y-3 py-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-16 w-full bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-slate-150 dark:border-slate-800 rounded-2xl">
            <ReceiptText className="w-12 h-12 text-slate-350 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold">No invoices found</p>
            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Refine search criteria or create a new invoice to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800/60 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Invoice Code</th>
                  <th className="pb-3">Company</th>
                  <th className="pb-3">Client</th>
                  <th className="pb-3">Issue Date</th>
                  <th className="pb-3">Total Amount</th>
                  <th className="pb-3">Balance Due</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredInvoices.map((inv) => {
                  const netDue = Math.max(0, inv.total_amount - inv.paid_amount);
                  return (
                    <tr 
                      key={inv.id}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors group"
                    >
                      <td className="py-4 pl-2 font-mono text-sm font-bold text-slate-850 dark:text-slate-205 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        {inv.invoice_number}
                      </td>
                      <td className="py-4 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {inv.invoice_profile?.company_name || settings?.company_name || 'I-SUCCESSNODE'}
                      </td>
                      <td className="py-4">
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          {inv.customers?.name || 'Deleted Customer'}
                        </div>
                        {inv.customers?.email && (
                          <div className="text-[10px] text-slate-400 dark:text-slate-500">{inv.customers.email}</div>
                        )}
                      </td>
                      <td className="py-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                        {formatDate(inv.invoice_date)}
                      </td>
                      <td className="py-4 text-sm font-bold text-slate-800 dark:text-slate-200">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td className="py-4 text-xs font-bold text-slate-650 dark:text-slate-400">
                        {netDue > 0 ? (
                          <span className="text-amber-600 dark:text-amber-400 font-bold">{formatCurrency(netDue)}</span>
                        ) : (
                          <span className="text-slate-400 font-medium">Fully Paid</span>
                        )}
                      </td>
                      <td className="py-4">
                        <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          inv.status === 'paid' 
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450' 
                            : inv.status === 'cancelled'
                            ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450'
                            : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-4 text-right pr-2 animate-icon" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => navigate(`/invoices/${inv.id}`)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Preview invoice detail"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/invoices/${inv.id}/edit`)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Edit Invoice"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDuplicate(inv.id, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-colors"
                            title="Duplicate invoice details"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDownloadPDF(inv, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-primary-650 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Export PDF copy"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => handleDelete(inv.id, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                            title="Delete invoice record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default InvoiceList;
