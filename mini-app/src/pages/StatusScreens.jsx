import { CloudOff, Send } from 'lucide-react';
import { translate } from '../i18n.js';
import { openTelegramLink } from '../telegram.js';

export function OpenInTelegram({ lang, botUsername }) {
  const t = (key) => translate(lang, key);
  return (
    <div className="center-screen">
      <div className="loader-logo" style={{ animation: 'none' }}>
        🦷
      </div>
      <h2>{t('auth.title')}</h2>
      <p>{t('auth.text')}</p>
      {botUsername && (
        <button className="btn btn-primary btn-lg" onClick={() => openTelegramLink(`https://t.me/${botUsername}`)}>
          <Send size={18} />
          {t('auth.button')}
        </button>
      )}
    </div>
  );
}

export function ErrorScreen({ lang, error, onRetry }) {
  const t = (key) => translate(lang, key);
  const message = error?.code === 'NETWORK' ? t('errors.NETWORK') : t('errors.ERROR');
  return (
    <div className="center-screen">
      <div className="empty-icon">
        <CloudOff size={30} />
      </div>
      <h2>{t('errors.loadTitle')}</h2>
      <p>{message}</p>
      <button className="btn btn-primary btn-lg" onClick={onRetry}>
        {t('common.retry')}
      </button>
    </div>
  );
}
