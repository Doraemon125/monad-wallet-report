/**
 * Monad's native MON staking (delegating to a validator) is handled by a
 * PRECOMPILE, not a regular smart contract — see
 * https://docs.monad.xyz/reference/staking/overview
 *
 * There's no deployed bytecode at this address, so a block explorer has no
 * source to decode `functionName` from the way it can for a normal
 * verified contract. That's why native delegation previously never showed
 * up as "Staking" in this dashboard: the old detection only matched on
 * `functionName` text (works for third-party liquid-staking contracts like
 * Kintsu/Magma, which ARE regular verified contracts) and silently missed
 * every direct delegate/undelegate/withdraw/claimRewards/compound call.
 *
 * Matching on the destination address + the 4-byte function selector is
 * exact and doesn't depend on the explorer decoding anything.
 */
export const STAKING_PRECOMPILE_ADDRESS =
  "0x0000000000000000000000000000000000001000";

// keccak256(signature).slice(0, 10) for each method of IMonadStaking,
// per https://docs.monad.xyz/reference/staking/api
export const STAKING_SELECTORS: Record<string, string> = {
  "0x84994fec": "delegate", // delegate(uint64)
  "0x5cf41514": "undelegate", // undelegate(uint64,uint256,uint8)
  "0xb34fea67": "compound", // compound(uint64)
  "0xaed2ee73": "withdraw", // withdraw(uint64,uint8)
  "0xa76e2ca5": "claimRewards", // claimRewards(uint64)
  "0x9bdcc3c8": "changeCommission", // changeCommission(uint64,uint256)
  "0xe4b3303b": "externalReward", // externalReward(uint64)
  "0xf145204c": "addValidator", // addValidator(bytes,bytes,bytes)
};

export type StakingAction = (typeof STAKING_SELECTORS)[keyof typeof STAKING_SELECTORS];

export function isStakingPrecompileTx(tx: { to?: string | null }): boolean {
  return (tx.to || "").toLowerCase() === STAKING_PRECOMPILE_ADDRESS;
}

/** Returns the decoded staking method name, or null if this isn't a call to the precompile. */
export function getStakingAction(tx: {
  to?: string | null;
  input?: string | null;
}): StakingAction | null {
  if (!isStakingPrecompileTx(tx)) return null;
  const selector = (tx.input || "").slice(0, 10).toLowerCase();
  return (STAKING_SELECTORS[selector] as StakingAction) || null;
}

/**
 * Every staking method we care about takes `validatorId` (uint64) as its
 * first parameter, so it's always the first 32-byte word after the
 * selector — safe to decode generically instead of per-method.
 */
export function getStakingValidatorId(tx: { input?: string | null }): number | null {
  const input = tx.input || "";
  if (input.length < 10 + 64) return null;
  const word = input.slice(10, 10 + 64);
  try {
    const id = BigInt("0x" + word);
    return id <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(id) : null;
  } catch {
    return null;
  }
}
