import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from '../Shared/Sidebar';
import { Navbar } from '../Shared/Navbar';
import { ToastContainer } from '../Shared/Toast';

export const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 1024);
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Overview Dashboard';
    if (path.startsWith('/invoices')) {
      if (path.includes('/new')) return 'Create Tax Invoice';
      if (path.includes('/edit')) return 'Edit Tax Invoice';
      return 'Invoice Management';
    }
    if (path.startsWith('/customers')) return 'Customer Database';
    if (path.startsWith('/settings')) return 'Company Configuration';
    return 'Tax Invoice SaaS';
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
      
      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <Navbar toggleSidebar={() => setSidebarOpen(!sidebarOpen)} isSidebarOpen={sidebarOpen} title={getPageTitle()} />
        
        <main className="flex-grow p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};
export default DashboardLayout;
