import { supabase } from "@/integrations/supabase/client";

const PROMOTER_REF_KEY = "flyaf_promoter_ref";
const PROMOTER_SESSION_KEY = "flyaf_promoter_session_id";
const PROMOTER_VISIT_KEY = "flyaf_promoter_visit_id";
const PROMOTER_LANDED_AT_KEY = "flyaf_promoter_landed_at";

function newSessionId(): string {
  return `pr-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function getPromoterSessionId(): string {
  let id = localStorage.getItem(PROMOTER_SESSION_KEY);
  if (!id) {
    id = newSessionId();
    localStorage.setItem(PROMOTER_SESSION_KEY, id);
  }
  return id;
}

export function setActivePromoter(code: string, visitId: string) {
  localStorage.setItem(PROMOTER_REF_KEY, code);
  localStorage.setItem(PROMOTER_VISIT_KEY, visitId);
  localStorage.setItem(PROMOTER_LANDED_AT_KEY, String(Date.now()));
}

export function getActivePromoter(): { code: string | null; visitId: string | null; landedAt: number } {
  return {
    code: localStorage.getItem(PROMOTER_REF_KEY),
    visitId: localStorage.getItem(PROMOTER_VISIT_KEY),
    landedAt: Number(localStorage.getItem(PROMOTER_LANDED_AT_KEY) || 0),
  };
}

export function clearActivePromoter() {
  localStorage.removeItem(PROMOTER_REF_KEY);
  localStorage.removeItem(PROMOTER_VISIT_KEY);
  localStorage.removeItem(PROMOTER_LANDED_AT_KEY);
}

async function call(action: string, body: Record<string, unknown>) {
  return supabase.functions.invoke("record-promoter-visit", { body: { action, ...body } });
}

export async function recordPromoterVisit(code: string): Promise<string | null> {
  const session_id = getPromoterSessionId();
  const { data, error } = await call("visit", { code, session_id });
  if (error) { console.warn("promoter visit error", error); return null; }
  const visitId = (data as any)?.visit_id || null;
  if (visitId) setActivePromoter(code, visitId);
  return visitId;
}

export async function qualifyPromoterVisit(code: string, elapsedMs: number) {
  const session_id = getPromoterSessionId();
  await call("qualify", { code, session_id, elapsed_ms: elapsedMs }).catch(() => {});
}

/** Use sendBeacon so it fires even on unload */
export function beaconQualify(code: string, elapsedMs: number) {
  try {
    const session_id = getPromoterSessionId();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/record-promoter-visit`;
    const payload = JSON.stringify({ action: "qualify", code, session_id, elapsed_ms: elapsedMs });
    const blob = new Blob([payload], { type: "application/json" });
    navigator.sendBeacon(url, blob);
  } catch {}
}

export async function creditPromoterSignin(userId: string) {
  const { code } = getActivePromoter();
  if (!code) return;
  const session_id = getPromoterSessionId();
  await call("signin", { code, session_id, user_id: userId }).catch(() => {});
  // Don't clear — let it persist so /ref redirects work for repeat opens
}
