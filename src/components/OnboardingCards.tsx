/**
 * FLYAF Onboarding Cards — fully internationalised
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import urbanBg from '@/assets/urban-bg.jpg';
import flyafLogo from '@/assets/flyaf-logo.svg';

type Lang = 'en' | 'fr' | 'ja' | 'ko' | 'zh-CN' | 'zh-TW' | 'th';

const ONBOARD_KEY = 'flyaf_onboarded_v2';
const LANG_KEY    = 'flyaf_lang';

function isOnboarded(): boolean {
  try { return localStorage.getItem(ONBOARD_KEY) === 'true'; } catch { return false; }
}
function setOnboarded(): void {
  try { localStorage.setItem(ONBOARD_KEY, 'true'); } catch { /* ignore */ }
}

const LANGS: { code: Lang; label: string; flag: string; native: string }[] = [
  { code: 'en',    flag: '🇬🇧', label: 'English',  native: 'English'   },
  { code: 'fr',    flag: '🇫🇷', label: 'French',   native: 'Français'  },
  { code: 'ja',    flag: '🇯🇵', label: 'Japanese', native: '日本語'     },
  { code: 'ko',    flag: '🇰🇷', label: 'Korean',   native: '한국어'     },
  { code: 'zh-CN', flag: '🇨🇳', label: 'Chinese',  native: '简体中文'  },
  { code: 'zh-TW', flag: '🇹🇼', label: 'Chinese',  native: '繁體中文'  },
  { code: 'th',    flag: '🇹🇭', label: 'Thai',     native: 'ภาษาไทย'  },
];

interface CardContent {
  icon: string;
  accentColor: string;
  title: string;
  body: string;
  footnote?: string;
}

const getCardData = (t: (key: string) => string): CardContent[] => [
  {
    icon: '📍',
    accentColor: '#e05040',
    title: t('onboardingCards.card1Title'),
    body: t('onboardingCards.card1Body'),
    footnote: t('onboardingCards.card1Footnote'),
  },
  {
    icon: '🗺️',
    accentColor: '#c8a068',
    title: t('onboardingCards.card2Title'),
    body: t('onboardingCards.card2Body'),
    footnote: t('onboardingCards.card2Footnote'),
  },
  {
    icon: '🌐',
    accentColor: '#7c3aed',
    title: t('onboardingCards.card3Title'),
    body: t('onboardingCards.card3Body'),
    footnote: t('onboardingCards.card3Footnote'),
  },
  {
    icon: '🔥',
    accentColor: '#e05040',
    title: t('onboardingCards.card4Title'),
    body: t('onboardingCards.card4Body'),
    footnote: t('onboardingCards.card4Footnote'),
  },
];

interface OnboardingCardsProps {
  forceShow?: boolean;
  onComplete?: () => void;
}

