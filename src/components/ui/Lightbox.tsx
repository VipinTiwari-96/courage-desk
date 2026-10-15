import { useEffect } from 'react';

interface Props {
  src: string | null;
  images?: string[];   // full list for prev/next navigation
  onClose: () => void;
  onNavigate?: (src: string) => void;
}

export function Lightbox({ src, images, onClose, onNavigate }: Props) {
  if (!src) return null;

  const list = images && images.length > 1 ? images : null;
  const idx   = list ? list.indexOf(src) : -1;
  const hasPrev = list && idx > 0;
  const hasNext = list && idx < list.length - 1;

  const goPrev = () => { if (hasPrev && onNavigate) onNavigate(list![idx - 1]); };
  const goNext = () => { if (hasNext && onNavigate) onNavigate(list![idx + 1]); };

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft')  goPrev();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'Escape')     onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [src, list, idx]);

  const navBtn = (onClick: () => void, label: string, side: 'left' | 'right', disabled: boolean) => (
    <button
      onClick={e => { e.stopPropagation(); onClick(); }}
      disabled={disabled}
      title={label}
      style={{
        position: 'fixed',
        top: '50%',
        [side]: 20,
        transform: 'translateY(-50%)',
        background: disabled ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.18)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '50%',
        width: 44, height: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: disabled ? 'rgba(255,255,255,0.25)' : 'white',
        fontSize: 20,
        cursor: disabled ? 'default' : 'pointer',
        backdropFilter: 'blur(6px)',
        transition: 'background 0.15s',
        zIndex: 9001,
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.3)'; }}
      onMouseLeave={e => { if (!disabled) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.18)'; }}
    >
      {side === 'left' ? '‹' : '›'}
    </button>
  );

  return (
    <div className="lightbox" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>✕</button>

      {/* Prev / Next buttons */}
      {list && navBtn(goPrev, 'Previous', 'left',  !hasPrev)}
      {list && navBtn(goNext, 'Next',     'right', !hasNext)}

      {/* Counter */}
      {list && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.6)', color: 'white', borderRadius: 20,
          padding: '5px 14px', fontSize: 13, backdropFilter: 'blur(6px)',
          zIndex: 9001, letterSpacing: '0.5px',
        }}>
          {idx + 1} / {list.length}
        </div>
      )}

      <img src={src} alt="Screenshot" onClick={e => e.stopPropagation()} />
    </div>
  );
}
