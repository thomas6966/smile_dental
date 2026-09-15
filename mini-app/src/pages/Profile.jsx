import { ChevronRight, ClipboardList, Globe, Hospital, Phone, UserRound } from 'lucide-react';
import { useApp } from '../context.js';
import { formatDate, toLocalDate } from '../i18n.js';
import { formatPhone, fullName } from '../utils.js';
import Avatar from '../components/Avatar.jsx';

export default function Profile() {
  const { data, lang, t, openSheet, openScreen, goTab, changeLanguage } = useApp();
  const { user, stats, clinic } = data;
  const lastVisit = toLocalDate(stats.lastVisitAt);
  const nextCheckup = toLocalDate(stats.nextCheckupAt);

  return (
    <div className="page">
      <div className="profile-head">
        <Avatar name={fullName(user)} size={84} />
        <div className="profile-name">{fullName(user)}</div>
        <div className="text-2">{user.phone ? formatPhone(user.phone) : t('profile.noPhone')}</div>
        {user.username && <div className="small muted">@{user.username}</div>}
      </div>

      <div className="stats">
        <div className="stat">
          <b>{stats.visits}</b>
          <span>{t('profile.visits')}</span>
        </div>
        <div className="stat">
          <b>{lastVisit ? formatDate(lang, lastVisit, { weekday: false }) : '—'}</b>
          <span>{t('profile.lastVisit')}</span>
        </div>
        <div className="stat">
          <b>{nextCheckup ? formatDate(lang, nextCheckup, { weekday: false }) : '—'}</b>
          <span>{t('profile.nextCheckup')}</span>
        </div>
      </div>

      <div className="menu">
        <button className="menu-item" onClick={() => openSheet('profile')}>
          <span className="menu-icon">
            <UserRound size={18} />
          </span>
          <span className="grow bold">{t('profile.personal')}</span>
          <ChevronRight size={18} className="chevron" />
        </button>
        <button className="menu-item" onClick={() => goTab('appointments', 'history')}>
          <span className="menu-icon">
            <ClipboardList size={18} />
          </span>
          <span className="grow bold">{t('profile.history')}</span>
          <ChevronRight size={18} className="chevron" />
        </button>
        <div className="menu-item">
          <span className="menu-icon">
            <Globe size={18} />
          </span>
          <span className="grow bold">{t('profile.language')}</span>
          <div className="lang-switch">
            {['uz', 'ru'].map((code) => (
              <button key={code} className={code === lang ? 'active' : ''} onClick={() => changeLanguage(code)}>
                {code === 'uz' ? "O'zbekcha" : 'Русский'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="menu">
        <button className="menu-item" onClick={() => openScreen('clinic')}>
          <span className="menu-icon">
            <Hospital size={18} />
          </span>
          <span className="grow bold">{t('profile.clinic')}</span>
          <ChevronRight size={18} className="chevron" />
        </button>
        <a className="menu-item" href={`tel:${clinic.phone}`}>
          <span className="menu-icon">
            <Phone size={18} />
          </span>
          <span className="grow">
            <span className="bold">{t('profile.call')}</span>
            <span className="small muted" style={{ display: 'block' }}>
              {formatPhone(clinic.phone)}
            </span>
          </span>
          <ChevronRight size={18} className="chevron" />
        </a>
      </div>

      <div className="footer-note">🦷 {clinic.name}</div>
    </div>
  );
}
