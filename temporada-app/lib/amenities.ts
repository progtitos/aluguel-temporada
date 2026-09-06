import {
  Wifi,
  Waves,
  ParkingCircle,
  Flame,
  Snowflake,
  UtensilsCrossed,
  Tv,
  WashingMachine,
  Dog,
  type LucideIcon,
} from "lucide-react";

export type AmenityKey =
  | "wifi"
  | "pool"
  | "parking"
  | "bbq"
  | "ac"
  | "kitchen"
  | "tv"
  | "washer"
  | "pets";

export const AMENITY_OPTIONS: { key: AmenityKey; label: string; icon: LucideIcon }[] = [
  { key: "wifi", label: "Wi-Fi", icon: Wifi },
  { key: "pool", label: "Piscina privativa", icon: Waves },
  { key: "parking", label: "Estacionamento", icon: ParkingCircle },
  { key: "bbq", label: "Churrasqueira", icon: Flame },
  { key: "ac", label: "Ar-condicionado", icon: Snowflake },
  { key: "kitchen", label: "Cozinha equipada", icon: UtensilsCrossed },
  { key: "tv", label: "TV", icon: Tv },
  { key: "washer", label: "Máquina de lavar", icon: WashingMachine },
  { key: "pets", label: "Aceita pets", icon: Dog },
];

export function getAmenity(key: string) {
  return AMENITY_OPTIONS.find((a) => a.key === key);
}
