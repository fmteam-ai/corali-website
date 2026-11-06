// Hotel facts in one place (source: www.hotelcorali.gr, November 2026).
export const hotel = {
  name: "Hotel Corali",
  url: "https://www.hotelcorali.gr",
  email: "info@hotelcorali.gr",
  phone: "+302284042225",
  phoneDisplay: "+30 22840 42225",
  address: { street: "Piso Livadi", locality: "Paros", postalCode: "844 00", region: "South Aegean", country: "GR" },
  addressEl: "Πίσω Λιβάδι, Πάρος 844 00",
  geo: { lat: 37.034799, lon: 25.257525 },
  bookingBase: "https://booking.hotelcorali.gr/book",
  social: [
    { name: "Instagram", url: "https://www.instagram.com/hotelcorali/" },
    { name: "Facebook", url: "https://www.facebook.com/CoraliHotelParos" },
    { name: "TikTok", url: "https://www.tiktok.com/@hotelcorali" },
    { name: "YouTube", url: "https://www.youtube.com/@coralihotel" },
    { name: "X", url: "https://twitter.com/hotelcorali" },
  ],
  webcam: "https://www.skylinewebcams.com/webcam/ellada/naigaio/kyklades/paros-beach.html",
  reviewsCount: 279,
  distances: { portKm: 18, airportKm: 17 },
};

export const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${hotel.geo.lat},${hotel.geo.lon}`;

/** Booking engine link. utm_source=website is always set; utm_content says which button was used. */
export function bookUrl(lang: string, placement: string, dates?: { checkIn?: string; checkOut?: string }) {
  const u = new URL(hotel.bookingBase);
  u.searchParams.set("lang", lang);
  if (dates?.checkIn) u.searchParams.set("checkIn", dates.checkIn);
  if (dates?.checkOut) u.searchParams.set("checkOut", dates.checkOut);
  u.searchParams.set("utm_source", "website");
  u.searchParams.set("utm_medium", "referral");
  u.searchParams.set("utm_content", placement);
  return u.toString();
}
