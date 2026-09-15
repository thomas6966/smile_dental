import { useEffect } from 'react';
import { CircleAlert, CircleCheck } from 'lucide-react';

export default function Toast({ message, type = 'info', onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 2800);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className={`toast ${type}`} role="status">
      {type === 'error' && <CircleAlert size={18} />}
      {type === 'success' && <CircleCheck size={18} />}
      <span>{message}</span>
    </div>
  );
}
