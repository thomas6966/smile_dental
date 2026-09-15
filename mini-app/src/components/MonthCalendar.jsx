import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthTitle, parseDate, translate, weekdayShort } from '../i18n.js';
import { Spinner } from './Common.jsx';

// Hafta dushanbadan boshlanadi
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function MonthCalendar({ lang, month, calendar, selected, today, loading, canPrev, canNext, onPrev, onNext, onSelect }) {
  const first = parseDate(`${month}-01`);
  const leading = (first.weekday + 6) % 7;
  const days = calendar?.days || [];

  return (
    <div className="calendar">
      <div className="cal-head">
        <div className="cal-title">{monthTitle(lang, month)}</div>
        <div className="cal-nav">
          <button onClick={onPrev} disabled={!canPrev || loading} aria-label="prev">
            <ChevronLeft size={18} />
          </button>
          <button onClick={onNext} disabled={!canNext || loading} aria-label="next">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="cal-grid">
        {WEEK_ORDER.map((wd) => (
          <div key={wd} className="cal-wd">
            {weekdayShort(lang, wd)}
          </div>
        ))}
        {Array.from({ length: leading }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map((day) => {
          const clickable = day.status === 'available';
          const classes = [
            'cal-day',
            day.status,
            day.date === today ? 'today' : '',
            day.date === selected ? 'selected' : '',
          ].join(' ');
          return (
            <button key={day.date} className={classes} disabled={!clickable} onClick={() => onSelect(day.date)}>
              {Number(day.date.slice(8))}
            </button>
          );
        })}
      </div>

      <div className="cal-legend">
        <span>
          <i style={{ background: 'var(--success)' }} />
          {translate(lang, 'booking.legend.available')}
        </span>
        <span>
          <i style={{ background: 'var(--muted)' }} />
          {translate(lang, 'booking.legend.full')}
        </span>
        <span>
          <i style={{ background: '#cbd5e1' }} />
          {translate(lang, 'booking.legend.off')}
        </span>
      </div>

      {loading && (
        <div className="cal-loading">
          <Spinner size={28} />
        </div>
      )}
    </div>
  );
}
