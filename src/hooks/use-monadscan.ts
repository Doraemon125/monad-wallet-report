import { useQuery } from '@tanstack/react-query';
import { parseUnits } from 'ethers';
import { useWallet, NETWORKS } from './use-wallet';
import { resolveImageUrl } from '../lib/media';

/* ============================================================
 *  Unified data layer for the Monad Wallet Dashboard.
 *
 *  This hook now supports TWO backends, transparently:
 *
 *  1. Etherscan API V2 (multichain)  — DEFAULT
 *     Base URL: https://api.etherscan.io/v2/api
 *     Uses `chainid=143` (mainnet) or `chainid=10143` (testnet).
 *     Same module/action/apikey shape as the old MonadScan V1.
 *     Docs: https://docs.etherscan.io/v2-migration
 *
 *  2. BlockVision (Monad Indexing API)
 *     Base URL: https://api.blockvision.org/v2/monad
 *     Uses header `x-api-key`. Response shape differs, so we
 *     normalize it to the same MonadScanTx / TokenTx / NftTx
 *     interfaces the UI already consumes.
 *     Docs: https://docs.blockvision.org/reference/welcome-to-blockvision
 *
 *  The `provider` (etherscan|blockvision) is stored in localStorage
 *  under key `monad_api_provider` and defaults to 'etherscan'.
 *
 *  API KEY
 *  A single Etherscan API key is baked into the app (below). There is
 *  no user-facing settings UI for this anymore — every visitor uses
 *  the same working key automatically, so the report never renders
 *  as all-zeros just because someone didn't know to paste their own.
 * ============================================================ */

// ---------- V1-compatible interfaces (UI consumes these) ----------

export interface MonadScanTx {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
  methodId: string;
  functionName: string;
}

export interface MonadScanTokenTx {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  confirmations: string;
  tokenImage?: string; // nuevo — solo poblado por el proveedor BlockVision
}

export interface MonadScanNftTx {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  contractAddress: string;
  to: string;
  tokenID: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  confirmations: string;
  image?: string;           // nuevo — solo poblado por el proveedor BlockVision
  collectionImage?: string; // nuevo — solo poblado por el proveedor BlockVision
}

// ---------- Provider selection ----------

export type ApiProvider = 'etherscan' | 'blockvision';

function readProvider(): ApiProvider {
  if (typeof window === 'undefined') return 'etherscan';
  try {
    const raw = window.localStorage.getItem('monad_api_provider');
    if (!raw) return 'etherscan';
    const parsed = JSON.parse(raw);
    return parsed === 'blockvision' ? 'blockvision' : 'etherscan';
  } catch {
    return 'etherscan';
  }
}

// Etherscan V2 requests are proxied through the Vercel API Route at
// /api/etherscan. The server route injects ETHERSCAN_API_KEY, so the key
// never reaches the browser bundle.
const ETHERSCAN_API_ROUTE = '/api/etherscan';

// ==============================================================
//  ETHERSCAN V2 fetcher (multichain via chainid parameter)
// ==============================================================

async function fetchEtherscanV2(
  chainId: number,
  params: Record<string, string>
): Promise<any[]> {
  const url = new URL(ETHERSCAN_API_ROUTE, window.location.origin);
  url.searchParams.set('chainid', String(chainId));
  Object.entries(params).forEach(([k, v]) => {
    if (k !== 'apikey') url.searchParams.append(k, v);
  });

  const res = await fetch(url.toString());
  const data = await res.json();

  // Etherscan returns status='0' both for real errors AND for "no data"
  // responses (txlist / tokentx / tokennfttx each use a different message,
  // e.g. 'No transactions found', 'No token transfers found'...). Matching
  // on one exact message string breaks for the others. The reliable signal
  // is the shape of `result`: Etherscan always returns `result: []` for an
  // empty-but-valid response, and a string (the error message) for a real
  // error.
  if (data.status === '0' && !Array.isArray(data.result)) {
    throw new Error(
      data.result || data.message || 'Etherscan V2 API error'
    );
  }

  return Array.isArray(data.result) ? data.result : [];
}

