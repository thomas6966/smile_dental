import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { api, qs } from '../api.js';
import { useAdmin } from '../store.js';
import { Avatar, ErrorBox, Loading, useRefresh } from '../ui.jsx';
import { addDays, formatDate, fullName, todayISO, toMinutes, toTime, weekdayOf, WEEKDAYS_SHORT } from '../utils.js';

const PX = 1.6; // 1 daqiqa = 1.6px (30 daqiqa = 48px)

function layoutEvents(events) {
  const sorted = [...events].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  const lanes = [];
  const placed = sorted.map((event) => {
    const start = toMinutes(event.startTime);
    const end = toMinutes(event.endTime);
    let lane = lanes.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) {
      lane = lanes.length;
      lanes.push(end);
    } else {
      lanes[lane] = end;
    }
    return { event, lane };
  });
  return placed.map((p) => ({ ...p, total: Math.max(1, lanes.length) }));
}

function nowMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export default function CalendarPage() {
  const { doctors, openAppointment, newAppointment } = useAdmin();
  const activeDoctors = doctors.filter((d) => d.isActive);
  const [date, setDate] = useState(todayISO());
  const [view, setView] = useState('day');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [hover, setHover] = useState(null);
  const [, setTick] = useState(0);

  const weekStart = addDays(date, -((weekdayOf(date) + 6) % 7));
  const from = view === 'day' ? date : weekStart;
  const to = view === 'day' ? date : addDays(weekStart, 6);
  const weekDoctorId = Number(doctorFilter) || activeDoctors[0]?.id;

  const load = useCallback(() => {
    setError(null);
    api(`/calendar${qs({ from, to, doctorId: view === 'week' ? weekDoctorId : undefined })}`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [from, to, view, weekDoctorId]);

  useEffect(() => {
    load();
  }, [load]);

  useRefresh(load);

  // "Hozir" chizig'ini har daqiqada yangilash
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(timer);
  }, []);

  const step = data?.slotStepMin || 30;

  const columns = useMemo(() => {
    if (!data) return [];
    if (view === 'week') {
      const doctor = data.doctors.find((d) => d.id === weekDoctorId);
      if (!doctor) return [];
      return Array.from({ length: 7 }, (_, i) => {
        const day = addDays(weekStart, i);
        return { key: day, date: day, doctor };
      });
    }
    return data.doctors
      .filter((d) => !doctorFilter || d.id === Number(doctorFilter))
      .map((doctor) => ({ key: doctor.id, date, doctor }));
  }, [data, view, weekDoctorId, weekStart, date, doctorFilter]);

  const range = useMemo(() => {
    let start = 24 * 60;
    let end = 0;
    columns.forEach((col) => {
      const s = col.doctor.schedule?.[weekdayOf(col.date)];
      if (s?.on) {
        start = Math.min(start, toMinutes(s.start));
        end = Math.max(end, toMinutes(s.end));
      }
    });
    (data?.appointments || []).forEach((a) => {
      start = Math.min(start, toMinutes(a.startTime));
      end = Math.max(end, toMinutes(a.endTime));
    });
    if (start >= end) {
      start = 9 * 60;
      end = 18 * 60;
    }
    return { start: Math.floor(start / 60) * 60, end: Math.ceil(end / 60) * 60 };
  }, [columns, data]);

  const height = (range.end - range.start) * PX;
  const today = todayISO();

  const shift = (days) => setDate(addDays(date, view === 'day' ? days : days * 7));

  const offBlocks = (col) => {
    const dayOff = data.timeOffs.find(
      (t) => (t.doctorId === null || t.doctorId === col.doctor.id) && t.dateFrom <= col.date && col.date <= t.dateTo,
    );
    const s = col.doctor.schedule?.[weekdayOf(col.date)];
    if (dayOff || !s?.on) {
      return [{ from: range.start, to: range.end, label: dayOff?.reason || 'Dam olish kuni' }];
    }
    const blocks = [];
    if (toMinutes(s.start) > range.start) blocks.push({ from: range.start, to: toMinutes(s.start) });
    if (s.breakStart && s.breakEnd) blocks.push({ from: toMinutes(s.breakStart), to: toMinutes(s.breakEnd), label: 'Tushlik' });
    if (toMinutes(s.end) < range.end) blocks.push({ from: toMinutes(s.end), to: range.end });
    return blocks;
  };

  const minutesFromEvent = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const minutes = range.start + Math.floor((e.clientY - rect.top) / PX / step) * step;
    return Math.max(range.start, Math.min(range.end - step, minutes));
  };

  const title =
    view === 'day'
      ? formatDate(date, { weekday: true, year: true })
      : `${formatDate(weekStart)} – ${formatDate(addDays(weekStart, 6), { year: true })}`;

  return (
    <>
      <div className="cal-toolbar">
        <div className="row">
          <button className="btn btn-secondary btn-icon" onClick={() => shift(-1)} aria-label="Oldingi">
            <ChevronLeft size={18} />
          </button>
          <button className="btn btn-secondary" onClick={() => setDate(todayISO())}>
            Bugun
          </button>
          <button className="btn btn-secondary btn-icon" onClick={() => shift(1)} aria-label="Keyingi">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="cal-title">{title}</div>
        <input className="input" type="date" style={{ width: 160 }} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
        <div className="grow" />
        <div className="segmented">
          <button className={view === 'day' ? 'active' : ''} onClick={() => setView('day')}>
            Kun
          </button>
          <button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>
            Hafta
          </button>
        </div>
        <select className="select" style={{ width: 220 }} value={view === 'week' ? weekDoctorId || '' : doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}>
          {view === 'day' && <option value="">Barcha shifokorlar</option>}
          {activeDoctors.map((d) => (
            <option key={d.id} value={d.id}>
              {d.fullName}
            </option>
          ))}
        </select>
      </div>

      {!data ? (
        error ? <ErrorBox message={error} onRetry={load} /> : <Loading />
      ) : (
        <>
          <div className="cal-scroll">
            <div className="cal" style={{ gridTemplateColumns: `64px repeat(${columns.length}, minmax(170px, 1fr))` }}>
              <div className="cal-corner" />
              {columns.map((col) => {
                const count = data.appointments.filter((a) => a.doctor?.id === col.doctor.id && a.date === col.date).length;
                return (
                  <div key={col.key} className={`cal-colhead ${col.date === today && view === 'week' ? 'today-col' : ''}`}>
                    {view === 'day' ? (
                      <>
                        <Avatar name={col.doctor.fullName} color={col.doctor.color} size={32} />
                        <div className="grow">
                          <div className="bold ellipsis">{col.doctor.fullName}</div>
                          <div className="small muted ellipsis">
                            {col.doctor.specialtyUz} · {count} ta
                          </div>
                        </div>
                      </>
                    ) : (
                      <div>
                        <div className="small muted">{WEEKDAYS_SHORT[weekdayOf(col.date)]}</div>
                        <div className="bold">
                          {formatDate(col.date)} · <span className="muted">{count} ta</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="cal-times" style={{ height }}>
                {Array.from({ length: (range.end - range.start) / 60 + 1 }, (_, i) => {
                  const minutes = range.start + i * 60;
                  return (
                    <span key={minutes} className="cal-time" style={{ top: Math.min(height - 8, Math.max(8, i * 60 * PX)) }}>
                      {toTime(minutes)}
                    </span>
                  );
                })}
              </div>

              {columns.map((col) => {
                const events = layoutEvents(data.appointments.filter((a) => a.doctor?.id === col.doctor.id && a.date === col.date));
                const showNow = col.date === today && nowMinutes() >= range.start && nowMinutes() <= range.end;
                return (
                  <div
                    key={col.key}
                    className="cal-col"
                    style={{ height }}
                    onMouseMove={(e) => {
                      if (e.target !== e.currentTarget) return setHover(null);
                      return setHover({ key: col.key, minutes: minutesFromEvent(e) });
                    }}
                    onMouseLeave={() => setHover(null)}
                    onClick={(e) => {
                      if (e.target !== e.currentTarget) return;
                      newAppointment({ doctorId: col.doctor.id, date: col.date, time: toTime(minutesFromEvent(e)) });
                    }}
                  >
                    {Array.from({ length: (range.end - range.start) / 30 }, (_, i) => (
                      <div key={i} className={`cal-line ${i % 2 ? 'half' : ''}`} style={{ top: i * 30 * PX }} />
                    ))}

                    {offBlocks(col).map((b) => (
                      <div key={`${b.from}-${b.to}`} className="cal-off" style={{ top: (b.from - range.start) * PX, height: (b.to - b.from) * PX }}>
                        {b.label && <span className="cal-off-label">{b.label}</span>}
                      </div>
                    ))}

                    {hover?.key === col.key && (
                      <div className="cal-hover" style={{ top: (hover.minutes - range.start) * PX, height: step * PX }}>
                        + {toTime(hover.minutes)}
                      </div>
                    )}

                    {events.map(({ event: a, lane, total }) => {
                      const top = (toMinutes(a.startTime) - range.start) * PX;
                      const h = Math.max(22, (toMinutes(a.endTime) - toMinutes(a.startTime)) * PX - 2);
                      return (
                        <div
                          key={a.id}
                          className={`cal-event s-${a.status}`}
                          style={{
                            top,
                            height: h,
                            borderLeftColor: col.doctor.color,
                            left: `calc(${(lane / total) * 100}% + 4px)`,
                            right: 'auto',
                            width: `calc(${100 / total}% - 8px)`,
                          }}
                          onClick={() => openAppointment(a.id)}
                          title={`${a.startTime}–${a.endTime} · ${fullName(a.user)} · ${a.service?.nameUz || "Ko'rik"}`}
                        >
                          <div className="row" style={{ gap: 6 }}>
                            <span className="cal-event-time">{a.startTime}</span>
                            {a.source === 'BOT' && <span title="Telegram orqali">📱</span>}
                            {a.status === 'COMPLETED' && <span title="Yakunlangan">✅</span>}
                            {a.status === 'NO_SHOW' && <span title="Kelmadi">⚠️</span>}
                          </div>
                          <div className="cal-event-name">{fullName(a.user)}</div>
                          {h > 60 && <div className="small text-2 ellipsis">{a.service?.nameUz || "Ko'rik"}</div>}
                        </div>
                      );
                    })}

                    {showNow && <div className="cal-now" style={{ top: (nowMinutes() - range.start) * PX }} />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="legend" style={{ marginTop: 12 }}>
            <span>
              <i style={{ background: 'var(--amber-50)', border: '1px solid #f5d49a' }} /> Kutilmoqda
            </span>
            <span>
              <i style={{ background: 'var(--primary-50)', border: '1px solid var(--primary-100)' }} /> Tasdiqlangan
            </span>
            <span>
              <i style={{ background: 'var(--green-50)', border: '1px solid #bbf7d0' }} /> Yakunlangan
            </span>
            <span>
              <i style={{ background: 'var(--red-50)', border: '1px solid #fecaca' }} /> Kelmadi
            </span>
            <span>
              <i style={{ background: 'repeating-linear-gradient(-45deg,#f6f8fb,#f6f8fb 3px,#e2e8f0 3px,#e2e8f0 6px)' }} /> Ish vaqtidan tashqari
            </span>
            <span className="muted">Bo'sh joyni bosing — yangi qabul qo'shiladi</span>
          </div>
        </>
      )}
    </>
  );
}
