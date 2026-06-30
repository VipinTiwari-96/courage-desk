interface Props {
  open: boolean;
  message: string;
  okLabel?: string;
  onResolve: (value: boolean) => void;
}

export function ConfirmDialog({ open, message, okLabel = 'Delete', onResolve }: Props) {
  if (!open) return null;
  return (
    <div className="confirm-overlay" onClick={() => onResolve(false)}>
      <div className="confirm-box" onClick={e => e.stopPropagation()}>
        <div className="confirm-icon">⚠️</div>
        <div className="confirm-msg">{message}</div>
        <div className="confirm-btns">
          <button className="btn btn-ghost" onClick={() => onResolve(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={() => onResolve(true)}>{okLabel}</button>
        </div>
      </div>
    </div>
  );
}
