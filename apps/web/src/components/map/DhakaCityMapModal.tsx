import { useEffect } from 'react';
import type { Lang } from '@/types/api';
import { DhakaCityMapEmbed } from '@/components/map/DhakaCityMapEmbed';

type Props = {
  open: boolean;
  lang: Lang;
  onRequestClose: () => void;
};

export function DhakaCityMapModal({ open, lang, onRequestClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onRequestClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onRequestClose]);

  if (!open) return null;

  const title = lang === 'bn' ? 'ঢাকা শহর (জেলা)' : 'Dhaka city (district)';
  const hint =
    lang === 'bn'
      ? 'ইউনিয়নে হোভার — নাম ও DNCC ওয়ার্ড। Esc বন্ধ।'
      : 'Hover unions — name and DNCC ward. Esc to close.';

  return (
    <div
      className="lk-dhaka-modal-backdrop"
      role="presentation"
      onClick={onRequestClose}
    >
      <div
        className="lk-dhaka-modal lk-dhaka-modal--map"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="lk-dhaka-modal__header">
          <div>
            <h2 className="lk-dhaka-modal__title">{title}</h2>
            <p className="lk-dhaka-modal__hint">{hint}</p>
          </div>
          <button
            type="button"
            className="lk-dhaka-modal__close"
            onClick={onRequestClose}
            aria-label={lang === 'bn' ? 'বন্ধ' : 'Close'}
          >
            ×
          </button>
        </header>
        <div className="lk-dhaka-modal__body lk-dhaka-modal__body--map">
          <DhakaCityMapEmbed lang={lang} />
        </div>
      </div>
    </div>
  );
}
