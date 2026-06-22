import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Settings as SettingsIcon, 
  LogOut, 
  Sun, 
  Moon,
  ReceiptText
} from 'lucide-react';

export const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { logout, profile } = useAuth();
  const { darkMode, toggleTheme } = useApp();

  const navigation = [
    { name: 'Dashboard', to: '/', icon: LayoutDashboard },
    { name: 'Invoices', to: '/invoices', icon: FileText },
    { name: 'Customers', to: '/customers', icon: Users },
    { name: 'Settings', to: '/settings', icon: SettingsIcon },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar Panel */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700/60 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-600 text-white shadow-lg shadow-primary-500/20">
            <ReceiptText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display font-bold text-lg text-slate-800 dark:text-white leading-tight">Invoisify</h1>
            <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 tracking-wider uppercase">SaaS Portal</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-grow px-4 py-6 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              onClick={() => {
                if (window.innerWidth < 1024) toggleSidebar();
              }}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 shadow-sm shadow-primary-500/5'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700/40 hover:text-slate-800 dark:hover:text-slate-200'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* Footer controls and profile */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-700/60 space-y-4">
          {/* Logout */}
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl border border-rose-200 dark:border-rose-900/30 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-450 transition-colors font-semibold text-xs cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>

          {/* User Profile Info Card */}
          <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-slate-700/20 rounded-xl border border-slate-100 dark:border-slate-700/40">
            <div className="w-9 h-9 rounded-lg bg-primary-100 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 font-semibold flex items-center justify-center text-sm uppercase">
              {profile?.email ? profile.email.charAt(0) : 'A'}
            </div>
            <div className="min-w-0 flex-grow">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">
                {profile?.email || 'Admin User'}
              </p>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide capitalize">
                {profile?.role || 'Admin'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
