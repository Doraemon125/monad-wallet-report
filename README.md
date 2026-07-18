# Monad Wallet Report

> **A permanent onchain record of your wallet's annual reports.**

Monad Wallet Report is a simple onchain application that solves a problem I personally encountered while working with crypto wallets: **losing track of whether I had already generated a report for a specific year.**

Instead of relying on browser storage, device history, or a centralized database, the application records the report status directly on the **Monad blockchain**.

---

## 🚀 The Problem

Crypto users often switch between:

* Different browsers
* Multiple devices
* Wallet extensions
* Different environments

When this happens, local history and browser-based data can disappear.

This creates a simple but annoying problem:

> **"Have I already generated my wallet report for this year?"**

There is no reliable, portable way to answer that question if the data only exists locally.

---

## 💡 The Solution

**Monad Wallet Report makes the blockchain the source of truth.**

Users connect their wallet and generate an annual report. The smart contract permanently records the report for the selected year.

The next time the user opens the application — from another browser or device — the blockchain can be queried to verify the report status.

No local storage.  
No browser history.  
No centralized database.

Just a verifiable onchain record.

---

## ✨ Key Features

* **⛓️ Onchain persistence**  
  Reports are recorded directly on Monad.

* **🌍 Universal access**  
  Access your report history from any browser or device.

* **🔍 Transparent verification**  
  Report status can be checked through the smart contract.

* **💰 Simple economic model**  
  Each annual report costs a fixed amount of **1 MON**.

* **👛 Wallet integration**  
  Connect using compatible browser wallets such as OKX Wallet.

* **📄 Report generation**  
  Generate and review wallet reports through a modern dashboard interface.

* **🧾 PDF export**  
  Reports can be exported for personal use and reference.

---

## 🧠 Why Onchain?

This project uses blockchain for a practical reason.

The problem is not "how can I add blockchain to an app?"

The real problem is:

> **How can I reliably know if I already generated a report, regardless of the device or browser I am using?**

A smart contract provides a persistent and independently verifiable record.

The blockchain is not being used as a gimmick.

It solves the persistence problem.

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
           │ Contract interaction
           ▼
┌─────────────────────┐
│   Monad Network     │
│   Smart Contract    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Annual Report State │
│     Onchain         │
└─────────────────────┘
```

1. The user connects their wallet.
2. The frontend interacts with the smart contract.
3. The user generates an annual report.
4. The contract records the report for the corresponding year.
5. The user can later verify the report status from any device.

---

## 🛠️ Tech Stack

### Frontend

* React
* TypeScript
* Vite
* Ethers.js
* Tailwind CSS
* Recharts
* Framer Motion

### Blockchain

* Solidity
* Monad
* Smart Contract

### Wallet

* OKX Wallet
* Browser wallet extension

### Report Tools

* jsPDF
* jsPDF AutoTable
* ExcelJS

---

## 📂 Project Structure

```text
monad-wallet-report/
├── public/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── lib/
│   ├── pages/
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## ⚙️ Getting Started

### Prerequisites

* Node.js 18+
* A compatible browser wallet
* MON on the configured Monad network

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

Open the local URL provided by Vite.

---

## 🔗 Smart Contract Interaction

The frontend communicates with the deployed smart contract through its **ABI and contract address**.

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

Monad Wallet Report was built for **Spark**, a BuildAnything hackathon focused on building practical onchain applications that solve real personal problems.

The project follows a simple principle:

> **Practical impact beats unnecessary complexity.**

This is a small problem, but it is a real one.

The goal is to make wallet report history **persistent, portable, and verifiable**.

---

## 📌 Project Links

* **GitHub:** https://github.com/Doraemon125/monad-wallet-report
* **Live App:** *Coming soon*
* **Smart Contract:** *Add deployed contract address*
* **Demo Video:** *Add demo video URL*

---

## 👨‍💻 Author

Built by **Doraemon125**

---

## 📄 License

This project is open source and available for experimentation and development.
