import { useEffect, useRef, useState } from 'react';

export default function AnimatedCounter({ value, duration = 700, suffix = '' }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  const numeric = typeof value === 'number' ? value : Number(value) || 0;

  useEffect(() => {
    const start = prev.current;
    const end = numeric;
    const startTime = performance.now();
    let frame;

    const tick = (now) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
      else prev.current = end;
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [numeric, duration]);

  return (
    <span>
      {display}
      {suffix}
    </span>
  );
}
