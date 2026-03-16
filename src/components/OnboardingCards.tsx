/**
 * FLYAF Onboarding Cards (Rewritten)
 * ─────────────────────────────────────────────────────────────────────
 * 5 swipeable intro cards shown on first launch, before the app loads.
 * Community-first tone throughout. No sales language, no Pro upsell,
 * no "buy now" hooks. Just: here's what FLYAF is, here's how it works.
 *
 * Philosophy:
 *   - Card 1: language (always first, always)
 *   - Card 2: Nearby — the map, finding shops
 *   - Card 3: Route — planning your walk
 *   - Card 4: Index — discovering brands
 *   - Card 5: HOT — the community lookbook (NOT "buy now")
 *
 * The Pro upgrade and affiliate features are discovered naturally through
 * use, not pushed in onboarding. Onboarding's only job is orientation.
 *
 * HOW TO INTEGRATE:
 *   Same as before — drop into root App.tsx:
 *   import OnboardingCards from './components/OnboardingCards';
 *   <OnboardingCards />
 *
 *   The "Full App Guide" button at the end links to /guide
 *   (the AppGuideScreen component).
 *
 * DEPENDENCIES: react-router-dom (already in your stack)
 * ─────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'en' | 'fr' | 'ja' | 'ko' | 'zh-hans' | 'zh-hant' | 'th';

// ─── Storage ──────────────────────────────────────────────────────────────────

const ONBOARD_KEY = 'flyaf_onboarded_v2';
const LANG_KEY    = 'flyaf_lang';

function isOnboarded(): boolean {
  try { return localStorage.getItem(ONBOARD_KEY) === 'true'; } catch { return false; }
}
function setOnboarded(): void {
  try { localStorage.setItem(ONBOARD_KEY, 'true'); } catch { /* ignore */ }
}

// ─── Language options ─────────────────────────────────────────────────────────

const LANGS: { code: Lang; label: string; flag: string; native: string }[] = [
  { code: 'en',      flag: '🇬🇧', label: 'English',   native: 'English'    },
  { code: 'fr',      flag: '🇫🇷', label: 'French',    native: 'Français'   },
  { code: 'ja',      flag: '🇯🇵', label: 'Japanese',  native: '日本語'      },
  { code: 'ko',      flag: '🇰🇷', label: 'Korean',    native: '한국어'      },
  { code: 'zh-hans', flag: '🇨🇳', label: 'Chinese',   native: '简体中文'   },
  { code: 'zh-hant', flag: '🇹🇼', label: 'Chinese',   native: '繁體中文'   },
  { code: 'th',      flag: '🇹🇭', label: 'Thai',      native: 'ภาษาไทย'   },
];

// ─── Card content ─────────────────────────────────────────────────────────────
// Note: Card 0 is the language selector, handled separately.
// Cards 1–4 are feature introductions.

interface CardContent {
  icon: string;         // emoji
  accentColor: string;  // hex, for icon bg and progress dot
  title: string;
  body: string;
  footnote?: string;    // smaller grey note below body
}

// All strings in English — translate via your i18n system as needed.
// Keys are used in the translations object below.
const CARD_DATA: CardContent[] = [
  {
    icon: '📍',
    accentColor: '#e05040',
    title: 'Every streetwear shop.\nOne map.',
    body: 'FLYAF maps 200+ shops across 12+ cities — London, Paris, Tokyo, NYC, and more. Each pin is a real shop with opening hours, address, and everything you need to visit.',
    footnote: 'Tap any pin to see shop details. Tap the city name to switch cities.',
  },
  {
    icon: '🗺️',
    accentColor: '#c8a068',
    title: 'Plan tonight.\nWalk tomorrow.',
    body: 'Add multiple shops to a route, reorder them with a drag, then hit Start Navigation. FLYAF hands off to Google Maps with every stop loaded — no re-entering addresses.',
    footnote: 'Build your route at home on a big screen, then walk it on your phone.',
  },
  {
    icon: '🌐',
    accentColor: '#7c3aed',
    title: '150+ brands.\nDiscover something new.',
    body: "The Index is a global directory of streetwear brands — Established names and rising New Wave labels. Most people know 20–30 brands. FLYAF helps you find the other 130.",
    footnote: 'Collections groups brands by theme: Japanese Streetwear, London Underground Labels, and more.',
  },
  {
    icon: '🔥',
    accentColor: '#e05040',
    title: 'Street style from\nthe community.',
    body: 'HOT is a lookbook posted by real people. No captions, no hashtags, no comments. Just fits. React with 🔥 if you feel it, or scroll past. Your Instagram and TikTok are on every post you make — that\'s the only conversation needed.',
    footnote: 'Tap + to post your own fit. No tagging, no effort.',
  },
];

// ─── Translations for card content (subset: title + body only) ────────────────
// The footnotes are non-essential and can stay in English.
// Add translations here if you want fully localised cards.
// For now, English is used as the fallback for all languages.
// Your developer can hook this into i18next if needed.

