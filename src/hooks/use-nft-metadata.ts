import { useEffect, useMemo, useState } from 'react';
import { JsonRpcProvider, Contract } from 'ethers';
import { useWallet, NETWORKS } from './use-wallet';
import { resolveImageUrl } from '../lib/media';

/* ==================================================================
 *  On-chain NFT metadata fetcher (Monad-native).
 *
 *  Indexer APIs on Monad (MonadScan / Etherscan V2 tokennfttx) return
 *  transfer events but NOT the NFT image. To surface the real artwork
 *  (Scrumpet, Retard, 10ksquad, Lootie's Logs / LootGo, COMPASS
 *  Genesis, ...) we go straight to the token contract on the Monad RPC
 *  and pull `tokenURI(id)` (ERC-721) / `uri(id)` (ERC-1155), fetch the
 *  metadata JSON, and read its `image` field. Results are cached in
 *  localStorage so a re-render doesn't re-hit the RPC or IPFS.
 *
 *  Everything here is purely additive — we never mutate the incoming
 *  list, only return a `{key -> imageURL}` map the UI merges in.
 * ================================================================ */

// ABI slice covering the two token-URI variants we care about, plus the
// ERC-1155 metadata URI (uri) function. `stateMutability: view` is
// omitted deliberately — some contracts declare them as `pure`, so we
// let ethers infer that.
const NFT_META_ABI = [
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function uri(uint256 id) view returns (string)',
  'function contractURI() view returns (string)',
  'function name() view returns (string)',
];

// IPFS gateway list matches media.ts so a broken gateway can be
// swapped transparently.
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://nftstorage.link/ipfs/',
  'https://w3s.link/ipfs/',
];

function resolveTokenUri(raw: string, tokenId: string): string | null {
  if (!raw) return null;
  let uri = raw.trim();
  if (!uri) return null;

  // ERC-1155 spec uses {id} as a lowercase 64-char hex placeholder.
  if (uri.includes('{id}')) {
    let hex: string;
    try {
      hex = BigInt(tokenId).toString(16).toLowerCase().padStart(64, '0');
    } catch {
      hex = tokenId;
    }
    uri = uri.replace(/\{id\}/g, hex);
  }

  if (uri.startsWith('ipfs://')) {
    return `${IPFS_GATEWAYS[0]}${uri.replace('ipfs://', '')}`;
  }
  if (uri.startsWith('ar://')) {
    return `https://arweave.net/${uri.replace('ar://', '')}`;
  }
  if (uri.startsWith('data:application/json')) {
    return uri; // handled specially below
  }
  if (uri.startsWith('http://') || uri.startsWith('https://')) return uri;
  return null;
}

