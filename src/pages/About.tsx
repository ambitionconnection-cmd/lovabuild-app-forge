import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <div className="flex-shrink-0 px-5 pt-5 pb-4 lg:pt-16 lg:px-12">
        <button
          onClick={() => navigate('/more')}
          className="mb-3 text-sm text-muted-foreground hover:text-white transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-2xl lg:text-4xl font-bold text-white tracking-wider uppercase">About</h1>
        <p className="text-sm text-white/40 mt-1">Our story & mission</p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 lg:px-12 pb-24">
        <div className="lg:max-w-2xl space-y-6">
          {/* Hero */}
          <div className="py-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-xl border border-[#AD3A49]/50 flex items-center justify-center">
                <span className="text-[#AD3A49] font-bold text-2xl">H</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">HEARDROP</h2>
                <p className="text-sm text-[#AD3A49]">Never miss a drop again.</p>
              </div>
            </div>
          </div>

          {/* What is HEARDROP */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#C4956A] uppercase tracking-wider">What is HEARDROP?</h3>
            <p className="text-sm text-white/70 leading-relaxed">
              HEARDROP is the streetwear discovery platform that puts every shop, brand, and drop on your map. 
              Whether you're a tourist exploring Soho or a local planning your weekend route, HEARDROP helps you 
              find the stores that matter and never miss a release.
            </p>
          </div>

          {/* How it works */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#C4956A] uppercase tracking-wider">How it works</h3>
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-[#AD3A49]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[#AD3A49] text-xs font-bold">1</span>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">Explore Nearby</p>
                  <p className="text-xs text-white/50">Open the map to discover streetwear shops around you with real-time pins and distances.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-[#AD3A49]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[#AD3A49] text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">Build Your Route</p>
                  <p className="text-xs text-white/50">Tap shops to add them to your journey. Save, print, or share your route with friends.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-[#AD3A49]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[#AD3A49] text-xs font-bold">3</span>
                </div>
                <div>
                  <p className="text-sm text-white font-medium">Never Miss a Drop</p>
                  <p className="text-xs text-white/50">Browse upcoming releases and get notified when your favourite brands drop new products.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Built for */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#C4956A] uppercase tracking-wider">Built for the culture</h3>
            <p className="text-sm text-white/70 leading-relaxed">
              HEARDROP was born from a simple frustration: streetwear shops are everywhere but hard to find, 
              drops happen fast and are easy to miss, and no single platform connects the physical shopping 
              experience with the digital release calendar. We're changing that.
            </p>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#C4956A] uppercase tracking-wider">Get in touch</h3>
            <p className="text-sm text-white/70 leading-relaxed">
              Got feedback, want to submit a brand, or interested in partnering? We'd love to hear from you.
            </p>
            <button
              onClick={() => navigate('/contact')}
              className="text-sm text-[#AD3A49] hover:text-[#AD3A49]/80 transition-colors font-medium"
            >
              Contact us →
            </button>
          </div>

          {/* Version */}
          <div className="pt-6 border-t border-white/5 text-center">
            <p className="text-white/20 text-xs">HEARDROP v1.0</p>
            <p className="text-white/15 text-[10px] mt-1">Made in London 🇬🇧</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;