/**
 * Etherscan (V1 and V2) caps how many records a single non-paginated call
 * can return (historically ~10,000). For a wallet with heavy activity in
 * the selected year that silently truncates the "annual" report without
 * any error. Follow `page`/`offset` — same defensive-cap pattern already
 * used for BlockVision's cursor — until a page comes back short/empty.
 */
async function fetchEtherscanV2Paginated(
  chainId: number,
  params: Record<string, string>
): Promise<any[]> {
  const PAGE_SIZE = 1000;
  const all: any[] = [];
  for (let page = 1; page <= 100; page++) {
    const records = await fetchEtherscanV2(chainId, {
      ...params,
      page: String(page),
      offset: String(PAGE_SIZE),
    });
    all.push(...records);
    if (records.length < PAGE_SIZE) break; // last page reached
  }
  return all;
}

// ==============================================================
//  BLOCKVISION fetcher + normalizers
// ==============================================================

const BLOCKVISION_BASE = 'https://api.blockvision.org/v2/monad';

async function bvGet(path: string, apiKey: string, params: Record<string, string>) {
  const url = new URL(BLOCKVISION_BASE + path);
  Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      accept: 'application/json',
      'x-api-key': apiKey
    }
  });

  if (!res.ok) {
    // Try to surface backend message
    let msg = `BlockVision HTTP ${res.status}`;
    try {
      const j = await res.json();
      msg = j.message || j.reason || msg;
    } catch {}
    throw new Error(msg);
  }

  const data = await res.json();
  if (data.code !== 0 && data.code !== 200 && data.message && data.message !== 'OK') {
    throw new Error(data.reason || data.message || 'BlockVision API error');
  }
  return data.result || {};
}

// -- normalizers: BlockVision → V1-shape used by the UI ---------

function normalizeBvTxs(bvData: any[]): MonadScanTx[] {
  return (bvData || []).map((t) => ({
    blockNumber: String(t.blockNumber ?? ''),
    // BV returns milliseconds, V1 UI expects seconds
    timeStamp: String(Math.floor((t.timestamp ?? 0) / 1000)),
    hash: t.hash ?? '',
    nonce: String(t.nonce ?? '0'),
    blockHash: t.blockHash ?? '',
    transactionIndex: String(t.transactionIndex ?? '0'),
    from: t.from ?? '',
    to: t.to ?? '',
    value: String(t.value ?? '0'),
    gas: String(t.gasUsed ?? '0'),
    // BV exposes only transactionFee (already computed). We fake a gasPrice
    // of 1 so gasUsed * gasPrice ≈ transactionFee (BigInt-safe as string).
    gasPrice: t.transactionFee ? String(BigInt(Math.floor(Number(t.transactionFee)))) : '0',
    isError: t.status === 0 ? '1' : '0',
    txreceipt_status: t.status === 1 ? '1' : '0',
    input: t.methodID && t.methodID !== '0x' ? t.methodID : '0x',
    contractAddress: t.contractAddress ?? '',
    cumulativeGasUsed: '0',
    gasUsed: String(t.gasUsed ?? '0'),
    confirmations: '0',
    methodId: t.methodID ?? '',
    functionName: t.methodName ?? ''
  }));
}

