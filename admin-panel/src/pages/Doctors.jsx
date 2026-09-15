import { useCallback, useEffect, useState } from 'react';
import { CalendarOff, Pencil, Plus, Star, Stethoscope, Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { useAdmin } from '../store.js';
import { Avatar, Empty, Modal, Spinner, Toggle, useUI } from '../ui.jsx';
import { DOCTOR_COLORS, formatDate, WEEKDAYS } from '../utils.js';
import ImageInput from '../components/ImageInput.jsx';

const WEEK = [1, 2, 3, 4, 5, 6, 0];

function defaultSchedule() {
  const schedule = {};
  for (let d = 0; d < 7; d += 1) {
    schedule[d] = { on: d !== 0, start: '09:00', end: '18:00', breakStart: '13:00', breakEnd: '14:00' };
  }
  return schedule;
}

function scheduleSummary(schedule) {
  const days = WEEK.filter((d) => schedule?.[d]?.on);
  if (!days.length) return 'Ish kunlari belgilanmagan';
  const first = schedule[days[0]];
  const same = days.every((d) => schedule[d].start === first.start && schedule[d].end === first.end);
  const names = days.map((d) => WEEKDAYS[d].slice(0, 2)).join(', ');
  return same ? `${names} · ${first.start}–${first.end}` : names;
}

function ScheduleEditor({ value, onChange }) {
  const update = (day, field, v) => onChange({ ...value, [day]: { ...value[day], [field]: v } });
  return (
    <div className="schedule-editor">
      {WEEK.map((day) => {
        const s = value[day] || { on: false, start: '09:00', end: '18:00', breakStart: null, breakEnd: null };
        return (
          <div key={day} className="schedule-row" style={{ opacity: s.on ? 1 : 0.6 }}>
            <Toggle checked={s.on} onChange={(v) => update(day, 'on', v)} label={WEEKDAYS[day]} />
            {s.on ? (
              <div className="schedule-times">
                <input className="input" type="time" value={s.start} onChange={(e) => update(day, 'start', e.target.value)} />
                <span className="muted">—</span>
                <input className="input" type="time" value={s.end} onChange={(e) => update(day, 'end', e.target.value)} />
                <span className="muted small" style={{ marginLeft: 8 }}>
                  Tushlik:
                </span>
                <input className="input" type="time" value={s.breakStart || ''} onChange={(e) => update(day, 'breakStart', e.target.value || null)} />
                <span className="muted">—</span>
                <input className="input" type="time" value={s.breakEnd || ''} onChange={(e) => update(day, 'breakEnd', e.target.value || null)} />
              </div>
            ) : (
              <span className="muted">Dam olish kuni</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DoctorModal({ doctor, onClose, onSaved }) {
  const { services } = useAdmin();
  const { toast } = useUI();
  const [form, setForm] = useState(() => ({
    fullName: doctor?.fullName || '',
    specialtyUz: doctor?.specialtyUz || '',
    specialtyRu: doctor?.specialtyRu || '',
    experienceYears: doctor?.experienceYears ?? 0,
    color: doctor?.color || DOCTOR_COLORS[0],
    photoUrl: doctor?.photoUrl || '',
    bioUz: doctor?.bioUz || '',
    bioRu: doctor?.bioRu || '',
    isActive: doctor?.isActive ?? true,
    sortOrder: doctor?.sortOrder ?? 0,
    schedule: doctor?.schedule || defaultSchedule(),
    serviceIds: doctor?.services?.map((s) => s.id) ?? [],
  }));
  const [saving, setSaving] = useState(false);
  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const toggleService = (id) =>
    set('serviceIds', form.serviceIds.includes(id) ? form.serviceIds.filter((s) => s !== id) : [...form.serviceIds, id]);

  const save = async () => {
    setSaving(true);
    try {
      if (doctor) await api(`/doctors/${doctor.id}`, { method: 'PUT', body: form });
      else await api('/doctors', { method: 'POST', body: form });
      toast(doctor ? "Shifokor ma'lumotlari saqlandi" : "Shifokor qo'shildi");
      onSaved();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={doctor ? 'Shifokorni tahrirlash' : 'Yangi shifokor'}
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
          <label>Ism-familiya *</label>
          <input className="input" placeholder="Dr. Ism Familiya" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
        </div>
        <div className="field">
          <label>Tajriba (yil)</label>
          <input className="input" type="number" min="0" max="70" value={form.experienceYears} onChange={(e) => set('experienceYears', e.target.value)} />
        </div>
        <div className="field">
          <label>Mutaxassislik (o'zbekcha) *</label>
          <input className="input" placeholder="Stomatolog-terapevt" value={form.specialtyUz} onChange={(e) => set('specialtyUz', e.target.value)} />
        </div>
        <div className="field">
          <label>Mutaxassislik (ruscha) *</label>
          <input className="input" placeholder="Стоматолог-терапевт" value={form.specialtyRu} onChange={(e) => set('specialtyRu', e.target.value)} />
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label>Kalendardagi rangi</label>
          <div className="swatches">
            {DOCTOR_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={`swatch ${form.color === color ? 'active' : ''}`}
                style={{ background: color }}
                onClick={() => set('color', color)}
                aria-label={color}
              />
            ))}
          </div>
        </div>
        <div className="field" style={{ justifyContent: 'flex-end' }}>
          <Toggle checked={form.isActive} onChange={(v) => set('isActive', v)} label="Faol (mijozlar yozila oladi)" />
        </div>
      </div>

      <ImageInput value={form.photoUrl} onChange={(v) => set('photoUrl', v)} label="Rasmi (ixtiyoriy)" />

      <div className="grid-2">
        <div className="field">
          <label>Shifokor haqida (o'zbekcha)</label>
          <textarea className="textarea" value={form.bioUz} onChange={(e) => set('bioUz', e.target.value)} />
        </div>
        <div className="field">
          <label>Shifokor haqida (ruscha)</label>
          <textarea className="textarea" value={form.bioRu} onChange={(e) => set('bioRu', e.target.value)} />
        </div>
      </div>

      <span className="form-section">Haftalik ish jadvali</span>
      <ScheduleEditor value={form.schedule} onChange={(v) => set('schedule', v)} />

      <span className="form-section">Bajaradigan xizmatlari</span>
      <div className="check-grid">
        {services.map((s) => (
          <label key={s.id} className="checkbox">
            <input type="checkbox" checked={form.serviceIds.includes(s.id)} onChange={() => toggleService(s.id)} />
            {s.nameUz}
          </label>
        ))}
      </div>
    </Modal>
  );
}

function TimeOffModal({ onClose, onSaved }) {
  const { doctors } = useAdmin();
  const { toast } = useUI();
  const [form, setForm] = useState({ doctorId: '', dateFrom: '', dateTo: '', reason: '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api('/time-offs', { method: 'POST', body: { ...form, dateTo: form.dateTo || form.dateFrom } });
      toast("Dam olish kuni qo'shildi");
      onSaved();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Dam olish / ta'til qo'shish"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Bekor qilish
          </button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !form.dateFrom}>
            {saving ? <Spinner /> : 'Saqlash'}
          </button>
        </>
      }
    >
      <div className="field">
        <label>Kim uchun</label>
        <select className="select" value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })}>
          <option value="">Butun klinika (bayram, sanitariya kuni)</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.fullName}
            </option>
          ))}
        </select>
      </div>
      <div className="grid-2">
        <div className="field">
          <label>Boshlanish sanasi *</label>
          <input className="input" type="date" value={form.dateFrom} onChange={(e) => setForm({ ...form, dateFrom: e.target.value })} />
        </div>
        <div className="field">
          <label>Tugash sanasi</label>
          <input className="input" type="date" value={form.dateTo} min={form.dateFrom} onChange={(e) => setForm({ ...form, dateTo: e.target.value })} />
        </div>
      </div>
      <div className="field">
        <label>Sabab</label>
        <input className="input" placeholder="Masalan: Navro'z bayrami, ta'til" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
      </div>
      <div className="alert alert-info">Bu kunlarda mijozlar Telegram orqali yozila olmaydi.</div>
    </Modal>
  );
}

export default function Doctors() {
  const { doctors, reloadRefs } = useAdmin();
  const { toast, confirm } = useUI();
  const [editing, setEditing] = useState(null);
  const [timeOffs, setTimeOffs] = useState([]);
  const [addingOff, setAddingOff] = useState(false);

  const loadTimeOffs = useCallback(() => {
    api('/time-offs')
      .then((res) => setTimeOffs(res.items))
      .catch((err) => toast(err.message, 'error'));
  }, [toast]);

  useEffect(() => {
    loadTimeOffs();
  }, [loadTimeOffs]);

  const remove = async (doctor) => {
    const ok = await confirm({
      title: "Shifokorni o'chirish",
      text: `${doctor.fullName} o'chiriladi. Agar uning qabullari bo'lsa, u faqat nofaol qilinadi (tarix saqlanadi).`,
      confirmText: "O'chirish",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await api(`/doctors/${doctor.id}`, { method: 'DELETE' });
      toast(res.deactivated ? 'Shifokorda qabullar bor — u nofaol qilindi' : "Shifokor o'chirildi");
      reloadRefs();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const removeOff = async (item) => {
    const ok = await confirm({ title: "Dam olish kunini o'chirish", confirmText: "O'chirish", danger: true });
    if (!ok) return;
    try {
      await api(`/time-offs/${item.id}`, { method: 'DELETE' });
      loadTimeOffs();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <div className="page-head">
        <p className="muted grow">Shifokorlar, ularning ish jadvali va bajaradigan xizmatlari</p>
        <button className="btn btn-primary" onClick={() => setEditing({})}>
          <Plus size={16} /> Yangi shifokor
        </button>
      </div>

      {doctors.length === 0 && (
        <div className="card">
          <Empty icon={Stethoscope} text="Shifokorlar yo'q" />
        </div>
      )}

      <div className="doctor-grid">
        {doctors.map((d) => (
          <div key={d.id} className="card doctor-card" style={{ opacity: d.isActive ? 1 : 0.6 }}>
            <div className="row">
              <Avatar name={d.fullName} photo={d.photoUrl} color={d.color} size={52} />
              <div className="grow">
                <div className="bold ellipsis" style={{ fontSize: 15 }}>
                  {d.fullName}
                </div>
                <div className="small text-2">{d.specialtyUz}</div>
                <div className="row small" style={{ gap: 8, marginTop: 3 }}>
                  <span className="muted">{d.experienceYears} yil tajriba</span>
                  {d.rating && (
                    <span className="row" style={{ gap: 3 }}>
                      <Star size={13} color="#f59e0b" fill="#f59e0b" /> {d.rating} ({d.ratingCount})
                    </span>
                  )}
                </div>
              </div>
              <span className="color-dot" style={{ background: d.color, width: 12, height: 12 }} />
            </div>
            <div className="note-box small">
              <div className="text-2">🗓 {scheduleSummary(d.schedule)}</div>
              <div className="muted" style={{ marginTop: 3 }}>
                🦷 {d.services.length} ta xizmat · {d._count?.appointments ?? 0} ta qabul
              </div>
            </div>
            <div className="row">
              {!d.isActive && <span className="badge tone-gray">Nofaol</span>}
              <div className="grow" />
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(d)}>
                <Pencil size={14} /> Tahrirlash
              </button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(d)} title="O'chirish">
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginTop: 22 }}>
        <div className="card-head">
          <CalendarOff size={18} className="muted" />
          <h3 className="grow">Dam olish kunlari va ta'tillar</h3>
          <button className="btn btn-secondary btn-sm" onClick={() => setAddingOff(true)}>
            <Plus size={14} /> Qo'shish
          </button>
        </div>
        {timeOffs.length === 0 ? (
          <Empty text="Rejalashtirilgan dam olish kunlari yo'q" />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Kim uchun</th>
                <th>Sanalar</th>
                <th>Sabab</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {timeOffs.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.doctor ? (
                      <span className="row">
                        <span className="color-dot" style={{ background: item.doctor.color }} />
                        {item.doctor.fullName}
                      </span>
                    ) : (
                      <span className="badge tone-amber">Butun klinika</span>
                    )}
                  </td>
                  <td className="nowrap">
                    {formatDate(item.dateFrom)}
                    {item.dateTo !== item.dateFrom && ` — ${formatDate(item.dateTo, { year: true })}`}
                  </td>
                  <td className="text-2">{item.reason || '—'}</td>
                  <td className="num">
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => removeOff(item)}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <DoctorModal
          doctor={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reloadRefs();
          }}
        />
      )}
      {addingOff && (
        <TimeOffModal
          onClose={() => setAddingOff(false)}
          onSaved={() => {
            setAddingOff(false);
            loadTimeOffs();
          }}
        />
      )}
    </>
  );
}
