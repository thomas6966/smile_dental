import { AtSign, Clock, MapPin, Navigation, Phone, Send } from 'lucide-react';
import { useApp } from '../context.js';
import { pick } from '../i18n.js';
import { openLink } from '../telegram.js';
import { formatPhone, socialUrl } from '../utils.js';
import Screen from '../components/Screen.jsx';

function ContactRow({ icon: Icon, label, children }) {
  return (
    <div className="contact-row">
      <span className="menu-icon">
        <Icon size={18} />
      </span>
      <div className="grow">
        <div className="summary-label">{label}</div>
        <div className="summary-value">{children}</div>
      </div>
    </div>
  );
}

export default function Clinic() {
  const { data, lang, t, closeScreen, startBooking } = useApp();
  const { clinic } = data;
  const about = pick(clinic, 'about', lang);
  const landmark = pick(clinic, 'landmark', lang);
  const instagram = socialUrl(clinic.instagram, 'instagram');
  const telegram = socialUrl(clinic.telegram, 'telegram');

  return (
    <Screen
      title={t('clinic.title')}
      onBack={closeScreen}
      footer={
        <button className="btn btn-primary btn-lg btn-block" onClick={() => startBooking()}>
          {t('home.heroTitle')}
        </button>
      }
    >
      <div className="clinic-hero">
        <div className="clinic-logo">🦷</div>
        <h2 style={{ fontSize: 22, fontWeight: 800 }}>{clinic.name}</h2>
        {about && (
          <p className="text-2" style={{ marginTop: 8 }}>
            {about}
          </p>
        )}
      </div>

      <div className="card">
        <ContactRow icon={MapPin} label={t('clinic.address')}>
          {pick(clinic, 'address', lang)}
          {landmark && <div className="small text-2">🧭 {landmark}</div>}
        </ContactRow>
        <ContactRow icon={Clock} label={t('clinic.hours')}>
          <span className="pre-line">{pick(clinic, 'workingHours', lang)}</span>
        </ContactRow>
        <ContactRow icon={Phone} label={t('clinic.phones')}>
          {[clinic.phone, clinic.phone2].filter(Boolean).map((phone) => (
            <a key={phone} href={`tel:${phone}`} style={{ display: 'block', color: 'var(--primary)' }}>
              {formatPhone(phone)}
            </a>
          ))}
        </ContactRow>
      </div>

      {clinic.mapUrl && (
        <button className="btn btn-soft btn-lg btn-block" style={{ marginTop: 12 }} onClick={() => openLink(clinic.mapUrl)}>
          <Navigation size={18} />
          {t('clinic.map')}
        </button>
      )}

      {(instagram || telegram) && (
        <>
          <div className="sub-title">{t('clinic.socials')}</div>
          <div className="appt-actions" style={{ marginTop: 0 }}>
            {instagram && (
              <button className="btn btn-ghost" onClick={() => openLink(instagram)}>
                <AtSign size={17} /> Instagram
              </button>
            )}
            {telegram && (
              <button className="btn btn-ghost" onClick={() => openLink(telegram)}>
                <Send size={17} /> Telegram
              </button>
            )}
          </div>
        </>
      )}
    </Screen>
  );
}
