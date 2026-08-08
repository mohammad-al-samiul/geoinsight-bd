"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "default" | "success" | "warning" | "destructive";

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Auto-dismiss delay in ms. Defaults to 5000. */
  duration?: number;
}

interface ToastItem extends Required<Pick<ToastOptions, "title" | "variant" | "duration">> {
  id: number;
  description?: string;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const variantConfig: Record<
  ToastVariant,
  { icon: typeof Info; iconClass: string; accentClass: string }
> = {
  default: { icon: Info, iconClass: "text-sky-400", accentClass: "bg-sky-400/70" },
  success: { icon: CheckCircle2, iconClass: "text-emerald-400", accentClass: "bg-emerald-400/70" },
  warning: { icon: AlertTriangle, iconClass: "text-amber-400", accentClass: "bg-amber-400/70" },
  destructive: { icon: XCircle, iconClass: "text-red-400", accentClass: "bg-red-400/70" },
};

let toastId = 0;

/**
 * Module-level emitter so non-React code (e.g. the API client) can raise
 * toasts. Registered by the mounted ToastProvider.
 */
let globalEmitter: ((options: ToastOptions) => void) | null = null;

export function emitToast(options: ToastOptions) {
  globalEmitter?.(options);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);

  const dismiss = React.useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    ({ title, description, variant = "default", duration = 5000 }: ToastOptions) => {
      const id = ++toastId;
      setToasts((current) => [...current.slice(-4), { id, title, description, variant, duration }]);
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  React.useEffect(() => {
    globalEmitter = toast;
    return () => {
      if (globalEmitter === toast) globalEmitter = null;
    };
  }, [toast]);

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-4 left-4 right-4 z-[1200] flex max-w-sm flex-col gap-2 sm:left-auto sm:w-full"
      >
        <AnimatePresence initial={false}>
          {toasts.map((item) => (
            <ToastCard key={item.id} item={item} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: (id: number) => void }) {
  const { icon: Icon, iconClass, accentClass } = variantConfig[item.variant];

  return (
    <motion.div
      layout
      role="status"
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="glass-panel pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl p-4 pr-10 shadow-panel"
    >
      <span className={cn("absolute inset-y-0 left-0 w-[3px]", accentClass)} aria-hidden="true" />
      <Icon className={cn("mt-0.5 h-[18px] w-[18px] shrink-0", iconClass)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight text-foreground">{item.title}</p>
        {item.description && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="Dismiss notification"
        className="absolute right-2.5 top-2.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </motion.div>
  );
}
