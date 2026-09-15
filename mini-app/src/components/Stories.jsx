import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../context.js';
import { translate } from '../i18n.js';

const COLORS = [
  ['#dbeafe', 'linear-gradient(160deg, #1d4ed8, #3b82f6 60%, #06b6d4)'],
  ['#dcfce7', 'linear-gradient(160deg, #047857, #10b981 60%, #34d399)'],
  ['#fef3c7', 'linear-gradient(160deg, #b45309, #f59e0b 60%, #fbbf24)'],
  ['#fce7f3', 'linear-gradient(160deg, #be185d, #ec4899 60%, #f472b6)'],
  ['#ede9fe', 'linear-gradient(160deg, #6d28d9, #8b5cf6 60%, #a78bfa)'],
];
const DURATION = 6000;

export function Stories() {
  const { lang, openStory, storySeen } = useApp();
  const stories = translate(lang, 'stories');

  return (
    <div className="hscroll stories">
      {stories.map((story, i) => (
        <button key={story.label} className="story" onClick={() => openStory(i)}>
          <div className={`story-ring ${storySeen.includes(i) ? 'seen' : ''}`}>
            <div className="story-inner" style={{ background: COLORS[i % COLORS.length][0] }}>
              {story.emoji}
            </div>
          </div>
          <span>{story.label}</span>
        </button>
      ))}
    </div>
  );
}

export function StoryViewer({ index, onClose, onBook, onSeen }) {
  const { lang } = useApp();
  const stories = translate(lang, 'stories');
  const [current, setCurrent] = useState(index);
  const timer = useRef(null);

  useEffect(() => {
    onSeen(current);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (current < stories.length - 1) setCurrent(current + 1);
      else onClose();
    }, DURATION);
    return () => clearTimeout(timer.current);
  }, [current, stories.length, onClose, onSeen]);

  const story = stories[current];
  const go = (delta) => {
    const next = current + delta;
    if (next < 0) return;
    if (next >= stories.length) onClose();
    else setCurrent(next);
  };

  return (
    <div className="story-viewer" style={{ background: COLORS[current % COLORS.length][1] }}>
      <div className="story-bars">
        {stories.map((s, i) => (
          <div key={s.label} className={`story-bar ${i < current ? 'done' : ''} ${i === current ? 'current' : ''}`}>
            <div style={i === current ? { animationDuration: `${DURATION}ms` } : undefined} key={i === current ? current : undefined} />
          </div>
        ))}
      </div>
      <div className="story-head">
        <span>{story.label}</span>
        <button className="icon-btn" style={{ color: '#fff' }} onClick={onClose} aria-label="close">
          <X size={24} />
        </button>
      </div>
      <div className="story-content">
        <div className="story-emoji">{story.emoji}</div>
        <h2>{story.title}</h2>
        <p>{story.text}</p>
        <button className="story-tap left" onClick={() => go(-1)} aria-label="prev" />
        <button className="story-tap right" onClick={() => go(1)} aria-label="next" />
      </div>
      <div className="story-footer">
        <button className="btn btn-lg btn-block" onClick={onBook}>
          {translate(lang, 'storyCta')}
        </button>
      </div>
    </div>
  );
}