// BlockVision `/account/tokens` returns *current balances*, not transfers.
// We synthesize one "incoming" transfer per token so the balance-derivation
// code in `NFTTokenViewer` reports the correct current balance without
// changes to the UI.
//
// These synthetic records represent a CURRENT SNAPSHOT, not a historical
// event, so we stamp them with "now" rather than `0`. Previously they used
// timeStamp: '0', which `ReportDashboard`'s `inYear()` filter always
// rejects (0 is treated as "no timestamp") — silently zeroing out
// Holdings/NFTs/Portfolio for every BlockVision user (bug 1.2). Stamping
// them with "now" means they correctly show up only when the CURRENT year
// is selected, which matches what a snapshot can actually represent: we
// have no historical breakdown for prior years from this endpoint.
function normalizeBvTokensAsTransfers(
  bvTokens: any[],
  account: string
): MonadScanTokenTx[] {
  const nowSec = String(Math.floor(Date.now() / 1000));
  return (bvTokens || [])
    .filter((t) => t.contractAddress) // skip native
    .map((t) => {
      const decimals = Number(t.decimal ?? 18);
      // The UI applies formatEther(value) then rescales by 18-decimals.
      // formatEther expects a stringified BigInt in 1e18 units. So we
      // encode the balance as (balance * 10^decimals) and let the UI
      // upscale by (10^(18-decimals)) to end up with `balance`.
      //
      // Using Number/Math.pow to do this (balance * 10**decimals) loses
      // precision for realistic 18-decimal balances well before reaching
      // Number.MAX_SAFE_INTEGER (bug 3.2). `parseUnits` parses the
      // decimal string directly into an exact BigInt instead.
      let raw = '0';
      try {
        raw = parseUnits(String(t.balance ?? '0'), decimals).toString();
      } catch {
        raw = '0';
      }
      return {
        blockNumber: '0',
        timeStamp: nowSec,
        hash: '',
        nonce: '0',
        blockHash: '',
        from: '0x0000000000000000000000000000000000000000',
        contractAddress: t.contractAddress,
        to: account,
        value: raw,
        tokenName: t.name ?? '',
        tokenSymbol: t.symbol ?? '',
        tokenDecimal: String(decimals),
        transactionIndex: '0',
        gas: '0',
        gasPrice: '0',
        gasUsed: '0',
        cumulativeGasUsed: '0',
        input: '0x',
        confirmations: '0',
        tokenImage: resolveImageUrl(t.imageURL)
      };
    });
}

// Same trick for NFTs: BV `/account/nfts` returns collections+items owned,
// we synthesize an incoming transfer per item so the ownership tracker
// (which processes reversed history) still marks them owned. Same
// snapshot-timestamp reasoning as `normalizeBvTokensAsTransfers` above.
function normalizeBvNftsAsTransfers(
  bvCollections: any[],
  account: string
): MonadScanNftTx[] {
  const nowSec = String(Math.floor(Date.now() / 1000));
  const out: MonadScanNftTx[] = [];
  (bvCollections || []).forEach((coll) => {
    (coll.items || []).forEach((it: any) => {
      out.push({
        blockNumber: '0',
        timeStamp: nowSec,
        hash: '',
        nonce: '0',
        blockHash: '',
        from: '0x0000000000000000000000000000000000000000',
        contractAddress: coll.contractAddress ?? it.contractAddress ?? '',
        to: account,
        tokenID: String(it.tokenId ?? ''),
        tokenName: coll.name ?? it.name ?? '',
        tokenSymbol: coll.name ?? '',
        tokenDecimal: '0',
        transactionIndex: '0',
        gas: '0',
        gasPrice: '0',
        gasUsed: '0',
        cumulativeGasUsed: '0',
        input: '0x',
        confirmations: '0',
        image: resolveImageUrl(it.image) ?? resolveImageUrl(coll.image),
        collectionImage: resolveImageUrl(coll.image)
      });
    });
  });
  return out;
}

// ==============================================================
//  UNIFIED FETCHERS
// ==============================================================

/**
 * The dashboard must operate on the complete transaction history.  A partial
 * newest-first page cannot be used to reconstruct a balance at an earlier
 * date: it creates a false opening balance. BlockVision pages at 50 records,
 * so follow its cursor until the history is exhausted (with a defensive cap).
 */
