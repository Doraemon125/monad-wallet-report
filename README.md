MonadWalletReport
📌 Context
Cryptocurrency users lack a reliable way to verify whether they have already generated an annual report for their wallet. When switching browsers or devices, the history is lost and transparency is compromised.

🎯 Solution
MonadWalletReport is a smart contract deployed on the Monad network that enables users to generate and consult annual reports directly on the blockchain.

Each report costs 1 MON and is immutably recorded.

The frontend connects to the contract via ABI and address, without relying on local storage.

The blockchain becomes the single source of truth, ensuring transparency and persistence.

⚙️ Key Features
On‑chain transparency: all reports are validated on the Monad network.

Universal persistence: accessible from any device or browser.

Sustainable model: clear monetization with a fixed price per report.

Simple integration: compatible with wallets such as OKX and browser extensions.

🛠️ Tech Stack
Smart Contract: Solidity on Monad network.

Frontend: React + Ethers.js.

Wallet Integration: OKX Wallet / Browser Extension.

🚀 Basic Usage
Connect your wallet to the Monad network.

Click on “Generate Annual Report”.

Confirm the transaction (1 MON).

Check your previous reports using hasReport(year) or getReport(year).
