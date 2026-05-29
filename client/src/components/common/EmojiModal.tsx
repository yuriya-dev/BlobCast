'use client';

import React, { useEffect, useRef } from 'react';

interface EmojiModalProps {
  visible: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement>;
  className?: string;
  children: React.ReactNode;
}

export function EmojiModal({ visible, onClose, triggerRef, className = '', children }: EmojiModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!visible) return;

    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (modalRef.current && modalRef.current.contains(target)) return;
      if (triggerRef && triggerRef.current && triggerRef.current.contains(target)) return;
      onClose();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', onDocMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [visible, onClose, triggerRef]);

  if (!visible) return null;

  return (
    <div ref={modalRef} className={`absolute ${className}`}>
      {children}
    </div>
  );
}

export default EmojiModal;
