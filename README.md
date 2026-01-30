# LeoFinance 

Privacy Lending Protocol - The Aleo program enables private P2P lending with on-chain credit scoring (0-1000 points), ZK proof generation for creditworthiness, collateral locking/liquidation, credit-based loan offers, automatic score updates on repayments, and default detection while preserving user privacy through zero-knowledge proofs.

## Privacy-Preserving Decentralized Lending on Aleo Blockchain

**Aleo Privacy Lending** is a fully on-chain, privacy-first lending system built with the Leo programming language on the **Aleo blockchain**. It enables secure, verifiable, and anonymous peer-to-peer lending with comprehensive credit scoring, collateral management, and reputation building. Borrowers build credit history and prove creditworthiness through zero-knowledge proofs without revealing sensitive financial data, while lenders can set minimum credit requirements and collateral ratios to manage risk.

This program (`private_lending_credit_complete.aleo`) powers trustless lending where:
- Anyone can register and build an on-chain credit profile
- Borrowers prove creditworthiness with ZK proofs (no data leaks)
- Lenders create offers with custom credit/collateral requirements
- Loans are managed end-to-end with automatic credit updates
- Defaults trigger collateral liquidation and credit penalties

By leveraging Aleo's zero-knowledge execution environment, this protocol achieves **true financial privacy** without relying on centralized credit bureaus or exposing transaction history — a major leap forward for decentralized finance in Web3.

### Why Privacy Lending Matters in the Web3 Ecosystem

In today's Web3 world, most DeFi lending platforms suffer from:
- **Zero privacy** → all borrowing/lending activity is public, enabling profiling and front-running
- **No reputation system** → can't build credit history across protocols
- **Overcollateralization only** → excludes creditworthy users without massive capital
- **Identity exposure** → wallet addresses reveal entire financial history

