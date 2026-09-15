import { useCallback, useEffect, useRef, useState } from 'react';
import { CalendarDays, Check, CircleHelp, Info, MapPin, Smartphone, Stethoscope, UserRound } from 'lucide-react';
import { useApp } from '../context.js';
import { api, ApiError } from '../api.js';
import { formatDate, formatPrice, pick, shiftMonth } from '../i18n.js';
import { canRequestContact, closeApp, haptic, isTelegram, requestContact } from '../telegram.js';
import { doctorsForService, formatPhone, servicesForDoctor } from '../utils.js';
import Screen from '../components/Screen.jsx';
import ServiceRow from '../components/ServiceRow.jsx';
import DoctorCard from '../components/DoctorCard.jsx';
import MonthCalendar from '../components/MonthCalendar.jsx';
import TimeSlots from '../components/TimeSlots.jsx';
import Avatar from '../components/Avatar.jsx';
import { Spinner, StatusBadge } from '../components/Common.jsx';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function addMinutes(time, minutes) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// ------------------------- 1-qadam: xizmat -------------------------
function ServiceStep({ doctor, selectedId, onSelect }) {
  const { data, lang, t } = useApp();
  const list = servicesForDoctor(data.services, doctor);
  const groups = data.categories
    .map((c) => ({ category: c, items: list.filter((s) => s.categoryId === c.id) }))
    .filter((g) => g.items.length);
  const known = new Set(data.categories.map((c) => c.id));
  const other = list.filter((s) => !known.has(s.categoryId));
  const fallback = list[0];

  return (
    <>
      <h2 className="step-title">{t('booking.chooseService')}</h2>
      {fallback && (
        <button className="doctor-card" onClick={() => onSelect(fallback)}>
          <div className="service-emoji" style={{ background: 'var(--primary-50)', color: 'var(--primary)' }}>
            <CircleHelp size={22} />
          </div>
          <div className="grow">
            <div className="service-name">{t('booking.notSure')}</div>
            <div className="service-desc">{t('booking.notSureText')}</div>
          </div>
          <span className="bold small" style={{ whiteSpace: 'nowrap' }}>
            {formatPrice(lang, fallback.price, fallback.priceFrom)}
          </span>
        </button>
      )}
      {groups.map((group) => (
        <div key={group.category.id}>
          <div className="group-title">
            {group.category.icon} {pick(group.category, 'name', lang)}
          </div>
          {group.items.map((service) => (
            <ServiceRow
              key={service.id}
              service={service}
              selected={service.id === selectedId}
              onClick={() => onSelect(service)}
            />
          ))}
        </div>
      ))}
      {other.map((service) => (
        <ServiceRow key={service.id} service={service} selected={service.id === selectedId} onClick={() => onSelect(service)} />
      ))}
    </>
  );
}

// ------------------------- 2-qadam: shifokor -------------------------
function DoctorStep({ service, selectedId, onSelect }) {
  const { data, t } = useApp();
  const list = doctorsForService(data.doctors, service);
  return (
    <>
      <h2 className="step-title">{t('booking.chooseDoctor')}</h2>
      {list.map((doctor) => (
        <DoctorCard key={doctor.id} doctor={doctor} selected={doctor.id === selectedId} onClick={() => onSelect(doctor)} />
      ))}
    </>
  );
}

