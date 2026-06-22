import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

export const ConfirmDialog = ({ 
  isOpen, 
  title, 
  message, 
  type = 'info', 
  confirmText = 'Confirm', 
  cancelText = 'Cancel', 
  onConfirm, 
  onCancel, 
  isAlert = false 
}) => {
  if (!isOpen) return null;

  const getTypeStyle = () => {
    switch (type) {
      case 'danger':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-rose-500" />,
          iconBg: 'bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30',
          confirmBtn: 'bg-rose-600 hover:bg-rose-700 text-white focus:ring-2 focus:ring-rose-500/20 shadow-md shadow-rose-500/10',
          accentBorder: 'border-t-4 border-t-rose-500',
        };
      case 'warning':
        return {
          icon: <AlertCircle className="w-6 h-6 text-amber-500" />,
          iconBg: 'bg-amber-50 dark:bg-amber-955/20 border border-amber-100 dark:border-amber-900/30',
          confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white focus:ring-2 focus:ring-amber-500/20 shadow-md shadow-amber-500/10',
          accentBorder: 'border-t-4 border-t-amber-500',
        };
      case 'success':
        return {
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-500" />,
          iconBg: 'bg-emerald-50 dark:bg-emerald-955/20 border border-emerald-100 dark:border-emerald-900/30',
          confirmBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white focus:ring-2 focus:ring-emerald-500/20 shadow-md shadow-emerald-500/10',
          accentBorder: 'border-t-4 border-t-emerald-500',
        };
      case 'info':
      default:
        return {
          icon: <Info className="w-6 h-6 text-primary-500" />,
          iconBg: 'bg-primary-50 dark:bg-primary-955/20 border border-primary-100 dark:border-primary-900/30',
          confirmBtn: 'bg-primary-600 hover:bg-primary-700 text-white focus:ring-2 focus:ring-primary-500/20 shadow-md shadow-primary-500/10',
          accentBorder: 'border-t-4 border-t-primary-500',
        };
    }
  };

  const style = getTypeStyle();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/65 backdrop-blur-md transition-all duration-300">
      {/* Backdrop click barrier */}
      <div className="absolute inset-0" onClick={isAlert ? onConfirm : onCancel} />
      
      {/* Modal Card */}
      <div 
        className={`relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden animate-scale-up ${style.accentBorder}`}
        role="dialog"
        aria-modal="true"
      >
        {/* Content Section */}
        <div className="p-6">
          <div className="flex gap-4">
            <div className={`flex-shrink-0 p-3 rounded-2xl h-fit self-start ${style.iconBg}`}>
              {style.icon}
            </div>
            
            <div className="flex-grow min-w-0">
              <h3 className="font-display font-bold text-lg text-slate-850 dark:text-slate-100 leading-snug">
                {title}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/80">
          {!isAlert && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-350 active:scale-[0.98] rounded-xl text-sm font-semibold transition-all cursor-pointer"
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.98] cursor-pointer ${style.confirmBtn}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
