import { useState, useEffect } from "react";
import { ArrowLeft, MapPin, Ruler, Globe, Settings as SettingsIcon, RotateCcw } from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import urbanBg from "@/assets/urban-bg.jpg";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type DistanceUnit = "metric" | "imperial";
type LocationStatus = "granted" | "denied" | "prompt" | "unknown";

const Settings = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>(() => {
    return (localStorage.getItem("flyaf_distance_unit") as DistanceUnit) || "metric";
  });
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("unknown");
  

  // Check location permission status
  useEffect(() => {
    if ("permissions" in navigator) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        setLocationStatus(result.state as LocationStatus);
        result.onchange = () => {
          setLocationStatus(result.state as LocationStatus);
        };
      }).catch(() => {
        // Fallback: check localStorage flag
        if (localStorage.getItem("flyaf_location_denied") === "true") {
          setLocationStatus("denied");
        }
      });
    } else {
      if (localStorage.getItem("flyaf_location_denied") === "true") {
        setLocationStatus("denied");
      }
    }
  }, []);

  const handleDistanceUnitChange = (checked: boolean) => {
    const unit = checked ? "imperial" : "metric";
    setDistanceUnit(unit);
    localStorage.setItem("flyaf_distance_unit", unit);
    toast.success(t("settings.unitChanged", { unit: unit === "metric" ? "km" : "miles" }));
  };

  const handleRetryLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationStatus("granted");
        localStorage.removeItem("flyaf_location_denied");
        toast.success(t("settings.locationGranted"));
      },
      (err) => {
        if (err.code === 1) {
          setLocationStatus("denied");
          localStorage.setItem("flyaf_location_denied", "true");
          toast.error(t("settings.locationDeniedHint"));
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const languages = [
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "zh-CN", label: "中文", flag: "🇨🇳" },
    { code: "ja", label: "日本語", flag: "🇯🇵" },
    { code: "ko", label: "한국어", flag: "🇰🇷" },
    { code: "th", label: "ไทย", flag: "🇹🇭" },
  ];

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${urbanBg})` }} />
      <div className="absolute inset-0 bg-background/80" />

      {/* Header */}
      <div className="relative flex-shrink-0 px-5 pt-5 pb-4 lg:pt-16 lg:px-12 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <h1 className="text-2xl lg:text-4xl font-bold text-white tracking-wider uppercase">
            {t("settings.title")}
          </h1>
          <p className="text-sm lg:text-base text-white/40 mt-1">{t("settings.subtitle")}</p>
        </div>
      </div>

      {/* Settings Content */}
      <div className="relative flex-1 overflow-y-auto px-4 lg:px-12 pb-20">
        <div className="space-y-4 lg:max-w-2xl">

          {/* Location Access */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#C4956A]" />
                {t("settings.locationAccess")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/70">{t("settings.locationStatus")}</p>
                  <p className="text-xs text-white/40 mt-0.5">{t("settings.locationDesc")}</p>
                </div>
                <Badge
                  className={`text-xs ${
                    locationStatus === "granted"
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : locationStatus === "denied"
                      ? "bg-red-500/20 text-red-400 border-red-500/30"
                      : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                  }`}
                >
                  {locationStatus === "granted"
                    ? t("settings.allowed")
                    : locationStatus === "denied"
                    ? t("settings.denied")
                    : t("settings.notSet")}
                </Badge>
              </div>
              {locationStatus === "denied" && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-300 mb-2">{t("settings.locationDeniedHint")}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRetryLocation}
                    className="text-xs border-red-500/30 text-red-300 hover:bg-red-500/10"
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    {t("settings.retryLocation")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Distance Units */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Ruler className="w-4 h-4 text-[#C4956A]" />
                {t("settings.distanceUnits")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/70">
                    {distanceUnit === "metric" ? t("settings.metric") : t("settings.imperial")}
                  </p>
                  <p className="text-xs text-white/40 mt-0.5">
                    {distanceUnit === "metric" ? t("settings.metricDesc") : t("settings.imperialDesc")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${distanceUnit === "metric" ? "text-white" : "text-white/40"}`}>km</span>
                  <Switch
                    checked={distanceUnit === "imperial"}
                    onCheckedChange={handleDistanceUnitChange}
                  />
                  <span className={`text-xs ${distanceUnit === "imperial" ? "text-white" : "text-white/40"}`}>mi</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Language */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#C4956A]" />
                {t("settings.language")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      i18n.changeLanguage(lang.code);
                      toast.success(`Language changed to ${lang.label}`);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      i18n.language === lang.code ||
                      (lang.code === "en" && !["fr", "zh-CN", "ja", "ko", "th"].includes(i18n.language))
                        ? "bg-[#AD3A49] text-white"
                        : "bg-white/5 text-white/60 hover:bg-white/10 border border-white/10"
                    }`}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Replay Tutorial */}
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-4 pb-4">
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.removeItem('flyaf_onboarding_complete');
                  window.location.href = '/';
                }}
                className="w-full gap-2 border-white/10 text-white/70 hover:text-white hover:bg-white/10"
              >
                <RotateCcw className="w-4 h-4" />
                {t("settings.replayTutorial", "Replay app tutorial")}
              </Button>
            </CardContent>
          </Card>

        </div>

        <div className="mt-8 pt-4 border-t border-white/5 text-center">
          <p className="text-white/20 text-xs">FLYAF v1.0</p>
        </div>
      </div>

      {showTutorial && (
        <OnboardingTutorial
          forceShow
          onComplete={() => setShowTutorial(false)}
        />
      )}
    </div>
  );
};

export default Settings;