// ------------------------- 3-qadam: kun va vaqt -------------------------
function TimeStep({ doctor, service, excludeId, date, time, onDate, onTime, reloadKey }) {
  const { data, lang, t, showError } = useApp();
  const [month, setMonth] = useState((date || data.today).slice(0, 7));
  const [calendar, setCalendar] = useState(null);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [slots, setSlots] = useState(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const autoPicked = useRef(Boolean(date));

  const query = `${service ? `&serviceId=${service.id}` : ''}${excludeId ? `&excludeId=${excludeId}` : ''}`;

  useEffect(() => {
    let alive = true;
    setCalendarLoading(true);
    api(`/doctors/${doctor.id}/calendar?month=${month}${query}`)
      .then((result) => {
        if (!alive) return;
        setCalendar(result);
        if (!autoPicked.current) {
          const first = result.days.find((d) => d.status === 'available');
          if (first) {
            autoPicked.current = true;
            onDate(first.date);
          } else if (month < result.maxDate.slice(0, 7)) {
            setMonth(shiftMonth(month, 1));
          } else {
            autoPicked.current = true;
          }
        }
      })
      .catch((err) => alive && showError(err))
      .finally(() => alive && setCalendarLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctor.id, month, query, reloadKey]);

  useEffect(() => {
    if (!date) {
      setSlots(null);
      return undefined;
    }
    let alive = true;
    setSlotsLoading(true);
    api(`/doctors/${doctor.id}/slots?date=${date}${query}`)
      .then((result) => alive && setSlots(result))
      .catch((err) => alive && showError(err))
      .finally(() => alive && setSlotsLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctor.id, date, query, reloadKey]);

  const currentMonth = data.today.slice(0, 7);
  const maxMonth = calendar?.maxDate?.slice(0, 7) || currentMonth;

  return (
    <>
      <h2 className="step-title">{t('booking.chooseTime')}</h2>
      <div className="selected-doctor">
        <Avatar name={doctor.fullName} photo={doctor.photoUrl} color={doctor.color} size={42} />
        <div className="grow">
          <div className="bold ellipsis">{doctor.fullName}</div>
          <div className="small text-2 ellipsis">
            {service ? pick(service, 'name', lang) : pick(doctor, 'specialty', lang)}
          </div>
        </div>
      </div>

      <MonthCalendar
        lang={lang}
        month={month}
        calendar={calendar?.month === month ? calendar : null}
        selected={date}
        today={data.today}
        loading={calendarLoading}
        canPrev={month > currentMonth}
        canNext={month < maxMonth}
        onPrev={() => setMonth(shiftMonth(month, -1))}
        onNext={() => setMonth(shiftMonth(month, 1))}
        onSelect={(value) => {
          haptic.select();
          onDate(value);
        }}
      />

      <div className="slots-block">
        {date ? (
          <>
            <div className="slots-title">{formatDate(lang, date)}</div>
            <TimeSlots
              lang={lang}
              result={slots?.date === date ? slots : null}
              loading={slotsLoading || slots?.date !== date}
              selected={time}
              onSelect={(value) => {
                haptic.select();
                onTime(value);
              }}
            />
          </>
        ) : (
          !calendarLoading && (
            <p className="muted small" style={{ textAlign: 'center' }}>
              {t('booking.pickDay')}
            </p>
          )
        )}
      </div>
    </>
  );
}

// ------------------------- Xulosa kartasi -------------------------
function Summary({ service, doctor, date, time, duration, status }) {
  const { data, lang, t } = useApp();
  return (
    <div className="summary">
      <div className="summary-row">
        <div className="summary-icon">
          <Stethoscope size={18} />
        </div>
        <div className="grow">
          <div className="summary-label">{t('appointments.service')}</div>
          <div className="summary-value">{service ? pick(service, 'name', lang) : t('appointments.consultation')}</div>
          {service && <div className="small text-2">{formatPrice(lang, service.price, service.priceFrom)}</div>}
        </div>
        {status && <StatusBadge status={status} lang={lang} />}
      </div>
      <div className="summary-row">
        <div className="summary-icon">
          <UserRound size={18} />
        </div>
        <div className="grow">
          <div className="summary-label">{t('appointments.doctor')}</div>
          <div className="summary-value">{doctor.fullName}</div>
          <div className="small text-2">{pick(doctor, 'specialty', lang)}</div>
        </div>
      </div>
      <div className="summary-row">
        <div className="summary-icon">
          <CalendarDays size={18} />
        </div>
        <div className="grow">
          <div className="summary-label">{t('appointments.dateTime')}</div>
          <div className="summary-value">{formatDate(lang, date)}</div>
          <div className="small text-2">
            {time} – {addMinutes(time, duration)} · {t('common.minutes', { n: duration })}
          </div>
        </div>
      </div>
      <div className="summary-row">
        <div className="summary-icon">
          <MapPin size={18} />
        </div>
        <div className="grow">
          <div className="summary-label">{data.clinic.name}</div>
          <div className="summary-value">{pick(data.clinic, 'address', lang)}</div>
        </div>
      </div>
    </div>
  );
}

// ------------------------- Asosiy ekran -------------------------
export default function Booking({ serviceId: initialServiceId, doctorId: initialDoctorId, rescheduleId, isTop }) {
  const { data, t, closeScreen, goTab, showError, backHandler, refresh, applyAppointment } = useApp();
  const [reschedule] = useState(() =>
    rescheduleId ? data.appointments.upcoming.find((a) => a.id === rescheduleId) || null : null,
  );

  const [initial] = useState(() => {
    if (reschedule) {
      return { serviceId: reschedule.service?.id ?? null, doctorId: reschedule.doctor?.id ?? null, trail: ['time'] };
    }
    const preService = data.services.find((s) => s.id === initialServiceId);
    const allowed = preService ? doctorsForService(data.doctors, preService) : [];
    const validDoctor = initialDoctorId && (!preService || allowed.some((d) => d.id === initialDoctorId));
    const doctor = validDoctor ? initialDoctorId : allowed.length === 1 ? allowed[0].id : null;
    if (preService && doctor) return { serviceId: preService.id, doctorId: doctor, trail: ['time'] };
    if (preService) return { serviceId: preService.id, doctorId: null, trail: ['doctor'] };
    return { serviceId: null, doctorId: validDoctor ? initialDoctorId : null, trail: ['service'] };
  });

  const [serviceId, setServiceId] = useState(initial.serviceId);
  const [doctorId, setDoctorId] = useState(initial.doctorId);
  const [trail, setTrail] = useState(initial.trail);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [form, setForm] = useState(() => ({
    name: data.user.firstName || '',
    phone: data.user.phone ? formatPhone(data.user.phone) : '',
    complaint: '',
  }));
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const trailRef = useRef(trail);
  trailRef.current = trail;

  const steps = reschedule ? ['time', 'confirm'] : ['service', 'doctor', 'time', 'confirm'];
  const step = trail[trail.length - 1];
  const service = data.services.find((s) => s.id === serviceId) || reschedule?.service || null;
  const doctor =
    data.doctors.find((d) => d.id === doctorId) ||
    (reschedule?.doctor ? { ...reschedule.doctor, rating: null, ratingCount: 0, experienceYears: 0 } : null);
  const duration = service?.durationMin || reschedule?.durationMin || data.clinic.slotStepMin || 30;

  const goStep = (name) => setTrail((current) => [...current, name]);

  const stepBack = useCallback(() => {
    if (trailRef.current.length > 1) {
      setTrail(trailRef.current.slice(0, -1));
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (!isTop) return undefined;
    backHandler.current = () => (done ? false : stepBack());
    return () => {
      backHandler.current = null;
    };
  }, [isTop, done, stepBack, backHandler]);

  const selectService = (item) => {
    haptic.light();
    setServiceId(item.id);
    setDate(null);
    setTime(null);
    const allowed = doctorsForService(data.doctors, item);
    if (doctorId && allowed.some((d) => d.id === doctorId)) {
      goStep('time');
    } else if (allowed.length === 1) {
      setDoctorId(allowed[0].id);
      goStep('time');
    } else {
      setDoctorId(null);
      goStep('doctor');
    }
  };

  const selectDoctor = (item) => {
    haptic.light();
    if (item.id !== doctorId) {
      setDate(null);
      setTime(null);
    }
    setDoctorId(item.id);
    goStep('time');
  };

  const sharePhone = async () => {
    const shared = await requestContact();
    if (!shared) return;
    for (let i = 0; i < 5; i += 1) {
      await sleep(1200);
      const fresh = await refresh();
      if (fresh?.user?.phone) {
        setForm((f) => ({ ...f, phone: formatPhone(fresh.user.phone) }));
        break;
      }
    }
  };

  const submit = async () => {
    if (!reschedule) {
      if (!form.name.trim()) return showError(new ApiError('NAME_REQUIRED'));
      if (!form.phone.trim()) return showError(new ApiError('PHONE_REQUIRED'));
    }
    setSubmitting(true);
    try {
      const result = reschedule
        ? await api(`/appointments/${reschedule.id}/reschedule`, { method: 'POST', body: { date, time } })
        : await api('/appointments', {
            method: 'POST',
            body: {
              doctorId: doctor.id,
              serviceId: service?.id,
              date,
              time,
              firstName: form.name.trim(),
              phone: form.phone,
              complaint: form.complaint.trim(),
            },
          });
      haptic.success();
      setDone(result.appointment);
      applyAppointment(result.appointment);
      refresh();
    } catch (err) {
      showError(err);
      if (err.code === 'SLOT_TAKEN') {
        setTime(null);
        setReloadKey((k) => k + 1);
        setTrail((current) => current.slice(0, current.lastIndexOf('time') + 1));
      }
    } finally {
      setSubmitting(false);
    }
    return undefined;
  };

  const onBack = () => {
    if (done || !stepBack()) closeScreen();
  };

  // ---------- Muvaffaqiyatli yozilgandan keyin ----------
  if (done) {
    return (
      <Screen
        title={reschedule ? t('booking.rescheduleTitle') : t('booking.title')}
        onBack={onBack}
        scrollKey="done"
        footer={
          <div style={{ display: 'grid', gap: 10 }}>
            <button className="btn btn-primary btn-lg btn-block" onClick={() => goTab('appointments')}>
              {t('booking.toAppointments')}
            </button>
            {isTelegram ? (
              <button className="btn btn-ghost btn-lg btn-block" onClick={closeApp}>
                {t('common.close')}
              </button>
            ) : (
              <button className="btn btn-ghost btn-lg btn-block" onClick={() => goTab('home')}>
                {t('booking.toHome')}
              </button>
            )}
          </div>
        }
      >
        <div className="success">
          <div className="success-icon">
            <Check size={46} strokeWidth={2.6} />
          </div>
          <h2>{reschedule ? t('booking.rescheduled') : t('booking.success')}</h2>
          <p>{t('booking.successText')}</p>
          <Summary
            service={service}
            doctor={doctor}
            date={done.date}
            time={done.startTime}
            duration={done.durationMin}
            status={done.status}
          />
        </div>
      </Screen>
    );
  }

  // ---------- Qadamlar ----------
  const position = steps.indexOf(step) + 1;
  let footer = null;
  if (step === 'time') {
    footer = (
      <button className="btn btn-primary btn-lg btn-block" disabled={!date || !time} onClick={() => goStep('confirm')}>
        {t('common.next')}
        {time ? ` · ${time}` : ''}
      </button>
    );
  }
  if (step === 'confirm') {
    footer = (
      <button className="btn btn-primary btn-lg btn-block" disabled={submitting} onClick={submit}>
        {submitting ? <Spinner /> : reschedule ? t('booking.confirmReschedule') : t('booking.confirm')}
      </button>
    );
  }

  return (
    <Screen
      title={reschedule ? t('booking.rescheduleTitle') : t('booking.title')}
      subtitle={`${t('booking.stepOf', { n: position, total: steps.length })} · ${t(`booking.steps.${step}`)}`}
      progress={(position / steps.length) * 100}
      onBack={onBack}
      scrollKey={step}
      footer={footer}
    >
      {step === 'service' && <ServiceStep doctor={doctor} selectedId={serviceId} onSelect={selectService} />}

      {step === 'doctor' && <DoctorStep service={service} selectedId={doctorId} onSelect={selectDoctor} />}

      {step === 'time' && doctor && (
        <TimeStep
          doctor={doctor}
          service={service}
          excludeId={reschedule?.id}
          date={date}
          time={time}
          reloadKey={reloadKey}
          onDate={(value) => {
            setDate(value);
            setTime(null);
          }}
          onTime={setTime}
        />
      )}

      {step === 'confirm' && doctor && date && time && (
        <>
          <h2 className="step-title">{t('booking.confirmTitle')}</h2>
          <Summary service={service} doctor={doctor} date={date} time={time} duration={duration} />

          {!reschedule && (
            <>
              <div className="field">
                <label htmlFor="booking-name">{t('booking.name')}</label>
                <input
                  id="booking-name"
                  className="input"
                  value={form.name}
                  maxLength={60}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="booking-phone">{t('booking.phone')}</label>
                <input
                  id="booking-phone"
                  className="input"
                  inputMode="tel"
                  placeholder="+998 90 123 45 67"
                  value={form.phone}
                  maxLength={20}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              {!data.user.phone && canRequestContact() && (
                <button className="btn btn-soft btn-sm share-phone" onClick={sharePhone}>
                  <Smartphone size={16} />
                  {t('booking.sharePhone')}
                </button>
              )}
              <div className="field">
                <label htmlFor="booking-complaint">{t('booking.complaint')}</label>
                <textarea
                  id="booking-complaint"
                  className="input"
                  placeholder={t('booking.complaintPlaceholder')}
                  value={form.complaint}
                  maxLength={500}
                  onChange={(e) => setForm({ ...form, complaint: e.target.value })}
                />
              </div>
            </>
          )}

          <div className="note">
            <Info size={16} />
            <span>{t('booking.cancelNote', { n: data.clinic.cancelLimitHours })}</span>
          </div>
        </>
      )}
    </Screen>
  );
}
