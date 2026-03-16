/**
 * FLYAF Onboarding Tutorial — Spotlight-style overlay
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import flyafLogo from '@/assets/flyaf-logo.svg';

// ─── Types ────────────────────────────────────────────────────────────────────

type Lang = 'en' | 'fr' | 'ja' | 'ko' | 'zh-CN' | 'zh-TW' | 'th';

interface OnboardingStep {
  targetId: string;
  tooltipPosition: 'top' | 'bottom' | 'left' | 'right';
  titleKey: string;
  bodyKey: string;
  tab?: 'nearby' | 'route' | 'index' | 'hot' | 'more';
  navigateTo?: string;
}

interface OnboardingTutorialProps {
  lang?: Lang;
  onComplete?: () => void;
  forceShow?: boolean;
}

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS: OnboardingStep[] = [
  {
    targetId: 'ob-city-selector',
    tooltipPosition: 'bottom',
    titleKey: 'step1_title',
    bodyKey: 'step1_body',
    tab: 'nearby',
    navigateTo: '/',
  },
  {
    targetId: 'ob-nearby-shop-icons',
    tooltipPosition: 'top',
    titleKey: 'step2_title',
    bodyKey: 'step2_body',
    tab: 'nearby',
    navigateTo: '/',
  },
  {
    targetId: 'ob-route-start-nav',
    tooltipPosition: 'top',
    titleKey: 'step3_title',
    bodyKey: 'step3_body',
    tab: 'route',
    navigateTo: '/',
  },
  {
    targetId: 'ob-index-collections',
    tooltipPosition: 'bottom',
    titleKey: 'step4_title',
    bodyKey: 'step4_body',
    tab: 'index',
    navigateTo: '/global-index',
  },
  {
    targetId: 'ob-hot-fab',
    tooltipPosition: 'top',
    titleKey: 'step5_title',
    bodyKey: 'step5_body',
    tab: 'hot',
    navigateTo: '/feed',
  },
];

// ─── LocalStorage helpers ─────────────────────────────────────────────────────

const STORAGE_KEY = 'flyaf_onboarding_complete';

function hasSeenOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function markOnboardingComplete(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'true');
  } catch { /* ignore */ }
}

// ─── Language selector slide ──────────────────────────────────────────────────

const LANGUAGE_OPTIONS: { code: Lang; label: string; flag: string }[] = [
  { code: 'en',    label: 'English',   flag: '🇬🇧' },
  { code: 'fr',    label: 'Français',  flag: '🇫🇷' },
  { code: 'ja',    label: '日本語',     flag: '🇯🇵' },
  { code: 'ko',    label: '한국어',     flag: '🇰🇷' },
  { code: 'zh-CN', label: '简体中文',   flag: '🇨🇳' },
  { code: 'zh-TW', label: '繁體中文',   flag: '🇹🇼' },
  { code: 'th',    label: 'ภาษาไทย',  flag: '🇹🇭' },
];

// ─── Translations ─────────────────────────────────────────────────────────────

type TranslationKeys =
  | 'welcome_title' | 'welcome_body' | 'select_language' | 'get_started'
  | 'skip' | 'next' | 'done' | 'step_of'
  | 'step1_title' | 'step1_body'
  | 'step2_title' | 'step2_body'
  | 'step3_title' | 'step3_body'
  | 'step4_title' | 'step4_body'
  | 'step5_title' | 'step5_body';