**Aleo Privacy Lending solves these** by combining:
- **End-to-end privacy** (credit scores, loan amounts, repayment history all hidden)
- **On-chain credit scoring** (0-1000 point system that updates with each repayment)
- **ZK proof-based verification** (prove creditworthiness without revealing exact score)
- **Collateral management** (time-locked, liquidatable on defaults)
- **Reputation building** (successful repayments boost score, defaults penalize)
- **No trusted setup** (Aleo's zk-SNARKs are universal)

This makes Privacy Lending ideal for:
- Privacy-conscious DeFi users
- Building cross-protocol credit reputation
- Undercollateralized lending based on proven creditworthiness
- Private business loans without exposing company finances
- Anonymous peer-to-peer lending networks
- Decentralized credit scoring systems

As Web3 scales toward real-world adoption, privacy-preserving financial infrastructure becomes critical — this protocol is a foundational building block for private DeFi.

### Scalability & Performance Advantages

Aleo's architecture gives Privacy Lending strong scalability properties:
- **Private execution**: All sensitive credit/loan logic runs in zero-knowledge, minimizing on-chain data leakage
- **Efficient state updates**: Only necessary record updates (credit scores, loan status) propagate on-chain
- **Low gas costs**: Optimized transitions with minimal public state changes
- **Off-chain proof generation**: Heavy zk computations happen client-side → blockchain only sees succinct proofs
- **Parallelizable**: Multiple loans and users can transact independently without interference

Future scalability roadmap:
- Multi-collateral token support (USDC, wrapped assets)
- Credit delegation and co-signing
- Integration with Aleo credits for native lending
- Cross-chain credit portability

### Key Features

#### 🏦 Credit Scoring System
- **Dynamic scoring** (0-1000 points, starting at 500)
- **Automatic updates**: +5 per payment, +10 on final payment, -100 on default
- **Privacy-preserving**: Exact score hidden, provable through ZK proofs
- **Comprehensive tracking**: Total loans, successful repayments, defaults, total borrowed/repaid

#### 🔒 Zero-Knowledge Proofs
- **Credit credentials**: Generate proofs that score ≥ threshold without revealing exact value
- **Time-limited validity**: Proofs expire after set period (default 30 days)
- **Nullifier-based**: Prevents proof reuse and double-spending
- **BHP256 cryptography**: Collision-resistant hashing for commitments

#### 💰 Collateral Management
- **Time-locked deposits**: Collateral locked until loan completion
- **Flexible ratios**: Lenders set collateral requirements (e.g., 150% LTV)
- **Automatic release**: Collateral freed on successful repayment
- **Liquidation mechanism**: Defaults trigger instant collateral transfer to lender

#### 📊 Loan Lifecycle
- **Basic offers**: Simple private P2P loans
- **Credit-based offers**: Require minimum credit score + collateral
- **Public marketplace**: List offers for anyone to accept
- **Flexible terms**: Custom amounts, interest rates (0-50%), durations (1-365 days)
- **Partial repayments**: Pay over time, not just lump sum
- **Extensions**: Borrowers can request extra time (fee applied)
- **Transfers**: Loans can be swapped to new borrowers
- **Splits**: Divide loans into smaller parts

#### 🛡️ Risk Management
- **Default detection**: Automatic tracking of overdue loans
- **Credit penalties**: -100 points on default
- **Collateral seizure**: Lenders can liquidate defaulted loans
- **Interest caps**: Maximum 50% interest rate protection
- **Time locks**: Enforced loan durations

### Program Components

#### 1. **Records** (on-chain private data structures)

**UserProfile** — Complete credit history
```leo
record UserProfile {
    owner: address,
    user_id: field,              // Identity commitment
    credit_score: u32,           // 0-1000 points
    total_loans: u32,
    successful_repayments: u32,
    defaults: u32,
    total_borrowed: u64,
    total_repaid: u64,
    registration_time: u64,
    last_update_time: u64
}
```

**Loan** — Complete loan state
```leo
record Loan {
    owner: address,
    lender: address,
    borrower: address,
    amount: u64,
    interest: u32,              // Basis points (500 = 5%)
    repaid: u64,
    due_time: u64,
    created: u64,
    active: bool,
    loan_type: u8,              // 0=offer, 1=active, 2=complete, etc.
    min_credit_score: u32,      // Required score (0 if none)
    collateral_amount: u64,
    collateral_ratio: u32,
    has_collateral: bool
}
```

**Collateral** — Locked assets
```leo
record Collateral {
    owner: address,
    loan_id: field,
    amount: u64,
    token_type: u8,             // 0=ALEO, future: other tokens
    lock_time: u64,
    release_time: u64,
    is_active: bool
}
```

**CreditCredential** — ZK proof of creditworthiness
```leo
record CreditCredential {
    owner: address,
    min_score: u32,             // Proves score ≥ this threshold
    proof_hash: field,          // Commitment to actual score
    validity_period: u64,
    issued_time: u64,
    nullifier: field            // Prevents proof reuse
}
```

#### 2. **Transitions** (public callable functions)

**User Management**
- `register_user` — Create credit profile with identity commitment
- `generate_credit_proof` — Generate ZK proof of creditworthiness
- `verify_credit_credential` — Validate ZK proof

**Collateral Operations**
- `lock_collateral` — Deposit collateral for loan
- `release_collateral` — Reclaim after repayment

**Lending (Basic)**
- `lend` — Create simple private loan offer
- `borrow` — Accept loan offer
- `pay` — Make repayment
- `send_offer` — Transfer offer to specific address
- `reject_offer` — Decline loan offer
- `cancel_offer` — Retract offer

**Lending (Credit-Based)**
- `create_loan_offer_with_credit` — Create offer with min credit score + collateral requirements
- `accept_loan_with_credit` — Accept using ZK proof + locked collateral
- `pay_with_credit_update` — Repay and automatically boost credit score

**Loan Management**
- `extend` — Add extra time (max 30 days, 10% fee)
- `split` — Divide loan into parts
- `swap` — Transfer loan to new borrower
- `update_interest` — Modify rate on pending offer

**Public Marketplace**
- `list_offer` — Create public offer anyone can accept
- `accept_public_offer` — Take public offer

**Default Handling**
- `liquidate_defaulted_loan` — Seize collateral, penalize borrower credit

**Utilities**
- `get_loan_info` — View loan details
- `calculate_interest` — Compute total due
- `check_default_status` — Verify if loan overdue

#### 3. **Cryptographic Primitives**
- **BHP256 hashes** for commitments, nullifiers, proof generation
- **Field arithmetic** for score thresholds and validity checks
- **Nullifiers** = hash(user_id + timestamp + seed) → unique per proof

### Core Program Flow

#### 📝 User Registration
```leo
transition register_user(
    user_id: field,           // Identity commitment
    current_time: u64
) -> UserProfile {
    // Creates profile with 500 initial credit score
    // Tracks registration time
    // Returns UserProfile record
}
```

#### 🔐 Generate Credit Proof
```leo
transition generate_credit_proof(
    profile: UserProfile,
    min_score: u32,           // Threshold to prove (e.g., 600)
    validity_period: u64,     // How long proof valid (e.g., 30 days)
    current_time: u64
) -> (UserProfile, CreditCredential) {
    // Validates score ≥ min_score
    // Creates ZK proof without revealing exact score
    // Returns updated profile + credential
}
```

#### 💸 Create Credit-Based Loan
```leo
transition create_loan_offer_with_credit(
    borrower: address,
    amount: u64,
    interest: u32,
    duration_days: u64,
    min_credit_score: u32,    // e.g., 600
    required_collateral: u64, // e.g., 1500 (150% of amount)
    collateral_ratio: u32,    // e.g., 15000 = 150%
    current_time: u64
) -> Loan {
    // Creates offer with credit + collateral requirements
    // Sets min_score, collateral_amount
    // Returns Loan record (type 0 = offer)
}
```

#### ✅ Accept Loan with Credit
```leo
transition accept_loan_with_credit(
    loan_offer: Loan,
    credit_proof: CreditCredential,
    collateral: Collateral,
    current_time: u64
) -> (Loan, CreditCredential, Collateral) {
    // Verifies credit proof meets min_score
    // Validates collateral amount sufficient
    // Activates loan
    // Returns updated records
}
```

#### 💳 Repay with Credit Update
```leo
transition pay_with_credit_update(
    loan: Loan,
    profile: UserProfile,
    payment_amount: u64,
    current_time: u64
) -> (Loan, UserProfile) {
    // Processes payment
    // If full repayment: +10 credit points, successful_repayments++
    // If partial: +5 credit points
    // Updates total_repaid
    // Returns updated loan + profile
}
```

#### ⚠️ Liquidate Default
```leo
transition liquidate_defaulted_loan(
    loan: Loan,
    collateral: Collateral,
    borrower_profile: UserProfile,
    current_time: u64
) -> (Loan, Collateral, UserProfile) {
    // Only callable if current_time > due_time
    // Transfers collateral to lender
    // Deducts 100 credit points from borrower
    // Increments defaults counter
    // Returns updated records
}
```

### Credit Score Mechanics

**Initial Score**: 500 points (fair rating)

**Score Increases**:
- Partial payment: +5 points
- Final payment: +10 points
- On-time completion: Extra reputation boost

**Score Decreases**:
- Default (missed payment): -100 points
- Multiple defaults compound penalty

**Score Range**: 0-1000
- 800-1000: Excellent (qualify for best rates)
- 700-799: Good (solid borrower)
- 600-699: Fair (moderate risk)
- 500-599: Average (higher interest)
- 0-499: Poor (high risk/limited access)

**Privacy**: Exact score never revealed on-chain. Only provable through ZK credentials.

### Roadmap & Upcoming Features

- **Multi-token collateral** (USDC, wBTC, other Aleo assets)
- **Credit delegation** (co-signing and guarantor system)
- **Reputation NFTs** (mint achievements for milestones)
- **Interest rate oracles** (dynamic rates based on market)
- **Insurance pools** (lender protection funds)
- **Credit score portability** (export proofs to other protocols)
- **Mobile app** (iOS/Android with Aleo SDK)
- **DAO governance** (community votes on protocol parameters)
- **Cross-chain bridges** (import Ethereum DeFi credit history)
- **Automated market maker** (liquidity pools for instant loans)

### Deployment & Interaction

**Testnet/Mainnet Deployment**
```bash
# Build program
leo build

# Deploy to testnet
snarkos developer deploy \
  --private-key "$PRIVATE_KEY" \
  --query "https://api.explorer.aleo.org/v1" \
  --path "." \
  --broadcast "https://api.explorer.aleo.org/v1/testnetbeta/transaction/broadcast" \
  --fee 600000 \
  --record "{your_record}"

# Or use deploy script
chmod +x deploy.sh
./deploy.sh
```

**Example Interactions**
```bash
# Register user
leo execute register_user 123456789field 1738000000u64

# Generate credit proof (score ≥ 600, valid 30 days)
leo execute generate_credit_proof {profile_record} 600u32 2592000u64 1738000000u64

# Lock collateral
leo execute lock_collateral {loan_id} 1500u64 0u8 7776000u64 1738000000u64

# Create credit-based offer
leo execute create_loan_offer_with_credit aleo1... 1000u64 500u32 90u64 600u32 1500u64 15000u32 1738000000u64

# Accept with credit
leo execute accept_loan_with_credit {loan_offer} {credit_proof} {collateral} 1738000000u64

# Repay with credit boost
leo execute pay_with_credit_update {loan} {profile} 500u64 1738000000u64
```

**Privacy Guarantee**
All credit scores, loan amounts, and repayment history remain completely private. Only the necessary proofs and public counters are visible on-chain. Zero-knowledge proofs ensure verifiability without data exposure.

**Live Demo**  
FULL DEMO (Frontend Walkthrough): *Coming soon*

**Transaction IDs**  
MAINNET: *(Pending – update after deployment)*  
TESTNET PROGRAM: `https://testnet.explorer.provable.com/program/private_lending_credit_complete.aleo`

### Frontend dApp

A complete web interface is included with:
- **Dashboard**: View credit score, active loans, total borrowed/lent
- **Credit Profile**: Register, generate ZK proofs, track history
- **Lend Section**: Create basic/credit-based/public offers
- **Borrow Section**: Browse available offers, accept with proofs
- **Collateral Manager**: Lock/release collateral, view status
- **Loan Manager**: Repay, extend, transfer, split loans
- **Public Marketplace**: List and accept public offers

**Tech Stack**:
- Pure HTML/CSS/JavaScript (no frameworks)
- Leo Wallet integration
- Aleo SDK for blockchain interaction
- Responsive design

**Run Locally**:
```bash
cd frontend
python3 -m http.server 8000
# Open http://localhost:8000
```

**Deploy Frontend**:
- Netlify/Vercel: Upload `frontend/` folder
- GitHub Pages: Enable in repo settings
- IPFS: `ipfs add -r frontend/`

### Repository Structure

### Testing

Run test cases with sample inputs:
```bash
cd backend

# Test user registration
leo run register_user --input-file inputs/register_user.in

# Test credit proof generation
leo run generate_credit_proof --input-file inputs/generate_credit_proof.in

# Test collateral locking
leo run lock_collateral --input-file inputs/lock_collateral.in

# Test credit-based lending
leo run create_loan_offer_with_credit --input-file inputs/create_loan_offer_with_credit.in
leo run accept_loan_with_credit --input-file inputs/accept_loan_with_credit.in

# Test repayment with credit update
leo run pay_with_credit_update --input-file inputs/pay_with_credit_update.in

# Test liquidation
leo run liquidate_defaulted_loan --input-file inputs/liquidate_defaulted_loan.in
```

### Security Considerations

- **No upgrades**: Program uses `@noupgrade` constructor for immutability
- **Interest caps**: Maximum 50% rate prevents predatory lending
- **Time locks**: Enforced loan durations and collateral release periods
- **Nullifier system**: Prevents ZK proof reuse and double-spending
- **Credit score bounds**: Hardcoded 0-1000 range with overflow protection
- **Collateral validation**: Automatic checks for sufficient deposits
- **Default detection**: Timestamp-based verification prevents early liquidation

### Acknowledgments

Built with ❤️ using:
- [Aleo](https://aleo.org/) - Zero-knowledge blockchain
- [Leo Language](https://leo-lang.org/) - Privacy-preserving smart contracts
- [Aleo SDK](https://developer.aleo.org/) - Development tools

For full source code, see the repository files.  
Let's build private DeFi together on Aleo. 🚀

---
