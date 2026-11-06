// Room types as on www.hotelcorali.gr (amenities, floor, "from" price in low season). Texts per language live in
// src/i18n/*.json under rooms.items.<id>; amenity labels under amenities.<key>.
import double from "../assets/rooms/double.jpg";
import deluxeDouble from "../assets/rooms/deluxe-double.jpg";
import deluxeTwin from "../assets/rooms/deluxe-twin.jpg";
import twin from "../assets/rooms/twin.jpg";
import penthouse from "../assets/rooms/penthouse.jpg";

export type Amenity = "ac" | "tv" | "fridge" | "balcony" | "seaView" | "hairdryer" | "wifi" | "soundproof" | "cleaning" | "kitchen" | "coffee" | "oven" | "washer";
export type RoomId = "deluxeDouble" | "deluxeTwin" | "double" | "twin" | "penthouse";

const standard: Amenity[] = ["seaView", "balcony", "ac", "wifi", "tv", "fridge", "hairdryer", "soundproof", "cleaning"];

export const rooms: { id: RoomId; img: ImageMetadata; from: number; floor?: 1 | 2; guests: number; amenities: Amenity[] }[] = [
  { id: "deluxeDouble", img: deluxeDouble, from: 90, floor: 2, guests: 2, amenities: standard },
  { id: "deluxeTwin", img: deluxeTwin, from: 85, floor: 2, guests: 2, amenities: standard },
  { id: "double", img: double, from: 85, floor: 1, guests: 2, amenities: standard },
  { id: "twin", img: twin, from: 80, floor: 1, guests: 2, amenities: standard },
  { id: "penthouse", img: penthouse, from: 180, floor: 2, guests: 0, amenities: ["seaView", "balcony", "kitchen", "ac", "wifi", "tv", "coffee", "oven", "washer", "hairdryer", "soundproof", "cleaning"] },
];
