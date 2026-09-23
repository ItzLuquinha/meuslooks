"use client";

import type { ReactNode } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const TRANSITION_MS = 240;

type Phase = 'idle' | 'prepare' | 'running';

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const pendingContentRef = useRef<ReactNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<number | null>(null);
  const [currentContent, setCurrentContent] = useState<ReactNode>(children);
  const [incomingContent, setIncomingContent] = useState<ReactNode | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');

  useLayoutEffect(() => {
    if (pathnameRef.current === pathname) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    pathnameRef.current = pathname;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    pendingContentRef.current = children;

    if (reducedMotion) {
      setCurrentContent(children);
      setIncomingContent(null);
      setPhase('idle');
      pendingContentRef.current = null;
      return;
    }

    setIncomingContent(children);
    setPhase('prepare');

    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = requestAnimationFrame(() => {
        frameRef.current = null;
        setPhase('running');

        timerRef.current = setTimeout(() => {
          const nextContent = pendingContentRef.current;
          if (nextContent !== null) {
            setCurrentContent(nextContent);
          }
          pendingContentRef.current = null;
          setIncomingContent(null);
          setPhase('idle');
          timerRef.current = null;
        }, TRANSITION_MS);
      });
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [pathname, children]);

  return (
    <div className={`page-transition-stage page-transition-${phase}`}>
      <div className="page-transition-current">{currentContent}</div>
      {incomingContent !== null && (
        <div className="page-transition-incoming" aria-hidden="true">
          {incomingContent}
        </div>
      )}
    </div>
  );
}
