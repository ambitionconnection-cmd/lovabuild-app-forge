import { useEffect } from 'react';
import { trackPageView } from '@/lib/analytics';

/**
 * Track page view on mount. Call once per page component.
 */
export function usePageTracking(pageName: string): void {
  useEffect(() => {
    trackPageView(pageName);
  }, [pageName]);
}
