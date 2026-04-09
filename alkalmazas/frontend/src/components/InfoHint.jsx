import { useEffect, useRef, useState } from 'react';

export function InfoHint({ title = 'Magyarázat', text }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <span className="info-hint" ref={ref}>
      <button
        type="button"
        className="info-hint__button"
        onClick={() => setOpen((v) => !v)}
        aria-label={title}
        aria-expanded={open}
      >
        i
      </button>
      {open ? (
        <span className="info-hint__panel" role="tooltip" aria-label={title}>
          <strong>{title}</strong>
          <span>{text}</span>
        </span>
      ) : null}
    </span>
  );
}
