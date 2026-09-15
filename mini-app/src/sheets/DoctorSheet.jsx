import { useApp } from '../context.js';
import { pick, weekdayShort } from '../i18n.js';
import { servicesForDoctor } from '../utils.js';
import Sheet from '../components/Sheet.jsx';
import Avatar from '../components/Avatar.jsx';
import { Rating } from '../components/Common.jsx';

const WEEK = [1, 2, 3, 4, 5, 6, 0];

export default function DoctorSheet({ id }) {
  const { data, lang, t, closeSheet, startBooking, openSheet } = useApp();
  const doctor = data.doctors.find((d) => d.id === id);
  if (!doctor) return null;

  const services = servicesForDoctor(data.services, doctor).filter((s) => doctor.serviceIds.includes(s.id));
  const bio = pick(doctor, 'bio', lang);

  return (
    <Sheet
      onClose={closeSheet}
      footer={
        <button className="btn btn-primary btn-lg btn-block" onClick={() => startBooking({ doctorId: doctor.id })}>
          {t('doctors.book')}
        </button>
      }
    >
      <div className="doctor-profile">
        <Avatar name={doctor.fullName} photo={doctor.photoUrl} color={doctor.color} size={96} />
        <div className="doctor-name">{doctor.fullName}</div>
        <div className="doctor-spec">{pick(doctor, 'specialty', lang)}</div>
        <div className="doctor-meta" style={{ justifyContent: 'center' }}>
          <span className="chip">{t('doctors.experience', { n: doctor.experienceYears })}</span>
          {doctor.rating && (
            <span className="chip">
              <Rating value={doctor.rating} /> {t('doctors.reviews', { n: doctor.ratingCount })}
            </span>
          )}
        </div>
      </div>

      {bio && (
        <>
          <div className="sub-title">{t('doctors.about')}</div>
          <p className="text-2">{bio}</p>
        </>
      )}

      <div className="sub-title">{t('doctors.schedule')}</div>
      <div className="schedule-list">
        {WEEK.map((wd) => {
          const day = doctor.schedule?.[wd];
          const on = day?.on;
          return (
            <div key={wd} className={`schedule-row ${on ? '' : 'off'}`}>
              <span className="bold">{weekdayShort(lang, wd)}</span>
              <span>
                {on
                  ? `${day.start} – ${day.end}${day.breakStart ? ` (☕ ${day.breakStart}–${day.breakEnd})` : ''}`
                  : t('doctors.dayOff')}
              </span>
            </div>
          );
        })}
      </div>

      {services.length > 0 && (
        <>
          <div className="sub-title">{t('doctors.services')}</div>
          <div className="tag-list">
            {services.map((s) => (
              <button key={s.id} className="chip" onClick={() => openSheet('service', { id: s.id })}>
                {pick(s, 'name', lang)}
              </button>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}
