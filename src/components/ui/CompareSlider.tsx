import { useRef, useState } from 'react';

interface Props { before: string; after: string; }

export function CompareSlider({ before, after }: Props) {
  const [pos, setPos] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updatePos = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPos((x / rect.width) * 100);
  };

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', height: 300, borderRadius: 'var(--radius)', overflow: 'hidden', userSelect: 'none', cursor: 'ew-resize' }}
      onMouseDown={e => { dragging.current = true; updatePos(e.clientX); }}
      onMouseMove={e => { if (dragging.current) updatePos(e.clientX); }}
      onMouseUp={() => { dragging.current = false; }}
      onMouseLeave={() => { dragging.current = false; }}
      onTouchMove={e => updatePos(e.touches[0].clientX)}
    >
      {/* After (full width, background) */}
      <img src={after} alt="After" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />

      {/* Before (clipped) */}
      <div style={{ position: 'absolute', inset: 0, width: `${pos}%`, overflow: 'hidden' }}>
        <img src={before} alt="Before" style={{ position: 'absolute', top: 0, left: 0, width: containerRef.current?.offsetWidth ?? 800, height: '100%', objectFit: 'cover' }} />
      </div>

      {/* Handle */}
      <div style={{ position: 'absolute', top: 0, left: `${pos}%`, width: 3, height: '100%', background: 'white', transform: 'translateX(-50%)', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: 'white', color: '#111', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>⟺</div>
      </div>

      {/* Labels */}
      <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 11, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 8px', borderRadius: 4 }}>Before</div>
      <div style={{ position: 'absolute', bottom: 8, right: 10, fontSize: 11, background: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 8px', borderRadius: 4 }}>After</div>
    </div>
  );
}
