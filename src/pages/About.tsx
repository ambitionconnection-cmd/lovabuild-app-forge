import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import founderAvatar from "@/assets/founder-avatar.jpg";

const About = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      <div className="flex-shrink-0 px-5 pt-5 pb-4 lg:pt-16 lg:px-12">
        <button
          onClick={() => navigate("/more")}
          className="mb-3 text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-2xl lg:text-4xl font-bold text-foreground tracking-wider uppercase">About FLYAF</h1>
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
            <h3 className="text-sm font-semibold text-[#C4956A] uppercase tracking-wider">The Mission</h3>
            <p className="text-sm text-foreground/70 leading-relaxed">
              <strong className="text-foreground">
                FLYAF is the streetwear discovery platform that puts every shop and brand on your map.
              </strong>{" "}
              We help you find the stores that matter, whether you're exploring a new city or planning a weekend route.
            </p>
          </div>

          <div className="border-t border-foreground/5" />

          {/* Founder Note */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#C4956A] uppercase tracking-wider">A Note From Our Founder</h3>
            <div className="space-y-3 border-l-2 border-[#AD3A49]/40 pl-4">
              <p className="text-sm text-foreground/60 leading-relaxed italic">
                "I spent 10 years working the door at the biggest streetwear shops in London. I was there for the
                queues, the wild drops and the infamous 'brick'.
              </p>
              <p className="text-sm text-foreground/60 leading-relaxed italic">
                Working security, I saw how many people missed out on their favourite brands simply because they were
                around the corner. Interesting shops are always clustered together, but you need to know where to look.
                I built FLYAF to bridge that gap."
              </p>
            </div>
          </div>

          <div className="border-t border-foreground/5" />

          {/* How it Works */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#C4956A] uppercase tracking-wider">How it Works</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-foreground font-medium">Explore</p>
                <p className="text-xs text-foreground/50">
                  Use the interactive map to discover 200+ shops across 12+ cities, with real-time brand pins and
                  distances.
                </p>
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">Plan</p>
                <p className="text-xs text-foreground/50">
                  Build a custom route on your desktop, then walk it on your phone. Never miss a store again.
                </p>
              </div>
              <div>
                <p className="text-sm text-foreground font-medium">Connect</p>
                <p className="text-xs text-foreground/50">
                  Post your 'fit checks' to the HOT feed, tag the brands you're wearing, and see what the culture is
                  wearing from Paris to Tokyo.
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-foreground/5" />

          {/* Built for the Culture */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#C4956A] uppercase tracking-wider">Built for the Culture</h3>
            <p className="text-sm text-foreground/70 leading-relaxed">
              FLYAF was born from a simple frustration: streetwear shops are everywhere but hard to find. We aren't a
              faceless tech company; we're built by people who spent a decade in the street of London.
            </p>
            <div className="space-y-2">
              <p className="text-sm text-foreground/60">
                <strong className="text-foreground">Global Reach:</strong> 150+ brands, 200+ shops, 12+ cities.
              </p>
              <p className="text-sm text-foreground/60">
                <strong className="text-foreground">Your Language:</strong> Navigate in 8 languages, including Japanese,
                Chinese, and Korean.
              </p>
              <p className="text-sm text-foreground/60">
                <strong className="text-foreground">Community First:</strong> A dedicated space to discover and be
                discovered.
              </p>
            </div>
          </div>

          <div className="border-t border-foreground/5" />

          {/* Get in Touch */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-[#C4956A] uppercase tracking-wider">Get In Touch</h3>
            <p className="text-sm text-foreground/70 leading-relaxed">
              Got feedback, want to submit a brand, or interested in becoming a FLYAF Ambassador? We'd love to hear from
              you.
            </p>
            <button
              onClick={() => navigate("/contact")}
              className="text-sm bg-[#AD3A49] hover:bg-[#AD3A49]/80 text-white px-5 py-2.5 rounded-lg transition-colors font-medium"
            >
              Contact Us / Join the Community
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
