export interface Toast {
  id: number;
  text: string;
  kind: "success" | "info";
}

export function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toast-stack">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast show ${toast.kind}`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {toast.kind === "info" ? (
              <>
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v5M12 16h.01" />
              </>
            ) : (
              <path d="m5 12 5 5L20 7" />
            )}
          </svg>
          <span className="toast-text">{toast.text}</span>
        </div>
      ))}
    </div>
  );
}
