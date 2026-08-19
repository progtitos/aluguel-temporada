export type GeocodeResult = { lat: number; lon: number; displayName: string };

/**
 * Geocodifica um endereço usando a API pública do Nominatim (OpenStreetMap).
 * Gratuita, sem necessidade de chave de API — ideal para manter a infra
 * 100% free tier. Respeita a política de uso do Nominatim (1 req. pontual,
 * com User-Agent identificado) — chamado apenas quando o admin clica no
 * botão "Buscar coordenadas", nunca automaticamente em massa.
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "br");

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "temporada-app (uso administrativo interno)",
      "Accept-Language": "pt-BR",
    },
    cache: "no-store",
  });

  if (!res.ok) return null;

  const results = (await res.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;

  if (!results || results.length === 0) return null;

  return {
    lat: Number(results[0].lat),
    lon: Number(results[0].lon),
    displayName: results[0].display_name,
  };
}
