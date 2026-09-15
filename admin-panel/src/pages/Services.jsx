import { useMemo, useState } from 'react';
import { FolderCog, Pencil, Plus, Search, Star, Tag, Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { useAdmin } from '../store.js';
import { Avatar, Empty, Modal, Spinner, Toggle, useUI } from '../ui.jsx';
import { money } from '../utils.js';
import ImageInput from '../components/ImageInput.jsx';

const DURATIONS = [15, 20, 30, 45, 60, 90, 120, 150, 180, 240];

function ServiceModal({ service, onClose, onSaved }) {
  const { categories, doctors } = useAdmin();
  const { toast } = useUI();
  const [form, setForm] = useState(() => ({
    nameUz: service?.nameUz || '',
    nameRu: service?.nameRu || '',
    categoryId: service?.categoryId ?? categories[0]?.id ?? '',
    price: service?.price ?? 0,
    oldPrice: service?.oldPrice ?? '',
    priceFrom: service?.priceFrom ?? false,
    durationMin: service?.durationMin ?? 30,
    descriptionUz: service?.descriptionUz || '',
    descriptionRu: service?.descriptionRu || '',
    aftercareUz: service?.aftercareUz || '',
    aftercareRu: service?.aftercareRu || '',
    imageUrl: service?.imageUrl || '',
    isPopular: service?.isPopular ?? false,
    isActive: service?.isActive ?? true,
    sortOrder: service?.sortOrder ?? 0,
    doctorIds: service?.doctors?.map((d) => d.id) ?? [],
  }));
  const [saving, setSaving] = useState(false);
  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const toggleDoctor = (id) =>
    set('doctorIds', form.doctorIds.includes(id) ? form.doctorIds.filter((d) => d !== id) : [...form.doctorIds, id]);

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, oldPrice: form.oldPrice === '' ? null : Number(form.oldPrice), price: Number(form.price) };
      if (service) await api(`/services/${service.id}`, { method: 'PUT', body });
      else await api('/services', { method: 'POST', body });
      toast(service ? 'Xizmat saqlandi' : "Xizmat qo'shildi");
      onSaved();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={service ? 'Xizmatni tahrirlash' : 'Yangi xizmat'}
      size="lg"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Bekor qilish
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <Spinner /> : 'Saqlash'}
          </button>
        </>
      }
    >
      <div className="grid-2">
        <div className="field">
          <label>Nomi (o'zbekcha) *</label>
          <input className="input" value={form.nameUz} onChange={(e) => set('nameUz', e.target.value)} />
        </div>
        <div className="field">
          <label>Nomi (ruscha) *</label>
          <input className="input" value={form.nameRu} onChange={(e) => set('nameRu', e.target.value)} />
        </div>
      </div>

      <div className="grid-3">
        <div className="field">
          <label>Kategoriya</label>
          <select className="select" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
            <option value="">— Kategoriyasiz —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.nameUz}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Narxi (so'm) *</label>
          <input className="input" type="number" min="0" step="1000" value={form.price} onChange={(e) => set('price', e.target.value)} />
          <span className="hint">0 — «Bepul» deb ko'rsatiladi</span>
        </div>
        <div className="field">
          <label>Eski narx (aksiya uchun)</label>
          <input className="input" type="number" min="0" step="1000" value={form.oldPrice} onChange={(e) => set('oldPrice', e.target.value)} />
          <span className="hint">To'ldirilsa, ustidan chizib ko'rsatiladi</span>
        </div>
      </div>

      <div className="grid-3">
        <div className="field">
          <label>Davomiyligi</label>
          <select className="select" value={form.durationMin} onChange={(e) => set('durationMin', Number(e.target.value))}>
            {[...new Set([...DURATIONS, Number(form.durationMin)])]
              .sort((a, b) => a - b)
              .map((d) => (
                <option key={d} value={d}>
                  {d} daqiqa
                </option>
              ))}
          </select>
        </div>
        <div className="field">
          <label>Tartib raqami</label>
          <input className="input" type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} />
        </div>
        <div className="field" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <label className="checkbox">
            <input type="checkbox" checked={form.priceFrom} onChange={(e) => set('priceFrom', e.target.checked)} />
            Narx «...dan boshlab»
          </label>
        </div>
      </div>

      <div className="row-wrap" style={{ gap: 24 }}>
        <Toggle checked={form.isActive} onChange={(v) => set('isActive', v)} label="Faol (mijozlarga ko'rinadi)" />
        <Toggle checked={form.isPopular} onChange={(v) => set('isPopular', v)} label="Ommabop (bosh sahifada)" />
      </div>

      <span className="form-section">Tavsif — har bir qatorga bitta punkt yozing</span>
      <div className="grid-2">
        <textarea className="textarea" placeholder="O'zbekcha" value={form.descriptionUz} onChange={(e) => set('descriptionUz', e.target.value)} />
        <textarea className="textarea" placeholder="Ruscha" value={form.descriptionRu} onChange={(e) => set('descriptionRu', e.target.value)} />
      </div>

      <span className="form-section">Muolajadan keyingi parvarish maslahatlari (qabul yakunlanganda bemorga yuboriladi)</span>
      <div className="grid-2">
        <textarea className="textarea" placeholder="O'zbekcha" value={form.aftercareUz} onChange={(e) => set('aftercareUz', e.target.value)} />
        <textarea className="textarea" placeholder="Ruscha" value={form.aftercareRu} onChange={(e) => set('aftercareRu', e.target.value)} />
      </div>

      <ImageInput value={form.imageUrl} onChange={(v) => set('imageUrl', v)} label="Rasm (ixtiyoriy)" />

      <span className="form-section">Bu xizmatni bajaradigan shifokorlar</span>
      <div className="check-grid">
        {doctors.map((d) => (
          <label key={d.id} className="checkbox">
            <input type="checkbox" checked={form.doctorIds.includes(d.id)} onChange={() => toggleDoctor(d.id)} />
            {d.fullName}
            {!d.isActive && <span className="muted small">(nofaol)</span>}
          </label>
        ))}
      </div>
      <span className="hint">Hech kim belgilanmasa, barcha shifokorlarga yozilish mumkin bo'ladi.</span>
    </Modal>
  );
}

