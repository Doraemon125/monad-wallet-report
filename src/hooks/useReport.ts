import { useCallback, useRef, useState } from "react";
import { useWallet } from "@/hooks/use-wallet";
import {
  checkReportOnChain,
  getReportOnChain,
  generateReportOnChain,
  type OnChainReport,
} from "@/lib/contract";

/**
 * useReport — single hook for all MonadWalletReport contract interaction.
 *
 * The blockchain is the only source of truth: nothing here is persisted to
 * localStorage. Every call reads/writes directly through `provider` /
 * `account` from useWallet, so the same wallet on a different browser or
 * device will always resolve to the same on-chain state.
 */
export function useReport() {
  const { provider, account } = useWallet();

  const [report, setReport] = useState<OnChainReport | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref (not state) so the check is synchronous and can't race: guarantees
  // only one real generateReport() wallet request is ever in flight, no
  // matter how many times or from where it gets called.
  const isGeneratingRef = useRef(false);

  /** Returns true if the connected wallet already has a report for `year`. */
  const checkReport = useCallback(
    async (year: number): Promise<boolean> => {
      if (!provider || !account) return false;
      setIsChecking(true);
      setError(null);
      try {
        return await checkReportOnChain(provider, account, year);
      } catch (err: any) {
        setError(err?.message || "Failed to check report on-chain");
        return false;
      } finally {
        setIsChecking(false);
      }
    },
    [provider, account]
  );

  /** Fetches the stored report for `year` from the contract. */
  const getReport = useCallback(
    async (year: number): Promise<OnChainReport | null> => {
      if (!provider || !account) return null;
      setIsChecking(true);
      setError(null);
      try {
        const data = await getReportOnChain(provider, account, year);
        setReport(data);
        return data;
      } catch (err: any) {
        setError(err?.message || "Failed to fetch report on-chain");
        return null;
      } finally {
        setIsChecking(false);
      }
    },
    [provider, account]
  );

  /**
   * Pays and executes generateReport(year) on the contract, waits for
   * confirmation, then re-reads the report so `report` reflects the
   * freshly confirmed on-chain state.
   */
  const generateReport = useCallback(
    async (year: number) => {
      if (!provider || !account) {
        throw new Error("Connect your wallet first");
      }
      // Never let a second call open a second wallet prompt while one is
      // still pending — even if something upstream calls this twice.
      if (isGeneratingRef.current) return;
      isGeneratingRef.current = true;
      setIsGenerating(true);
      setError(null);
      try {
        const receipt = await generateReportOnChain(provider, year);
        const data = await getReportOnChain(provider, account, year);
        setReport(data);
        return receipt;
      } catch (err: any) {
        setError(err?.message || "Failed to generate report");
        throw err;
      } finally {
        isGeneratingRef.current = false;
        setIsGenerating(false);
      }
    },
    [provider, account]
  );

  return {
    report,
    isChecking,
    isGenerating,
    error,
    checkReport,
    getReport,
    generateReport,
  };
}
