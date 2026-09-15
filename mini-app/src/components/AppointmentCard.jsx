import { useApp } from '../context.js';
import { formatDate, monthShort, pick } from '../i18n.js';
import { StatusBadge } from './Common.jsx';

export function DateTile({ date, muted = false, lang }) {
  return (
    <div className={`date-tile ${muted ? 'muted-tile' : ''}`}>
      <b>{Number(date.slice(8))}</b>
      <span>{monthShort(lang, date)}</span>
    </div>
  );
}

export default function AppointmentCard({ appointment, onClick, children }) {
  const { lang, t } = useApp();
  const a = appointment;
  const inactive = ['CANCELLED', 'NO_SHOW'].includes(a.status);

  return (
    <div className="appt-card" role="button" tabIndex={0} onClick={onClick}>
      <div className="appt-top">
        <DateTile date={a.date} muted={inactive} lang={lang} />
        <div className="grow">
          <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
            <span className="appt-time">
              {a.startTime} – {a.endTime}
            </span>
            <StatusBadge status={a.status} lang={lang} />
          </div>
          <div className="bold ellipsis" style={{ marginTop: 2 }}>
            {a.service ? pick(a.service, 'name', lang) : t('appointments.consultation')}
          </div>
          <div className="small text-2 ellipsis">
            {a.doctor?.fullName} · {formatDate(lang, a.date, { weekday: true })}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
