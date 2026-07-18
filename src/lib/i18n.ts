import { useState, useEffect, createContext, useContext, ReactNode, createElement } from 'react';

/* =============================================================
 *  i18n — minimal in-file translator (EN default / ES fallback)
 *
 *  Kept in this file to avoid introducing new modules.
 *  Usage:
 *      const { t, lang, setLang, toggleLang } = useI18n();
 *      <p>{t('report.title')}</p>
 * ============================================================= */

export type Lang = 'en' | 'es';

const STRINGS: Record<Lang, Record<string, string>> = {
  en: {
    // Header / tabs
    'tab.transactions': 'Transactions',
    'tab.reports': 'Annual Report',
    'tab.holdings': 'Holdings',
    'brand.name': 'Monad Wallet Report',
    'brand.tag': 'Premium Analytics',

    // Landing
    'landing.pill': 'Premium Wallet Analytics',
    'landing.subtitle':
      'Turn your Monad on-chain history into a beautiful, exportable premium report. Financial summary, portfolio, NFTs, wallet score and AI insights — all in one place.',
    'landing.cta': 'Connect Wallet',
    'landing.noncustodial': '100% non-custodial. We never see your keys.',
    'landing.feature.financial': 'Financial Summary',
    'landing.feature.portfolio': 'Asset Portfolio',
    'landing.feature.nft': 'NFT Analysis',
    'landing.feature.score': 'Wallet Score',
    'landing.feature.pdf': 'PDF Export',
    'landing.feature.ai': 'AI Insights',
    'landing.footnote':
      'Powered by public on-chain data. No account required — just your wallet.',

    // Landing — extended marketing sections
    'landing.nav.how': 'How it works',
    'landing.nav.report': 'The report',
    'landing.nav.proof': 'On-chain proof',
    'landing.nav.pricing': 'Access',
    'landing.badge.score': 'Wallet Score',
    'landing.badge.report': 'Report {year}',
    'landing.badge.sealed': 'SEALED',
    'landing.badge.portfolio': 'Portfolio',
    'landing.trust.label': 'POWERED BY THE MONAD STACK',
    'landing.ticker.block': 'block',
    'landing.ticker.minted': 'reports minted',
    'landing.ticker.wallets': 'total wallets',
    'landing.ticker.gas': 'avg gas',
    'landing.how.eyebrow': 'HOW IT WORKS',
    'landing.how.title': 'Three steps. Zero middlemen.',
    'landing.how.subtitle':
      "No email required, no keys stored, no report servers to trust. The whole flow lives in an auditable smart contract on Monad.",
    'landing.how.step1.title': 'Connect your wallet',
    'landing.how.step1.body': 'MetaMask, Rabby, Phantom or WalletConnect. You sign a message — that\u2019s it.',
    'landing.how.step2.title': 'Generate the report',
    'landing.how.step2.body': 'The contract indexes your yearly history — trades, DeFi, NFTs, gas, PnL — and seals it with your signature.',
    'landing.how.step3.title': 'On-chain forever',
    'landing.how.step3.body': 'The hash is recorded on Monad. Export a PDF, share it, or verify it years later.',
    'landing.features.eyebrow': 'WHAT\u2019S INCLUDED',
    'landing.features.title': 'Everything your accountant should have.',
    'landing.features.financial.title': 'Financial summary',
    'landing.features.financial.body':
      'Total invested, realized returns, gas spend, PnL per token and per quarter — all derived directly from your transactions.',
    'landing.features.portfolio.title': 'Portfolio breakdown',
    'landing.features.portfolio.body': 'DeFi \u00b7 NFTs \u00b7 Other — with the exact weight in your wallet.',
    'landing.features.score.title': 'Wallet Score',
    'landing.features.score.body': 'A 1-1000 score based on diversification, longevity, risk and DeFi activity.',
    'landing.features.score.tier': 'Elite tier',
    'landing.features.nft.title': 'NFT analysis',
    'landing.features.nft.body': 'Every collection and piece you hold, all in one place.',
    'landing.features.pdf.title': 'PDF export',
    'landing.features.pdf.body': 'A printable report ready for your accountant, in one click.',
    'landing.features.ai.title': 'AI insights',
    'landing.features.ai.body':
      'A virtual analyst reads your report and suggests rebalances, DeFi opportunities and common mistakes — all derived from your own transactions.',
    'landing.features.ai.line1': 'Your concentration in MON is above 62%. Consider diversifying into stablecoins in Q3.',
    'landing.features.ai.line2': 'You spent 0.084 MON in gas on trades under 0.5 MON — batching could save you 40%.',
    'landing.report.eyebrow': 'THE REPORT',
    'landing.report.title': 'Designed like a real annual report.',
    'landing.report.subtitle':
      'Not just another dashboard. A complete document, with a cover page, KPIs, trade tables and a cryptographic signature. Looks great on screen and even better printed.',
    'landing.report.check1': 'Cover page with hash + signature',
    'landing.report.check2': '12 financial KPIs',
    'landing.report.check3': 'Exportable trade tables',
    'landing.report.check4': 'Verifiable by anyone with the tx hash',
    'landing.report.mock.eyebrow': 'ANNUAL REPORT \u00b7 {year}',
    'landing.report.mock.sealed': 'SEALED ON-CHAIN',
    'landing.report.mock.kpi.portfolio': 'Portfolio',
    'landing.report.mock.kpi.pnl': 'PnL {year}',
    'landing.report.mock.kpi.trades': 'Trades',
    'landing.report.mock.kpi.gas': 'Gas',
    'landing.report.mock.verify': 'Verify on Monadscan \u2192',
    'landing.report.compare.traditional': 'TRADITIONAL EXPORTS',
    'landing.report.compare.bad1': 'Editable CSVs \u00b7 zero proof',
    'landing.report.compare.bad2': 'Data on private servers',
    'landing.report.compare.bad3': 'Lost when the exchange disappears',
    'landing.report.compare.us': 'MONAD WALLET REPORT',
    'landing.report.compare.good1': 'Immutable \u00b7 signed by you',
    'landing.report.compare.good2': '100% on Monad L1',
    'landing.report.compare.good3': 'Lives as long as the chain does',
    'landing.proof.eyebrow': 'ON-CHAIN PROOF',
    'landing.proof.title': 'Every report is a verifiable event.',
    'landing.proof.subtitle':
      "Your report doesn't live on our server. It lives on Monad. Anyone can verify it exists, who signed it, and which block sealed it.",
    'landing.proof.contract': 'MonadWalletReport.sol \u00b7 read-only',
    'landing.stats.wallets': 'Registered wallets',
    'landing.stats.reports': 'Sealed reports',
    'landing.stats.assets': 'Assets analyzed',
    'landing.stats.uptime': 'On-chain uptime',
    'landing.cta2.eyebrow': 'GET STARTED',
    'landing.cta2.title': 'Your year on Monad deserves a real report.',
    'landing.cta2.subtitle': 'Connect your wallet and get your first annual report, sealed on-chain.',
    'landing.cta2.price': 'per annual report',
    'landing.cta2.priceNote': 'one-time payment \u00b7 no subscription',
    'landing.footer.tagline': 'The hub for on-chain annual reports. Built on Monad L1.',
    'landing.footer.product': 'Product',
    'landing.footer.resources': 'Resources',
    'landing.footer.community': 'Community',
    'landing.footer.rights': 'non-custodial',

    // Connected home / balance step
    'home.balance.label': 'Current Balance',
    'home.cta.generate': 'Generate Report',
    'home.cta.generate.year': 'Generate {year} Report',
    'home.year.label': 'Select the year to generate',
    'home.year.help': 'A separate report is created and stored on-chain for each year.',
    'home.assurance': 'You will be asked to confirm the price before we start.',

    // Report modal (no "Premium" wording)
    'modal.badge': 'Report',
    'modal.title': 'Wallet Report',
    'modal.title.plain': 'Generate Wallet Report',
    'modal.subtitle':
      'Unlock the full auditable report for your wallet. One-time fee per year.',
    'modal.subtitle.plain':
      'Consolidate your on-chain activity for a full fiscal year into a downloadable report.',
    'modal.year.label': 'Fiscal Year',
    'modal.year.help':
      'Reports are stored on-chain, indexed by year — you can generate one report per year.',
    'modal.price.label': 'Price',
    'modal.billing': 'Billing',
    'modal.billing.once': 'One-time · No subscription',
    'modal.billing.symbolic': 'Symbolic annual fee',
    'modal.symbolic.note':
      'The 1 MON is a symbolic annual fee for the {year} report: it pays for consolidating, categorizing and formatting public on-chain data — not for the data itself. It is paid once per year per wallet, on-chain, with no subscription.',
    'modal.includes': 'Includes',
    'modal.item.financial': 'Financial Summary',
    'modal.item.portfolio': 'Asset Portfolio',
    'modal.item.nft': 'NFT Analysis',
    'modal.item.tokens': 'Token Holdings',
    'modal.item.score': 'Wallet Score',
    'modal.item.pdf': 'PDF Export',
    'modal.item.ai': 'AI Insights',
    'modal.cancel': 'Cancel',
    'modal.confirm': 'Generate Report',
    'modal.confirm.plain': 'Generate Report',

    // Generating screen
    'gen.title': 'Analyzing your wallet',
    'gen.subtitle':
      'Sit tight — we are consolidating your on-chain activity into a report.',
    'gen.subtitle.year':
      'Consolidating your {year} on-chain activity into your report.',
    'gen.progress': 'Progress',
    'gen.step.blockchain': 'Analyzing blockchain…',
    'gen.step.tx': 'Scanning transactions…',
    'gen.step.balance': 'Calculating balance…',
    'gen.step.nft': 'Analyzing NFTs…',
    'gen.step.score': 'Calculating Wallet Score…',
    'gen.step.pdf': 'Generating PDF…',

    // Transaction phase (before analysis)
    'gen.tx.title.pending': 'Pending transaction',
    'gen.tx.title.success': 'Successful transaction',
    'gen.tx.title.failed': 'Failed transaction',
    'gen.tx.subtitle.pending':
      'Confirm the 1 MON payment in your wallet to unlock the {year} report.',
    'gen.tx.subtitle.success':
      'Your payment for the {year} report has been confirmed on-chain.',
    'gen.tx.subtitle.failed':
      'The transaction could not be completed. Nothing was charged.',
    'gen.tx.reverted': 'Transaction reverted.',
    'gen.tx.hash': 'Tx',
    'gen.tx.confirmed': 'Confirmed',
    'gen.tx.retry': 'Try again',
    'gen.tx.hint.title': 'Waiting for confirmation',
    'gen.tx.hint.body':
      'Approve the transaction in your wallet. The wallet analysis will start as soon as the transaction is confirmed on-chain.',
    // "Cancel and go back" hint and button removed — the wallet
    // rejection now unwinds the UI automatically without a manual step.
    'gen.tx.next.title': 'Next step',
    'gen.tx.next.body':
      'The wallet analysis will start automatically in a moment.',

    // Friendly transaction errors
    'err.toast.title': 'Report could not be generated',
    'err.rejected': 'You rejected the transaction in your wallet.',
    'err.cancelledByUser': 'You cancelled this transaction from your wallet.',
    'err.pending': 'A previous request is still open in your wallet.',
    'err.rpc': 'The network is not responding. Please try again in a moment.',
    'err.insufficient': 'Not enough MON in your wallet to cover the fee.',
    'err.already': 'This report has already been generated for this year.',
    'err.network': 'Wrong network. Switch to Monad and try again.',
    'err.timeout': 'The transaction took too long. Please retry.',
    'err.nonce': 'A previous transaction is still pending. Wait a moment and retry.',
    'err.reverted': 'The transaction was rejected on-chain. No fee was charged.',

    // Dashboard — data unavailable banner
    'dashboard.dataError.title': "Couldn't load your transaction history",
    'dashboard.dataError.body':
      'The figures below are showing 0 because we could not reach the block explorer API right now. The live balance above is read directly from the network, so it stays accurate. Please try again in a moment.',

    // Dashboard
    'dash.hero.badge': 'Wallet Report',
    'dash.hero.badge.year': 'Wallet Report · {year}',
    'dash.hero.already.year': 'Report already generated for {year}',
    'dash.year.switch': 'Year:',
    'dash.hero.title': 'Financial Summary',
    'dash.hero.subtitle':
      'A consolidated snapshot of your Monad wallet — balance, cash-flow, activity and health at a glance.',
    'dash.scope.live': 'LIVE',
    'dash.scope.total': 'ALL-TIME',
    'dash.card.balance': 'Current Balance',
    'dash.card.balance.hint':
      'Live native MON balance in this wallet, right now — independent of the year selected above.',
    'dash.card.income': 'Income',
    'dash.card.income.hint': 'Total MON received across all transactions in {year}.',
    'dash.card.expenses': 'Expenses',
    'dash.card.expenses.hint': 'Total MON sent out from this wallet in {year}.',
    'dash.card.net': 'Net Profit',
    'dash.card.net.hint': 'Income minus expenses in {year} (native MON only).',
    'dash.card.txcount': 'Total Transactions',
    'dash.card.txcount.hint': 'Every recorded transaction on this wallet in {year}.',
    'dash.card.gas': 'Gas Spent',
    'dash.card.gas.hint': 'Total network fees paid in {year}, in MON.',
    'dash.card.age': 'Wallet Age',
    'dash.card.age.unit': 'days',
    'dash.card.age.hint':
      'Days since your first recorded activity ever — lifetime total, not tied to the selected year.',
    'dash.card.score': 'Wallet Score',
    'dash.card.score.hint':
      'Composite score from activity, longevity, diversity and health.',
    'dash.score.label.excellent': 'Excellent',
    'dash.score.label.good': 'Good',
    'dash.score.label.fair': 'Fair',
    'dash.score.label.new': 'New Wallet',
    'dash.footer.note':
      'All data is derived from public on-chain sources. This report aggregates and formats it — nothing here is private.',

    // ---- Premium report sections ----
    'section.eyebrow': 'Section {n}',
    'chart.expense.dustNote': 'Transactions under {n} MON are grouped in “Other”.',
    'section.charts.title': 'Financial Charts',
    'section.charts.subtitle': 'Visual breakdown of your on-chain activity.',
    'section.portfolio.title': 'Asset Portfolio',
    'section.portfolio.subtitle':
      'Tokens and NFTs actually held in this wallet today, plus your average MON balance for {year}.',
    'section.activity.title': 'Wallet Activity',
    'section.activity.subtitle': 'Categorized on-chain operations.',
    'section.health.title': 'Wallet Health',
    'section.health.subtitle': 'Composite indicators of hygiene and performance.',
    'section.insights.title': 'AI Insights',
    'section.insights.subtitle': 'Heuristic recommendations from your data.',
    'section.tx.title': 'Recent Transactions',
    'section.tx.subtitle': 'Showing the {shown} most recent of {total} transactions in {year}.',

    // Charts
    'chart.donut.title': 'Expense Distribution',
    'chart.bar.title': 'Income vs Expenses',
    'chart.area.title': 'Balance Evolution',
    'chart.area.start': 'Opening',
    'chart.area.change': 'Net change',
    'chart.area.end': 'Now',
    'chart.area.end.eoy': 'End of {year}',
    'chart.expense.title': 'Expense Breakdown (MON)',
    'chart.pie.title': 'Asset Distribution',
    'chart.legend.defi': 'DeFi',
    'chart.legend.transfers': 'Transfers',
    'chart.legend.nfts': 'NFTs',
    'chart.legend.approvals': 'Approvals',
    'chart.legend.gas': 'Gas',
    'chart.legend.other': 'Other',
    'chart.legend.income': 'Income',
    'chart.legend.expenses': 'Expenses',
    'chart.legend.balance': 'Balance',
    'chart.empty': 'Not enough data to render this chart yet.',
    'chart.range.label': 'Range:',
    'chart.range.30d': '30D',
    'chart.range.90d': '90D',
    'chart.range.all': 'All',

    // Portfolio
    'port.qty': 'Amount',
    'port.qty.nfts': 'Items owned now',
    'port.native': 'Native token',
    'port.native.avg': 'Avg. balance in {year}',
    'port.wrapped': 'Wrapped MON',
    'port.stable': 'USD stablecoin',
    'port.governance': 'Governance',
    'port.nfts.desc': 'Collectibles',
    'port.estimate.suffix': ' (est. from this year\'s transfers, on-chain balance unavailable)',
    'port.tap.hint': 'Tap to see all',

    // NFT drill-down modal (all NFTs the wallet has ever held)
    'nftmodal.title': 'My NFTs',
    'nftmodal.heldSuffix': 'held now',
    'nftmodal.totalSuffix': 'ever owned',
    'nftmodal.status.held': 'In wallet',
    'nftmodal.status.gone': 'Not available',
    'nftmodal.disclaimer':
      'Built from every NFT transfer this wallet was ever part of — covers all years, not just the one selected above.',

    // Activity
    'act.transfers': 'Total Transfers',
    'act.nft': 'NFT Transactions',
    'act.defi': 'DeFi Operations',
    'act.approvals': 'Approvals',
    'act.revoked': 'Revoked Approvals',
    'act.staking': 'Staking',
    'act.bridge': 'Bridge Operations',

    // Health
    'health.security': 'Security',
    'health.diversification': 'Diversification',
    'health.activity': 'Activity',
    'health.gas': 'Gas Efficiency',
    'health.risk': 'Risk Level',

    // Insights (dynamic)
    'ins.defi.pct': '{pct}% of your expenses come from DeFi operations.',
    'ins.activity.up': 'Your activity increased compared to last year.',
    'ins.activity.down': 'Your activity has slowed compared to last year.',
    'ins.diversification.good': 'You have good asset diversification.',
    'ins.diversification.low': 'Your portfolio is heavily concentrated. Consider diversifying.',
    'ins.gas.tip': 'You could reduce gas costs by batching transactions.',
    'ins.approvals.warn': 'You have {n} active approvals — review them periodically.',
    'ins.newborn': 'Your wallet is new — insights will refine as history grows.',

    // Transactions table
    'txt.type': 'Type',
    'txt.date': 'Date',
    'txt.amount': 'Amount',
    'txt.status': 'Status',
    'txt.category': 'Category',
    'txt.hash': 'Hash',
    'txt.status.success': 'Success',
    'txt.status.failed': 'Failed',
    'txt.category.transfer': 'Transfer',
    'txt.category.approval': 'Approval',
    'txt.category.contract': 'Contract',
    'txt.category.nft': 'NFT',
    'txt.category.swap': 'Swap',
    'txt.empty': 'No transactions found on this wallet yet.',

    // Export
    'export.title': 'Export Report',
    'export.subtitle': 'Download this report in your preferred format.',
    'export.pdf': 'Export PDF',
    'export.excel': 'Export Excel',
    'export.json': 'Export JSON',
    'export.csv': 'Export CSV',

    // Drill-down / "Now" modals
    'nowmodal.title': 'Current wallet data',
    'nowmodal.subtitle': 'Live snapshot of this wallet.',
    'nowmodal.staking': 'Staking',
    'nowmodal.defi': 'Active DeFi',
    'nowmodal.active': 'Active',
    'nowmodal.inactive': 'Not active',
    'nowmodal.disclaimer':
      'Active status is inferred from on-chain operations detected in the selected year. It is not a real-time position oracle.',

    // Header
    'header.disconnect': 'Disconnect',

    // Wallet menu (click on address in header)
    'wallet.menu.aria': 'Wallet menu',
    'wallet.menu.address': 'Connected address',
    'wallet.menu.copy': 'Copy address',
    'wallet.menu.copied': 'Address copied',
    'wallet.menu.disconnect': 'Disconnect',
    'checking.contract': 'Checking MonadWalletReport contract…',
    'pdf.title': 'MONAD WALLET REPORT',
    'pdf.wallet.network': 'Wallet: {wallet} · Network: {network}',
    'pdf.generated': 'Generated: {date}',
    'pdf.section.financial': 'Financial Summary',
    'pdf.metric': 'Metric',
    'pdf.value': 'Value',
    'pdf.metric.balance': 'Current Balance',
    'pdf.metric.income': 'Income',
    'pdf.metric.expenses': 'Expenses',
    'pdf.metric.net': 'Net',
    'pdf.metric.gas': 'Gas Spent',
    'pdf.metric.totalTxs': 'Total Transactions',
    'pdf.metric.age': 'Wallet Age',
    'pdf.metric.age.days': '{days} days',
    'pdf.metric.score': 'Wallet Score',
    'pdf.section.activity': 'Wallet Activity',
    'pdf.category': 'Category',
    'pdf.count': 'Count',
    'pdf.activity.transfers': 'Transfers',
    'pdf.activity.nft': 'NFT Transactions',
    'pdf.activity.defi': 'DeFi Operations',
    'pdf.activity.approvals': 'Approvals',
    'pdf.activity.revoked': 'Revoked Approvals',
    'pdf.activity.staking': 'Staking',
    'pdf.activity.bridge': 'Bridge Operations',
    'staking.action.delegate': 'Delegate',
    'staking.action.undelegate': 'Undelegate',
    'staking.action.withdraw': 'Withdraw stake',
    'staking.action.claimRewards': 'Claim rewards',
    'staking.action.compound': 'Compound rewards',
    'staking.action.changeCommission': 'Change commission',
    'staking.action.externalReward': 'External reward',
    'staking.action.addValidator': 'Add validator',
    'staking.validator': 'Validator #{id}',
    'pdf.section.health': 'Wallet Health',
    'pdf.indicator': 'Indicator',
    'pdf.score': 'Score',
    'pdf.section.balanceEvolution': 'Balance Evolution · {year}',
    'pdf.date': 'Date',
    'pdf.balance.mon': 'Balance (MON)',
    'pdf.opening': 'Opening {year}',
    'pdf.netChange': 'Net change',
    'pdf.section.expenses': 'Expense Breakdown',
    'pdf.amount.mon': 'Amount (MON)',
    'pdf.section.insights': 'AI Insights',
    'xlsx.sheet.summary': 'Summary',
    'xlsx.sheet.balance': 'Balance Evolution',
    'xlsx.sheet.expenses': 'Expense Breakdown',
    'xlsx.sheet.portfolio': 'Portfolio',
    'xlsx.wallet': 'Wallet',
    'xlsx.network': 'Network',
    'xlsx.year': 'Year',
    'xlsx.balance.mon': 'Balance (MON)',
    'xlsx.income.mon': 'Income (MON)',
    'xlsx.expenses.mon': 'Expenses (MON)',
    'xlsx.net.mon': 'Net (MON)',
    'xlsx.gas.mon': 'Gas (MON)',
    'xlsx.totalTxs': 'Total Transactions',
    'xlsx.age.days': 'Wallet Age (days)',
    'xlsx.score': 'Wallet Score',
    'xlsx.symbol': 'Symbol',
    'xlsx.name': 'Name',
    'xlsx.amount': 'Amount',
    'wallet.picker.title': 'Choose a wallet',
    'wallet.picker.subtitle': 'Select the wallet you want to use for this session.',
    'wallet.picker.none': 'No EVM wallet was detected. Install a wallet compatible with EIP-6963, then refresh this page.',
    'wallet.picker.install': 'Install an EVM-compatible browser wallet and try again.',

    // Header controls
    'header.theme.light': 'Switch to light theme',
    'header.theme.dark': 'Switch to dark theme',
    'header.lang.toggle': 'Change language',

    // Wallet connector
    'wallet.connect': 'Connect Wallet',
    'wallet.connecting': 'Connecting...',
    'wallet.disconnect': 'Disconnect',
    'wallet.settings': 'Settings',
    'wallet.settings.title': 'Data source settings',
    'wallet.settings.desc': 'Choose which indexer to fetch on-chain data from.',
    'wallet.provider.label': 'API Provider',
    'wallet.provider.etherscan': 'Etherscan V2 (MonadScan)',
    'wallet.provider.blockvision': 'BlockVision',
    'wallet.apikey.label': 'API Key',
    'wallet.apikey.placeholder': 'Optional — leave blank for public access',
    'wallet.apikey.help.etherscan':
      'Get a free key at ',
    'wallet.apikey.help.blockvision':
      'Register for a free key at ',
    'wallet.apikey.public.note':
      'No key entered — using a shared public key (rate-limited).',

    // Overview banner
    'overview.setup.title': 'Connect your wallet to see live data',
    'overview.setup.wallet': 'Connect your wallet from the top-right button. ',
    'overview.setup.public':
      'All data shown comes from public on-chain sources — this dashboard only aggregates and formats it.',

    // Columns
    'col.recent': 'Recent Transactions',
    'col.report': 'Annual Report',
    'col.holdings': 'Your Holdings',

    // Annual report
    'report.what': 'About',
    'report.select.year': 'Select Year',
    'report.generate': 'Generate Annual Report',
    'report.generating': 'Processing payment...',
    'report.unlocked': 'Unlocked',
    'report.locked.title': 'Report Locked',
    'report.locked.desc':
      "You haven't purchased the {year} annual report yet. Click Generate Annual Report to pay 1 MON and unlock it.",
    'report.fee.note':
      'The 1 MON fee unlocks aggregation and export for the selected year. All underlying data is public on-chain — you are only paying for consolidation and formatting.',
    'report.no.history': 'No transaction history found to generate reports.',
    'report.stat.tx': 'Transactions',
    'report.stat.gas': 'Gas Spent (MON)',
    'report.stat.received': 'Total Received',
    'report.stat.sent': 'Total Sent',
    'report.chart.income': 'Income vs Expense (MON)',
    'report.chart.income.label': 'Income',
    'report.chart.expense.label': 'Expense',
    'report.chart.breakdown': 'Activity Breakdown',
    'report.chart.legend.transfers': 'Transfers',
    'report.chart.legend.approvals': 'Approvals',
    'report.chart.legend.contracts': 'Contracts',
    'report.table.category': 'Category',
    'report.table.count': 'Transaction Count',
    'report.table.explanation': 'Explanation',
    'report.table.transfers': 'Simple peer-to-peer sending or receiving of native MON.',
    'report.table.approvals': 'Authorizing smart contracts to spend your tokens securely.',
    'report.table.contracts':
      'DeFi interactions, token swaps, mints and other complex smart contract calls.',
    'report.staking.title': 'Staking Estimate',
    'report.staking.desc':
      'Note: Monad currently lacks a dedicated staking indexer. This is an approximation based on outgoing contract calls.',
    'report.staking.body':
      'Estimated staked assets data not fully determinable via basic Explorer API. Detailed trace indexing required for accurate staking yield.',

    // Toasts
    'toast.unlocked.title': 'Report Unlocked',
    'toast.unlocked.desc': 'Successfully unlocked annual report for {year}.',
    'toast.fail.title': 'Transaction Failed',
    'toast.fail.desc': 'Failed to interact with contract.',
    'toast.demo.title': 'Demo mode',
    'toast.demo.desc':
      'No payment contract configured yet — {year} is unlocked locally for preview.',

    // Not-connected states
    'state.connect.wallet': 'Connect Wallet',
    'state.no.wallet': 'No Wallet Connected',
    'state.no.wallet.desc': 'Connect your wallet to view transactions.',
    'state.api.required': 'API Key Required',
    'state.api.required.desc':
      'Set your API key in settings, or switch to Etherscan V2 to use the public fallback.',
    'state.no.tx': 'No transactions found for this address.',

    // Transactions table
    'tx.type': 'Type',
    'tx.hash': 'Tx Hash',
    'tx.date': 'Date',
    'tx.value': 'Value',
    'tx.gas': 'Gas Spent',
    'tx.link': 'Link',
    'tx.in': 'In',
    'tx.out': 'Out',
    'tx.showing': 'Showing last 100 transactions',

    // Holdings
    'holdings.tokens': 'ERC-20 Token Balances',
    'holdings.nfts': 'NFT Holdings',
    'holdings.no.tokens': 'No token balances found.',
    'holdings.no.nfts': 'No NFTs found.',
    'holdings.col.token': 'Token',
    'holdings.col.symbol': 'Symbol',
    'holdings.col.balance': 'Balance',

    // About modal
    'about.title': 'About the Annual Report',
    'about.subtitle': 'Everything you need to know before generating it.',
    'about.what.title': 'What does the report do?',
    'about.what.body':
      'It consolidates all your on-chain activity for the selected year into a single auditable report: DeFi transactions (swaps, staking, LPs), token transfers, NFT activity, approvals/revocations, gas spent, current ERC-20 and NFT holdings, and a staking estimate. The report is shown in the center panel with a donut chart of expense distribution and can be exported to PDF and Excel.',
    'about.cost.title': 'How much does it cost?',
    'about.cost.body':
      'Unlocking costs 1 MON per year, paid once to the AnnualReportFee smart contract. The payment is recorded on-chain — anyone can verify on the explorer that the year is enabled for your wallet. No subscriptions, no recurring charges.',
    'about.public.title': 'All the data is public',
    'about.public.body':
      'Nothing you see here is private information. The dashboard only reads data that already lives openly on the Monad blockchain — via RPC and the public APIs of MonadScan / BlockVision. The 1 MON fee does not buy your data: it pays for aggregating, categorizing and formatting it into a downloadable report.',
    'about.custodial.body':
      'The app is 100% non-custodial: it never sees your private key. You only sign the fee transaction from your own wallet.',

    // Footer
    'footer.note':
      'All data shown originates from the public Monad blockchain (RPC + Etherscan V2 / BlockVision). None of this information is private — this dashboard only aggregates and formats it.'
  },

  es: {
    'tab.transactions': 'Transacciones',
    'tab.reports': 'Reporte Anual',
    'tab.holdings': 'Holdings',
    'brand.name': 'Monad Wallet Report',
    'brand.tag': 'Analítica Premium',

    // Landing
    'landing.pill': 'Analítica Premium de Wallet',
    'landing.subtitle':
      'Convierte tu historial on-chain en Monad en un reporte premium exportable y elegante. Resumen financiero, portafolio, NFTs, wallet score e insights con IA — todo en un solo lugar.',
    'landing.cta': 'Conectar Wallet',
    'landing.noncustodial': '100% no-custodial. Nunca vemos tus claves.',
    'landing.feature.financial': 'Resumen Financiero',
    'landing.feature.portfolio': 'Portafolio de Activos',
    'landing.feature.nft': 'Análisis de NFTs',
    'landing.feature.score': 'Wallet Score',
    'landing.feature.pdf': 'Exportar a PDF',
    'landing.feature.ai': 'Insights con IA',
    'landing.footnote':
      'Impulsado por datos públicos on-chain. No necesitas cuenta — solo tu wallet.',

    // Landing — secciones extendidas
    'landing.nav.how': 'Cómo funciona',
    'landing.nav.report': 'El reporte',
    'landing.nav.proof': 'On-chain proof',
    'landing.nav.pricing': 'Acceso',
    'landing.badge.score': 'Wallet Score',
    'landing.badge.report': 'Reporte {year}',
    'landing.badge.sealed': 'SELLADO',
    'landing.badge.portfolio': 'Portafolio',
    'landing.trust.label': 'IMPULSADO POR EL STACK DE MONAD',
    'landing.ticker.block': 'bloque',
    'landing.ticker.minted': 'reportes sellados',
    'landing.ticker.wallets': 'wallets totales',
    'landing.ticker.gas': 'gas promedio',
    'landing.how.eyebrow': 'CÓMO FUNCIONA',
    'landing.how.title': 'Tres pasos. Cero intermediarios.',
    'landing.how.subtitle':
      'No pedimos email, no guardamos claves, no operamos servidores de reportes. Todo el flujo vive en un smart contract auditable en Monad.',
    'landing.how.step1.title': 'Conecta tu wallet',
    'landing.how.step1.body': 'MetaMask, Rabby, Phantom o WalletConnect. Firmas un mensaje. Nada más.',
    'landing.how.step2.title': 'Genera el reporte',
    'landing.how.step2.body': 'El contrato indexa tu historial anual — trades, DeFi, NFTs, gas, PnL — y lo sella con tu firma.',
    'landing.how.step3.title': 'On-chain para siempre',
    'landing.how.step3.body': 'El hash queda registrado en Monad. Exporta PDF, comparte, o verifica años después.',
    'landing.features.eyebrow': 'QUÉ INCLUYE',
    'landing.features.title': 'Todo lo que tu contador debería tener.',
    'landing.features.financial.title': 'Resumen financiero',
    'landing.features.financial.body':
      'Total invertido, retornos realizados, gastos en gas, PnL por token y por trimestre. Todo derivado directamente de tus transacciones.',
    'landing.features.portfolio.title': 'Distribución de portfolio',
    'landing.features.portfolio.body': 'DeFi · NFTs · Otros — con el peso exacto en tu wallet.',
    'landing.features.score.title': 'Wallet Score',
    'landing.features.score.body': 'Un puntaje del 1 al 1000 basado en diversificación, longevidad, riesgo y actividad DeFi.',
    'landing.features.score.tier': 'Elite tier',
    'landing.features.nft.title': 'Análisis NFT',
    'landing.features.nft.body': 'Todas tus colecciones y piezas coleccionables, en un solo lugar.',
    'landing.features.pdf.title': 'Export PDF',
    'landing.features.pdf.body': 'Reporte imprimible listo para tu contador, en un click.',
    'landing.features.ai.title': 'AI insights',
    'landing.features.ai.body':
      'Un analista virtual lee tu reporte y sugiere rebalanceos, oportunidades DeFi y errores comunes. Todo derivado de tus propias transacciones.',
    'landing.features.ai.line1': 'Tu concentración en MON supera el 62%. Considera diversificar hacia stablecoins en Q3.',
    'landing.features.ai.line2': 'Gastaste 0.084 MON en gas en trades <0.5 MON — batching podría ahorrarte 40%.',
    'landing.report.eyebrow': 'EL REPORTE',
    'landing.report.title': 'Diseñado como un reporte anual real.',
    'landing.report.subtitle':
      'No es un dashboard más. Es un documento completo, con portada, KPIs, tablas de trades y firma criptográfica. Se ve bien en pantalla y aún mejor impreso.',
    'landing.report.check1': 'Portada con hash + firma',
    'landing.report.check2': '12 KPIs financieros',
    'landing.report.check3': 'Tablas de trades exportables',
    'landing.report.check4': 'Verificable por cualquiera con el tx hash',
    'landing.report.mock.eyebrow': 'REPORTE ANUAL · {year}',
    'landing.report.mock.sealed': 'SELLADO ON-CHAIN',
    'landing.report.mock.kpi.portfolio': 'Portfolio',
    'landing.report.mock.kpi.pnl': 'PnL {year}',
    'landing.report.mock.kpi.trades': 'Trades',
    'landing.report.mock.kpi.gas': 'Gas',
    'landing.report.mock.verify': 'Verificar en Monadscan →',
    'landing.report.compare.traditional': 'EXPORTS TRADICIONALES',
    'landing.report.compare.bad1': 'CSV editables · zero proof',
    'landing.report.compare.bad2': 'Datos en servidores privados',
    'landing.report.compare.bad3': 'Se pierden con la exchange',
    'landing.report.compare.us': 'MONAD WALLET REPORT',
    'landing.report.compare.good1': 'Inmutable · firmado por ti',
    'landing.report.compare.good2': '100% en Monad L1',
    'landing.report.compare.good3': 'Vive mientras exista la cadena',
    'landing.proof.eyebrow': 'ON-CHAIN PROOF',
    'landing.proof.title': 'Cada reporte es un evento verificable.',
    'landing.proof.subtitle':
      'Tu reporte no vive en nuestro servidor. Vive en Monad. Cualquiera puede verificar que existe, quién lo firmó, y en qué bloque fue sellado.',
    'landing.proof.contract': 'MonadWalletReport.sol · read-only',
    'landing.stats.wallets': 'Wallets registradas',
    'landing.stats.reports': 'Reports sellados',
    'landing.stats.assets': 'Activos analizados',
    'landing.stats.uptime': 'Uptime on-chain',
    'landing.cta2.eyebrow': 'EMPIEZA AHORA',
    'landing.cta2.title': 'Tu año en Monad merece un reporte real.',
    'landing.cta2.subtitle': 'Conecta tu wallet y obtén tu primer reporte anual, sellado on-chain.',
    'landing.cta2.price': 'por reporte anual',
    'landing.cta2.priceNote': 'pago único · no suscripción',
    'landing.footer.tagline': 'El hub de reportes anuales on-chain. Construido sobre Monad L1.',
    'landing.footer.product': 'Producto',
    'landing.footer.resources': 'Recursos',
    'landing.footer.community': 'Comunidad',
    'landing.footer.rights': 'non-custodial',

    // Connected home / balance step
    'home.balance.label': 'Balance Actual',
    'home.cta.generate': 'Generar Reporte',
    'home.cta.generate.year': 'Generar reporte {year}',
    'home.year.label': 'Selecciona el año a generar',
    'home.year.help': 'Se crea y guarda on-chain un reporte independiente por cada año.',
    'home.assurance': 'Te mostraremos el precio antes de comenzar.',

    // Modal de reporte (sin la palabra "Premium")
    'modal.badge': 'Reporte',
    'modal.title': 'Reporte de Wallet',
    'modal.title.plain': 'Generar Reporte de Wallet',
    'modal.subtitle':
      'Desbloquea el reporte auditable completo de tu wallet. Pago único por año.',
    'modal.subtitle.plain':
      'Consolida tu actividad on-chain de un año fiscal en un reporte descargable.',
    'modal.year.label': 'Año fiscal',
    'modal.year.help':
      'Los reportes se guardan on-chain, indexados por año — puedes generar un reporte por año.',
    'modal.price.label': 'Precio',
    'modal.billing': 'Facturación',
    'modal.billing.once': 'Pago único · Sin suscripción',
    'modal.billing.symbolic': 'Pago simbólico anual',
    'modal.symbolic.note':
      'El 1 MON es un pago simbólico anual por el reporte de {year}: cubre el trabajo de consolidar, categorizar y formatear datos públicos on-chain — no los datos en sí. Se paga una única vez por año y por wallet, on-chain, sin suscripción.',
    'modal.includes': 'Incluye',
    'modal.item.financial': 'Resumen Financiero',
    'modal.item.portfolio': 'Portafolio de Activos',
    'modal.item.nft': 'Análisis de NFTs',
    'modal.item.tokens': 'Tokens en tenencia',
    'modal.item.score': 'Wallet Score',
    'modal.item.pdf': 'Exportar a PDF',
    'modal.item.ai': 'Insights con IA',
    'modal.cancel': 'Cancelar',
    'modal.confirm': 'Generar Reporte',
    'modal.confirm.plain': 'Generar Reporte',

    // Generating screen
    'gen.title': 'Analizando tu wallet',
    'gen.subtitle':
      'Un momento — estamos consolidando tu actividad on-chain en un reporte.',
    'gen.subtitle.year':
      'Consolidando tu actividad on-chain de {year} en tu reporte.',
    'gen.progress': 'Progreso',
    'gen.step.blockchain': 'Analizando blockchain…',
    'gen.step.tx': 'Escaneando transacciones…',
    'gen.step.balance': 'Calculando balance…',
    'gen.step.nft': 'Analizando NFTs…',
    'gen.step.score': 'Calculando Wallet Score…',
    'gen.step.pdf': 'Generando PDF…',

    // Fase de transacción (antes del análisis)
    'gen.tx.title.pending': 'Transacción pendiente',
    'gen.tx.title.success': 'Transacción exitosa',
    'gen.tx.title.failed': 'Transacción fallida',
    'gen.tx.subtitle.pending':
      'Confirma el pago de 1 MON en tu wallet para desbloquear el reporte de {year}.',
    'gen.tx.subtitle.success':
      'Tu pago del reporte de {year} fue confirmado on-chain.',
    'gen.tx.subtitle.failed':
      'La transacción no pudo completarse. No se te cobró nada.',
    'gen.tx.reverted': 'La transacción fue revertida.',
    'gen.tx.hash': 'Tx',
    'gen.tx.confirmed': 'Confirmada',
    'gen.tx.retry': 'Intentar de nuevo',
    'gen.tx.hint.title': 'Esperando confirmación',
    'gen.tx.hint.body':
      'Aprueba la transacción en tu wallet. El análisis empezará en cuanto la transacción se confirme on-chain.',
    // Mensaje "Cancelar y volver" eliminado — el rechazo desde la
    // wallet cierra el flujo automáticamente sin intervención manual.
    'gen.tx.next.title': 'Siguiente paso',
    'gen.tx.next.body':
      'El análisis de la wallet comenzará automáticamente en unos instantes.',

    // Errores de transacción amigables
    'err.toast.title': 'No se pudo generar el reporte',
    'err.rejected': 'Rechazaste la transacción en tu wallet.',
    'err.cancelledByUser': 'Cancelaste esta transacción desde tu wallet.',
    'err.pending': 'Ya hay una petición abierta en tu wallet.',
    'err.rpc': 'La red no responde. Intenta de nuevo en un momento.',
    'err.insufficient': 'No tienes suficiente MON para cubrir el costo.',
    'err.already': 'Este reporte ya se generó para este año.',
    'err.network': 'Red incorrecta. Cambia a Monad e inténtalo de nuevo.',
    'err.timeout': 'La transacción tardó demasiado. Vuelve a intentarlo.',
    'err.nonce': 'Hay otra transacción pendiente. Espera un momento y reintenta.',
    'err.reverted': 'La transacción fue rechazada on-chain. No se te cobró nada.',

    // Dashboard — banner de datos no disponibles
    'dashboard.dataError.title': 'No se pudo cargar tu historial de transacciones',
    'dashboard.dataError.body':
      'Las cifras de abajo muestran 0 porque no pudimos conectar con la API del explorador en este momento. El balance en vivo de arriba se lee directo de la red, así que sigue siendo correcto. Por favor intenta de nuevo en un momento.',

    // Dashboard
    'dash.hero.badge': 'Reporte de Wallet',
    'dash.hero.badge.year': 'Reporte de Wallet · {year}',
    'dash.hero.already.year': 'Reporte ya generado para {year}',
    'dash.year.switch': 'Año:',
    'dash.hero.title': 'Resumen Financiero',
    'dash.hero.subtitle':
      'Una foto consolidada de tu wallet en Monad — balance, flujo, actividad y salud de un vistazo.',
    'dash.scope.live': 'EN VIVO',
    'dash.scope.total': 'HISTÓRICO',
    'dash.card.balance': 'Balance Actual',
    'dash.card.balance.hint':
      'Balance nativo de MON en esta wallet ahora mismo — no depende del año seleccionado arriba.',
    'dash.card.income': 'Ingresos',
    'dash.card.income.hint': 'Total de MON recibido en todas las transacciones de {year}.',
    'dash.card.expenses': 'Gastos',
    'dash.card.expenses.hint': 'Total de MON enviado desde esta wallet en {year}.',
    'dash.card.net': 'Beneficio Neto',
    'dash.card.net.hint': 'Ingresos menos gastos de {year} (solo MON nativo).',
    'dash.card.txcount': 'Transacciones',
    'dash.card.txcount.hint': 'Todas las transacciones registradas de esta wallet en {year}.',
    'dash.card.gas': 'Gas Gastado',
    'dash.card.gas.hint': 'Total de comisiones de red pagadas en {year}, en MON.',
    'dash.card.age': 'Antigüedad',
    'dash.card.age.unit': 'días',
    'dash.card.age.hint':
      'Días desde tu primera actividad registrada — histórico total, no depende del año seleccionado.',
    'dash.card.score': 'Wallet Score',
    'dash.card.score.hint':
      'Puntuación combinada de actividad, antigüedad, diversidad y salud.',
    'dash.score.label.excellent': 'Excelente',
    'dash.score.label.good': 'Bueno',
    'dash.score.label.fair': 'Aceptable',
    'dash.score.label.new': 'Wallet Nueva',
    'dash.footer.note':
      'Todos los datos provienen de fuentes públicas on-chain. Este reporte solo los agrega y formatea — nada aquí es privado.',

    // ---- Secciones premium ----
    'section.eyebrow': 'Sección {n}',
    'chart.expense.dustNote': 'Las transacciones menores a {n} MON se agrupan en “Otros”.',
    'section.charts.title': 'Gráficos Financieros',
    'section.charts.subtitle': 'Desglose visual de tu actividad on-chain.',
    'section.portfolio.title': 'Portafolio de Activos',
    'section.portfolio.subtitle':
      'Tokens y NFTs que tienes ahora mismo en esta wallet, más tu balance promedio de MON en {year}.',
    'section.activity.title': 'Actividad de la Wallet',
    'section.activity.subtitle': 'Operaciones on-chain categorizadas.',
    'section.health.title': 'Salud de la Wallet',
    'section.health.subtitle': 'Indicadores compuestos de higiene y rendimiento.',
    'section.insights.title': 'Insights con IA',
    'section.insights.subtitle': 'Recomendaciones heurísticas basadas en tus datos.',
    'section.tx.title': 'Transacciones Recientes',
    'section.tx.subtitle': 'Mostrando las {shown} más recientes de {total} transacciones de {year}.',

    // Gráficos
    'chart.donut.title': 'Distribución de Gastos',
    'chart.bar.title': 'Ingresos vs Gastos',
    'chart.area.title': 'Evolución del Balance',
    'chart.area.start': 'Inicio',
    'chart.area.change': 'Cambio neto',
    'chart.area.end': 'Ahora',
    'chart.area.end.eoy': 'Fin de {year}',
    'chart.expense.title': 'Desglose de Gastos (MON)',
    'chart.pie.title': 'Distribución de Activos',
    'chart.legend.defi': 'DeFi',
    'chart.legend.transfers': 'Transferencias',
    'chart.legend.nfts': 'NFTs',
    'chart.legend.approvals': 'Aprobaciones',
    'chart.legend.gas': 'Gas',
    'chart.legend.other': 'Otros',
    'chart.legend.income': 'Ingresos',
    'chart.legend.expenses': 'Gastos',
    'chart.legend.balance': 'Balance',
    'chart.empty': 'Aún no hay suficientes datos para este gráfico.',
    'chart.range.label': 'Rango:',
    'chart.range.30d': '30D',
    'chart.range.90d': '90D',
    'chart.range.all': 'Todo',

    // Portafolio
    'port.qty': 'Cantidad',
    'port.qty.nfts': 'Piezas poseídas ahora',
    'port.native': 'Token nativo',
    'port.native.avg': 'Promedio en {year}',
    'port.wrapped': 'MON envuelto',
    'port.stable': 'Stablecoin USD',
    'port.governance': 'Gobernanza',
    'port.nfts.desc': 'Coleccionables',
    'port.estimate.suffix': ' (estimado por transferencias de este año, saldo on-chain no disponible)',
    'port.tap.hint': 'Toca para ver todas',

    // Modal de NFTs (todas las que la wallet tuvo alguna vez)
    'nftmodal.title': 'Mis NFTs',
    'nftmodal.heldSuffix': 'en la wallet ahora',
    'nftmodal.totalSuffix': 'en total (histórico)',
    'nftmodal.status.held': 'En wallet',
    'nftmodal.status.gone': 'No disponible',
    'nftmodal.disclaimer':
      'Armado a partir de cada transferencia NFT en la que participó esta wallet — cubre todos los años, no solo el seleccionado arriba.',

    // Actividad
    'act.transfers': 'Total Transferencias',
    'act.nft': 'Transacciones NFT',
    'act.defi': 'Operaciones DeFi',
    'act.approvals': 'Aprobaciones',
    'act.revoked': 'Aprobaciones Revocadas',
    'act.staking': 'Staking',
    'act.bridge': 'Operaciones Bridge',

    // Salud
    'health.security': 'Seguridad',
    'health.diversification': 'Diversificación',
    'health.activity': 'Actividad',
    'health.gas': 'Eficiencia de Gas',
    'health.risk': 'Nivel de Riesgo',

    // Insights
    'ins.defi.pct': 'El {pct}% de tus gastos provienen de operaciones DeFi.',
    'ins.activity.up': 'Tu actividad aumentó respecto al año pasado.',
    'ins.activity.down': 'Tu actividad disminuyó respecto al año pasado.',
    'ins.diversification.good': 'Tienes una buena diversificación de activos.',
    'ins.diversification.low': 'Tu portafolio está muy concentrado. Considera diversificar.',
    'ins.gas.tip': 'Podrías reducir costos de gas agrupando transacciones.',
    'ins.approvals.warn': 'Tienes {n} aprobaciones activas — revísalas periódicamente.',
    'ins.newborn': 'Tu wallet es nueva — los insights mejorarán conforme crezca tu historial.',

    // Tabla de transacciones
    'txt.type': 'Tipo',
    'txt.date': 'Fecha',
    'txt.amount': 'Monto',
    'txt.status': 'Estado',
    'txt.category': 'Categoría',
    'txt.hash': 'Hash',
    'txt.status.success': 'Exitosa',
    'txt.status.failed': 'Fallida',
    'txt.category.transfer': 'Transferencia',
    'txt.category.approval': 'Aprobación',
    'txt.category.contract': 'Contrato',
    'txt.category.nft': 'NFT',
    'txt.category.swap': 'Swap',
    'txt.empty': 'Aún no hay transacciones en esta wallet.',

    // Export
    'export.title': 'Exportar Reporte',
    'export.subtitle': 'Descarga este reporte en el formato que prefieras.',
    'export.pdf': 'Exportar PDF',
    'export.excel': 'Exportar Excel',
    'export.json': 'Exportar JSON',
    'export.csv': 'Exportar CSV',

    // Drill-down / modales de "Datos actuales"
    'nowmodal.title': 'Datos actuales de la wallet',
    'nowmodal.subtitle': 'Instantánea en vivo de esta wallet.',
    'nowmodal.staking': 'Staking',
    'nowmodal.defi': 'DeFi activo',
    'nowmodal.active': 'Activo',
    'nowmodal.inactive': 'No activo',
    'nowmodal.disclaimer':
      'El estado activo se infiere a partir de operaciones on-chain detectadas en el año seleccionado. No es un oráculo de posiciones en tiempo real.',

    // Header
    'header.disconnect': 'Desconectar',

    // Menú de la wallet (clic en la dirección del header)
    'wallet.menu.aria': 'Menú de la wallet',
    'wallet.menu.address': 'Dirección conectada',
    'wallet.menu.copy': 'Copiar dirección',
    'wallet.menu.copied': 'Dirección copiada',
    'wallet.menu.disconnect': 'Desconectar',
    'checking.contract': 'Consultando el contrato MonadWalletReport…',
    'pdf.title': 'REPORTE DE WALLET MONAD',
    'pdf.wallet.network': 'Wallet: {wallet} · Red: {network}',
    'pdf.generated': 'Generado: {date}',
    'pdf.section.financial': 'Resumen Financiero',
    'pdf.metric': 'Métrica',
    'pdf.value': 'Valor',
    'pdf.metric.balance': 'Saldo Actual',
    'pdf.metric.income': 'Ingresos',
    'pdf.metric.expenses': 'Gastos',
    'pdf.metric.net': 'Neto',
    'pdf.metric.gas': 'Gas Gastado',
    'pdf.metric.totalTxs': 'Transacciones Totales',
    'pdf.metric.age': 'Antigüedad de la Wallet',
    'pdf.metric.age.days': '{days} días',
    'pdf.metric.score': 'Puntaje de la Wallet',
    'pdf.section.activity': 'Actividad de la Wallet',
    'pdf.category': 'Categoría',
    'pdf.count': 'Cantidad',
    'pdf.activity.transfers': 'Transferencias',
    'pdf.activity.nft': 'Transacciones NFT',
    'pdf.activity.defi': 'Operaciones DeFi',
    'pdf.activity.approvals': 'Aprobaciones',
    'pdf.activity.revoked': 'Aprobaciones Revocadas',
    'pdf.activity.staking': 'Staking',
    'pdf.activity.bridge': 'Operaciones de Bridge',
    'staking.action.delegate': 'Delegar',
    'staking.action.undelegate': 'Deshacer delegación',
    'staking.action.withdraw': 'Retirar stake',
    'staking.action.claimRewards': 'Reclamar recompensas',
    'staking.action.compound': 'Reinvertir recompensas',
    'staking.action.changeCommission': 'Cambiar comisión',
    'staking.action.externalReward': 'Recompensa externa',
    'staking.action.addValidator': 'Agregar validador',
    'staking.validator': 'Validador #{id}',
    'pdf.section.health': 'Salud de la Wallet',
    'pdf.indicator': 'Indicador',
    'pdf.score': 'Puntaje',
    'pdf.section.balanceEvolution': 'Evolución del Saldo · {year}',
    'pdf.date': 'Fecha',
    'pdf.balance.mon': 'Saldo (MON)',
    'pdf.opening': 'Apertura {year}',
    'pdf.netChange': 'Cambio neto',
    'pdf.section.expenses': 'Desglose de Gastos',
    'pdf.amount.mon': 'Monto (MON)',
    'pdf.section.insights': 'Insights de IA',
    'xlsx.sheet.summary': 'Resumen',
    'xlsx.sheet.balance': 'Evolución del Saldo',
    'xlsx.sheet.expenses': 'Desglose de Gastos',
    'xlsx.sheet.portfolio': 'Portafolio',
    'xlsx.wallet': 'Wallet',
    'xlsx.network': 'Red',
    'xlsx.year': 'Año',
    'xlsx.balance.mon': 'Saldo (MON)',
    'xlsx.income.mon': 'Ingresos (MON)',
    'xlsx.expenses.mon': 'Gastos (MON)',
    'xlsx.net.mon': 'Neto (MON)',
    'xlsx.gas.mon': 'Gas (MON)',
    'xlsx.totalTxs': 'Transacciones Totales',
    'xlsx.age.days': 'Antigüedad de la Wallet (días)',
    'xlsx.score': 'Puntaje de la Wallet',
    'xlsx.symbol': 'Símbolo',
    'xlsx.name': 'Nombre',
    'xlsx.amount': 'Monto',
    'wallet.picker.title': 'Elegí una wallet',
    'wallet.picker.subtitle': 'Seleccioná la wallet que querés usar en esta sesión.',
    'wallet.picker.none': 'No se detectó ninguna wallet EVM. Instalá una wallet compatible con EIP-6963 y actualizá esta página.',
    'wallet.picker.install': 'Instalá una wallet de navegador compatible con EVM e intentá de nuevo.',

    'header.theme.light': 'Cambiar a tema claro',
    'header.theme.dark': 'Cambiar a tema oscuro',
    'header.lang.toggle': 'Cambiar idioma',

    'wallet.connect': 'Conectar Wallet',
    'wallet.connecting': 'Conectando...',
    'wallet.disconnect': 'Desconectar',
    'wallet.settings': 'Configuración',
    'wallet.settings.title': 'Fuente de datos',
    'wallet.settings.desc': 'Elige el indexador desde el que leer los datos on-chain.',
    'wallet.provider.label': 'Proveedor de API',
    'wallet.provider.etherscan': 'Etherscan V2 (MonadScan)',
    'wallet.provider.blockvision': 'BlockVision',
    'wallet.apikey.label': 'API Key',
    'wallet.apikey.placeholder': 'Opcional — déjalo vacío para acceso público',
    'wallet.apikey.help.etherscan': 'Consigue una key gratis en ',
    'wallet.apikey.help.blockvision': 'Regístrate para una key gratis en ',
    'wallet.apikey.public.note':
      'Sin key propia — se usa una key pública compartida (con límite de peticiones).',

    'overview.setup.title': 'Conecta tu wallet para ver datos en vivo',
    'overview.setup.wallet': 'Conecta tu wallet desde el botón superior derecho. ',
    'overview.setup.public':
      'Todos los datos mostrados provienen de fuentes públicas on-chain — este dashboard únicamente los agrega y formatea.',

    'col.recent': 'Transacciones Recientes',
    'col.report': 'Reporte Anual',
    'col.holdings': 'Tus Holdings',

    'report.what': 'Info',
    'report.select.year': 'Selecciona Año',
    'report.generate': 'Generar Reporte Anual',
    'report.generating': 'Procesando pago...',
    'report.unlocked': 'Desbloqueado',
    'report.locked.title': 'Reporte Bloqueado',
    'report.locked.desc':
      'Aún no has adquirido el reporte anual de {year}. Haz clic en Generar Reporte Anual para pagar 1 MON y desbloquearlo.',
    'report.fee.note':
      'El fee de 1 MON desbloquea la agregación y descarga para el año seleccionado. Los datos son públicos on-chain; solo pagas el trabajo de consolidarlos.',
    'report.no.history': 'No se encontró historial de transacciones para generar reportes.',
    'report.stat.tx': 'Transacciones',
    'report.stat.gas': 'Gas Gastado (MON)',
    'report.stat.received': 'Total Recibido',
    'report.stat.sent': 'Total Enviado',
    'report.chart.income': 'Ingresos vs Gastos (MON)',
    'report.chart.income.label': 'Ingreso',
    'report.chart.expense.label': 'Gasto',
    'report.chart.breakdown': 'Distribución de Actividad',
    'report.chart.legend.transfers': 'Transferencias',
    'report.chart.legend.approvals': 'Aprobaciones',
    'report.chart.legend.contracts': 'Contratos',
    'report.table.category': 'Categoría',
    'report.table.count': 'Nº Transacciones',
    'report.table.explanation': 'Explicación',
    'report.table.transfers': 'Envío o recepción P2P simple de MON nativo.',
    'report.table.approvals': 'Autorizar a contratos inteligentes a gastar tus tokens.',
    'report.table.contracts':
      'Interacciones DeFi, swaps, mints y otras llamadas complejas a contratos inteligentes.',
    'report.staking.title': 'Estimación de Staking',
    'report.staking.desc':
      'Nota: Monad aún no cuenta con un indexer de staking dedicado. Esto es una aproximación basada en llamadas salientes a contratos.',
    'report.staking.body':
      'No es posible determinar con precisión los activos en staking desde la API básica del Explorer. Se requiere trace indexing para calcular yield.',

    'toast.unlocked.title': 'Reporte Desbloqueado',
    'toast.unlocked.desc': 'Se desbloqueó correctamente el reporte anual {year}.',
    'toast.fail.title': 'Transacción Fallida',
    'toast.fail.desc': 'No se pudo interactuar con el contrato.',
    'toast.demo.title': 'Modo demo',
    'toast.demo.desc':
      'Aún no hay contrato de pago configurado — {year} se desbloqueó localmente para previsualización.',

    'state.connect.wallet': 'Conectar Wallet',
    'state.no.wallet': 'Sin Wallet Conectada',
    'state.no.wallet.desc': 'Conecta tu wallet para ver transacciones.',
    'state.api.required': 'Se requiere API Key',
    'state.api.required.desc':
      'Configura tu API key o cambia a Etherscan V2 para usar la key pública.',
    'state.no.tx': 'No se encontraron transacciones para esta dirección.',

    'tx.type': 'Tipo',
    'tx.hash': 'Hash Tx',
    'tx.date': 'Fecha',
    'tx.value': 'Valor',
    'tx.gas': 'Gas',
    'tx.link': 'Link',
    'tx.in': 'Entrada',
    'tx.out': 'Salida',
    'tx.showing': 'Mostrando las últimas 100 transacciones',

    'holdings.tokens': 'Saldos de Tokens ERC-20',
    'holdings.nfts': 'NFTs Poseídos',
    'holdings.no.tokens': 'No se encontraron saldos de tokens.',
    'holdings.no.nfts': 'No se encontraron NFTs.',
    'holdings.col.token': 'Token',
    'holdings.col.symbol': 'Símbolo',
    'holdings.col.balance': 'Balance',

    'about.title': 'Sobre el Reporte Anual',
    'about.subtitle': 'Todo lo que necesitas saber antes de generarlo.',
    'about.what.title': '¿Qué hace el reporte?',
    'about.what.body':
      'Consolida toda tu actividad on-chain del año seleccionado en un único informe auditable: transacciones DeFi (swaps, staking, LP), transferencias de tokens, actividad NFT, aprobaciones/revocaciones, gas gastado, holdings actuales de ERC-20 y NFTs, y una estimación de staking. Se muestra en el panel central con un gráfico donut y puede exportarse a PDF y Excel.',
    'about.cost.title': '¿Cuánto cuesta?',
    'about.cost.body':
      'Desbloquearlo cuesta 1 MON por año, pagados una única vez al contrato inteligente AnnualReportFee. El pago se registra on-chain: cualquiera puede verificar en el explorador que ese año está habilitado para tu wallet. No hay suscripciones ni cargos recurrentes.',
    'about.public.title': 'Todos los datos son públicos',
    'about.public.body':
      'Nada de lo que ves aquí es información privada. El dashboard únicamente lee datos que ya viven abiertamente en la blockchain de Monad — directamente vía RPC y a través de las APIs públicas de MonadScan y BlockVision. El fee de 1 MON no compra tus datos: compra el trabajo de agregarlos, categorizarlos y formatearlos en un reporte descargable.',
    'about.custodial.body':
      'La app es 100% no-custodial: nunca ve tu clave privada. Solo firmas la transacción del fee desde tu wallet.',

    'footer.note':
      'Todos los datos mostrados provienen de la blockchain pública de Monad (RPC + Etherscan V2 / BlockVision). Nada de esta información es privada — este dashboard únicamente la agrega y formatea.'
  }
};

interface I18nContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);
const I18N_STORAGE_KEY = 'monad_lang';

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'en';
    try {
      const raw = window.localStorage.getItem(I18N_STORAGE_KEY);
      if (raw === 'es' || raw === 'en') return raw;
    } catch {}
    return 'en';
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(I18N_STORAGE_KEY, lang);
      document.documentElement.setAttribute('lang', lang);
    } catch {}
  }, [lang]);

  const t = (key: string, params?: Record<string, string | number>): string => {
    const table = STRINGS[lang] || STRINGS.en;
    let s = table[key] ?? STRINGS.en[key] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      });
    }
    return s;
  };

  return createElement(
    I18nContext.Provider,
    {
      value: {
        lang,
        setLang: setLangState,
        toggleLang: () => setLangState((l) => (l === 'en' ? 'es' : 'en')),
        t
      }
    },
    children
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
