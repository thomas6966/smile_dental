import { useState } from 'react';
import { Spinner } from './Common.jsx';

export default function ConfirmDialog({
  title,
  text,
  confirmText,
  cancelText,
  danger = false,
  reasonPlaceholder,
  onConfirm,
  onClose,
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm(reason.trim());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="dialog-root">
      <div className="sheet-backdrop" onClick={busy ? undefined : onClose} />
      <div className="dialog" role="alertdialog">
        <h3>{title}</h3>
        {text && <p>{text}</p>}
        {reasonPlaceholder && (
          <textarea
            className="input"
            style={{ marginTop: 14, minHeight: 72 }}
            placeholder={reasonPlaceholder}
            value={reason}
            maxLength={300}
            onChange={(e) => setReason(e.target.value)}
          />
        )}
        <div className="dialog-actions">
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>
            {cancelText}
          </button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={confirm} disabled={busy}>
            {busy ? <Spinner /> : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