function sortNewestFirst<T extends { timeStamp?: string; blockNumber?: string; transactionIndex?: string; hash?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const time = Number(b.timeStamp || 0) - Number(a.timeStamp || 0);
    if (time) return time;
    const block = Number(b.blockNumber || 0) - Number(a.blockNumber || 0);
    if (block) return block;
    const index = Number(b.transactionIndex || 0) - Number(a.transactionIndex || 0);
    if (index) return index;
    return String(b.hash || '').localeCompare(String(a.hash || ''));
  });
}

async function fetchTxs(
  provider: ApiProvider,
  chainId: number,
  address: string,
  apiKey: string
): Promise<MonadScanTx[]> {
  if (provider === 'blockvision') {
    if (!apiKey) throw new Error('NO_API_KEY: BlockVision API key required.');
    const all: any[] = [];
    let cursor = '';
    // 5,000 is deliberately generous for normal wallets while preventing an
    // accidental endless cursor loop from freezing the UI.
    for (let page = 0; page < 100; page++) {
      const result = await bvGet('/account/transactions', apiKey, {
        address,
        limit: '50',
        ascendingOrder: 'false',
        ...(cursor ? { cursor } : {})
      });
      const records = Array.isArray(result.data) ? result.data : [];
      all.push(...records);
      const next = typeof result.nextPageCursor === 'string' ? result.nextPageCursor : '';
      if (!next || records.length === 0 || next === cursor) break;
      cursor = next;
    }
    return sortNewestFirst(normalizeBvTxs(all));
  }
  // Etherscan V2 — paginated to avoid silently truncating large histories.
  const result = await fetchEtherscanV2Paginated(chainId, {
    module: 'account',
    action: 'txlist',
    address,
    startblock: '0',
    endblock: '99999999',
    sort: 'desc'
  }) as MonadScanTx[];
  // No client-side re-sort needed: the API already returns sort=desc and
  // each page is appended in order.
  return result;
}

/**
 * Internal transactions (module=account, action=txlistinternal).
 *
 * `txlist` only returns top-level, EOA-initiated transactions. Any MON that
 * moves via an INTERNAL call — e.g. a router/aggregator contract forwarding
 * funds, a "batch send" contract distributing MON to many recipients, a
 * bridge releasing funds, a DEX refunding excess value — never shows up
 * there, even though it changes the wallet's real balance.
 *
 * Concretely: `balanceNum` (the live balance, read straight from the RPC)
 * reflects ALL of that. But `yearBalanceEvolution` and `summary` derive
 * historical/aggregate balances by walking `txlist` alone and anchoring to
 * `balanceNum` — so any value that only ever moved through an internal call
 * makes that walk silently wrong: income looks understated, "Opening"
 * balance for a past year gets thrown off by the missing amount, and nothing
 * in the numbers looks internally inconsistent enough to catch on its own.
 *
 * BlockVision's `/account/transactions` is a full indexer response and may
 * already fold internal transfers in — we only special-case Etherscan here,
 * where the gap is a well-known limitation of the raw txlist endpoint.
 */
async function fetchInternalTxs(
  provider: ApiProvider,
  chainId: number,
  address: string
): Promise<MonadScanTx[]> {
  if (provider === 'blockvision') return [];
  const raw = await fetchEtherscanV2Paginated(chainId, {
    module: 'account',
    action: 'txlistinternal',
    address,
    startblock: '0',
    endblock: '99999999',
    sort: 'desc'
  });
  // Normalize into the same MonadScanTx shape the rest of the app expects.
  // Internal calls don't pay their own gas (the parent top-level tx —
  // already present in `txlist` — does), so gas fields are zeroed to avoid
  // double-charging it.
  return (raw as any[]).map((tx) => ({
    blockNumber: tx.blockNumber ?? '0',
    timeStamp: tx.timeStamp ?? '0',
    hash: tx.hash ?? '',
    nonce: '0',
    blockHash: '',
    transactionIndex: tx.traceId ?? '0',
    from: tx.from ?? '',
    to: tx.to ?? '',
    value: tx.value ?? '0',
    gas: tx.gas ?? '0',
    gasPrice: '0',
    isError: tx.isError ?? '0',
    txreceipt_status: tx.isError === '1' ? '0' : '1',
    input: tx.input ?? '',
    contractAddress: tx.contractAddress ?? '',
    cumulativeGasUsed: '0',
    gasUsed: '0',
    confirmations: '0',
    methodId: '',
    functionName: 'internal_transfer',
  }));
}

