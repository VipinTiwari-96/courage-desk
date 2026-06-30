interface Props { src: string | null; onClose: () => void; }

export function Lightbox({ src, onClose }: Props) {
  if (!src) return null;
  return (
    <div className="lightbox" onClick={onClose}>
      <button className="lightbox-close" onClick={onClose}>✕</button>
      <img src={src} alt="Screenshot" onClick={e => e.stopPropagation()} />
    </div>
  );
}
