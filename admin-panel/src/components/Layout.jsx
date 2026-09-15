import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  Bell,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Plus,
  Settings,
  Stethoscope,
  Tag,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { api } from '../api.js';
import { AdminContext } from '../store.js';
import { Avatar, ErrorBox, Loading, useUI } from '../ui.jsx';
import { emitRefresh, formatDate, fullName, playBeep, timeAgo } from '../utils.js';
import AppointmentForm from './AppointmentForm.jsx';
import AppointmentDrawer from './AppointmentDrawer.jsx';

const NAV = [
  { to: '/', label: 'Bosh sahifa', icon: LayoutDashboard, end: true },
  { to: '/calendar', label: 'Kalendar', icon: CalendarDays },
  { to: '/appointments', label: 'Qabullar', icon: ClipboardList, badge: 'pending' },
  { to: '/patients', label: 'Bemorlar', icon: Users },
  { to: '/services', label: 'Xizmatlar va narxlar', icon: Tag },
  { to: '/doctors', label: 'Shifokorlar', icon: Stethoscope },
  { to: '/broadcast', label: 'Xabarnoma', icon: Megaphone },
  { to: '/settings', label: 'Sozlamalar', icon: Settings },
];

const TITLES = {
  '/': 'Bosh sahifa',
  '/calendar': 'Kalendar',
  '/appointments': 'Qabullar',
  '/patients': 'Bemorlar',
  '/services': 'Xizmatlar va narxlar',
  '/doctors': 'Shifokorlar',
  '/broadcast': 'Xabarnoma',
  '/settings': 'Sozlamalar',
};

const NOTIFY_META = {
  NEW_BOOKING: { icon: '🆕', tone: 'tone-blue', text: 'Yangi yozilish' },
  CANCELLED: { icon: '❌', tone: 'tone-red', text: 'Bemor qabulni bekor qildi' },
  RESCHEDULED: { icon: '🔄', tone: 'tone-amber', text: "Bemor vaqtni o'zgartirdi" },
  CONFIRMED: { icon: '✅', tone: 'tone-green', text: 'Bemor kelishini tasdiqladi' },
  RATED: { icon: '⭐', tone: 'tone-amber', text: 'Yangi baho' },
};

function notificationText(n) {
  const meta = NOTIFY_META[n.type] || { text: n.type };
  const a = n.appointment;
  if (!a) return meta.text;
  const detail = n.type === 'RATED' ? `${'★'.repeat(a.rating || 0)}` : `${formatDate(a.date)}, ${a.startTime}`;
  return `${meta.text}: ${fullName(a.user)} — ${detail}`;
}

function readSound() {
  try {
    return localStorage.getItem('clinic-sound') !== 'off';
  } catch {
    return true;
  }
}

