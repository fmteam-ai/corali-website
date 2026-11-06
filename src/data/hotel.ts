// Hotel facts in one place. Values marked TODO must be confirmed by the hotel before going live.
export const hotel = {
  name: "Hotel Corali",
  url: "https://www.hotelcorali.gr",
  email: "info@hotelcorali.gr",
  phone: "", // TODO: official phone in E.164 form, e.g. "+302284000000" — empty hides it
  address: { street: "Piso Livadi", locality: "Paros", postalCode: "844 00", region: "South Aegean", country: "GR" },
  addressEl: "Πίσω Λιβάδι, Πάρος 844 00",
  geo: { lat: 37.0405, lon: 25.2555 },
  bookingBase: "https://booking.hotelcorali.gr/book",
  social: [] as string[], // TODO: Instagram / Facebook URLs (also used in schema.org sameAs)
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
