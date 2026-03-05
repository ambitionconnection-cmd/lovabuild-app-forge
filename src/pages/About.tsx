import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import founderAvatar from "@/assets/founder-avatar.jpg";

const About = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <div className="flex-shrink-0 px-5 pt-5 pb-4 lg:pt-16 lg:px-12">
        <button
          onClick={() => navigate("/more")}
          className="mb-3 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("common.back")}
        </button>
        <h1 className="text-2xl lg:text-4xl font-bold text-foreground tracking-wider uppercase">{t("about.title")}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-5 lg:px-12 pb-24">
        <div className="lg:max-w-2xl space-y-8">
          {/* Founder Avatar */}
          <div className="flex justify-center pt-2">
            <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-[#AD3A49]/60 shadow-lg shadow-[#AD3A49]/20">
              <img src={founderAvatar} alt="FLYAF Founder" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* The Mission */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#C4956A] uppercase tracking-wider">{t("about.missionTitle")}</h3>
            <p className="text-sm text-foreground/70 leading-relaxed">
              <strong className="text-foreground">{t("about.missionBold")}</strong>{" "}
              {t("about.missionText")}
            </p>
          </div>

          <div className="border-t border-foreground/5" />

          {/* Founder Note */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#C4956A] uppercase tracking-wider">{t("about.founderTitle")}</h3>
            <div className="space-y-3 border-l-2 border-[#AD3A49]/40 pl-4">
              <p className="text-sm text-foreground/60 leading-relaxed italic">
                {t("about.founderQuote1")}
              </p>
              <p className="text-sm text-foreground/60 leading-relaxed italic">
                {t("about.founderQuote2")}
              </p>
            </div>
          </div>

          <div className="border-t border-foreground/5" />

          {/* How it Works */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#C4956A] uppercase tracking-wider">{t("about.howItWorksTitle")}</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-foreground font-medium">{t("about.exploreLabel")}</p>
                <p className="text-xs text-foreground/50">{t("about.exploreDesc")}</p>
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">{t("about.planLabel")}</p>
                <p className="text-xs text-foreground/50">{t("about.planDesc")}</p>
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">{t("about.connectLabel")}</p>
                <p className="text-xs text-foreground/50">{t("about.connectDesc")}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-foreground/5" />

          {/* Built for the Culture */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#C4956A] uppercase tracking-wider">{t("about.cultureTitle")}</h3>
            <p className="text-sm text-foreground/70 leading-relaxed">{t("about.cultureText")}</p>
            <div className="space-y-2">
              <p className="text-sm text-foreground/60">
                <strong className="text-foreground">{t("about.globalReachLabel")}</strong> {t("about.globalReachDesc")}
              </p>
              <p className="text-sm text-foreground/60">
                <strong className="text-foreground">{t("about.languageLabel")}</strong> {t("about.languageDesc")}
              </p>
              <p className="text-sm text-foreground/60">
                <strong className="text-foreground">{t("about.communityLabel")}</strong> {t("about.communityDesc")}
              </p>
            </div>
          </div>

          <div className="border-t border-foreground/5" />

          {/* Get in Touch */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#C4956A] uppercase tracking-wider">{t("about.getInTouchTitle")}</h3>
            <p className="text-sm text-foreground/70 leading-relaxed">{t("about.getInTouchText")}</p>
            <button
              onClick={() => navigate("/contact")}
              className="text-sm bg-[#AD3A49] hover:bg-[#AD3A49]/80 text-white px-5 py-2.5 rounded-lg transition-colors font-medium"
            >
              {t("about.contactButton")}
            </button>
          </div>

          {/* Version */}
          <div className="pt-6 border-t border-foreground/5 text-center">
            <p className="text-foreground/20 text-xs">FLYAF v1.0</p>
            <p className="text-foreground/15 text-[10px] mt-1">Made in London 🇬🇧</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
