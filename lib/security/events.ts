import { useEffect } from 'react';

export type SecurityEventType = 'critical-vulnerability' | 'manual-revoke';

export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: number;
  details?: any;
}

const SECURITY_EVENT_NAME = 'trellis-security-event';

/**
 * Dispatches a security event across the application.
 */
export function dispatchSecurityEvent(
  type: SecurityEventType,
  details?: any
): void {
  const event = new CustomEvent<SecurityEvent>(SECURITY_EVENT_NAME, {
    detail: {
      type,
      timestamp: Date.now(),
      details,
    },
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(event);
  }
}

/**
 * Hook to subscribe to security events.
 */
import { useRef } from 'react';

export function useSecurityEventSubscription(
  callback: (event: SecurityEvent) => void
): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (e: Event) => {
      const customEvent = e as CustomEvent<SecurityEvent>;
      if (customEvent.detail) {
        savedCallback.current(customEvent.detail);
      }
    };

    window.addEventListener(SECURITY_EVENT_NAME, handler);
    return () => {
      window.removeEventListener(SECURITY_EVENT_NAME, handler);
    };
  }, []);
}
