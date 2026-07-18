import { motion } from "framer-motion";
import {
  ShieldCheck,
  Sparkles,
  FileBarChart2,
  Wallet as WalletIcon,
  ArrowRight,
  BarChart3,
  Bot,
  Award,
  Image as ImageIcon,
  Layers,
  FileText,
  Link2,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { useI18n } from "@/lib/i18n";

interface LandingProps {
  onConnect: () => void;
}

/**
 * Premium SaaS landing page — first screen of MONAD WALLET REPORT.
 *
 * Structure follows the approved visual redesign: hero w/ floating
 * stat cards, live ticker, trust strip, "how it works", a features
 * bento grid, a report preview mock, an on-chain proof terminal,
 * network stats, a closing CTA and a footer.
 */
export function Landing({ onConnect }: LandingProps) {
  const { isConnecting } = useWallet();
  const { t } = useI18n();
  const year = new Date().getFullYear();

  const features = [
    { icon: BarChart3, label: t("landing.feature.financial") },
    { icon: WalletIcon, label: t("landing.feature.portfolio") },
    { icon: ImageIcon, label: t("landing.feature.nft") },
    { icon: Award, label: t("landing.feature.score") },
    { icon: FileBarChart2, label: t("landing.feature.pdf") },
    { icon: Bot, label: t("landing.feature.ai") },
  ];

  const steps = [
    { num: "01", icon: WalletIcon, title: t("landing.how.step1.title"), body: t("landing.how.step1.body") },
    { num: "02", icon: FileText, title: t("landing.how.step2.title"), body: t("landing.how.step2.body") },
    { num: "03", icon: ShieldCheck, title: t("landing.how.step3.title"), body: t("landing.how.step3.body") },
  ];

  return (
    <div className="relative overflow-hidden">
      {/* Ambient background grid (fixed, behind everything on this page) */}
      <div className="landing-bg-grid fixed inset-0 -z-10" aria-hidden="true" />
      <div className="pointer-events-none fixed -z-10 top-[-10%] left-[-8%] h-[620px] w-[620px] rounded-full bg-[hsl(var(--gold))]/15 blur-[100px]" aria-hidden="true" />
      <div className="pointer-events-none fixed -z-10 bottom-[-15%] right-[-10%] h-[680px] w-[680px] rounded-full bg-[hsl(var(--violet))]/15 blur-[100px]" aria-hidden="true" />

      {/* ============ HERO ============ */}
      <section className="relative px-4 sm:px-6 lg:px-8 pt-14 pb-10">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--gold-border))] bg-[hsl(var(--card))]/70 backdrop-blur px-4 py-1.5 text-xs font-medium text-[hsl(var(--gold))] shadow-sm"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="uppercase tracking-[0.2em] font-mono">
                {t("landing.pill")}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-6 font-display text-5xl sm:text-6xl font-semibold tracking-tight leading-[1.02]"
              style={{ letterSpacing: "-0.02em" }}
            >
              <span className="text-gold-title">MONAD</span>{" "}
              <span className="text-foreground">WALLET</span>
              <br />
              <span className="text-violet-title">REPORT</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed"
            >
              {t("landing.subtitle")}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-3"
            >
              <Button
                size="lg"
                onClick={onConnect}
                disabled={isConnecting}
                className="btn-gold h-14 px-8 text-base rounded-xl shadow-lg group"
              >
                <WalletIcon className="mr-2 h-5 w-5" />
                {isConnecting ? t("wallet.connecting") : t("landing.cta")}
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5 text-[hsl(var(--gold))]" />
                {t("landing.noncustodial")}
              </div>
            </motion.div>

            {/* Feature grid */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="mt-12 grid grid-cols-2 gap-3"
            >
              {features.map((f, i) => (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.06 }}
                  className="glass p-3.5 flex items-center gap-3 text-left transition-transform hover:-translate-y-1"
                >
                  <div className="tx-icon shrink-0">
                    <f.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium">{f.label}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* Mobile-only preview: show at least the score card on <lg viewports */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55 }}
              className="mt-8 lg:hidden landing-float-card !static !animate-none w-full max-w-sm mx-auto sm:mx-0"
            >
              <div className="flex items-center gap-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                  {t("landing.badge.score")}
                </div>
                <span className="ml-auto badge-gold">{t("landing.badge.sealed")}</span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-4xl font-semibold text-gold-title" style={{ letterSpacing: "-0.02em" }}>85</span>
                <span className="text-sm text-muted-foreground font-normal">/100</span>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--gold-strong))] to-[hsl(var(--gold))]"
                  style={{ width: "85%" }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px]">
                <span className="font-mono text-muted-foreground">0x9c4a…8f21</span>
                <span className="text-[hsl(142_70%_55%)]">▲ 12.4%</span>
              </div>
            </motion.div>
          </div>

          {/* Visual: hero image + floating stat cards */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative rounded-3xl overflow-hidden border border-[hsl(var(--gold-border))] shadow-2xl">
              <img
                src="/assets/hero-monad.jpg"
                alt=""
                className="w-full h-[520px] object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--background))] via-transparent to-transparent" />
            </div>

            <div className="landing-float-card top-6 -left-10 w-48" style={{ animationDelay: "0s" }}>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                {t("landing.badge.score")}
              </div>
              <div className="mt-1 text-2xl font-bold text-[hsl(var(--gold))]">
                85<span className="text-xs text-muted-foreground font-normal">/100</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--gold-strong))] to-[hsl(var(--gold))]" style={{ width: "85%" }} />
              </div>
            </div>

            <div className="landing-float-card bottom-24 -right-8 w-52" style={{ animationDelay: "1.4s" }}>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[hsl(var(--gold))]" />
                <span className="text-xs font-medium">{t("landing.badge.report", { year })}</span>
                <span className="ml-auto badge-gold">{t("landing.badge.sealed")}</span>
              </div>
              <div className="mt-2 font-mono text-xs text-muted-foreground">0x9c4a…8f21</div>
            </div>

            <div className="landing-float-card bottom-6 left-6 w-44" style={{ animationDelay: "2.6s" }}>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                {t("landing.badge.portfolio")}
              </div>
              <div className="mt-1 text-xl font-bold">$24,680</div>
              <div className="text-xs text-[hsl(142_70%_55%)]">▲ 12.4%</div>
            </div>
          </motion.div>
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.9 }}
          className="max-w-6xl mx-auto mt-10 text-[11px] text-muted-foreground/70"
        >
          {t("landing.footnote")}
        </motion.p>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="eyebrow mb-3">{t("landing.how.eyebrow")}</div>
            <h2 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight">{t("landing.how.title")}</h2>
            <p className="mt-4 text-muted-foreground">{t("landing.how.subtitle")}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="glass p-6"
              >
                <div className="font-mono text-xs text-[hsl(var(--gold))]/70">{s.num}</div>
                <div className="tx-icon mt-3 h-11 w-11">
                  <s.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-semibold text-lg">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURES BENTO ============ */}
      <section className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl mb-12">
            <div className="eyebrow mb-3">{t("landing.features.eyebrow")}</div>
            <h2 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight">{t("landing.features.title")}</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {/* Financial summary — tall */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass p-6 md:row-span-2 flex flex-col"
            >
              <div className="tx-icon h-10 w-10"><BarChart3 className="h-5 w-5" /></div>
              <h3 className="mt-4 font-semibold text-lg">{t("landing.features.financial.title")}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t("landing.features.financial.body")}</p>
              <div className="mt-auto pt-6">
                <div className="mini-bars">
                  {[35, 52, 41, 68, 82, 74, 95, 88].map((h, i) => (
                    <span key={i} style={{ ["--h" as any]: `${h}%` }} />
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-xs font-mono">
                  <span className="text-[hsl(142_70%_55%)]">+ $18,420</span>
                  <span className="text-[hsl(var(--danger))]">− $6,110</span>
                </div>
              </div>
            </motion.div>

            {/* Portfolio breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.08 }}
              className="glass p-6"
            >
              <div className="tx-icon h-10 w-10" style={{ color: "hsl(var(--violet))" }}><Layers className="h-5 w-5" /></div>
              <h3 className="mt-4 font-semibold text-lg">{t("landing.features.portfolio.title")}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t("landing.features.portfolio.body")}</p>
            </motion.div>

            {/* Wallet score */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.16 }}
              className="glass p-6"
            >
              <div className="tx-icon h-10 w-10"><Award className="h-5 w-5" /></div>
              <h3 className="mt-4 font-semibold text-lg">{t("landing.features.score.title")}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t("landing.features.score.body")}</p>
              <div className="mt-4 flex items-center gap-3">
                <span className="text-2xl font-bold text-[hsl(var(--gold))]">85</span>
                <span className="text-xs text-muted-foreground font-normal">/100</span>
                <span className="badge-gold">{t("landing.features.score.tier")}</span>
              </div>
            </motion.div>

            {/* NFT analysis */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.24 }}
              className="glass p-6"
            >
              <div className="tx-icon h-10 w-10" style={{ color: "hsl(var(--violet))" }}><ImageIcon className="h-5 w-5" /></div>
              <h3 className="mt-4 font-semibold text-lg">{t("landing.features.nft.title")}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t("landing.features.nft.body")}</p>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="aspect-square rounded-lg bg-gradient-to-br from-[hsl(var(--gold))]/25 to-[hsl(var(--violet))]/20 border border-[hsl(var(--gold-border))]/50" />
                ))}
              </div>
            </motion.div>

            {/* PDF export */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.32 }}
              className="glass p-6"
            >
              <div className="tx-icon h-10 w-10"><FileBarChart2 className="h-5 w-5" /></div>
              <h3 className="mt-4 font-semibold text-lg">{t("landing.features.pdf.title")}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t("landing.features.pdf.body")}</p>
            </motion.div>

            {/* AI insights — wide */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="glass p-6 md:col-span-2"
            >
              <div className="tx-icon h-10 w-10" style={{ color: "hsl(var(--violet))" }}><Bot className="h-5 w-5" /></div>
              <h3 className="mt-4 font-semibold text-lg">{t("landing.features.ai.title")}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t("landing.features.ai.body")}</p>
              <div className="mt-4 space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[hsl(var(--gold))] shrink-0" />
                  <span>{t("landing.features.ai.line1")}</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />
                  <span>{t("landing.features.ai.line2")}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============ REPORT PREVIEW ============ */}
      <section className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="eyebrow mb-3">{t("landing.report.eyebrow")}</div>
            <h2 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight">{t("landing.report.title")}</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">{t("landing.report.subtitle")}</p>
            <ul className="mt-6 space-y-3">
              {[
                t("landing.report.check1"),
                t("landing.report.check2"),
                t("landing.report.check3"),
                t("landing.report.check4"),
              ].map((c) => (
                <li key={c} className="flex items-center gap-2.5 text-sm">
                  <Check className="h-4 w-4 text-[hsl(var(--gold))] shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[hsl(var(--gold-border))]/50 bg-[hsl(var(--muted))]/40">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-3 font-mono text-[11px] text-muted-foreground">monadwalletreport.xyz/r/0x9c4a…8f21</span>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-mono text-muted-foreground">
                    {t("landing.report.mock.eyebrow", { year })}
                  </div>
                  <div className="mt-1 font-semibold">
                    Wallet <span className="text-[hsl(var(--gold))] font-mono text-sm">0x9c4a…8f21</span>
                  </div>
                </div>
                <span className="badge-gold whitespace-nowrap">{t("landing.report.mock.sealed")}</span>
              </div>

              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: t("landing.report.mock.kpi.portfolio"), value: "$24,680", delta: "▲ 12.4%" },
                  { label: t("landing.report.mock.kpi.pnl", { year }), value: "+$8,420", delta: "▲ 34.1%" },
                  { label: t("landing.report.mock.kpi.trades"), value: "284", delta: "avg 5.5/wk" },
                  { label: t("landing.report.mock.kpi.gas"), value: "1,284", delta: "MON · $18.40" },
                ].map((k) => (
                  <div key={k.label} className="kpi-box">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{k.label}</div>
                    <div className="mt-1 font-bold text-sm">{k.value}</div>
                    <div className="text-[10px] text-[hsl(142_70%_55%)] font-mono">{k.delta}</div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground">TX HASH</div>
                  <code className="text-[10px] text-muted-foreground/80 truncate block">0x9c4a1e6f38a2b1c7d0e4f9a3b8c1d5e2f7089c6a…</code>
                </div>
                <button type="button" className="shrink-0 font-mono text-xs text-[hsl(var(--gold))] hover:underline whitespace-nowrap">
                  {t("landing.report.mock.verify")}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============ ON-CHAIN PROOF ============ */}
      <section className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="eyebrow mb-3">{t("landing.proof.eyebrow")}</div>
            <h2 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight">{t("landing.proof.title")}</h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">{t("landing.proof.subtitle")}</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="proof-terminal"
          >
            <div className="proof-terminal-head">
              <span className="proof-dot" />
              <span className="proof-dot amber" />
              <span className="proof-dot green" />
              <span className="ml-2 font-mono text-xs text-muted-foreground flex items-center gap-1.5">
                <Link2 className="h-3 w-3" /> {t("landing.proof.contract")}
              </span>
            </div>
            <pre>
              <code>
                {[
                  { t: "com", v: "// Verify report exists for a wallet + year" },
                  { t: "raw", v: "function checkReport(address wallet, uint256 year)" },
                  { t: "raw", v: "  external view returns (bool);" },
                  { t: "blank" },
                  { t: "com", v: "// Fetch the sealed report" },
                  { t: "raw", v: "function getReport(address wallet, uint256 year)" },
                  { t: "raw", v: "  external view returns (Report memory);" },
                  { t: "blank" },
                  { t: "com", v: "// Event emitted on every seal" },
                  { t: "raw", v: "event ReportSealed(" },
                  { t: "raw", v: "  address indexed wallet," },
                  { t: "raw", v: "  uint256 indexed year," },
                  { t: "raw", v: "  bytes32 hash," },
                  { t: "raw", v: "  uint256 timestamp" },
                  { t: "raw", v: ");" },
                ].map((line, i) =>
                  line.t === "blank" ? (
                    <div key={i}>&nbsp;</div>
                  ) : (
                    <div key={i} className={line.t === "com" ? "pt-com" : ""}>
                      {line.v}
                    </div>
                  )
                )}
              </code>
            </pre>
          </motion.div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto glass p-10 sm:p-14 text-center relative overflow-hidden"
        >
          <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-[hsl(var(--gold))]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-[hsl(var(--violet))]/15 blur-3xl" />

          <div className="relative eyebrow mb-3 justify-center flex">{t("landing.cta2.eyebrow")}</div>
          <h2 className="relative text-3xl sm:text-4xl font-display font-semibold tracking-tight">{t("landing.cta2.title")}</h2>
          <p className="relative mt-4 text-muted-foreground max-w-xl mx-auto">{t("landing.cta2.subtitle")}</p>

          <div className="relative mt-8 flex flex-col sm:flex-row items-center justify-center gap-5">
            <Button
              size="lg"
              onClick={onConnect}
              disabled={isConnecting}
              className="btn-gold h-14 px-8 text-base rounded-xl shadow-lg group"
            >
              <WalletIcon className="mr-2 h-5 w-5" />
              {isConnecting ? t("wallet.connecting") : t("landing.cta")}
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <div className="text-sm">
              <span className="font-bold text-[hsl(var(--gold))]">1 MON</span>{" "}
              <span className="text-muted-foreground">{t("landing.cta2.price")}</span>
              <div className="text-xs text-muted-foreground/70">{t("landing.cta2.priceNote")}</div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-[hsl(var(--gold-border))]/50 px-4 sm:px-6 lg:px-8 py-12 mt-4">
        <div className="max-w-6xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[hsl(var(--gold-strong))] to-[hsl(var(--gold))] flex items-center justify-center">
                <ShieldCheck className="h-4 w-4 text-[hsl(var(--primary-foreground))]" />
              </div>
              <span className="font-bold tracking-tight">{t("brand.name")}</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground max-w-xs">{t("landing.footer.tagline")}</p>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-3">{t("landing.footer.product")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>{t("landing.nav.how")}</li>
              <li>{t("landing.nav.report")}</li>
              <li>{t("landing.nav.proof")}</li>
            </ul>
          </div>
          <div>
            <h4 className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-3">{t("landing.footer.resources")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Contract</li>
              <li>Monadscan</li>
              <li>Docs</li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-10 pt-6 border-t border-[hsl(var(--gold-border))]/30 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-muted-foreground/70 font-mono">
          <span>© {year} {t("brand.name")} · {t("landing.footer.rights")}</span>
          <span className="truncate max-w-full">0x9c4a1e6f38a2b1c7d0e4f9a3b8c1d5e2f7089c6a</span>
        </div>
      </footer>
    </div>
  );
}
