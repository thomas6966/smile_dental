import { Check, Clock, Plus } from 'lucide-react';
import { useApp } from '../context.js';
import { pick } from '../i18n.js';
import { categoryIcon, descriptionLines } from '../utils.js';
import { Price } from './Common.jsx';

export default function ServiceRow({ service, onClick, onAdd, selected = false }) {
  const { data, lang, t } = useApp();
  const firstLine = descriptionLines(pick(service, 'description', lang))[0];

  return (
    <div
      role="button"
      tabIndex={0}
      className={`service-row ${selected ? 'selected' : ''}`}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      <div className="service-emoji">{categoryIcon(data.categories, service.categoryId)}</div>
      <div className="grow">
        <div className="service-name">{pick(service, 'name', lang)}</div>
        {firstLine && <div className="service-desc ellipsis">{firstLine}</div>}
        <div className="service-meta">
          <Price service={service} lang={lang} inline />
          <span className="chip">
            <Clock size={12} />
            {t('common.minutes', { n: service.durationMin })}
          </span>
        </div>
      </div>
      {onAdd && !selected && (
        <button
          className="plus-btn"
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          aria-label="add"
        >
          <Plus size={18} />
        </button>
      )}
      {selected && (
        <span className="plus-btn is-selected">
          <Check size={18} />
        </span>
      )}
    </div>
  );
}
