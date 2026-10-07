import React from 'react';
import { useSocket } from '../context/SocketContext';
import { Bell, CheckCircle, AlertTriangle, X } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useSocket();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-stack">
      {toasts.map((toast) => (
        <div key={toast.id} className="toast" style={{
          borderLeftColor: toast.type === 'admin' ? '#3B82F6' : toast.type === 'employee' ? '#10B981' : '#F59E0B'
        }}>
          <div style={{ marginTop: '2px', color: toast.type === 'admin' ? '#60A5FA' : toast.type === 'employee' ? '#34D399' : '#FBBF24' }}>
            {toast.type === 'admin' ? <Bell size={18} /> : toast.type === 'employee' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#94A3B8' }}>
              {toast.title}
            </div>
            <div style={{ marginTop: '2px', lineHeight: 1.35, fontSize: '0.85rem' }}>
              {toast.message}
            </div>
          </div>
          <button 
            onClick={() => removeToast(toast.id)}
            style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '2px' }}
          >
            <X size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
