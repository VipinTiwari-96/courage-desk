import { useState, useCallback, useRef } from 'react';

export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [okLabel, setOkLabel] = useState('Delete');
  const resolveRef = useRef<(value: boolean) => void>(() => {});

  const confirm = useCallback((msg: string, label = 'Delete'): Promise<boolean> => {
    setMessage(msg);
    setOkLabel(label);
    setOpen(true);
    return new Promise(resolve => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleResolve = (value: boolean) => {
    setOpen(false);
    resolveRef.current(value);
  };

  return { open, message, okLabel, confirm, handleResolve };
}
