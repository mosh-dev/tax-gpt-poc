import { useToast } from '../../hooks/useToast';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const colorMap = {
  success: 'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-800 dark:text-green-400',
  error: 'bg-red-50 dark:bg-red-900/20 border-red-500 text-red-800 dark:text-red-400',
  info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-800 dark:text-blue-400',
  warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 text-yellow-800 dark:text-yellow-400',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        const colorClass = colorMap[toast.type];

        return (
          <div
            key={toast.id}
            className={`${colorClass} border-l-4 p-4 rounded-lg shadow-lg flex items-start gap-3 animate-slide-in-right`}
          >
            <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 hover:opacity-70 transition-opacity"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
