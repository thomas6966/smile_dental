import { X } from 'lucide-react';

export default function Sheet({ onClose, children, footer }) {
  return (
    <div className="sheet-root">
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        <button className="sheet-close" onClick={onClose} aria-label="close">
          <X size={18} />
        </button>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </div>
  );
}
