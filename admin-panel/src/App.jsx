import { useCallback, useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { api, getToken, setToken } from './api.js';
import { Loading, UIProvider } from './ui.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import CalendarPage from './pages/Calendar.jsx';
import Appointments from './pages/Appointments.jsx';
import Patients from './pages/Patients.jsx';
import PatientDetail from './pages/PatientDetail.jsx';
import Services from './pages/Services.jsx';
import Doctors from './pages/Doctors.jsx';
import Broadcast from './pages/Broadcast.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(() => Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me')
      .then((res) => setAdmin(res.admin))
      .catch(() => setToken(null))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    const onLogout = () => setAdmin(null);
    window.addEventListener('admin:logout', onLogout);
    return () => window.removeEventListener('admin:logout', onLogout);
  }, []);

  const login = useCallback((token, profile) => {
    setToken(token);
    setAdmin(profile);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setAdmin(null);
  }, []);

  if (checking) return <Loading />;

  return (
    <UIProvider>
      {!admin ? (
        <Login onLogin={login} />
      ) : (
        <Routes>
          <Route element={<Layout admin={admin} onLogout={logout} />}>
            <Route index element={<Dashboard />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="patients" element={<Patients />} />
            <Route path="patients/:id" element={<PatientDetail />} />
            <Route path="services" element={<Services />} />
            <Route path="doctors" element={<Doctors />} />
            <Route path="broadcast" element={<Broadcast />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      )}
    </UIProvider>
  );
}
