import { useState } from "react";
import { MapPin, ChevronDown } from "lucide-react";

interface City {
  name: string;
  center: [number, number];
  zoom: number;
}

const CITIES: City[] = [
  { name: "London", center: [-0.1276, 51.5074], zoom: 12 },
  { name: "Paris", center: [2.3522, 48.8566], zoom: 12 },
  { name: "New York", center: [-73.9857, 40.7484], zoom: 12 },
  { name: "Tokyo", center: [139.6917, 35.6895], zoom: 12 },
  { name: "Los Angeles", center: [-118.2437, 34.0522], zoom: 11 },
];

interface CityChipProps {
  onCitySelect: (center: [number, number], zoom: number) => void;
  currentCity?: string;
}

export const CityChip = ({ onCitySelect, currentCity }: CityChipProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState(currentCity || "London");

  return (
    <div className="absolute top-4 lg:top-16 left-1/2 -translate-x-1/2 z-20">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/80 backdrop-blur-md border border-white/10 shadow-lg hover:bg-black/90 transition-all"
      >
        <MapPin className="w-3.5 h-3.5 text-white/70" />
        <span className="text-sm font-semibold text-white tracking-wide">
          {selectedCity}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-white/50 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-[-1]"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 min-w-[160px] rounded-xl bg-black/90 backdrop-blur-md border border-white/10 shadow-xl overflow-hidden">
            {CITIES.map((city) => (
              <button
                key={city.name}
                onClick={() => {
                  onCitySelect(city.center, city.zoom);
                  setSelectedCity(city.name);
                  setIsOpen(false);
                }}
                className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2 ${
                  city.name === selectedCity
                    ? "text-white bg-white/10 font-semibold"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                <MapPin className="w-3 h-3" />
                {city.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};