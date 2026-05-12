import { useEffect, useState, useMemo } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, MapPin, Instagram, Globe, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getCountryFlag } from "@/lib/countryFlags";

const ISLANDS: Record<string, { name: string; country: string; tagline: string; intro: string }> = {
  guadeloupe: {
    name: "Guadeloupe",
    country: "Guadeloupe",
    tagline: "Karukera — Butterfly Island",
    intro: "French Caribbean island in the Lesser Antilles. Pointe-à-Pitre is the commercial heart, with Rue Frébault and the St John Perse market as the main shopping streets.",
  },
  martinique: {
    name: "Martinique",
    country: "Martinique",
    tagline: "Madinina — Island of Flowers",
    intro: "French Caribbean island. Fort-de-France hosts the main boutiques along Rue Victor Hugo and Rue Schoelcher.",
  },
  "saint-lucia": {
    name: "Saint Lucia",
    country: "Saint Lucia",
    tagline: "Helen of the West Indies",
    intro: "English-speaking volcanic island. Castries and Rodney Bay concentrate most clothing and beachwear shops.",
  },
  dominica: {
    name: "Dominica",
    country: "Dominica",
    tagline: "The Nature Island",
    intro: "English-speaking island between Guadeloupe and Martinique. Roseau is the capital and main shopping area.",
  },
};

type Shop = {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  country: string;
  category: string | null;
  official_site: string | null;
  instagram_url: string | null;
  logo_url: string | null;
  image_url: string | null;
  description: string | null;
};

const CATEGORIES = ["All", "Streetwear", "Boutiques", "Beachwear", "Shoes", "Jewellery", "Kids"];

export default function WestIndiesIsland() {
  const { island } = useParams<{ island: string }>();
  const meta = island ? ISLANDS[island] : null;
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    if (!meta) return;
    (async () => {
      const { data } = await supabase
        .from("shops_public")
        .select("id,name,slug,address,city,country,category,official_site,instagram_url,logo_url,image_url,description")
        .eq("country", meta.country)
        .order("name");
      setShops((data as Shop[]) ?? []);
      setLoading(false);
    })();
  }, [meta?.country]);

  const filtered = useMemo(() => {
    if (filter === "All") return shops;
    const map: Record<string, string[]> = {
      Streetwear: ["streetwear", "sneakers", "skate", "contemporary"],
      Boutiques: ["multi_brand", "designer", "vintage"],
      Beachwear: ["swimwear", "beachwear"],
      Shoes: ["sneakers", "shoes"],
      Jewellery: ["jewellery", "accessories"],
      Kids: ["kids"],
    };
    const cats = map[filter] ?? [];
    return shops.filter((s) => s.category && cats.includes(s.category));
  }, [shops, filter]);

  if (!meta) return <Navigate to="/west-indies" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 pt-6 pb-24">
        <Link to="/west-indies" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> West Indies
        </Link>

        <header className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{getCountryFlag(meta.country)}</span>
            <div>
              <h1 className="text-3xl font-bold leading-tight">{meta.name}</h1>
              <div className="text-xs text-muted-foreground">{meta.tagline}</div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">{meta.intro}</p>
        </header>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4 no-scrollbar">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all border ${
                filter === c
                  ? "bg-[hsl(var(--flyaf))] text-white border-[hsl(var(--flyaf))]"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-12">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-12">
            No shops yet. Check back soon — we're adding the {meta.name} guide.
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((s) => (
              <li key={s.id} className="rounded-xl border border-border bg-card p-4 flex gap-3">
                {s.logo_url ? (
                  <img src={s.logo_url} alt={s.name} className="w-14 h-14 rounded-lg object-cover bg-muted shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-muted shrink-0 flex items-center justify-center text-xs text-muted-foreground">
                    {s.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{s.name}</div>
                  {s.address && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-3 h-3 shrink-0" /> {s.address}
                    </div>
                  )}
                  {s.category && (
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                      {s.category.replace(/_/g, " ")}
                    </div>
                  )}
                  <div className="flex gap-3 mt-2">
                    {s.instagram_url && (
                      <a href={s.instagram_url} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                        <Instagram className="w-4 h-4" />
                      </a>
                    )}
                    {s.official_site && (
                      <a href={s.official_site} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                        <Globe className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
