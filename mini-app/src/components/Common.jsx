import { LoaderCircle, Star } from 'lucide-react';
import { formatPrice, translate } from '../i18n.js';

export function Loader({ full = false, label }) {
  if (full) {
    return (
      <div className="loader-full">
        <div className="loader-logo">🦷</div>
        {label && <span className="small">{label}</span>}
      </div>
    );
  }
  return (
    <div className="loader-inline">
      <LoaderCircle size={26} className="spinner" />
    </div>
  );
}

export function Empty({ icon: Icon, title, text, action }) {
  return (
    <div className="empty">
      {Icon && (
        <div className="empty-icon">
          <Icon size={30} />
        </div>
      )}
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

export function StatusBadge({ status, lang }) {
  return <span className={`status status-${status}`}>{translate(lang, `status.${status}`)}</span>;
}

export function Price({ service, lang, inline = false, size }) {
  const sale = service.oldPrice && service.oldPrice > service.price;
  return (
    <div className={`price ${inline ? 'inline' : ''}`}>
      {sale && <span className="price-old">{formatPrice(lang, service.oldPrice)}</span>}
      <span className={`price-new ${sale ? 'sale' : ''}`} style={size ? { fontSize: size } : undefined}>
        {formatPrice(lang, service.price, service.priceFrom)}
      </span>
    </div>
  );
}

export function Stars({ value = 0, onChange, size = 28 }) {
  return (
    <div className="stars">
      {[1, 2, 3, 4, 5].map((n) =>
        onChange ? (
          <button key={n} type="button" className={n <= value ? 'on' : ''} onClick={() => onChange(n)} aria-label={`${n}`}>
            <Star size={size} />
          </button>
        ) : (
          <span key={n} className={n <= value ? 'on' : ''}>
            <Star size={size} />
          </span>
        ),
      )}
    </div>
  );
}

export function Rating({ value, count }) {
  if (!value) return null;
  return (
    <span className="rating">
      <Star size={13} />
      {value.toFixed(1)}
      {count ? <span className="muted">({count})</span> : null}
    </span>
  );
}

export function Spinner({ size = 18 }) {
  return <LoaderCircle size={size} className="spinner" />;
}