function CategoriesModal({ onClose }) {
  const { categories, reloadRefs } = useAdmin();
  const { toast, confirm } = useUI();
  const [items, setItems] = useState(categories.map((c) => ({ ...c })));
  const [draft, setDraft] = useState({ icon: '🦷', nameUz: '', nameRu: '' });
  const [busy, setBusy] = useState(false);

  const saveItem = async (item) => {
    try {
      await api(`/categories/${item.id}`, { method: 'PUT', body: item });
      toast('Kategoriya saqlandi');
      reloadRefs();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const add = async () => {
    setBusy(true);
    try {
      const res = await api('/categories', { method: 'POST', body: { ...draft, sortOrder: items.length } });
      setItems([...items, res.category]);
      setDraft({ icon: '🦷', nameUz: '', nameRu: '' });
      toast("Kategoriya qo'shildi");
      reloadRefs();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item) => {
    const ok = await confirm({
      title: "Kategoriyani o'chirish",
      text: `«${item.nameUz}» o'chiriladi. Undagi xizmatlar kategoriyasiz qoladi.`,
      confirmText: "O'chirish",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/categories/${item.id}`, { method: 'DELETE' });
      setItems(items.filter((i) => i.id !== item.id));
      reloadRefs();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const update = (id, field, value) => setItems(items.map((i) => (i.id === id ? { ...i, [field]: value } : i)));

  return (
    <Modal title="Kategoriyalar" size="lg" onClose={onClose}>
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 70 }}>Belgi</th>
            <th>O'zbekcha</th>
            <th>Ruscha</th>
            <th style={{ width: 80 }}>Tartib</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <input className="input" value={item.icon || ''} onChange={(e) => update(item.id, 'icon', e.target.value)} />
              </td>
              <td>
                <input className="input" value={item.nameUz} onChange={(e) => update(item.id, 'nameUz', e.target.value)} />
              </td>
              <td>
                <input className="input" value={item.nameRu} onChange={(e) => update(item.id, 'nameRu', e.target.value)} />
              </td>
              <td>
                <input className="input" type="number" value={item.sortOrder} onChange={(e) => update(item.id, 'sortOrder', e.target.value)} />
              </td>
              <td className="num">
                <div className="row">
                  <button className="btn btn-soft btn-sm" onClick={() => saveItem(item)}>
                    Saqlash
                  </button>
                  <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(item)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          <tr>
            <td>
              <input className="input" value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} />
            </td>
            <td>
              <input className="input" placeholder="Yangi kategoriya" value={draft.nameUz} onChange={(e) => setDraft({ ...draft, nameUz: e.target.value })} />
            </td>
            <td>
              <input className="input" placeholder="Новая категория" value={draft.nameRu} onChange={(e) => setDraft({ ...draft, nameRu: e.target.value })} />
            </td>
            <td />
            <td className="num">
              <button className="btn btn-primary btn-sm" onClick={add} disabled={busy || !draft.nameUz || !draft.nameRu}>
                <Plus size={15} /> Qo'shish
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </Modal>
  );
}

export default function Services() {
  const { services, categories, reloadRefs } = useAdmin();
  const { toast, confirm } = useUI();
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [showCategories, setShowCategories] = useState(false);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = services.filter(
      (s) =>
        (!categoryFilter || String(s.categoryId) === categoryFilter) &&
        (!q || s.nameUz.toLowerCase().includes(q) || s.nameRu.toLowerCase().includes(q)),
    );
    const list = categories.map((c) => ({ category: c, items: filtered.filter((s) => s.categoryId === c.id) }));
    list.push({ category: null, items: filtered.filter((s) => !categories.some((c) => c.id === s.categoryId)) });
    return list.filter((g) => g.items.length);
  }, [services, categories, query, categoryFilter]);

  const toggleField = async (service, field) => {
    try {
      await api(`/services/${service.id}`, {
        method: 'PUT',
        body: { ...service, [field]: !service[field], doctorIds: service.doctors.map((d) => d.id) },
      });
      reloadRefs();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const remove = async (service) => {
    const ok = await confirm({
      title: "Xizmatni o'chirish",
      text: `«${service.nameUz}» o'chiriladi. Agar bu xizmat bilan qabullar bo'lsa, u faqat nofaol qilinadi (tarix saqlanadi).`,
      confirmText: "O'chirish",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await api(`/services/${service.id}`, { method: 'DELETE' });
      toast(res.deactivated ? 'Xizmatda qabullar bor — u nofaol qilindi' : "Xizmat o'chirildi");
      reloadRefs();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <div className="filters">
        <div className="input-icon" style={{ minWidth: 280 }}>
          <Search size={16} />
          <input className="input" placeholder="Xizmat nomi" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">Barcha kategoriyalar</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.nameUz}
            </option>
          ))}
        </select>
        <div className="grow" />
        <button className="btn btn-secondary" onClick={() => setShowCategories(true)}>
          <FolderCog size={16} /> Kategoriyalar
        </button>
        <button className="btn btn-primary" onClick={() => setEditing({})}>
          <Plus size={16} /> Yangi xizmat
        </button>
      </div>

      {groups.length === 0 && (
        <div className="card">
          <Empty icon={Tag} text="Xizmatlar topilmadi" />
        </div>
      )}

      <div className="stack" style={{ gap: 18 }}>
        {groups.map((group) => (
          <div className="card" key={group.category?.id ?? 'none'}>
            <div className="card-head">
              <h3 className="grow">
                {group.category ? `${group.category.icon || ''} ${group.category.nameUz}` : 'Kategoriyasiz'}
              </h3>
              <span className="muted small">{group.items.length} ta xizmat</span>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Xizmat</th>
                    <th className="num">Narx</th>
                    <th>Davomiylik</th>
                    <th>Shifokorlar</th>
                    <th>Ommabop</th>
                    <th>Faol</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((s) => (
                    <tr key={s.id} style={{ opacity: s.isActive ? 1 : 0.55 }}>
                      <td>
                        <div className="bold">{s.nameUz}</div>
                        <div className="small muted">{s.nameRu}</div>
                      </td>
                      <td className="num">
                        {s.oldPrice > s.price && (
                          <div className="small muted" style={{ textDecoration: 'line-through' }}>
                            {money(s.oldPrice)}
                          </div>
                        )}
                        <div className="bold" style={{ color: s.oldPrice > s.price ? 'var(--red)' : undefined }}>
                          {s.price ? `${money(s.price)}${s.priceFrom ? 'dan' : ''}` : 'Bepul'}
                        </div>
                      </td>
                      <td className="nowrap">{s.durationMin} daq</td>
                      <td>
                        <div className="row" style={{ gap: 4 }}>
                          {s.doctors.length === 0 && <span className="muted small">Barchasi</span>}
                          {s.doctors.slice(0, 4).map((d) => (
                            <span key={d.id} title={d.fullName}>
                              <Avatar name={d.fullName} size={26} />
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <button className="icon-btn" onClick={() => toggleField(s, 'isPopular')} title="Ommabop">
                          <Star size={18} color={s.isPopular ? '#f59e0b' : '#cbd5e1'} fill={s.isPopular ? '#f59e0b' : 'none'} />
                        </button>
                      </td>
                      <td>
                        <Toggle checked={s.isActive} onChange={() => toggleField(s, 'isActive')} />
                      </td>
                      <td className="num">
                        <div className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(s)} title="Tahrirlash">
                            <Pencil size={15} />
                          </button>
                          <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(s)} title="O'chirish">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <ServiceModal
          service={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reloadRefs();
          }}
        />
      )}
      {showCategories && <CategoriesModal onClose={() => setShowCategories(false)} />}
    </>
  );
}