async function fetchJson(url: string, signal: AbortSignal): Promise<any | null> {
  // data: URI — decode inline instead of fetching.
  if (url.startsWith('data:application/json')) {
    try {
      const idx = url.indexOf(',');
      if (idx < 0) return null;
      const payload = url.slice(idx + 1);
      const isBase64 = /;base64/i.test(url.slice(0, idx));
      const raw = isBase64
        ? atob(payload)
        : decodeURIComponent(payload);
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  // Race the primary URL against a small pool of IPFS gateways when we
  // detect an IPFS CID — same trick CoinFrameImage uses for images, but
  // here it lets slow gateways fail fast instead of blocking the batch.
  const candidates: string[] = [url];
  const cidMatch = url.match(/\/ipfs\/(.+)$/);
  if (cidMatch) {
    IPFS_GATEWAYS.forEach((g) => {
      const alt = `${g}${cidMatch[1]}`;
      if (alt !== url) candidates.push(alt);
    });
  }

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, {
        signal,
        headers: { accept: 'application/json' },
      });
      if (!res.ok) continue;
      // Some gateways return HTML for missing CIDs; check content-type.
      const ct = res.headers.get('content-type') || '';
      const text = await res.text();
      if (ct.includes('json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
        try {
          return JSON.parse(text);
        } catch {
          continue;
        }
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

// ---------- cache ----------

const CACHE_KEY = 'monad_nft_image_cache_v1';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type CacheEntry = { image: string | null; ts: number };
type CacheShape = Record<string, CacheEntry>;

function readCache(): CacheShape {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function writeCache(cache: CacheShape) {
  if (typeof window === 'undefined') return;
  try {
    // Trim: keep only the newest 500 entries so we never blow past
    // localStorage limits on very active wallets.
    const entries = Object.entries(cache);
    if (entries.length > 500) {
      entries.sort((a, b) => b[1].ts - a[1].ts);
      const trimmed = Object.fromEntries(entries.slice(0, 500));
      window.localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
      return;
    }
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota errors — cache is best-effort
  }
}

// ---------- hook ----------

export interface NftItem {
  key: string;
  contract: string;
  tokenId: string;
}

/**
 * Given a list of NFTs (contract + tokenId), returns a `{key -> image URL}`
 * map. The hook resolves images lazily via the Monad public RPC and
 * caches results in localStorage.
 */
export function useNftImages(items: NftItem[]) {
  const { network } = useWallet();
  const rpc = NETWORKS[network].rpc;

  // Stable de-duped signature so `useEffect` doesn't loop on identical
  // arrays that are just recreated on every render.
  const signature = useMemo(() => {
    const seen = new Set<string>();
    const dedup: NftItem[] = [];
    items.forEach((it) => {
      if (!it || !it.contract || !it.key) return;
      if (seen.has(it.key)) return;
      seen.add(it.key);
      dedup.push(it);
    });
    return dedup;
  }, [items]);

  const [images, setImages] = useState<Record<string, string>>(() => {
    // Seed with anything the cache already knows about so the UI shows
    // artwork instantly on subsequent visits.
    const cache = readCache();
    const out: Record<string, string> = {};
    Object.entries(cache).forEach(([k, v]) => {
      if (v.image) out[k] = v.image;
    });
    return out;
  });

  useEffect(() => {
    if (signature.length === 0) return;
    const controller = new AbortController();
    const provider = new JsonRpcProvider(rpc);
    const cache = readCache();
    const now = Date.now();

    // Filter down to items that either aren't cached or whose cache
    // entry is stale.
    const pending = signature.filter((it) => {
      const c = cache[it.key];
      if (!c) return true;
      if (now - c.ts > CACHE_TTL_MS) return true;
      // Cached "null" images (unresolvable) are respected — no point
      // re-hitting the same broken URI every time.
      return false;
    });

    if (pending.length === 0) return;

    let cancelled = false;

    const CONCURRENCY = 4; // gentle on the public RPC + gateways
    const queue = pending.slice();

    async function processOne(item: NftItem) {
      const contract = new Contract(item.contract, NFT_META_ABI, provider);

      // Try ERC-721 tokenURI first, fall back to ERC-1155 uri.
      let rawUri: string | null = null;
      try {
        rawUri = await contract.tokenURI(item.tokenId);
      } catch {
        try {
          rawUri = await contract.uri(item.tokenId);
        } catch {
          rawUri = null;
        }
      }

      let image: string | null = null;
      if (rawUri) {
        const url = resolveTokenUri(rawUri, item.tokenId);
        if (url) {
          const meta = await fetchJson(url, controller.signal);
          if (meta && typeof meta === 'object') {
            const candidate =
              meta.image ||
              meta.image_url ||
              meta.imageUrl ||
              meta.image_data ||
              (meta.properties && (meta.properties.image || meta.properties.image_url));
            image = resolveImageUrl(candidate) || null;
          }
        }
      }

      // Fall back to the collection-level contractURI image if we
      // couldn't resolve a per-token image.
      if (!image) {
        try {
          const cRaw: string = await contract.contractURI();
          if (cRaw) {
            const url = resolveTokenUri(cRaw, item.tokenId);
            if (url) {
              const meta = await fetchJson(url, controller.signal);
              if (meta && typeof meta === 'object') {
                image =
                  resolveImageUrl(
                    meta.image || meta.image_url || meta.imageUrl
                  ) || null;
              }
            }
          }
        } catch {
          // no contractURI
        }
      }

      if (cancelled) return;
      cache[item.key] = { image, ts: Date.now() };
      if (image) {
        setImages((prev) =>
          prev[item.key] === image ? prev : { ...prev, [item.key]: image! }
        );
      }
    }

    async function worker() {
      while (!cancelled && queue.length > 0) {
        const next = queue.shift();
        if (!next) return;
        try {
          await processOne(next);
        } catch {
          // per-item failure never kills the batch
        }
      }
    }

    (async () => {
      const workers = Array.from(
        { length: Math.min(CONCURRENCY, queue.length) },
        () => worker()
      );
      await Promise.all(workers);
      if (!cancelled) writeCache(cache);
    })();

    // Persist partial progress every few seconds so a slow batch still
    // yields visible caching between sessions.
    const flushTimer = setInterval(() => {
      if (!cancelled) writeCache(cache);
    }, 4000);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(flushTimer);
      writeCache(cache);
    };
  }, [signature, rpc]);

  return images;
}