const translations: Record<Lang, Record<TranslationKeys, string>> = {
  en: {
    welcome_title:   'Welcome to FLYAF',
    welcome_body:    'The streetwear map for every city. Choose your language to get started.',
    select_language: 'Choose your language',
    get_started:     'Get started',
    skip:            'Skip tour',
    next:            'Next',
    done:            'Done',
    step_of:         'of',
    step1_title:     'Switch cities instantly',
    step1_body:      'Tap the city name to switch between London, Paris, Tokyo, NYC and more. The map flies there instantly.',
    step2_title:     'Three quick actions',
    step2_body:      'On each shop: ⓘ for details · ↗ for the website · ↑ to navigate there right now.',
    step3_title:     'Walk your full route',
    step3_body:      'Add multiple shops on the map, then tap START NAVIGATION. Google Maps opens with every stop loaded — hands-free.',
    step4_title:     'Browse curated collections',
    step4_body:      'Collections groups brands by theme: Japanese Streetwear, London Underground Labels, and more. A great way to discover brands you don\'t know yet.',
    step5_title:     'Post your fit',
    step5_body:      'Tap + to upload a photo. No caption needed. AI identifies what you\'re wearing and adds shopping links automatically.',
  },
  fr: {
    welcome_title:   'Bienvenue sur FLYAF',
    welcome_body:    'La carte streetwear pour chaque ville. Choisissez votre langue pour commencer.',
    select_language: 'Choisissez votre langue',
    get_started:     'Commencer',
    skip:            'Passer',
    next:            'Suivant',
    done:            'Terminé',
    step_of:         'sur',
    step1_title:     'Changer de ville',
    step1_body:      'Tapez le nom de la ville pour passer entre Londres, Paris, Tokyo, NYC et d\'autres. La carte s\'y déplace instantanément.',
    step2_title:     'Trois actions rapides',
    step2_body:      'Sur chaque boutique : ⓘ pour les détails · ↗ pour le site web · ↑ pour la navigation directe.',
    step3_title:     'Parcourez tout votre itinéraire',
    step3_body:      'Ajoutez plusieurs boutiques sur la carte, puis appuyez sur DÉMARRER LA NAVIGATION. Google Maps s\'ouvre avec tous les arrêts chargés.',
    step4_title:     'Collections thématiques',
    step4_body:      'Les collections regroupent les marques par thème : Streetwear Japonais, Labels Underground de Londres, et plus.',
    step5_title:     'Postez votre tenue',
    step5_body:      'Appuyez sur + pour uploader une photo. Pas de légende nécessaire. L\'IA identifie ce que vous portez automatiquement.',
  },
  ja: {
    welcome_title:   'FLYAFへようこそ',
    welcome_body:    '世界中のストリートウェアショップをマップで探せます。言語を選んでスタートしましょう。',
    select_language: '言語を選択',
    get_started:     'はじめる',
    skip:            'スキップ',
    next:            '次へ',
    done:            '完了',
    step_of:         '/',
    step1_title:     '都市を切り替え',
    step1_body:      '都市名をタップして、ロンドン・パリ・東京・NYCなどを瞬時に切り替えられます。',
    step2_title:     '3つのクイックアクション',
    step2_body:      'ショップごとに：ⓘ 詳細 · ↗ 公式サイト · ↑ ナビゲーション',
    step3_title:     'ルート全体を歩く',
    step3_body:      'マップで複数のショップを追加し、NAVIGATIONをタップ。Google Mapsが全ストップをロードして開きます。',
    step4_title:     'コレクションで探索',
    step4_body:      'コレクションはテーマ別にブランドをまとめています：日本のストリートウェア、ロンドンのアンダーグラウンドラベルなど。',
    step5_title:     'コーデを投稿',
    step5_body:      '＋をタップして写真をアップロード。キャプション不要。AIが着用アイテムを自動識別してショッピングリンクを追加します。',
  },
  ko: {
    welcome_title:   'FLYAF에 오신 것을 환영합니다',
    welcome_body:    '모든 도시의 스트리트웨어 지도. 언어를 선택하여 시작하세요.',
    select_language: '언어 선택',
    get_started:     '시작하기',
    skip:            '건너뛰기',
    next:            '다음',
    done:            '완료',
    step_of:         '/',
    step1_title:     '도시 전환',
    step1_body:      '도시 이름을 탭하여 런던, 파리, 도쿄, 뉴욕 등으로 즉시 전환할 수 있습니다.',
    step2_title:     '세 가지 빠른 액션',
    step2_body:      '각 매장에서: ⓘ 상세정보 · ↗ 공식 웹사이트 · ↑ 바로 길 안내',
    step3_title:     '전체 루트 걷기',
    step3_body:      '지도에서 여러 매장을 추가한 후 START NAVIGATION을 탭하세요. Google Maps가 모든 정류장을 로드하여 열립니다.',
    step4_title:     '컬렉션 탐색',
    step4_body:      '컬렉션은 테마별로 브랜드를 그룹화합니다: 일본 스트리트웨어, 런던 언더그라운드 레이블 등.',
    step5_title:     '스타일 포스팅',
    step5_body:      '+를 탭하여 사진을 업로드하세요. 캡션 불필요. AI가 착용 아이템을 자동으로 식별하고 쇼핑 링크를 추가합니다.',
  },
  'zh-CN': {
    welcome_title:   '欢迎使用 FLYAF',
    welcome_body:    '覆盖全球城市的潮流街头服饰地图。选择您的语言即可开始。',
    select_language: '选择语言',
    get_started:     '开始',
    skip:            '跳过',
    next:            '下一步',
    done:            '完成',
    step_of:         '/',
    step1_title:     '即时切换城市',
    step1_body:      '点击城市名称，即可在伦敦、巴黎、东京、纽约等城市之间切换，地图即时飞跃。',
    step2_title:     '三个快捷操作',
    step2_body:      '每个店铺：ⓘ 查看详情 · ↗ 官方网站 · ↑ 立即导航',
    step3_title:     '完整路线导航',
    step3_body:      '在地图上添加多个店铺，然后点击"开始导航"。Google Maps 将加载所有站点，一键出发。',
    step4_title:     '浏览精选合集',
    step4_body:      '合集按主题分组品牌：日本街头服饰、伦敦地下厂牌等。轻松发现你不了解的品牌。',
    step5_title:     '发布你的穿搭',
    step5_body:      '点击 + 上传照片，无需标题。AI 自动识别你的穿搭并添加购买链接。',
  },
  'zh-TW': {
    welcome_title:   '歡迎使用 FLYAF',
    welcome_body:    '涵蓋全球城市的潮流街頭服飾地圖。選擇您的語言即可開始。',
    select_language: '選擇語言',
    get_started:     '開始',
    skip:            '略過',
    next:            '下一步',
    done:            '完成',
    step_of:         '/',
    step1_title:     '即時切換城市',
    step1_body:      '點擊城市名稱，即可在倫敦、巴黎、東京、紐約等城市之間切換。',
    step2_title:     '三個快捷操作',
    step2_body:      '每個店鋪：ⓘ 詳情 · ↗ 官方網站 · ↑ 立即導航',
    step3_title:     '完整路線導航',
    step3_body:      '在地圖上添加多個店鋪，點擊"開始導航"，Google Maps 將載入所有站點。',
    step4_title:     '瀏覽精選合集',
    step4_body:      '合集按主題分組品牌：日本街頭服飾、倫敦地下廠牌等，輕鬆探索新品牌。',
    step5_title:     '發佈你的穿搭',
    step5_body:      '點擊 + 上傳照片，無需說明文字。AI 自動識別穿搭並新增購買連結。',
  },
  th: {
    welcome_title:   'ยินดีต้อนรับสู่ FLYAF',
    welcome_body:    'แผนที่สตรีทแวร์ทุกเมืองทั่วโลก เลือกภาษาของคุณเพื่อเริ่มต้น',
    select_language: 'เลือกภาษา',
    get_started:     'เริ่มต้น',
    skip:            'ข้าม',
    next:            'ถัดไป',
    done:            'เสร็จสิ้น',
    step_of:         '/',
    step1_title:     'สลับเมืองทันที',
    step1_body:      'แตะชื่อเมืองเพื่อสลับระหว่างลอนดอน ปารีส โตเกียว นิวยอร์ก และอื่น ๆ แผนที่จะเปลี่ยนทันที',
    step2_title:     'สามการกระทำด่วน',
    step2_body:      'ในแต่ละร้าน: ⓘ รายละเอียด · ↗ เว็บไซต์อย่างเป็นทางการ · ↑ นำทางทันที',
    step3_title:     'เดินเส้นทางทั้งหมด',
    step3_body:      'เพิ่มร้านค้าหลายแห่งบนแผนที่ แล้วแตะ START NAVIGATION Google Maps จะเปิดพร้อมจุดหมายทั้งหมด',
    step4_title:     'เรียกดูคอลเลคชัน',
    step4_body:      'คอลเลคชันจัดกลุ่มแบรนด์ตามธีม: สตรีทแวร์ญี่ปุ่น ฉลากใต้ดินลอนดอน และอื่น ๆ',
    step5_title:     'โพสต์ลุคของคุณ',
    step5_body:      'แตะ + เพื่ออัปโหลดรูปภาพ ไม่ต้องใส่คำบรรยาย AI จะระบุสิ่งที่คุณสวมใส่โดยอัตโนมัติ',
  },
};

