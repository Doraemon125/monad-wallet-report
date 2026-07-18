# Monad Wallet Report

> **A permanent onchain record of your wallet's annual reports.**

Monad Wallet Report is an onchain application for generating annual wallet reports and recording the report status on the **Monad blockchain**.

The project uses the blockchain as the source of truth instead of relying on browser history, local storage, or a centralized database.

---

## 🚀 The Problem

Crypto users often switch between browsers, devices, and wallet extensions.

When that happens, local browser data can disappear.

This creates a simple question:

> **"Have I already generated my wallet report for this year?"**

---

## 💡 The Solution

Monad Wallet Report records the annual report status onchain.

Users can connect their wallet and verify the report status from different browsers or devices by reading the smart contract.

No local storage is used as the source of truth.

---

## ✨ Key Features

- **⛓️ Onchain persistence** — Reports are recorded on Monad.
- **🌍 Portable access** — Check report status from any browser or device.
- **🔍 Transparent verification** — Report status is read from the smart contract.
- **💰 Annual report flow** — The report is generated through an onchain transaction.
- **👛 Wallet integration** — Connect a compatible browser wallet.
- **📄 Wallet analytics** — Review transactions, holdings, and wallet activity.
- **🧾 PDF and Excel export** — Export report data for personal use.

---

## 🧠 Why Onchain?

The blockchain is used for a practical reason.

The goal is to reliably know whether a wallet has already generated an annual report, regardless of the browser or device being used.

The smart contract provides a persistent and independently verifiable record.

---

## 🏗️ How It Works

```text
┌──────────────┐
│    Wallet    │
└──────┬───────┘
       │
       ▼
┌─────────────────────┐
│ Monad Wallet Report │
│      Frontend       │
└──────────┬──────────┘
           │
           │ Same-origin API Route
           ▼
┌─────────────────────┐
│  Vercel API Route   │
│  /api/etherscan     │
└──────────┬──────────┘
           │
           │ Server-side API key
           ▼
┌─────────────────────┐
│    Etherscan V2     │
└─────────────────────┘

           +
           │
           ▼
┌─────────────────────┐
│   Monad Network     │
│   Smart Contract    │
└─────────────────────┘
```

1. The user connects their wallet.
2. The frontend requests wallet data through the Vercel API Route.
3. The API Route securely injects the server-side Etherscan API key.
4. Etherscan V2 returns the wallet data.
5. The frontend generates the report.
6. The smart contract records the annual report status on Monad.

---

## 🔐 API Key Security

The Etherscan API key is **not included in the frontend bundle**.

All Etherscan requests are routed through:

```text
/api/etherscan
```

The API key is stored server-side using the environment variable:

```text
ETHERSCAN_API_KEY
```

The key is never exposed as a `VITE_` variable and is never sent to the browser.

### Vercel Configuration

In your Vercel project, go to:

**Project Settings → Environment Variables**

Add:

```text
ETHERSCAN_API_KEY
```

Set the value to your Etherscan API key.

> **Important:** Never commit your real API key to GitHub.

---

## 🛠️ Tech Stack

### Frontend

- React
- TypeScript
- Vite
- Ethers.js
- Tailwind CSS
- Recharts
- Framer Motion

### Blockchain

- Solidity
- Monad
- Smart Contract

### Backend / API

- Vercel Serverless Functions
- Etherscan API V2

### Report Tools

- jsPDF
- jsPDF AutoTable
- ExcelJS

---

## 📂 Project Structure

```text
monad-wallet-report/
├── api/
│   └── etherscan.js
├── public/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── vercel.json
└── vite.config.ts
```

---

## ⚙️ Getting Started

### Prerequisites

- Node.js 18+
- A compatible browser wallet
- MON on the configured Monad network
- An Etherscan API key

### Installation

Clone the repository:

```bash
git clone https://github.com/Doraemon125/monad-wallet-report.git
```

Navigate to the project:

```bash
cd monad-wallet-report
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

> **Note:** The `/api/etherscan` route is a Vercel Serverless Function. For a complete local environment with the API route, use `vercel dev`.

---

## 🚀 Deploy to Vercel

1. Import the GitHub repository into Vercel.
2. Vercel detects the Vite project automatically.
3. Add the environment variable:

```text
ETHERSCAN_API_KEY
```

4. Deploy the project.

The Etherscan API key remains server-side in the Vercel Function.

---

## 🔗 Smart Contract Interaction

The frontend communicates with the deployed smart contract through its ABI and contract address.

The contract exposes report verification functionality such as:

```solidity
hasReport(year)
```

and:

```solidity
getReport(year)
```

This allows the application to query the blockchain instead of relying on local browser data.

---

## 🎯 Built for Spark

Monad Wallet Report was built for **Spark**, a BuildAnything hackathon focused on building practical onchain applications that solve real problems.

> **Practical impact beats unnecessary complexity.**

The goal is to make wallet report history **persistent, portable, and verifiable**.

---

## 📌 Project Links

- **GitHub:** https://github.com/Doraemon125/monad-wallet-report
- **Live App:** *Coming soon*
- **Smart Contract:** *Add deployed contract address*
- **Demo Video:** *Add demo video URL*

---

## 👨‍💻 Author

Built by **Doraemon125**

---

## 📄 License

This project is open source and available for experimentation and development.
