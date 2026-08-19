type PropertyMapProps = {
  latitude: number | null;
  longitude: number | null;
  addressFull: string | null;
  addressApprox: string | null;
};

export default function PropertyMap({
  latitude,
  longitude,
  addressFull,
  addressApprox,
}: PropertyMapProps) {
  const hasCoordinates = typeof latitude === "number" && typeof longitude === "number";
  const address = addressFull ?? addressApprox;

  if (!hasCoordinates && !address) return null;

  // Prioriza SEMPRE as coordenadas exatas cadastradas no imóvel — zoom 17
  // e o formato "q=lat,lng" garantem um pin preciso no ponto certo, em vez
  // de uma área aproximada. Só cai para busca textual por endereço quando
  // o imóvel ainda não tem latitude/longitude cadastradas (ver botão
  // "Buscar coordenadas pelo endereço" no painel admin).
  const src = hasCoordinates
    ? `https://www.google.com/maps?q=${latitude},${longitude}&z=17&output=embed`
    : `https://www.google.com/maps?q=${encodeURIComponent(address!)}&z=16&output=embed`;

  return (
    <div className="mt-3 overflow-hidden rounded-xl2 border border-forest-100">
      <iframe title="Mapa do imóvel" className="h-64 w-full" loading="lazy" src={src} />
      {!hasCoordinates && (
        <p className="bg-amber-50 px-3 py-1.5 text-xs text-amber-700">
          Localização aproximada pelo endereço — cadastre coordenadas exatas no painel admin
          para um pin mais preciso.
        </p>
      )}
    </div>
  );
}
