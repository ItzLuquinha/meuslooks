"use client";

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

type DebugRecordKind = 'page' | 'api' | 'interaction' | 'error' | 'metric' | 'resource' | 'network';

type DebugRecord = {
  id: string;
  kind: DebugRecordKind;
  timestamp: number;
  path: string;
  data: Record<string, string | number | boolean | null>;
};

type DebugStorage = {
  version: 1;
  records: DebugRecord[];
};

type ExtendedPerformance = Performance & {
  memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number };
};

type ExtendedNavigator = Navigator & {
  connection?: { effectiveType?: string; downlink?: number; rtt?: number; saveData?: boolean };
};

const STORAGE_KEY = 'meu_look_debug_records';
const ENABLE_KEY = 'meu_look_debug';
const MAX_RECORDS = 600;
const routeStarts = new Map<string, number>();

function readEnabled() {
  try {
    return window.localStorage.getItem(ENABLE_KEY) === '1';
  } catch {
    return false;
  }
}

function readStore(): DebugStorage {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, records: [] };
    const parsed = JSON.parse(raw) as Partial<DebugStorage>;
    return { version: 1, records: Array.isArray(parsed.records) ? parsed.records.slice(-MAX_RECORDS) : [] };
  } catch {
    return { version: 1, records: [] };
  }
}

function writeRecord(record: DebugRecord) {
  try {
    const store = readStore();
    store.records.push(record);
    store.records = store.records.slice(-MAX_RECORDS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent('meu-look-debug-record'));
  } catch {
    // Debug tooling must never break the app.
  }
}

function labelForElement(element: Element) {
  const aria = element.getAttribute('aria-label')?.trim();
  if (aria) return aria;
  const title = element.getAttribute('title')?.trim();
  if (title) return title;
  const text = (element.textContent || '').replace(/\s+/g, ' ').trim();
  return text.slice(0, 90) || element.tagName.toLowerCase();
}

function pathForElement(element: Element) {
  const anchor = element.closest('a');
  if (anchor instanceof HTMLAnchorElement) {
    return anchor.getAttribute('href') || '';
  }
  return '';
}

function recordPageLoad(pathname: string) {
  const entry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (!entry) return;
  writeRecord({
    id: crypto.randomUUID(),
    kind: 'page',
    timestamp: Date.now(),
    path: pathname,
    data: {
      mode: 'full-load',
      total_ms: Math.round(entry.loadEventEnd || entry.domComplete || entry.duration),
      dom_content_ms: Math.round(entry.domContentLoadedEventEnd || 0),
      response_ms: Math.round(Math.max(0, entry.responseEnd - entry.startTime)),
      transfer_ms: Math.round(Math.max(0, entry.responseEnd - entry.responseStart)),
    },
  });
}

