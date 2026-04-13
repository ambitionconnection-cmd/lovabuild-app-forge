import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'flyaf_session_id';
const SESSION_FIRST_SEEN_KEY = 'flyaf_session_first_seen';

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function getSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    localStorage.setItem(SESSION_KEY, sessionId);
    localStorage.setItem(SESSION_FIRST_SEEN_KEY, new Date().toISOString());
  }
  return sessionId;
}

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) return 'mobile';
  if (/Tablet|iPad/i.test(ua)) return 'tablet';
  return 'desktop';
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('OPR') || ua.includes('Opera')) return 'Opera';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  return 'Other';
}

function getCountryFromTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const tzCountryMap: Record<string, string> = {
      'America/New_York': 'US', 'America/Chicago': 'US', 'America/Denver': 'US',
      'America/Los_Angeles': 'US', 'America/Phoenix': 'US', 'America/Anchorage': 'US',
      'Pacific/Honolulu': 'US', 'America/Toronto': 'CA', 'America/Vancouver': 'CA',
      'America/Montreal': 'CA', 'Europe/London': 'GB', 'Europe/Paris': 'FR',
      'Europe/Berlin': 'DE', 'Europe/Madrid': 'ES', 'Europe/Rome': 'IT',
      'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Zurich': 'CH',
      'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO', 'Europe/Copenhagen': 'DK',
      'Europe/Helsinki': 'FI', 'Europe/Vienna': 'AT', 'Europe/Warsaw': 'PL',
      'Europe/Prague': 'CZ', 'Europe/Budapest': 'HU', 'Europe/Bucharest': 'RO',
      'Europe/Athens': 'GR', 'Europe/Istanbul': 'TR', 'Europe/Moscow': 'RU',
      'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Shanghai': 'CN',
      'Asia/Hong_Kong': 'HK', 'Asia/Taipei': 'TW', 'Asia/Singapore': 'SG',
      'Asia/Bangkok': 'TH', 'Asia/Jakarta': 'ID', 'Asia/Kolkata': 'IN',
      'Asia/Dubai': 'AE', 'Asia/Riyadh': 'SA', 'Asia/Manila': 'PH',
      'Asia/Kuala_Lumpur': 'MY', 'Asia/Ho_Chi_Minh': 'VN',
      'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Perth': 'AU',
      'Pacific/Auckland': 'NZ', 'America/Sao_Paulo': 'BR', 'America/Mexico_City': 'MX',
      'America/Argentina/Buenos_Aires': 'AR', 'America/Bogota': 'CO',
      'America/Lima': 'PE', 'America/Santiago': 'CL',
      'Africa/Cairo': 'EG', 'Africa/Lagos': 'NG', 'Africa/Johannesburg': 'ZA',
      'Africa/Nairobi': 'KE', 'Africa/Casablanca': 'MA',
    };
    return tzCountryMap[tz] || tz.split('/')[0] || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

function getReferrer(): string {
  try {
    const ref = document.referrer;
    if (!ref) return 'direct';
    const url = new URL(ref);
    if (url.hostname.includes('instagram')) return 'instagram';
    if (url.hostname.includes('tiktok')) return 'tiktok';
    if (url.hostname.includes('google')) return 'google';
    if (url.hostname.includes('facebook') || url.hostname.includes('fb.')) return 'facebook';
    if (url.hostname.includes('twitter') || url.hostname.includes('x.com')) return 'twitter';
    if (url.hostname.includes('reddit')) return 'reddit';
    if (url.hostname.includes('youtube')) return 'youtube';
    return url.hostname;
  } catch {
    return 'direct';
  }
}

function getAuthInfo(): { isAuthenticated: boolean; userId: string | null } {
  try {
    const storageKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (storageKey) {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        const userId = parsed?.user?.id;
        if (userId) return { isAuthenticated: true, userId };
      }
    }
  } catch {}
  return { isAuthenticated: false, userId: null };
}

/** Fire-and-forget: initialise or update the session row */
export function initSession(): void {
  try {
    const sessionId = getSessionId();
    const { isAuthenticated, userId } = getAuthInfo();

    supabase.from('visitor_sessions').upsert({
      session_id: sessionId,
      last_seen: new Date().toISOString(),
      device_type: getDeviceType(),
      browser: getBrowser(),
      country: getCountryFromTimezone(),
      referrer: getReferrer(),
      is_authenticated: isAuthenticated,
      user_id: userId,
    }, { onConflict: 'session_id' }).then(() => {}).catch(() => {});
  } catch {}
}

/** Track a page view */
export function trackPageView(pageName: string): void {
  try {
    const sessionId = getSessionId();
    const { isAuthenticated, userId } = getAuthInfo();

    supabase.from('page_views').insert({
      session_id: sessionId,
      page_name: pageName,
      is_authenticated: isAuthenticated,
      user_id: userId,
    }).then(() => {}).catch(() => {});

    // Bump page_count on session
    supabase.from('visitor_sessions')
      .update({ last_seen: new Date().toISOString(), page_count: undefined })
      .eq('session_id', sessionId)
      .then(() => {}).catch(() => {});

    // Increment page_count via raw SQL isn't possible, so we do a select + update
    supabase.from('visitor_sessions')
      .select('page_count')
      .eq('session_id', sessionId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          supabase.from('visitor_sessions')
            .update({ page_count: (data.page_count || 0) + 1, last_seen: new Date().toISOString() })
            .eq('session_id', sessionId)
            .then(() => {}).catch(() => {});
        }
      }).catch(() => {});
  } catch {}
}

/** Track a conversion funnel event */
export function trackEvent(eventName: string, metadata: Record<string, any> = {}): void {
  try {
    const sessionId = getSessionId();
    const { isAuthenticated, userId } = getAuthInfo();

    supabase.from('app_events').insert({
      session_id: sessionId,
      event_name: eventName,
      is_authenticated: isAuthenticated,
      user_id: userId,
      metadata,
    }).then(() => {}).catch(() => {});
  } catch {}
}
