import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, Download, Search } from 'lucide-react';
import { api, qs } from '../api.js';
import { useAdmin } from '../store.js';
import { Empty, ErrorBox, Loading, Pagination, SourceBadge, StatusBadge, useRefresh, useUI } from '../ui.jsx';
import { addDays, downloadCsv, formatDate, formatPhone, fullName, money, SOURCE, STATUS, todayISO } from '../utils.js';

const PRESETS = [
  { key: 'today', label: 'Bugun', range: () => [todayISO(), todayISO()] },
  { key: 'tomorrow', label: 'Ertaga', range: () => [addDays(todayISO(), 1), addDays(todayISO(), 1)] },
  { key: 'week', label: '7 kun', range: () => [todayISO(), addDays(todayISO(), 6)] },
  { key: 'upcoming', label: 'Kelgusi', range: () => [todayISO(), ''] },
  { key: 'past', label: "O'tgan", range: () => ['', addDays(todayISO(), -1)] },
  { key: 'all', label: 'Barchasi', range: () => ['', ''] },
];

export default function Appointments() {
  const { doctors, openAppointment } = useAdmin();
  const { toast } = useUI();
  const [params] = useSearchParams();
  const [filters, setFilters] = useState(() => ({
    preset: params.get('status') ? 'upcoming' : 'upcoming',
    from: todayISO(),
    to: '',
    status: params.get('status') || '',
    doctorId: '',
    source: '',
    q: '',
    page: 1,
  }));
  const [search, setSearch] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const update = (patch) => setFilters((f) => ({ ...f, page: 1, ...patch }));

  useEffect(() => {
    const timer = setTimeout(() => update({ q: search.trim() }), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const query = {
    from: filters.from,
    to: filters.to,
    status: filters.status,
    doctorId: filters.doctorId,
    source: filters.source,
    q: filters.q,
    sort: filters.preset === 'past' || filters.preset === 'all' ? 'desc' : 'asc',
  };

  const load = useCallback(() => {
    setError(null);
    api(`/appointments${qs({ ...query, page: filters.page, pageSize: 20 })}`)
      .then(setData)
      .catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  useEffect(() => {
    load();
  }, [load]);

  useRefresh(load);

  const applyPreset = (preset) => {
    const [from, to] = PRESETS.find((p) => p.key === preset).range();
    update({ preset, from, to });
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await api(`/appointments${qs({ ...query, page: 1, pageSize: 1000 })}`);
      const rows = [
        ['ID', 'Sana', 'Vaqt', 'Bemor', 'Telefon', 'Shifokor', 'Xizmat', 'Holat', 'Manba', "To'lov", 'Shikoyat', 'Xulosa', 'Baho'],
        ...res.items.map((a) => [
          a.id,
          a.date,
          `${a.startTime}-${a.endTime}`,
          fullName(a.user),
          a.user?.phone,
          a.doctor?.fullName,
          a.service?.nameUz || "Ko'rik",
          STATUS[a.status]?.label,
          SOURCE[a.source],
          a.price ?? '',
          a.complaint ?? '',
          a.diagnosis ?? '',
          a.rating ?? '',
        ]),
      ];
      downloadCsv(`qabullar-${todayISO()}.csv`, rows);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="filters">
        <div className="segmented">
          {PRESETS.map((p) => (
            <button key={p.key} className={filters.preset === p.key ? 'active' : ''} onClick={() => applyPreset(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
        <input className="input" type="date" value={filters.from} onChange={(e) => update({ from: e.target.value, preset: '' })} title="Sanadan" />
        <input className="input" type="date" value={filters.to} onChange={(e) => update({ to: e.target.value, preset: '' })} title="Sanagacha" />
      </div>

      <div className="filters">
        <div className="input-icon" style={{ minWidth: 260 }}>
          <Search size={16} />
          <input className="input" placeholder="Bemor ismi yoki telefoni" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select" value={filters.status} onChange={(e) => update({ status: e.target.value })}>
          <option value="">Barcha holatlar</option>
          {Object.entries(STATUS).map(([key, meta]) => (
            <option key={key} value={key}>
              {meta.label}
            </option>
          ))}
        </select>
        <select className="select" value={filters.doctorId} onChange={(e) => update({ doctorId: e.target.value })}>
          <option value="">Barcha shifokorlar</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.fullName}
            </option>
          ))}
        </select>
        <select className="select" value={filters.source} onChange={(e) => update({ source: e.target.value })}>
          <option value="">Barcha manbalar</option>
          <option value="BOT">Telegram</option>
          <option value="ADMIN">Administrator</option>
        </select>
        <div className="grow" />
        <button className="btn btn-secondary" onClick={exportCsv} disabled={exporting}>
          <Download size={16} /> Excel (CSV)
        </button>
      </div>

      <div className="card">
        {!data ? (
          error ? <ErrorBox message={error} onRetry={load} /> : <Loading />
        ) : data.items.length === 0 ? (
          <Empty icon={ClipboardList} text="Qabullar topilmadi" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Sana va vaqt</th>
                  <th>Bemor</th>
                  <th>Shifokor</th>
                  <th>Xizmat</th>
                  <th>Manba</th>
                  <th>Holat</th>
                  <th className="num">Summa</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((a) => (
                  <tr key={a.id} className="clickable" onClick={() => openAppointment(a.id)}>
                    <td className="nowrap">
                      <div className="bold">{formatDate(a.date, { weekday: true })}</div>
                      <div className="small muted">
                        {a.startTime}–{a.endTime}
                      </div>
                    </td>
                    <td>
                      <div className="bold">{fullName(a.user)}</div>
                      <div className="small muted">{formatPhone(a.user?.phone)}</div>
                    </td>
                    <td>
                      <span className="row nowrap">
                        <span className="color-dot" style={{ background: a.doctor?.color }} />
                        {a.doctor?.fullName}
                      </span>
                    </td>
                    <td className="text-2">{a.service?.nameUz || "Ko'rik"}</td>
                    <td>
                      <SourceBadge source={a.source} />
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
        {data && <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(page) => setFilters((f) => ({ ...f, page }))} />}
      </div>
    </>
  );
}
