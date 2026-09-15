import { useApp } from '../context.js';
import Screen from '../components/Screen.jsx';
import DoctorCard from '../components/DoctorCard.jsx';

export default function Doctors() {
  const { data, t, closeScreen, openSheet } = useApp();
  return (
    <Screen title={t('doctors.title')} onBack={closeScreen}>
      {data.doctors.map((doctor) => (
        <DoctorCard key={doctor.id} doctor={doctor} onClick={() => openSheet('doctor', { id: doctor.id })} />
      ))}
    </Screen>
  );
}
