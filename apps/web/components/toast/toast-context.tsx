'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

type ToastType = 'success' | 'error';

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [leavingIds, setLeavingIds] = useState<Set<number>>(new Set());

  const remove = useCallback((id: number) => {
    setLeavingIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      setLeavingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 200);
  }, []);

  const push = useCallback(
    (type: ToastType, message: string) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove],
  );

  const value: ToastContextValue = {
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} leaving={leavingIds.has(t.id)} onDismiss={() => remove(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  leaving,
  onDismiss,
}: {
  toast: ToastItem;
  leaving: boolean;
  onDismiss: () => void;
}) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const visible = entered && !leaving;

  return (
    <div
      role="status"
      className={`pointer-events-auto flex w-80 items-start gap-2.5 rounded-lg border bg-white p-3 shadow-lg transition-all duration-200 ${
        toast.type === 'success' ? 'border-green-100' : 'border-red-100'
      } ${visible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'}`}
    >
      {toast.type === 'success' ? (
        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" />
      ) : (
        <XCircle size={18} className="mt-0.5 shrink-0 text-red-600" />
      )}
      <p className="flex-1 text-sm text-gray-800">{toast.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-gray-300 hover:text-gray-600"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
