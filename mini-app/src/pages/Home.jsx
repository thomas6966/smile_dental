import { ArrowRight, Bell, ChevronRight, MapPin, Phone, Stethoscope, Tag } from 'lucide-react';
import { useApp } from '../context.js';
import { pick } from '../i18n.js';
import { discountPercent, fullName } from '../utils.js';
import Avatar from '../components/Avatar.jsx';
import { Price, Rating, StatusBadge } from '../components/Common.jsx';
import { DateTile } from '../components/AppointmentCard.jsx';
import ServiceRow from '../components/ServiceRow.jsx';
import { Stories } from '../components/Stories.jsx';

function greetingKey() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'day';
  return 'evening';
}

export default function Home() {
  const { data, lang, t, startBooking, openSheet, openScreen, goTab } = useApp();
  const { user, clinic, services, doctors, appointments, stats } = data;

  const next = appointments.upcoming[0];
  const promos = services.filter((s) => discountPercent(s) > 0);
  const popular = services.filter((s) => s.isPopular && !discountPercent(s)).slice(0, 4);
  const checkupDue =
    !next && stats.monthsSinceVisit !== null && stats.monthsSinceVisit >= (clinic.checkupIntervalMonths || 6);

  return (
    <div className="page">
      <header className="home-header">
        <div className="grow">
          <div className="home-clinic">🦷 {clinic.name}</div>
          <h1 className="home-title">
            {t(`home.greeting.${greetingKey()}`)}, {user.firstName}!
          </h1>
          <p className="home-sub">{t('home.subtitle')}</p>
        </div>
        <button onClick={() => goTab('profile')} aria-label="profile">
          <Avatar name={fullName(user)} size={46} />
        </button>
      </header>

      <Stories />

      {next && (
        <button className="next-card" onClick={() => openSheet('appointment', { id: next.id })}>
          <div className="next-card-top">
            <span className="small bold" style={{ color: 'var(--primary)' }}>
              {t('home.nextVisit')}
            </span>
            <StatusBadge status={next.status} lang={lang} />
          </div>
          <div className="next-when">
            <DateTile date={next.date} lang={lang} />
            <div className="grow">
              <div className="appt-time">
                {next.startTime} – {next.endTime}
              </div>
              <div className="bold ellipsis">
                {next.service ? pick(next.service, 'name', lang) : t('appointments.consultation')}
              </div>
              <div className="small text-2 ellipsis">{next.doctor?.fullName}</div>
            </div>
            <ChevronRight size={20} className="muted" />
          </div>
        </button>
      )}

      {checkupDue && (
        <div className="checkup-card">
          <div className="checkup-icon">
            <Bell size={20} />
          </div>
          <div className="grow">
            <div className="bold">{t('home.checkupTitle')}</div>
            <div className="small text-2" style={{ margin: '2px 0 10px' }}>
              {t('home.checkupText', { n: stats.monthsSinceVisit })}
            </div>
            <button className="btn btn-sm btn-primary" onClick={() => startBooking()}>
              {t('home.checkupBtn')}
            </button>
          </div>
        </div>
      )}

      <button className="hero" onClick={() => startBooking()}>
        <div className="grow" style={{ position: 'relative', zIndex: 1 }}>
          <span className="hero-badge">{t('home.heroBadge')}</span>
          <h2>{t('home.heroTitle')}</h2>
          <p>{t('home.heroText')}</p>
        </div>
        <div className="hero-arrow">
          <ArrowRight size={24} />
        </div>
      </button>

      <div className="quick-grid">
        <button className="quick" onClick={() => goTab('services')}>
          <span className="quick-icon">
            <Tag size={20} />
          </span>
          {t('home.quick.prices')}
        </button>
        <button className="quick" onClick={() => openScreen('doctors')}>
          <span className="quick-icon">
            <Stethoscope size={20} />
          </span>
          {t('home.quick.doctors')}
        </button>
        <button className="quick" onClick={() => openScreen('clinic')}>
          <span className="quick-icon">
            <MapPin size={20} />
          </span>
          {t('home.quick.address')}
        </button>
        <a className="quick" href={`tel:${clinic.phone}`}>
          <span className="quick-icon">
            <Phone size={20} />
          </span>
          {t('home.quick.call')}
        </a>
      </div>

      {promos.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h3 className="section-title">🔥 {t('home.promos')}</h3>
          </div>
          <div className="hscroll">
            {promos.map((service) => (
              <button key={service.id} className="promo" onClick={() => openSheet('service', { id: service.id })}>
                <span className="promo-badge">
                  {service.price ? t('home.discount', { n: discountPercent(service) }) : t('common.free')}
                </span>
                <span className="promo-name">{pick(service, 'name', lang)}</span>
                <Price service={service} lang={lang} />
              </button>
            ))}
          </div>
        </section>
      )}

      {popular.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h3 className="section-title">{t('home.popular')}</h3>
            <button className="link-btn" onClick={() => goTab('services')}>
              {t('home.seeAll')} <ChevronRight size={16} />
            </button>
          </div>
          {popular.map((service) => (
            <ServiceRow
              key={service.id}
              service={service}
              onClick={() => openSheet('service', { id: service.id })}
              onAdd={() => startBooking({ serviceId: service.id })}
            />
          ))}
        </section>
      )}

      {doctors.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h3 className="section-title">{t('home.doctors')}</h3>
            <button className="link-btn" onClick={() => openScreen('doctors')}>
              {t('home.seeAll')} <ChevronRight size={16} />
            </button>
          </div>
          <div className="hscroll">
            {doctors.map((doctor) => (
              <button key={doctor.id} className="doctor-mini" onClick={() => openSheet('doctor', { id: doctor.id })}>
                <Avatar name={doctor.fullName} photo={doctor.photoUrl} color={doctor.color} size={52} />
                <div>
                  <div className="doctor-mini-name">{doctor.fullName}</div>
                  <div className="small text-2 ellipsis">{pick(doctor, 'specialty', lang)}</div>
                </div>
                <Rating value={doctor.rating} count={doctor.ratingCount} />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
