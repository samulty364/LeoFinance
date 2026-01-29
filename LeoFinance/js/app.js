// ========================================
// ENHANCED ALEO PRIVATE LENDING APP
// With Complete Privacy Features
// ========================================

// Global variables
let publicKey = null;
let currentLoans = [];
let loanOffers = [];
let paymentHistory = [];
let publicOffers = [];
let fetchedRecords = [];
let selectedLoan = null;
let selectedOffer = null;
let userProfile = null;
let userCollateral = [];
let creditProofs = [];

// IMPORTANT: Update this to match your deployed program
const PROGRAM_ID = 'private_lending_credit_complete.aleo';

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    showSection('dashboard');
});

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Clean private field values
function cleanU128Private(value) {
    if (typeof value === 'string') {
        return value.replace(/u128\.private$/, '');
    }
    return value;
}

function cleanU64Private(value) {
    if (typeof value === 'string') {
        return value.replace(/u64\.private$/, '');
    }
    return value;
}

function cleanU32Private(value) {
    if (typeof value === 'string') {
        return value.replace(/u32\.private$/, '');
    }
    return value;
}

function cleanU8Private(value) {
    if (typeof value === 'string') {
        return value.replace(/u8\.private$/, '');
    }
    return value;
}

function cleanBoolPrivate(value) {
    if (typeof value === 'string') {
        return value.replace(/\.private$/, '');
    }
    return value;
}

function cleanAddressField(value) {
    if (typeof value === 'string') {
        return value.replace(/\.private$/, '').replace(/address\.private$/, '');
    }
    return value;
}

function cleanFieldPrivate(value) {
    if (typeof value === 'string') {
        return value.replace(/field\.private$/, '');
    }
    return value;
}

// Utility function to get short address
function shortAddress(address) {
    if (!address) return 'N/A';
    if (address === publicKey) return 'You';
    if (typeof address !== 'string' || address.length < 12) return address;
    if (address.startsWith('loan_')) return address.substring(0, 8) + '...';
    return address.substring(0, 6) + '...' + address.substring(address.length - 4);
}

// Helper function to get loan type name
function getLoanTypeName(type) {
    switch(type) {
        case 0: return 'Private Offer';
        case 1: return 'Active Loan';
        case 2: return 'Completed Loan';
        case 3: return 'Payment Proof';
        case 4: return 'Claimed Payment';
        case 5: return 'Fee Record';
        case 6: return 'Cancelled';
        case 7: return 'Public Offer';
        default: return 'Unknown';
    }
}

// Get credit score rating
function getCreditRating(score) {
    if (score >= 800) return 'Excellent';
    if (score >= 700) return 'Good';
    if (score >= 600) return 'Fair';
    if (score >= 500) return 'Average';
    return 'Poor';
}

// ========================================
// WALLET CONNECTION
// ========================================

async function toggleWalletConnection() {
    if (!window.leoWallet) {
        showToast('Please install Leo Wallet browser extension', 'error');
        return;
    }

    try {
        if (publicKey) {
            // Disconnect wallet
            publicKey = null;
            document.getElementById('connectWalletBtn').innerHTML = `
                <i class="fas fa-wallet"></i>
                <span>Connect Wallet</span>
            `;
            document.getElementById('connectWalletBtn').classList.remove('connected');
            document.getElementById('refreshBtn').style.display = 'none';
            showToast('Wallet disconnected', 'info');
            return;
        }

        // Connect wallet
        await window.leoWallet.connect("ON_CHAIN_HISTORY", "testnetbeta", ["credits.aleo", PROGRAM_ID]);

        // Sign welcome message
        const utf8Encode = new TextEncoder();
        const bytes = utf8Encode.encode("Welcome to Aleo Private Lending - Zero-Knowledge Credit System");
        window.leoWallet.signMessage(bytes);

        publicKey = window.leoWallet.publicKey;
        
        document.getElementById('connectWalletBtn').innerHTML = `
            <i class="fas fa-wallet"></i>
            <span>Connected</span>
            <span class="wallet-address">${publicKey.slice(0, 6)}...${publicKey.slice(-4)}</span>
        `;
        document.getElementById('connectWalletBtn').classList.add('connected');
        document.getElementById('refreshBtn').style.display = 'flex';
        
        showToast('Wallet connected successfully!', 'success');
        
        // Fetch records from blockchain
        fetchRecords();
        
    } catch (error) {
        console.error('Wallet connection error:', error);
        showToast('Connection failed: ' + error.message, 'error');
    }
}

// ========================================
// FETCH RECORDS FROM BLOCKCHAIN
// ========================================

async function fetchRecords() {
    if (!publicKey) {
        showToast('Please connect your wallet first', 'warning');
        return;
    }
    
    try {
        showToast('Fetching records from blockchain...', 'info');
        
        const res = await window.leoWallet.requestRecordPlaintexts(PROGRAM_ID);
        console.log('Fetched Records:', res);
        
        fetchedRecords = res;
        
        // Process records and update data
        processAllRecords(res);
        
        showToast(`Loaded records successfully!`, 'success');
        
    } catch (error) {
        console.error('Error fetching records:', error);
        showToast('Failed to fetch records: ' + error.message, 'error');
    }
}

// ========================================
// PROCESS ALL RECORDS
// ========================================

function processAllRecords(records) {
    currentLoans = [];
    loanOffers = [];
    paymentHistory = [];
    publicOffers = [];
    userProfile = null;
    userCollateral = [];
    creditProofs = [];
    
    if (records && records.records && Array.isArray(records.records)) {
        records.records.forEach(record => {
            const recordName = record.recordName;
            const data = record.data;
            
            if (recordName === "UserProfile") {
                processUserProfile(record);
            } else if (recordName === "Loan") {
                processLoanRecord(record);
            } else if (recordName === "Collateral") {
                processCollateralRecord(record);
            } else if (recordName === "CreditCredential") {
                processCreditCredential(record);
            }
        });
    }
    
    // Update all UI sections
    updateAllUI();
}

// Process UserProfile records
function processUserProfile(record) {
    const data = record.data;
    const owner = cleanAddressField(data.owner || '');
    
    if (owner === publicKey) {
        userProfile = {
            owner: owner,
            user_id: cleanFieldPrivate(data.user_id || '0'),
            credit_score: parseInt(cleanU32Private(data.credit_score || '500')),
            total_loans: parseInt(cleanU32Private(data.total_loans || '0')),
            successful_repayments: parseInt(cleanU32Private(data.successful_repayments || '0')),
            defaults: parseInt(cleanU32Private(data.defaults || '0')),
            total_borrowed: parseInt(cleanU64Private(data.total_borrowed || '0')),
            total_repaid: parseInt(cleanU64Private(data.total_repaid || '0')),
            registration_time: parseInt(cleanU64Private(data.registration_time || '0')),
            last_update_time: parseInt(cleanU64Private(data.last_update_time || '0')),
            record: record
        };
        
        console.log('User Profile:', userProfile);
        updateProfileUI();
    }
}

