import { isStakingPrecompileTx } from "./monadStaking";

export type TxCategory =
  | "transfer"
  | "approval"
  | "revoked"
  | "swap"
  | "staking"
  | "bridge"
  | "defi"
  | "contract";

/**
 * Lightweight, method-id/heuristic classifier for a native-MON transaction.
 * Used both for the year's activity counters and for the drill-down list,
 * so keep this as the ONE place this logic lives.
 */
export function classifyTx(tx: any): TxCategory {
  // Native validator delegation goes through a fixed-address precompile
  // with no decodable ABI — see monadStaking.ts for why this has to be
  // checked by address rather than by `functionName` text.
  if (isStakingPrecompileTx(tx)) return "staking";

  const method = (tx.methodId || (tx.input || "").slice(0, 10) || "").toLowerCase();
  const fn = (tx.functionName || "").toLowerCase();

  if (method === "0x095ea7b3") {
    // approve(spender, value): value===0 → revoke
    const raw = (tx.input || "").toLowerCase();
    return raw.endsWith("0".repeat(64)) ? "revoked" : "approval";
  }
  if (
    method === "0x38ed1739" ||
    method === "0x7ff36ab5" ||
    method === "0x18cbafe5" ||
    fn.includes("swap")
  ) {
    return "swap";
  }
  // Third-party liquid-staking protocols (Kintsu, Magma, Kiln, etc.) are
  // regular verified contracts, so a `functionName` heuristic can still
  // catch them when the explorer manages to decode it.
  if (fn.includes("stake") || fn.includes("delegate")) return "staking";
  if (fn.includes("bridge") || fn.includes("relay")) return "bridge";
  if (tx.to && tx.input && tx.input !== "0x" && tx.input.length > 2) {
    if (fn.includes("deposit") || fn.includes("withdraw") || fn.includes("liquidity")) {
      return "defi";
    }
    return "contract";
  }
  return "transfer";
}
