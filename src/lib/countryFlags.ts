// Convert country name to flag emoji
export const getCountryFlag = (country: string): string => {
  const countryFlags: Record<string, string> = {
    'USA': '🇺🇸',
    'United States': '🇺🇸',
    'UK': '🇬🇧',
    'United Kingdom': '🇬🇧',
    'Japan': '🇯🇵',
    'France': '🇫🇷',
    'Italy': '🇮🇹',
    'Germany': '🇩🇪',
    'Netherlands': '🇳🇱',
    'South Korea': '🇰🇷',
    'Korea': '🇰🇷',
    'Canada': '🇨🇦',
    'China': '🇨🇳',
    'Sweden': '🇸🇪',
    'Denmark': '🇩🇰',
    'Norway': '🇳🇴',
    'Belgium': '🇧🇪',
    'Spain': '🇪🇸',
    'Portugal': '🇵🇹',
    'Australia': '🇦🇺',
  };

  return countryFlags[country] || '🌍';
};
