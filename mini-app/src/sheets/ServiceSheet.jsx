import { CircleCheck, ChevronRight } from 'lucide-react';
import { useApp } from '../context.js';
import { formatPrice, pick } from '../i18n.js';
import { categoryIcon, descriptionLines, discountPercent, doctorsForService } from '../utils.js';
import Sheet from '../components/Sheet.jsx';
import Avatar from '../components/Avatar.jsx';
import { Price, Rating } from '../components/Common.jsx';

export default function ServiceSheet({ id }) {
  const { data, lang, t, closeSheet, startBooking, openSheet } = useApp();
  const service = data.services.find((s) => s.id === id);
  if (!service) return null;

  const lines = descriptionLines(pick(service, 'description', lang));
  const doctors = doctorsForService(data.doctors, service);
  const discount = discountPercent(service);

  return (
    <Sheet
      onClose={closeSheet}
      footer={
        <button className="btn btn-primary btn-lg btn-block" onClick={() => startBooking({ serviceId: service.id })}>
          {t('services.book', { price: formatPrice(lang, service.price, service.priceFrom) })}
        </button>
      }
    >
      <div className="sheet-hero">
        {service.imageUrl ? (
          <img src={service.imageUrl} alt={pick(service, 'name', lang)} />
        ) : (
          categoryIcon(data.categories, service.categoryId)
        )}
      </div>

      <h2 className="sheet-title">{pick(service, 'name', lang)}</h2>

      <div className="info-grid">
        <div className="info-tile">
          <div className="label">
            {t('services.price')}
            {discount ? ` · ${t('home.discount', { n: discount })}` : ''}
          </div>
          <div className="value">
            <Price service={service} lang={lang} inline />
          </div>
        </div>
        <div className="info-tile">
          <div className="label">{t('services.duration')}</div>
          <div className="value">{t('common.minutes', { n: service.durationMin })}</div>
        </div>
      </div>

      {lines.length > 0 && (
        <>
          <div className="sub-title">{t('services.includes')}</div>
          <ul className="bullets">
            {lines.map((line) => (
              <li key={line}>
                <CircleCheck size={18} />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {doctors.length > 0 && (
        <>
          <div className="sub-title">{t('services.doctors')}</div>
          {doctors.map((doctor) => (
            <button key={doctor.id} className="doctor-line" onClick={() => openSheet('doctor', { id: doctor.id })}>
              <Avatar name={doctor.fullName} photo={doctor.photoUrl} color={doctor.color} size={40} />
              <div className="grow">
                <div className="bold">{doctor.fullName}</div>
                <div className="small text-2">{pick(doctor, 'specialty', lang)}</div>
              </div>
              <Rating value={doctor.rating} />
              <ChevronRight size={18} className="muted" />
            </button>
          ))}
        </>
      )}

      <p className="small muted" style={{ marginTop: 16 }}>
        {t('services.note')}
      </p>
    </Sheet>
  );
}
