import { useEffect, useRef } from "react";

export function useModalAutoFocus<T extends HTMLElement>(isOpen: boolean) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!isOpen) return;

    const timer = window.setTimeout(() => ref.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  return ref;
}
