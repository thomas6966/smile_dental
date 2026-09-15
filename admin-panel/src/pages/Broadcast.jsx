import { useCallback, useEffect, useState } from 'react';
import { Megaphone, Send } from 'lucide-react';
import { api } from '../api.js';
import { Empty, Loading, Spinner, useUI } from '../ui.jsx';
import { formatDateTime } from '../utils.js';

export default function Broadcast() {
  const { toast, confirm } = useUI();
  const [audience, setAudience] = useState(null);
  const [history, setHistory] = useState(null);
  const [form, setForm] = useState({ textUz: '', textRu: '' });
  const [previewLang, setPreviewLang] = useState('uz');
  const [sending, setSending] = useState(false);

  const load = useCallback(() => {
    Promise.all([api('/broadcasts/audience'), api('/broadcasts')])
      .then(([aud, list]) => {
        setAudience(aud);
        setHistory(list.items);
      })
      .catch((err) => toast(err.message, 'error'));
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Yuborilayotgan xabarnoma bo'lsa, holatini yangilab turish
  useEffect(() => {
    if (!history?.some((b) => b.status === 'SENDING')) return undefined;
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [history, load]);

  const send = async () => {
    const ok = await confirm({
      title: 'Xabarnomani yuborish',
      text: `Xabar ${audience?.total ?? 0} ta bot foydalanuvchisiga yuboriladi. Davom etasizmi?`,
      confirmText: 'Yuborish',
    });
    if (!ok) return;
    setSending(true);
    try {
      await api('/broadcasts', { method: 'POST', body: form });
      toast('Xabarnoma yuborilmoqda');
      setForm({ textUz: '', textRu: '' });
      load();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSending(false);
    }
  };

  const previewText = (previewLang === 'uz' ? form.textUz || form.textRu : form.textRu || form.textUz) || "Xabar matni shu yerda ko'rinadi...";

  return (
    <div className="dash-grid">
      <div className="stack" style={{ gap: 18 }}>
        <div className="card">
          <div className="card-head">
            <Megaphone size={18} className="muted" />
            <h3 className="grow">Yangi xabarnoma</h3>
            {audience && (
              <span className="small muted">
                Qabul qiluvchilar: <b>{audience.total}</b> (o'zbekcha: {audience.uz}, ruscha: {audience.ru})
              </span>
            )}
          </div>
          <div className="card-body stack">
            <div className="alert alert-info">
              Aksiya, yangilik yoki bayram tabrigini barcha bot foydalanuvchilariga yuboring. Har bir mijoz o'z tilidagi matnni oladi. Faqat bitta tilda
              yozsangiz, hammaga shu matn yuboriladi.
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Matn (o'zbekcha)</label>
                <textarea
                  className="textarea"
                  style={{ minHeight: 180 }}
                  maxLength={4000}
                  placeholder="Masalan: 🎉 Navro'z munosabati bilan professional gigiena 20% chegirmada!"
                  value={form.textUz}
                  onChange={(e) => setForm({ ...form, textUz: e.target.value })}
                  onFocus={() => setPreviewLang('uz')}
                />
              </div>
              <div className="field">
                <label>Matn (ruscha)</label>
                <textarea
                  className="textarea"
                  style={{ minHeight: 180 }}
                  maxLength={4000}
                  placeholder="Например: 🎉 В честь Навруза профессиональная гигиена со скидкой 20%!"
                  value={form.textRu}
                  onChange={(e) => setForm({ ...form, textRu: e.target.value })}
                  onFocus={() => setPreviewLang('ru')}
                />
              </div>
            </div>
            <div className="row">
              <button className="btn btn-primary" onClick={send} disabled={sending || (!form.textUz.trim() && !form.textRu.trim()) || !audience?.total}>
                {sending ? <Spinner /> : <Send size={16} />} Yuborish
              </button>
              {audience && audience.total === 0 && <span className="small muted">Hozircha botdan foydalangan mijozlar yo'q</span>}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Yuborilgan xabarnomalar</h3>
          </div>
          {!history ? (
            <Loading />
          ) : history.length === 0 ? (
            <Empty text="Hali xabarnoma yuborilmagan" />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th>Matn</th>
                    <th className="num">Yuborildi</th>
                    <th>Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((b) => (
                    <tr key={b.id}>
                      <td className="nowrap">
                        <div>{formatDateTime(b.createdAt)}</div>
                        <div className="small muted">{b.createdBy}</div>
                      </td>
                      <td style={{ maxWidth: 360 }}>
                        <div className="ellipsis">{b.textUz}</div>
                      </td>
                      <td className="num nowrap">
                        <b>{b.sent}</b> / {b.total}
                        {b.failed > 0 && <div className="small" style={{ color: 'var(--red)' }}>{b.failed} ta yetib bormadi</div>}
                      </td>
                      <td>
                        {b.status === 'SENDING' ? (
                          <span className="badge tone-amber">
                            <Spinner size={12} /> Yuborilmoqda
                          </span>
                        ) : (
                          <span className="badge tone-green">Yuborildi</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <h3 className="grow">Ko'rinishi</h3>
          <div className="segmented">
            <button className={previewLang === 'uz' ? 'active' : ''} onClick={() => setPreviewLang('uz')}>
              UZ
            </button>
            <button className={previewLang === 'ru' ? 'active' : ''} onClick={() => setPreviewLang('ru')}>
              RU
            </button>
          </div>
        </div>
        <div className="card-body">
          <div className="tg-preview">
            <div className="tg-bubble">{previewText}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
