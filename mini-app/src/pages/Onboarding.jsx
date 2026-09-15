import { useRef, useState } from 'react';
import { CalendarCheck, ShieldCheck, Smile } from 'lucide-react';
import { useApp } from '../context.js';
import { haptic } from '../telegram.js';
import { Spinner } from '../components/Common.jsx';

const SLIDES = [
  { key: 's1', icon: Smile, color: '#2563eb', bg: '#eff6ff', floats: ['🦷', '✨'] },
  { key: 's2', icon: CalendarCheck, color: '#059669', bg: '#ecfdf5', floats: ['📅', '⏰'] },
  { key: 's3', icon: ShieldCheck, color: '#db2777', bg: '#fdf2f8', floats: ['📋', '🔔'] },
];

export default function Onboarding() {
  const { t, lang, changeLanguage, updateUser, showError } = useApp();
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const touchX = useRef(null);
  const last = index === SLIDES.length - 1;

  const finish = async () => {
    setSaving(true);
    try {
      await updateUser({ onboarded: true });
      haptic.success();
    } catch (err) {
      showError(err);
      setSaving(false);
    }
  };

  const go = (next) => {
    if (next < 0 || next >= SLIDES.length) return;
    haptic.light();
    setIndex(next);
  };

  return (
    <div
      className="onboarding"
      onTouchStart={(e) => {
        touchX.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      <div className="onb-top">
        <div className="lang-switch">
          {['uz', 'ru'].map((code) => (
            <button key={code} className={code === lang ? 'active' : ''} onClick={() => changeLanguage(code)}>
              {code === 'uz' ? "O'zb" : 'Рус'}
            </button>
          ))}
        </div>
        {!last && (
          <button className="link-btn" onClick={finish} disabled={saving}>
            {t('onboarding.skip')}
          </button>
        )}
      </div>

      <div className="onb-viewport">
        <div className="onb-track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {SLIDES.map(({ key, icon: Icon, color, bg, floats }) => (
            <div className="onb-slide" key={key}>
              <div className="onb-art" style={{ background: bg, color }}>
                <Icon size={96} strokeWidth={1.4} />
                <div className="onb-float a">{floats[0]}</div>
                <div className="onb-float b">{floats[1]}</div>
              </div>
              <h1>{t(`onboarding.${key}.title`)}</h1>
              <p>{t(`onboarding.${key}.text`)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="onb-bottom">
        <div className="dots">
          {SLIDES.map((slide, i) => (
            <span key={slide.key} className={i === index ? 'active' : ''} />
          ))}
        </div>
        <button
          className="btn btn-primary btn-lg btn-block"
          onClick={() => (last ? finish() : go(index + 1))}
          disabled={saving}
        >
          {saving ? <Spinner /> : last ? t('onboarding.start') : t('common.next')}
        </button>
      </div>
    </div>
  );
}
