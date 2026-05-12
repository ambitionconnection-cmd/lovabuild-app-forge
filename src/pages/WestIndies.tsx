import { Link } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { getCountryFlag } from "@/lib/countryFlags";

const ISLANDS = [
  { slug: "guadeloupe", name: "Guadeloupe", country: "Guadeloupe", tagline: "Karukera — Butterfly Island" },
  { slug: "martinique", name: "Martinique", country: "Martinique", tagline: "Madinina — Island of Flowers" },
  { slug: "saint-lucia", name: "Saint Lucia", country: "Saint Lucia", tagline: "Helen of the West Indies" },
  { slug: "dominica", name: "Dominica", country: "Dominica", tagline: "The Nature Island" },
];

export default function WestIndies() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-24">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>

        <header className="mb-8">
          <div className="text-xs uppercase tracking-[0.2em] text-[hsl(var(--flyaf))] font-semibold mb-2">
            FLYAF · West Indies
          </div>
          <h1 className="text-4xl font-bold mb-3">Caribbean shopping guide</h1>
          <p className="text-muted-foreground leading-relaxed">
            A traveler-friendly companion to FLYAF, built for the four sister islands of
            Guadeloupe, Martinique, Saint Lucia and Dominica. Streetwear shops, local
            boutiques, beachwear and accessories — mapped for visitors.
          </p>
        </header>

        <div className="grid sm:grid-cols-2 gap-4">
          {ISLANDS.map((i) => (
            <Link
              key={i.slug}
              to={`/west-indies/${i.slug}`}
              className="group rounded-2xl border border-border bg-card hover:border-[hsl(var(--flyaf))] transition-all p-5"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{getCountryFlag(i.country)}</span>
                <div>
                  <div className="font-semibold text-lg">{i.name}</div>
                  <div className="text-xs text-muted-foreground">{i.tagline}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3">
                <MapPin className="w-3 h-3" /> Open island guide →
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
