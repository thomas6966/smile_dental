import { ChevronRight } from 'lucide-react';
import { useApp } from '../context.js';
import { pick } from '../i18n.js';
import Avatar from './Avatar.jsx';
import { Rating } from './Common.jsx';

export default function DoctorCard({ doctor, onClick, selected = false, right }) {
  const { lang, t } = useApp();
  return (
    <button className={`doctor-card ${selected ? 'selected' : ''}`} onClick={onClick}>
      <Avatar name={doctor.fullName} photo={doctor.photoUrl} color={doctor.color} size={56} />
      <div className="grow">
        <div className="doctor-name">{doctor.fullName}</div>
        <div className="doctor-spec">{pick(doctor, 'specialty', lang)}</div>
        <div className="doctor-meta">
          <span className="chip">{t('doctors.experience', { n: doctor.experienceYears })}</span>
          <Rating value={doctor.rating} count={doctor.ratingCount} />
        </div>
      </div>
      {right ?? <ChevronRight size={20} className="muted" />}
    </button>
  );
}