export default function DebugProbe() {
  const pathname = usePathname();
  const initialLoadRecordedRef = useRef(false);

  useEffect(() => {
    let enabled = readEnabled();
    let disposed = false;
    let cleanup: (() => void) | undefined;
    const start = () => {
      if (disposed || !enabled || cleanup) return;

      const originalFetch = window.fetch.bind(window);
      const originalPushState = history.pushState.bind(history);
      const originalReplaceState = history.replaceState.bind(history);
      let interactionCounter = 0;
      let activeInteraction: { id: string; expiresAt: number } | null = null;

      const onClick = (event: MouseEvent) => {
        const target = event.target;
        if (!(target instanceof Element)) return;
        const actionable = target.closest('button, a, [role="button"], input[type="submit"], input[type="button"]');
        if (!actionable) return;

        const id = `${Date.now()}-${++interactionCounter}`;
        const started = performance.now();
        activeInteraction = { id, expiresAt: started + 1800 };
        writeRecord({
          id,
          kind: 'interaction',
          timestamp: Date.now(),
          path: window.location.pathname,
          data: {
            label: labelForElement(actionable),
            element: actionable.tagName.toLowerCase(),
            target_path: pathForElement(actionable),
            ui_ms: null,
            request_ms: null,
            status: 'started',
          },
        });
        requestAnimationFrame(() => {
          const duration = performance.now() - started;
          writeRecord({
            id: `${id}-ui`,
            kind: 'interaction',
            timestamp: Date.now(),
            path: window.location.pathname,
            data: {
              interaction_id: id,
              label: labelForElement(actionable),
              element: actionable.tagName.toLowerCase(),
              target_path: pathForElement(actionable),
              ui_ms: Math.round(duration * 10) / 10,
              status: 'ui-response',
            },
          });
        });
      };

      const scheduleRoute = (url: string | URL | null) => {
        try {
          const next = new URL(String(url), window.location.href);
          if (next.origin !== window.location.origin || next.pathname === window.location.pathname) return;
          routeStarts.set(next.pathname, performance.now());
        } catch {
          // Ignore malformed navigation targets.
        }
      };

      history.pushState = function pushState(state, unused, url) {
        scheduleRoute(url);
        return originalPushState(state, unused, url);
      };
      history.replaceState = function replaceState(state, unused, url) {
        return originalReplaceState(state, unused, url);
      };

      const onPopState = () => {
        routeStarts.set(window.location.pathname, performance.now());
      };

      window.fetch = async (input, init) => {
        const started = performance.now();
        const url = input instanceof Request ? input.url : String(input);
        const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
        const interactionId = activeInteraction && activeInteraction.expiresAt > started ? activeInteraction.id : null;
        try {
          const response = await originalFetch(input, init);
          writeRecord({
            id: crypto.randomUUID(),
            kind: 'api',
            timestamp: Date.now(),
            path: window.location.pathname,
            data: {
              url: url.startsWith(window.location.origin) ? url.slice(window.location.origin.length) : url,
              method,
              duration_ms: Math.round((performance.now() - started) * 10) / 10,
              status: response.status,
              ok: response.ok,
              interaction_id: interactionId,
            },
          });
          return response;
        } catch (error) {
          writeRecord({
            id: crypto.randomUUID(),
            kind: 'api',
            timestamp: Date.now(),
            path: window.location.pathname,
            data: {
              url: url.startsWith(window.location.origin) ? url.slice(window.location.origin.length) : url,
              method,
              duration_ms: Math.round((performance.now() - started) * 10) / 10,
              status: 0,
              ok: false,
              interaction_id: interactionId,
              error: error instanceof Error ? error.message : 'Network error',
            },
          });
          throw error;
        }
      };

      const onError = (event: ErrorEvent) => {
        writeRecord({
          id: crypto.randomUUID(),
          kind: 'error',
          timestamp: Date.now(),
          path: window.location.pathname,
          data: { message: event.message || 'JavaScript error', source: event.filename || null, line: event.lineno || null },
        });
      };
      const onUnhandledRejection = (event: PromiseRejectionEvent) => {
        const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
        writeRecord({ id: crypto.randomUUID(), kind: 'error', timestamp: Date.now(), path: window.location.pathname, data: { message: reason, source: 'unhandledrejection' } });
      };
      const onOnline = () => writeRecord({ id: crypto.randomUUID(), kind: 'network', timestamp: Date.now(), path: window.location.pathname, data: { online: true } });
      const onOffline = () => writeRecord({ id: crypto.randomUUID(), kind: 'network', timestamp: Date.now(), path: window.location.pathname, data: { online: false } });

      document.addEventListener('click', onClick, true);
      window.addEventListener('popstate', onPopState);
      window.addEventListener('error', onError);
      window.addEventListener('unhandledrejection', onUnhandledRejection);
      window.addEventListener('online', onOnline);
      window.addEventListener('offline', onOffline);

      const observers: PerformanceObserver[] = [];
      const addObserver = (type: string, handler: (entry: PerformanceEntry) => void, buffered = true) => {
        try {
          const observer = new PerformanceObserver((list) => list.getEntries().forEach(handler));
          observer.observe({ type, buffered });
          observers.push(observer);
        } catch {
          // Browser does not support this entry type.
        }
      };

      addObserver('longtask', (entry) => {
        writeRecord({ id: crypto.randomUUID(), kind: 'metric', timestamp: Date.now(), path: window.location.pathname, data: { metric: 'longtask', duration_ms: Math.round(entry.duration * 10) / 10 } });
      });
      addObserver('largest-contentful-paint', (entry) => {
        writeRecord({ id: crypto.randomUUID(), kind: 'metric', timestamp: Date.now(), path: window.location.pathname, data: { metric: 'lcp_ms', value_ms: Math.round(entry.startTime * 10) / 10 } });
      });
      addObserver('layout-shift', (entry) => {
        const value = (entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean }).value || 0;
        const hadRecentInput = Boolean((entry as PerformanceEntry & { hadRecentInput?: boolean }).hadRecentInput);
        if (!hadRecentInput) writeRecord({ id: crypto.randomUUID(), kind: 'metric', timestamp: Date.now(), path: window.location.pathname, data: { metric: 'cls_shift', value } });
      });

      const initialViewport = () => {
        const p = window.performance as ExtendedPerformance;
        const n = navigator as ExtendedNavigator;
        const connection = n.connection;
        writeRecord({
          id: crypto.randomUUID(),
          kind: 'network',
          timestamp: Date.now(),
          path: window.location.pathname,
          data: {
            online: navigator.onLine,
            effective_type: connection?.effectiveType || null,
            rtt_ms: connection?.rtt ?? null,
            downlink_mbps: connection?.downlink ?? null,
            save_data: connection?.saveData ?? null,
            viewport_width: window.innerWidth,
            viewport_height: window.innerHeight,
            dpr: window.devicePixelRatio,
            js_heap_used_mb: p.memory?.usedJSHeapSize ? Math.round((p.memory.usedJSHeapSize / 1048576) * 10) / 10 : null,
          },
        });
      };

      initialViewport();
      const initialTimer = initialLoadRecordedRef.current ? null : window.setTimeout(() => {
        recordPageLoad(window.location.pathname);
        initialLoadRecordedRef.current = true;
      }, 1200);
      const resourceTimer = window.setTimeout(() => {
        const slow = performance.getEntriesByType('resource')
          .map((entry) => entry as PerformanceResourceTiming)
          .filter((entry) => entry.name && !entry.name.startsWith('data:'))
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 12);
        slow.forEach((entry) => writeRecord({
          id: crypto.randomUUID(),
          kind: 'resource',
          timestamp: Date.now(),
          path: window.location.pathname,
          data: {
            url: entry.name.startsWith(window.location.origin) ? entry.name.slice(window.location.origin.length) : entry.name,
            duration_ms: Math.round(entry.duration * 10) / 10,
            transfer_kb: entry.transferSize ? Math.round((entry.transferSize / 1024) * 10) / 10 : null,
            type: entry.initiatorType,
          },
        }));
      }, 1600);

      cleanup = () => {
        window.fetch = originalFetch;
        history.pushState = originalPushState;
        history.replaceState = originalReplaceState;
        document.removeEventListener('click', onClick, true);
        window.removeEventListener('popstate', onPopState);
        window.removeEventListener('error', onError);
        window.removeEventListener('unhandledrejection', onUnhandledRejection);
        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
        observers.forEach((observer) => observer.disconnect());
        if (initialTimer !== null) window.clearTimeout(initialTimer);
        window.clearTimeout(resourceTimer);
        cleanup = undefined;
      };
    };

    const stop = () => {
      cleanup?.();
    };

    const toggle = () => {
      enabled = readEnabled();
      if (enabled) start();
      else stop();
    };

    window.addEventListener('meu-look-debug-toggle', toggle);
    start();

    return () => {
      disposed = true;
      window.removeEventListener('meu-look-debug-toggle', toggle);
      stop();
    };
  }, [pathname]);

  useEffect(() => {
    if (!readEnabled()) return;
    const record = pendingRouteRefForPath(pathname);
    if (!record) return;
    writeRecord({
      id: crypto.randomUUID(),
      kind: 'page',
      timestamp: Date.now(),
      path: pathname,
      data: { mode: 'client-navigation', total_ms: record },
    });
  }, [pathname]);

  return null;
}

function pendingRouteRefForPath(pathname: string) {
  const started = routeStarts.get(pathname);
  if (started === undefined) return null;
  routeStarts.delete(pathname);
  return Math.round((performance.now() - started) * 10) / 10;
}
