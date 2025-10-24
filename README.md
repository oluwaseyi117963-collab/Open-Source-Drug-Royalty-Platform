# 💊 Open-Source Drug Royalty Platform

Welcome to a revolutionary Web3 solution for incentivizing open-source innovation in pharmaceuticals! This project uses the Stacks blockchain and Clarity smart contracts to enable creators of open-source drug formulas to register their work, share it freely, and automatically receive royalties from commercial users. It solves the real-world problem of under-compensation for open-source contributors in the drug discovery space, where formulas are often exploited by big pharma without fair returns, discouraging innovation.

By leveraging blockchain's transparency and immutability, creators can timestamp their formulas, define royalty terms, and enforce automated payments based on reported commercial usage—ensuring fair compensation while keeping knowledge accessible.

## ✨ Features

🔓 Register open-source drug formulas with immutable proofs  
💰 Define and enforce royalty percentages for commercial use  
📊 Automated royalty distribution to contributors  
✅ Verify formula authenticity and usage reports  
🤝 Multi-contributor support with proportional shares  
⚖️ Built-in dispute resolution for fair adjudication  
📈 Track commercial adoption and payments transparently  
🚫 Prevent unauthorized modifications or claims

## 🛠 How It Works

This platform consists of 8 interconnected Clarity smart contracts, each handling a specific aspect of the royalty ecosystem. Creators upload a hash of their drug formula (e.g., chemical structure or synthesis process) along with metadata. Commercial entities (e.g., pharma companies) can access the formula for free but must report usage and pay royalties via the contracts. Payments are handled in STX or a custom token, distributed automatically.

**For Creators/Contributors**  
- Generate a SHA-256 hash of your drug formula file.  
- Call the FormulaRegistry contract to register it with a title, description, and royalty config (e.g., 5% of sales).  
- Add co-contributors via the OwnershipManager for split royalties.  
- Once registered, the formula is open-source and verifiable by anyone.

**For Commercial Users**  
- Search and verify formulas using the FormulaVerifier.  
- Report commercial usage (e.g., units produced/sold) via UsageReporter.  
- Trigger payments through PaymentDistributor, which calculates and disburses royalties.  
- If disputes arise (e.g., over usage accuracy), use DisputeResolver for community or oracle-based resolution.

**For Verifiers/Auditors**  
- Use FormulaVerifier to check registration details and ownership.  
- Query RoyaltyTracker for payment history and compliance.

That's it! Royalties flow automatically, fostering a sustainable open-source drug ecosystem.

## 📜 Smart Contracts Overview

The project involves 8 Clarity smart contracts for modularity, security, and scalability:

1. **FormulaRegistry**: Handles registration of drug formulas, storing hashes, titles, descriptions, and timestamps. Prevents duplicates.  
2. **OwnershipManager**: Manages ownership claims, including multi-contributor setups with percentage splits (e.g., 60/40 for two inventors).  
3. **RoyaltyConfigurator**: Allows creators to set royalty rules, such as percentage rates, payment thresholds, and beneficiary wallets.  
4. **UsageReporter**: Enables commercial users to self-report sales/usage data, which triggers royalty calculations (auditable on-chain).  
5. **PaymentDistributor**: Automates royalty payouts based on reports, using escrow for secure distribution to contributors.  
6. **FormulaVerifier**: Provides read-only functions to verify formula details, ownership, and registration proofs.  
7. **DisputeResolver**: Facilitates on-chain disputes, integrating with oracles or governance votes for resolution (e.g., challenging false reports).  
8. **RoyaltyTracker**: Tracks all payments, usage history, and compliance metrics for transparency and analytics.

These contracts interact seamlessly—for example, UsageReporter calls RoyaltyConfigurator to compute amounts, then PaymentDistributor handles transfers. Deploy them on Stacks for low-cost, Bitcoin-secured execution.