export default function Layout({ admin, onLogout }) {
  const { toast } = useUI();
  const location = useLocation();
  const [refs, setRefs] = useState({ doctors: [], services: [], categories: [], loaded: false });
  const [refsError, setRefsError] = useState(null);
  const [notifications, setNotifications] = useState({ unread: 0, items: [] });
  const [bellOpen, setBellOpen] = useState(false);
  const [sound, setSound] = useState(readSound);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [drawerId, setDrawerId] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const lastId = useRef(null);
  const soundRef = useRef(sound);
  soundRef.current = sound;

  const loadRefs = useCallback(async () => {
    setRefsError(null);
    try {
      const [doctors, services, categories] = await Promise.all([api('/doctors'), api('/services'), api('/categories')]);
      setRefs({ doctors: doctors.items, services: services.items, categories: categories.items, loaded: true });
    } catch (err) {
      setRefsError(err.message);
    }
  }, []);

  useEffect(() => {
    loadRefs();
  }, [loadRefs]);

  // Real vaqt: har 15 soniyada yangi bildirishnomalarni tekshirish
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const res = await api('/notifications');
        if (!alive) return;
        const maxId = res.items[0]?.id || 0;
        if (lastId.current !== null && maxId > lastId.current) {
          const fresh = res.items.filter((n) => n.id > lastId.current).reverse();
          fresh.forEach((n) => toast(notificationText(n), 'info'));
          if (soundRef.current) playBeep();
          emitRefresh();
        }
        lastId.current = maxId;
        setNotifications(res);
      } catch {
        // tarmoq xatosi — keyingi urinishda qayta tekshiriladi
      }
    };
    poll();
    const timer = setInterval(poll, 15000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [toast]);

  useEffect(() => {
    let alive = true;
    const loadPending = () =>
      api('/appointments?status=PENDING&pageSize=1&from=' + new Date().toISOString().slice(0, 10))
        .then((res) => alive && setPendingCount(res.total))
        .catch(() => {});
    loadPending();
    window.addEventListener('clinic:refresh', loadPending);
    return () => {
      alive = false;
      window.removeEventListener('clinic:refresh', loadPending);
    };
  }, []);

  useEffect(() => {
    document.title = notifications.unread ? `(${notifications.unread}) Admin Panel` : 'Admin Panel';
  }, [notifications.unread]);

  useEffect(() => {
    setSidebarOpen(false);
    setBellOpen(false);
  }, [location.pathname]);

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    try {
      localStorage.setItem('clinic-sound', next ? 'on' : 'off');
    } catch {
      // e'tiborsiz qoldiriladi
    }
    if (next) playBeep();
  };

  const openBell = async () => {
    const next = !bellOpen;
    setBellOpen(next);
    if (next && notifications.unread) {
      await api('/notifications/read', { method: 'POST' }).catch(() => {});
      setNotifications((n) => ({ ...n, unread: 0, items: n.items.map((i) => ({ ...i, isRead: true })) }));
    }
  };

  const closeDrawer = useCallback(() => setDrawerId(null), []);
  const openAppointment = useCallback((id) => setDrawerId(id), []);
  const newAppointment = useCallback((prefill = {}) => setForm({ prefill }), []);
  const editAppointment = useCallback((appointment) => setForm({ appointment }), []);

  const context = useMemo(
    () => ({ admin, onLogout, ...refs, reloadRefs: loadRefs, openAppointment, newAppointment, editAppointment }),
    [admin, onLogout, refs, loadRefs, openAppointment, newAppointment, editAppointment],
  );

  const basePath = `/${location.pathname.split('/')[1] || ''}`;
  const title = TITLES[basePath] || 'Admin Panel';

  return (
    <AdminContext.Provider value={context}>
      <div className="layout">
        <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="brand">
            <div className="brand-logo">🦷</div>
            <div>
              <div className="brand-name">Stomatologiya</div>
              <div className="small muted">Admin Panel</div>
            </div>
          </div>
          <nav className="nav">
            {NAV.map(({ to, label, icon: Icon, end, badge }) => (
              <NavLink key={to} to={to} end={end}>
                <Icon size={18} />
                {label}
                {badge === 'pending' && pendingCount > 0 && <span className="nav-count">{pendingCount}</span>}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-footer">
            <Avatar name={admin.fullName} size={34} />
            <div className="grow">
              <div className="bold ellipsis">{admin.fullName}</div>
              <div className="small muted ellipsis">@{admin.username}</div>
            </div>
            <button className="icon-btn" onClick={onLogout} title="Chiqish">
              <LogOut size={17} />
            </button>
          </div>
        </aside>

        <div className="main">
          <header className="topbar">
            <button className="icon-btn menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Menyu">
              <Menu size={20} />
            </button>
            <h1 className="grow ellipsis">{title}</h1>
            <button className="btn btn-primary" onClick={() => newAppointment()}>
              <Plus size={17} /> Yangi qabul
            </button>
            <button className="icon-btn" onClick={toggleSound} title={sound ? "Ovozni o'chirish" : 'Ovozni yoqish'}>
              {sound ? <Volume2 size={19} /> : <VolumeX size={19} />}
            </button>
            <div style={{ position: 'relative' }}>
              <button className="icon-btn" onClick={openBell} title="Bildirishnomalar">
                <Bell size={19} />
                {notifications.unread > 0 && <span className="dot-badge">{notifications.unread}</span>}
              </button>
              {bellOpen && (
                <div className="dropdown">
                  <div className="card-head">
                    <h3>Bildirishnomalar</h3>
                  </div>
                  {notifications.items.length === 0 && <div className="empty">Hozircha bildirishnoma yo'q</div>}
                  {notifications.items.map((n) => {
                    const meta = NOTIFY_META[n.type] || { icon: '🔔', tone: 'tone-gray' };
                    return (
                      <button
                        key={n.id}
                        className={`notif ${n.isRead ? '' : 'unread'}`}
                        onClick={() => {
                          if (n.appointment) setDrawerId(n.appointment.id);
                          setBellOpen(false);
                        }}
                      >
                        <span className={`notif-icon ${meta.tone}`}>{meta.icon}</span>
                        <span className="grow">
                          <span className="bold" style={{ display: 'block' }}>
                            {notificationText(n)}
                          </span>
                          <span className="small muted">{timeAgo(n.createdAt)}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </header>

          <main className="content">
            {refs.loaded ? <Outlet /> : refsError ? <ErrorBox message={refsError} onRetry={loadRefs} /> : <Loading />}
          </main>
        </div>

        {form && (
          <AppointmentForm
            appointment={form.appointment}
            prefill={form.prefill}
            onClose={() => setForm(null)}
          />
        )}
        {drawerId && <AppointmentDrawer id={drawerId} onClose={closeDrawer} />}
      </div>
    </AdminContext.Provider>
  );
}
