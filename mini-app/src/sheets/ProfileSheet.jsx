import { useState } from 'react';
import { Smartphone } from 'lucide-react';
import { useApp } from '../context.js';
import { canRequestContact, haptic, requestContact } from '../telegram.js';
import { formatPhone } from '../utils.js';
import Sheet from '../components/Sheet.jsx';
import { Spinner } from '../components/Common.jsx';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function ProfileSheet() {
  const { data, t, closeSheet, updateUser, refresh, showToast, showError } = useApp();
  const { user } = data;
  const [form, setForm] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    phone: user.phone ? formatPhone(user.phone) : '',
    birthDate: user.birthDate || '',
  });
  const [saving, setSaving] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const save = async () => {
    setSaving(true);
    try {
      await updateUser({
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        birthDate: form.birthDate || null,
      });
      haptic.success();
      showToast(t('profile.saved'), 'success');
      closeSheet();
    } catch (err) {
      showError(err);
    } finally {
      setSaving(false);
    }
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

  return (
    <Sheet
      onClose={closeSheet}
      footer={
        <button className="btn btn-primary btn-lg btn-block" onClick={save} disabled={saving}>
          {saving ? <Spinner /> : t('common.save')}
        </button>
      }
    >
      <h2 className="sheet-title" style={{ marginBottom: 16 }}>
        {t('profile.personal')}
      </h2>
      <div className="field">
        <label htmlFor="p-first">{t('profile.firstName')}</label>
        <input id="p-first" className="input" value={form.firstName} maxLength={60} onChange={set('firstName')} />
      </div>
      <div className="field">
        <label htmlFor="p-last">{t('profile.lastName')}</label>
        <input id="p-last" className="input" value={form.lastName} maxLength={60} onChange={set('lastName')} />
      </div>
      <div className="field">
        <label htmlFor="p-phone">{t('profile.phone')}</label>
        <input
          id="p-phone"
          className="input"
          inputMode="tel"
          placeholder="+998 90 123 45 67"
          value={form.phone}
          maxLength={20}
          onChange={set('phone')}
        />
      </div>
      {canRequestContact() && (
        <button className="btn btn-soft btn-sm share-phone" onClick={sharePhone}>
          <Smartphone size={16} />
          {t('booking.sharePhone')}
        </button>
      )}
      <div className="field">
        <label htmlFor="p-birth">{t('profile.birthDate')}</label>
        <input id="p-birth" className="input" type="date" value={form.birthDate} onChange={set('birthDate')} />
      </div>
    </Sheet>
  );
}
