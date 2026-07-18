// Normaliza URLs de imagen que vienen de indexers/metadata NFT.
// Compatible con http(s) directo e IPFS (algunas colecciones no
// verificadas devuelven ipfs:// en vez de una URL ya resuelta).

const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://nftstorage.link/ipfs/',
  'https://w3s.link/ipfs/',
];

export function resolveImageUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith('ipfs://')) {
    return `${IPFS_GATEWAYS[0]}${trimmed.replace('ipfs://', '')}`;
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return undefined; // valores raros (data: gigantes, rutas relativas) -> fallback
}

// Algunos gateways IPFS individuales están caídos, saturados o
// rate-limitan seguido, lo que hace que una imagen NFT válida se vea
// como "rota" aunque el CID exista. Dado un src ya resuelto (o crudo)
// que apunta a /ipfs/<cid>, devuelve el resto de gateways conocidos
// para reintentar antes de rendirse y mostrar el ícono de reemplazo.
export function imageFallbacks(src?: string | null): string[] {
  if (!src) return [];
  const match = src.match(/\/ipfs\/(.+)$/);
  if (!match) return [];
  const path = match[1];
  return IPFS_GATEWAYS.map((g) => `${g}${path}`).filter((u) => u !== src);
}
