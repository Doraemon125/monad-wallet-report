import { memo, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatEther } from "ethers";
import {
  Wallet as WalletIcon,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  Receipt,
  Flame,
  CalendarDays,
  Award,
  Sparkles,
  Coins,
  Layers,
  Vote,
  Image as ImageIcon,
  ArrowLeftRight,
  Shield,
  ShieldCheck,
  PieChart as PieIcon,
  Activity as ActivityIcon,
  FileDown,
  FileJson,
  FileText,
  ExternalLink,
  Repeat,
  Ban,
  Layers3,
  ArrowUpDown,
  Bot,
  CheckCircle2,
  XCircle,
  Fuel,
  Gauge,
  ShieldAlert,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";
import { CoinFrameImage } from "./CoinFrameImage";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import ExcelJS from "exceljs";

import { useWallet, NETWORKS } from "@/hooks/use-wallet";
import { useNativeBalance } from "@/hooks/use-balance";
import { useTokenBalances } from "@/hooks/use-token-balances";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { useI18n } from "@/lib/i18n";
import { classifyTx } from "@/lib/txClassify";
import {
  getStakingAction,
  getStakingValidatorId,
} from "@/lib/monadStaking";
import {
  useTransactions,
  useInternalTransactions,
  useTokenTransactions,
  useNftTransactions,
} from "@/hooks/use-monadscan";
import { useNftImages } from "@/hooks/use-nft-metadata";

interface ReportDashboardProps {
  /**
   * True when this report was already present on the MonadWalletReport
   * contract for the current wallet + year (i.e. the user did not just
   * pay for it in this session). Shows the "Report already generated"
   * badge instead of re-prompting payment.
   */
  alreadyGenerated?: boolean;
  /** Fiscal year this dashboard represents. */
  year: number;
  /** Years the user can switch to. */
  availableYears: number[];
  /** Callback when the user picks a different year (may re-trigger the flow). */
  onYearChange: (y: number) => void;
}

/* ==================================================================
 *  MONAD WALLET REPORT — Premium financial dashboard.
 *
 *  Reuses existing data hooks (useTransactions / useTokenTransactions /
 *  useNftTransactions / useNativeBalance) and derives ALL the premium
 *  sections locally without extra network calls. No mock data.
 * ================================================================ */
export function ReportDashboard({
  alreadyGenerated,
  year,
  availableYears,
  onYearChange,
}: ReportDashboardProps) {
  const { t, lang } = useI18n();
  const { account, network } = useWallet();
  const { balance, isLoading: balanceLoading } = useNativeBalance();
  const { balances: realTokenBalances } = useTokenBalances();
  const {
    data: txList,
    isLoading: txLoading,
    isError: txIsError,
  } = useTransactions();
  const {
    data: internalTxList,
    isLoading: internalTxLoading,
  } = useInternalTransactions();
  const {
    data: tokenTx,
    isLoading: tokenLoading,
    isError: tokenIsError,
  } = useTokenTransactions();
  const {
    data: nftTx,
    isLoading: nftLoading,
    isError: nftIsError,
  } = useNftTransactions();

  const anyLoading = txLoading || internalTxLoading || tokenLoading || nftLoading;

  // If the core data sources failed to load, every metric below is
  // meaningless zeros rather than an accurate "empty wallet" — tell the
  // person why instead of letting them assume the wallet really has no
  // activity. (Internal-tx failures are excluded: that endpoint is a
  // supplementary enrichment and failing there alone shouldn't block the
  // whole report with a scary banner.)
  const dataUnavailable = !anyLoading && (txIsError || tokenIsError || nftIsError);

  const explorer = NETWORKS[network].explorer;

  // Preset zoom range for the Balance Evolution chart — replaces the old
  // drag-handle Brush, which was fiddly on both mouse and touch.
  const [balanceRange, setBalanceRange] = useState<"30d" | "90d" | "all">(
    "all"
  );

  /* ------------------------------------------------------------------
   *  Year window — EVERY metric in the dashboard is scoped to the
   *  selected fiscal year (Jan 1 00:00 → Dec 31 23:59 of `year`).
   *  Wallet-wide data is only used for "Wallet Age" and the current
   *  live balance chip (which is by nature a real-time value).
   * ------------------------------------------------------------------ */
  // Monad mainnet activity for the 2025 report begins on November 24.
  // Other years retain their normal Jan 1 fiscal boundary.
  const yearStartSec = useMemo(
    () => Math.floor(new Date(year, year === 2025 ? 10 : 0, year === 2025 ? 24 : 1).getTime() / 1000),
    [year]
  );
  const yearEndSec = useMemo(
    () => Math.floor(new Date(year + 1, 0, 1).getTime() / 1000),
    [year]
  );
  const inYear = (tsRaw: any) => {
    const ts = parseInt(tsRaw);
    if (!Number.isFinite(ts) || ts <= 0) return false;
    return ts >= yearStartSec && ts < yearEndSec;
  };

  // Financial metrics use confirmed native MON transactions only. Failed/reverted
  // calls and token transfers (including gMONAD) cannot inflate MON cash flow.
  const isConfirmed = (tx: any) =>
    tx?.isError !== "1" && tx?.txreceipt_status !== "0";
  const isGmonad = (tx: any) =>
    String(tx?.tokenSymbol || "").toUpperCase() === "GMONAD";

  // `txlist` only sees TOP-LEVEL transactions. Any MON that moved via an
  // INTERNAL call (a router/batch-sender/bridge contract forwarding funds)
  // is invisible there even though it's part of the wallet's real balance —
  // merging in `txlistinternal` here means every downstream calculation
  // (income, expenses, "Opening"/"Now" in the balance chart) sees the full
  // picture instead of silently under/over-stating it.
  const nativeTxAll = useMemo(
    () => [...((txList as any[]) || []), ...((internalTxList as any[]) || [])],
    [txList, internalTxList]
  );

  // Year-scoped datasets used by every downstream metric.
  const txListYear = useMemo(
    () => nativeTxAll.filter((tx) => inYear(tx.timeStamp) && isConfirmed(tx)),
    [nativeTxAll, yearStartSec, yearEndSec]
  );
  const tokenTxYear = useMemo(
    () => ((tokenTx as any[]) || []).filter((tx) => inYear(tx.timeStamp) && !isGmonad(tx)),
    [tokenTx, yearStartSec, yearEndSec]
  );
  const nftTxYear = useMemo(
    () => ((nftTx as any[]) || []).filter((tx) => inYear(tx.timeStamp)),
    [nftTx, yearStartSec, yearEndSec]
  );

  /* ---------------- Derived metrics (YEAR-SCOPED) ---------------- */
  const summary = useMemo(() => {
    const txs = txListYear.slice();
    const tks = tokenTxYear;
    const nfts = nftTxYear;
    // Wallet age uses the WHOLE history (not just the year) so it stays
    // meaningful — it's a lifetime metric.
    const allTxs = nativeTxAll;
    const me = account?.toLowerCase();

    let income = 0;
    let expenses = 0;
    let gas = 0;
    let firstTs: number | null = null;

    // categorization counters
    let cTransfer = 0;
    let cApproval = 0;
    let cRevoked = 0;
    let cContract = 0;
    let cSwap = 0;
    let cStaking = 0;
    let cBridge = 0;
    let cDefi = 0;

    txs.forEach((tx) => {
      let val = 0;
      try {
        val = parseFloat(formatEther(tx.value || "0"));
      } catch {
        val = 0;
      }
      let g = 0;
      try {
        g = parseFloat(
          formatEther(BigInt(tx.gasUsed || "0") * BigInt(tx.gasPrice || "0"))
        );
      } catch {
        g = 0;
      }

      const isOut = tx.from && tx.from.toLowerCase() === me;
      const isSelfTransfer =
        isOut && tx.to && tx.to.toLowerCase() === me;

      // Gas is always paid by `from`, never by `to` — only count it when
      // this wallet is the sender.
      if (isOut) gas += g;

      // A self-transfer (from === to === this wallet) moves no funds in
      // economic terms; only the gas is a real cost. Counting the full
      // value as an expense would inflate `expenses` and understate `net`.
      if (!isSelfTransfer) {
        if (isOut) expenses += val;
        else income += val;
      }

      // categorization (shared with the drill-down list via classifyTx —
      // see lib/txClassify.ts)
      const cat = classifyTx(tx);
      if (cat === "revoked") cRevoked++;
      else if (cat === "approval") cApproval++;
      else if (cat === "swap") {
        cSwap++;
        cDefi++;
      } else if (cat === "staking") {
        cStaking++;
        cDefi++;
      } else if (cat === "bridge") {
        cBridge++;
      } else if (cat === "defi") {
        cContract++;
        cDefi++;
      } else if (cat === "contract") {
        cContract++;
      } else {
        cTransfer++;
      }
    });

    // NFT tx count (from erc721 transfers dataset)
    const cNft = nfts.length;

    const net = income - expenses;
    const totalTxs = txs.length;

    // Wallet age uses the WHOLE history: date of very first tx ever.
    allTxs.forEach((tx: any) => {
      const ts = parseInt(tx.timeStamp);
      if (ts > 0 && (firstTs === null || ts < firstTs)) firstTs = ts;
    });
    let ageDays = 0;
    if (firstTs) {
      ageDays = Math.max(
        0,
        Math.floor((Date.now() / 1000 - firstTs) / 86400)
      );
    }

    // Wallet Score components (0–25 each)
    const activityScore = Math.min(25, Math.log10(totalTxs + 1) * 12);
    const longevityScore = Math.min(25, (ageDays / 365) * 25);
    const uniqueTokens = new Set(
      tks.map((tx: any) => (tx.contractAddress || "").toLowerCase())
    ).size;
    const uniqueNfts = new Set(
      nfts.map((tx: any) => (tx.contractAddress || "").toLowerCase())
    ).size;
    const diversityScore = Math.min(25, uniqueTokens * 2.5 + uniqueNfts * 2.5);
    const healthNet = net >= 0 ? 15 : 5;
    const approvalPenalty = Math.min(10, cApproval * 0.5);
    const healthScore = Math.max(
      0,
      Math.min(25, healthNet + (10 - approvalPenalty))
    );
    const score = Math.max(
      0,
      Math.min(
        100,
        Math.round(activityScore + longevityScore + diversityScore + healthScore)
      )
    );

    // Health sub-metrics (0–100)
    const security = Math.max(
      0,
      Math.min(100, 100 - cApproval * 6 + cRevoked * 4)
    );
    const diversification = Math.max(
      0,
      Math.min(100, uniqueTokens * 12 + uniqueNfts * 8)
    );
    const activityPct = Math.max(
      0,
      Math.min(100, Math.round(Math.log10(totalTxs + 1) * 40))
    );
    // Gas efficiency: less gas per tx → higher score
    const gasPerTx = totalTxs > 0 ? gas / totalTxs : 0;
    const gasEfficiency = Math.max(
      0,
      Math.min(100, Math.round(100 - Math.min(90, gasPerTx * 1500)))
    );
    // Risk: many approvals + few revokes → high risk
    const risk = Math.max(
      0,
      Math.min(100, cApproval * 7 - cRevoked * 4)
    );

    // Activity year over year (selected year vs previous year, from full history)
    const prevStart = new Date(year - 1, 0, 1).getTime() / 1000;
    const prevEnd = yearStartSec;
    const txsThisYear = totalTxs;
    const txsLastYear = allTxs.filter((tx: any) => {
      const ts = parseInt(tx.timeStamp);
      return ts >= prevStart && ts < prevEnd;
    }).length;
    const activityUp = txsThisYear >= txsLastYear;

    return {
      income,
      expenses,
      net,
      gas,
      totalTxs,
      ageDays,
      score,
      // categories
      cTransfer,
      cApproval,
      cRevoked,
      cContract,
      cSwap,
      cStaking,
      cBridge,
      cDefi,
      cNft,
      // health
      security,
      diversification,
      activityPct,
      gasEfficiency,
      risk,
      // insights
      txsThisYear,
      txsLastYear,
      activityUp,
      uniqueTokens,
      uniqueNfts,
    };
  }, [txListYear, tokenTxYear, nftTxYear, nativeTxAll, account, year, yearStartSec]);

  const balanceNum = balance === null ? 0 : Number(balance);

  // Financial figures use whole-number notation by default (10,500) as
  // requested by the user — the decimal tail is only meaningful for the
  // gas metric, which explicitly passes `digits > 0`. Any caller that
  // wants decimals can still opt in via the `digits` argument.
  const fmtMon = (n: number, digits = 0) =>
    n.toLocaleString("en-US", {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits > 0 ? Math.min(2, digits) : 0,
    });

  /* ---------------- Chart data ---------------- */
  // Donut: expense distribution by category
  const donutData = useMemo(() => {
    const arr = [
      { name: t("chart.legend.defi"), value: summary.cDefi, key: "defi" },
      { name: t("chart.legend.transfers"), value: summary.cTransfer, key: "transfer" },
      { name: t("chart.legend.nfts"), value: summary.cNft, key: "nft" },
      { name: t("chart.legend.approvals"), value: summary.cApproval, key: "approval" },
      { name: t("chart.legend.gas"), value: summary.gas > 0 ? 1 : 0, key: "gas" },
      {
        name: t("chart.legend.other"),
        value: Math.max(0, summary.cContract - summary.cDefi),
        key: "other",
      },
    ].filter((d) => d.value > 0);
    return arr;
  }, [summary, lang]);

  // Chart palette: pulled from --chart-* tokens (defined in index.css)
  // so both themes have a single source of truth for chart color.
  const DONUT_COLORS: Record<string, string> = {
    defi: "hsl(var(--chart-defi))",
    transfer: "hsl(var(--chart-transfers))",
    nft: "hsl(var(--chart-nfts))",
    approval: "hsl(var(--danger))",
    gas: "hsl(var(--warn))",
    other: "hsl(var(--chart-other))",
  };

  // Bar: income vs expenses per quarter of the SELECTED year
  const barData = useMemo(() => {
    const txs = txListYear.slice();
    const buckets = [0, 1, 2, 3].map((q) => ({
      label: `Q${q + 1}`,
      income: 0,
      expenses: 0,
    }));
    const me = account?.toLowerCase();

    txs.forEach((tx) => {
      const ts = parseInt(tx.timeStamp);
      if (!ts) return;
      const d = new Date(ts * 1000);
      const q = Math.min(3, Math.floor(d.getMonth() / 3));
      let val = 0;
      try {
        val = parseFloat(formatEther(tx.value || "0"));
      } catch {
        val = 0;
      }
      const isOut = tx.from && tx.from.toLowerCase() === me;
      const isSelfTransfer = isOut && tx.to && tx.to.toLowerCase() === me;
      if (isSelfTransfer) return;
      if (isOut) buckets[q].expenses += val;
      else buckets[q].income += val;
    });
    return buckets;
  }, [txListYear, account]);

  /* ------------------------------------------------------------------
   *  Year balance evolution
   *
   *  We walk EVERY transaction chronologically to build a RELATIVE series
   *  first (how much moved in/out since the earliest tx we know about —
   *  this has no meaning as a real MON amount on its own). We then anchor
   *  that relative series to the live, real on-chain balance (from the
   *  RPC, via `balanceNum`) so the chart reflects the actual MON the
   *  wallet held over time — instead of pretending the wallet started
   *  the timeline at 0 MON, which is what produced impossible-looking
   *  negative balances before. As a final safety net, a wallet can never
   *  hold negative MON or "owe" the network, so every point is clamped
   *  to a minimum of 0.
   * ------------------------------------------------------------------ */
  const yearBalanceEvolution = useMemo(() => {
    const txs = nativeTxAll.filter(isConfirmed).slice().sort((a, b) => {
      return parseInt(a.timeStamp) - parseInt(b.timeStamp);
    });
    const me = account?.toLowerCase();
    const yearStart = new Date(year, year === 2025 ? 10 : 0, year === 2025 ? 24 : 1).getTime() / 1000;
    const yearEnd = new Date(year + 1, 0, 1).getTime() / 1000;

    let relCum = 0; // relative running total, NOT a real balance yet
    let relAtYearStart = 0;
    let startCaptured = false;
    const rawPoints: { date: string; rel: number; timestamp: number }[] = [];

    txs.forEach((tx) => {
      let val = 0;
      try {
        val = parseFloat(formatEther(tx.value || "0"));
      } catch {
        val = 0;
      }
      let g = 0;
      try {
        g = parseFloat(
          formatEther(BigInt(tx.gasUsed || "0") * BigInt(tx.gasPrice || "0"))
        );
      } catch {
        g = 0;
      }
      const isOut = tx.from && tx.from.toLowerCase() === me;
      const isSelfTransfer = isOut && tx.to && tx.to.toLowerCase() === me;
      // A self-transfer never actually moves funds out of the wallet — only
      // the gas is a real cost. Otherwise: full value out (minus gas) or in.
      const delta = isSelfTransfer ? -g : isOut ? -val - g : val;
      relCum += delta;

      const ts = parseInt(tx.timeStamp);
      if (ts < yearStart) return; // pre-year tx: only update running total
      if (ts >= yearEnd) return;   // ignore anything after the selected year

      if (!startCaptured) {
        // First point of the year = the relative opening balance.
        relAtYearStart = relCum - delta; // BEFORE this tx
        startCaptured = true;
      }

      const d = new Date(ts * 1000);
      rawPoints.push({
        date: d.toLocaleDateString(lang === "es" ? "es-ES" : "en-US", {
          month: "short",
          day: "2-digit",
        }),
        rel: relCum,
        timestamp: ts,
      });
    });

    // Anchor: shift the relative series so it matches the REAL live balance
    // (ground truth from the RPC). `relCum` walks the FULL transaction
    // history (not just the selected year) up to the most recent known tx,
    // so `balanceNum - relCum` is the constant offset that converts ANY
    // point in the relative series into a real MON amount — it is NOT
    // specific to the current year. Restricting it to `year === currentYear`
    // was the bug: for any already-closed past year (e.g. viewing 2025 while
    // "now" is 2026), the anchor stayed 0, and since the unanchored relative
    // series is usually negative (net outflows/gas), every point got
    // clamped to 0 below — producing a flat balance line stuck at 0 MON.
    const currentYear = new Date().getFullYear();
    const anchor = balanceNum - relCum;

    const startBalance = Math.max(0, relAtYearStart + anchor);
    const points = rawPoints.map((p) => ({
      date: p.date,
      balance: Number(Math.max(0, p.rel + anchor).toFixed(4)),
      timestamp: p.timestamp,
    }));

    // Only append the live "Now" point when the selected year is the
    // current one — "now" is only meaningful on the active year.
    if (year === currentYear && points.length > 0) {
      points.push({
        date: lang === "es" ? "Ahora" : "Now",
        balance: Number(Math.max(0, balanceNum).toFixed(4)),
        timestamp: Math.floor(Date.now() / 1000),
      });
    }

    const endBalance =
      points.length > 0 ? points[points.length - 1].balance : startBalance;
    const netChange = endBalance - startBalance;

    return {
      points,
      startBalance: Number(startBalance.toFixed(4)),
      endBalance: Number(endBalance.toFixed(4)),
      netChange: Number(netChange.toFixed(4)),
      year,
    };
  }, [nativeTxAll, account, balanceNum, lang, year]);

  // Points actually rendered in the chart, narrowed by the preset range
  // buttons (30D / 90D / All) instead of a drag-to-zoom Brush.
  const filteredBalancePoints = useMemo(() => {
    const pts = yearBalanceEvolution.points;
    if (balanceRange === "all" || pts.length <= 2) return pts;
    const days = balanceRange === "30d" ? 30 : 90;
    const lastTs = pts[pts.length - 1].timestamp;
    const cutoff = lastTs - days * 86400;
    const filtered = pts.filter((p) => p.timestamp >= cutoff);
    return filtered.length >= 2 ? filtered : pts.slice(-2);
  }, [yearBalanceEvolution.points, balanceRange]);

  /* ------------------------------------------------------------------
   *  Expense breakdown by category (with dust filter)
   *
   *  Same category detection used everywhere else in the dashboard so we
   *  keep a single source of truth. Small transactions (< DUST_THRESHOLD_MON)
   *  and gas are lumped into "other" instead of polluting real categories.
   * ------------------------------------------------------------------ */
  const DUST_THRESHOLD_MON = 50;
  const expenseBreakdown = useMemo(() => {
    const txs = txListYear.slice();
    const me = account?.toLowerCase();
    const buckets: Record<string, { key: string; name: string; value: number }> = {
      defi: { key: "defi", name: t("chart.legend.defi"), value: 0 },
      transfer: { key: "transfer", name: t("chart.legend.transfers"), value: 0 },
      swap: { key: "swap", name: t("txt.category.swap"), value: 0 },
      staking: { key: "staking", name: t("act.staking"), value: 0 },
      bridge: { key: "bridge", name: t("act.bridge"), value: 0 },
      contract: { key: "contract", name: t("txt.category.contract"), value: 0 },
      approval: { key: "approval", name: t("chart.legend.approvals"), value: 0 },
      other: { key: "other", name: t("chart.legend.other"), value: 0 },
    };

    txs.forEach((tx) => {
      const isOut = tx.from && tx.from.toLowerCase() === me;
      if (!isOut) return;
      const isSelfTransfer = tx.to && tx.to.toLowerCase() === me;

      let val = 0;
      try {
        val = parseFloat(formatEther(tx.value || "0"));
      } catch {
        val = 0;
      }
      let g = 0;
      try {
        g = parseFloat(
          formatEther(BigInt(tx.gasUsed || "0") * BigInt(tx.gasPrice || "0"))
        );
      } catch {
        g = 0;
      }

      // Gas ALWAYS lands in "other" (it's a real cost even for self-transfers)
      buckets.other.value += g;

      // A self-transfer moves no funds economically — only the gas above
      // is a real cost, so skip categorizing/summing its `value`.
      if (isSelfTransfer) return;

      // Same category detection used by `summary`
      const method = (tx.methodId || (tx.input || "").slice(0, 10) || "").toLowerCase();
      const fn = (tx.functionName || "").toLowerCase();
      let cat: string;
      if (method === "0x095ea7b3") {
        cat = "approval";
      } else if (
        method === "0x38ed1739" ||
        method === "0x7ff36ab5" ||
        method === "0x18cbafe5" ||
        fn.includes("swap")
      ) {
        cat = "swap";
      } else if (fn.includes("stake") || fn.includes("delegate")) {
        cat = "staking";
      } else if (fn.includes("bridge") || fn.includes("relay")) {
        cat = "bridge";
      } else if (
        tx.to &&
        tx.input &&
        tx.input !== "0x" &&
        tx.input.length > 2
      ) {
        if (
          fn.includes("deposit") ||
          fn.includes("withdraw") ||
          fn.includes("liquidity")
        ) {
          cat = "defi";
        } else {
          cat = "contract";
        }
      } else {
        cat = "transfer";
      }

      // Dust filter: tiny value transactions go straight to "other"
      if (val < DUST_THRESHOLD_MON) {
        buckets.other.value += val;
      } else {
        buckets[cat].value += val;
      }
    });

    // Order: everything with value > 0, "Other" always last.
    const order = ["transfer", "defi", "swap", "staking", "bridge", "contract", "approval", "other"];
    const out = order
      .map((k) => buckets[k])
      .filter((b) => b.value > 0)
      .map((b) => ({ ...b, value: Number(b.value.toFixed(6)) }));
    return out;
  }, [txListYear, account, t]);

  const EXPENSE_COLORS: Record<string, string> = {
    transfer: "hsl(var(--chart-transfers))",
    defi: "hsl(var(--chart-defi))",
    swap: "hsl(var(--chart-swap))",
    staking: "hsl(var(--chart-staking))",
    bridge: "hsl(var(--warn))",
    contract: "hsl(var(--gold-border))",
    approval: "hsl(var(--danger))",
    other: "hsl(var(--chart-other))",
  };

  // Pie: asset distribution (MON native + top tokens by "count of transfers")
  const pieData = useMemo(() => {
    const tks = tokenTxYear.filter((tx: any) => !isGmonad(tx));
    const buckets: Record<string, { name: string; value: number }> = {};
    buckets["MON"] = { name: "MON", value: Math.max(0, balanceNum) };
    tks.forEach((tx: any) => {
      const sym = tx.tokenSymbol || "TOKEN";
      const dec = parseInt(tx.tokenDecimal || "18") || 18;
      let v = 0;
      try {
        v = parseFloat(formatEther(tx.value || "0")) * Math.pow(10, 18 - dec);
      } catch {
        v = 0;
      }
      buckets[sym] = buckets[sym] || { name: sym, value: 0 };
      buckets[sym].value += Math.abs(v);
    });
    const out = Object.values(buckets)
      .filter((b) => b.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
    return out;
  }, [tokenTxYear, balanceNum]);

  const PIE_COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(var(--chart-other))",
  ];

  /* ------------------------------------------------------------------
   *  NFT collection — FULL HISTORY, not year-scoped.
   *
   *  `nftTx` already carries every ERC-721 transfer this wallet was ever
   *  part of (no year filter — see `nftTxYear` above for the year-scoped
   *  version used by the Activity section). We walk it chronologically
   *  per contract+tokenId to figure out, for each NFT the wallet ever
   *  touched, whether it is STILL held right now or was sent away later.
   *  This is what lets the Portfolio card show a real "currently owned"
   *  count instead of a transaction count, and lets the click-through
   *  modal list every NFT the wallet has ever had.
   * ------------------------------------------------------------------ */
  const nftCollection = useMemo(() => {
    const all = ((nftTx as any[]) || [])
      .slice()
      .sort((a, b) => parseInt(a.timeStamp || "0") - parseInt(b.timeStamp || "0"));
    const me = account?.toLowerCase();
    const byToken: Record<
      string,
      {
        key: string;
        contract: string;
        tokenId: string;
        name: string;
        symbol: string;
        firstTs: number;
        lastTs: number;
        lastHash: string;
        held: boolean;
        image?: string;
      }
    > = {};

    all.forEach((tx: any) => {
      const contract = (tx.contractAddress || "").toLowerCase();
      const tokenId = tx.tokenID ?? "";
      const key = `${contract}-${tokenId}`;
      const ts = parseInt(tx.timeStamp || "0");
      const isIn = tx.to && tx.to.toLowerCase() === me;
      const isOut = tx.from && tx.from.toLowerCase() === me;
      if (!byToken[key]) {
        byToken[key] = {
          key,
          contract: tx.contractAddress || "",
          tokenId,
          name: tx.tokenName || tx.tokenSymbol || "NFT",
          symbol: tx.tokenSymbol || "",
          firstTs: ts,
          lastTs: ts,
          lastHash: tx.hash,
          held: false,
        };
      }
      const item = byToken[key];
      item.lastTs = ts;
      item.lastHash = tx.hash;
      if (isIn) item.held = true;
      else if (isOut) item.held = false;
      if (!item.image && tx.image) item.image = tx.image;
    });

    const list = Object.values(byToken).sort((a, b) => {
      // Currently-held pieces first, most recently active first.
      if (a.held !== b.held) return a.held ? -1 : 1;
      return b.lastTs - a.lastTs;
    });
    const heldCount = list.filter((n) => n.held).length;

    return { list, heldCount, everCount: list.length };
  }, [nftTx, account]);

  /* ------------------------------------------------------------------
   *  Enrich the NFT collection with real artwork.
   *
   *  MonadScan / Etherscan V2 `tokennfttx` returns transfer events only,
   *  not the artwork — that's why the previous NFT modal fell back to
   *  the placeholder icon for every collection (Scrumpet, Retard,
   *  10ksquad, Lootie's Logs / LootGo, COMPASS Genesis, ...). We fetch
   *  `tokenURI` / `uri` on-chain via the Monad RPC and merge the images
   *  in here so every card shows the actual piece.
   * ------------------------------------------------------------------ */
  const nftImageInputs = useMemo(
    () =>
      nftCollection.list.map((n) => ({
        key: n.key,
        contract: n.contract,
        tokenId: n.tokenId,
      })),
    [nftCollection.list]
  );
  const nftImageMap = useNftImages(nftImageInputs);
  const nftListWithImages = useMemo(
    () =>
      nftCollection.list.map((n) => {
        const resolved = nftImageMap[n.key];
        return resolved && !n.image ? { ...n, image: resolved } : n;
      }),
    [nftCollection.list, nftImageMap]
  );

  /* ---------------- Portfolio tokens (current live holdings) ---------------- */
  const portfolio = useMemo(() => {
    const tks = tokenTxYear.filter((tx: any) => !isGmonad(tx));
    const me = account?.toLowerCase();
    // Aggregate net inflows per token symbol
    const byToken: Record<
      string,
      {
        symbol: string;
        name: string;
        amount: number;
        contract: string;
        tokenImage?: string;
      }
    > = {};

    tks.forEach((tx: any) => {
      const sym = (tx.tokenSymbol || "").toUpperCase();
      if (!sym) return;
      const dec = parseInt(tx.tokenDecimal || "18") || 18;
      let v = 0;
      try {
        v = parseFloat(formatEther(tx.value || "0")) * Math.pow(10, 18 - dec);
      } catch {
        v = 0;
      }
      const isIn = tx.to && tx.to.toLowerCase() === me;
      const delta = isIn ? v : -v;
      byToken[sym] = byToken[sym] || {
        symbol: sym,
        name: tx.tokenName || sym,
        amount: 0,
        contract: tx.contractAddress || "",
      };
      byToken[sym].amount += delta;
      if (!byToken[sym].tokenImage && tx.tokenImage) {
        byToken[sym].tokenImage = tx.tokenImage;
      }
    });

    // No on-chain price oracle is available on Monad, so we do NOT
    // fabricate USD values or 24h % changes. Each card shows only the
    // real quantity held (or observed net flow).
    const known = ["MON", "WMON"];
    const cards: {
      symbol: string;
      name: string;
      amount: number;
      icon: any;
      hint: string;
      accent: "gold" | "violet" | "green" | "blue";
      image?: string;
    }[] = [];

    // MON: the wallet's average balance across the selected year, not the
    // live snapshot (the live number already has its own "Balance Actual"
    // card above, clearly marked EN VIVO). Approximated as the mean of the
    // reconstructed balance at every point the balance actually changed
    // during {year} — the same series that feeds the balance-evolution
    // chart — rather than a fabricated precise average.
    const monAvgPoints = [
      yearBalanceEvolution.startBalance,
      ...yearBalanceEvolution.points.map((p) => p.balance),
    ];
    const monAvgBalance =
      monAvgPoints.length > 0
        ? monAvgPoints.reduce((s, v) => s + v, 0) / monAvgPoints.length
        : Math.max(0, balanceNum);

    cards.push({
      symbol: "MON",
      name: "Monad",
      amount: Math.max(0, monAvgBalance),
      icon: Coins,
      image: "/assets/token-mon.svg",
      hint: t("port.native.avg", { year }),
      accent: "gold",
    });

    // WMON (and any future "known" symbol) is ALWAYS shown so the user
    // always sees an entry with a proper icon — even when they don't
    // hold any. When the on-chain balance is 0 (or unavailable) we mark
    // the card as "not held" so the coin frame renders tarnished and the
    // status is visually clear.
    known.slice(1).forEach((sym) => {
      const b = byToken[sym];
      const realBalance = realTokenBalances[sym];
      const hasRealBalance = typeof realBalance === "number";
      const amount = hasRealBalance
        ? Math.max(0, realBalance)
        : Math.max(0, b?.amount ?? 0);
      const baseHint = sym === "WMON" ? t("port.wrapped") : t("port.governance");
      cards.push({
        symbol: sym,
        name: b?.name || sym,
        amount,
        icon: sym === "WMON" ? Layers : Vote,
        hint: hasRealBalance ? baseHint : baseHint + t("port.estimate.suffix"),
        accent: sym === "WMON" ? "blue" : "violet",
        image:
          b?.tokenImage ||
          (sym === "WMON" ? "/assets/token-wmon.svg" : undefined),
      });
    });

    // NFTs: real current holdings (derived from full transfer history),
    // not a count of this year's NFT transactions — no fabricated USD value.
    cards.push({
      symbol: "NFTs",
      name: "Collectibles",
      amount: nftCollection.heldCount,
      icon: ImageIcon,
      hint: t("port.nfts.desc"),
      accent: "violet",
    });

    return cards;
  }, [tokenTxYear, account, balanceNum, summary, t, realTokenBalances, nftCollection, yearBalanceEvolution, year]);

  /* ---------------- Health data ---------------- */
  const healthMetrics = [
    {
      label: t("health.security"),
      value: summary.security,
      icon: ShieldCheck,
    },
    {
      label: t("health.diversification"),
      value: summary.diversification,
      icon: Layers3,
    },
    {
      label: t("health.activity"),
      value: summary.activityPct,
      icon: ActivityIcon,
    },
    {
      label: t("health.gas"),
      value: summary.gasEfficiency,
      icon: Fuel,
    },
    {
      label: t("health.risk"),
      value: summary.risk,
      icon: ShieldAlert,
      risk: true,
    },
  ];

  /* ---------------- AI Insights ---------------- */
  const insights = useMemo(() => {
    const out: { text: string; tone: "good" | "warn" | "info" }[] = [];
    if (summary.totalTxs === 0) {
      out.push({ text: t("ins.newborn"), tone: "info" });
      return out;
    }
    const defiPct =
      summary.totalTxs > 0
        ? Math.round((summary.cDefi / summary.totalTxs) * 100)
        : 0;
    if (defiPct > 0) {
      out.push({
        text: t("ins.defi.pct", { pct: defiPct }),
        tone: defiPct > 50 ? "warn" : "info",
      });
    }
    out.push({
      text: summary.activityUp ? t("ins.activity.up") : t("ins.activity.down"),
      tone: summary.activityUp ? "good" : "warn",
    });
    if (summary.diversification >= 40) {
      out.push({ text: t("ins.diversification.good"), tone: "good" });
    } else {
      out.push({ text: t("ins.diversification.low"), tone: "warn" });
    }
    if (summary.gasEfficiency < 70) {
      out.push({ text: t("ins.gas.tip"), tone: "info" });
    }
    if (summary.cApproval > 3) {
      out.push({
        text: t("ins.approvals.warn", { n: summary.cApproval }),
        tone: "warn",
      });
    }
    return out;
  }, [summary, t]);

  /* ---------------- Recent transactions rows (year-scoped) ---------------- */
  const txRows = useMemo(() => {
    const txs = txListYear
      .slice()
      .sort((a: any, b: any) => Number(b.timeStamp || 0) - Number(a.timeStamp || 0))
      .slice(0, 12);
    const me = account?.toLowerCase();
    return txs.map((tx) => {
      const isOut = tx.from && tx.from.toLowerCase() === me;
      const val = (() => {
        try {
          return parseFloat(formatEther(tx.value || "0"));
        } catch {
          return 0;
        }
      })();
      const method = (tx.methodId || (tx.input || "").slice(0, 10) || "").toLowerCase();
      const fn = (tx.functionName || "").toLowerCase();
      let category:
        | "transfer"
        | "approval"
        | "contract"
        | "nft"
        | "swap" = "transfer";
      if (method === "0x095ea7b3") category = "approval";
      else if (fn.includes("swap")) category = "swap";
      else if (fn.includes("nft") || fn.includes("mint")) category = "nft";
      else if (tx.input && tx.input !== "0x" && tx.input.length > 2)
        category = "contract";

      const success = tx.txreceipt_status === "1" || tx.isError === "0";
      const date = new Date(parseInt(tx.timeStamp) * 1000);
      return {
        hash: tx.hash,
        isOut,
        val,
        category,
        success,
        date,
        counterparty: (isOut ? tx.to : tx.from) || "",
      };
    });
  }, [txListYear, account]);

  /* ---------------- Export handlers ---------------- */
  const reportRef = useRef<HTMLDivElement | null>(null);

  const buildJsonReport = () => ({
    generatedAt: new Date().toISOString(),
    wallet: account,
    network: NETWORKS[network].name,
    balance: balanceNum,
    summary: {
      income: summary.income,
      expenses: summary.expenses,
      net: summary.net,
      totalTransactions: summary.totalTxs,
      gasSpent: summary.gas,
      walletAgeDays: summary.ageDays,
      walletScore: summary.score,
    },
    activity: {
      transfers: summary.cTransfer,
      nftTransactions: summary.cNft,
      defiOperations: summary.cDefi,
      approvals: summary.cApproval,
      revokedApprovals: summary.cRevoked,
      staking: summary.cStaking,
      bridge: summary.cBridge,
    },
    health: {
      security: summary.security,
      diversification: summary.diversification,
      activity: summary.activityPct,
      gasEfficiency: summary.gasEfficiency,
      risk: summary.risk,
    },
    year,
    portfolio: portfolio.map(({ icon: _icon, ...rest }) => rest),
    insights: insights.map((i) => i.text),
  });

  const downloadBlob = (data: string, filename: string, mime: string) => {
    const blob = new Blob([data], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    downloadBlob(
      JSON.stringify(buildJsonReport(), null, 2),
      `monad-wallet-report-${account?.slice(2, 8) || "wallet"}.json`,
      "application/json"
    );
  };

  /* ---------- Excel export (ExcelJS) ---------- */
  const handleExportExcel = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = "Monad Wallet Report";
      wb.created = new Date();

      const gold = "FFD4AF37";
      const headerFill: ExcelJS.FillPattern = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: gold },
      };

      // ---- Summary ----
      const sSum = wb.addWorksheet(t("xlsx.sheet.summary"));
      sSum.columns = [
        { header: t("pdf.metric"), key: "metric", width: 30 },
        { header: t("pdf.value"), key: "value", width: 30 },
      ];
      sSum.getRow(1).eachCell((c) => {
        c.fill = headerFill;
        c.font = { bold: true };
      });
      [
        [t("xlsx.wallet"), account || ""],
        [t("xlsx.network"), NETWORKS[network].name],
        [t("xlsx.year"), year],
        [t("xlsx.balance.mon"), balanceNum],
        [t("xlsx.income.mon"), summary.income],
        [t("xlsx.expenses.mon"), summary.expenses],
        [t("xlsx.net.mon"), summary.net],
        [t("xlsx.gas.mon"), summary.gas],
        [t("xlsx.totalTxs"), summary.totalTxs],
        [t("xlsx.age.days"), summary.ageDays],
        [t("xlsx.score"), summary.score],
      ].forEach((r) => sSum.addRow(r));

      // ---- Balance Evolution ----
      const sBal = wb.addWorksheet(t("xlsx.sheet.balance"));
      sBal.columns = [
        { header: t("pdf.date"), key: "date", width: 14 },
        { header: t("xlsx.balance.mon"), key: "balance", width: 20 },
      ];
      sBal.getRow(1).eachCell((c) => {
        c.fill = headerFill;
        c.font = { bold: true };
      });
      sBal.addRow({
        date: t("pdf.opening", { year: yearBalanceEvolution.year }),
        balance: yearBalanceEvolution.startBalance,
      });
      yearBalanceEvolution.points.forEach((p) =>
        sBal.addRow({ date: p.date, balance: p.balance })
      );
      sBal.addRow({
        date: t("pdf.netChange"),
        balance: yearBalanceEvolution.netChange,
      });

      // ---- Expense Breakdown ----
      const sExp = wb.addWorksheet(t("xlsx.sheet.expenses"));
      sExp.columns = [
        { header: t("pdf.category"), key: "category", width: 22 },
        { header: t("pdf.amount.mon"), key: "amount", width: 20 },
      ];
      sExp.getRow(1).eachCell((c) => {
        c.fill = headerFill;
        c.font = { bold: true };
      });
      expenseBreakdown.forEach((b) =>
        sExp.addRow({ category: b.name, amount: b.value })
      );

      // ---- Portfolio ----
      const sPort = wb.addWorksheet(t("xlsx.sheet.portfolio"));
      sPort.columns = [
        { header: t("xlsx.symbol"), key: "symbol", width: 12 },
        { header: t("xlsx.name"), key: "name", width: 22 },
        { header: t("xlsx.amount"), key: "amount", width: 20 },
      ];
      sPort.getRow(1).eachCell((c) => {
        c.fill = headerFill;
        c.font = { bold: true };
      });
      portfolio.forEach((p) =>
        sPort.addRow({ symbol: p.symbol, name: p.name, amount: p.amount })
      );

      const buf = await wb.xlsx.writeBuffer();
      const blob = new Blob([buf], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `monad-wallet-report-${account?.slice(2, 8) || "wallet"}-${year}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[export] excel failed", err);
    }
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const w = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(212, 175, 55);
    doc.rect(0, 0, w, 60, "F");
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(20);
    doc.text(t("pdf.title"), 40, 38);

    doc.setTextColor(70, 70, 70);
    doc.setFontSize(10);
    doc.text(
      t("pdf.wallet.network", {
        wallet: account || "",
        network: NETWORKS[network].name,
      }),
      40,
      80
    );
    doc.text(t("pdf.generated", { date: new Date().toLocaleString() }), 40, 96);

    let y = 120;
    doc.setTextColor(20, 20, 20);
    doc.setFontSize(14);
    doc.text(t("pdf.section.financial"), 40, y);
    y += 6;

    autoTable(doc, {
      startY: y + 4,
      head: [[t("pdf.metric"), t("pdf.value")]],
      body: [
        [t("pdf.metric.balance"), `${fmtMon(balanceNum)} MON`],
        [t("pdf.metric.income"), `${fmtMon(summary.income)} MON`],
        [t("pdf.metric.expenses"), `${fmtMon(summary.expenses)} MON`],
        [t("pdf.metric.net"), `${fmtMon(summary.net)} MON`],
        [t("pdf.metric.gas"), `${fmtMon(summary.gas, 6)} MON`],
        [t("pdf.metric.totalTxs"), summary.totalTxs.toLocaleString()],
        [t("pdf.metric.age"), t("pdf.metric.age.days", { days: summary.ageDays })],
        [t("pdf.metric.score"), `${summary.score}/100`],
      ],
      theme: "grid",
      headStyles: { fillColor: [212, 175, 55], textColor: [30, 30, 30] },
      styles: { fontSize: 10 },
    });

    // Wallet activity
    // @ts-expect-error jspdf-autotable adds lastAutoTable
    y = doc.lastAutoTable.finalY + 22;
    doc.setFontSize(14);
    doc.text(t("pdf.section.activity"), 40, y);

    autoTable(doc, {
      startY: y + 4,
      head: [[t("pdf.category"), t("pdf.count")]],
      body: [
        [t("pdf.activity.transfers"), summary.cTransfer],
        [t("pdf.activity.nft"), summary.cNft],
        [t("pdf.activity.defi"), summary.cDefi],
        [t("pdf.activity.approvals"), summary.cApproval],
        [t("pdf.activity.revoked"), summary.cRevoked],
        [t("pdf.activity.staking"), summary.cStaking],
        [t("pdf.activity.bridge"), summary.cBridge],
      ],
      theme: "striped",
      headStyles: { fillColor: [212, 175, 55], textColor: [30, 30, 30] },
      styles: { fontSize: 10 },
    });

    // Health
    // @ts-expect-error jspdf-autotable
    y = doc.lastAutoTable.finalY + 22;
    doc.setFontSize(14);
    doc.text(t("pdf.section.health"), 40, y);
    autoTable(doc, {
      startY: y + 4,
      head: [[t("pdf.indicator"), t("pdf.score")]],
      body: healthMetrics.map((m) => [m.label, `${m.value}%`]),
      theme: "grid",
      headStyles: { fillColor: [212, 175, 55], textColor: [30, 30, 30] },
      styles: { fontSize: 10 },
    });

    // Balance Evolution
    // @ts-expect-error jspdf-autotable
    y = doc.lastAutoTable.finalY + 22;
    if (y > 700) {
      doc.addPage();
      y = 60;
    }
    doc.setFontSize(14);
    doc.text(t("pdf.section.balanceEvolution", { year }), 40, y);
    autoTable(doc, {
      startY: y + 4,
      head: [[t("pdf.date"), t("pdf.balance.mon")]],
      body: [
        [
          t("pdf.opening", { year: yearBalanceEvolution.year }),
          fmtMon(yearBalanceEvolution.startBalance),
        ],
        ...yearBalanceEvolution.points.map((p) => [p.date, fmtMon(p.balance)]),
        [
          t("pdf.netChange"),
          `${yearBalanceEvolution.netChange >= 0 ? "+" : "−"}${fmtMon(Math.abs(yearBalanceEvolution.netChange))}`,
        ],
      ],
      theme: "grid",
      headStyles: { fillColor: [212, 175, 55], textColor: [30, 30, 30] },
      styles: { fontSize: 9 },
    });

    // Expense Breakdown
    // @ts-expect-error jspdf-autotable
    y = doc.lastAutoTable.finalY + 22;
    if (y > 700) {
      doc.addPage();
      y = 60;
    }
    doc.setFontSize(14);
    doc.text(t("pdf.section.expenses"), 40, y);
    autoTable(doc, {
      startY: y + 4,
      head: [[t("pdf.category"), t("pdf.amount.mon")]],
      body: expenseBreakdown.map((b) => [b.name, fmtMon(b.value)]),
      theme: "striped",
      headStyles: { fillColor: [212, 175, 55], textColor: [30, 30, 30] },
      styles: { fontSize: 10 },
    });

    // AI insights
    // @ts-expect-error jspdf-autotable
    y = doc.lastAutoTable.finalY + 22;
    if (y > 720) {
      doc.addPage();
      y = 60;
    }
    doc.setFontSize(14);
    doc.text(t("pdf.section.insights"), 40, y);
    y += 16;
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    insights.forEach((ins) => {
      const lines = doc.splitTextToSize(`• ${ins.text}`, w - 80);
      doc.text(lines, 40, y);
      y += lines.length * 12 + 2;
    });

    doc.save(
      `monad-wallet-report-${account?.slice(2, 8) || "wallet"}.pdf`
    );
  };

  const { copied, copy: copyToClipboard } = useCopyToClipboard();
  const copyAddr = () => {
    if (!account) return;
    copyToClipboard(account);
  };

  /* ---------- Drill-down modals ----------
   *
   *  Two modal kinds are wired into the dashboard:
   *  - `activityDrill` opens when the user taps a card in the "Wallet
   *    Activity" section. It shows the underlying transactions that
   *    contributed to that category count (year-scoped).
   *  - `walletNowOpen` opens when the user taps any card in ROW 1/2
   *    (Balance / Score / Tx / Gas / Age). It shows the live current
   *    state of the wallet in a single panel.
   */
  const [activityDrill, setActivityDrill] = useState<
    null | { category: string; label: string }
  >(null);
  const [walletNowOpen, setWalletNowOpen] = useState(false);
  // Opens the "all NFTs ever held" modal from the Portfolio NFT card.
  const [nftDrillOpen, setNftDrillOpen] = useState(false);

  // Category detection helper reused by the activity drill-down so the
  // per-card transaction lists match the counts shown on the cards.
  // Classification used by the drill-down list is now the same shared
  // `classifyTx` used above for the yearly counters — no more duplicate
  // logic to keep in sync (see lib/txClassify.ts).
  const categorize = classifyTx;

  const drillRows = useMemo(() => {
    if (!activityDrill) return [];
    const me = account?.toLowerCase();
    const cat = activityDrill.category;
    const source: any[] =
      cat === "nft" ? nftTxYear : txListYear;

    return source
      .filter((tx) => {
        if (cat === "nft") return true;
        if (cat === "transfer") return categorize(tx) === "transfer";
        if (cat === "approval") return categorize(tx) === "approval";
        if (cat === "revoked") return categorize(tx) === "revoked";
        if (cat === "swap") return categorize(tx) === "swap";
        if (cat === "staking") return categorize(tx) === "staking";
        if (cat === "bridge") return categorize(tx) === "bridge";
        // "defi" bucket includes swap + staking + genuine defi hits
        if (cat === "defi") {
          const c = categorize(tx);
          return c === "defi" || c === "swap" || c === "staking";
        }
        return false;
      })
      .slice(0, 100)
      .map((tx: any) => {
        const ts = parseInt(tx.timeStamp || "0");
        const date = new Date(ts * 1000);
        let val = 0;
        try {
          val = parseFloat(formatEther(tx.value || "0"));
        } catch {
          val = 0;
        }
        const isOut = tx.from && tx.from.toLowerCase() === me;
        const stakingAction =
          categorize(tx) === "staking" ? getStakingAction(tx) : null;
        const validatorId =
          stakingAction != null ? getStakingValidatorId(tx) : null;
        return {
          hash: tx.hash,
          date,
          val,
          isOut,
          counterparty: (isOut ? tx.to : tx.from) || "",
          success: tx.txreceipt_status === "1" || tx.isError === "0",
          tokenId: tx.tokenID,
          tokenName: tx.tokenName || tx.tokenSymbol,
          stakingAction,
          validatorId,
        };
      });
  }, [activityDrill, txListYear, nftTxYear, account]);

  // "Datos actuales" panel: quick summary of live wallet state, including
  // whether the user is CURRENTLY staking or has active DeFi positions.
  // Since we don't have an on-chain positions oracle, we approximate
  // "active DeFi / staking" from year-scoped operations counts.
  const walletNow = useMemo(() => {
    return {
      balance: balanceNum,
      score: summary.score,
      txCount: summary.totalTxs,
      gas: summary.gas,
      ageDays: summary.ageDays,
      hasStaking: summary.cStaking > 0,
      hasDefi: summary.cDefi > 0,
      stakingOps: summary.cStaking,
      defiOps: summary.cDefi,
    };
  }, [balanceNum, summary]);

  /* ============================ RENDER ============================ */

  return (
    <div
      ref={reportRef}
      className="relative min-h-[calc(100vh-4rem)] px-4 sm:px-6 lg:px-8 pt-10 pb-32"
    >
      {/* ambient */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-[hsl(var(--gold))]/10 blur-3xl" />
        <div className="absolute top-1/3 right-0 h-80 w-80 rounded-full bg-[hsl(var(--violet))]/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-[hsl(var(--gold))]/8 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-10">
        {/* ============ HERO ============ */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass overflow-hidden"
        >
          <div className="relative bg-gradient-to-br from-[hsl(var(--gold-strong))]/20 via-[hsl(var(--violet))]/10 to-transparent px-6 sm:px-10 py-10 sm:py-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="text-center lg:text-left">
                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--gold-border))] bg-[hsl(var(--card))]/60 backdrop-blur px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.25em] text-[hsl(var(--gold))] shadow-sm">
                    <Sparkles className="h-3 w-3" />
                    {t("dash.hero.badge.year", { year })}
                  </div>
                  {alreadyGenerated && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 backdrop-blur px-4 py-1.5 text-[10px] font-mono uppercase tracking-[0.25em] text-emerald-400 shadow-sm">
                      <CheckCircle2 className="h-3 w-3" />
                      {t("dash.hero.already.year", { year })}
                    </div>
                  )}
                </div>
                <h1 className="mt-4 font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-gold-title" style={{ letterSpacing: "-0.02em" }}>
                  {t("dash.hero.title")} · {year}
                </h1>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                  {t("dash.hero.subtitle")}
                </p>

                {/* Year switcher */}
                <div className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-2">
                  <span className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                    {t("dash.year.switch")}
                  </span>
                  {availableYears.map((y) => {
                    const active = y === year;
                    return (
                      <button
                        key={y}
                        type="button"
                        onClick={() => onYearChange(y)}
                        className={`rounded-md border px-2.5 py-1 text-xs font-mono font-semibold transition-all ${
                          active
                            ? "border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold-strong))]"
                            : "border-[hsl(var(--gold-border))]/50 bg-[hsl(var(--card))]/60 hover:border-[hsl(var(--gold))]/60 hover:bg-[hsl(var(--gold-hover))]"
                        }`}
                      >
                        {y}
                      </button>
                    );
                  })}
                </div>
                {account && (
                  <button
                    onClick={copyAddr}
                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--gold-border))]/60 bg-[hsl(var(--muted))]/30 px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:border-[hsl(var(--gold))] transition-all"
                  >
                    <WalletIcon className="h-3.5 w-3.5 text-[hsl(var(--gold))]" />
                    {account.slice(0, 8)}…{account.slice(-6)}
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-[hsl(var(--gold))]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 opacity-60" />
                    )}
                  </button>
                )}
              </div>

              {/* Export cluster */}
              <div className="flex flex-col items-stretch lg:items-end gap-2">
                <p className="text-[10px] uppercase tracking-[0.28em] font-mono text-[hsl(var(--gold))] text-center lg:text-right">
                  {t("export.title")}
                </p>
                <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2">
                  <button className="btn-export" onClick={handleExportPdf}>
                    <FileText className="h-4 w-4 text-[hsl(var(--danger))]" />
                    {t("export.pdf")}
                  </button>
                  <button className="btn-export" onClick={handleExportExcel}>
                    <FileDown className="h-4 w-4 text-[hsl(var(--success))]" />
                    {t("export.excel")}
                  </button>
                  <button className="btn-export" onClick={handleExportJson}>
                    <FileJson className="h-4 w-4 text-[hsl(var(--violet))]" />
                    {t("export.json")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* ============ DATA UNAVAILABLE BANNER ============ */}
        {dataUnavailable && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-5 py-4 sm:px-6 sm:py-5"
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/15">
                <AlertTriangle className="h-5 w-5 text-rose-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-rose-300">
                  {t("dashboard.dataError.title")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {t("dashboard.dataError.body")}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ============ ROW 1 — Balance / Income / Expenses / Net ============ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            index={0}
            title={t("dash.card.balance")}
            badge={t("dash.scope.live")}
            value={balanceLoading ? null : fmtMon(balanceNum)}
            unit="MON"
            hint={t("dash.card.balance.hint")}
            icon={WalletIcon}
            tone="gold"
            onClick={() => setWalletNowOpen(true)}
          />
          <MetricCard
            index={1}
            title={t("dash.card.income")}
            badge={String(year)}
            value={anyLoading ? null : fmtMon(summary.income)}
            unit="MON"
            hint={t("dash.card.income.hint", { year })}
            icon={ArrowDownLeft}
            tone="green"
            onClick={() => setWalletNowOpen(true)}
          />
          <MetricCard
            index={2}
            title={t("dash.card.expenses")}
            badge={String(year)}
            value={anyLoading ? null : fmtMon(summary.expenses)}
            unit="MON"
            hint={t("dash.card.expenses.hint", { year })}
            icon={ArrowUpRight}
            tone="red"
            onClick={() => setWalletNowOpen(true)}
          />
          <MetricCard
            index={3}
            title={t("dash.card.net")}
            badge={String(year)}
            value={
              anyLoading
                ? null
                : `${summary.net >= 0 ? "+" : "−"}${fmtMon(
                    Math.abs(summary.net)
                  )}`
            }
            unit="MON"
            hint={t("dash.card.net.hint", { year })}
            icon={TrendingUp}
            tone={summary.net >= 0 ? "green" : "red"}
            onClick={() => setWalletNowOpen(true)}
          />
        </div>

        {/* ============ ROW 2 — Tx / Gas / Age / Score ============ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            index={4}
            title={t("dash.card.txcount")}
            badge={String(year)}
            value={anyLoading ? null : summary.totalTxs.toLocaleString()}
            hint={t("dash.card.txcount.hint", { year })}
            icon={Receipt}
            tone="gold"
            onClick={() => setWalletNowOpen(true)}
          />
          <MetricCard
            index={5}
            title={t("dash.card.gas")}
            badge={String(year)}
            value={anyLoading ? null : fmtMon(summary.gas, 6)}
            unit="MON"
            hint={t("dash.card.gas.hint", { year })}
            icon={Flame}
            tone="gold"
            onClick={() => setWalletNowOpen(true)}
          />
          <MetricCard
            index={6}
            title={t("dash.card.age")}
            badge={t("dash.scope.total")}
            value={anyLoading ? null : summary.ageDays.toLocaleString()}
            unit={t("dash.card.age.unit")}
            hint={t("dash.card.age.hint")}
            icon={CalendarDays}
            tone="gold"
            onClick={() => setWalletNowOpen(true)}
          />
          <ScoreCard
            index={7}
            score={summary.score}
            loading={anyLoading}
            onClick={() => setWalletNowOpen(true)}
          />
        </div>

        {/* ============ FINANCIAL CHARTS ============ */}
        <SectionHeader
          eyebrow="01"
          title={t("section.charts.title")}
          subtitle={t("section.charts.subtitle")}
        />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartCard
            title={t("chart.donut.title")}
            icon={PieIcon}
            loading={anyLoading}
            empty={donutData.length === 0}
          >
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={donutData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                >
                  {donutData.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={DONUT_COLORS[entry.key]}
                    />
                  ))}
                </Pie>
                <ReTooltip contentStyle={tooltipStyle()} itemStyle={tooltipItemStyle()} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title={t("chart.bar.title")}
            icon={ActivityIcon}
            loading={anyLoading}
            empty={barData.every((d) => d.income === 0 && d.expenses === 0)}
          >
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--gold-border) / 0.3)"
                />
                <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <ReTooltip contentStyle={tooltipStyle()} itemStyle={tooltipItemStyle()} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="income"
                  name={t("chart.legend.income")}
                  fill="hsl(var(--gold))"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="expenses"
                  name={t("chart.legend.expenses")}
                  fill="hsl(var(--violet))"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title={`${t("chart.area.title")} · ${year}`}
            icon={TrendingUp}
            loading={anyLoading}
            empty={yearBalanceEvolution.points.length < 2}
          >
            {/* Header with year opening / net change / current figures */}
            <div className="mb-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border border-[hsl(var(--gold-border))]/40 bg-[hsl(var(--muted))]/20 px-2 py-2">
                <p className="text-[9px] uppercase tracking-widest font-mono text-muted-foreground">
                  {t("chart.area.start")}
                </p>
                <p className="mt-0.5 text-sm font-mono font-bold text-[hsl(var(--gold))]">
                  {fmtMon(yearBalanceEvolution.startBalance)} MON
                </p>
              </div>
              <div
                className={`rounded-md border px-2 py-2 ${
                  yearBalanceEvolution.netChange >= 0
                    ? "border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/8"
                    : "border-[hsl(var(--danger))]/40 bg-[hsl(var(--danger))]/8"
                }`}
              >
                <p className="text-[9px] uppercase tracking-widest font-mono text-muted-foreground">
                  {t("chart.area.change")}
                </p>
                <p
                  className={`mt-0.5 text-sm font-mono font-bold ${
                    yearBalanceEvolution.netChange >= 0
                      ? "text-[hsl(var(--success))]"
                      : "text-[hsl(var(--danger))]"
                  }`}
                >
                  {yearBalanceEvolution.netChange >= 0 ? "+" : "−"}
                  {fmtMon(Math.abs(yearBalanceEvolution.netChange))} MON
                </p>
              </div>
              <div className="rounded-md border border-[hsl(var(--gold-border))]/40 bg-[hsl(var(--muted))]/20 px-2 py-2">
                <p className="text-[9px] uppercase tracking-widest font-mono text-muted-foreground">
                  {yearBalanceEvolution.year === new Date().getFullYear()
                    ? t("chart.area.end")
                    : t("chart.area.end.eoy", { year: yearBalanceEvolution.year })}
                </p>
                <p className="mt-0.5 text-sm font-mono font-bold text-[hsl(var(--gold-strong))]">
                  {fmtMon(yearBalanceEvolution.endBalance)} MON
                </p>
              </div>
            </div>

            {/* Range selector — tap a preset instead of dragging handles. */}
            {yearBalanceEvolution.points.length > 5 && (
              <div className="mb-3 flex items-center justify-center lg:justify-end gap-1.5">
                <span className="text-[9px] uppercase tracking-widest font-mono text-muted-foreground mr-1">
                  {t("chart.range.label")}
                </span>
                {(["30d", "90d", "all"] as const).map((r) => {
                  const active = balanceRange === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setBalanceRange(r)}
                      className={`rounded-md border px-2.5 py-1 text-[10px] font-mono font-semibold transition-all ${
                        active
                          ? "border-[hsl(var(--gold))] bg-[hsl(var(--gold))]/15 text-[hsl(var(--gold-strong))]"
                          : "border-[hsl(var(--gold-border))]/50 bg-[hsl(var(--card))]/60 hover:border-[hsl(var(--gold))]/60 hover:bg-[hsl(var(--gold-hover))]"
                      }`}
                    >
                      {t(`chart.range.${r}`)}
                    </button>
                  );
                })}
              </div>
            )}
            <ResponsiveContainer width="100%" height={filteredBalancePoints.length > 3 ? 250 : 210}>
              <AreaChart data={filteredBalancePoints}>
                <defs>
                  <linearGradient id="balArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--gold))" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="hsl(var(--gold))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--gold-border) / 0.3)"
                />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} unit=" MON" />
                <ReTooltip
                  contentStyle={tooltipStyle()}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                  itemStyle={{ color: "hsl(var(--gold-strong))" }}
                  formatter={(v: any) => [`${fmtMon(Number(v))} MON`, t("chart.legend.balance")]}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  name={t("chart.legend.balance")}
                  stroke="hsl(var(--gold-strong))"
                  strokeWidth={2}
                  fill="url(#balArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* ============ EXPENSE BREAKDOWN (dust-filtered donut) ============ */}
          <ChartCard
            title={t("chart.expense.title")}
            icon={PieIcon}
            loading={anyLoading}
            empty={expenseBreakdown.length === 0}
            footnote={t("chart.expense.dustNote", { n: DUST_THRESHOLD_MON })}
          >
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={expenseBreakdown}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                >
                  {expenseBreakdown.map((entry) => (
                    <Cell key={entry.key} fill={EXPENSE_COLORS[entry.key]} />
                  ))}
                </Pie>
                <ReTooltip
                  contentStyle={tooltipStyle()}
                  itemStyle={tooltipItemStyle()}
                  formatter={(v: any) => `${fmtMon(Number(v))} MON`}
                />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title={t("chart.pie.title")}
            icon={PieIcon}
            loading={anyLoading}
            empty={pieData.length === 0}
          >
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={95}
                  paddingAngle={2}
                  stroke="hsl(var(--card))"
                  strokeWidth={2}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <ReTooltip contentStyle={tooltipStyle()} itemStyle={tooltipItemStyle()} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* ============ ASSET PORTFOLIO ============ */}
        <SectionHeader
          eyebrow="02"
          title={t("section.portfolio.title")}
          subtitle={t("section.portfolio.subtitle", { year })}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(anyLoading ? Array.from({ length: 5 }) : portfolio).map((_, i) =>
            anyLoading ? (
              <div key={i} className="asset-card">
                <div className="sk h-9 w-9 rounded-lg" />
                <div className="sk h-6 w-24" />
                <div className="sk h-4 w-20" />
              </div>
            ) : (
              <AssetCard
                key={portfolio[i].symbol}
                data={portfolio[i]}
                index={i}
                t={t}
                onClick={
                  portfolio[i].symbol === "NFTs"
                    ? () => setNftDrillOpen(true)
                    : undefined
                }
              />
            )
          )}
        </div>

        {/* ============ WALLET ACTIVITY ============ */}
        <SectionHeader
          eyebrow="03"
          title={t("section.activity.title")}
          subtitle={t("section.activity.subtitle")}
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <ActivityCard
            title={t("act.transfers")}
            value={summary.cTransfer}
            icon={ArrowLeftRight}
            loading={anyLoading}
            index={0}
            onClick={() =>
              setActivityDrill({ category: "transfer", label: t("act.transfers") })
            }
          />
          <ActivityCard
            title={t("act.nft")}
            value={summary.cNft}
            icon={ImageIcon}
            loading={anyLoading}
            index={1}
            onClick={() =>
              setActivityDrill({ category: "nft", label: t("act.nft") })
            }
          />
          <ActivityCard
            title={t("act.defi")}
            value={summary.cDefi}
            icon={Repeat}
            loading={anyLoading}
            index={2}
            onClick={() =>
              setActivityDrill({ category: "defi", label: t("act.defi") })
            }
          />
          <ActivityCard
            title={t("act.approvals")}
            value={summary.cApproval}
            icon={Shield}
            loading={anyLoading}
            index={3}
            onClick={() =>
              setActivityDrill({ category: "approval", label: t("act.approvals") })
            }
          />
          <ActivityCard
            title={t("act.revoked")}
            value={summary.cRevoked}
            icon={Ban}
            loading={anyLoading}
            index={4}
            onClick={() =>
              setActivityDrill({ category: "revoked", label: t("act.revoked") })
            }
          />
          <ActivityCard
            title={t("act.staking")}
            value={summary.cStaking}
            icon={Layers3}
            loading={anyLoading}
            index={5}
            onClick={() =>
              setActivityDrill({ category: "staking", label: t("act.staking") })
            }
          />
          <ActivityCard
            title={t("act.bridge")}
            value={summary.cBridge}
            icon={ArrowUpDown}
            loading={anyLoading}
            index={6}
            onClick={() =>
              setActivityDrill({ category: "bridge", label: t("act.bridge") })
            }
          />
          <ActivityCard
            title={t("txt.category.swap")}
            value={summary.cSwap}
            icon={Repeat}
            loading={anyLoading}
            index={7}
            onClick={() =>
              setActivityDrill({ category: "swap", label: t("txt.category.swap") })
            }
          />
        </div>

        {/* ============ WALLET HEALTH + AI INSIGHTS ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <SectionHeader
              eyebrow="04"
              title={t("section.health.title")}
              subtitle={t("section.health.subtitle")}
            />
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="glass p-6 space-y-4"
            >
              {healthMetrics.map((m) => (
                <div key={m.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-md bg-[hsl(var(--gold))]/12 border border-[hsl(var(--gold-border))] text-[hsl(var(--gold-strong))] flex items-center justify-center">
                        <m.icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-sm font-semibold">{m.label}</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[hsl(var(--gold-strong))]">
                      {anyLoading ? "—" : `${m.value}%`}
                    </span>
                  </div>
                  <div className={`health-bar ${m.risk ? "risk" : ""}`}>
                    <motion.span
                      initial={{ width: 0 }}
                      animate={{ width: anyLoading ? 0 : `${m.value}%` }}
                      transition={{ duration: 1.1, ease: "easeOut" }}
                      style={{ display: "block", height: "100%" }}
                    />
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          <div>
            <SectionHeader
              eyebrow="05"
              title={t("section.insights.title")}
              subtitle={t("section.insights.subtitle")}
            />
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="glass p-6 space-y-3 relative overflow-hidden"
            >
              <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-[hsl(var(--violet))]/15 blur-3xl" />
              <div className="relative flex items-center gap-2 mb-1">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[hsl(var(--violet-strong))] to-[hsl(var(--violet))] flex items-center justify-center shadow-md">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-violet-title">AI Assistant</p>
                  <p className="text-[10px] text-muted-foreground">
                    Heuristic engine
                  </p>
                </div>
              </div>
              {anyLoading ? (
                <>
                  <div className="sk h-4 w-full" />
                  <div className="sk h-4 w-5/6" />
                  <div className="sk h-4 w-4/5" />
                </>
              ) : (
                insights.map((ins, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + i * 0.08 }}
                    className={`relative flex items-start gap-3 rounded-lg border p-3 text-sm ${
                      ins.tone === "good"
                        ? "border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/8"
                        : ins.tone === "warn"
                        ? "border-[hsl(var(--warn))]/40 bg-[hsl(var(--warn))]/8"
                        : "border-[hsl(var(--gold-border))] bg-[hsl(var(--muted))]/25"
                    }`}
                  >
                    <span
                      className={`mt-0.5 h-5 w-5 shrink-0 rounded-full flex items-center justify-center ${
                        ins.tone === "good"
                          ? "bg-[hsl(var(--success))]/20 text-[hsl(var(--success))]"
                          : ins.tone === "warn"
                          ? "bg-[hsl(var(--warn))]/20 text-[hsl(var(--warn))]"
                          : "bg-[hsl(var(--violet))]/20 text-[hsl(var(--violet))]"
                      }`}
                    >
                      <Sparkles className="h-3 w-3" />
                    </span>
                    <span className="text-foreground/90 leading-relaxed">{ins.text}</span>
                  </motion.div>
                ))
              )}
            </motion.div>
          </div>
        </div>

        {/* ============ RECENT TRANSACTIONS ============ */}
        <SectionHeader
          eyebrow="06"
          title={`${t("section.tx.title")} · ${year}`}
          subtitle={t("section.tx.subtitle", {
            shown: txRows.length,
            total: summary.totalTxs,
            year,
          })}
        />
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass overflow-hidden"
        >
          <div className="overflow-x-auto tx-scroll">
            <table className="tx-table w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground border-b border-[hsl(var(--gold-border))]/50">
                  <th className="text-left px-5 py-3">{t("txt.type")}</th>
                  <th className="text-left px-5 py-3">{t("txt.category")}</th>
                  <th className="text-left px-5 py-3">{t("txt.date")}</th>
                  <th className="text-right px-5 py-3">{t("txt.amount")}</th>
                  <th className="text-left px-5 py-3">{t("txt.status")}</th>
                  <th className="text-left px-5 py-3">{t("txt.hash")}</th>
                </tr>
              </thead>
              <tbody>
                {anyLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-[hsl(var(--gold-border))]/25">
                      <td className="px-5 py-4"><div className="sk h-6 w-14" /></td>
                      <td className="px-5 py-4"><div className="sk h-4 w-20" /></td>
                      <td className="px-5 py-4"><div className="sk h-4 w-24" /></td>
                      <td className="px-5 py-4"><div className="sk h-4 w-16 ml-auto" /></td>
                      <td className="px-5 py-4"><div className="sk h-5 w-16" /></td>
                      <td className="px-5 py-4"><div className="sk h-4 w-20" /></td>
                    </tr>
                  ))
                ) : txRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-5 py-10 text-center text-sm text-muted-foreground italic"
                    >
                      {t("txt.empty")}
                    </td>
                  </tr>
                ) : (
                  txRows.map((row) => (
                    <tr
                      key={row.hash}
                      className="border-b border-[hsl(var(--gold-border))]/25"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-7 w-7 rounded-md flex items-center justify-center border ${
                              row.isOut
                                ? "bg-[hsl(var(--danger))]/12 border-[hsl(var(--danger))]/40 text-[hsl(var(--danger))]"
                                : "bg-[hsl(var(--success))]/12 border-[hsl(var(--success))]/40 text-[hsl(var(--success))]"
                            }`}
                          >
                            {row.isOut ? (
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDownLeft className="h-3.5 w-3.5" />
                            )}
                          </span>
                          <span className="text-xs font-semibold">
                            {row.isOut ? "OUT" : "IN"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <CategoryBadge cat={row.category} t={t} />
                      </td>
                      <td className="px-5 py-3 text-xs text-muted-foreground font-mono whitespace-nowrap">
                        {row.date.toLocaleDateString(
                          lang === "es" ? "es-ES" : "en-US",
                          { year: "numeric", month: "short", day: "2-digit" }
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-semibold">
                        <span
                          className={
                            row.isOut
                              ? "text-[hsl(var(--danger))]"
                              : "text-[hsl(var(--success))]"
                          }
                        >
                          {row.isOut ? "−" : "+"}
                          {fmtMon(row.val)}
                        </span>
                        <span className="ml-1 text-[10px] text-muted-foreground">MON</span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`badge-status ${row.success ? "success" : "failed"}`}
                        >
                          {row.success ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              {t("txt.status.success")}
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              {t("txt.status.failed")}
                            </>
                          )}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <a
                          href={`${explorer}/tx/${row.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-mono text-[hsl(var(--gold))] hover:text-[hsl(var(--gold-strong))] hover:underline"
                        >
                          {row.hash.slice(0, 6)}…{row.hash.slice(-4)}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-center text-[11px] text-muted-foreground/70 pt-2"
        >
          {t("dash.footer.note")}
        </motion.p>
      </div>

      {/* ============ DRILL-DOWN MODALS ============ */}
      <AnimatePresence>
        {activityDrill && (
          <DrillModal
            title={activityDrill.label}
            subtitle={`${t("dash.hero.badge.year", { year })} · ${
              drillRows.length
            } ${t("txt.type")}`}
            onClose={() => setActivityDrill(null)}
          >
            {drillRows.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground italic">
                {t("txt.empty")}
              </div>
            ) : (
              <ul className="divide-y divide-[hsl(var(--gold-border))]/30">
                {drillRows.map((row: any) => (
                  <li
                    key={`${row.hash}-${row.tokenId ?? ""}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[hsl(var(--gold-hover))]/40 transition-colors"
                  >
                    <div
                      className={`h-9 w-9 rounded-lg shrink-0 flex items-center justify-center border ${
                        row.isOut
                          ? "bg-[hsl(var(--danger))]/12 border-[hsl(var(--danger))]/40 text-[hsl(var(--danger))]"
                          : "bg-[hsl(var(--success))]/12 border-[hsl(var(--success))]/40 text-[hsl(var(--success))]"
                      }`}
                    >
                      {row.isOut ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownLeft className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-mono text-muted-foreground truncate">
                        {row.date.toLocaleString(
                          lang === "es" ? "es-ES" : "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                      <p className="text-xs font-mono text-foreground/80 truncate">
                        {row.stakingAction
                          ? `${t(`staking.action.${row.stakingAction}`)}${
                              row.validatorId != null
                                ? ` → ${t("staking.validator", { id: row.validatorId })}`
                                : ""
                            }`
                          : row.tokenName
                          ? `${row.tokenName}${row.tokenId ? ` #${row.tokenId}` : ""}`
                          : row.counterparty
                          ? `${row.counterparty.slice(0, 8)}…${row.counterparty.slice(-6)}`
                          : "—"}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {row.val > 0 && (
                        <p
                          className={`text-xs font-mono font-bold ${
                            row.isOut
                              ? "text-[hsl(var(--danger))]"
                              : "text-[hsl(var(--success))]"
                          }`}
                        >
                          {row.isOut ? "−" : "+"}
                          {fmtMon(row.val)}
                          <span className="ml-1 text-[9px] text-muted-foreground">
                            MON
                          </span>
                        </p>
                      )}
                      {row.hash && (
                        <a
                          href={`${explorer}/tx/${row.hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-mono text-[hsl(var(--gold))] hover:text-[hsl(var(--gold-strong))] mt-0.5"
                        >
                          {row.hash.slice(0, 6)}…{row.hash.slice(-4)}
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </DrillModal>
        )}

        {walletNowOpen && (
          <DrillModal
            title={t("nowmodal.title")}
            subtitle={t("nowmodal.subtitle")}
            onClose={() => setWalletNowOpen(false)}
          >
            <div className="grid grid-cols-2 gap-3 px-5 py-5">
              <NowCard
                icon={WalletIcon}
                label={t("dash.card.balance")}
                value={`${fmtMon(walletNow.balance)} MON`}
              />
              <NowCard
                icon={Award}
                label={t("dash.card.score")}
                value={`${walletNow.score}/100`}
              />
              <NowCard
                icon={Receipt}
                label={t("dash.card.txcount")}
                value={walletNow.txCount.toLocaleString()}
              />
              <NowCard
                icon={Flame}
                label={t("dash.card.gas")}
                value={`${fmtMon(walletNow.gas, 6)} MON`}
              />
              <NowCard
                icon={CalendarDays}
                label={t("dash.card.age")}
                value={`${walletNow.ageDays.toLocaleString()} ${t("dash.card.age.unit")}`}
              />
              <NowCard
                icon={Layers3}
                label={t("nowmodal.staking")}
                value={
                  walletNow.hasStaking
                    ? `${t("nowmodal.active")} · ${walletNow.stakingOps} ops`
                    : t("nowmodal.inactive")
                }
                accent={walletNow.hasStaking ? "good" : "muted"}
              />
              <NowCard
                icon={Repeat}
                label={t("nowmodal.defi")}
                value={
                  walletNow.hasDefi
                    ? `${t("nowmodal.active")} · ${walletNow.defiOps} ops`
                    : t("nowmodal.inactive")
                }
                accent={walletNow.hasDefi ? "good" : "muted"}
                span2
              />
            </div>
            <p className="px-5 pb-4 text-[10px] text-muted-foreground/80 leading-relaxed">
              {t("nowmodal.disclaimer")}
            </p>
          </DrillModal>
        )}

        {nftDrillOpen && (
          <DrillModal
            title={t("nftmodal.title")}
            subtitle={`${nftCollection.heldCount} ${t(
              "nftmodal.heldSuffix"
            )} · ${nftCollection.everCount} ${t("nftmodal.totalSuffix")}`}
            onClose={() => setNftDrillOpen(false)}
          >
            {nftListWithImages.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground italic">
                {t("txt.empty")}
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 p-4">
                {nftListWithImages.slice(0, 200).map((nft) => (
                  <div key={nft.key} className="flex flex-col gap-1.5">
                    <div className="relative">
                      <CoinFrameImage
                        src={nft.image}
                        alt={`${nft.name}${nft.tokenId !== "" ? ` #${nft.tokenId}` : ""}`}
                        fallbackIcon={ImageIcon}
                        shape="square"
                        held={nft.held}
                        className="w-full"
                      />
                      <span
                        className={`badge-status absolute top-1.5 right-1.5 ${
                          nft.held ? "success" : "failed"
                        }`}
                      >
                        {nft.held ? t("nftmodal.status.held") : t("nftmodal.status.gone")}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-foreground/90 truncate">
                      {nft.name}
                      {nft.tokenId !== "" ? ` #${nft.tokenId}` : ""}
                    </p>
                    {nft.lastHash && (
                      <a
                        href={`${explorer}/tx/${nft.lastHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] font-mono text-[hsl(var(--gold))] hover:text-[hsl(var(--gold-strong))]"
                      >
                        {nft.lastHash.slice(0, 6)}…{nft.lastHash.slice(-4)}
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
            <p className="px-5 py-4 text-[10px] text-muted-foreground/80 leading-relaxed border-t border-[hsl(var(--gold-border))]/30">
              {t("nftmodal.disclaimer")}
            </p>
          </DrillModal>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ==================================================================
 *  Sub-components
 * ================================================================ */

function tooltipStyle(): React.CSSProperties {
  return {
    background: "hsl(var(--card))",
    border: "1px solid hsl(var(--gold-border))",
    borderRadius: 8,
    color: "hsl(var(--foreground))",
    fontSize: 12,
    padding: "6px 10px",
  };
}

/**
 * Recharts colors each tooltip row using that series' own fill/stroke color
 * UNLESS `itemStyle` overrides it. Some of our categories (e.g. "Contract",
 * which uses --gold-border) are deliberately dark/muted for the chart itself,
 * but that same dark color becomes unreadable as TEXT on the dark tooltip
 * background. Forcing every row to the theme's foreground color keeps every
 * category name legible regardless of how dark its chart color is.
 */
function tooltipItemStyle(): React.CSSProperties {
  return { color: "hsl(var(--foreground))" };
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  const { t } = useI18n();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4 }}
      className="section-heading"
    >
      <div>
        <span className="eyebrow">
          {t("section.eyebrow", { n: eyebrow })}
        </span>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </motion.div>
  );
}

function ChartCard({
  title,
  icon: Icon,
  loading,
  empty,
  children,
  footnote,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  empty?: boolean;
  children: React.ReactNode;
  footnote?: string;
}) {
  const { t } = useI18n();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45 }}
      className="chart-card"
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="h-8 w-8 rounded-lg bg-[hsl(var(--gold))]/12 border border-[hsl(var(--gold-border))] text-[hsl(var(--gold-strong))] flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-bold tracking-tight">{title}</h3>
      </div>
      {loading ? (
        <div className="sk h-[260px] w-full rounded-lg" />
      ) : empty ? (
        <div className="h-[260px] flex items-center justify-center text-xs text-muted-foreground italic border border-dashed border-[hsl(var(--gold-border))]/40 rounded-lg">
          {t("chart.empty")}
        </div>
      ) : (
        children
      )}
      {footnote && !loading && !empty ? (
        <p className="mt-3 text-[10px] text-muted-foreground/70 leading-snug">{footnote}</p>
      ) : null}
    </motion.div>
  );
}

type Tone = "gold" | "green" | "red";

function toneStyles(tone: Tone) {
  switch (tone) {
    case "green":
      return {
        bg: "bg-emerald-500/10",
        text: "text-emerald-400",
        ring: "border-emerald-500/40",
      };
    case "red":
      return {
        bg: "bg-rose-500/10",
        text: "text-rose-400",
        ring: "border-rose-500/40",
      };
    default:
      return {
        bg: "bg-[hsl(var(--gold))]/12",
        text: "text-[hsl(var(--gold-strong))]",
        ring: "border-[hsl(var(--gold-border))]",
      };
  }
}

function MetricCard({
  title,
  value,
  unit,
  hint,
  icon: Icon,
  tone = "gold",
  index = 0,
  onClick,
  badge,
}: {
  title: string;
  value: string | number | null;
  unit?: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: Tone;
  index?: number;
  onClick?: () => void;
  /** Small pill next to the title clarifying the metric's time scope
   *  (e.g. the selected year, "LIVE", or "ALL-TIME"). */
  badge?: string;
}) {
  const s = toneStyles(tone);
  const clickable = Boolean(onClick);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 + index * 0.05 }}
      whileHover={clickable ? { y: -2 } : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`glass p-5 flex flex-col gap-3 ${
        clickable
          ? "cursor-pointer hover:border-[hsl(var(--gold))]/60 transition-colors"
          : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-[11px] uppercase tracking-widest font-mono text-muted-foreground truncate">
            {title}
          </p>
          {badge && (
            <span className="shrink-0 rounded-full border border-[hsl(var(--gold-border))]/60 bg-[hsl(var(--muted))]/40 px-1.5 py-0.5 text-[9px] font-mono font-semibold text-[hsl(var(--gold))]">
              {badge}
            </span>
          )}
        </div>
        <div
          className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center border ${s.bg} ${s.text} ${s.ring}`}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="flex items-baseline gap-1.5 min-h-[36px]">
        {value === null ? (
          <div className="sk h-8 w-28" />
        ) : (
          <>
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono">
              {value}
            </span>
            {unit && (
              <span className="text-xs font-semibold text-[hsl(var(--gold))]">
                {unit}
              </span>
            )}
          </>
        )}
      </div>
      {hint && (
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {hint}
        </p>
      )}
    </motion.div>
  );
}

function ScoreCard({
  score,
  index = 0,
  loading,
  onClick,
}: {
  score: number;
  index?: number;
  loading?: boolean;
  onClick?: () => void;
}) {
  const { t } = useI18n();

  const size = 84;
  const stroke = 8;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;

  const label =
    score >= 80
      ? t("dash.score.label.excellent")
      : score >= 60
      ? t("dash.score.label.good")
      : score >= 40
      ? t("dash.score.label.fair")
      : t("dash.score.label.new");

  const clickable = Boolean(onClick);
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 + index * 0.05 }}
      whileHover={clickable ? { y: -2 } : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`surface-glass surface-glass--score p-5 flex items-center gap-4 ${
        clickable
          ? "cursor-pointer hover:border-[hsl(var(--gold))]/60 transition-colors"
          : ""
      }`}
    >
      <div
        className="coin-frame rounded-full shrink-0"
        style={{ width: size + 8, height: size + 8, padding: 4, borderRadius: "50%" }}
      >
        <div
          className="coin-frame-inner relative"
          style={{ width: size, height: size, borderRadius: "50%", background: "hsl(var(--card))" }}
        >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="hsl(var(--gold-border) / 0.4)"
            strokeWidth={stroke}
            fill="transparent"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#scoreGradient)"
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="transparent"
            initial={{ strokeDasharray: `0 ${circumference}` }}
            animate={{
              strokeDasharray: `${loading ? 0 : dash} ${circumference - (loading ? 0 : dash)}`,
            }}
            transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
          />
          <defs>
            <linearGradient id="scoreGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="hsl(var(--gold-strong))" />
              <stop offset="60%" stopColor="hsl(var(--gold))" />
              <stop offset="100%" stopColor="hsl(var(--violet))" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-extrabold font-mono text-gold-title">
            {loading ? "—" : `${score}%`}
          </span>
        </div>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <Award className="h-3.5 w-3.5 text-[hsl(var(--gold))]" />
          <p className="text-[11px] uppercase tracking-widest font-mono text-muted-foreground">
            {t("dash.card.score")}
          </p>
        </div>
        <p className="text-lg font-bold text-foreground">{loading ? "—" : label}</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {t("dash.card.score.hint")}
        </p>
      </div>
    </motion.div>
  );
}

const AssetCard = memo(function AssetCard({
  data,
  index,
  t,
  onClick,
}: {
  data: {
    symbol: string;
    name: string;
    amount: number;
    icon: any;
    hint: string;
    accent: "gold" | "violet" | "green" | "blue";
    image?: string;
  };
  index: number;
  t: (k: string) => string;
  onClick?: () => void;
}) {
  const Icon = data.icon;
  // Tokens with a zero balance render with the same "tarnished" ring
  // used by NFTs the user no longer holds, giving one consistent visual
  // language across all assets: bright frame = in wallet, dim frame =
  // not in wallet. The NFTs summary card is excluded (it aggregates
  // multiple items, so the "held" flag doesn't apply).
  const isNftAggregate = data.symbol === "NFTs";
  const heldFrame = isNftAggregate ? true : data.amount > 0;
  const accentBg =
    data.accent === "violet"
      ? "from-[hsl(var(--violet-strong))]/25 to-[hsl(var(--violet))]/5"
      : data.accent === "green"
      ? "from-emerald-400/25 to-emerald-400/5"
      : data.accent === "blue"
      ? "from-sky-400/25 to-sky-400/5"
      : "from-[hsl(var(--gold-strong))]/25 to-[hsl(var(--gold))]/5";

  const isNfts = data.symbol === "NFTs";
  const clickable = Boolean(onClick);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.05 + index * 0.05 }}
      whileHover={clickable ? { y: -2 } : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`asset-card ${
        clickable
          ? "cursor-pointer hover:border-[hsl(var(--gold))]/60 transition-colors"
          : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`h-11 w-11 rounded-xl bg-gradient-to-br ${accentBg} border border-[hsl(var(--gold-border))] flex items-center justify-center`}
          >
            <CoinFrameImage
              src={data.image}
              alt={data.name}
              fallbackIcon={Icon}
              shape="circle"
              held={heldFrame}
              className="h-9 w-9"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-base font-bold leading-tight">{data.symbol}</p>
              {!isNftAggregate && (
                <span
                  className={`badge-status ${heldFrame ? "success" : "failed"}`}
                >
                  {heldFrame
                    ? t("nftmodal.status.held")
                    : t("nftmodal.status.gone")}
                </span>
              )}
            </div>
            <p className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
              {data.hint}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-2 pt-3 border-t border-[hsl(var(--gold-border))]/40 flex items-end justify-between gap-2">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
            {isNfts ? t("port.qty.nfts") : t("port.qty")}
          </p>
          <p className="font-display text-2xl font-semibold text-gold-title" style={{ letterSpacing: "-0.01em" }}>
            {data.amount.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </p>
        </div>
        {clickable && (
          <p className="text-[9px] uppercase tracking-widest font-mono text-[hsl(var(--gold))]/80 pb-1 whitespace-nowrap">
            {t("port.tap.hint")} →
          </p>
        )}
      </div>
    </motion.div>
  );
});

function ActivityCard({
  title,
  value,
  icon: Icon,
  loading,
  index,
  onClick,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  index: number;
  onClick?: () => void;
}) {
  const clickable = Boolean(onClick) && value > 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.03 + index * 0.04 }}
      whileHover={clickable ? { y: -2 } : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onClick : undefined}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={`glass p-4 flex flex-col gap-3 ${
        clickable
          ? "cursor-pointer hover:border-[hsl(var(--gold))]/60 transition-colors"
          : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[hsl(var(--gold-strong))]/25 to-[hsl(var(--violet))]/10 border border-[hsl(var(--gold-border))] flex items-center justify-center">
          <Icon className="h-4 w-4 text-[hsl(var(--gold-strong))]" />
        </div>
        <Gauge className="h-3.5 w-3.5 text-[hsl(var(--gold))]/50" />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
          {title}
        </p>
        <div className="min-h-[28px]">
          {loading ? (
            <div className="sk h-6 w-16 mt-1" />
          ) : (
            <p className="text-2xl font-extrabold font-mono">{value.toLocaleString()}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function CategoryBadge({
  cat,
  t,
}: {
  cat: "transfer" | "approval" | "contract" | "nft" | "swap";
  t: (k: string) => string;
}) {
  const map: Record<
    string,
    { bg: string; text: string; label: string; icon: any }
  > = {
    transfer: {
      bg: "bg-[hsl(var(--gold))]/12",
      text: "text-[hsl(var(--gold-strong))]",
      label: t("txt.category.transfer"),
      icon: ArrowLeftRight,
    },
    approval: {
      bg: "bg-[hsl(var(--warn))]/15",
      text: "text-[hsl(var(--warn))]",
      label: t("txt.category.approval"),
      icon: Shield,
    },
    contract: {
      bg: "bg-[hsl(var(--violet))]/15",
      text: "text-[hsl(var(--violet-strong))]",
      label: t("txt.category.contract"),
      icon: Layers,
    },
    nft: {
      bg: "bg-[hsl(var(--violet))]/15",
      text: "text-[hsl(var(--violet-strong))]",
      label: t("txt.category.nft"),
      icon: ImageIcon,
    },
    swap: {
      bg: "bg-[hsl(var(--success))]/15",
      text: "text-[hsl(var(--success))]",
      label: t("txt.category.swap"),
      icon: Repeat,
    },
  };
  const c = map[cat];
  const Ic = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${c.bg} ${c.text} border border-current/30`}
    >
      <Ic className="h-3 w-3" />
      {c.label}
    </span>
  );
}

/* ==================================================================
 *  Drill-down modal & Now card helpers
 *
 *  A lightweight custom modal (we avoid adding a new dialog because
 *  the whole codebase already relies on framer-motion + our design
 *  tokens for the gold/violet theme). Escape and backdrop click both
 *  close it; scroll is contained inside the panel so it works well
 *  on mobile.
 * ================================================================ */
function DrillModal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      key="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", damping: 24, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-lg max-h-[85vh] overflow-hidden rounded-t-2xl sm:rounded-2xl border border-[hsl(var(--gold-border))] bg-[hsl(var(--card))] shadow-2xl flex flex-col"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[hsl(var(--gold-border))]/60 bg-gradient-to-br from-[hsl(var(--gold-strong))]/15 via-[hsl(var(--violet))]/5 to-transparent">
          <div className="min-w-0">
            <h3 className="text-base font-bold tracking-tight truncate">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-0.5 text-[11px] uppercase tracking-widest font-mono text-muted-foreground truncate">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 h-8 w-8 rounded-lg border border-[hsl(var(--gold-border))]/60 bg-[hsl(var(--muted))]/40 flex items-center justify-center hover:border-[hsl(var(--gold))] hover:bg-[hsl(var(--gold-hover))] transition-colors"
          >
            <XCircle className="h-4 w-4 text-[hsl(var(--gold))]" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </motion.div>
    </motion.div>
  );
}

function NowCard({
  icon: Icon,
  label,
  value,
  accent = "gold",
  span2 = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: "gold" | "good" | "muted";
  span2?: boolean;
}) {
  const ring =
    accent === "good"
      ? "border-emerald-400/40 bg-emerald-400/8"
      : accent === "muted"
      ? "border-[hsl(var(--gold-border))]/40 bg-[hsl(var(--muted))]/30"
      : "border-[hsl(var(--gold-border))] bg-[hsl(var(--muted))]/30";
  const iconColor =
    accent === "good"
      ? "text-emerald-400"
      : accent === "muted"
      ? "text-muted-foreground"
      : "text-[hsl(var(--gold-strong))]";
  return (
    <div
      className={`rounded-xl border ${ring} p-3 flex items-center gap-3 ${
        span2 ? "col-span-2" : ""
      }`}
    >
      <div
        className={`h-9 w-9 shrink-0 rounded-lg bg-[hsl(var(--card))]/70 border border-[hsl(var(--gold-border))]/40 flex items-center justify-center ${iconColor}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground truncate">
          {label}
        </p>
        <p className="text-sm font-mono font-bold truncate">{value}</p>
      </div>
    </div>
  );
}
