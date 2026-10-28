import { createContext, forwardRef, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Inbox, Loader2, X } from "lucide-react";
import { STATUS } from "../api/format";

/* ---------- Buttons ---------- */
const VARIANTS = {
  primary: "bg-campus-500 text-white hover:bg-campus-600 disabled:bg-campus-500/50",
  secondary: "border border-line bg-white text-ink hover:bg-paper disabled:opacity-50",
  danger: "bg-brick text-white hover:bg-brick/90 disabled:opacity-50",
  ghost: "text-campus-600 hover:bg-campus-50 disabled:opacity-50",
};

export function Button({ variant = "primary", loading = false, className = "", children, ...props }) {
  return (
    <button
      {...props}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

/* ---------- Form fields ---------- */
const base =
  "w-full rounded-md border bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-campus-500 focus:outline-none focus:ring-2 focus:ring-campus-500/20";

export const Input = forwardRef(function Input({ error, className = "", ...props }, ref) {
  return <input ref={ref} {...props} className={`${base} ${error ? "border-brick" : "border-line"} ${className}`} />;
});

export function Textarea({ error, className = "", ...props }) {
  return <textarea rows={4} {...props} className={`${base} ${error ? "border-brick" : "border-line"} ${className}`} />;
}

export function Select({ error, className = "", children, ...props }) {
  return (
    <select {...props} className={`${base} ${error ? "border-brick" : "border-line"} ${className}`}>
      {children}
    </select>
  );
}

export function Field({ label, error, hint, htmlFor, children, className = "" }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && (
        <p className="mt-1 text-xs text-brick" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/* ---------- Status ---------- */
export function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status, cls: "bg-slate-100 text-slate-700" };
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>;
}

export function Chip({ children }) {
  return <span className="rounded bg-paper px-2 py-0.5 text-xs text-muted ring-1 ring-line">{children}</span>;
}

/* ---------- Page states ---------- */
export function Spinner({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted" role="status">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> {label}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, children, action }) {
  return (
    <div className="rounded-lg border border-dashed border-line bg-white px-6 py-12 text-center">
      <Icon className="mx-auto h-8 w-8 text-muted" aria-hidden />
      <h3 className="mt-3 text-base font-semibold">{title}</h3>
      {children && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="rounded-lg border border-brick/30 bg-red-50 px-6 py-8 text-center" role="alert">
      <AlertTriangle className="mx-auto h-7 w-7 text-brick" aria-hidden />
      <p className="mt-2 text-sm text-brick">{message}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export const Card = ({ className = "", children }) => (
  <div className={`rounded-lg border border-line bg-white p-5 ${className}`}>{children}</div>
);

/* ---------- Pagination ---------- */
export function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="mt-6 flex items-center justify-between text-sm" aria-label="Pagination">
      <span className="text-muted">
        Page {page} of {pages} · {total} results
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="secondary" disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}

/* ---------- Modal + confirm ---------- */
export function Modal({ open, onClose, title, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            ref={ref}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} rounded-lg bg-white p-6 shadow-xl focus:outline-none`}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button onClick={onClose} className="rounded p-1 text-muted hover:bg-paper" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", loading, onConfirm, onCancel }) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-muted">{message}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="danger" loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

/* ---------- Toasts ---------- */
const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((type, message) => {
    const id = Math.random().toString(36).slice(2);
    setItems((list) => [...list, { id, type, message }]);
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 4500);
  }, []);
  const api = { success: (m) => push("success", m), error: (m) => push("error", m) };
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ x: 24, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`pointer-events-auto flex items-start gap-2 rounded-md border bg-white p-3 text-sm shadow-lg ${
                t.type === "success" ? "border-moss/40" : "border-brick/40"
              }`}
            >
              {t.type === "success" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-moss" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brick" />
              )}
              <span>{t.message}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
