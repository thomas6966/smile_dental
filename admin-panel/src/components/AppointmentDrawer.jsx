import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ban, CalendarClock, Check, CheckCheck, Pencil, Phone, RotateCcw, Star, Trash2, UserX } from 'lucide-react';
import { api } from '../api.js';
import { useAdmin } from '../store.js';
import { Drawer, Loading, SourceBadge, Spinner, StatusBadge, useRefresh, useUI } from '../ui.jsx';
import { emitRefresh, formatDate, formatDateTime, formatPhone, fullName, money } from '../utils.js';

function CompleteForm({ appointment, onDone, onCancel }) {
  const { toast } = useUI();
  const [form, setForm] = useState({
    diagnosis: appointment.diagnosis || '',
    recommendation: appointment.recommendation || '',
    price: appointment.price ?? appointment.service?.price ?? '',
    notify: true,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await api(`/appointments/${appointment.id}/status`, {
        method: 'POST',
        body: {
          status: 'COMPLETED',
          diagnosis: form.diagnosis,
          recommendation: form.recommendation,
          price: form.price === '' ? null : Number(form.price),
          notify: form.notify,
        },
      });
      toast('Qabul yakunlandi va bemor tarixiga yozildi');
      onDone();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card" style={{ padding: 14, borderColor: 'var(--green)' }}>
      <div className="stack">
        <div className="bold row">
          <CheckCheck size={18} color="var(--green)" /> Davolash natijasi
        </div>
        <div className="field">
          <label>Shifokor xulosasi</label>
          <textarea className="textarea" value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} placeholder="Masalan: o'rta karies, 36-tish" />
        </div>
        <div className="field">
          <label>Tavsiyalar</label>
          <textarea
            className="textarea"
            value={form.recommendation}
            onChange={(e) => setForm({ ...form, recommendation: e.target.value })}
            placeholder="Masalan: 6 oydan so'ng ko'rikka keling"
          />
        </div>
        <div className="field">
          <label>To'lov summasi (so'm)</label>
          <input className="input" type="number" min="0" step="1000" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
        </div>
        <label className="checkbox">
          <input type="checkbox" checked={form.notify} onChange={(e) => setForm({ ...form, notify: e.target.checked })} />
          Bemorga natija, parvarish maslahatlari va baholash so'rovini yuborish
        </label>
        <div className="row">
          <button className="btn btn-success" onClick={save} disabled={saving}>
            {saving ? <Spinner /> : <Check size={16} />} Yakunlash
          </button>
          <button className="btn btn-ghost" onClick={onCancel}>
            Bekor qilish
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppointmentDrawer({ id, onClose }) {
  const { editAppointment } = useAdmin();
  const { toast, confirm } = useUI();
  const [appointment, setAppointment] = useState(null);
  const [busy, setBusy] = useState(false);
  const [completing, setCompleting] = useState(false);

  const load = useCallback(() => {
    api(`/appointments/${id}`)
      .then((res) => setAppointment(res.appointment))
      .catch((err) => {
        toast(err.message, 'error');
        onClose();
      });
  }, [id, onClose, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useRefresh(load);

  const changeStatus = async (status, extra = {}) => {
    setBusy(true);
    try {
      const res = await api(`/appointments/${id}/status`, { method: 'POST', body: { status, ...extra } });
      setAppointment(res.appointment);
      toast('Holat yangilandi');
      emitRefresh();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    const result = await confirm({
      title: 'Qabulni bekor qilish',
      text: 'Bemorga Telegram orqali xabar yuboriladi.',
      input: 'Sabab (ixtiyoriy)',
      confirmText: 'Bekor qilish',
      cancelText: 'Orqaga',
      danger: true,
    });
    if (result) changeStatus('CANCELLED', { cancelReason: result.value });
  };

  const remove = async () => {
    const ok = await confirm({
      title: "Qabulni o'chirish",
      text: "Qabul butunlay o'chiriladi va tarixda ko'rinmaydi. Davom etasizmi?",
      confirmText: "O'chirish",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/appointments/${id}`, { method: 'DELETE' });
      toast("Qabul o'chirildi");
      emitRefresh();
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const a = appointment;
  const active = a && ['PENDING', 'CONFIRMED'].includes(a.status);

  return (
    <Drawer
      title={a ? `Qabul #${a.id}` : 'Qabul'}
      onClose={onClose}
      headerExtra={a && <StatusBadge status={a.status} />}
      footer={
        a && (
          <>
            {a.status === 'PENDING' && (
              <button className="btn btn-primary" disabled={busy} onClick={() => changeStatus('CONFIRMED')}>
                <Check size={16} /> Tasdiqlash
              </button>
            )}
            {active && !completing && (
              <button className="btn btn-success" disabled={busy} onClick={() => setCompleting(true)}>
                <CheckCheck size={16} /> Yakunlash
              </button>
            )}
            {active && (
              <button className="btn btn-secondary" disabled={busy} onClick={() => editAppointment(a)}>
                <CalendarClock size={16} /> Ko'chirish
              </button>
            )}
            {a.status === 'COMPLETED' && (
              <button className="btn btn-secondary" onClick={() => editAppointment(a)}>
                <Pencil size={16} /> Tahrirlash
              </button>
            )}
            {active && (
              <button className="btn btn-secondary" disabled={busy} onClick={() => changeStatus('NO_SHOW')} title="Bemor kelmadi">
                <UserX size={16} /> Kelmadi
              </button>
            )}
            {active && (
              <button className="btn btn-danger-soft" disabled={busy} onClick={cancel}>
                <Ban size={16} /> Bekor qilish
              </button>
            )}
            {['CANCELLED', 'NO_SHOW'].includes(a.status) && (
              <button className="btn btn-secondary" disabled={busy} onClick={() => changeStatus('CONFIRMED', { notify: false })}>
                <RotateCcw size={16} /> Qayta tiklash
              </button>
            )}
            <button className="btn btn-ghost btn-icon right" onClick={remove} title="O'chirish">
              <Trash2 size={17} />
            </button>
          </>
        )
      }
    >
      {!a && <Loading />}
      {a && (
        <>
          <div className="patient-box">
            <div className="grow">
              <Link to={`/patients/${a.user?.id}`} className="bold link" onClick={onClose}>
                {fullName(a.user)}
              </Link>
              <div className="row small text-2" style={{ marginTop: 2 }}>
                <Phone size={13} />
                <a href={`tel:${a.user?.phone}`}>{formatPhone(a.user?.phone)}</a>
              </div>
            </div>
            {a.user?.hasTelegram ? (
              a.user.username ? (
                <a className="badge tone-violet" href={`https://t.me/${a.user.username}`} target="_blank" rel="noreferrer">
                  @{a.user.username}
                </a>
              ) : (
                <span className="badge tone-violet">Telegram</span>
              )
            ) : (
              <span className="badge tone-gray">Telegramsiz</span>
            )}
          </div>

          {completing && (
            <CompleteForm
              appointment={a}
              onCancel={() => setCompleting(false)}
              onDone={() => {
                setCompleting(false);
                load();
                emitRefresh();
              }}
            />
          )}

          <dl className="info-list">
            <dt>Sana</dt>
            <dd>{formatDate(a.date, { weekday: true, year: true })}</dd>
            <dt>Vaqt</dt>
            <dd>
              {a.startTime} – {a.endTime} <span className="muted">({a.durationMin} daq)</span>
            </dd>
            <dt>Shifokor</dt>
            <dd className="row">
              <span className="color-dot" style={{ background: a.doctor?.color }} />
              {a.doctor?.fullName}
            </dd>
            <dt>Xizmat</dt>
            <dd>
              {a.service ? a.service.nameUz : "Ko'rik"}
              {a.service && <div className="small muted">{a.service.price ? money(a.service.price) : 'Bepul'}</div>}
            </dd>
            <dt>Manba</dt>
            <dd>
              <SourceBadge source={a.source} />
            </dd>
            <dt>Yaratilgan</dt>
            <dd>{formatDateTime(a.createdAt)}</dd>
            {a.price != null && a.status === 'COMPLETED' && (
              <>
                <dt>To'lov</dt>
                <dd className="bold">{money(a.price)}</dd>
              </>
            )}
          </dl>

          {a.complaint && (
            <div className="note-box">
              <span className="label">Shikoyat</span>
              <div className="pre-line">{a.complaint}</div>
            </div>
          )}
          {a.adminNote && (
            <div className="note-box">
              <span className="label">Administrator izohi</span>
              <div className="pre-line">{a.adminNote}</div>
            </div>
          )}
          {a.diagnosis && (
            <div className="note-box" style={{ background: 'var(--primary-50)' }}>
              <span className="label">Shifokor xulosasi</span>
              <div className="pre-line">{a.diagnosis}</div>
            </div>
          )}
          {a.recommendation && (
            <div className="note-box" style={{ background: 'var(--green-50)' }}>
              <span className="label">Tavsiyalar</span>
              <div className="pre-line">{a.recommendation}</div>
            </div>
          )}
          {a.rating && (
            <div className="note-box" style={{ background: 'var(--amber-50)' }}>
              <span className="label">Bemor bahosi</span>
              <div className="row">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} size={18} color="#f59e0b" fill={n <= a.rating ? '#f59e0b' : 'none'} />
                ))}
              </div>
              {a.feedback && <div style={{ marginTop: 6 }}>«{a.feedback}»</div>}
            </div>
          )}
          {a.status === 'CANCELLED' && (
            <div className="note-box" style={{ background: 'var(--red-50)' }}>
              <span className="label">Bekor qilingan ({a.cancelledBy === 'PATIENT' ? 'bemor tomonidan' : 'administrator tomonidan'})</span>
              <div>{a.cancelReason || "Sabab ko'rsatilmagan"}</div>
            </div>
          )}
        </>
      )}
    </Drawer>
  );
}
