import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppContext } from './context.js';
import { api, ApiError } from './api.js';
import { hasKey, translate } from './i18n.js';
import { haptic, setBackButton, startPage, telegramLanguage } from './telegram.js';
import BottomNav from './components/BottomNav.jsx';
import Toast from './components/Toast.jsx';
import { Loader } from './components/Common.jsx';
import { StoryViewer } from './components/Stories.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Home from './pages/Home.jsx';
import Services from './pages/Services.jsx';
import Appointments from './pages/Appointments.jsx';
import Profile from './pages/Profile.jsx';
import Booking from './pages/Booking.jsx';
import Doctors from './pages/Doctors.jsx';
import Clinic from './pages/Clinic.jsx';
import { ErrorScreen, OpenInTelegram } from './pages/StatusScreens.jsx';
import ServiceSheet from './sheets/ServiceSheet.jsx';
import DoctorSheet from './sheets/DoctorSheet.jsx';
import AppointmentSheet from './sheets/AppointmentSheet.jsx';
import ProfileSheet from './sheets/ProfileSheet.jsx';

const TABS = { home: Home, services: Services, appointments: Appointments, profile: Profile };
const SCREENS = { booking: Booking, doctors: Doctors, clinic: Clinic };
const SHEETS = { service: ServiceSheet, doctor: DoctorSheet, appointment: AppointmentSheet, profile: ProfileSheet };
const SEEN_KEY = 'stories-seen';

let uid = 0;
const nextKey = () => {
  uid += 1;
  return uid;
};

function readSeen() {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '[]');
  } catch {
    return [];
  }
}

