import { CalendarDays, House, Stethoscope, UserRound } from 'lucide-react';
import { useApp } from '../context.js';
import { haptic } from '../telegram.js';

const ITEMS = [
  { key: 'home', icon: House },
  { key: 'services', icon: Stethoscope },
  { key: 'appointments', icon: CalendarDays },
  { key: 'profile', icon: UserRound },
];

export default function BottomNav() {
  const { tab, goTab, t, data } = useApp();
  const upcoming = data.appointments.upcoming.length;

  return (
    <nav className="bottom-nav">
      {ITEMS.map(({ key, icon: Icon }) => (
        <button
          key={key}
          className={`nav-item ${tab === key ? 'active' : ''}`}
          onClick={() => {
            if (tab !== key) haptic.select();
            goTab(key);
          }}
        >
          <span className="nav-icon">
            <Icon size={23} strokeWidth={tab === key ? 2.3 : 2} />
            {key === 'appointments' && upcoming > 0 && <span className="nav-badge">{upcoming}</span>}
          </span>
          {t(`nav.${key}`)}
        </button>
      ))}
    </nav>
  );
}