// ─── Component ────────────────────────────────────────────────────────────────

interface OnboardingCardsProps {
  forceShow?: boolean;
  onComplete?: () => void;
}

const OnboardingCards: React.FC<OnboardingCardsProps> = ({
  forceShow = false,
  onComplete,
}) => {
  const navigate = useNavigate();
  const [visible,  setVisible]  = useState(false);
  const [step,     setStep]     = useState<'language' | number>('language');
  const [lang,     setLang]     = useState<Lang>('en');
  const [animDir,  setAnimDir]  = useState<'in' | 'out'>('in');
  const touchStartX = useRef<number>(0);

  useEffect(() => {
    if (forceShow || !isOnboarded()) {
      const t = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(t);
    }
  }, [forceShow]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANG_KEY) as Lang | null;
      if (stored) setLang(stored);
    } catch { /* ignore */ }
  }, []);

  if (!visible) return null;

  // ── handlers ──

  const selectLang = (code: Lang) => {
    setLang(code);
    try { localStorage.setItem(LANG_KEY, code); } catch { /* ignore */ }
    // TODO: hook into your i18n: i18n.changeLanguage(code);
  };

  const advance = () => {
    setAnimDir('out');
    setTimeout(() => {
      setAnimDir('in');
      if (step === 'language') {
        setStep(0);
      } else if (typeof step === 'number' && step < CARD_DATA.length - 1) {
        setStep(step + 1);
      } else {
        complete();
      }
    }, 180);
  };

  const back = () => {
    if (step === 0) { setStep('language'); return; }
    if (typeof step === 'number' && step > 0) setStep(step - 1);
  };

  const complete = () => {
    setOnboarded();
    setVisible(false);
    onComplete?.();
  };

  const goToGuide = () => {
    setOnboarded();
    setVisible(false);
    navigate('/guide');
  };

  // Swipe support
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -50) advance();
    if (dx > 50 && step !== 'language') back();
  };

  // ── progress ──
  const totalSteps   = CARD_DATA.length;
  const currentIndex = step === 'language' ? -1 : (step as number);

  // ── shared styles ──
  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: '#000',
    display: 'flex', flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    overflow: 'hidden',
    transition: 'opacity 0.18s',
    opacity: animDir === 'out' ? 0 : 1,
  };

  const logoStyle: React.CSSProperties = {
    fontSize: 20, fontWeight: 900, fontStyle: 'italic',
    background: 'linear-gradient(90deg,#e84020,#e8a020,#e04020)',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };

  // ══════════════════════════════════════════════════════════════════
  // LANGUAGE SELECTOR CARD
  // ══════════════════════════════════════════════════════════════════
  if (step === 'language') {
    return (
      <div style={overlay} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {/* Header */}
        <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={logoStyle}>flyaf</span>
          <button
            onClick={complete}
            style={{ background: 'none', border: 'none', color: '#333', fontSize: 12, cursor: 'pointer', padding: '4px 8px' }}
          >
            Skip →
          </button>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '28px 24px 0', overflowY: 'auto' }}>
          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🌐</div>
            <div style={{ color: '#fff', fontSize: 22, fontWeight: 800, lineHeight: 1.25, marginBottom: 8 }}>
              Choose your language
            </div>
            <div style={{ color: '#555', fontSize: 14, lineHeight: 1.5, maxWidth: 280, margin: '0 auto' }}>
              FLYAF works in 8 languages. You can change this any time in More → Language.
            </div>
          </div>

          {/* Language grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 340, margin: '0 auto', width: '100%' }}>
            {LANGS.map(l => {
              const active = lang === l.code;
              return (
                <button
                  key={l.code}
                  onClick={() => selectLang(l.code)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 16px', borderRadius: 12,
                    background: active ? 'rgba(224,80,64,0.12)' : 'rgba(255,255,255,0.04)',
                    border: active ? '1.5px solid #e05040' : '1.5px solid rgba(255,255,255,0.07)',
                    cursor: 'pointer', transition: 'all 0.12s',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 20, lineHeight: 1 }}>{l.flag}</span>
                  <span style={{ color: active ? '#e05040' : '#ccc', fontSize: 14, fontWeight: active ? 700 : 400 }}>
                    {l.native}
                  </span>
                  {active && (
                    <span style={{ marginLeft: 'auto', color: '#e05040', fontSize: 14, fontWeight: 700 }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div style={{ padding: '20px 24px 36px' }}>
          <button
            onClick={advance}
            style={{
              width: '100%', padding: '16px', borderRadius: 14,
              background: '#e05040', border: 'none',
              color: '#fff', fontSize: 15, fontWeight: 800,
              letterSpacing: '0.04em', cursor: 'pointer',
            }}
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════
  // FEATURE CARDS (steps 0–3)
  // ══════════════════════════════════════════════════════════════════
  const card    = CARD_DATA[currentIndex];
  const isLast  = currentIndex === CARD_DATA.length - 1;

  // Icon background colours (subtle tinted surfaces)
  const iconBg: Record<string, string> = {
    '#e05040': 'rgba(224,80,64,0.12)',
    '#c8a068': 'rgba(200,160,104,0.12)',
    '#7c3aed': 'rgba(124,58,237,0.12)',
  };

  // Title lines (split on \n for two-line layout)
  const titleLines = card.title.split('\n');

  return (
    <div style={overlay} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {/* Header row */}
      <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={logoStyle}>flyaf</span>
        <button
          onClick={complete}
          style={{ background: 'none', border: 'none', color: '#333', fontSize: 12, cursor: 'pointer', padding: '4px 8px' }}
        >
          Skip →
        </button>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 5, padding: '18px 24px 0', justifyContent: 'center' }}>
        {CARD_DATA.map((_, i) => (
          <div
            key={i}
            style={{
              height: 3, borderRadius: 2, transition: 'all 0.2s',
              flex: i === currentIndex ? 2.5 : 1,
              background: i <= currentIndex ? card.accentColor : 'rgba(255,255,255,0.12)',
            }}
          />
        ))}
      </div>

      {/* Card body */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px 28px' }}>
        {/* Icon */}
        <div style={{ marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: iconBg[card.accentColor] ?? 'rgba(255,255,255,0.08)',
            border: `1.5px solid ${card.accentColor}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28,
          }}>
            {card.icon}
          </div>
        </div>

        {/* Title — two lines styled differently for visual weight */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ color: '#fff', fontSize: 28, fontWeight: 900, lineHeight: 1.15 }}>
            {titleLines[0]}
          </div>
          {titleLines[1] && (
            <div style={{ color: card.accentColor, fontSize: 28, fontWeight: 900, lineHeight: 1.15 }}>
              {titleLines[1]}
            </div>
          )}
        </div>

        {/* Body */}
        <div style={{ color: '#888', fontSize: 15, lineHeight: 1.65, marginBottom: 16, maxWidth: 340 }}>
          {card.body}
        </div>

        {/* Footnote */}
        {card.footnote && (
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 8, padding: '10px 12px',
            color: '#444', fontSize: 12, lineHeight: 1.5,
            borderLeft: `3px solid ${card.accentColor}44`,
          }}>
            {card.footnote}
          </div>
        )}
      </div>

      {/* CTA area */}
      <div style={{ padding: '0 24px 36px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isLast ? (
          <>
            {/* On last card: two options */}
            <button
              onClick={complete}
              style={{
                width: '100%', padding: '16px', borderRadius: 14,
                background: '#e05040', border: 'none',
                color: '#fff', fontSize: 15, fontWeight: 800,
                letterSpacing: '0.04em', cursor: 'pointer',
              }}
            >
              Start exploring
            </button>
            <button
              onClick={goToGuide}
              style={{
                width: '100%', padding: '13px', borderRadius: 14,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#888', fontSize: 13, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Open the full App Guide →
            </button>
          </>
        ) : (
          <button
            onClick={advance}
            style={{
              width: '100%', padding: '16px', borderRadius: 14,
              background: '#111',
              border: '1.5px solid rgba(255,255,255,0.08)',
              color: '#fff', fontSize: 15, fontWeight: 700,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <span>Next</span>
            <span style={{ color: '#444' }}>{currentIndex + 2} / {totalSteps}</span>
          </button>
        )}

        {/* Back affordance on cards 2+ */}
        {currentIndex > 0 && (
          <button
            onClick={back}
            style={{
              background: 'none', border: 'none', color: '#333',
              fontSize: 12, cursor: 'pointer', textAlign: 'center', padding: '4px',
            }}
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );
};

export default OnboardingCards;

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT CHANGED FROM THE PREVIOUS VERSION
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. HOT card: completely rewritten.
 *    OLD: "AI identifies items, buy on StockX/GOAT" — sales-first, transactional.
 *    NEW: "Community lookbook, real people, no comments, your fit speaks for itself"
 *         — culture-first, community-first. The shopping feature is discovered
 *         naturally when users tap their first post, not shoved in their face
 *         before they've even opened the app.
 *
 * 2. No Pro upsell anywhere in onboarding.
 *    Users who want unlimited routes and PDF export will find the prompt
 *    organically when they hit the limit. Pushing it here damages trust.
 *
 * 3. Final screen: two options.
 *    "Start exploring" (primary) or "Open the full App Guide" (secondary).
 *    The guide is positioned as helpful, not as a chore.
 *
 * 4. Swipe gestures added (left to advance, right to go back).
 *    Feels native on mobile.
 *
 * 5. Version key changed from 'flyaf_onboarding_complete' to 'flyaf_onboarded_v2'
 *    so existing users who saw the old cards will see the new ones once.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UPDATING CARD COPY IN FUTURE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * All card text lives in the CARD_DATA array at the top of this file.
 * Change title, body, or footnote there. No other changes needed.
 * Bump the ONBOARD_KEY version (v2 → v3) if you want existing users
 * to see the updated cards.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */
