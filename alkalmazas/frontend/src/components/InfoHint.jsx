import { useEffect, useRef, useState } from 'react';

export function InfoHint({ title = 'Magyarázat', text }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <span className="info-hint" ref={ref}>
      <button type="button" className="info-hint__button" onClick={() => setOpen((value) => !value)} aria-label={title}>
        i
      </button>
      {open ? (
        <span className="info-hint__panel" role="dialog" aria-label={title}>
          <strong>{title}</strong>
          <span>{text}</span>
        </span>
      ) : null}
    </span>
  );
}
