import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatCurrency, exportToCSV } from '../../utils/helpers';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { 
  DollarSign, 
  Receipt, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  TrendingUp, 
  Download, 
  ArrowUpRight,
  UserCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const { invoices, customers, loadingStates } = useApp();
  const navigate = useNavigate();

  // CALCULATING METRICS
  const totalInvoicesCount = invoices.length;
  
  // Paid Invoices Metrics
  const paidInvoices = invoices.filter(i => i.status === 'paid');
  const paidInvoicesCount = paidInvoices.length;
  const totalRevenue = paidInvoices.reduce((acc, curr) => acc + (parseFloat(curr.total_amount) || 0), 0);
  const gstCollected = paidInvoices.reduce((acc, curr) => acc + (parseFloat(curr.gst_amount) || 0), 0);

  // Pending Invoices Metrics
  const pendingInvoices = invoices.filter(i => i.status === 'pending');
  const pendingInvoicesCount = pendingInvoices.length;
  const totalPendingAmount = pendingInvoices.reduce((acc, curr) => {
    const total = parseFloat(curr.total_amount) || 0;
    const paid = parseFloat(curr.paid_amount) || 0;
    return acc + (total - paid);
  }, 0);

  // Recent Invoices (Limit to 5)
  const recentInvoices = invoices.slice(0, 5);

  // CHART DATA COMPILING (Group by Month)
  const getChartData = () => {
    const monthlyMap = {};
    
    // Sort invoices ascending by date for chronological trend
    const sortedInvs = [...invoices].sort((a, b) => new Date(a.invoice_date) - new Date(b.invoice_date));

    sortedInvs.forEach(inv => {
      if (!inv.invoice_date) return;
      const date = new Date(inv.invoice_date);
      const monthYear = date.toLocaleString('en-US', { month: 'short', year: '2-digit' }); // e.g. "Jun 26"
      
      const total = parseFloat(inv.total_amount) || 0;
      const gst = parseFloat(inv.gst_amount) || 0;
      const paid = parseFloat(inv.paid_amount) || 0;

      if (!monthlyMap[monthYear]) {
        monthlyMap[monthYear] = { month: monthYear, billed: 0, revenue: 0, gst: 0 };
      }

      monthlyMap[monthYear].billed += total;
      monthlyMap[monthYear].gst += gst;
      if (inv.status === 'paid') {
        monthlyMap[monthYear].revenue += total;
      } else {
        monthlyMap[monthYear].revenue += paid;
      }
    });

    return Object.values(monthlyMap);
  };

  const chartData = getChartData();

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
    <div className="space-y-6">
      
      {/* Top Welcome Panel & Export actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 transition-colors shadow-xs">
        <div>
          <h2 className="font-display font-black text-xl text-slate-800 dark:text-white leading-tight">Billing Center</h2>
          <p className="text-xs text-slate-400 mt-1">Real-time accounting stats, GST tracking, and audit operations.</p>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={handleExportInvoices}
            className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-1.5 py-2 px-3.5 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-205 text-xs font-semibold rounded-xl transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" /> Export Invoices
          </button>
          <button
            onClick={handleExportCustomers}
            className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-1.5 py-2 px-3.5 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-205 text-xs font-semibold rounded-xl transition-all shadow-xs"
          >
            <Download className="w-3.5 h-3.5" /> Export Customers
          </button>
        </div>
      </div>

      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Total Revenue */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-all hover:scale-[1.01] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Revenue</span>
            <h3 className="font-display font-black text-xl text-slate-800 dark:text-white mt-1.5">
              {formatCurrency(totalRevenue)}
            </h3>
            <span className="text-[10px] text-slate-400 mt-1 block">From paid invoices</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 flex items-center justify-center">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* GST Collected */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-all hover:scale-[1.01] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">GST Collected</span>
            <h3 className="font-display font-black text-xl text-slate-800 dark:text-white mt-1.5">
              {formatCurrency(gstCollected)}
            </h3>
            <span className="text-[10px] text-slate-400 mt-1 block">GSTIN registered pool</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        {/* Paid Invoices count */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-all hover:scale-[1.01] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Paid Invoices</span>
            <h3 className="font-display font-black text-xl text-slate-800 dark:text-white mt-1.5">
              {paidInvoicesCount} <span className="text-xs font-semibold text-slate-400">/ {totalInvoicesCount}</span>
            </h3>
            <span className="text-[10px] text-slate-400 mt-1 block">Completed transactions</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/20 text-teal-500 flex items-center justify-center">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Pending Invoices */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm transition-all hover:scale-[1.01] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Balance Pending</span>
            <h3 className="font-display font-black text-xl text-amber-600 dark:text-amber-450 mt-1.5">
              {formatCurrency(totalPendingAmount)}
            </h3>
            <span className="text-[10px] text-slate-450 mt-1 block">{pendingInvoicesCount} invoices due</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-500 flex items-center justify-center">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Visual Chart Analysis & Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Charts block */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 transition-colors shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            <h3 className="font-display font-bold text-base text-slate-800 dark:text-white">Revenue & GST Trends</h3>
          </div>

          <div className="h-72 w-full text-xs font-semibold">
            {chartData.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                <FileText className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-slate-400">No transactions recorded yet to display trends</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorBilled" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorGst" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                  <XAxis dataKey="month" tickLine={false} stroke="#94a3b8" />
                  <YAxis tickLine={false} stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.96)', 
                      borderColor: '#e2e8f0',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)'
                    }} 
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Area type="monotone" name="Billed Amount" dataKey="billed" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorBilled)" />
                  <Area type="monotone" name="GST Collected" dataKey="gst" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorGst)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Activity Log */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 transition-colors shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-display font-bold text-base text-slate-800 dark:text-white">Recent Activities</h3>
            <button 
              onClick={() => navigate('/invoices')}
              className="text-[10px] text-primary-600 hover:text-primary-700 font-bold flex items-center gap-0.5"
            >
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {recentInvoices.length === 0 ? (
              <div className="text-center py-16">
                <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-semibold">No recent activity</p>
              </div>
            ) : (
              recentInvoices.map((inv) => (
                <div 
                  key={inv.id}
                  onClick={() => navigate(`/invoices/${inv.id}`)}
                  className="flex justify-between items-center p-3 border border-slate-50 dark:border-slate-800/60 rounded-xl text-xs hover:bg-slate-50/70 dark:hover:bg-slate-800/40 cursor-pointer transition-all"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-850 dark:text-slate-200">{inv.invoice_number}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{inv.customers?.name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-slate-850 dark:text-slate-205">{formatCurrency(inv.total_amount)}</p>
                    <span className={`inline-block text-[8px] font-bold px-1.5 py-0.2 rounded-full mt-1 ${
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
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
