import { useState } from "react";
import { MapPin, Zap, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const OnboardingSplash = ({ onComplete }: { onComplete: () => void }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { t } = useTranslation();

  const slides = [
    {
      icon: MapPin,
      color: "text-[#4ECDC4]",
      bgColor: "bg-[#4ECDC4]/10",
      title: t('onboarding.slide1Title'),
      description: t('onboarding.slide1Desc'),
    },
    {
      icon: Zap,
      color: "text-[#C4956A]",
      bgColor: "bg-[#C4956A]/10",
      title: t('onboarding.slide2Title'),
      description: t('onboarding.slide2Desc'),
    },
    {
      icon: Heart,
      color: "text-[#AD3A49]",
      bgColor: "bg-[#AD3A49]/10",
      title: t('onboarding.slide3Title'),
      description: t('onboarding.slide3Desc'),
    },
  ];

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;
  const isLast = currentSlide === slides.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center px-8">
      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="absolute top-6 right-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {t('onboarding.skip')}
      </button>

      {/* Logo */}
      <div className="mb-12">
        <h1 className="text-2xl font-black tracking-[0.3em] text-[#C3C9C9]">HEARDROP</h1>
        <p className="text-[10px] tracking-[0.2em] text-[#AD3A49] text-center mt-1">
          {t('onboarding.tagline')}
        </p>
      </div>

      {/* Slide content */}
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className={`w-20 h-20 rounded-2xl ${slide.bgColor} flex items-center justify-center mb-6`}>
          <Icon className={`w-10 h-10 ${slide.color}`} />
        </div>
        <h2 className="text-xl font-bold text-white mb-3">{slide.title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{slide.description}</p>
      </div>

      {/* Dots */}
      <div className="flex gap-2 mt-10">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentSlide(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === currentSlide ? 'w-6 bg-[#AD3A49]' : 'bg-white/20'
            }`}
          />
        ))}
      </div>

      {/* Button */}
      <Button
        onClick={handleNext}
        className="mt-8 w-full max-w-xs bg-[#AD3A49] hover:bg-[#AD3A49]/80 text-white font-semibold"
      >
        {isLast ? t('onboarding.getStarted') : t('onboarding.next')}
      </Button>
    </div>
  );
};

export default OnboardingSplash;