export default function App() {
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [lang, setLang] = useState(() => (telegramLanguage().startsWith('ru') ? 'ru' : 'uz'));
  const [tab, setTab] = useState('home');
  const [appointmentsView, setAppointmentsView] = useState('upcoming');
  const [stack, setStack] = useState([]);
  const [sheet, setSheet] = useState(null);
  const [story, setStory] = useState(null);
  const [storySeen, setStorySeen] = useState(readSeen);
  const [toast, setToast] = useState(null);
  const backHandler = useRef(null);
  const startHandled = useRef(false);

  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setStatus('loading');
    try {
      const result = await api('/bootstrap');
      setData(result);
      setLang(result.user.language === 'ru' ? 'ru' : 'uz');
      setStatus('ready');
      return result;
    } catch (err) {
      if (!silent) {
        setError(err);
        setStatus(err.status === 401 ? 'unauthorized' : 'error');
      }
      return null;
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Bot tugmasidan kelgan sahifani ochish (?page=booking)
  useEffect(() => {
    if (status !== 'ready' || !data?.user.onboarded || startHandled.current) return;
    startHandled.current = true;
    const page = startPage();
    if (page === 'booking') setStack([{ name: 'booking', params: {}, key: nextKey() }]);
    if (page === 'appointments') setTab('appointments');
    if (page === 'services') setTab('services');
    if (page === 'history') {
      setTab('appointments');
      setAppointmentsView('history');
    }
  }, [status, data]);

  // Overlay ochiq bo'lsa, orqa fon aylanmasin
  useEffect(() => {
    const locked = stack.length > 0 || sheet !== null || story !== null;
    document.body.classList.toggle('lock', locked);
  }, [stack, sheet, story]);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: nextKey() });
  }, []);

  const hideToast = useCallback(() => setToast(null), []);

  const showError = useCallback(
    (err) => {
      haptic.error();
      const code = err instanceof ApiError ? err.code : 'ERROR';
      const key = `errors.${code}`;
      const message = hasKey(lang, key)
        ? translate(lang, key, { hours: data?.clinic?.cancelLimitHours ?? 3 })
        : err?.message || translate(lang, 'errors.ERROR');
      showToast(message, 'error');
    },
    [lang, data, showToast],
  );

  const openScreen = useCallback((name, params = {}) => {
    setSheet(null);
    setStack((current) => [...current, { name, params, key: nextKey() }]);
  }, []);

  const closeScreen = useCallback(() => setStack((current) => current.slice(0, -1)), []);

  const goTab = useCallback((next, view) => {
    setStack([]);
    setSheet(null);
    setTab(next);
    if (view) setAppointmentsView(view);
    window.scrollTo(0, 0);
  }, []);

  const openSheet = useCallback((type, props = {}) => setSheet({ type, props, key: nextKey() }), []);
  const closeSheet = useCallback(() => setSheet(null), []);
  const startBooking = useCallback((params = {}) => openScreen('booking', params), [openScreen]);

  const openStory = useCallback((index) => setStory(index), []);
  const closeStory = useCallback(() => setStory(null), []);
  const markStorySeen = useCallback((index) => {
    setStorySeen((current) => {
      if (current.includes(index)) return current;
      const next = [...current, index];
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify(next));
      } catch {
        // localStorage mavjud bo'lmasligi mumkin
      }
      return next;
    });
  }, []);

  const changeLanguage = useCallback(
    async (next) => {
      if (next === lang) return;
      haptic.select();
      setLang(next);
      setData((current) => (current ? { ...current, user: { ...current.user, language: next } } : current));
      try {
        await api('/me', { method: 'PATCH', body: { language: next } });
      } catch (err) {
        showError(err);
      }
    },
    [lang, showError],
  );

  const updateUser = useCallback(async (patch) => {
    const result = await api('/me', { method: 'PATCH', body: patch });
    setData((current) => ({ ...current, user: result.user }));
    return result.user;
  }, []);

  const refresh = useCallback(() => load({ silent: true }), [load]);

  // Server javobini darhol ro'yxatlarga qo'llash (sahifa yangilanishini kutmasdan)
  const applyAppointment = useCallback((appointment) => {
    setData((current) => {
      if (!current || !appointment) return current;
      const without = (list) => list.filter((a) => a.id !== appointment.id);
      const upcoming = without(current.appointments.upcoming);
      const history = without(current.appointments.history);
      if (['PENDING', 'CONFIRMED'].includes(appointment.status)) upcoming.push(appointment);
      else history.push(appointment);
      const key = (a) => `${a.date} ${a.startTime}`;
      upcoming.sort((a, b) => key(a).localeCompare(key(b)));
      history.sort((a, b) => key(b).localeCompare(key(a)));
      return { ...current, appointments: { upcoming, history } };
    });
  }, []);

  // Telegram "Orqaga" tugmasi
  const canGoBack = story !== null || sheet !== null || stack.length > 0;
  const handleBack = useCallback(() => {
    if (story !== null) return setStory(null);
    if (sheet) return setSheet(null);
    if (backHandler.current && backHandler.current()) return undefined;
    return closeScreen();
  }, [story, sheet, closeScreen]);

  useEffect(() => setBackButton(canGoBack, handleBack), [canGoBack, handleBack]);

  const context = useMemo(
    () => ({
      data,
      lang,
      t,
      tab,
      appointmentsView,
      setAppointmentsView,
      goTab,
      openScreen,
      closeScreen,
      openSheet,
      closeSheet,
      startBooking,
      openStory,
      storySeen,
      refresh,
      applyAppointment,
      changeLanguage,
      updateUser,
      showToast,
      showError,
      backHandler,
    }),
    [
      applyAppointment,
      data,
      lang,
      t,
      tab,
      appointmentsView,
      goTab,
      openScreen,
      closeScreen,
      openSheet,
      closeSheet,
      startBooking,
      openStory,
      storySeen,
      refresh,
      changeLanguage,
      updateUser,
      showToast,
      showError,
    ],
  );

  if (status === 'unauthorized') {
    return <OpenInTelegram lang={lang} botUsername={error?.data?.botUsername} />;
  }
  if (!data) {
    if (status === 'error') return <ErrorScreen lang={lang} error={error} onRetry={() => load()} />;
    return <Loader full />;
  }

  const TabPage = TABS[tab];
  const SheetComponent = sheet ? SHEETS[sheet.type] : null;

  return (
    <AppContext.Provider value={context}>
      {data.user.onboarded ? (
        <>
          <main key={tab}>
            <TabPage />
          </main>
          <BottomNav />
          {stack.map((screen, index) => {
            const ScreenComponent = SCREENS[screen.name];
            return <ScreenComponent key={screen.key} {...screen.params} isTop={index === stack.length - 1} />;
          })}
          {SheetComponent && <SheetComponent key={sheet.key} {...sheet.props} />}
          {story !== null && (
            <StoryViewer
              index={story}
              onClose={closeStory}
              onSeen={markStorySeen}
              onBook={() => {
                setStory(null);
                startBooking();
              }}
            />
          )}
        </>
      ) : (
        <Onboarding />
      )}
      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onDone={hideToast} />}
    </AppContext.Provider>
  );
}
