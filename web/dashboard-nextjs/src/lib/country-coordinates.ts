/** Capital / trade-hub coordinates for commodity flow map [lat, lng]. */
export const BD_TRADE_HUB: [number, number] = [23.685, 90.3563];

const COORDS: Record<string, [number, number]> = {
  BGD: BD_TRADE_HUB,
  IND: [28.6139, 77.209],
  NPL: [27.7172, 85.324],
  MMR: [19.7633, 96.0785],
  PAK: [33.6844, 73.0479],
  THA: [13.7563, 100.5018],
  VNM: [21.0285, 105.8542],
  MYS: [3.139, 101.6869],
  IDN: [-6.2088, 106.8456],
  CHN: [39.9042, 116.4074],
  TUR: [39.9334, 32.8597],
  EGY: [30.0444, 31.2357],
  CAN: [45.4215, -75.6972],
  AUS: [-35.2809, 149.13],
  RUS: [55.7558, 37.6176],
  UKR: [50.4501, 30.5234],
  BRA: [-15.7942, -47.8822],
  ARG: [-34.6037, -58.3816],
  USA: [38.9072, -77.0369],
  QAT: [25.2854, 51.531],
  NLD: [52.3676, 4.9041],
  DEU: [52.52, 13.405],
  GBR: [51.5074, -0.1278],
  SAU: [24.7136, 46.6753],
  UAE: [24.4539, 54.3773],
  ARE: [24.4539, 54.3773],
  KEN: [-1.2921, 36.8219],
  ZAF: [-25.7479, 28.2293],
  JPN: [35.6762, 139.6503],
  KOR: [37.5665, 126.978],
  SGP: [1.3521, 103.8198],
};

const NAME_ALIASES: Record<string, string> = {
  India: "IND",
  Nepal: "NPL",
  Myanmar: "MMR",
  Pakistan: "PAK",
  Thailand: "THA",
  Vietnam: "VNM",
  Malaysia: "MYS",
  Indonesia: "IDN",
  China: "CHN",
  Turkey: "TUR",
  Egypt: "EGY",
  Canada: "CAN",
  Australia: "AUS",
  Russia: "RUS",
  Ukraine: "UKR",
  Brazil: "BRA",
  Argentina: "ARG",
  "United States": "USA",
  Qatar: "QAT",
  Netherlands: "NLD",
  Germany: "DEU",
  "United Kingdom": "GBR",
  "United Arab Emirates": "ARE",
  UAE: "ARE",
  Bangladesh: "BGD",
};

export function resolveCountryCoords(
  countryCode?: string | null,
  countryName?: string | null,
): [number, number] | null {
  if (countryCode && COORDS[countryCode.toUpperCase()]) {
    return COORDS[countryCode.toUpperCase()];
  }
  if (countryName) {
    const code = NAME_ALIASES[countryName];
    if (code) return COORDS[code];
    const hit = Object.entries(COORDS).find(([code]) =>
      countryName.toLowerCase().includes(code.toLowerCase()),
    );
    if (hit) return hit[1];
  }
  return null;
}

export function arcLatLngs(
  from: [number, number],
  to: [number, number],
  steps = 28,
): [number, number][] {
  const [lat1, lng1] = from;
  const [lat2, lng2] = to;
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;
  const dist = Math.hypot(lat2 - lat1, lng2 - lng1);
  const bulge = dist * 0.18;
  const ctrlLat = midLat + bulge;
  const ctrlLng = midLng - bulge * 0.35;
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const lat = u * u * lat1 + 2 * u * t * ctrlLat + t * t * lat2;
    const lng = u * u * lng1 + 2 * u * t * ctrlLng + t * t * lng2;
    points.push([lat, lng]);
  }
  return points;
}
