import { useState } from 'react';
import { CalendarPlus, ClipboardList, RotateCcw, Star } from 'lucide-react';
import { useApp } from '../context.js';
import { api } from '../api.js';
import { formatPrice } from '../i18n.js';
import { haptic } from '../telegram.js';
import AppointmentCard from '../components/AppointmentCard.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';
import { Empty, Stars } from '../components/Common.jsx';

export default function Appointments() {
  const {
    data,
    lang,
    t,
    appointmentsView,
    setAppointmentsView,
    openSheet,
    startBooking,
    refresh,
    applyAppointment,
    showToast,
    showError,
  } = useApp();
  const { upcoming, history } = data.appointments;
  const [cancelling, setCancelling] = useState(null);

  const cancel = async (reason) => {
    try {
      const result = await api(`/appointments/${cancelling.id}/cancel`, { method: 'POST', body: { reason } });
      haptic.success();
      applyAppointment(result.appointment);
      setCancelling(null);
      showToast(t('appointments.cancelled'), 'success');
      refresh();
    } catch (err) {
      showError(err);
    }
  };

  return (
    <div className="page">
      <h1 className="page-title">{t('appointments.title')}</h1>

      <div className="segmented" style={{ marginBottom: 16 }}>
        <button
          className={appointmentsView === 'upcoming' ? 'active' : ''}
          onClick={() => setAppointmentsView('upcoming')}
        >
          {t('appointments.upcoming')}
          {upcoming.length > 0 && <span className="count-pill">{upcoming.length}</span>}
        </button>
        <button className={appointmentsView === 'history' ? 'active' : ''} onClick={() => setAppointmentsView('history')}>
          {t('appointments.history')}
        </button>
      </div>

      {appointmentsView === 'upcoming' && (
        <>
          {upcoming.length === 0 && (
            <Empty
              icon={CalendarPlus}
              title={t('appointments.emptyUpcoming')}
              text={t('appointments.emptyUpcomingText')}
              action={
                <button className="btn btn-primary" onClick={() => startBooking()}>
                  {t('home.heroTitle')}
                </button>
              }
            />
          )}
          {upcoming.map((a) => (
            <AppointmentCard key={a.id} appointment={a} onClick={() => openSheet('appointment', { id: a.id })}>
              {a.canCancel ? (
                <div className="appt-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="btn btn-soft btn-sm" onClick={() => startBooking({ rescheduleId: a.id })}>
                    {t('appointments.reschedule')}
                  </button>
                  <button className="btn btn-danger-soft btn-sm" onClick={() => setCancelling(a)}>
                    {t('appointments.cancel')}
                  </button>
                </div>
              ) : (
                <div className="appt-warning">
                  {t('appointments.callToChange', { n: data.clinic.cancelLimitHours })}
                </div>
              )}
            </AppointmentCard>
          ))}
        </>
      )}

      {appointmentsView === 'history' && (
        <>
          {history.length === 0 && (
            <Empty icon={ClipboardList} title={t('appointments.emptyHistory')} text={t('appointments.emptyHistoryText')} />
          )}
          {history.map((a) => (
            <AppointmentCard key={a.id} appointment={a} onClick={() => openSheet('appointment', { id: a.id })}>
              {a.status === 'COMPLETED' && (
                <div className="appt-foot" onClick={(e) => e.stopPropagation()}>
                  {a.rating ? (
                    <Stars value={a.rating} size={16} />
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => openSheet('appointment', { id: a.id })}>
                      <Star size={15} />
                      {t('appointments.rateTitle')}
                    </button>
                  )}
                  <div className="row" style={{ gap: 8 }}>
                    {a.price ? <span className="bold small">{formatPrice(lang, a.price)}</span> : null}
                    <button
                      className="btn btn-soft btn-sm"
                      onClick={() => startBooking({ serviceId: a.service?.id, doctorId: a.doctor?.id })}
                      aria-label={t('appointments.repeat')}
                    >
                      <RotateCcw size={15} />
                    </button>
                  </div>
                </div>
              )}
            </AppointmentCard>
          ))}
        </>
      )}

      {cancelling && (
        <ConfirmDialog
          title={t('appointments.cancelTitle')}
          text={t('appointments.cancelText')}
          reasonPlaceholder={t('appointments.cancelReason')}
          confirmText={t('appointments.cancelConfirm')}
          cancelText={t('common.no')}
          danger
          onConfirm={cancel}
          onClose={() => setCancelling(null)}
        />
      )}
    </div>
  );
}
