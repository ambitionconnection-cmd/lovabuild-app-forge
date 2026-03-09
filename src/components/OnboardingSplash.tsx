import { useState } from "react";
import { MapPin, Flame, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import flyafLogo from "@/assets/flyaf-logo.svg";

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
      bgImage: "/onboarding/slide-1.jpg",
    },
    {
      icon: Flame,
      color: "text-[#C4956A]",
      bgColor: "bg-[#C4956A]/10",
      title: t('onboarding.slide2Title'),
      description: t('onboarding.slide2Desc'),
      bgImage: "/onboarding/slide-2.png",
    },
    {
      icon: Heart,
      color: "text-[#AD3A49]",
      bgColor: "bg-[#AD3A49]/10",
      title: t('onboarding.slide3Title'),
      description: t('onboarding.slide3Desc'),
      bgImage: "/onboarding/slide-3.jpg",
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
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center px-8">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-500"
        style={{ backgroundImage: `url(${slide.bgImage})` }}
      />
      {/* Overlay matching More page opacity */}
      <div className="absolute inset-0 bg-background/80" />

      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="relative z-10 absolute top-6 right-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {t('onboarding.skip')}
      </button>

      {/* Logo */}
      <div className="relative z-10 mb-12 flex flex-col items-center">
        <img src={flyafLogo} alt="FLYAF" className="h-16 mb-2" />
        <p className="text-[10px] tracking-[0.2em] text-[#AD3A49] text-center mt-1 font-bold">
          {t('onboarding.tagline')}
        </p>
      </div>

      {/* Slide content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-sm">
        <div className={`w-20 h-20 rounded-2xl ${slide.bgColor} flex items-center justify-center mb-6`}>
          <Icon className={`w-10 h-10 ${slide.color}`} />
        </div>
        <h2 className="text-xl font-bold text-white mb-3">{slide.title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{slide.description}</p>
      </div>

      {/* Dots */}
      <div className="relative z-10 flex gap-2 mt-10">
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
        className="relative z-10 mt-8 w-full max-w-xs bg-[#AD3A49] hover:bg-[#AD3A49]/80 text-white font-semibold"
      >
        {isLast ? t('onboarding.getStarted') : t('onboarding.next')}
      </Button>
    </div>
  );
};

export default OnboardingSplash;
