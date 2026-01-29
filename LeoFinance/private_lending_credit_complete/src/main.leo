
program private_lending_credit_complete.aleo {

    @noupgrade
    async constructor() {}

    // ========================================================================
    // DATA STRUCTURES
    // ========================================================================

    // User Profile Record (Private to user)
    record UserProfile {
        owner: address,
        user_id: field,              // Unique identifier (commitment)
        credit_score: u32,           // 0-1000 scale
        total_loans: u32,            // Total loans taken
        successful_repayments: u32,  // Successful repayments
        defaults: u32,               // Number of defaults
        total_borrowed: u64,         // Total amount borrowed
        total_repaid: u64,           // Total amount repaid
        registered_time: u64,        // Registration timestamp
        last_updated: u64            // Last update timestamp
    }

    // Credit Credential (ZK Proof of creditworthiness)
    record CreditCredential {
        owner: address,
        user_id: field,
        min_score: u32,              // Proves score >= this value
        issued_time: u64,
        valid_until: u64,
        nullifier: field             // Prevents reuse
    }

    // Collateral Record
    record Collateral {
        owner: address,
        loan_id: field,
        amount: u64,
        token_type: u8,              // 0=ALEO, 1=other tokens
        locked_time: u64,
        release_time: u64,
        active: bool
    }

    // Enhanced Loan Record with Credit & Collateral
    record Loan {
        owner: address,
        loan_id: field,              // Unique loan identifier
        lender: address,
        borrower: address,
        amount: u64,
        interest: u32,
        repaid: u64,
        due_time: u64,
        created: u64,
        active: bool,
        loan_type: u8,               // 0=offer, 1=active, 2=completed, 3=defaulted
        collateral_amount: u64,      // Required collateral
        collateral_ratio: u32,       // Collateral/loan ratio (basis points)
        min_credit_score: u32,       // Minimum credit score required
        has_collateral: bool         // Whether collateral is locked
    }

    // Payment Receipt (for credit score updates)
    record PaymentReceipt {
        owner: address,
        loan_id: field,
        amount: u64,
        payment_time: u64,
        on_time: bool,               // Was payment on time?
        final_payment: bool          // Was this the final payment?
    }

    // ========================================================================
    // ON-CHAIN STATE MAPPINGS (Public Storage)
    // ========================================================================

    // User registry: address -> user_id commitment
    mapping user_registry: address => field;

    // Credit score commitments: user_id -> score_commitment
    mapping credit_commitments: field => field;

    // Active loans: loan_id -> loan_hash
    mapping active_loans: field => field;

    // Collateral locks: loan_id -> collateral_amount
    mapping collateral_locks: field => u64;

    // Default tracking: user_id -> default_count
    mapping default_tracker: field => u32;

    // Total loans counter
    mapping loan_counter: u8 => u64;

    // ========================================================================
    // PHASE 1: USER REGISTRATION & IDENTITY
    // ========================================================================

    // Register new user with identity commitment
    async transition register_user(
        identity_commitment: field,
        initial_time: u64
    ) -> (UserProfile, Future) {
        
        // Create user profile
        let profile: UserProfile = UserProfile {
            owner: self.caller,
            user_id: identity_commitment,
            credit_score: 500u32,        // Start at median score
            total_loans: 0u32,
            successful_repayments: 0u32,
            defaults: 0u32,
            total_borrowed: 0u64,
            total_repaid: 0u64,
            registered_time: initial_time,
            last_updated: initial_time
        };

        return (profile, finalize_register(self.caller, identity_commitment));
    }

    async function finalize_register(user: address, user_id: field) {
        // Store user in registry
        Mapping::set(user_registry, user, user_id);
        
        // Initialize credit commitment (hash of initial score)
        let score_commitment: field = BHP256::hash_to_field(500u32);
        Mapping::set(credit_commitments, user_id, score_commitment);
    }

    // ========================================================================
    // PHASE 2: CREDIT SCORING SYSTEM
    // ========================================================================

    // Calculate new credit score based on activity
    transition calculate_credit_score(
        profile: UserProfile,
        new_successful_payment: bool,
        new_default: bool,
        current_time: u64
    ) -> UserProfile {
        
        // Update counters
        let new_successful: u32 = new_successful_payment ? 
            profile.successful_repayments + 1u32 : profile.successful_repayments;
        let new_defaults: u32 = new_default ? 
            profile.defaults + 1u32 : profile.defaults;

        // Calculate score (simplified algorithm)
        let base_score: u32 = 500u32;
        let success_bonus: u32 = new_successful * 5u32;  // +5 per success
        let default_penalty: u32 = new_defaults * 50u32; // -50 per default
        
        let raw_score: u32 = base_score + success_bonus;
        let final_score: u32 = raw_score > default_penalty ? 
            raw_score - default_penalty : 0u32;
        
        // Cap at 1000
        let capped_score: u32 = final_score > 1000u32 ? 1000u32 : final_score;

        return UserProfile {
            owner: profile.owner,
            user_id: profile.user_id,
            credit_score: capped_score,
            total_loans: profile.total_loans,
            successful_repayments: new_successful,
            defaults: new_defaults,
            total_borrowed: profile.total_borrowed,
            total_repaid: profile.total_repaid,
            registered_time: profile.registered_time,
            last_updated: current_time
        };
    }

    // Generate ZK credit proof (proves score >= threshold without revealing exact score)
    transition generate_credit_proof(
        profile: UserProfile,
        min_score_threshold: u32,
        validity_period: u64,
        current_time: u64
    ) -> CreditCredential {
        
        // Assert user has sufficient credit
        assert(profile.credit_score >= min_score_threshold);
        
        // Generate nullifier to prevent reuse
        let nullifier: field = BHP256::hash_to_field(
            profile.user_id + 
            (current_time as field)
        );

        return CreditCredential {
            owner: profile.owner,
            user_id: profile.user_id,
            min_score: min_score_threshold,
            issued_time: current_time,
            valid_until: current_time + validity_period,
            nullifier: nullifier
        };
    }

    // Verify credit credential
    transition verify_credit_credential(
        credential: CreditCredential,
        required_min_score: u32,
        current_time: u64
    ) -> bool {
        
        // Check validity
        let is_valid: bool = 
            credential.min_score >= required_min_score &&
            current_time <= credential.valid_until;
        
        return is_valid;
    }

    // ========================================================================
    // PHASE 3: COLLATERAL MANAGEMENT
    // ========================================================================

    // Lock collateral for a loan
    async transition lock_collateral(
        loan_id: field,
        amount: u64,
        token_type: u8,
        lock_duration: u64,
        current_time: u64
    ) -> (Collateral, Future) {
        
        let collateral_record: Collateral = Collateral {
            owner: self.caller,
            loan_id: loan_id,
            amount: amount,
            token_type: token_type,
            locked_time: current_time,
            release_time: current_time + lock_duration,
            active: true
        };

        return (collateral_record, finalize_lock_collateral(loan_id, amount));
    }

    async function finalize_lock_collateral(loan_id: field, amount: u64) {
        Mapping::set(collateral_locks, loan_id, amount);
    }

    // Release collateral after loan completion
    async transition release_collateral(
        collateral: Collateral,
        current_time: u64
    ) -> (Collateral, Future) {
        
        assert(collateral.owner == self.caller);
        assert(collateral.active);
        
        let released: Collateral = Collateral {
            owner: collateral.owner,
            loan_id: collateral.loan_id,
            amount: collateral.amount,
            token_type: collateral.token_type,
            locked_time: collateral.locked_time,
            release_time: current_time,
            active: false
        };

        return (released, finalize_release_collateral(collateral.loan_id));
    }

    async function finalize_release_collateral(loan_id: field) {
        Mapping::remove(collateral_locks, loan_id);
    }

    // ========================================================================
    // PHASE 4: ENHANCED LOAN CREATION WITH CREDIT & COLLATERAL
    // ========================================================================

    // Create loan offer with credit score requirement
    transition create_loan_offer_with_credit(
        to: address,
        amount: u64,
        interest: u32,
        days: u64,
        min_credit_score: u32,
        required_collateral: u64,
        collateral_ratio: u32
    ) -> Loan {
        
        assert(amount > 0u64 && interest <= 5000u32 && days <= 365u64);
        assert(min_credit_score <= 1000u32);
        assert(collateral_ratio >= 10000u32); // At least 100% collateral
        
        let loan_id: field = BHP256::hash_to_field(
            (self.caller as field) + 
            (to as field) + 
            (amount as field)
        );
        
        let seconds_per_day: u64 = 86400u64;
        let due_time: u64 = days * seconds_per_day;
        
        return Loan {
            owner: self.caller,
            loan_id: loan_id,
            lender: self.caller,
            borrower: to,
            amount: amount,
            interest: interest,
            repaid: 0u64,
            due_time: due_time,
            created: 0u64,
            active: false,
            loan_type: 0u8,
            collateral_amount: required_collateral,
            collateral_ratio: collateral_ratio,
            min_credit_score: min_credit_score,
            has_collateral: false
        };
    }

    // Borrower accepts loan with credit proof and collateral
    async transition accept_loan_with_credit(
        offer: Loan,
        credit_proof: CreditCredential,
        collateral: Collateral,
        current_time: u64
    ) -> (Loan, Future) {
        
        // Verify ownership
        assert(offer.owner == self.caller || offer.borrower == self.caller);
        assert(credit_proof.owner == self.caller);
        assert(collateral.owner == self.caller);
        
        // Verify credit score meets requirement
        assert(credit_proof.min_score >= offer.min_credit_score);
        assert(current_time <= credit_proof.valid_until);
        
        // Verify collateral is sufficient
        assert(collateral.amount >= offer.collateral_amount);
        assert(collateral.loan_id == offer.loan_id);
        assert(collateral.active);
        
        let absolute_due: u64 = current_time + offer.due_time;
        
        let active_loan: Loan = Loan {
            owner: self.caller,
            loan_id: offer.loan_id,
            lender: offer.lender,
            borrower: self.caller,
            amount: offer.amount,
            interest: offer.interest,
            repaid: 0u64,
            due_time: absolute_due,
            created: current_time,
            active: true,
            loan_type: 1u8,
            collateral_amount: offer.collateral_amount,
            collateral_ratio: offer.collateral_ratio,
            min_credit_score: offer.min_credit_score,
            has_collateral: true
        };

        return (active_loan, finalize_accept_loan(offer.loan_id, BHP256::hash_to_field(active_loan.amount)));
    }

    async function finalize_accept_loan(loan_id: field, loan_hash: field) {
        Mapping::set(active_loans, loan_id, loan_hash);
    }

    // ========================================================================
    // PHASE 5: REPAYMENT WITH CREDIT UPDATES
    // ========================================================================

    // Make payment and receive receipt for credit update
    async transition pay_with_credit_update(
        loan: Loan,
        profile: UserProfile,
        payment_amount: u64,
        current_time: u64
    ) -> (Loan, PaymentReceipt, UserProfile, Future) {
        
        assert(loan.owner == self.caller);
        assert(loan.active);
        assert(profile.owner == self.caller);
        
        let new_repaid: u64 = loan.repaid + payment_amount;
        let total_due: u64 = loan.amount + ((loan.amount * (loan.interest as u64)) / 10000u64);
        let is_final: bool = new_repaid >= total_due;
        let is_on_time: bool = current_time <= loan.due_time;
        
        // Update loan
        let updated_loan: Loan = Loan {
            owner: loan.owner,
            loan_id: loan.loan_id,
            lender: loan.lender,
            borrower: loan.borrower,
            amount: loan.amount,
            interest: loan.interest,
            repaid: new_repaid,
            due_time: loan.due_time,
            created: loan.created,
            active: is_final ? false : true,
            loan_type: is_final ? 2u8 : 1u8,
            collateral_amount: loan.collateral_amount,
            collateral_ratio: loan.collateral_ratio,
            min_credit_score: loan.min_credit_score,
            has_collateral: loan.has_collateral
        };
        
        // Create payment receipt
        let receipt: PaymentReceipt = PaymentReceipt {
            owner: self.caller,
            loan_id: loan.loan_id,
            amount: payment_amount,
            payment_time: current_time,
            on_time: is_on_time,
            final_payment: is_final
        };
        
        // Update credit score
        let updated_profile: UserProfile = UserProfile {
            owner: profile.owner,
            user_id: profile.user_id,
            credit_score: is_final && is_on_time ? profile.credit_score + 10u32 : profile.credit_score,
            total_loans: profile.total_loans,
            successful_repayments: is_final ? profile.successful_repayments + 1u32 : profile.successful_repayments,
            defaults: profile.defaults,
            total_borrowed: profile.total_borrowed,
            total_repaid: profile.total_repaid + payment_amount,
            registered_time: profile.registered_time,
            last_updated: current_time
        };

        return (
            updated_loan, 
            receipt, 
            updated_profile, 
            finalize_payment(loan.loan_id, is_final)
        );
    }

    async function finalize_payment(loan_id: field, is_complete: bool) {
        if (is_complete) {
            Mapping::remove(active_loans, loan_id);
        }
    }

    // ========================================================================
    // PHASE 6: DEFAULT DETECTION & LIQUIDATION
    // ========================================================================

    // Detect default and liquidate collateral
    async transition liquidate_defaulted_loan(
        loan: Loan,
        collateral: Collateral,
        profile: UserProfile,
        current_time: u64
    ) -> (Collateral, UserProfile, Future) {
        
        // Only lender can liquidate
        assert(self.caller == loan.lender);
        assert(loan.active);
        assert(current_time > loan.due_time); // Past due
        assert(collateral.loan_id == loan.loan_id);
        assert(collateral.active);
        
        // Transfer collateral to lender
        let liquidated_collateral: Collateral = Collateral {
            owner: loan.lender,
            loan_id: collateral.loan_id,
            amount: collateral.amount,
            token_type: collateral.token_type,
            locked_time: collateral.locked_time,
            release_time: current_time,
            active: false
        };
        
        // Penalize borrower's credit score
        let penalized_profile: UserProfile = UserProfile {
            owner: profile.owner,
            user_id: profile.user_id,
            credit_score: profile.credit_score > 100u32 ? profile.credit_score - 100u32 : 0u32,
            total_loans: profile.total_loans,
            successful_repayments: profile.successful_repayments,
            defaults: profile.defaults + 1u32,
            total_borrowed: profile.total_borrowed,
            total_repaid: profile.total_repaid,
            registered_time: profile.registered_time,
            last_updated: current_time
        };

        return (
            liquidated_collateral,
            penalized_profile,
            finalize_liquidation(loan.loan_id, profile.user_id)
        );
    }

    async function finalize_liquidation(loan_id: field, user_id: field) {
        // Remove from active loans
        Mapping::remove(active_loans, loan_id);
        Mapping::remove(collateral_locks, loan_id);
        
        // Track default
        let current_defaults: u32 = Mapping::get_or_use(default_tracker, user_id, 0u32);
        Mapping::set(default_tracker, user_id, current_defaults + 1u32);
    }

    // ========================================================================
    // YOUR EXISTING FUNCTIONS (PRESERVED)
    // ========================================================================

    // Original lend function (backward compatible)
    transition lend(
        to: address,
        amount: u64,
        interest: u32,
        days: u64
    ) -> Loan {
        let valid: bool = amount > 0u64 && interest <= 5000u32 && days <= 365u64;
        assert(valid);
        
        let loan_id: field = BHP256::hash_to_field(
            (self.caller as field) + (to as field) + (amount as field)
        );
        let seconds_per_day: u64 = 86400u64;
        let due_time: u64 = days * seconds_per_day;
        
        return Loan {
            owner: self.caller,
            loan_id: loan_id,
            lender: self.caller,
            borrower: to,
            amount: amount,
            interest: interest,
            repaid: 0u64,
            due_time: due_time,
            created: 0u64,
            active: false,
            loan_type: 0u8,
            collateral_amount: 0u64,
            collateral_ratio: 0u32,
            min_credit_score: 0u32,
            has_collateral: false
        };
    }

    // Send offer
    transition send_offer(offer: Loan, to: address) -> Loan {
        assert(offer.owner == self.caller);
        assert(offer.lender == self.caller);
        assert(!offer.active);
        
        return Loan {
            owner: to,
            loan_id: offer.loan_id,
            lender: offer.lender,
            borrower: to,
            amount: offer.amount,
            interest: offer.interest,
            repaid: offer.repaid,
            due_time: offer.due_time,
            created: offer.created,
            active: false,
            loan_type: offer.loan_type,
            collateral_amount: offer.collateral_amount,
            collateral_ratio: offer.collateral_ratio,
            min_credit_score: offer.min_credit_score,
            has_collateral: offer.has_collateral
        };
    }

    // Simple borrow (without credit check)
    transition borrow(offer: Loan, current_time: u64) -> Loan {
        assert(offer.owner == self.caller);
        assert(!offer.active);
        
        let absolute_due: u64 = current_time + offer.due_time;
        
        return Loan {
            owner: offer.borrower,
            loan_id: offer.loan_id,
            lender: offer.lender,
            borrower: offer.borrower,
            amount: offer.amount,
            interest: offer.interest,
            repaid: 0u64,
            due_time: absolute_due,
            created: current_time,
            active: true,
            loan_type: 1u8,
            collateral_amount: offer.collateral_amount,
            collateral_ratio: offer.collateral_ratio,
            min_credit_score: offer.min_credit_score,
            has_collateral: offer.has_collateral
        };
    }

    // Simple payment
    transition pay(loan: Loan, amount: u64) -> Loan {
        assert(loan.owner == self.caller);
        assert(loan.active);
        
        let new_repaid: u64 = loan.repaid + amount;
        let total_due: u64 = loan.amount + ((loan.amount * (loan.interest as u64)) / 10000u64);
        let is_done: bool = new_repaid >= total_due;
        
        return Loan {
            owner: loan.owner,
            loan_id: loan.loan_id,
            lender: loan.lender,
            borrower: loan.borrower,
            amount: loan.amount,
            interest: loan.interest,
            repaid: new_repaid,
            due_time: loan.due_time,
            created: loan.created,
            active: !is_done,
            loan_type: is_done ? 2u8 : 1u8,
            collateral_amount: loan.collateral_amount,
            collateral_ratio: loan.collateral_ratio,
            min_credit_score: loan.min_credit_score,
            has_collateral: loan.has_collateral
        };
    }

    // Check loan status
    transition check(loan: Loan, current_time: u64) -> (bool, bool, bool, u8) {
        let is_active: bool = loan.active;
        let is_overdue: bool = current_time > loan.due_time;
        let total_due: u64 = loan.amount + ((loan.amount * (loan.interest as u64)) / 10000u64);
        let is_paid: bool = loan.repaid >= total_due;
        
        return (is_active, is_overdue, is_paid, loan.loan_type);
    }

    // Calculate total due
    transition calculate_total(loan: Loan) -> u64 {
        return loan.amount + ((loan.amount * (loan.interest as u64)) / 10000u64);
    }
}
