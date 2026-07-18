import { BrowserProvider, Contract, parseEther, formatEther, type ContractTransactionReceipt } from "ethers";

/* ============================================================================
 *  MonadWalletReport — on-chain integration
 *
 *  This file is the ONLY place the dApp talks to the smart contract.
 *  The contract is the single source of truth for whether a wallet already
 *  has a report for a given year: nothing is cached in localStorage, so a
 *  user opening the app from a different browser (same wallet) will always
 *  get the same result straight from the blockchain.
 *
 *  Deployed contract (Monad):
 *    0x316Cea81C4D8BBbB9cfF2D432d90CB5d4dc4D6b1
 *
 *  Solidity source (reference):
 *    contract MonadWalletReport {
 *        address public owner;
 *        uint256 public reportPrice = 1 ether;
 *        struct Report { bool exists; uint256 year; uint256 generatedAt; }
 *        mapping(address => mapping(uint256 => Report)) private reports;
 *
 *        event ReportGenerated(address indexed user, uint256 indexed year, uint256 generatedAt);
 *
 *        function generateReport(uint256 year) external payable;
 *        function getReport(uint256 year) external view
 *            returns (bool exists, uint256 reportYear, uint256 generatedAt);
 *        function hasReport(address user, uint256 year) external view returns(bool);
 *        function updatePrice(uint256 newPrice) external; // owner-only
 *    }
 * ========================================================================== */

/**
 * Deployed contract address on Monad.
 * Change this if you redeploy the contract.
 */
const DEFAULT_MONAD_WALLET_REPORT_ADDRESS =
  "0x316Cea81C4D8BBbB9cfF2D432d90CB5d4dc4D6b1";

export const MONAD_WALLET_REPORT_ADDRESS: string =
  import.meta.env.VITE_CONTRACT_ADDRESS || DEFAULT_MONAD_WALLET_REPORT_ADDRESS;

/** Default price to generate a report (matches the contract's initial value). */
export const REPORT_PRICE_MON = "1";

/**
 * ABI for MonadWalletReport — matches the deployed contract signatures.
 * NOTE:
 *   - getReport(uint256 year) uses msg.sender internally, returning
 *     (bool exists, uint256 reportYear, uint256 generatedAt).
 *   - hasReport(address user, uint256 year) is the public accessor for other
 *     wallets / read-only checks.
 */
export const MONAD_WALLET_REPORT_ABI = [
  "function owner() external view returns (address)",
  "function reportPrice() external view returns (uint256)",
  "function generateReport(uint256 year) external payable",
  "function getReport(uint256 year) external view returns (bool exists, uint256 reportYear, uint256 generatedAt)",
  "function hasReport(address user, uint256 year) external view returns (bool)",
  "event ReportGenerated(address indexed user, uint256 indexed year, uint256 generatedAt)",
] as const;

export interface OnChainReport {
  exists: boolean;
  year: number;
  generatedAt: number; // unix seconds
}

function assertConfigured() {
  if (
    !MONAD_WALLET_REPORT_ADDRESS ||
    MONAD_WALLET_REPORT_ADDRESS === "0x0000000000000000000000000000000000000000"
  ) {
    throw new Error(
      "MonadWalletReport contract address is not configured. Set VITE_CONTRACT_ADDRESS in your environment variables"
    );
  }
}

/** Read-only contract instance (no signer needed). */
function readContract(provider: BrowserProvider) {
  assertConfigured();
  return new Contract(MONAD_WALLET_REPORT_ADDRESS, MONAD_WALLET_REPORT_ABI, provider);
}

/** Contract instance connected to the user's signer (for transactions). */
async function writeContract(provider: BrowserProvider) {
  assertConfigured();
  const signer = await provider.getSigner();
  return new Contract(MONAD_WALLET_REPORT_ADDRESS, MONAD_WALLET_REPORT_ABI, signer);
}

/* ------------------------------- Reads ---------------------------------- */

/** Returns true if `user` already has a report generated for `year`. */
export async function checkReportOnChain(
  provider: BrowserProvider,
  user: string,
  year: number
): Promise<boolean> {
  const contract = readContract(provider);
  return await contract.hasReport(user, year);
}

/**
 * Fetches the stored report data for the CONNECTED wallet + `year`.
 * The contract's getReport(year) uses msg.sender internally, so this
 * call must be made through the user's signer (or a provider whose
 * "from" resolves to `user`). We therefore go through the signer here
 * to guarantee the correct msg.sender is used.
 */
export async function getReportOnChain(
  provider: BrowserProvider,
  _user: string, // kept for API compatibility; contract derives from msg.sender
  year: number
): Promise<OnChainReport> {
  // getReport(year) relies on msg.sender inside the contract, so we use the signer.
  const contract = await writeContract(provider);
  const [exists, reportYear, generatedAt] = await contract.getReport(year);
  return {
    exists: Boolean(exists),
    year: Number(reportYear),
    generatedAt: Number(generatedAt),
  };
}

/** Fetches the current report price from the contract, in MON (as a string). */
export async function getReportPriceMon(provider: BrowserProvider): Promise<string> {
  const contract = readContract(provider);
  const price: bigint = await contract.reportPrice();
  return formatEther(price);
}

/* ------------------------------- Writes --------------------------------- */

/**
 * Calls generateReport(year) on the contract, paying the current report price.
 * Waits for the transaction to be mined and returns the receipt.
 */
export async function generateReportOnChain(
  provider: BrowserProvider,
  year: number
): Promise<ContractTransactionReceipt> {
  const contract = await writeContract(provider);

  // Read the up-to-date price from the contract so we always match it,
  // even if the owner has changed it via updatePrice().
  let value: bigint;
  try {
    value = await contract.reportPrice();
  } catch {
    value = parseEther(REPORT_PRICE_MON);
  }

  // The wallet prompt happens on THIS call (contract.generateReport sends
  // the tx). If the user clicks "Reject" — or the wallet otherwise refuses
  // to sign — the promise rejects right here, before anything is ever
  // broadcast, so there is nothing to wait for. Catching it in its own
  // try/catch (instead of letting it bubble up together with mining-time
  // errors from tx.wait()) lets the UI tell the two apart and react to a
  // cancellation immediately instead of only after every other error path
  // has been considered.
  let tx;
  try {
    tx = await contract.generateReport(year, { value });
  } catch (error: any) {
    const code = error?.code ?? error?.error?.code;
    if (code === 4001 || code === "ACTION_REJECTED") {
      console.log("El usuario canceló la transacción en la wallet.");
      const rejection: any = new Error("User rejected the transaction");
      rejection.code = 4001;
      rejection.isUserRejection = true;
      throw rejection;
    }
    console.log("Otro error:", error);
    throw error;
  }

  const receipt = await tx.wait();
  if (!receipt) {
    throw new Error("Transaction did not return a receipt");
  }
  return receipt;
}