// ─── Helper: get translation ──────────────────────────────────────────────────

function tr(lang: Lang, key: TranslationKeys): string {
  return translations[lang]?.[key] ?? translations.en[key] ?? key;
}

// ─── Spotlight rectangle calculation ─────────────────────────────────────────

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function getSpotlightRect(targetId: string): SpotlightRect | null {
  const el = document.querySelector(`[data-onboarding="${targetId}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const PADDING = 8;
  return {
    top:    r.top    - PADDING,
    left:   r.left   - PADDING,
    width:  r.width  + PADDING * 2,
    height: r.height + PADDING * 2,
  };
}

// ─── Main component ───────────────────────────────────────────────────────────

const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  lang: propLang,
  onComplete,
  forceShow = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();

  const [visible,   setVisible]   = useState(false);
  const [phase,     setPhase]     = useState<'language' | 'tour' | 'done'>('language');
  const [stepIndex, setStepIndex] = useState(0);
  const [lang,      setLang]      = useState<Lang>(() => {
    if (propLang) return propLang;
    // Try to read from i18next
    const current = i18n.language;
    if (current && current in translations) return current as Lang;
    return 'en';
  });
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const animRef = useRef<number>();

  // show/hide logic
  useEffect(() => {
    if (forceShow || !hasSeenOnboarding()) {
      const timer = setTimeout(() => setVisible(true), 400);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  // Navigate to the correct page when step changes during tour
  useEffect(() => {
    if (phase !== 'tour') return;
    const step = STEPS[stepIndex];
    if (!step) return;

    // Navigate to the step's page if needed
    if (step.navigateTo && location.pathname !== step.navigateTo) {
      navigate(step.navigateTo, { replace: true });
    }

    // For route tab, dispatch event to switch to route mode
    if (step.tab === 'route') {
      window.dispatchEvent(new CustomEvent('switchToRouteMode'));
    } else if (step.tab === 'nearby' && location.pathname === '/') {
      window.dispatchEvent(new CustomEvent('reopenShopsSheet'));
    }
  }, [phase, stepIndex, navigate, location.pathname]);

  // update spotlight rect on step change
  const updateSpotlight = useCallback(() => {
    if (phase !== 'tour') return;
    const step = STEPS[stepIndex];
    if (!step) return;
    const rect = getSpotlightRect(step.targetId);
    setSpotlight(rect);
  }, [phase, stepIndex]);

  // Poll for element visibility (elements may not exist immediately after navigation)
  useEffect(() => {
    if (phase !== 'tour') return;
    let attempts = 0;
    const maxAttempts = 20;
    const poll = () => {
      updateSpotlight();
      attempts++;
      if (attempts < maxAttempts && !getSpotlightRect(STEPS[stepIndex]?.targetId ?? '')) {
        animRef.current = requestAnimationFrame(poll);
      }
    };
    // Small delay after navigation
    const timer = setTimeout(poll, 300);
    return () => {
      clearTimeout(timer);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [phase, stepIndex, updateSpotlight]);

  useEffect(() => {
    updateSpotlight();
    window.addEventListener('resize', updateSpotlight);
    return () => window.removeEventListener('resize', updateSpotlight);
  }, [updateSpotlight]);

  // handlers
  const handleLanguageSelect = (code: Lang) => {
    setLang(code);
    i18n.changeLanguage(code);
  };

  const handleGetStarted = () => {
    setPhase('tour');
    setStepIndex(0);
  };

  const handleNext = () => {
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(i => i + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    markOnboardingComplete();
    setPhase('done');
    setVisible(false);
    // Navigate back to home
    if (location.pathname !== '/') {
      navigate('/', { replace: true });
    }
    onComplete?.();
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!visible) return null;

  // ── PHASE: language selector ──────────────────────────────────────────────
  if (phase === 'language') {
    return (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.92)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <img src={flyafLogo} alt="FLYAF" style={{ height: 48, marginBottom: 8, margin: '0 auto' }} />
          <p style={{
            fontSize: 10, letterSpacing: '0.2em', fontWeight: 700,
            color: '#AD3A49', textAlign: 'center', marginTop: 4,
          }}>
            STAY FLY & FABULOUS
          </p>
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, marginBottom: 6, marginTop: 16 }}>
            {tr(lang, 'welcome_title')}
          </div>
          <div style={{ color: '#888', fontSize: 13, maxWidth: 280, lineHeight: 1.5, margin: '0 auto' }}>
            {tr(lang, 'welcome_body')}
          </div>
        </div>

        {/* Language label */}
        <div style={{ color: '#aaa', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', marginBottom: 12, textTransform: 'uppercase' }}>
          {tr(lang, 'select_language')}
        </div>

        {/* Language pills */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 300, marginBottom: 28 }}>
          {LANGUAGE_OPTIONS.map(opt => (
            <button
              key={opt.code}
              onClick={() => handleLanguageSelect(opt.code)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 16px', borderRadius: 12,
                background: lang === opt.code ? '#AD3A49' : 'rgba(255,255,255,0.08)',
                border: lang === opt.code ? '2px solid #AD3A49' : '1.5px solid rgba(255,255,255,0.12)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: 18 }}>{opt.flag}</span>
              <span style={{
                color: lang === opt.code ? '#fff' : '#ccc',
                fontSize: 14, fontWeight: lang === opt.code ? 700 : 400,
              }}>
                {opt.label}
              </span>
              {lang === opt.code && (
                <span style={{ marginLeft: 'auto', color: '#fff', fontSize: 16 }}>✓</span>
              )}
            </button>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleGetStarted}
          style={{
            width: '100%', maxWidth: 300,
            padding: '16px', borderRadius: 14,
            background: '#AD3A49', border: 'none',
            color: '#fff', fontSize: 15, fontWeight: 800,
            letterSpacing: '0.04em', cursor: 'pointer',
          }}
        >
          {tr(lang, 'get_started')}
        </button>
      </div>
    );
  }

  // ── PHASE: tour steps ─────────────────────────────────────────────────────
  const currentStep = STEPS[stepIndex];
  const isLastStep  = stepIndex === STEPS.length - 1;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Build clip-path
  let clipPath = 'none';
  if (spotlight) {
    const { top, left, width, height } = spotlight;
    const r = 10;
    clipPath = `polygon(
      0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
      ${left + r}px ${top}px,
      ${left}px ${top + r}px,
      ${left}px ${top + height - r}px,
      ${left + r}px ${top + height}px,
      ${left + width - r}px ${top + height}px,
      ${left + width}px ${top + height - r}px,
      ${left + width}px ${top + r}px,
      ${left + width - r}px ${top}px,
      ${left + r}px ${top}px
    )`;
  }

  // Tooltip position
  let tooltipStyle: React.CSSProperties = {};
  if (spotlight) {
    const { top, left, width, height } = spotlight;
    const tooltipW = Math.min(280, vw - 32);
    const TOOLTIP_H_ESTIMATE = 120;

    switch (currentStep.tooltipPosition) {
      case 'bottom':
        tooltipStyle = {
          position: 'fixed',
          top:  Math.min(top + height + 16, vh - TOOLTIP_H_ESTIMATE - 16),
          left: Math.max(16, Math.min(left + width / 2 - tooltipW / 2, vw - tooltipW - 16)),
          width: tooltipW,
        };
        break;
      case 'top':
        tooltipStyle = {
          position: 'fixed',
          bottom: vh - top + 16,
          left: Math.max(16, Math.min(left + width / 2 - tooltipW / 2, vw - tooltipW - 16)),
          width: tooltipW,
        };
        break;
      case 'right':
        tooltipStyle = {
          position: 'fixed',
          top:  Math.max(16, top + height / 2 - TOOLTIP_H_ESTIMATE / 2),
          left: Math.min(left + width + 16, vw - tooltipW - 16),
          width: tooltipW,
        };
        break;
      case 'left':
        tooltipStyle = {
          position: 'fixed',
          top:   Math.max(16, top + height / 2 - TOOLTIP_H_ESTIMATE / 2),
          right: vw - left + 16,
          width: tooltipW,
        };
        break;
    }
  } else {
    tooltipStyle = {
      position: 'fixed',
      top: '50%', left: '50%',
      transform: 'translate(-50%, -50%)',
      width: Math.min(300, vw - 32),
    };
  }

  return (
    <>
      {/* Dark overlay with spotlight cutout */}
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.78)',
          clipPath,
          transition: 'clip-path 0.3s ease',
          pointerEvents: 'none',
        }}
      />

      {/* Invisible full-screen tap to advance */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
        onClick={handleNext}
      />

      {/* Tooltip card */}
      <div
        style={{
          ...tooltipStyle,
          zIndex: 10000,
          background: '#1a1a1a',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 16,
          padding: '16px 18px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          pointerEvents: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Step counter */}
        <div style={{ color: '#555', fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 6 }}>
          {stepIndex + 1} {tr(lang, 'step_of')} {STEPS.length}
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                height: 3, borderRadius: 2, transition: 'all 0.2s',
                flex: i === stepIndex ? 2 : 1,
                background: i <= stepIndex ? '#AD3A49' : 'rgba(255,255,255,0.15)',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, marginBottom: 5 }}>
          {tr(lang, currentStep.titleKey as TranslationKeys)}
        </div>
        <div style={{ color: '#888', fontSize: 12, lineHeight: 1.55, marginBottom: 14 }}>
          {tr(lang, currentStep.bodyKey as TranslationKeys)}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={handleSkip}
            style={{
              background: 'none', border: 'none', color: '#555',
              fontSize: 12, cursor: 'pointer', padding: '4px 0',
            }}
          >
            {tr(lang, 'skip')}
          </button>
          <button
            onClick={handleNext}
            style={{
              background: '#AD3A49', border: 'none',
              color: '#fff', fontSize: 12, fontWeight: 700,
              padding: '8px 18px', borderRadius: 8,
              cursor: 'pointer', letterSpacing: '0.03em',
            }}
          >
            {isLastStep ? tr(lang, 'done') : tr(lang, 'next')}
          </button>
        </div>
      </div>
    </>
  );
};

export default OnboardingTutorial;
