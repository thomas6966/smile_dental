import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BellRing, CalendarPlus, MessageSquare, Pencil, Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { useAdmin } from '../store.js';
import { Avatar, Empty, Loading, Modal, SourceBadge, Spinner, StatusBadge, useRefresh, useUI } from '../ui.jsx';
import { formatDate, formatDateTime, formatPhone, fullName, localDate, money } from '../utils.js';
import { PatientFormModal } from './Patients.jsx';

function MessageModal({ patient, onClose }) {
  const { toast } = useUI();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      await api(`/patients/${patient.id}/message`, { method: 'POST', body: { text } });
      toast('Xabar yuborildi');
      onClose();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal
      title={`Xabar: ${fullName(patient)}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Bekor qilish
          </button>
          <button className="btn btn-primary" onClick={send} disabled={sending || !text.trim()}>
            {sending ? <Spinner /> : 'Yuborish'}
          </button>
        </>
      }
    >
      <div className="field">
        <label>Xabar matni</label>
        <textarea className="textarea" style={{ minHeight: 140 }} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
        <span className="hint">Xabar bemorga Telegram bot orqali klinika nomidan yuboriladi.</span>
      </div>
    </Modal>
  );
}

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { newAppointment, openAppointment } = useAdmin();
  const { toast, confirm } = useUI();
  const [data, setData] = useState(null);
  const [editing, setEditing] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const load = useCallback(() => {
    api(`/patients/${id}`)
      .then((res) => {
        setData(res);
        setNotes(res.patient.notes || '');
      })
      .catch((err) => {
        toast(err.message, 'error');
        navigate('/patients');
      });
  }, [id, navigate, toast]);

  useEffect(() => {
    load();
  }, [load]);

  useRefresh(load);

  if (!data) return <Loading />;
  const { patient, stats, appointments } = data;

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      await api(`/patients/${patient.id}`, { method: 'PATCH', body: { notes } });
      toast('Izoh saqlandi');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSavingNotes(false);
    }
  };

  const sendReminder = async () => {
    const ok = await confirm({
      title: "Ko'rik eslatmasini yuborish",
      text: "Bemorga profilaktik ko'rik haqida eslatma va foydali maslahat yuboriladi.",
      confirmText: 'Yuborish',
    });
    if (!ok) return;
    try {
      await api(`/patients/${patient.id}/checkup-reminder`, { method: 'POST' });
      toast('Eslatma yuborildi');
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  const remove = async () => {
    const ok = await confirm({
      title: "Bemorni o'chirish",
      text: `${fullName(patient)} va uning barcha qabullari butunlay o'chiriladi. Bu amalni qaytarib bo'lmaydi.`,
      confirmText: "O'chirish",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/patients/${patient.id}`, { method: 'DELETE' });
      toast("Bemor o'chirildi");
      navigate('/patients');
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <Link to="/patients" className="row text-2" style={{ marginBottom: 14, display: 'inline-flex' }}>
        <ArrowLeft size={16} /> Bemorlar ro'yxati
      </Link>

      <div className="page-head">
        <Avatar name={fullName(patient)} size={52} />
        <div className="grow">
          <h2 className="row" style={{ gap: 8 }}>
            {fullName(patient)}
            {patient.isDemo && <span className="badge tone-gray">demo</span>}
          </h2>
          <div className="row-wrap text-2" style={{ marginTop: 2 }}>
            <a href={`tel:${patient.phone}`}>{formatPhone(patient.phone)}</a>
            {patient.hasTelegram ? (
              <span className={`badge ${patient.isBlocked ? 'tone-red' : 'tone-violet'}`}>
                {patient.isBlocked ? 'Botni bloklagan' : patient.username ? `Telegram: @${patient.username}` : 'Telegram ulangan'}
              </span>
            ) : (
              <span className="badge tone-gray">Telegramga ulanmagan</span>
            )}
          </div>
        </div>
        <div className="row-wrap">
          <button className="btn btn-primary" onClick={() => newAppointment({ patient })}>
            <CalendarPlus size={16} /> Qabulga yozish
          </button>
          {patient.hasTelegram && (
            <>
              <button className="btn btn-secondary" onClick={() => setMessaging(true)}>
                <MessageSquare size={16} /> Xabar
              </button>
              <button className="btn btn-secondary" onClick={sendReminder}>
                <BellRing size={16} /> Ko'rik eslatmasi
              </button>
            </>
          )}
          <button className="btn btn-secondary btn-icon" onClick={() => setEditing(true)} title="Tahrirlash">
            <Pencil size={16} />
          </button>
          <button className="btn btn-danger-soft btn-icon" onClick={remove} title="O'chirish">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="kpis" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <div className="card kpi">
          <div className="grow">
            <div className="kpi-label">Tashriflar</div>
            <div className="kpi-value">{stats.visits}</div>
          </div>
        </div>
        <div className="card kpi">
          <div className="grow">
            <div className="kpi-label">Jami to'lov</div>
            <div className="kpi-value">{money(stats.spent)}</div>
          </div>
        </div>
        <div className="card kpi">
          <div className="grow">
            <div className="kpi-label">Bekor qilgan</div>
            <div className="kpi-value">{stats.cancelled}</div>
          </div>
        </div>
        <div className="card kpi">
          <div className="grow">
            <div className="kpi-label">Kelmagan</div>
            <div className="kpi-value">{stats.noShow}</div>
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="card">
          <div className="card-head">
            <h3 className="grow">Qabullar va davolanish tarixi</h3>
            <span className="muted small">{appointments.length} ta</span>
          </div>
          {appointments.length === 0 ? (
            <Empty text="Qabullar yo'q" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th>Xizmat va shifokor</th>
                    <th>Xulosa</th>
                    <th>Holat</th>
                    <th className="num">Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((a) => (
                    <tr key={a.id} className="clickable" onClick={() => openAppointment(a.id)}>
                      <td className="nowrap">
                        <div className="bold">{formatDate(a.date, { year: true })}</div>
                        <div className="small muted">{a.startTime}</div>
                      </td>
                      <td>
                        <div className="bold">{a.service?.nameUz || "Ko'rik"}</div>
                        <div className="small muted row" style={{ gap: 6 }}>
                          {a.doctor?.fullName} <SourceBadge source={a.source} />
                        </div>
                      </td>
                      <td className="text-2" style={{ maxWidth: 260 }}>
                        <div className="ellipsis">{a.diagnosis || a.complaint || '—'}</div>
                        {a.rating && <div style={{ color: '#f59e0b' }}>{'★'.repeat(a.rating)}</div>}
                      </td>
                      <td>
                        <StatusBadge status={a.status} />
                      </td>
                      <td className="num">{a.status === 'COMPLETED' && a.price != null ? money(a.price) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="stack" style={{ gap: 18 }}>
          <div className="card">
            <div className="card-head">
              <h3>Ma'lumotlar</h3>
            </div>
            <div className="card-body">
              <dl className="info-list">
                <dt>Tug'ilgan sana</dt>
                <dd>{patient.birthDate ? formatDate(patient.birthDate, { year: true }) : '—'}</dd>
                <dt>Til</dt>
                <dd>{patient.language === 'ru' ? 'Ruscha' : "O'zbekcha"}</dd>
                <dt>Oxirgi tashrif</dt>
                <dd>{patient.lastVisitAt ? formatDate(localDate(patient.lastVisitAt), { year: true }) : '—'}</dd>
                <dt>Ko'rik eslatmasi</dt>
                <dd>{patient.lastCheckupReminderAt ? formatDateTime(patient.lastCheckupReminderAt) : 'Yuborilmagan'}</dd>
                <dt>Ro'yxatdan o'tgan</dt>
                <dd>{formatDateTime(patient.createdAt)}</dd>
              </dl>
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Tibbiy izoh</h3>
            </div>
            <div className="card-body stack">
              <textarea
                className="textarea"
                style={{ minHeight: 110 }}
                placeholder="Allergiya, surunkali kasalliklar, muhim eslatmalar..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <button className="btn btn-secondary" onClick={saveNotes} disabled={savingNotes || notes === (patient.notes || '')}>
                {savingNotes ? <Spinner /> : 'Izohni saqlash'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <PatientFormModal
          patient={patient}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            load();
          }}
        />
      )}
      {messaging && <MessageModal patient={patient} onClose={() => setMessaging(false)} />}
    </>
  );
}