// Process Loan records
function processLoanRecord(record) {
    const data = record.data;
    
    const owner = cleanAddressField(data.owner || '');
    const lender = cleanAddressField(data.lender || '');
    const borrower = cleanAddressField(data.borrower || '');
    const amount = cleanU64Private(data.amount || "0");
    const interest = cleanU32Private(data.interest || "0");
    const repaid = cleanU64Private(data.repaid || "0");
    const due_time = cleanU64Private(data.due_time || "0");
    const created = cleanU64Private(data.created || "0");
    const active = cleanBoolPrivate(data.active || "false") === "true";
    const loan_type = cleanU8Private(data.loan_type || "0");
    
    // NEW: Extract credit-based loan fields
    const min_credit_score = parseInt(cleanU32Private(data.min_credit_score || "0"));
    const collateral_amount = parseInt(cleanU64Private(data.collateral_amount || "0"));
    const collateral_ratio = parseInt(cleanU32Private(data.collateral_ratio || "0"));
    const has_collateral = cleanBoolPrivate(data.has_collateral || "false") === "true";
    
    const loanTypeInt = parseInt(loan_type) || 0;
    
    const loanObj = {
        id: record.id || `loan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        record: record,
        owner: owner,
        lender: lender,
        borrower: borrower,
        amount: parseInt(amount) || 0,
        interest: parseInt(interest) || 0,
        repaid: parseInt(repaid) || 0,
        due_time: parseInt(due_time) || 0,
        created: parseInt(created) || 0,
        dueDate: new Date((parseInt(due_time) || 0) * 1000).toISOString(),
        createdDate: new Date((parseInt(created) || 0) * 1000).toISOString(),
        active: active,
        loan_type: loanTypeInt,
        overdue: new Date() > new Date((parseInt(due_time) || 0) * 1000),
        // NEW fields
        min_credit_score: min_credit_score,
        collateral_amount: collateral_amount,
        collateral_ratio: collateral_ratio,
        has_collateral: has_collateral
    };
    
    if (lender === publicKey || borrower === publicKey || owner === publicKey) {
        currentLoans.push(loanObj);
    }
    
    if (loanTypeInt === 0 || loanTypeInt === 7) {
        if (loanTypeInt === 7) {
            publicOffers.push(loanObj);
        } else {
            loanOffers.push(loanObj);
        }
    }
}

// Process Collateral records
function processCollateralRecord(record) {
    const data = record.data;
    const owner = cleanAddressField(data.owner || '');
    
    if (owner === publicKey) {
        const collateral = {
            owner: owner,
            loan_id: cleanFieldPrivate(data.loan_id || '0'),
            amount: parseInt(cleanU64Private(data.amount || '0')),
            token_type: parseInt(cleanU8Private(data.token_type || '0')),
            lock_time: parseInt(cleanU64Private(data.lock_time || '0')),
            release_time: parseInt(cleanU64Private(data.release_time || '0')),
            is_active: cleanBoolPrivate(data.is_active || 'true') === 'true',
            record: record
        };
        
        userCollateral.push(collateral);
    }
}

// Process CreditCredential records
function processCreditCredential(record) {
    const data = record.data;
    const owner = cleanAddressField(data.owner || '');
    
    if (owner === publicKey) {
        const credential = {
            owner: owner,
            min_score: parseInt(cleanU32Private(data.min_score || '0')),
            proof_hash: cleanFieldPrivate(data.proof_hash || '0'),
            validity_period: parseInt(cleanU64Private(data.validity_period || '0')),
            issued_time: parseInt(cleanU64Private(data.issued_time || '0')),
            nullifier: cleanFieldPrivate(data.nullifier || '0'),
            record: record
        };
        
        creditProofs.push(credential);
    }
}


// ========================================
// NEW PRIVACY FUNCTIONS
// ========================================

// Register new user
async function registerUser() {
    const identityCommitment = document.getElementById('userIdentityCommitment').value;
    
    if (!identityCommitment) {
        showToast('Please enter an identity commitment', 'error');
        return;
    }
    
    if (!publicKey) {
        showToast('Wallet not connected', 'error');
        return;
    }
    
    try {
        const btn = document.getElementById('registerUserBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<div class="spinner"></div> Registering...';
        btn.disabled = true;
        
        showToast('Registering user on blockchain...', 'info');
        
        const currentTime = Math.floor(Date.now() / 1000);
        
        const inputs = [
            `${identityCommitment}field`,
            `${currentTime}u64`
        ];
        
        console.log('Registering user with inputs:', inputs);
        
        const aleoTransaction = Transaction.createTransaction(
            publicKey,
            'testnetbeta',
            PROGRAM_ID,
            'register_user',
            inputs,
            500_000
        );
        
        if (aleoTransaction) {
            const txResult = await window.leoWallet.requestTransaction(aleoTransaction);
            console.log('Transaction result:', txResult);
            
            showToast('User registered successfully!', 'success');
            closeModal('registerUserModal');
            
            setTimeout(() => fetchRecords(), 3000);
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Failed to register: ' + error.message, 'error');
    } finally {
        const btn = document.getElementById('registerUserBtn');
        btn.innerHTML = '<i class="fas fa-user-plus"></i> Register User';
        btn.disabled = false;
    }
}

// Generate ZK credit proof
async function generateCreditProof() {
    if (!userProfile) {
        showToast('No user profile found. Please register first.', 'error');
        return;
    }
    
    const threshold = document.getElementById('proofThreshold').value;
    const validity = document.getElementById('proofValidity').value;
    
    if (!threshold || !validity) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    if (parseInt(threshold) > userProfile.credit_score) {
        showToast(`Your credit score (${userProfile.credit_score}) is below the threshold (${threshold})`, 'error');
        return;
    }
    
    if (!publicKey) {
        showToast('Wallet not connected', 'error');
        return;
    }
    
    try {
        const btn = document.getElementById('generateProofBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<div class="spinner"></div> Generating...';
        btn.disabled = true;
        
        showToast('Generating ZK proof on blockchain...', 'info');
        
        const currentTime = Math.floor(Date.now() / 1000);
        
        const inputs = [
            JSON.stringify(userProfile.record),
            `${threshold}u32`,
            `${validity}u64`,
            `${currentTime}u64`
        ];
        
        console.log('Generating proof with inputs:', inputs);
        
        const aleoTransaction = Transaction.createTransaction(
            publicKey,
            'testnetbeta',
            PROGRAM_ID,
            'generate_credit_proof',
            inputs,
            500_000
        );
        
        if (aleoTransaction) {
            const txResult = await window.leoWallet.requestTransaction(aleoTransaction);
            console.log('Transaction result:', txResult);
            
            showToast('ZK proof generated successfully!', 'success');
            closeModal('generateProofModal');
            
            setTimeout(() => fetchRecords(), 3000);
        }
    } catch (error) {
        console.error('Proof generation error:', error);
        showToast('Failed to generate proof: ' + error.message, 'error');
    } finally {
        const btn = document.getElementById('generateProofBtn');
        btn.innerHTML = '<i class="fas fa-shield-alt"></i> Generate ZK Proof';
        btn.disabled = false;
    }
}

// Lock collateral
async function lockCollateral() {
    const loanId = document.getElementById('collateralLoanId').value;
    const amount = document.getElementById('collateralAmount').value;
    const tokenType = document.getElementById('collateralTokenType').value;
    const duration = document.getElementById('collateralDuration').value;
    
    if (!loanId || !amount || !duration) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    if (!publicKey) {
        showToast('Wallet not connected', 'error');
        return;
    }
    
    try {
        const btn = document.getElementById('lockCollateralBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<div class="spinner"></div> Locking...';
        btn.disabled = true;
        
        showToast('Locking collateral on blockchain...', 'info');
        
        const currentTime = Math.floor(Date.now() / 1000);
        const durationSeconds = parseInt(duration) * 86400; // days to seconds
        
        // Convert loan_id string to field
        const loanIdField = loanId.replace(/[^0-9]/g, '') || '0';
        
        const inputs = [
            `${loanIdField}field`,
            `${amount}u64`,
            `${tokenType}u8`,
            `${durationSeconds}u64`,
            `${currentTime}u64`
        ];
        
        console.log('Locking collateral with inputs:', inputs);
        
        const aleoTransaction = Transaction.createTransaction(
            publicKey,
            'testnetbeta',
            PROGRAM_ID,
            'lock_collateral',
            inputs,
            500_000
        );
        
        if (aleoTransaction) {
            const txResult = await window.leoWallet.requestTransaction(aleoTransaction);
            console.log('Transaction result:', txResult);
            
            showToast('Collateral locked successfully!', 'success');
            closeModal('lockCollateralModal');
            
            setTimeout(() => fetchRecords(), 3000);
        }
    } catch (error) {
        console.error('Lock collateral error:', error);
        showToast('Failed to lock collateral: ' + error.message, 'error');
    } finally {
        const btn = document.getElementById('lockCollateralBtn');
        btn.innerHTML = '<i class="fas fa-lock"></i> Lock Collateral';
        btn.disabled = false;
    }
}

// Release collateral
async function releaseCollateral(collateral) {
    if (!publicKey) {
        showToast('Wallet not connected', 'error');
        return;
    }
    
    if (!collateral.is_active) {
        showToast('Collateral is already released', 'warning');
        return;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime < collateral.release_time) {
        showToast('Collateral cannot be released yet. Lock period not expired.', 'warning');
        return;
    }
    
    try {
        showToast('Releasing collateral...', 'info');
        
        const inputs = [
            JSON.stringify(collateral.record)
        ];
        
        const aleoTransaction = Transaction.createTransaction(
            publicKey,
            'testnetbeta',
            PROGRAM_ID,
            'release_collateral',
            inputs,
            500_000
        );
        
        if (aleoTransaction) {
            const txResult = await window.leoWallet.requestTransaction(aleoTransaction);
            console.log('Transaction result:', txResult);
            
            showToast('Collateral released successfully!', 'success');
            
            setTimeout(() => fetchRecords(), 3000);
        }
    } catch (error) {
        console.error('Release collateral error:', error);
        showToast('Failed to release collateral: ' + error.message, 'error');
    }
}

// Create loan offer with credit requirements
async function createLoanOfferWithCredit() {
    const borrower = document.getElementById('creditBorrowerAddress').value.trim();
    const amount = document.getElementById('creditLoanAmount').value;
    const interest = document.getElementById('creditInterestRate').value;
    const days = document.getElementById('creditLoanDuration').value;
    const minScore = document.getElementById('minCreditScore').value;
    const collateral = document.getElementById('requiredCollateral').value;
    const collateralRatio = document.getElementById('collateralRatio').value;
    
    if (!borrower || !amount || !interest || !days || !minScore || !collateral || !collateralRatio) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    if (!publicKey) {
        showToast('Wallet not connected', 'error');
        return;
    }
    
    try {
        const btn = document.getElementById('createLoanCreditBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<div class="spinner"></div> Creating...';
        btn.disabled = true;
        
        showToast('Creating credit-based loan offer...', 'info');
        
        const currentTime = Math.floor(Date.now() / 1000);
        
        const inputs = [
            borrower,
            `${amount}u64`,
            `${interest}u32`,
            `${days}u64`,
            `${minScore}u32`,
            `${collateral}u64`,
            `${collateralRatio}u32`,
            `${currentTime}u64`
        ];
        
        console.log('Creating credit-based loan with inputs:', inputs);
        
        const aleoTransaction = Transaction.createTransaction(
            publicKey,
            'testnetbeta',
            PROGRAM_ID,
            'create_loan_offer_with_credit',
            inputs,
            500_000
        );
        
        if (aleoTransaction) {
            const txResult = await window.leoWallet.requestTransaction(aleoTransaction);
            console.log('Transaction result:', txResult);
            
            showToast('Credit-based loan offer created successfully!', 'success');
            closeModal('createLoanCreditModal');
            
            setTimeout(() => fetchRecords(), 3000);
        }
    } catch (error) {
        console.error('Transaction error:', error);
        showToast('Failed to create offer: ' + error.message, 'error');
    } finally {
        const btn = document.getElementById('createLoanCreditBtn');
        btn.innerHTML = '<i class="fas fa-hand-holding-usd"></i> Create Credit-Based Offer';
        btn.disabled = false;
    }
}

// Accept loan with credit proof
async function acceptLoanOfferWithCredit() {
    if (!selectedOffer) {
        showToast('No loan selected', 'error');
        return;
    }
    
    if (!userProfile) {
        showToast('No user profile found. Please register first.', 'error');
        return;
    }
    
    // Find appropriate credit proof
    const validProof = creditProofs.find(p => p.min_score <= selectedOffer.min_credit_score);
    if (!validProof) {
        showToast('No valid credit proof found. Generate one first.', 'error');
        return;
    }
    
    // Find appropriate collateral
    const validCollateral = userCollateral.find(c => 
        c.is_active && c.amount >= selectedOffer.collateral_amount
    );
    if (!validCollateral) {
        showToast('No valid collateral found. Lock collateral first.', 'error');
        return;
    }
    
    if (!publicKey) {
        showToast('Wallet not connected', 'error');
        return;
    }
    
    try {
        const btn = document.getElementById('acceptLoanCreditBtn');
        btn.innerHTML = '<div class="spinner"></div> Accepting...';
        btn.disabled = true;
        
        showToast('Accepting loan with credit proof...', 'info');
        
        const currentTime = Math.floor(Date.now() / 1000);
        
        const inputs = [
            JSON.stringify(selectedOffer.record),
            JSON.stringify(validProof.record),
            JSON.stringify(validCollateral.record),
            `${currentTime}u64`
        ];
        
        const aleoTransaction = Transaction.createTransaction(
            publicKey,
            'testnetbeta',
            PROGRAM_ID,
            'accept_loan_with_credit',
            inputs,
            500_000
        );
        
        if (aleoTransaction) {
            const txResult = await window.leoWallet.requestTransaction(aleoTransaction);
            console.log('Transaction result:', txResult);
            
            showToast('Loan accepted successfully!', 'success');
            closeModal('acceptLoanCreditModal');
            
            setTimeout(() => fetchRecords(), 3000);
        }
    } catch (error) {
        console.error('Accept loan error:', error);
        showToast('Failed to accept loan: ' + error.message, 'error');
    } finally {
        const btn = document.getElementById('acceptLoanCreditBtn');
        btn.innerHTML = '<i class="fas fa-check-circle"></i> Accept with Credit Proof';
        btn.disabled = false;
    }
}

// Pay loan with credit update
async function payLoanWithCreditUpdate() {
    if (!selectedLoan) {
        showToast('No loan selected', 'error');
        return;
    }
    
    if (!userProfile) {
        showToast('No user profile found', 'error');
        return;
    }
    
    const amount = parseFloat(document.getElementById('repayAmount').value);
    
    if (!amount || amount <= 0) {
        showToast('Invalid repayment amount', 'error');
        return;
    }
    
    if (!publicKey) {
        showToast('Wallet not connected', 'error');
        return;
    }
    
    try {
        const btn = document.getElementById('repayLoanBtn');
        btn.innerHTML = '<div class="spinner"></div> Processing...';
        btn.disabled = true;
        
        showToast('Processing payment with credit update...', 'info');
        
        const currentTime = Math.floor(Date.now() / 1000);
        
        const inputs = [
            JSON.stringify(selectedLoan.record),
            JSON.stringify(userProfile.record),
            `${amount}u64`,
            `${currentTime}u64`
        ];
        
        const aleoTransaction = Transaction.createTransaction(
            publicKey,
            'testnetbeta',
            PROGRAM_ID,
            'pay_with_credit_update',
            inputs,
            500_000
        );
        
        if (aleoTransaction) {
            const txResult = await window.leoWallet.requestTransaction(aleoTransaction);
            console.log('Transaction result:', txResult);
            
            showToast('Payment successful! Credit score updated.', 'success');
            closeModal('repayLoanModal');
            
            setTimeout(() => fetchRecords(), 3000);
        }
    } catch (error) {
        console.error('Repayment error:', error);
        showToast('Failed to process payment: ' + error.message, 'error');
    } finally {
        const btn = document.getElementById('repayLoanBtn');
        btn.innerHTML = '<i class="fas fa-money-bill-wave"></i> Make Payment';
        btn.disabled = false;
    }
}

// Liquidate defaulted loan
async function liquidateDefaultedLoan(loan) {
    if (!publicKey) {
        showToast('Wallet not connected', 'error');
        return;
    }
    
    if (!loan.has_collateral) {
        showToast('This loan has no collateral to liquidate', 'warning');
        return;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime < loan.due_time) {
        showToast('Loan is not yet overdue', 'warning');
        return;
    }
    
    if (!confirm('Are you sure you want to liquidate this defaulted loan? This will transfer collateral to the lender and penalize the borrower.')) {
        return;
    }
    
    // Find the borrower's profile and collateral
    // Note: In a real implementation, you'd need the actual records
    
    try {
        showToast('Liquidating defaulted loan...', 'info');
        
        // This would need the actual collateral and profile records
        // For now, showing the structure
        showToast('Liquidation feature requires borrower records. Contact support for manual liquidation.', 'warning');
        
        // const inputs = [
        //     JSON.stringify(loan.record),
        //     JSON.stringify(collateral.record),
        //     JSON.stringify(borrowerProfile.record),
        //     `${currentTime}u64`
        // ];
        
        // const aleoTransaction = Transaction.createTransaction(
        //     publicKey,
        //     'testnetbeta',
        //     PROGRAM_ID,
        //     'liquidate_defaulted_loan',
        //     inputs,
        //     500_000
        // );
        
        // if (aleoTransaction) {
        //     const txResult = await window.leoWallet.requestTransaction(aleoTransaction);
        //     showToast('Loan liquidated successfully!', 'success');
        //     setTimeout(() => fetchRecords(), 3000);
        // }
    } catch (error) {
        console.error('Liquidation error:', error);
        showToast('Failed to liquidate loan: ' + error.message, 'error');
    }
}


// ========================================
// ORIGINAL FUNCTIONS (PRESERVED)
// ========================================

// Create loan offer (original function)
async function createLoanOffer() {
    const borrower = document.getElementById('borrowerAddress').value.trim();
    const amount = document.getElementById('loanAmount').value;
    const interest = document.getElementById('interestRate').value;
    const days = document.getElementById('loanDuration').value;
    
    if (!borrower || !amount || !interest || !days) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    if (!publicKey) {
        showToast('Wallet not connected', 'error');
        return;
    }
    
    try {
        const btn = document.getElementById('createLoanBtn');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<div class="spinner"></div> Creating...';
        btn.disabled = true;
        
        showToast('Creating loan offer on blockchain...', 'info');
        
        const inputs = [
            borrower,
            `${amount}u64`,
            `${interest}u32`,
            `${days}u64`,
        ];
        
        console.log('Creating loan offer with inputs:', inputs);
        
        const aleoTransaction = Transaction.createTransaction(
            publicKey,
            'testnetbeta',
            PROGRAM_ID,
            'lend',
            inputs,
            500_000
        );
        
        if (aleoTransaction) {
            const txResult = await window.leoWallet.requestTransaction(aleoTransaction);
            console.log('Transaction result:', txResult);
            
            showToast('Loan offer created successfully!', 'success');
            closeModal('createLoanModal');
            
            setTimeout(() => fetchRecords(), 3000);
        }
    } catch (error) {
        console.error('Transaction error:', error);
        showToast('Failed to create loan offer: ' + error.message, 'error');
    } finally {
        const btn = document.getElementById('createLoanBtn');
        btn.innerHTML = '<i class="fas fa-hand-holding-usd"></i> Create Loan Offer';
        btn.disabled = false;
    }
}

// Send loan offer
async function sendLoanOffer() {
    if (!selectedOffer) {
        showToast('No offer selected', 'error');
        return;
    }
    
    const recipient = document.getElementById('recipientAddress').value.trim();
    
    if (!recipient) {
        showToast('Please enter recipient address', 'error');
        return;
    }
    
    if (!publicKey) {
        showToast('Wallet not connected', 'error');
        return;
    }
    
    try {
        const btn = document.getElementById('sendOfferBtn');
        btn.innerHTML = '<div class="spinner"></div> Sending...';
        btn.disabled = true;
        
        showToast('Sending loan offer...', 'info');
        
        const inputs = [
            JSON.stringify(selectedOffer.record),
            recipient
        ];
        
        const aleoTransaction = Transaction.createTransaction(
            publicKey,
            'testnetbeta',
            PROGRAM_ID,
            'send_offer',
            inputs,
            500_000
        );
        
        if (aleoTransaction) {
            const txResult = await window.leoWallet.requestTransaction(aleoTransaction);
            console.log('Transaction result:', txResult);
            
            showToast('Loan offer sent successfully!', 'success');
            closeModal('sendOfferModal');
            
            setTimeout(() => fetchRecords(), 3000);
        }
    } catch (error) {
        console.error('Send offer error:', error);
        showToast('Failed to send offer: ' + error.message, 'error');
    } finally {
        const btn = document.getElementById('sendOfferBtn');
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Offer';
        btn.disabled = false;
    }
}

// Accept loan offer (original)
async function acceptLoanOffer() {
    if (!selectedOffer) {
        showToast('No loan selected', 'error');
        return;
    }
    
    if (!publicKey) {
        showToast('Wallet not connected', 'error');
        return;
    }
    
    try {
        const btn = document.getElementById('acceptLoanBtn');
        btn.innerHTML = '<div class="spinner"></div> Accepting...';
        btn.disabled = true;
        
        showToast('Accepting loan offer...', 'info');
        
        const currentTime = Math.floor(Date.now() / 1000);
        
        const inputs = [
            JSON.stringify(selectedOffer.record),
            `${currentTime}u64`
        ];
        
        const aleoTransaction = Transaction.createTransaction(
            publicKey,
            'testnetbeta',
            PROGRAM_ID,
            'borrow',
            inputs,
            500_000
        );
        
        if (aleoTransaction) {
            const txResult = await window.leoWallet.requestTransaction(aleoTransaction);
            console.log('Transaction result:', txResult);
            
            showToast('Loan accepted successfully!', 'success');
            closeModal('acceptLoanModal');
            
            setTimeout(() => fetchRecords(), 3000);
        }
    } catch (error) {
        console.error('Accept loan error:', error);
        showToast('Failed to accept loan: ' + error.message, 'error');
    } finally {
        const btn = document.getElementById('acceptLoanBtn');
        btn.innerHTML = '<i class="fas fa-check"></i> Accept Loan Offer';
        btn.disabled = false;
    }
}

// Repay loan (original - will use credit update if profile exists)
async function repayLoan() {
    // If user has a profile, use credit update function
    if (userProfile) {
        return payLoanWithCreditUpdate();
    }
    
    // Otherwise use original function
    if (!selectedLoan) {
        showToast('No loan selected', 'error');
        return;
    }
    
    const amount = parseFloat(document.getElementById('repayAmount').value);
    
    if (!amount || amount <= 0) {
        showToast('Invalid repayment amount', 'error');
        return;
    }
    
    if (!publicKey) {
        showToast('Wallet not connected', 'error');
        return;
    }
    
    try {
        const btn = document.getElementById('repayLoanBtn');
        btn.innerHTML = '<div class="spinner"></div> Processing...';
        btn.disabled = true;
        
        showToast('Processing payment on blockchain...', 'info');
        
        const currentTime = Math.floor(Date.now() / 1000);
        
        const inputs = [
            JSON.stringify(selectedLoan.record),
            `${amount}u64`,
            `${currentTime}u64`
        ];
        
        const aleoTransaction = Transaction.createTransaction(
            publicKey,
            'testnetbeta',
            PROGRAM_ID,
            'pay',
            inputs,
            500_000
        );
        
        if (aleoTransaction) {
            const txResult = await window.leoWallet.requestTransaction(aleoTransaction);
            console.log('Transaction result:', txResult);
            
            showToast('Payment successful!', 'success');
            closeModal('repayLoanModal');
            
            setTimeout(() => fetchRecords(), 3000);
        }
    } catch (error) {
        console.error('Repayment error:', error);
        showToast('Failed to process payment: ' + error.message, 'error');
    } finally {
        const btn = document.getElementById('repayLoanBtn');
        btn.innerHTML = '<i class="fas fa-money-bill-wave"></i> Make Payment';
        btn.disabled = false;
    }
}

// All other original functions (extend, split, swap, public offers, etc.)
async function extendLoan() {
    if (!selectedLoan) {
        showToast('No loan selected', 'error');
        return;
    }
    
    const extraDays = parseInt(document.getElementById('extraDays').value);
    
    if (!extraDays || extraDays <= 0 || extraDays > 30) {
        showToast('Invalid extra days (1-30)', 'error');
        return;
    }
    
    if (!publicKey) {
        showToast('Wallet not connected', 'error');
        return;
    }
    
    try {
        const btn = document.getElementById('extendLoanBtn');
        btn.innerHTML = '<div class="spinner"></div> Processing...';
        btn.disabled = true;
        
        showToast('Extending loan duration...', 'info');
        
        const currentTime = Math.floor(Date.now() / 1000);
        
        const inputs = [
            JSON.stringify(selectedLoan.record),
            `${extraDays}u64`,
            `${currentTime}u64`
        ];
        
        const aleoTransaction = Transaction.createTransaction(
            publicKey,
            'testnetbeta',
            PROGRAM_ID,
            'extend',
            inputs,
            500_000
        );
        
        if (aleoTransaction) {
            const txResult = await window.leoWallet.requestTransaction(aleoTransaction);
            console.log('Transaction result:', txResult);
            
            showToast('Loan extended successfully!', 'success');
            closeModal('extendLoanModal');
            
            setTimeout(() => fetchRecords(), 3000);
        }
    } catch (error) {
        console.error('Extend loan error:', error);
        showToast('Failed to extend loan: ' + error.message, 'error');
    } finally {
        const btn = document.getElementById('extendLoanBtn');
        btn.innerHTML = '<i class="fas fa-calendar-plus"></i> Extend Loan';
        btn.disabled = false;
    }
}

async function splitLoan() {
    if (!selectedLoan) {
        showToast('No loan selected', 'error');
        return;
    }
    
    const parts = parseInt(document.getElementById('splitParts').value);
    
    if (!parts || parts < 2) {
        showToast('Invalid number of parts (minimum 2)', 'error');
        return;
    }
    
    if (!publicKey) {
        showToast('Wallet not connected', 'error');
        return;
    }
    
    try {
        const btn = document.getElementById('splitLoanBtn');
        btn.innerHTML = '<div class="spinner"></div> Processing...';
        btn.disabled = true;
        
        showToast('Splitting loan...', 'info');
        
        const inputs = [
            JSON.stringify(selectedLoan.record),
            `${parts}u64`
        ];
        
        const aleoTransaction = Transaction.createTransaction(
            publicKey,
            'testnetbeta',
            PROGRAM_ID,
            'split',
            inputs,
            500_000
        );
        
        if (aleoTransaction) {
            const txResult = await window.leoWallet.requestTransaction(aleoTransaction);
            console.log('Transaction result:', txResult);
            
            showToast('Loan split successfully!', 'success');
            closeModal('splitLoanModal');
            
            setTimeout(() => fetchRecords(), 3000);
        }
    } catch (error) {
        console.error('Split loan error:', error);
        showToast('Failed to split loan: ' + error.message, 'error');
    } finally {
        const btn = document.getElementById('splitLoanBtn');
        btn.innerHTML = '<i class="fas fa-cut"></i> Split Loan';
        btn.disabled = false;
    }
}

async function swapLoan() {
    if (!selectedLoan) {
        showToast('No loan selected', 'error');
        return;
    }
    
    const newBorrower = document.getElementById('newBorrowerAddress').value.trim();
    const fee = document.getElementById('swapFee').value;
    
    if (!newBorrower) {
        showToast('Please enter new borrower address', 'error');
        return;
    }
    
    if (!publicKey) {
        showToast('Wallet not connected', 'error');
        return;
    }
    
    try {
        const btn = document.getElementById('swapLoanBtn');
        btn.innerHTML = '<div class="spinner"></div> Processing...';
        btn.disabled = true;
        
        showToast('Transferring loan...', 'info');
        
        const currentTime = Math.floor(Date.now() / 1000);
        
        const inputs = [
            JSON.stringify(selectedLoan.record),
            newBorrower,
            `${fee}u64`,
            `${currentTime}u64`
        ];
        
        const aleoTransaction = Transaction.createTransaction(
            publicKey,
            'testnetbeta',
            PROGRAM_ID,
            'swap',
            inputs,
            500_000
        );
        
        if (aleoTransaction) {
            const txResult = await window.leoWallet.requestTransaction(aleoTransaction);
            console.log('Transaction result:', txResult);
            
            showToast('Loan transferred successfully!', 'success');
            closeModal('swapLoanModal');
            
            setTimeout(() => fetchRecords(), 3000);
        }
    } catch (error) {
        console.error('Swap loan error:', error);
        showToast('Failed to transfer loan: ' + error.message, 'error');
    } finally {
        const btn = document.getElementById('swapLoanBtn');
        btn.innerHTML = '<i class="fas fa-exchange-alt"></i> Transfer Loan';
        btn.disabled = false;
    }
}

async function listPublicOffer() {
    const amount = document.getElementById('publicAmount').value;
    const interest = document.getElementById('publicInterest').value;
    const days = document.getElementById('publicDuration').value;
    
    if (!amount || !interest || !days) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    if (!publicKey) {
        showToast('Wallet not connected', 'error');
        return;
    }
    
    try {
        const btn = document.getElementById('listPublicBtn');
        btn.innerHTML = '<div class="spinner"></div> Creating...';
        btn.disabled = true;
        
        showToast('Creating public loan offer...', 'info');
        
        const inputs = [
            `${amount}u64`,
            `${interest}u32`,
            `${days}u64`
        ];
        
        const aleoTransaction = Transaction.createTransaction(
            publicKey,
            'testnetbeta',
            PROGRAM_ID,
            'list_offer',
            inputs,
            500_000
        );
        
        if (aleoTransaction) {
            const txResult = await window.leoWallet.requestTransaction(aleoTransaction);
            console.log('Transaction result:', txResult);
            
            showToast('Public offer created successfully!', 'success');
            closeModal('listPublicModal');
            
            setTimeout(() => fetchRecords(), 3000);
        }
    } catch (error) {
        console.error('List public error:', error);
        showToast('Failed to create public offer: ' + error.message, 'error');
    } finally {
        const btn = document.getElementById('listPublicBtn');
        btn.innerHTML = '<i class="fas fa-globe"></i> List Public Offer';
        btn.disabled = false;
    }
}

async function acceptPublicOffer(offer) {
    if (!publicKey) {
        showToast('Wallet not connected', 'error');
        return;
    }
    
    try {
        showToast('Accepting public offer...', 'info');
        
        const currentTime = Math.floor(Date.now() / 1000);
        
        const inputs = [
            JSON.stringify(offer.record),
            `${currentTime}u64`
        ];
        
        const aleoTransaction = Transaction.createTransaction(
            publicKey,
            'testnetbeta',
            PROGRAM_ID,
            'accept_public_offer',
            inputs,
            500_000
        );
        
        if (aleoTransaction) {
            const txResult = await window.leoWallet.requestTransaction(aleoTransaction);
            console.log('Transaction result:', txResult);
            
            showToast('Public offer accepted successfully!', 'success');
            
            setTimeout(() => fetchRecords(), 3000);
        }
    } catch (error) {
        console.error('Accept public error:', error);
        showToast('Failed to accept public offer: ' + error.message, 'error');
    }
}

async function updateInterest() {
    if (!selectedOffer) {
        showToast('No offer selected', 'error');
        return;
    }
    
    const newInterest = document.getElementById('newInterestRate').value;
    
    if (!newInterest || newInterest < 0 || newInterest > 5000) {
        showToast('Invalid interest rate (0-5000)', 'error');
        return;
    }
    
    if (!publicKey) {
        showToast('Wallet not connected', 'error');
        return;
    }
    
    try {
        const btn = document.getElementById('updateInterestBtn');
        btn.innerHTML = '<div class="spinner"></div> Updating...';
        btn.disabled = true;
        
        showToast('Updating interest rate...', 'info');
        
        const inputs = [
            JSON.stringify(selectedOffer.record),
            `${newInterest}u32`
        ];
        
        const aleoTransaction = Transaction.createTransaction(
            publicKey,
            'testnetbeta',
            PROGRAM_ID,
            'update_interest',
            inputs,
            500_000
        );
        
        if (aleoTransaction) {
            const txResult = await window.leoWallet.requestTransaction(aleoTransaction);
            console.log('Transaction result:', txResult);
            
            showToast('Interest rate updated successfully!', 'success');
            closeModal('updateInterestModal');
            
            setTimeout(() => fetchRecords(), 3000);
        }
    } catch (error) {
        console.error('Update interest error:', error);
        showToast('Failed to update interest: ' + error.message, 'error');
    } finally {
        const btn = document.getElementById('updateInterestBtn');
        btn.innerHTML = '<i class="fas fa-percentage"></i> Update Interest';
        btn.disabled = false;
    }
}

async function cancelLoanOffer(offer) {
    if (!publicKey) {
        showToast('Wallet not connected', 'error');
        return;
    }
    
    if (confirm('Are you sure you want to cancel this loan offer?')) {
        try {
            showToast('Cancelling loan offer...', 'info');
            
            const inputs = [
                JSON.stringify(offer.record)
            ];
            
            const aleoTransaction = Transaction.createTransaction(
                publicKey,
                'testnetbeta',
                PROGRAM_ID,
                'cancel_offer',
                inputs,
                500_000
            );
            
            if (aleoTransaction) {
                const txResult = await window.leoWallet.requestTransaction(aleoTransaction);
                console.log('Transaction result:', txResult);
                
                showToast('Loan offer cancelled successfully!', 'success');
                
                setTimeout(() => fetchRecords(), 3000);
            }
        } catch (error) {
            console.error('Cancel offer error:', error);
            showToast('Failed to cancel offer: ' + error.message, 'error');
        }
    }
}

async function rejectLoanOffer(offer) {
    if (!publicKey) {
        showToast('Wallet not connected', 'error');
        return;
    }
    
    if (confirm('Are you sure you want to reject this loan offer?')) {
        try {
            showToast('Rejecting loan offer...', 'info');
            
            const inputs = [
                JSON.stringify(offer.record)
            ];
            
            const aleoTransaction = Transaction.createTransaction(
                publicKey,
                'testnetbeta',
                PROGRAM_ID,
                'reject_offer',
                inputs,
                500_000
            );
            
            if (aleoTransaction) {
                const txResult = await window.leoWallet.requestTransaction(aleoTransaction);
                console.log('Transaction result:', txResult);
                
                showToast('Loan offer rejected successfully!', 'success');
                
                setTimeout(() => fetchRecords(), 3000);
            }
        } catch (error) {
            console.error('Reject offer error:', error);
            showToast('Failed to reject offer: ' + error.message, 'error');
        }
    }
}


// ========================================
// UI UPDATE FUNCTIONS
// ========================================

function updateAllUI() {
    updateDashboard();
    updateProfileUI();
    updateLoanOffersTable();
    loadMyLoans();
    loadAvailableLoans();
    updatePaymentHistory();
    updateLoanSelector();
    loadPublicOffers();
    updateCollateralTable();
}

function updateProfileUI() {
    if (userProfile) {
        document.getElementById('profileNotRegistered').style.display = 'none';
        document.getElementById('profileRegistered').style.display = 'block';
        
        document.getElementById('userCreditScore').textContent = userProfile.credit_score;
        document.getElementById('creditScoreRating').textContent = getCreditRating(userProfile.credit_score);
        document.getElementById('userTotalLoans').textContent = userProfile.total_loans;
        
        const successRate = userProfile.total_loans > 0 
            ? Math.round((userProfile.successful_repayments / userProfile.total_loans) * 100)
            : 0;
        document.getElementById('userSuccessRate').textContent = successRate + '%';
        
        document.getElementById('userDefaults').textContent = userProfile.defaults;
        document.getElementById('userIdDisplay').textContent = userProfile.user_id.substring(0, 10) + '...';
        document.getElementById('userTotalBorrowed').textContent = userProfile.total_borrowed.toLocaleString() + ' μA';
        document.getElementById('userTotalRepaid').textContent = userProfile.total_repaid.toLocaleString() + ' μA';
        document.getElementById('userRegistrationDate').textContent = new Date(userProfile.registration_time * 1000).toLocaleDateString();
        
        // Update borrower credit score display
        document.getElementById('borrowerCreditScore').textContent = userProfile.credit_score;
        
        // Update proof modal info
        document.getElementById('creditProofInfo').innerHTML = `
            <div class="card mb-20">
                <div class="card-body">
                    <div class="detail-row">
                        <span class="detail-label">Your Credit Score:</span>
                        <span class="detail-value">${userProfile.credit_score}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Rating:</span>
                        <span class="detail-value">${getCreditRating(userProfile.credit_score)}</span>
                    </div>
                </div>
            </div>
        `;
    } else {
        document.getElementById('profileNotRegistered').style.display = 'block';
        document.getElementById('profileRegistered').style.display = 'none';
    }
}

function updateDashboard() {
    const activeLoans = currentLoans.filter(loan => loan.active && loan.loan_type === 1);
    const totalLent = currentLoans
        .filter(loan => loan.lender === publicKey)
        .reduce((sum, loan) => sum + loan.amount, 0);
    
    const totalBorrowed = currentLoans
        .filter(loan => loan.borrower === publicKey)
        .reduce((sum, loan) => sum + loan.amount, 0);
    
    const pendingRepayment = currentLoans
        .filter(loan => loan.borrower === publicKey && loan.active && loan.loan_type === 1)
        .reduce((sum, loan) => {
            const totalDue = loan.amount + (loan.amount * loan.interest / 10000);
            return sum + (totalDue - loan.repaid);
        }, 0);
    
    document.getElementById('activeLoansCount').textContent = activeLoans.length;
    document.getElementById('totalLent').textContent = totalLent.toLocaleString() + ' μA';
    document.getElementById('totalBorrowed').textContent = totalBorrowed.toLocaleString() + ' μA';
    document.getElementById('pendingRepayment').textContent = Math.round(pendingRepayment).toLocaleString() + ' μA';
    
    const activityTable = document.querySelector('#recentActivity tbody');
    activityTable.innerHTML = '';
    
    if (publicKey) {
        const recentActivities = [
            ...paymentHistory.slice(0, 5),
            ...currentLoans.slice(0, 5).map(loan => ({
                date: loan.createdDate,
                id: loan.id,
                amount: loan.amount,
                type: getLoanTypeName(loan.loan_type),
                status: loan.active ? 'Active' : 'Completed'
            }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        
        recentActivities.forEach(activity => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${activity.type}</td>
                <td>${activity.amount} μA</td>
                <td>${activity.type.includes('Payment') ? 'You' : 'Counterparty'}</td>
                <td>${new Date(activity.date).toLocaleDateString()}</td>
                <td><span class="status-badge ${activity.status === 'Active' ? 'status-active' : 'status-paid'}">${activity.status}</span></td>
            `;
            activityTable.appendChild(row);
        });
        
        if (recentActivities.length === 0) {
            activityTable.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">No recent activity</td>
                </tr>
            `;
        }
    } else {
        activityTable.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">Connect wallet to view activity</td>
            </tr>
        `;
    }
}

