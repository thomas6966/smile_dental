import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Search, UserPlus, Users } from 'lucide-react';
import { api, qs } from '../api.js';
import { Empty, ErrorBox, Loading, Modal, Pagination, Spinner, useRefresh, useUI } from '../ui.jsx';
import { downloadCsv, formatDate, formatPhone, fullName, localDate, money, todayISO } from '../utils.js';

export function PatientFormModal({ patient, onClose, onSaved }) {
  const { toast } = useUI();
  const [form, setForm] = useState({
    firstName: patient?.firstName || '',
    lastName: patient?.lastName || '',
    phone: patient?.phone || '',
    birthDate: patient?.birthDate || '',
    language: patient?.language || 'uz',
    notes: patient?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const save = async () => {
    setSaving(true);
    try {
      const res = patient
        ? await api(`/patients/${patient.id}`, { method: 'PATCH', body: form })
        : await api('/patients', { method: 'POST', body: form });
      toast(patient ? "Ma'lumotlar saqlandi" : "Bemor qo'shildi");
      onSaved(res.patient);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={patient ? 'Bemor maʼlumotlarini tahrirlash' : 'Yangi bemor'}
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
          <label>Ism *</label>
          <input className="input" value={form.firstName} onChange={set('firstName')} autoFocus />
        </div>
        <div className="field">
          <label>Familiya</label>
          <input className="input" value={form.lastName} onChange={set('lastName')} />
        </div>
        <div className="field">
          <label>Telefon *</label>
          <input className="input" placeholder="+998 90 123 45 67" value={form.phone} onChange={set('phone')} />
        </div>
        <div className="field">
          <label>Tug'ilgan sana</label>
          <input className="input" type="date" value={form.birthDate} onChange={set('birthDate')} />
        </div>
        <div className="field">
          <label>Til</label>
          <select className="select" value={form.language} onChange={set('language')}>
            <option value="uz">O'zbekcha</option>
            <option value="ru">Ruscha</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label>Izoh (allergiya, surunkali kasalliklar va h.k.)</label>
        <textarea className="textarea" value={form.notes} onChange={set('notes')} />
      </div>
    </Modal>
  );
}

export default function Patients() {
  const navigate = useNavigate();
  const { toast } = useUI();
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ q: '', filter: '', page: 1 });
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFilters((f) => (f.q === search.trim() ? f : { ...f, q: search.trim(), page: 1 })), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(() => {
    setError(null);
    api(`/patients${qs({ q: filters.q, filter: filters.filter, page: filters.page, pageSize: 20 })}`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useRefresh(load);

  const exportCsv = async () => {
    try {
      const res = await api(`/patients${qs({ q: filters.q, filter: filters.filter, pageSize: 1000 })}`);
      downloadCsv(`bemorlar-${todayISO()}.csv`, [
        ['ID', 'Ism', 'Familiya', 'Telefon', 'Telegram', 'Tashriflar', "Jami to'lov", 'Oxirgi tashrif', "Qo'shilgan"],
        ...res.items.map((p) => [
          p.id,
          p.firstName,
          p.lastName || '',
          p.phone || '',
          p.hasTelegram ? 'Ha' : "Yo'q",
          p.visits,
          p.spent,
          localDate(p.lastVisitAt) || '',
          localDate(p.createdAt),
        ]),
      ]);
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <>
      <div className="filters">
        <div className="input-icon" style={{ minWidth: 300 }}>
          <Search size={16} />
          <input className="input" placeholder="Ism, telefon yoki @username" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="segmented">
          {[
            ['', 'Barchasi'],
            ['telegram', 'Telegram orqali'],
            ['offline', 'Telegramsiz'],
          ].map(([key, label]) => (
            <button key={key} className={filters.filter === key ? 'active' : ''} onClick={() => setFilters({ ...filters, filter: key, page: 1 })}>
              {label}
            </button>
          ))}
        </div>
        <div className="grow" />
        <button className="btn btn-secondary" onClick={exportCsv}>
          <Download size={16} /> Excel (CSV)
        </button>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          <UserPlus size={16} /> Yangi bemor
        </button>
      </div>

      <div className="card">
        {!data ? (
          error ? <ErrorBox message={error} onRetry={load} /> : <Loading />
        ) : data.items.length === 0 ? (
          <Empty icon={Users} text="Bemorlar topilmadi" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Bemor</th>
                  <th>Telefon</th>
                  <th>Telegram</th>
                  <th className="num">Tashriflar</th>
                  <th>Oxirgi tashrif</th>
                  <th>Keyingi qabul</th>
                  <th className="num">Jami to'lov</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id} className="clickable" onClick={() => navigate(`/patients/${p.id}`)}>
                    <td>
                      <div className="bold row" style={{ gap: 6 }}>
                        {fullName(p)}
                        {p.isDemo && <span className="badge tone-gray">demo</span>}
                      </div>
                      {p.username && <div className="small muted">@{p.username}</div>}
                    </td>
                    <td className="nowrap">{formatPhone(p.phone)}</td>
                    <td>
                      {p.hasTelegram ? (
                        <span className={`badge ${p.isBlocked ? 'tone-red' : 'tone-violet'}`}>{p.isBlocked ? 'Bloklagan' : 'Ulangan'}</span>
                      ) : (
                        <span className="badge tone-gray">Yo'q</span>
                      )}
                    </td>
                    <td className="num bold">{p.visits}</td>
                    <td className="nowrap">{p.lastVisitAt ? formatDate(localDate(p.lastVisitAt), { year: true }) : '—'}</td>
                    <td className="nowrap">
                      {p.nextAppointment ? `${formatDate(p.nextAppointment.date)}, ${p.nextAppointment.startTime}` : '—'}
                    </td>
                    <td className="num">{p.spent ? money(p.spent) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(page) => setFilters({ ...filters, page })} />}
      </div>

      {creating && (
        <PatientFormModal
          onClose={() => setCreating(false)}
          onSaved={(patient) => {
            setCreating(false);
            navigate(`/patients/${patient.id}`);
          }}
        />
      )}
    </>
  );
}
