'use client';

import React, { useEffect, useState } from 'react';

type ToastKind = 'success' | 'error' | 'info';

type ToastItem = {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
};

type ToastInput = Omit<ToastItem, 'id'>;

let pushToastImpl: ((toast: ToastInput) => void) | null = null;

export function pushToast(toast: ToastInput) {
  if (pushToastImpl) {
    pushToastImpl(toast);
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    pushToastImpl = toast => {
      const id = crypto.randomUUID();
      setToasts(prev => [...prev, { ...toast, id }]);
      window.setTimeout(() => {
        setToasts(prev => prev.filter(item => item.id !== id));
      }, 3500);
    };

    return () => {
      pushToastImpl = null;
    };
  }, []);

  return (
    <>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-[min(92vw,22rem)]">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`rounded-2xl border px-4 py-3 shadow-lg backdrop-blur-sm ${
              toast.kind === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : toast.kind === 'error'
                  ? 'border-red-200 bg-red-50 text-red-900'
                  : 'border-slate-200 bg-white text-slate-900'
            }`}
          >
            <p className="font-bold text-sm">{toast.title}</p>
            {toast.description && <p className="mt-1 text-xs opacity-80">{toast.description}</p>}
          </div>
        ))}
      </div>
    </>
  );
}
