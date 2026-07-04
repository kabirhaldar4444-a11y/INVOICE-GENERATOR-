import React from 'react';
import { Menu, Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Navbar = ({ toggleSidebar, title, isSidebarOpen }) => {
  const { profile } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-slate-100 dark:border-slate-850 transition-colors">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className={`p-2 -ml-2 rounded-xl text-slate-500 hover:bg-slate-150 dark:hover:bg-slate-800 transition-colors ${
            isSidebarOpen ? 'lg:hidden' : 'flex'
          }`}
          aria-label="Open navigation sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="font-display font-semibold text-lg text-slate-800 dark:text-white">{title}</h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications mock icon */}
        <button 
          className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
          aria-label="View notifications"
        >
          <Bell className="w-4.5 h-4.5" />
        </button>
        
        {/* User initials tag */}
        <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-slate-100 dark:border-slate-800">
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{profile?.email ? profile.email.split('@')[0] : 'Admin'}</p>
            <p className="text-[10px] font-medium text-slate-400">Authorized Agent</p>
          </div>
        </div>
      </div>
    </header>
  );
};
