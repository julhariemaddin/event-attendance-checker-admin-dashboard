import { useCallback, useRef, useState } from 'react';

// Direct port of the original toast(msg, kind) + #toastWrap behavior:
// each toast auto-removes after 4200ms, kind is 'ok' | 'err' | 'warn' | undefined.
export function useToasts() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const toast = useCallback((msg, kind) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, msg, kind }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  return { toasts, toast };
}

export function ToastWrap({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map((t) => (
        <div key={t.id} className={'toast' + (t.kind ? ' ' + t.kind : '')}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
