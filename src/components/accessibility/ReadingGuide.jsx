import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default function ReadingGuide({ position }) {
  const guide = useRef(null);
  useEffect(() => {
    let frame;
    let pointerY = null;
    const draw = () => {
      const main = document.querySelector('.app-content');
      if (!main || !guide.current) return;
      const rect = main.getBoundingClientRect();
      const top = Math.max(0, rect.top), bottom = Math.min(innerHeight, rect.bottom);
      const height = Math.min(48, Math.max(0, bottom - top));
      const center = pointerY ?? top + (bottom - top) * position / 100;
      Object.assign(guide.current.style, { left: `${Math.max(0, rect.left)}px`, width: `${Math.max(0, Math.min(innerWidth, rect.right) - Math.max(0, rect.left))}px`, top: `${Math.max(top, Math.min(bottom - height, center - height / 2))}px`, height: `${height}px` });
    };
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(draw); };
    const pointer = (event) => {
      if (event.pointerType === 'touch' || !event.target.closest?.('.app-content')) return;
      pointerY = event.clientY; schedule();
    };
    const focus = (event) => {
      if (!event.target.closest?.('.app-content')) return;
      const rect = event.target.getBoundingClientRect();
      pointerY = rect.top + rect.height / 2; schedule();
    };
    const observer = new ResizeObserver(schedule);
    const main = document.querySelector('.app-content');
    if (main) observer.observe(main);
    schedule();
    document.addEventListener('pointermove', pointer, { passive: true });
    document.addEventListener('focusin', focus);
    window.addEventListener('resize', schedule);
    document.addEventListener('scroll', schedule, true);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect();
      document.removeEventListener('pointermove', pointer);
      document.removeEventListener('focusin', focus);
      window.removeEventListener('resize', schedule);
      document.removeEventListener('scroll', schedule, true);
    };
  }, [position]);
  return createPortal(<div ref={guide} aria-hidden="true" className="reading-guide pointer-events-none fixed z-30 border-y-2 border-primary/60 bg-primary/5" />, document.body);
}