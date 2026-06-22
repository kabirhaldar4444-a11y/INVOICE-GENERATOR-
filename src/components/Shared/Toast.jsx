import React from 'react';
import { useApp } from '../../context/AppContext';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts, removeToast } = useApp();

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, onClose }) => {
  const { message, type } = toast;

  const getStyle = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-white dark:bg-slate-800 border-l-4 border-emerald-500 shadow-emerald-100/50 dark:shadow-none',
          icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
        };
      case 'error':
        return {
          bg: 'bg-white dark:bg-slate-800 border-l-4 border-rose-500 shadow-rose-100/50 dark:shadow-none',
          icon: <AlertCircle className="w-5 h-5 text-rose-500" />,
        };
      case 'info':
      default:
        return {
          bg: 'bg-white dark:bg-slate-800 border-l-4 border-indigo-500 shadow-indigo-100/50 dark:shadow-none',
          icon: <Info className="w-5 h-5 text-indigo-500" />,
        };
    }
  };

  const style = getStyle();

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50 shadow-lg transition-all duration-300 transform translate-x-0 slide-in-right ${style.bg}`}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">{style.icon}</div>
      <div className="flex-grow">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
