import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus, Search, UserPlus, X } from 'lucide-react';
import { api, qs } from '../api.js';
import { useAdmin } from '../store.js';
import { Modal, Spinner, useUI } from '../ui.jsx';
import { emitRefresh, formatPhone, fullName, money, todayISO } from '../utils.js';

const DURATIONS = [15, 20, 30, 45, 60, 90, 120, 150, 180, 240];

function PatientPicker({ value, onChange }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    const timer = setTimeout(() => {
      api(`/patients${qs({ q, pageSize: 8 })}`)
        .then((res) => alive && setResults(res.items))
        .catch(() => alive && setResults([]))
        .finally(() => alive && setLoading(false));
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query]);

  if (value) {
    return (
      <div className="chip-select">
        <span>
          {fullName(value)} · {formatPhone(value.phone)}
        </span>
        <button onClick={() => onChange(null)} aria-label="O'chirish">
          <X size={15} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="input-icon">
        <Search size={16} />
        <input
          className="input"
          placeholder="Ism yoki telefon raqam bo'yicha qidirish..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>
      {query.trim().length >= 2 && (
        <div className="search-results">
          {loading && (
            <div className="search-item muted">
              <Spinner size={14} /> Qidirilmoqda...
            </div>
          )}
          {!loading && results.length === 0 && <div className="search-item muted">Bemor topilmadi</div>}
          {results.map((p) => (
            <button key={p.id} className="search-item" onClick={() => onChange(p)}>
              <div className="grow">
                <div className="bold">{fullName(p)}</div>
                <div className="small muted">
                  {formatPhone(p.phone)} · {p.visits} ta tashrif
                </div>
              </div>
              {p.hasTelegram && <span className="badge tone-violet">Telegram</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AppointmentForm({ appointment, prefill = {}, onClose }) {
  const { doctors, services, categories } = useAdmin();
  const { toast, confirm } = useUI();
  const editing = Boolean(appointment);

  const [mode, setMode] = useState('existing');
  const [patient, setPatient] = useState(prefill.patient || null);
  const [newPatient, setNewPatient] = useState({ firstName: '', lastName: '', phone: '', language: 'uz' });
  const [form, setForm] = useState(() => ({
    serviceId: appointment?.service?.id ?? prefill.serviceId ?? '',
    doctorId: appointment?.doctor?.id ?? prefill.doctorId ?? doctors.find((d) => d.isActive)?.id ?? '',
    date: appointment?.date ?? prefill.date ?? todayISO(),
    time: appointment?.startTime ?? prefill.time ?? '',
    durationMin: appointment?.durationMin ?? 30,
    status: appointment?.status ?? 'CONFIRMED',
    complaint: appointment?.complaint ?? '',
    adminNote: appointment?.adminNote ?? '',
    diagnosis: appointment?.diagnosis ?? '',
    recommendation: appointment?.recommendation ?? '',
    price: appointment?.price ?? '',
    notify: true,
  }));
  const [slots, setSlots] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));
  const activeDoctors = doctors.filter((d) => d.isActive || d.id === Number(form.doctorId));
  const selectedService = services.find((s) => s.id === Number(form.serviceId));

  // Xizmat tanlanganda davomiylikni avtomatik qo'yish
  useEffect(() => {
    if (!editing && selectedService) set('durationMin', selectedService.durationMin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.serviceId]);

  useEffect(() => {
    if (!form.doctorId || !form.date) {
      setSlots(null);
      return undefined;
    }
    let alive = true;
    setSlotsLoading(true);
    api(`/slots${qs({ doctorId: form.doctorId, date: form.date, duration: form.durationMin, excludeId: appointment?.id })}`)
      .then((res) => alive && setSlots(res))
      .catch(() => alive && setSlots(null))
      .finally(() => alive && setSlotsLoading(false));
    return () => {
      alive = false;
    };
  }, [form.doctorId, form.date, form.durationMin, appointment?.id]);

  const groupedServices = useMemo(() => {
    const groups = categories.map((c) => ({ label: `${c.icon || ''} ${c.nameUz}`.trim(), items: services.filter((s) => s.categoryId === c.id) }));
    const other = services.filter((s) => !categories.some((c) => c.id === s.categoryId));
    if (other.length) groups.push({ label: 'Boshqa', items: other });
    return groups.filter((g) => g.items.length);
  }, [categories, services]);

  const submit = async (force = false) => {
    if (!form.doctorId) return toast('Shifokorni tanlang', 'error');
    if (!form.date || !form.time) return toast('Sana va vaqtni tanlang', 'error');
    if (!editing && mode === 'existing' && !patient) return toast("Bemorni tanlang yoki yangi bemor qo'shing", 'error');

    const body = {
      doctorId: Number(form.doctorId),
      serviceId: form.serviceId ? Number(form.serviceId) : null,
      date: form.date,
      time: form.time,
      durationMin: Number(form.durationMin),
      complaint: form.complaint,
      adminNote: form.adminNote,
      notify: form.notify,
      force,
    };
    if (form.status === 'COMPLETED' || appointment?.status === 'COMPLETED') {
      Object.assign(body, { diagnosis: form.diagnosis, recommendation: form.recommendation, price: form.price === '' ? null : Number(form.price) });
    }
    if (!editing) {
      body.status = form.status;
      if (mode === 'existing') body.patientId = patient.id;
      else body.patient = newPatient;
    }

    setSaving(true);
    try {
      if (editing) await api(`/appointments/${appointment.id}`, { method: 'PATCH', body });
      else await api('/appointments', { method: 'POST', body });
      toast(editing ? "Qabul o'zgartirildi" : "Qabul qo'shildi");
      emitRefresh();
      onClose(true);
    } catch (err) {
      if (err.code === 'SLOT_TAKEN' && !force) {
        setSaving(false);
        const ok = await confirm({
          title: 'Bu vaqt band',
          text: "Tanlangan vaqtda shifokorda boshqa qabul bor. Baribir saqlansinmi?",
          confirmText: 'Ha, saqlash',
        });
        if (ok) await submit(true);
        return undefined;
      }
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  const availableCount = slots?.slots?.filter((s) => s.available).length ?? 0;

  return (
    <Modal
      title={editing ? `Qabulni tahrirlash #${appointment.id}` : 'Yangi qabul'}
      icon={<CalendarPlus size={20} className="muted" />}
      size="lg"
      onClose={() => onClose(false)}
      footer={
        <>
          <button className="btn btn-secondary" onClick={() => onClose(false)}>
            Bekor qilish
          </button>
          <button className="btn btn-primary" onClick={() => submit(false)} disabled={saving}>
            {saving ? <Spinner /> : 'Saqlash'}
          </button>
        </>
      }
    >
      {!editing && (
        <>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="form-section">Bemor</span>
            <div className="segmented">
              <button className={mode === 'existing' ? 'active' : ''} onClick={() => setMode('existing')}>
                <Search size={14} /> Mavjud bemor
              </button>
              <button className={mode === 'new' ? 'active' : ''} onClick={() => setMode('new')}>
                <UserPlus size={14} /> Yangi bemor
              </button>
            </div>
          </div>
          {mode === 'existing' ? (
            <PatientPicker value={patient} onChange={setPatient} />
          ) : (
            <div className="grid-3">
              <div className="field">
                <label>Ism *</label>
                <input className="input" value={newPatient.firstName} onChange={(e) => setNewPatient({ ...newPatient, firstName: e.target.value })} />
              </div>
              <div className="field">
                <label>Familiya</label>
                <input className="input" value={newPatient.lastName} onChange={(e) => setNewPatient({ ...newPatient, lastName: e.target.value })} />
              </div>
              <div className="field">
                <label>Telefon *</label>
                <input
                  className="input"
                  placeholder="+998 90 123 45 67"
                  value={newPatient.phone}
                  onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                />
              </div>
            </div>
          )}
        </>
      )}

      {editing && (
        <div className="patient-box">
          <div className="grow">
            <div className="bold">{fullName(appointment.user)}</div>
            <div className="small muted">{formatPhone(appointment.user?.phone)}</div>
          </div>
        </div>
      )}

      <span className="form-section">Qabul</span>
      <div className="grid-2">
        <div className="field">
          <label>Xizmat</label>
          <select className="select" value={form.serviceId} onChange={(e) => set('serviceId', e.target.value)}>
            <option value="">— Tanlanmagan (ko'rik) —</option>
            {groupedServices.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.items.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nameUz} — {s.price ? money(s.price) : 'Bepul'}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Shifokor *</label>
          <select className="select" value={form.doctorId} onChange={(e) => set('doctorId', e.target.value)}>
            <option value="">— Tanlang —</option>
            {activeDoctors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fullName} — {d.specialtyUz}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Sana *</label>
          <input className="input" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
        </div>
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
      </div>

      <div className="field">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <label className="label">Vaqt *</label>
          <div className="row">
            <span className="small muted">Boshqa vaqt:</span>
            <input className="input" type="time" style={{ width: 120, height: 34 }} value={form.time} onChange={(e) => set('time', e.target.value)} />
          </div>
        </div>
        {slotsLoading && (
          <div className="small muted row">
            <Spinner size={14} /> Bo'sh vaqtlar yuklanmoqda...
          </div>
        )}
        {!slotsLoading && slots && slots.status !== 'ok' && (
          <div className="alert alert-amber">Bu kun shifokorning dam olish kuni. Vaqtni qo'lda kiritishingiz mumkin.</div>
        )}
        {!slotsLoading && slots?.status === 'ok' && (
          <>
            <div className="slot-grid">
              {slots.slots.map((slot) => (
                <button
                  key={slot.time}
                  className={`slot-btn ${form.time === slot.time ? 'active' : ''}`}
                  disabled={!slot.available && form.time !== slot.time}
                  onClick={() => set('time', slot.time)}
                  type="button"
                >
                  {slot.time}
                </button>
              ))}
            </div>
            <span className="hint">{availableCount} ta bo'sh vaqt. Chizilgan vaqtlar band.</span>
          </>
        )}
      </div>

      <div className="grid-2">
        {!editing && (
          <div className="field">
            <label>Holati</label>
            <select className="select" value={form.status} onChange={(e) => set('status', e.target.value)}>
              <option value="CONFIRMED">Tasdiqlangan</option>
              <option value="PENDING">Kutilmoqda</option>
              <option value="COMPLETED">Yakunlangan (o'tgan tashrif)</option>
            </select>
          </div>
        )}
        <div className="field" style={{ justifyContent: 'flex-end' }}>
          <label className="checkbox">
            <input type="checkbox" checked={form.notify} onChange={(e) => set('notify', e.target.checked)} />
            Bemorga Telegram orqali xabar yuborish
          </label>
        </div>
      </div>

      <div className="grid-2">
        <div className="field">
          <label>Shikoyat</label>
          <textarea className="textarea" value={form.complaint} onChange={(e) => set('complaint', e.target.value)} placeholder="Masalan: tish og'rig'i" />
        </div>
        <div className="field">
          <label>Administrator izohi (bemor ko'rmaydi)</label>
          <textarea className="textarea" value={form.adminNote} onChange={(e) => set('adminNote', e.target.value)} />
        </div>
      </div>

      {(form.status === 'COMPLETED' || appointment?.status === 'COMPLETED') && (
        <>
          <span className="form-section">Davolash natijasi (bemor tarixida ko'rinadi)</span>
          <div className="grid-2">
            <div className="field">
              <label>Shifokor xulosasi</label>
              <textarea className="textarea" value={form.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} />
            </div>
            <div className="field">
              <label>Tavsiyalar</label>
              <textarea className="textarea" value={form.recommendation} onChange={(e) => set('recommendation', e.target.value)} />
            </div>
          </div>
          <div className="field" style={{ maxWidth: 260 }}>
            <label>To'lov summasi (so'm)</label>
            <input className="input" type="number" min="0" step="1000" value={form.price} onChange={(e) => set('price', e.target.value)} />
          </div>
        </>
      )}
    </Modal>
  );
}
