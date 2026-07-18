import { useEffect, useState } from 'react';
import { formatEther } from 'ethers';
import { useWallet } from './use-wallet';

/**
 * Native MON balance for the currently connected wallet.
 * Uses the ethers BrowserProvider from `useWallet` — no new dependency added.
 */
export function useNativeBalance() {
  const { provider, account, network } = useWallet();
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!provider || !account) {
        setBalance(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const raw = await provider.getBalance(account);
        if (!cancelled) setBalance(formatEther(raw));
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'Failed to fetch balance');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [provider, account, network]);

  return { balance, isLoading, error };
}
