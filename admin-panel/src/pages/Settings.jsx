import { useCallback, useEffect, useState } from 'react';
import { Bot, ExternalLink, KeyRound, Trash2, UserPlus } from 'lucide-react';
import { api } from '../api.js';
import { useAdmin } from '../store.js';
import { Avatar, Loading, Spinner, Toggle, useUI } from '../ui.jsx';
import { emitRefresh, formatDateTime } from '../utils.js';

const TABS = [
  { key: 'clinic', label: "Klinika ma'lumotlari" },
  { key: 'rules', label: 'Qabul qoidalari' },
  { key: 'reminders', label: 'Eslatmalar' },
  { key: 'staff', label: 'Xodimlar' },
  { key: 'password', label: 'Parolni almashtirish' },
  { key: 'system', label: 'Tizim' },
];

function Field({ label, hint, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

function SettingsForm({ tab }) {
  const { toast } = useUI();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('/settings')
      .then((res) => setForm(res.settings))
      .catch((err) => toast(err.message, 'error'));
  }, [toast]);

  if (!form) return <Loading />;

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const setValue = (field, value) => setForm({ ...form, [field]: value });

  const save = async () => {
    setSaving(true);
    try {
      const res = await api('/settings', { method: 'PUT', body: form });
      setForm(res.settings);
      toast('Sozlamalar saqlandi');
      emitRefresh();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const mapLink = form.latitude && form.longitude ? `https://maps.google.com/?q=${form.latitude},${form.longitude}` : null;

  return (
    <div className="card">
      <div className="card-body stack" style={{ gap: 16 }}>
        {tab === 'clinic' && (
          <>
            <div className="grid-3">
              <Field label="Klinika nomi *">
                <input className="input" value={form.name} onChange={set('name')} />
              </Field>
              <Field label="Asosiy telefon *">
                <input className="input" value={form.phone} onChange={set('phone')} />
              </Field>
              <Field label="Qo'shimcha telefon">
                <input className="input" value={form.phone2 || ''} onChange={set('phone2')} />
              </Field>
            </div>
            <div className="grid-2">
              <Field label="Manzil (o'zbekcha) *">
                <input className="input" value={form.addressUz} onChange={set('addressUz')} />
              </Field>
              <Field label="Manzil (ruscha) *">
                <input className="input" value={form.addressRu} onChange={set('addressRu')} />
              </Field>
              <Field label="Mo'ljal (o'zbekcha)">
                <input className="input" value={form.landmarkUz || ''} onChange={set('landmarkUz')} />
              </Field>
              <Field label="Mo'ljal (ruscha)">
                <input className="input" value={form.landmarkRu || ''} onChange={set('landmarkRu')} />
              </Field>
            </div>
            <div className="grid-3">
              <Field label="Kenglik (latitude)" hint="Google Maps'da joyni bosing — koordinatalar chiqadi">
                <input className="input" value={form.latitude ?? ''} onChange={set('latitude')} placeholder="41.2756" />
              </Field>
              <Field label="Uzunlik (longitude)">
                <input className="input" value={form.longitude ?? ''} onChange={set('longitude')} placeholder="69.2034" />
              </Field>
              <Field label="Xaritada tekshirish">
                {mapLink ? (
                  <a className="btn btn-secondary" href={mapLink} target="_blank" rel="noreferrer">
                    <ExternalLink size={15} /> Google Maps'da ochish
                  </a>
                ) : (
                  <span className="muted">Koordinatalar kiritilmagan</span>
                )}
              </Field>
            </div>
            <div className="grid-2">
              <Field label="Ish vaqti (o'zbekcha) *">
                <input className="input" value={form.workingHoursUz} onChange={set('workingHoursUz')} />
              </Field>
              <Field label="Ish vaqti (ruscha) *">
                <input className="input" value={form.workingHoursRu} onChange={set('workingHoursRu')} />
              </Field>
              <Field label="Klinika haqida (o'zbekcha)">
                <textarea className="textarea" value={form.aboutUz || ''} onChange={set('aboutUz')} />
              </Field>
              <Field label="Klinika haqida (ruscha)">
                <textarea className="textarea" value={form.aboutRu || ''} onChange={set('aboutRu')} />
              </Field>
              <Field label="Instagram" hint="Masalan: klinika_nomi">
                <input className="input" value={form.instagram || ''} onChange={set('instagram')} />
              </Field>
              <Field label="Telegram kanal" hint="Masalan: @klinika_kanali">
                <input className="input" value={form.telegram || ''} onChange={set('telegram')} />
              </Field>
            </div>
          </>
        )}

        {tab === 'rules' && (
          <>
            <div className="grid-2">
              <Field label="Qabul vaqtlari oralig'i" hint="Kalendarda vaqtlar qanchalik tez-tez ko'rsatiladi">
                <select className="select" value={form.slotStepMin} onChange={(e) => setValue('slotStepMin', Number(e.target.value))}>
                  {[10, 15, 20, 30, 45, 60].map((v) => (
                    <option key={v} value={v}>
                      Har {v} daqiqada
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Necha kun oldinga yozilish mumkin">
                <input className="input" type="number" min="1" max="180" value={form.bookingDaysAhead} onChange={set('bookingDaysAhead')} />
              </Field>
              <Field label="Eng yaqin yozilish vaqti" hint="Mijoz hozirgi vaqtdan kamida shuncha keyinga yozila oladi">
                <select className="select" value={form.minLeadMinutes} onChange={(e) => setValue('minLeadMinutes', Number(e.target.value))}>
                  {[
                    [0, 'Cheklovsiz'],
                    [30, '30 daqiqadan keyin'],
                    [60, '1 soatdan keyin'],
                    [120, '2 soatdan keyin'],
                    [180, '3 soatdan keyin'],
                    [1440, 'Ertangi kundan'],
                  ].map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Bekor qilish / ko'chirish muddati" hint="Qabulga shundan kam vaqt qolganda mijoz o'zi o'zgartira olmaydi">
                <select className="select" value={form.cancelLimitHours} onChange={(e) => setValue('cancelLimitHours', Number(e.target.value))}>
                  {[0, 1, 2, 3, 6, 12, 24].map((v) => (
                    <option key={v} value={v}>
                      {v === 0 ? 'Cheklovsiz' : `${v} soat oldin`}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Toggle
              checked={form.autoConfirm}
              onChange={(v) => setValue('autoConfirm', v)}
              label="Telegram orqali yozilishlarni avtomatik tasdiqlash (administrator tasdig'isiz)"
            />
          </>
        )}

        {tab === 'reminders' && (
          <>
            <div className="alert alert-info">
              Eslatmalar bot orqali avtomatik yuboriladi. Dastur kompyuterda ishlab turgan vaqtda tekshiriladi.
            </div>
            <Toggle checked={form.remindDayBefore} onChange={(v) => setValue('remindDayBefore', v)} label="Qabuldan 1 kun oldin eslatish (kelishini tasdiqlash tugmasi bilan)" />
            <Toggle checked={form.remindHoursBefore} onChange={(v) => setValue('remindHoursBefore', v)} label="Qabuldan 2 soat oldin eslatish (xarita tugmasi bilan)" />
            <div className="divider" />
            <Toggle checked={form.checkupEnabled} onChange={(v) => setValue('checkupEnabled', v)} label="Profilaktik ko'rik haqida muntazam eslatma yuborish" />
            <div style={{ maxWidth: 360 }}>
              <Field label="Ko'rik eslatmasi davriyligi" hint="Oxirgi tashrifdan (yoki botga qo'shilgandan) shuncha vaqt o'tgach, soat 10:00–20:00 oralig'ida yuboriladi">
                <select
                  className="select"
                  value={form.checkupIntervalMonths}
                  disabled={!form.checkupEnabled}
                  onChange={(e) => setValue('checkupIntervalMonths', Number(e.target.value))}
                >
                  {[3, 4, 5, 6, 9, 12].map((v) => (
                    <option key={v} value={v}>
                      Har {v} oyda
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </>
        )}

        <div>
          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? <Spinner /> : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Staff() {
  const { admin } = useAdmin();
  const { toast, confirm } = useUI();
  const [items, setItems] = useState(null);
  const [form, setForm] = useState({ fullName: '', username: '', password: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api('/admins')
      .then((res) => setItems(res.items))
      .catch((err) => toast(err.message, 'error'));
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    setSaving(true);
    try {
      await api('/admins', { method: 'POST', body: form });
      toast("Xodim qo'shildi");
      setForm({ fullName: '', username: '', password: '' });
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item) => {
    const ok = await confirm({
      title: "Xodimni o'chirish",
      text: `${item.fullName} endi Admin Panelga kira olmaydi.`,
      confirmText: "O'chirish",
      danger: true,
    });
    if (!ok) return;
    try {
      await api(`/admins/${item.id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="card">
        <div className="card-head">
          <h3>Admin Panelga kira oladigan xodimlar</h3>
        </div>
        {!items ? (
          <Loading />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Xodim</th>
                <th>Login</th>
                <th>Qo'shilgan</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="row">
                      <Avatar name={item.fullName} size={30} />
                      <b>{item.fullName}</b>
                      {item.id === admin.id && <span className="badge tone-blue">Siz</span>}
                    </span>
                  </td>
                  <td>@{item.username}</td>
                  <td className="muted">{formatDateTime(item.createdAt)}</td>
                  <td className="num">
                    {item.id !== admin.id && (
                      <button className="btn btn-ghost btn-icon btn-sm" onClick={() => remove(item)}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="card-head">
          <UserPlus size={18} className="muted" />
          <h3>Yangi xodim qo'shish</h3>
        </div>
        <div className="card-body stack">
          <div className="grid-3">
            <Field label="Ismi">
              <input className="input" placeholder="Masalan: Registrator Nodira" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            </Field>
            <Field label="Login" hint="Lotin harflari, raqam, _ yoki .">
              <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} />
            </Field>
            <Field label="Parol" hint="Kamida 6 ta belgi">
              <input className="input" type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
          </div>
          <div>
            <button className="btn btn-primary" onClick={add} disabled={saving || !form.fullName || !form.username || !form.password}>
              {saving ? <Spinner /> : <UserPlus size={16} />} Qo'shish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PasswordForm() {
  const { toast } = useUI();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (form.newPassword !== form.confirm) return toast('Yangi parollar bir xil emas', 'error');
    setSaving(true);
    try {
      await api('/auth/password', { method: 'POST', body: form });
      toast("Parol o'zgartirildi");
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <div className="card-head">
        <KeyRound size={18} className="muted" />
        <h3>Parolni almashtirish</h3>
      </div>
      <div className="card-body stack">
        <Field label="Joriy parol">
          <input className="input" type="password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} />
        </Field>
        <Field label="Yangi parol" hint="Kamida 6 ta belgi">
          <input className="input" type="password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} />
        </Field>
        <Field label="Yangi parolni takrorlang">
          <input className="input" type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        </Field>
        <div>
          <button className="btn btn-primary" onClick={save} disabled={saving || !form.currentPassword || !form.newPassword}>
            {saving ? <Spinner /> : 'Saqlash'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SystemInfo() {
  const { toast, confirm } = useUI();
  const [info, setInfo] = useState(null);

  const load = useCallback(() => {
    api('/system')
      .then(setInfo)
      .catch((err) => toast(err.message, 'error'));
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const clearDemo = async () => {
    const ok = await confirm({
      title: "Namuna ma'lumotlarni o'chirish",
      text: `${info.demoPatients} ta namuna bemor va ularning barcha qabullari o'chiriladi. Xizmatlar, shifokorlar va sozlamalar saqlanib qoladi. Haqiqiy mijozlar bilan ishlashni boshlashdan oldin shuni bosing.`,
      confirmText: "O'chirish",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await api('/demo/clear', { method: 'POST' });
      toast(`${res.deleted} ta namuna bemor o'chirildi`);
      emitRefresh();
      load();
    } catch (err) {
      toast(err.message, 'error');
    }
  };

  if (!info) return <Loading />;

  return (
    <div className="stack" style={{ gap: 18, maxWidth: 720 }}>
      <div className="card">
        <div className="card-head">
          <Bot size={18} className="muted" />
          <h3>Telegram bot va Mini App</h3>
        </div>
        <div className="card-body">
          <dl className="info-list" style={{ gridTemplateColumns: '180px 1fr' }}>
            <dt>Bot holati</dt>
            <dd>{info.botOk ? <span className="badge tone-green">Ishlayapti</span> : <span className="badge tone-red">Ulanmagan</span>}</dd>
            <dt>Bot manzili</dt>
            <dd>
              {info.botUsername ? (
                <a className="link" href={`https://t.me/${info.botUsername}`} target="_blank" rel="noreferrer">
                  t.me/{info.botUsername}
                </a>
              ) : (
                '—'
              )}
            </dd>
            <dt>Mini App manzili</dt>
            <dd>
              {info.webAppUrl ? (
                <a className="link" href={info.webAppUrl} target="_blank" rel="noreferrer">
                  {info.webAppUrl}
                </a>
              ) : (
                <span className="badge tone-amber">Ulanmagan — .env faylida NGROK_AUTHTOKEN ni kiriting</span>
              )}
            </dd>
            <dt>Brauzerda test rejimi</dt>
            <dd>{info.devAuth ? 'Yoqilgan (DEV_AUTH=true)' : "O'chirilgan"}</dd>
          </dl>
        </div>
      </div>

      <div className="card" style={{ borderColor: '#fecaca' }}>
        <div className="card-head">
          <Trash2 size={18} color="var(--red)" />
          <h3>Namuna (demo) ma'lumotlar</h3>
        </div>
        <div className="card-body stack">
          <p className="text-2">
            Dastur mijozga ko'rsatish uchun namuna bemorlar va qabullar bilan to'ldirilgan. Hozir: <b>{info.demoPatients}</b> ta namuna bemor.
          </p>
          <div>
            <button className="btn btn-danger-soft" onClick={clearDemo} disabled={!info.demoPatients}>
              <Trash2 size={16} /> Namuna bemorlar va qabullarni o'chirish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const [tab, setTab] = useState('clinic');

  return (
    <>
      <div className="tabs">
        {TABS.map((t) => (
          <button key={t.key} className={tab === t.key ? 'active' : ''} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>
      {['clinic', 'rules', 'reminders'].includes(tab) && <SettingsForm key={tab} tab={tab} />}
      {tab === 'staff' && <Staff />}
      {tab === 'password' && <PasswordForm />}
      {tab === 'system' && <SystemInfo />}
    </>
  );
}
