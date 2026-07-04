import React from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate, exportToCSV } from '../../utils/helpers';
import { 
  Plus, 
  Receipt, 
  Users, 
  Settings, 
  Download, 
  Eye, 
  ArrowRight,
  Sparkles,
  Calendar,
  Layers,
  Database
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const { invoices, customers } = useApp();
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  // Get current greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  // Get display name for the user
  const getUserDisplayName = () => {
    if (profile?.company_name) return profile.company_name;
    if (profile?.email) return profile.email.split('@')[0];
    if (user?.email) return user.email.split('@')[0];
    return 'Admin';
  };

  // Get formatted current date
  const getFormattedDate = () => {
    return new Intl.DateTimeFormat('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date());
  };

  // Recent 5 invoices
  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.created_at || b.invoice_date) - new Date(a.created_at || a.invoice_date))
    .slice(0, 5);

  // EXPORTS
  const handleExportInvoices = () => {
    const data = invoices.map(i => ({
      'Invoice Code': i.invoice_number,
      'Customer Name': i.customers?.name || 'Deleted Customer',
      'Customer Email': i.customers?.email || '',
      'Issue Date': i.invoice_date,
      'Subtotal Amount': i.subtotal,
      'GST Amount': i.gst_amount,
      'Gross Amount': i.total_amount,
      'Receipt Paid Amount': i.paid_amount,
      'Status': i.status
    }));
    exportToCSV(
      data, 
      ['Invoice Code', 'Customer Name', 'Customer Email', 'Issue Date', 'Subtotal Amount', 'GST Amount', 'Gross Amount', 'Receipt Paid Amount', 'Status'], 
      'invoices_audit_log.csv'
    );
  };

  const handleExportCustomers = () => {
    const data = customers.map(c => ({
      'Customer Name': c.name,
      'Email': c.email,
      'Phone': c.phone || '',
      'GSTIN': c.gst_number || '',
      'Address': c.address || ''
    }));
    exportToCSV(
      data, 
      ['Customer Name', 'Email', 'Phone', 'GSTIN', 'Address'], 
      'customers_database.csv'
    );
  };

  return (
    <div className="space-y-8 animate-scale-up">
      
      {/* 1. Welcoming Hero Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 rounded-3xl p-6 md:p-8 text-white shadow-lg border border-indigo-500/25">
        {/* Decorative background shapes */}
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 pointer-events-none hidden md:block">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <circle cx="50" cy="50" r="40" fill="currentColor" />
            <circle cx="90" cy="10" r="25" fill="currentColor" />
          </svg>
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/15">
              <Calendar className="w-3.5 h-3.5" />
              {getFormattedDate()}
            </div>
            <h1 className="font-display font-black text-2xl md:text-3xl tracking-tight leading-tight">
              {getGreeting()}, {getUserDisplayName()}
            </h1>
            <p className="text-sm text-indigo-100 max-w-xl">
              Welcome back to your billing dashboard. Draft professional invoices, maintain your customer records, and review recent activity from one central hub.
            </p>
          </div>
          
          <div className="flex-shrink-0">
            <button
              onClick={() => navigate('/invoices/new')}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-white text-indigo-600 hover:bg-indigo-50 font-bold rounded-xl transition-all shadow-md active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              New Invoice
            </button>
          </div>
        </div>
      </div>

      {/* 2. Workspace Navigation Shortcuts */}
      <div className="space-y-4">
        <h2 className="font-display font-bold text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Quick Shortcuts
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Create Invoice */}
          <button
            onClick={() => navigate('/invoices/new')}
            className="flex flex-col items-start p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-violet-300 dark:hover:border-violet-750 group cursor-pointer w-full"
          >
            <div className="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/20 text-violet-500 transition-colors group-hover:bg-violet-500 group-hover:text-white mb-4">
              <Plus className="w-5 h-5" />
            </div>
            <h3 className="font-display font-extrabold text-base text-slate-800 dark:text-white mb-1">
              New Tax Invoice
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Create a new itemized GST invoice for clients.
            </p>
          </button>

          {/* Manage Invoices */}
          <button
            onClick={() => navigate('/invoices')}
            className="flex flex-col items-start p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-750 group cursor-pointer w-full"
          >
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 transition-colors group-hover:bg-emerald-500 group-hover:text-white mb-4">
              <Receipt className="w-5 h-5" />
            </div>
            <h3 className="font-display font-extrabold text-base text-slate-800 dark:text-white mb-1">
              Invoice Registry
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Browse, print, duplicate, or delete billing records.
            </p>
          </button>

          {/* Customer Directory */}
          <button
            onClick={() => navigate('/customers')}
            className="flex flex-col items-start p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-750 group cursor-pointer w-full"
          >
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-500 transition-colors group-hover:bg-blue-500 group-hover:text-white mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-display font-extrabold text-base text-slate-800 dark:text-white mb-1">
              Customer Directory
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Add new clients and store their GST registration.
            </p>
          </button>

          {/* Company Profiles */}
          <button
            onClick={() => navigate('/settings')}
            className="flex flex-col items-start p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-rose-300 dark:hover:border-rose-750 group cursor-pointer w-full"
          >
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-500 transition-colors group-hover:bg-rose-500 group-hover:text-white mb-4">
              <Settings className="w-5 h-5" />
            </div>
            <h3 className="font-display font-extrabold text-base text-slate-800 dark:text-white mb-1">
              Company Settings
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Update billing addresses, logo, and defaults.
            </p>
          </button>

        </div>
      </div>

      {/* 3. Streamlined Recent Activity */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-sm uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Recent Invoices
          </h2>
          <button
            onClick={() => navigate('/invoices')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors cursor-pointer"
          >
            View all
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
            <Sparkles className="w-8 h-8 text-indigo-500 mx-auto mb-3 opacity-60" />
            <h3 className="font-display font-bold text-slate-700 dark:text-slate-300 mb-1">No invoices found</h3>
            <p className="text-xs text-slate-450 mb-4 max-w-xs mx-auto">Create your first tax invoice to start recording transactions in your ledger.</p>
            <button
              onClick={() => navigate('/invoices/new')}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              New Invoice
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
                    <th className="py-4 px-6">Invoice Code</th>
                    <th className="py-4 px-6">Client</th>
                    <th className="py-4 px-6">Issue Date</th>
                    <th className="py-4 px-6">Total Amount</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-xs">
                  {recentInvoices.map((inv) => (
                    <tr 
                      key={inv.id}
                      onClick={() => navigate(`/invoices/${inv.id}`)}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 cursor-pointer transition-colors"
                    >
                      <td className="py-4 px-6 font-bold text-slate-800 dark:text-slate-205">
                        {inv.invoice_number}
                      </td>
                      <td className="py-4 px-6 text-slate-600 dark:text-slate-300 font-medium">
                        {inv.customers?.name || 'Deleted Customer'}
                      </td>
                      <td className="py-4 px-6 text-slate-450 dark:text-slate-400">
                        {formatDate(inv.invoice_date)}
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-800 dark:text-slate-205">
                        {formatCurrency(inv.total_amount)}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          inv.status === 'paid' 
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450' 
                            : inv.status === 'cancelled'
                            ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-450'
                            : 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/invoices/${inv.id}`)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                          title="View Invoice"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 4. Utility Exports Footer */}
      <div className="p-6 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-1">
          <h3 className="font-display font-extrabold text-sm text-slate-700 dark:text-slate-300">
            Data Portability
          </h3>
          <p className="text-xs text-slate-450 leading-relaxed">
            Backup your ledger records and customer profiles locally in standard CSV format at any time.
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleExportInvoices}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 py-2 px-4 bg-white dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-750 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all shadow-xs active:scale-98 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Invoices
          </button>
          <button
            onClick={handleExportCustomers}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-1.5 py-2 px-4 bg-white dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-750 dark:text-slate-200 text-xs font-semibold rounded-xl transition-all shadow-xs active:scale-98 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export Customers
          </button>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