async function fetchTokenTxs(
  provider: ApiProvider,
  chainId: number,
  address: string,
  apiKey: string
): Promise<MonadScanTokenTx[]> {
  if (provider === 'blockvision') {
    if (!apiKey) throw new Error('NO_API_KEY: BlockVision API key required.');
    const result = await bvGet('/account/tokens', apiKey, { address });
    return sortNewestFirst(normalizeBvTokensAsTransfers(result.data || [], address));
  }
  const result = await fetchEtherscanV2Paginated(chainId, {
    module: 'account',
    action: 'tokentx',
    address,
    startblock: '0',
    endblock: '99999999',
    sort: 'desc'
  }) as MonadScanTokenTx[];
  return result;
}

async function fetchNftTxs(
  provider: ApiProvider,
  chainId: number,
  address: string,
  apiKey: string
): Promise<MonadScanNftTx[]> {
  if (provider === 'blockvision') {
    if (!apiKey) throw new Error('NO_API_KEY: BlockVision API key required.');
    const result = await bvGet('/account/nfts', apiKey, {
      address,
      pageIndex: '1',
      unknown: 'true'
    });
    return sortNewestFirst(normalizeBvNftsAsTransfers(result.data || [], address));
  }
  const result = await fetchEtherscanV2Paginated(chainId, {
    module: 'account',
    action: 'tokennfttx',
    address,
    startblock: '0',
    endblock: '99999999',
    sort: 'desc'
  }) as MonadScanNftTx[];
  return result;
}

// ==============================================================
//  REACT-QUERY HOOKS  (same public API as the original module)
// ==============================================================

/*
 * The Etherscan API key is intentionally not read by the browser.
 * All Etherscan requests go through the Vercel API Route at /api/etherscan.
 * This keeps ETHERSCAN_API_KEY server-side while preserving the existing
 * React Query data layer and UI.
 */

export function useTransactions() {
  const { account, network } = useWallet();
  const chainId = NETWORKS[network].chainId;
  const provider = readProvider();

  return useQuery({
    queryKey: ['txlist', account, network, provider],
    queryFn: () => fetchTxs(provider, chainId, account!, ''),
    enabled: !!account,
    staleTime: 60_000,
    retry: 1
  });
}

export function useInternalTransactions() {
  const { account, network } = useWallet();
  const chainId = NETWORKS[network].chainId;
  const provider = readProvider();

  return useQuery({
    queryKey: ['txlistinternal', account, network, provider],
    queryFn: () => fetchInternalTxs(provider, chainId, account!),
    enabled: !!account,
    staleTime: 60_000,
    retry: 1
  });
}

export function useTokenTransactions() {
  const { account, network } = useWallet();
  const chainId = NETWORKS[network].chainId;
  const provider = readProvider();

  return useQuery({
    queryKey: ['tokentx', account, network, provider],
    queryFn: () => fetchTokenTxs(provider, chainId, account!, ''),
    enabled: !!account,
    staleTime: 60_000,
    retry: 1
  });
}

export function useNftTransactions() {
  const { account, network } = useWallet();
  const chainId = NETWORKS[network].chainId;
  const provider = readProvider();

  return useQuery({
    queryKey: ['tokennfttx', account, network, provider],
    queryFn: () => fetchNftTxs(provider, chainId, account!, ''),
    enabled: !!account,
    staleTime: 60_000,
    retry: 1
  });
}
