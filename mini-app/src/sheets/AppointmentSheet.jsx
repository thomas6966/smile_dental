import { useState } from 'react';
import { CalendarDays, Clock, MapPin, Phone, RotateCcw, Stethoscope, Wallet } from 'lucide-react';
import { useApp } from '../context.js';
import { api } from '../api.js';
import { formatDate, formatPrice, pick } from '../i18n.js';
import { haptic, openLink } from '../telegram.js';
import Sheet from '../components/Sheet.jsx';
import Avatar from '../components/Avatar.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { Spinner, Stars, StatusBadge } from '../components/Common.jsx';

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="summary-row">
      <div className="summary-icon">
        <Icon size={18} />
      </div>
      <div className="grow">
        <div className="summary-label">{label}</div>
        <div className="summary-value">{children}</div>
      </div>
    </div>
  );
}

export default function AppointmentSheet({ id }) {
  const { data, lang, t, closeSheet, startBooking, refresh, applyAppointment, showToast, showError } = useApp();
  const all = [...data.appointments.upcoming, ...data.appointments.history];
  const a = all.find((item) => item.id === id);
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  if (!a) return null;

  const isUpcoming = data.appointments.upcoming.some((item) => item.id === id);
  const clinic = data.clinic;

  const sendRating = async () => {
    setSending(true);
    try {
      const result = await api(`/appointments/${a.id}/rate`, {
        method: 'POST',
        body: { rating, feedback: feedback.trim() },
      });
      haptic.success();
      applyAppointment(result.appointment);
      showToast(t('appointments.rated'), 'success');
      refresh();
    } catch (err) {
      showError(err);
    } finally {
      setSending(false);
    }
  };

  const cancel = async (reason) => {
    try {
      const result = await api(`/appointments/${a.id}/cancel`, { method: 'POST', body: { reason } });
      haptic.success();
      applyAppointment(result.appointment);
      showToast(t('appointments.cancelled'), 'success');
      closeSheet();
      refresh();
    } catch (err) {
      showError(err);
    }
  };

  let footer = null;
  if (isUpcoming && a.canCancel) {
    footer = (
      <div className="appt-actions" style={{ marginTop: 0 }}>
        <button className="btn btn-soft btn-lg" onClick={() => startBooking({ rescheduleId: a.id })}>
          {t('appointments.reschedule')}
        </button>
        <button className="btn btn-danger-soft btn-lg" onClick={() => setCancelling(true)}>
          {t('appointments.cancel')}
        </button>
      </div>
    );
  } else if (!isUpcoming && a.doctor) {
    footer = (
      <button
        className="btn btn-primary btn-lg btn-block"
        onClick={() => startBooking({ serviceId: a.service?.id, doctorId: a.doctor.id })}
      >
        <RotateCcw size={18} />
        {t('appointments.repeat')}
      </button>
    );
  }

  return (
    <>
    <Sheet onClose={closeSheet} footer={footer}>
      <div className="row" style={{ marginBottom: 6 }}>
        <StatusBadge status={a.status} lang={lang} />
      </div>
      <h2 className="sheet-title">{a.service ? pick(a.service, 'name', lang) : t('appointments.consultation')}</h2>
      <p className="text-2" style={{ marginTop: 4 }}>
        {formatDate(lang, a.date)} · {a.startTime} – {a.endTime}
      </p>

      <div className="summary" style={{ marginTop: 16 }}>
        {a.doctor && (
          <div className="summary-row">
            <Avatar name={a.doctor.fullName} photo={a.doctor.photoUrl} color={a.doctor.color} size={36} />
            <div className="grow">
              <div className="summary-label">{t('appointments.doctor')}</div>
              <div className="summary-value">{a.doctor.fullName}</div>
              <div className="small text-2">{pick(a.doctor, 'specialty', lang)}</div>
            </div>
          </div>
        )}
        <InfoRow icon={CalendarDays} label={t('appointments.dateTime')}>
          {formatDate(lang, a.date, { year: a.date.slice(0, 4) !== data.today.slice(0, 4) })}, {a.startTime}
        </InfoRow>
        <InfoRow icon={Clock} label={t('appointments.duration')}>
          {t('common.minutes', { n: a.durationMin })}
        </InfoRow>
        {a.status === 'COMPLETED' && a.price ? (
          <InfoRow icon={Wallet} label={t('appointments.paid')}>
            {formatPrice(lang, a.price)}
          </InfoRow>
        ) : (
          a.service && (
            <InfoRow icon={Stethoscope} label={t('appointments.service')}>
              {formatPrice(lang, a.service.price, a.service.priceFrom)}
            </InfoRow>
          )
        )}
        {isUpcoming && (
          <InfoRow icon={MapPin} label={clinic.name}>
            {pick(clinic, 'address', lang)}
          </InfoRow>
        )}
      </div>

      {a.complaint && (
        <div className="card-soft" style={{ marginTop: 10 }}>
          <div className="summary-label">{t('appointments.complaint')}</div>
          <div className="pre-line">{a.complaint}</div>
        </div>
      )}

      {a.diagnosis && (
        <div className="highlight">
          <div className="highlight-label">{t('appointments.diagnosis')}</div>
          <div className="pre-line">{a.diagnosis}</div>
        </div>
      )}

      {a.recommendation && (
        <div className="highlight green">
          <div className="highlight-label">{t('appointments.recommendation')}</div>
          <div className="pre-line">{a.recommendation}</div>
        </div>
      )}

      {a.cancelReason && a.status === 'CANCELLED' && (
        <div className="card-soft" style={{ marginTop: 10 }}>
          <div className="summary-label">{t('appointments.cancelReasonLabel')}</div>
          <div>{a.cancelReason}</div>
        </div>
      )}

      {isUpcoming && (
        <div className="appt-actions">
          {clinic.mapUrl && (
            <button className="btn btn-ghost" onClick={() => openLink(clinic.mapUrl)}>
              <MapPin size={17} />
              {t('appointments.route')}
            </button>
          )}
          <a className="btn btn-ghost" href={`tel:${clinic.phone}`}>
            <Phone size={17} />
            {t('appointments.call')}
          </a>
        </div>
      )}

      {isUpcoming && !a.canCancel && (
        <div className="appt-warning">{t('appointments.callToChange', { n: clinic.cancelLimitHours })}</div>
      )}

      {a.status === 'COMPLETED' && a.rating && (
        <div className="rate-box">
          <div className="bold">{t('appointments.yourRating')}</div>
          <Stars value={a.rating} size={26} />
          {a.feedback && <p className="small text-2">«{a.feedback}»</p>}
        </div>
      )}

      {a.canRate && (
        <div className="rate-box">
          <div className="bold">{t('appointments.rateTitle')}</div>
          <p className="small muted">{t('appointments.rateText')}</p>
          <Stars
            value={rating}
            size={34}
            onChange={(value) => {
              haptic.select();
              setRating(value);
            }}
          />
          {rating > 0 && (
            <>
              <textarea
                className="input"
                placeholder={t('appointments.feedback')}
                value={feedback}
                maxLength={1000}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <button className="btn btn-primary btn-block" onClick={sendRating} disabled={sending}>
                {sending ? <Spinner /> : t('common.send')}
              </button>
            </>
          )}
        </div>
      )}

    </Sheet>
    {cancelling && (
      <ConfirmDialog
        title={t('appointments.cancelTitle')}
        text={t('appointments.cancelText')}
        reasonPlaceholder={t('appointments.cancelReason')}
        confirmText={t('appointments.cancelConfirm')}
        cancelText={t('common.no')}
        danger
        onConfirm={cancel}
        onClose={() => setCancelling(false)}
      />
    )}
    </>
  );
}
