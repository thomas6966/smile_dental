import { useEffect, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';

export default function Screen({ title, subtitle, onBack, right, children, footer, progress, scrollKey, bordered = false }) {
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [scrollKey]);

  return (
    <div className="screen">
      <div className="screen-inner">
        <div className={`topbar ${bordered ? 'bordered' : ''}`}>
          <button className="icon-btn" onClick={onBack} aria-label="back">
            <ChevronLeft size={26} />
          </button>
          <div className="topbar-title">
            <div className="ellipsis">{title}</div>
            {subtitle && <div className="topbar-sub">{subtitle}</div>}
          </div>
          {right}
        </div>
        {progress !== undefined && (
          <div className="progress">
            <div style={{ width: `${progress}%` }} />
          </div>
        )}
        <div className="screen-body" ref={bodyRef}>
          {children}
        </div>
        {footer && <div className="screen-footer">{footer}</div>}
      </div>
    </div>
  );
}
