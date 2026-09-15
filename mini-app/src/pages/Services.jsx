import { useMemo, useState } from 'react';
import { Info, Search, SearchX } from 'lucide-react';
import { useApp } from '../context.js';
import { pick } from '../i18n.js';
import ServiceRow from '../components/ServiceRow.jsx';
import { Empty } from '../components/Common.jsx';

export default function Services() {
  const { data, lang, t, openSheet, startBooking } = useApp();
  const { categories, services } = data;
  const [category, setCategory] = useState(null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return services.filter((s) => {
      if (category && s.categoryId !== category) return false;
      if (!q) return true;
      return [s.nameUz, s.nameRu, s.descriptionUz, s.descriptionRu].some((v) => v && v.toLowerCase().includes(q));
    });
  }, [services, category, query]);

  const groups = useMemo(() => {
    const list = categories
      .map((c) => ({ category: c, items: filtered.filter((s) => s.categoryId === c.id) }))
      .filter((g) => g.items.length);
    const known = new Set(categories.map((c) => c.id));
    const other = filtered.filter((s) => !known.has(s.categoryId));
    if (other.length) list.push({ category: null, items: other });
    return list;
  }, [categories, filtered]);

  const visibleCategories = categories.filter((c) => services.some((s) => s.categoryId === c.id));

  return (
    <div className="page">
      <h1 className="page-title">{t('services.title')}</h1>

      <div className="search">
        <Search size={18} />
        <input
          className="input"
          placeholder={t('services.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="search"
        />
      </div>

      <div className="hscroll chips">
        <button className={`cat-chip ${category === null ? 'active' : ''}`} onClick={() => setCategory(null)}>
          {t('common.all')}
        </button>
        {visibleCategories.map((c) => (
          <button
            key={c.id}
            className={`cat-chip ${category === c.id ? 'active' : ''}`}
            onClick={() => setCategory(category === c.id ? null : c.id)}
          >
            {c.icon} {pick(c, 'name', lang)}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <Empty icon={SearchX} title={t('services.empty')} />}

      {groups.map((group) => (
        <div key={group.category?.id ?? 'other'}>
          {group.category && !category && (
            <div className="group-title">
              {group.category.icon} {pick(group.category, 'name', lang)}
            </div>
          )}
          {group.items.map((service) => (
            <ServiceRow
              key={service.id}
              service={service}
              onClick={() => openSheet('service', { id: service.id })}
              onAdd={() => startBooking({ serviceId: service.id })}
            />
          ))}
        </div>
      ))}

      {filtered.length > 0 && (
        <div className="note">
          <Info size={16} />
          <span>{t('services.note')}</span>
        </div>
      )}
    </div>
  );
}
