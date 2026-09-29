import { useEffect } from 'react';

type Props = {
  active: boolean;
  onComplete: () => void;
};

export function BloodFlowTransition({ active, onComplete }: Props) {
  useEffect(() => {
    if (!active) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced ? 300 : 2000;
    const id = window.setTimeout(onComplete, duration);
    return () => window.clearTimeout(id);
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[60] bg-[radial-gradient(circle_at_50%_50%,rgba(127,29,29,0.95)_0%,rgba(11,12,16,0.98)_70%)]"
      aria-hidden
    />
  );
}
