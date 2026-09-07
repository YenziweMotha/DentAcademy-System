import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, leaving: true } : t))
    );
    clearTimeout(timers.current[id]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      delete timers.current[id];
    }, 180);
  }, []);

  const push = useCallback(
    (type, message, duration = 4000) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev.slice(-4), { id, type, message, leaving: false }]);
      timers.current[id] = setTimeout(() => dismiss(id), duration);
    },
    [dismiss]
  );

  const toast = useCallback(
    {
      success: (msg) => push('success', msg),
      error: (msg) => push('error', msg, 6000),
      info: (msg) => push('info', msg),
      warning: (msg) => push('warning', msg, 5000),
    },
    [push]
  );

  const styles = {
    success:
      'bg-emerald-600 text-white border-emerald-500/30 dark:bg-emerald-700',
    error: 'bg-rose-600 text-white border-rose-500/30 dark:bg-rose-700',
    info: 'bg-slate-800 text-white border-slate-700 dark:bg-slate-700',
    warning: 'bg-amber-600 text-white border-amber-500/30 dark:bg-amber-700',
  };

  const icons = {
    success: CheckCircle2,
    error: XCircle,
    info: Info,
    warning: AlertTriangle,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div
        className="fixed top-4 right-4 z-[60] flex flex-col gap-2 w-[min(22rem,calc(100vw-2rem))]"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const Icon = icons[t.type] || Info;
          return (
            <div
              key={t.id}
              role="status"
              className={`flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-lift border ${styles[t.type]} ${
                t.leaving ? 'animate-toast-out' : 'animate-toast-in'
              }`}
            >
              <Icon size={18} className="shrink-0 mt-0.5" />
              <p className="text-sm leading-snug flex-1 break-words font-medium">
                {t.message}
              </p>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 opacity-70 hover:opacity-100 transition-opacity p-0.5 rounded"
                aria-label="Dismiss notification"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
