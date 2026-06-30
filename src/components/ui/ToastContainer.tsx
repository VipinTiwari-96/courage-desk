import type { Toast } from '../../hooks/useToast';

interface Props { toasts: Toast[]; }

const icons = { success: '✅', error: '❌', info: 'ℹ️' };

export function ToastContainer({ toasts }: Props) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span>{icons[t.type]}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
