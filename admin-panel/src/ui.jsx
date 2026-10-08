import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, Info, LoaderCircle, X } from 'lucide-react';
import { assetUrl } from './api.js';
import { initials, REFRESH_EVENT, SOURCE, STATUS } from './utils.js';

// ======================= Toast va tasdiqlash oynasi =======================
const UIContext = createContext(null);
export const useUI = () => useContext(UIContext);

let toastId = 0;

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);

  const toast = useCallback((message, type = 'success') => {
    toastId += 1;
    const id = toastId;
    setToasts((list) => [...list, { id, message, type }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), type === 'error' ? 5000 : 3500);
  }, []);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        setDialog({ ...options, resolve });
      }),
    [],
  );

  const closeDialog = (result) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  return (
    <UIContext.Provider value={{ toast, confirm }}>
      {children}
      <div className="toasts">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.type === 'error' ? <CircleAlert size={18} /> : t.type === 'info' ? <Info size={18} /> : <CircleCheck size={18} />}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
      {dialog && <ConfirmDialog dialog={dialog} onClose={closeDialog} />}
    </UIContext.Provider>
  );
}

function ConfirmDialog({ dialog, onClose }) {
  const [text, setText] = useState('');
  return (
    <div className="overlay" style={{ alignItems: 'center', zIndex: 70 }} onMouseDown={(e) => e.target === e.currentTarget && onClose(false)}>
      <div className="modal sm">
        <div className="modal-body" style={{ paddingTop: 22 }}>
          <h3 style={{ fontSize: 17 }}>{dialog.title}</h3>
          {dialog.text && <p className="text-2">{dialog.text}</p>}
          {dialog.input && (
            <textarea
              className="textarea"
              autoFocus
              placeholder={dialog.input}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-secondary" onClick={() => onClose(false)}>
            {dialog.cancelText || 'Bekor qilish'}
          </button>
          <button
            className={`btn ${dialog.danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => onClose(dialog.input ? { value: text.trim() } : true)}
            autoFocus={!dialog.input}
          >
            {dialog.confirmText || 'Tasdiqlash'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ======================= Oyna (modal) =======================
export function Modal({ title, onClose, children, footer, size = '', icon }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size}`} role="dialog">
        <div className="modal-head">
          {icon}
          <h3 className="grow">{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Yopish">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ======================= Yon panel (drawer) =======================
export function Drawer({ title, onClose, children, footer, headerExtra }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <aside className="drawer">
        <div className="modal-head">
          <h3 className="grow">{title}</h3>
          {headerExtra}
          <button className="icon-btn" onClick={onClose} aria-label="Yopish">
            <X size={18} />
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-foot">{footer}</div>}
      </aside>
    </>
  );
}

// ======================= Kichik komponentlar =======================
export function Spinner({ size = 18 }) {
  return <LoaderCircle size={size} className="spin" />;
}

export function Loading() {
  return (
    <div className="loading-box">
      <Spinner size={26} />
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="empty">
      <CircleAlert size={36} />
      <div>{message || "Ma'lumotlarni yuklab bo'lmadi"}</div>
      {onRetry && (
        <button className="btn btn-secondary" onClick={onRetry}>
          Qayta urinish
        </button>
      )}
    </div>
  );
}

export function Empty({ icon: Icon, text, action }) {
  return (
    <div className="empty">
      {Icon && <Icon size={36} />}
      <div>{text}</div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }) {
  const meta = STATUS[status] || { label: status, tone: 'gray' };
  return <span className={`badge badge-dot tone-${meta.tone}`}>{meta.label}</span>;
}

export function SourceBadge({ source }) {
  return <span className={`badge ${source === 'BOT' ? 'tone-violet' : 'tone-gray'}`}>{SOURCE[source] || source}</span>;
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={Boolean(checked)} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" />
      {label && <span>{label}</span>}
    </label>
  );
}

export function Avatar({ name = '', photo, color = '#2563eb', size = 36 }) {
  if (photo) return <img className="avatar" src={assetUrl(photo)} alt={name} style={{ width: size, height: size }} />;
  return (
    <span className="avatar" style={{ width: size, height: size, background: `${color}1f`, color, fontSize: Math.round(size * 0.36) }}>
      {initials(name) || '?'}
    </span>
  );
}

export function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="pagination">
      <span className="muted">
        Jami: {total} ta · {page}/{pages} sahifa
      </span>
      <div className="row">
        <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          ← Oldingi
        </button>
        <button className="btn btn-secondary btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Keyingi →
        </button>
      </div>
    </div>
  );
}

// Yangi bildirishnoma kelganda sahifa ma'lumotlarini yangilash
export function useRefresh(callback) {
  const ref = useRef(callback);
  ref.current = callback;
  useEffect(() => {
    const handler = () => ref.current();
    window.addEventListener(REFRESH_EVENT, handler);
    return () => window.removeEventListener(REFRESH_EVENT, handler);
  }, []);
}
