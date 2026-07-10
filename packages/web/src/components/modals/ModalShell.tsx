/**
 * ModalShell — shared header (title + × close button) for all modals.
 */
export function ModalShell({ title, onClose, children }: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ flex: 1, fontSize: 20, fontWeight: 700 }}>{title}</h2>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{ color: 'var(--text-muted)', fontSize: 20, lineHeight: 1, padding: 4, borderRadius: 'var(--radius-sm)' }}
        >
          ×
        </button>
      </div>
      {children}
    </div>
  );
}
