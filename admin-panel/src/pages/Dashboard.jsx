import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlarmClock, CalendarCheck, Check, CheckCheck, Clock, Star, Users, Wallet } from 'lucide-react';
import { api } from '../api.js';
import { useAdmin } from '../store.js';
import { Empty, ErrorBox, Loading, SourceBadge, StatusBadge, useRefresh, useUI } from '../ui.jsx';
import { emitRefresh, formatDate, formatPhone, fullName, money, weekdayOf, WEEKDAYS_SHORT } from '../utils.js';

function Kpi({ icon: Icon, tone, label, value, sub, to }) {
  const content = (
    <div className="card kpi">
      <div className={`kpi-icon tone-${tone}`}>
        <Icon size={20} />
      </div>
      <div className="grow">
        <div className="kpi-label">{label}</div>
        <div className="kpi-value">{value}</div>
        {sub && <div className="small muted">{sub}</div>}
      </div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

export default function Dashboard() {
  const { openAppointment } = useAdmin();
  const { toast } = useUI();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    api('/dashboard')
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRefresh(load);

  const quickStatus = async (id, status) => {
    try {
      await api(`/appointments/${id}/status`, { method: 'POST', body: { status } });
      toast(status === 'CONFIRMED' ? 'Qabul tasdiqlandi' : 'Holat yangilandi');
      emitRefresh();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (!data) return error ? <ErrorBox message={error} onRetry={load} /> : <Loading />;

  const { stats } = data;
  const maxChart = Math.max(1, ...data.chart.map((c) => c.count));
  const maxTop = Math.max(1, ...data.topServices.map((s) => s.count));

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h2>Assalomu alaykum! 👋</h2>
          <p className="muted">Bugun: {formatDate(data.today, { weekday: true, year: true })}</p>
        </div>
      </div>

      <div className="kpis">
        <Kpi
          icon={CalendarCheck}
          tone="blue"
          label="Bugungi qabullar"
          value={stats.todayTotal}
          sub={`${stats.todayCompleted} tasi yakunlangan`}
          to="/calendar"
        />
        <Kpi icon={AlarmClock} tone="amber" label="Tasdiqlash kutilmoqda" value={stats.pending} sub="Telegram orqali yozilganlar" to="/appointments?status=PENDING" />
        <Kpi icon={Wallet} tone="green" label="Shu oydagi tushum" value={money(stats.monthRevenue)} sub={`${stats.monthVisits} ta tashrif`} />
        <Kpi icon={Users} tone="violet" label="Bemorlar" value={stats.totalPatients} sub={`Shu oy +${stats.newPatients} ta yangi`} to="/patients" />
        <Kpi
          icon={Star}
          tone="amber"
          label="O'rtacha baho"
          value={stats.rating ? `★ ${stats.rating}` : '—'}
          sub={`${stats.ratingCount} ta baho`}
        />
      </div>

      <div className="dash-grid">
        <div className="stack" style={{ gap: 18 }}>
          <div className="card">
            <div className="card-head">
              <h3 className="grow">Bugungi jadval</h3>
              <Link to="/calendar" className="link small">
                Kalendarda ochish →
              </Link>
            </div>
            {data.todayList.length === 0 ? (
              <Empty icon={CalendarCheck} text="Bugun uchun qabullar yo'q" />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Vaqt</th>
                      <th>Bemor</th>
                      <th>Shifokor</th>
                      <th>Xizmat</th>
                      <th>Holat</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.todayList.map((a) => (
                      <tr key={a.id} className="clickable" onClick={() => openAppointment(a.id)}>
                        <td className="bold nowrap">
                          {a.startTime}–{a.endTime}
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
                          <StatusBadge status={a.status} />
                        </td>
                        <td className="num" onClick={(e) => e.stopPropagation()}>
                          {a.status === 'PENDING' && (
                            <button className="btn btn-soft btn-sm" onClick={() => quickStatus(a.id, 'CONFIRMED')}>
                              <Check size={14} /> Tasdiqlash
                            </button>
                          )}
                          {a.status === 'CONFIRMED' && (
                            <button className="btn btn-secondary btn-sm" onClick={() => openAppointment(a.id)}>
                              <CheckCheck size={14} /> Yakunlash
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <h3 className="grow">So'nggi 14 kundagi qabullar</h3>
            </div>
            <div className="card-body">
              <div className="bars">
                {data.chart.map((c) => (
                  <div key={c.date} className={`bar ${c.date === data.today ? 'today' : ''}`} title={`${formatDate(c.date)}: ${c.count} ta`}>
                    <span className="bar-value">{c.count || ''}</span>
                    <div className="bar-fill" style={{ height: `${(c.count / maxChart) * 100}%` }} />
                    <span className="bar-label">
                      {Number(c.date.slice(8))} {WEEKDAYS_SHORT[weekdayOf(c.date)]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {data.unmarked.length > 0 && (
            <div className="card" style={{ borderColor: '#fde7bf' }}>
              <div className="card-head">
                <Clock size={18} color="var(--amber)" />
                <h3 className="grow">Natijasi belgilanmagan o'tgan qabullar</h3>
                <span className="badge tone-amber">{data.unmarked.length}</span>
              </div>
              <div className="table-wrap">
                <table className="table">
                  <tbody>
                    {data.unmarked.map((a) => (
                      <tr key={a.id} className="clickable" onClick={() => openAppointment(a.id)}>
                        <td className="nowrap">
                          <div className="bold">{formatDate(a.date)}</div>
                          <div className="small muted">{a.startTime}</div>
                        </td>
                        <td>
                          <div className="bold">{fullName(a.user)}</div>
                          <div className="small muted">{a.doctor?.fullName}</div>
                        </td>
                        <td className="text-2">{a.service?.nameUz || "Ko'rik"}</td>
                        <td className="num" onClick={(e) => e.stopPropagation()}>
                          <div className="row" style={{ justifyContent: 'flex-end' }}>
                            <button className="btn btn-soft btn-sm" onClick={() => openAppointment(a.id)}>
                              Yakunlash
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => quickStatus(a.id, 'NO_SHOW')}>
                              Kelmadi
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="stack" style={{ gap: 18 }}>
          <div className="card">
            <div className="card-head">
              <h3 className="grow">Tasdiqlash kutilmoqda</h3>
              {stats.pending > 0 && <span className="badge tone-amber">{stats.pending}</span>}
            </div>
            {data.pending.length === 0 ? (
              <Empty icon={CheckCheck} text="Barcha yozilishlar tasdiqlangan" />
            ) : (
              data.pending.map((a) => (
                <div key={a.id} className="notif" style={{ cursor: 'pointer' }} onClick={() => openAppointment(a.id)}>
                  <div className="grow">
                    <div className="bold">{fullName(a.user)}</div>
                    <div className="small text-2">
                      {formatDate(a.date, { weekday: true })}, {a.startTime}
                    </div>
                    <div className="small muted row" style={{ gap: 6 }}>
                      {a.service?.nameUz || "Ko'rik"} · <SourceBadge source={a.source} />
                    </div>
                  </div>
                  <button
                    className="btn btn-soft btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      quickStatus(a.id, 'CONFIRMED');
                    }}
                  >
                    <Check size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Shu oydagi top xizmatlar</h3>
            </div>
            <div className="card-body stack">
              {data.topServices.length === 0 && <span className="muted">Ma'lumot yo'q</span>}
              {data.topServices.map((s) => (
                <div key={s.id}>
                  <div className="row" style={{ justifyContent: 'space-between', marginBottom: 5 }}>
                    <span className="ellipsis">{s.name}</span>
                    <span className="bold">{s.count}</span>
                  </div>
                  <div className="progress-line">
                    <div style={{ width: `${(s.count / maxTop) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>So'nggi baholar</h3>
            </div>
            {data.reviews.length === 0 ? (
              <Empty icon={Star} text="Hozircha baholar yo'q" />
            ) : (
              data.reviews.map((a) => (
                <div key={a.id} className="notif" style={{ cursor: 'pointer' }} onClick={() => openAppointment(a.id)}>
                  <div className="grow">
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <span className="bold">{fullName(a.user)}</span>
                      <span style={{ color: '#f59e0b', letterSpacing: 1 }}>{'★'.repeat(a.rating)}</span>
                    </div>
                    <div className="small muted">
                      {a.doctor?.fullName} · {formatDate(a.date)}
                    </div>
                    {a.feedback && <div className="small text-2" style={{ marginTop: 3 }}>«{a.feedback}»</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
