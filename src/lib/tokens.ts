import type { Network } from "@/hooks/use-wallet";

export interface KnownToken {
  symbol: string;
  address: string;
  decimals: number;
}

/**
 * Contract addresses for the "known" tokens shown on the Portfolio card
 * (see ReportDashboard.tsx `portfolio`). These are used to read the REAL
 * on-chain balance via `balanceOf`, instead of approximating it from the
 * net inflow/outflow of transfers within the selected year (see bug 1.4
 * in the code review).
 *
 * Addresses are verified against the official Monad token list:
 * https://github.com/monad-crypto/token-list
 *
 * Monad Testnet does not have a single canonical/stable USDC or WMON
 * deployment (several bridges/DEXes each deploy their own), so we don't
 * hardcode possibly-wrong addresses there. On testnet the dashboard falls
 * back to the year-scoped net-flow estimate, clearly labeled as such.
 */
export const KNOWN_TOKENS: Record<Network, KnownToken[]> = {
  mainnet: [
    {
      symbol: "WMON",
      address: "0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A",
      decimals: 18,
    },
  ],
  testnet: [],
};