const OnboardingCards: React.FC<OnboardingCardsProps> = ({
  forceShow = false,
  onComplete,
}) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [visible, setVisible]   = useState(false);
  const [step, setStep]         = useState<'language' | number>('language');
  const [lang, setLang]         = useState<Lang>('en');
  const [animDir, setAnimDir]   = useState<'in' | 'out'>('in');
  const touchStartX = useRef<number>(0);

  const CARD_DATA = getCardData(t);

  useEffect(() => {
    if (forceShow || !isOnboarded()) {
      const timer = setTimeout(() => setVisible(true), 300);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LANG_KEY) as Lang | null;
      if (stored) setLang(stored);
    } catch { /* ignore */ }
  }, []);

  if (!visible) return null;

  const selectLang = (code: Lang) => {
    setLang(code);
    try { localStorage.setItem(LANG_KEY, code); } catch { /* ignore */ }
    i18n.changeLanguage(code);
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

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -50) advance();
    if (dx > 50 && step !== 'language') back();
  };

  const totalSteps   = CARD_DATA.length;
  const currentIndex = step === 'language' ? -1 : (step as number);

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 9999,
    background: '#000',
    backgroundImage: `url(${urbanBg})`,
    backgroundSize: 'cover', backgroundPosition: 'center',
    display: 'flex', flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    overflow: 'hidden',
    transition: 'opacity 0.18s',
    opacity: animDir === 'out' ? 0 : 1,
  };

  const overlayBg: React.CSSProperties = {
    position: 'absolute', inset: 0,
    background: 'rgba(0,0,0,0.80)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 0,
  };

  // ═══ LANGUAGE SELECTOR ═══
  if (step === 'language') {
    return (
      <div style={overlay} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div style={overlayBg} />
        <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          <img src={flyafLogo} alt="FLYAF" style={{ height: 24 }} />
          <button onClick={complete} style={{ background: 'none', border: 'none', color: '#333', fontSize: 12, cursor: 'pointer', padding: '4px 8px' }}>
            {t('onboardingCards.skip')}
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '28px 24px 0', overflowY: 'auto', position: 'relative', zIndex: 1 }}>
          <div style={{ marginBottom: 28, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🌐</div>
            <div style={{ color: '#fff', fontSize: 22, fontWeight: 800, lineHeight: 1.25, marginBottom: 8 }}>
              {t('onboardingCards.chooseLanguage')}
            </div>
            <div style={{ color: '#555', fontSize: 14, lineHeight: 1.5, maxWidth: 280, margin: '0 auto' }}>
              {t('onboardingCards.languageNote')}
            </div>
          </div>

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
                    cursor: 'pointer', transition: 'all 0.12s', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 20, lineHeight: 1 }}>{l.flag}</span>
                  <span style={{ color: active ? '#e05040' : '#ccc', fontSize: 14, fontWeight: active ? 700 : 400 }}>
                    {l.native}
                  </span>
                  {active && <span style={{ marginLeft: 'auto', color: '#e05040', fontSize: 14, fontWeight: 700 }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ padding: '20px 24px 36px', position: 'relative', zIndex: 1 }}>
          <button
            onClick={advance}
            style={{
              width: '100%', padding: '16px', borderRadius: 14,
              background: '#e05040', border: 'none',
              color: '#fff', fontSize: 15, fontWeight: 800,
              letterSpacing: '0.04em', cursor: 'pointer',
            }}
          >
            {t('onboardingCards.continue')}
          </button>
        </div>
      </div>
    );
  }

  // ═══ FEATURE CARDS ═══
  const card   = CARD_DATA[currentIndex];
  const isLast = currentIndex === CARD_DATA.length - 1;

  const iconBg: Record<string, string> = {
    '#e05040': 'rgba(224,80,64,0.12)',
    '#c8a068': 'rgba(200,160,104,0.12)',
    '#7c3aed': 'rgba(124,58,237,0.12)',
  };

  const titleLines = card.title.split('\n');

  return (
    <div style={overlay} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div style={overlayBg} />
      <div style={{ padding: '20px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <img src={flyafLogo} alt="FLYAF" style={{ height: 24 }} />
        <button onClick={complete} style={{ background: 'none', border: 'none', color: '#333', fontSize: 12, cursor: 'pointer', padding: '4px 8px' }}>
          {t('onboardingCards.skip')}
        </button>
      </div>

      <div style={{ display: 'flex', gap: 5, padding: '18px 24px 0', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
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

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px 28px', position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: iconBg[card.accentColor] ?? 'rgba(255,255,255,0.08)',
            border: `1.5px solid ${card.accentColor}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
          }}>
            {card.icon}
          </div>
        </div>

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

        <div style={{ color: '#888', fontSize: 15, lineHeight: 1.65, marginBottom: 16, maxWidth: 340 }}>
          {card.body}
        </div>

        {card.footnote && (
          <div style={{
            background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px',
            color: '#444', fontSize: 12, lineHeight: 1.5,
            borderLeft: `3px solid ${card.accentColor}44`,
          }}>
            {card.footnote}
          </div>
        )}
      </div>

      <div style={{ padding: '0 24px 36px', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', zIndex: 1 }}>
        {isLast ? (
          <>
            <button
              onClick={complete}
              style={{
                width: '100%', padding: '16px', borderRadius: 14,
                background: '#e05040', border: 'none',
                color: '#fff', fontSize: 15, fontWeight: 800,
                letterSpacing: '0.04em', cursor: 'pointer',
              }}
            >
              {t('onboardingCards.startExploring')}
            </button>
            <button
              onClick={goToGuide}
              style={{
                width: '100%', padding: '13px', borderRadius: 14,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#888', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}
            >
              {t('onboardingCards.openGuide')}
            </button>
          </>
        ) : (
          <button
            onClick={advance}
            style={{
              width: '100%', padding: '16px', borderRadius: 14,
              background: '#111',
              border: '1.5px solid rgba(255,255,255,0.08)',
              color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <span>{t('onboardingCards.next')}</span>
            <span style={{ color: '#444' }}>{currentIndex + 2} / {totalSteps}</span>
          </button>
        )}

        {currentIndex > 0 && (
          <button
            onClick={back}
            style={{
              background: 'none', border: 'none', color: '#333',
              fontSize: 12, cursor: 'pointer', textAlign: 'center', padding: '4px',
            }}
          >
            {t('onboardingCards.back')}
          </button>
        )}
      </div>
    </div>
  );
};

export default OnboardingCards;