function updateLoanOffersTable() {
    const tableBody = document.querySelector('#loanOffersTable tbody');
    tableBody.innerHTML = '';
    
    if (publicKey) {
        const myOffers = loanOffers.filter(offer => offer.lender === publicKey);
        
        myOffers.forEach(offer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${offer.loan_type === 7 ? 'Public' : offer.has_collateral ? 'Credit-Based' : 'Basic'}</td>
                <td>${offer.borrower ? shortAddress(offer.borrower) : 'Anyone'}</td>
                <td>${offer.amount.toLocaleString()} μA</td>
                <td>${(offer.interest / 100).toFixed(2)}%</td>
                <td>${Math.floor(offer.due_time / 86400)} days</td>
                <td>${offer.min_credit_score > 0 ? offer.min_credit_score : '-'}</td>
                <td><span class="status-badge ${offer.active ? 'status-active' : 'status-inactive'}">${offer.active ? 'Active' : 'Pending'}</span></td>
                <td>
                    <div class="d-flex gap-10">
                        ${offer.loan_type === 0 ? `
                            <button class="btn btn-sm btn-primary" onclick='openSendModal(${JSON.stringify(offer).replace(/'/g, "\\'")})'>
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-sm btn-danger" onclick='cancelLoanOffer(${JSON.stringify(offer).replace(/'/g, "\\'")})'>
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        if (myOffers.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">No loan offers created yet</td>
                </tr>
            `;
        }
    } else {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">Connect wallet to view your offers</td>
            </tr>
        `;
    }
}

function loadMyLoans(filter = 'active') {
    const tableBody = document.querySelector('#myLoansTable tbody');
    tableBody.innerHTML = '';
    
    if (publicKey) {
        let filteredLoans = currentLoans.filter(loan => 
            (loan.borrower === publicKey || loan.lender === publicKey) && loan.loan_type !== 0 && loan.loan_type !== 7
        );
        
        if (filter === 'active') {
            filteredLoans = filteredLoans.filter(loan => loan.active && loan.loan_type === 1);
        } else if (filter === 'pending') {
            filteredLoans = filteredLoans.filter(loan => 
                loan.loan_type === 3 || loan.loan_type === 4 || loan.loan_type === 5
            );
        } else if (filter === 'completed') {
            filteredLoans = filteredLoans.filter(loan => !loan.active || loan.loan_type === 2);
        } else if (filter === 'overdue') {
            filteredLoans = filteredLoans.filter(loan => loan.overdue && loan.active);
        }
        
        filteredLoans.forEach(loan => {
            const totalDue = loan.amount + (loan.amount * loan.interest / 10000);
            const progress = totalDue > 0 ? (loan.repaid / totalDue) * 100 : 0;
            const dueDate = new Date(loan.dueDate);
            const isOverdue = loan.overdue;
            const isBorrower = loan.borrower === publicKey;
            const counterparty = isBorrower ? loan.lender : loan.borrower;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${shortAddress(loan.id)}</td>
                <td>${getLoanTypeName(loan.loan_type)}</td>
                <td>${shortAddress(counterparty)}</td>
                <td>${loan.amount.toLocaleString()} μA</td>
                <td>${(loan.interest / 100).toFixed(2)}%</td>
                <td>${dueDate.toLocaleDateString()}</td>
                <td>${loan.repaid.toLocaleString()} μA</td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <small>${progress.toFixed(1)}%</small>
                </td>
                <td>
                    ${loan.active && isBorrower && loan.loan_type === 1 ? `
                        <button class="btn btn-sm btn-success" onclick="openRepayModalForLoan('${loan.id}')">
                            <i class="fas fa-money-bill-wave"></i>
                        </button>
                    ` : ''}
                    ${isOverdue ? '<span class="status-badge status-overdue ml-2">Overdue</span>' : ''}
                    ${!loan.active ? '<span class="status-badge status-paid">Paid</span>' : ''}
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        if (filteredLoans.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center">No ${filter} loans found</td>
                </tr>
            `;
        }
    } else {
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center">Connect wallet to view your loans</td>
            </tr>
        `;
    }
}

function loadAvailableLoans() {
    const tableBody = document.querySelector('#availableLoansTable tbody');
    tableBody.innerHTML = '';
    
    if (publicKey) {
        const availableOffers = loanOffers.filter(offer => 
            (offer.borrower === publicKey || offer.borrower === '') && offer.owner === offer.lender
        );
        
        const availablePublic = publicOffers.filter(offer => 
            offer.owner === offer.lender && offer.lender !== publicKey
        );
        
        const allAvailable = [...availableOffers, ...availablePublic];
        
        document.getElementById('availableOffersCount').textContent = allAvailable.length;
        
        allAvailable.forEach(offer => {
            const row = document.createElement('tr');
            const acceptFunction = offer.has_collateral ? 'openAcceptCreditModal' : 'openAcceptModal';
            
            row.innerHTML = `
                <td>${shortAddress(offer.lender)}</td>
                <td>${offer.amount.toLocaleString()} μA</td>
                <td>${(offer.interest / 100).toFixed(2)}%</td>
                <td>${Math.floor(offer.due_time / 86400)} days</td>
                <td>${offer.min_credit_score > 0 ? offer.min_credit_score : '-'}</td>
                <td>${offer.collateral_amount > 0 ? offer.collateral_amount.toLocaleString() + ' μA' : '-'}</td>
                <td>${offer.loan_type === 7 ? 'Public' : offer.has_collateral ? 'Credit-Based' : 'Basic'}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick='${acceptFunction}(${JSON.stringify(offer).replace(/'/g, "\\'")})'>
                        <i class="fas fa-check"></i> Accept
                    </button>
                    ${offer.loan_type === 0 ? `
                        <button class="btn btn-sm btn-danger ml-2" onclick='rejectLoanOffer(${JSON.stringify(offer).replace(/'/g, "\\'")})'> 
                            <i class="fas fa-times"></i>
                        </button>
                    ` : ''}
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        if (allAvailable.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">No available loan offers at the moment</td>
                </tr>
            `;
        }
    } else {
        tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">Connect wallet to view available offers</td>
            </tr>
        `;
    }
}

