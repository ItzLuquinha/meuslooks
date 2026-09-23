"use client";

import type { ReactNode } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const TRANSITION_MS = 220;

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const lastPathRef = useRef(pathname);
  const lastChildrenRef = useRef<ReactNode>(children);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [outgoing, setOutgoing] = useState<ReactNode | null>(null);
  const [transitionId, setTransitionId] = useState(0);

  useLayoutEffect(() => {
    if (lastPathRef.current === pathname) {
      lastChildrenRef.current = children;
      return;
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const previousChildren = lastChildrenRef.current;

    lastPathRef.current = pathname;
    lastChildrenRef.current = children;

    if (timerRef.current) clearTimeout(timerRef.current);

    if (reducedMotion) {
      setOutgoing(null);
      return;
    }

    setOutgoing(previousChildren);
    setTransitionId((value) => value + 1);

    timerRef.current = setTimeout(() => {
      setOutgoing(null);
      timerRef.current = null;
    }, TRANSITION_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pathname, children]);

  return (
    <div className={`page-transition-stage ${outgoing ? 'page-transition-active' : ''}`}>
      <div key={transitionId} className="page-transition-current">
        {children}
      </div>
      {outgoing && (
        <div key={`outgoing-${transitionId}`} className="page-transition-outgoing" aria-hidden="true">
          {outgoing}
        </div>
      )}
    </div>
  );
}
