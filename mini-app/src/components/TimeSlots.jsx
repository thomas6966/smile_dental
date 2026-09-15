import { CalendarX } from 'lucide-react';
import { translate } from '../i18n.js';
import { Empty, Loader } from './Common.jsx';

const periodOf = (time) => {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return 'morning';
  if (hour < 17) return 'day';
  return 'evening';
};

export default function TimeSlots({ lang, result, loading, selected, onSelect }) {
  if (loading) return <Loader />;
  if (!result) return null;

  const t = (key) => translate(lang, key);
  if (result.status !== 'ok' || !result.slots.some((s) => s.available)) {
    return (
      <Empty icon={CalendarX} title={result.status === 'off' ? t('booking.dayOff') : t('booking.noSlots')} />
    );
  }

  const groups = ['morning', 'day', 'evening']
    .map((period) => ({ period, slots: result.slots.filter((s) => periodOf(s.time) === period) }))
    .filter((g) => g.slots.length);

  return (
    <div>
      {groups.map((group) => (
        <div className="slot-group" key={group.period}>
          <div className="slot-group-label">{t(`booking.periods.${group.period}`)}</div>
          <div className="slots">
            {group.slots.map((slot) => (
              <button
                key={slot.time}
                className={`slot ${selected === slot.time ? 'selected' : ''}`}
                disabled={!slot.available}
                onClick={() => onSelect(slot.time)}
              >
                {slot.time}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