function loadPublicOffers() {
    const tableBody = document.querySelector('#publicOffersTable tbody');
    tableBody.innerHTML = '';
    
    if (publicKey) {
        publicOffers.forEach(offer => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${shortAddress(offer.lender)}</td>
                <td>${offer.amount.toLocaleString()} μA</td>
                <td>${(offer.interest / 100).toFixed(2)}%</td>
                <td>${Math.floor(offer.due_time / 86400)} days</td>
                <td>${new Date(offer.createdDate).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-success" onclick='acceptPublicOffer(${JSON.stringify(offer).replace(/'/g, "\\'")}'>
                        <i class="fas fa-handshake"></i> Accept
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        if (publicOffers.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">No public offers available</td>
                </tr>
            `;
        }
    } else {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">Connect wallet to view public offers</td>
            </tr>
        `;
    }
}

function updatePaymentHistory() {
    const tableBody = document.querySelector('#paymentHistoryTable tbody');
    tableBody.innerHTML = '';
    
    if (publicKey) {
        const paymentRecords = currentLoans.filter(loan => 
            loan.loan_type >= 3 && loan.loan_type <= 5
        );
        
        paymentRecords.forEach(payment => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${new Date(payment.createdDate).toLocaleDateString()}</td>
                <td>${shortAddress(payment.id)}</td>
                <td>${payment.amount} μA</td>
                <td>${getLoanTypeName(payment.loan_type)}</td>
                <td>
                    <span class="status-badge ${payment.loan_type === 4 ? 'status-paid' : 'status-pending'}">
                        ${payment.loan_type === 4 ? 'Claimed' : 'Unclaimed'}
                    </span>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        if (paymentRecords.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center">No payment history yet</td>
                </tr>
            `;
        }
    } else {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">Connect wallet to view payment history</td>
            </tr>
        `;
    }
}

function updateCollateralTable() {
    const tableBody = document.querySelector('#collateralTable tbody');
    tableBody.innerHTML = '';
    
    if (publicKey && userCollateral.length > 0) {
        userCollateral.forEach(collateral => {
            const tokenName = collateral.token_type === 0 ? 'ALEO' : 'Custom';
            const lockDate = new Date(collateral.lock_time * 1000);
            const releaseDate = new Date(collateral.release_time * 1000);
            const canRelease = Date.now() / 1000 >= collateral.release_time && collateral.is_active;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${collateral.loan_id.substring(0, 10)}...</td>
                <td>${collateral.amount.toLocaleString()} ${tokenName}</td>
                <td>${tokenName}</td>
                <td>${lockDate.toLocaleDateString()}</td>
                <td>${releaseDate.toLocaleDateString()}</td>
                <td><span class="status-badge ${collateral.is_active ? 'status-active' : 'status-inactive'}">${collateral.is_active ? 'Locked' : 'Released'}</span></td>
                <td>
                    ${canRelease ? `
                        <button class="btn btn-sm btn-success" onclick='releaseCollateral(${JSON.stringify(collateral).replace(/'/g, "\\'")})'>
                            <i class="fas fa-unlock"></i> Release
                        </button>
                    ` : collateral.is_active ? '<span class="text-muted">Locked</span>' : '-'}
                </td>
            `;
            tableBody.appendChild(row);
        });
    } else {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center">${publicKey ? 'No collateral locked yet' : 'Connect wallet to view collateral'}</td>
            </tr>
        `;
    }
}

function updateLoanSelector() {
    const selector = document.getElementById('loanSelector');
    const checkSelector = document.getElementById('checkLoanSelect');
    
    selector.innerHTML = '<option value="">Select a loan...</option>';
    checkSelector.innerHTML = '<option value="">Select a loan...</option>';
    
    if (publicKey) {
        const activeLoans = currentLoans.filter(loan => 
            loan.borrower === publicKey && loan.active && loan.loan_type === 1
        );
        
        activeLoans.forEach(loan => {
            const totalDue = loan.amount + (loan.amount * loan.interest / 10000);
            const remaining = totalDue - loan.repaid;
            
            const option = document.createElement('option');
            option.value = loan.id;
            option.textContent = `${shortAddress(loan.id)} - ${loan.amount} μA (${Math.round(remaining)} μA left)`;
            selector.appendChild(option);
            
            const checkOption = option.cloneNode(true);
            checkSelector.appendChild(checkOption);
        });
    }
    
    document.getElementById('repayBtn').disabled = selector.value === '';
}

// ========================================
// MODAL FUNCTIONS
// ========================================

function openModal(modalId) {
    if (!publicKey && modalId !== 'registerUserModal') {
        showToast('Please connect your wallet first', 'warning');
        toggleWalletConnection();
        return;
    }
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function openSendModal(offer) {
    selectedOffer = offer;
    
    const detailsDiv = document.getElementById('sendOfferDetails');
    detailsDiv.innerHTML = `
        <h4>Loan Offer Details</h4>
        <div class="detail-row">
            <span class="detail-label">Amount:</span>
            <span class="detail-value">${offer.amount} μA</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Interest:</span>
            <span class="detail-value">${offer.interest / 100}%</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Duration:</span>
            <span class="detail-value">${offer.due_time / 86400} days</span>
        </div>
    `;
    
    openModal('sendOfferModal');
}

function openAcceptModal(offer) {
    selectedOffer = offer;
    
    const detailsDiv = document.getElementById('acceptLoanDetails');
    const totalDue = offer.amount + (offer.amount * offer.interest / 10000);
    
    detailsDiv.innerHTML = `
        <h4>Loan Offer Details</h4>
        <div class="detail-row">
            <span class="detail-label">Lender:</span>
            <span class="detail-value">${shortAddress(offer.lender)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Amount:</span>
            <span class="detail-value">${offer.amount} μA</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Interest:</span>
            <span class="detail-value">${offer.interest / 100}%</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Duration:</span>
            <span class="detail-value">${offer.due_time / 86400} days</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Total Repayment:</span>
            <span class="detail-value">${totalDue.toFixed(2)} μA</span>
        </div>
    `;
    
    openModal('acceptLoanModal');
}

function openAcceptCreditModal(offer) {
    selectedOffer = offer;
    
    const detailsDiv = document.getElementById('acceptLoanCreditDetails');
    const totalDue = offer.amount + (offer.amount * offer.interest / 10000);
    
    detailsDiv.innerHTML = `
        <h4>Credit-Based Loan Details</h4>
        <div class="detail-row">
            <span class="detail-label">Lender:</span>
            <span class="detail-value">${shortAddress(offer.lender)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Amount:</span>
            <span class="detail-value">${offer.amount} μA</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Interest:</span>
            <span class="detail-value">${offer.interest / 100}%</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Min Credit Score:</span>
            <span class="detail-value">${offer.min_credit_score}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Required Collateral:</span>
            <span class="detail-value">${offer.collateral_amount} μA</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Total Repayment:</span>
            <span class="detail-value">${totalDue.toFixed(2)} μA</span>
        </div>
    `;
    
    openModal('acceptLoanCreditModal');
}

function openRepayModal() {
    const loanId = document.getElementById('loanSelector').value;
    if (!loanId) return;
    
    const loan = currentLoans.find(l => l.id === loanId);
    if (!loan) return;
    
    selectedLoan = loan;
    
    const detailsDiv = document.getElementById('repayLoanDetails');
    const totalDue = loan.amount + (loan.amount * loan.interest / 10000);
    const remaining = totalDue - loan.repaid;
    const progress = totalDue > 0 ? (loan.repaid / totalDue) * 100 : 0;
    
    detailsDiv.innerHTML = `
        <h4>Loan Details</h4>
        <div class="detail-row">
            <span class="detail-label">Loan ID:</span>
            <span class="detail-value">${shortAddress(loan.id)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Lender:</span>
            <span class="detail-value">${shortAddress(loan.lender)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Amount:</span>
            <span class="detail-value">${loan.amount} μA</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Interest:</span>
            <span class="detail-value">${loan.interest / 100}%</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Repaid:</span>
            <span class="detail-value">${loan.repaid} μA</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Remaining:</span>
            <span class="detail-value">${remaining.toFixed(2)} μA</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Due Date:</span>
            <span class="detail-value">${new Date(loan.dueDate).toLocaleDateString()}</span>
        </div>
        <div class="progress-container">
            <div class="progress-label">
                <span>Repayment Progress</span>
                <span>${progress.toFixed(1)}%</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
        </div>
        ${userProfile ? '<p class="mt-20" style="color: var(--secondary-color);"><i class="fas fa-info-circle"></i> Payment will update your credit score!</p>' : ''}
    `;
    
    document.getElementById('repayAmount').value = Math.min(remaining, loan.amount * 0.1);
    openModal('repayLoanModal');
}

function openRepayModalForLoan(loanId) {
    document.getElementById('loanSelector').value = loanId;
    updateLoanSelector();
    openRepayModal();
}

function openExtendModal() {
    const activeLoans = currentLoans.filter(loan => 
        loan.active && loan.loan_type === 1 && loan.borrower === publicKey
    );
    
    if (activeLoans.length === 0) {
        showToast('No active loans to extend', 'warning');
        return;
    }
    
    selectedLoan = activeLoans[0];
    
    const detailsDiv = document.getElementById('extendLoanDetails');
    detailsDiv.innerHTML = `
        <h4>Loan Details</h4>
        <div class="detail-row">
            <span class="detail-label">Amount:</span>
            <span class="detail-value">${selectedLoan.amount} μA</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Current Interest:</span>
            <span class="detail-value">${selectedLoan.interest / 100}%</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Current Due Date:</span>
            <span class="detail-value">${new Date(selectedLoan.dueDate).toLocaleDateString()}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Fee:</span>
            <span class="detail-value">10% of extra days added to interest</span>
        </div>
    `;
    
    openModal('extendLoanModal');
}

function openSplitModal() {
    const activeLoans = currentLoans.filter(loan => 
        loan.active && loan.loan_type === 1 && loan.borrower === publicKey
    );
    
    if (activeLoans.length === 0) {
        showToast('No active loans to split', 'warning');
        return;
    }
    
    selectedLoan = activeLoans[0];
    
    const detailsDiv = document.getElementById('splitLoanDetails');
    detailsDiv.innerHTML = `
        <h4>Loan Details</h4>
        <div class="detail-row">
            <span class="detail-label">Amount:</span>
            <span class="detail-value">${selectedLoan.amount} μA</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Interest:</span>
            <span class="detail-value">${selectedLoan.interest / 100}%</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Repaid:</span>
            <span class="detail-value">${selectedLoan.repaid} μA</span>
        </div>
    `;
    
    openModal('splitLoanModal');
}

function openSwapModal() {
    const activeLoans = currentLoans.filter(loan => 
        loan.active && loan.loan_type === 1 && loan.borrower === publicKey
    );
    
    if (activeLoans.length === 0) {
        showToast('No active loans to transfer', 'warning');
        return;
    }
    
    selectedLoan = activeLoans[0];
    
    const detailsDiv = document.getElementById('swapLoanDetails');
    detailsDiv.innerHTML = `
        <h4>Loan Details</h4>
        <div class="detail-row">
            <span class="detail-label">Amount:</span>
            <span class="detail-value">${selectedLoan.amount} μA</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Interest:</span>
            <span class="detail-value">${selectedLoan.interest / 100}%</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Repaid:</span>
            <span class="detail-value">${selectedLoan.repaid} μA</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Current Borrower:</span>
            <span class="detail-value">${shortAddress(selectedLoan.borrower)}</span>
        </div>
    `;
    
    openModal('swapLoanModal');
}

function checkLoanStatus() {
    const loanId = document.getElementById('checkLoanSelect').value;
    if (!loanId) {
        showToast('Please select a loan', 'warning');
        return;
    }
    
    const loan = currentLoans.find(l => l.id === loanId);
    const resultDiv = document.getElementById('loanStatusResult');
    
    if (loan) {
        const totalDue = loan.amount + (loan.amount * loan.interest / 10000);
        const progress = totalDue > 0 ? (loan.repaid / totalDue) * 100 : 0;
        const dueDate = new Date(loan.dueDate);
        const daysLeft = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
        const isBorrower = loan.borrower === publicKey;
        
        resultDiv.innerHTML = `
            <div class="loan-details">
                <h4>Loan Status Report</h4>
                <div class="detail-row">
                    <span class="detail-label">Loan ID:</span>
                    <span class="detail-value">${shortAddress(loan.id)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Type:</span>
                    <span class="detail-value">${getLoanTypeName(loan.loan_type)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status:</span>
                    <span class="status-badge ${loan.active ? 'status-active' : 'status-paid'}">
                        ${loan.active ? 'Active' : 'Completed'}
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Your Role:</span>
                    <span class="detail-value">${isBorrower ? 'Borrower' : 'Lender'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Counterparty:</span>
                    <span class="detail-value">${shortAddress(isBorrower ? loan.lender : loan.borrower)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Original Amount:</span>
                    <span class="detail-value">${loan.amount.toLocaleString()} μA</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Total Due:</span>
                    <span class="detail-value">${totalDue.toFixed(2)} μA</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Days Left:</span>
                    <span class="detail-value">${daysLeft > 0 ? daysLeft : 'Overdue'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Progress:</span>
                    <span class="detail-value">${progress.toFixed(1)}%</span>
                </div>
                <div class="progress-container mt-20">
                    <div class="progress-label">
                        <span>Repayment Progress</span>
                        <span>${progress.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
            </div>
        `;
    } else {
        resultDiv.innerHTML = `
            <div class="loan-details">
                <h4>Loan Not Found</h4>
                <p>No loan found with ID: ${loanId}</p>
                <p>The loan may not exist or you may not have permission to view it.</p>
            </div>
        `;
    }
}

// ========================================
// NAVIGATION FUNCTIONS
// ========================================

function showSection(sectionId) {
    document.querySelectorAll('.content-area').forEach(section => {
        section.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    document.getElementById(sectionId + 'Section').classList.add('active');
    event.target.closest('.nav-link').classList.add('active');
    
    if (sectionId === 'dashboard') {
        updateDashboard();
    } else if (sectionId === 'profile') {
        updateProfileUI();
    } else if (sectionId === 'loans') {
        loadMyLoans('active');
    } else if (sectionId === 'borrow') {
        loadAvailableLoans();
    } else if (sectionId === 'lend') {
        updateLoanOffersTable();
    } else if (sectionId === 'public') {
        loadPublicOffers();
    } else if (sectionId === 'collateral') {
        updateCollateralTable();
    }
}

function showLoanTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    loadMyLoans(tabId);
}

// ========================================
// TOAST NOTIFICATIONS
// ========================================

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas fa-${icons[type]} toast-icon"></i>
        <div>${message}</div>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Check wallet on page load
document.addEventListener('DOMContentLoaded', function() {
    if (window.leoWallet) {
        console.log('Leo Wallet detected');
    } else {
        console.log('Leo Wallet not detected');
    }
});

