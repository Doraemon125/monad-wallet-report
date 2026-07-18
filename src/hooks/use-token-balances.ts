import { useEffect, useRef, useState } from "react";
import { Contract, formatUnits } from "ethers";
import { useWallet } from "./use-wallet";
import { KNOWN_TOKENS } from "@/lib/tokens";

const ERC20_BALANCE_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
];

/**
 * Real, current on-chain balances for the "known" ERC-20 tokens (WMON)
 * configured for the connected network. Returns a map of
 * symbol -> balance (as a number) for tokens we could read.
 *
 * Optimisations vs. the previous version (all part of the
 * "reduce RPC + rerender cost" pass):
 *
 *  - In-memory cache keyed by `network:account` so a re-mount of the
 *    dashboard (e.g. switching year in the same session, or a StrictMode
 *    double-render) doesn't fire the RPC again while the answer is
 *    still fresh. TTL is 60s — well below block time on Monad, but
 *    enough to kill duplicate reads inside one interaction.
 *
 *  - `initialData` seeded from the cache so the very first render
 *    already shows the last known value instead of a flicker.
 *
 *  - The effect only re-runs when the meaningful inputs change
 *    (network + account); `provider` is captured via a ref so a new
 *    provider instance from a parent rerender does NOT re-trigger a
 *    balance fetch by itself.
 */

type CacheEntry = { balances: Record<string, number>; ts: number };
const balanceCache = new Map<string, CacheEntry>();
const BALANCE_TTL_MS = 60 * 1000;

function cacheKey(network: string, account: string) {
  return `${network}:${account.toLowerCase()}`;
}

export function useTokenBalances() {
  const { provider, account, network } = useWallet();
  const providerRef = useRef(provider);
  providerRef.current = provider;

  const [balances, setBalances] = useState<Record<string, number>>(() => {
    if (!account) return {};
    const c = balanceCache.get(cacheKey(network, account));
    if (c && Date.now() - c.ts < BALANCE_TTL_MS) return c.balances;
    return {};
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const tokens = KNOWN_TOKENS[network] || [];

    async function run() {
      const prov = providerRef.current;
      if (!prov || !account || tokens.length === 0) {
        setBalances({});
        return;
      }
      const key = cacheKey(network, account);
      const cached = balanceCache.get(key);
      if (cached && Date.now() - cached.ts < BALANCE_TTL_MS) {
        // Fresh enough — reuse and skip the RPC round-trip entirely.
        setBalances(cached.balances);
        return;
      }

      setIsLoading(true);
      try {
        const results = await Promise.all(
          tokens.map(async (token) => {
            try {
              const contract = new Contract(
                token.address,
                ERC20_BALANCE_ABI,
                prov
              );
              const raw = await contract.balanceOf(account);
              return [
                token.symbol,
                Number(formatUnits(raw, token.decimals)),
              ] as const;
            } catch {
              return null;
            }
          })
        );
        if (cancelled) return;
        const map: Record<string, number> = {};
        for (const r of results) {
          if (r) map[r[0]] = r[1];
        }
        balanceCache.set(key, { balances: map, ts: Date.now() });
        setBalances(map);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // We intentionally exclude `provider` from the deps: it can change
    // reference on every parent render, but the actual data we need
    // (network + account) is what determines whether a refetch matters.
  }, [account, network]);

  return { balances, isLoading };
}
