// From the Corali PMS beach list (lib/tv-beaches.ts): driving minutes / km from the hotel and the winds each beach is
// sheltered from. Local knowledge wins — the hotel can correct these values.
export type Wind = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
export type Beach = { el: string; latin: string; km: number; minutes: number; sheltered: Wind[] };

export const beaches: Beach[] = [
  { el: "Πίσω Λιβάδι", latin: "Piso Livadi", km: 0.2, minutes: 2, sheltered: ["N", "NW", "W"] },
  { el: "Λογαράς", latin: "Logaras", km: 0.3, minutes: 4, sheltered: ["N", "NW", "W"] },
  { el: "Πούντα", latin: "Pounta", km: 2, minutes: 7, sheltered: ["N", "NW", "W"] },
  { el: "Μώλος", latin: "Molos", km: 4, minutes: 10, sheltered: ["W", "SW", "S"] },
  { el: "Χρυσή Ακτή", latin: "Chrysi Akti (Golden Beach)", km: 5, minutes: 10, sheltered: ["W", "SW", "NW"] },
  { el: "Καλόγερος", latin: "Kalogeros", km: 5, minutes: 12, sheltered: ["W", "SW", "S"] },
  { el: "Νέα Χρυσή Ακτή", latin: "Nea Chrysi Akti", km: 6, minutes: 12, sheltered: ["W", "SW"] },
  { el: "Δρυός / Λολαντώνης", latin: "Drios / Lolantonis", km: 8, minutes: 15, sheltered: ["N", "NW", "W"] },
  { el: "Γλυφά", latin: "Glyfa", km: 9, minutes: 15, sheltered: ["N", "NW", "W"] },
  { el: "Τρυπητή", latin: "Tripiti", km: 10, minutes: 16, sheltered: ["N", "NW", "W"] },
  { el: "Αμπελάς", latin: "Ampelas", km: 12, minutes: 20, sheltered: ["W", "SW", "S"] },
  { el: "Φάραγγας", latin: "Faragas", km: 14, minutes: 18, sheltered: ["N", "NE", "NW"] },
  { el: "Κολυμπήθρες", latin: "Kolymbithres", km: 16, minutes: 30, sheltered: ["E", "SE", "S"] },
  { el: "Σάντα Μαρία", latin: "Santa Maria", km: 16, minutes: 30, sheltered: ["S", "SW", "W"] },
  { el: "Αλυκή", latin: "Aliki", km: 20, minutes: 25, sheltered: ["N", "NE", "NW"] },
];

export const winds: Wind[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
export const windDeg: Record<Wind, number> = { N: 0, NE: 45, E: 90, SE: 135, S: 180, SW: 225, W: 270, NW: 315 };
