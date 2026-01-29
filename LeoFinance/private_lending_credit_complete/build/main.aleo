program private_lending_credit_complete.aleo;

record UserProfile:
    owner as address.private;
    user_id as field.private;
    credit_score as u32.private;
    total_loans as u32.private;
    successful_repayments as u32.private;
    defaults as u32.private;
    total_borrowed as u64.private;
    total_repaid as u64.private;
    registered_time as u64.private;
    last_updated as u64.private;

record CreditCredential:
    owner as address.private;
    user_id as field.private;
    min_score as u32.private;
    issued_time as u64.private;
    valid_until as u64.private;
    nullifier as field.private;

record Collateral:
    owner as address.private;
    loan_id as field.private;
    amount as u64.private;
    token_type as u8.private;
    locked_time as u64.private;
    release_time as u64.private;
    active as boolean.private;

record Loan:
    owner as address.private;
    loan_id as field.private;
    lender as address.private;
    borrower as address.private;
    amount as u64.private;
    interest as u32.private;
    repaid as u64.private;
    due_time as u64.private;
    created as u64.private;
    active as boolean.private;
    loan_type as u8.private;
    collateral_amount as u64.private;
    collateral_ratio as u32.private;
    min_credit_score as u32.private;
    has_collateral as boolean.private;

record PaymentReceipt:
    owner as address.private;
    loan_id as field.private;
    amount as u64.private;
    payment_time as u64.private;
    on_time as boolean.private;
    final_payment as boolean.private;

mapping user_registry:
    key as address.public;
    value as field.public;

mapping credit_commitments:
    key as field.public;
    value as field.public;

mapping active_loans:
    key as field.public;
    value as field.public;

mapping collateral_locks:
    key as field.public;
    value as u64.public;

mapping default_tracker:
    key as field.public;
    value as u32.public;

mapping loan_counter:
    key as u8.public;
    value as u64.public;

function register_user:
    input r0 as field.private;
    input r1 as u64.private;
    cast self.caller r0 500u32 0u32 0u32 0u32 0u64 0u64 r1 r1 into r2 as UserProfile.record;
    async register_user self.caller r0 into r3;
    output r2 as UserProfile.record;
    output r3 as private_lending_credit_complete.aleo/register_user.future;

finalize register_user:
    input r0 as address.public;
    input r1 as field.public;
    set r1 into user_registry[r0];
    set 71139838108533975562284222628379683002183347770223395572598191088280605073field into credit_commitments[r1];

function calculate_credit_score:
    input r0 as UserProfile.record;
    input r1 as boolean.private;
    input r2 as boolean.private;
    input r3 as u64.private;
    add r0.successful_repayments 1u32 into r4;
    ternary r1 r4 r0.successful_repayments into r5;
    add r0.defaults 1u32 into r6;
    ternary r2 r6 r0.defaults into r7;
    mul r5 5u32 into r8;
    mul r7 50u32 into r9;
    add 500u32 r8 into r10;
    gt r10 r9 into r11;
    sub r10 r9 into r12;
    ternary r11 r12 0u32 into r13;
    gt r13 1000u32 into r14;
    ternary r14 1000u32 r13 into r15;
    cast r0.owner r0.user_id r15 r0.total_loans r5 r7 r0.total_borrowed r0.total_repaid r0.registered_time r3 into r16 as UserProfile.record;
    output r16 as UserProfile.record;

function generate_credit_proof:
    input r0 as UserProfile.record;
    input r1 as u32.private;
    input r2 as u64.private;
    input r3 as u64.private;
    gte r0.credit_score r1 into r4;
    assert.eq r4 true;
    cast r3 into r5 as field;
    add r0.user_id r5 into r6;
    hash.bhp256 r6 into r7 as field;
    add r3 r2 into r8;
    cast r0.owner r0.user_id r1 r3 r8 r7 into r9 as CreditCredential.record;
    output r9 as CreditCredential.record;

function verify_credit_credential:
    input r0 as CreditCredential.record;
    input r1 as u32.private;
    input r2 as u64.private;
    gte r0.min_score r1 into r3;
    lte r2 r0.valid_until into r4;
    and r3 r4 into r5;
    output r5 as boolean.private;

function lock_collateral:
    input r0 as field.private;
    input r1 as u64.private;
    input r2 as u8.private;
    input r3 as u64.private;
    input r4 as u64.private;
    add r4 r3 into r5;
    cast self.caller r0 r1 r2 r4 r5 true into r6 as Collateral.record;
    async lock_collateral r0 r1 into r7;
    output r6 as Collateral.record;
    output r7 as private_lending_credit_complete.aleo/lock_collateral.future;

finalize lock_collateral:
    input r0 as field.public;
    input r1 as u64.public;
    set r1 into collateral_locks[r0];

function release_collateral:
    input r0 as Collateral.record;
    input r1 as u64.private;
    is.eq r0.owner self.caller into r2;
    assert.eq r2 true;
    assert.eq r0.active true;
    cast r0.owner r0.loan_id r0.amount r0.token_type r0.locked_time r1 false into r3 as Collateral.record;
    async release_collateral r0.loan_id into r4;
    output r3 as Collateral.record;
    output r4 as private_lending_credit_complete.aleo/release_collateral.future;

finalize release_collateral:
    input r0 as field.public;
    remove collateral_locks[r0];

function create_loan_offer_with_credit:
    input r0 as address.private;
    input r1 as u64.private;
    input r2 as u32.private;
    input r3 as u64.private;
    input r4 as u32.private;
    input r5 as u64.private;
    input r6 as u32.private;
    gt r1 0u64 into r7;
    lte r2 5000u32 into r8;
    and r7 r8 into r9;
    lte r3 365u64 into r10;
    and r9 r10 into r11;
    assert.eq r11 true;
    lte r4 1000u32 into r12;
    assert.eq r12 true;
    gte r6 10000u32 into r13;
    assert.eq r13 true;
    cast self.caller into r14 as field;
    cast r0 into r15 as field;
    add r14 r15 into r16;
    cast r1 into r17 as field;
    add r16 r17 into r18;
    hash.bhp256 r18 into r19 as field;
    mul r3 86400u64 into r20;
    cast self.caller r19 self.caller r0 r1 r2 0u64 r20 0u64 false 0u8 r5 r6 r4 false into r21 as Loan.record;
    output r21 as Loan.record;

function accept_loan_with_credit:
    input r0 as Loan.record;
    input r1 as CreditCredential.record;
    input r2 as Collateral.record;
    input r3 as u64.private;
    is.eq r0.owner self.caller into r4;
    is.eq r0.borrower self.caller into r5;
    or r4 r5 into r6;
    assert.eq r6 true;
    is.eq r1.owner self.caller into r7;
    assert.eq r7 true;
    is.eq r2.owner self.caller into r8;
    assert.eq r8 true;
    gte r1.min_score r0.min_credit_score into r9;
    assert.eq r9 true;
    lte r3 r1.valid_until into r10;
    assert.eq r10 true;
    gte r2.amount r0.collateral_amount into r11;
    assert.eq r11 true;
    is.eq r2.loan_id r0.loan_id into r12;
    assert.eq r12 true;
    assert.eq r2.active true;
    add r3 r0.due_time into r13;
    cast self.caller r0.loan_id r0.lender self.caller r0.amount r0.interest 0u64 r13 r3 true 1u8 r0.collateral_amount r0.collateral_ratio r0.min_credit_score true into r14 as Loan.record;
    hash.bhp256 r14.amount into r15 as field;
    async accept_loan_with_credit r0.loan_id r15 into r16;
    output r14 as Loan.record;
    output r16 as private_lending_credit_complete.aleo/accept_loan_with_credit.future;

finalize accept_loan_with_credit:
    input r0 as field.public;
    input r1 as field.public;
    set r1 into active_loans[r0];

function pay_with_credit_update:
    input r0 as Loan.record;
    input r1 as UserProfile.record;
    input r2 as u64.private;
    input r3 as u64.private;
    is.eq r0.owner self.caller into r4;
    assert.eq r4 true;
    assert.eq r0.active true;
    is.eq r1.owner self.caller into r5;
    assert.eq r5 true;
    add r0.repaid r2 into r6;
    cast r0.interest into r7 as u64;
    mul r0.amount r7 into r8;
    div r8 10000u64 into r9;
    add r0.amount r9 into r10;
    gte r6 r10 into r11;
    lte r3 r0.due_time into r12;
    ternary r11 false true into r13;
    ternary r11 2u8 1u8 into r14;
    cast r0.owner r0.loan_id r0.lender r0.borrower r0.amount r0.interest r6 r0.due_time r0.created r13 r14 r0.collateral_amount r0.collateral_ratio r0.min_credit_score r0.has_collateral into r15 as Loan.record;
    cast self.caller r0.loan_id r2 r3 r12 r11 into r16 as PaymentReceipt.record;
    and r11 r12 into r17;
    add r1.credit_score 10u32 into r18;
    ternary r17 r18 r1.credit_score into r19;
    add r1.successful_repayments 1u32 into r20;
    ternary r11 r20 r1.successful_repayments into r21;
    add r1.total_repaid r2 into r22;
    cast r1.owner r1.user_id r19 r1.total_loans r21 r1.defaults r1.total_borrowed r22 r1.registered_time r3 into r23 as UserProfile.record;
    async pay_with_credit_update r0.loan_id r11 into r24;
    output r15 as Loan.record;
    output r16 as PaymentReceipt.record;
    output r23 as UserProfile.record;
    output r24 as private_lending_credit_complete.aleo/pay_with_credit_update.future;

finalize pay_with_credit_update:
    input r0 as field.public;
    input r1 as boolean.public;
    branch.eq r1 false to end_then_0_0;
    remove active_loans[r0];
    branch.eq true true to end_otherwise_0_1;
    position end_then_0_0;
    position end_otherwise_0_1;

function liquidate_defaulted_loan:
    input r0 as Loan.record;
    input r1 as Collateral.record;
    input r2 as UserProfile.record;
    input r3 as u64.private;
    is.eq self.caller r0.lender into r4;
    assert.eq r4 true;
    assert.eq r0.active true;
    gt r3 r0.due_time into r5;
    assert.eq r5 true;
    is.eq r1.loan_id r0.loan_id into r6;
    assert.eq r6 true;
    assert.eq r1.active true;
    cast r0.lender r1.loan_id r1.amount r1.token_type r1.locked_time r3 false into r7 as Collateral.record;
    gt r2.credit_score 100u32 into r8;
    sub r2.credit_score 100u32 into r9;
    ternary r8 r9 0u32 into r10;
    add r2.defaults 1u32 into r11;
    cast r2.owner r2.user_id r10 r2.total_loans r2.successful_repayments r11 r2.total_borrowed r2.total_repaid r2.registered_time r3 into r12 as UserProfile.record;
    async liquidate_defaulted_loan r0.loan_id r2.user_id into r13;
    output r7 as Collateral.record;
    output r12 as UserProfile.record;
    output r13 as private_lending_credit_complete.aleo/liquidate_defaulted_loan.future;

finalize liquidate_defaulted_loan:
    input r0 as field.public;
    input r1 as field.public;
    remove active_loans[r0];
    remove collateral_locks[r0];
    get.or_use default_tracker[r1] 0u32 into r2;
    add r2 1u32 into r3;
    set r3 into default_tracker[r1];

function lend:
    input r0 as address.private;
    input r1 as u64.private;
    input r2 as u32.private;
    input r3 as u64.private;
    gt r1 0u64 into r4;
    lte r2 5000u32 into r5;
    and r4 r5 into r6;
    lte r3 365u64 into r7;
    and r6 r7 into r8;
    assert.eq r8 true;
    cast self.caller into r9 as field;
    cast r0 into r10 as field;
    add r9 r10 into r11;
    cast r1 into r12 as field;
    add r11 r12 into r13;
    hash.bhp256 r13 into r14 as field;
    mul r3 86400u64 into r15;
    cast self.caller r14 self.caller r0 r1 r2 0u64 r15 0u64 false 0u8 0u64 0u32 0u32 false into r16 as Loan.record;
    output r16 as Loan.record;

function send_offer:
    input r0 as Loan.record;
    input r1 as address.private;
    is.eq r0.owner self.caller into r2;
    assert.eq r2 true;
    is.eq r0.lender self.caller into r3;
    assert.eq r3 true;
    not r0.active into r4;
    assert.eq r4 true;
    cast r1 r0.loan_id r0.lender r1 r0.amount r0.interest r0.repaid r0.due_time r0.created false r0.loan_type r0.collateral_amount r0.collateral_ratio r0.min_credit_score r0.has_collateral into r5 as Loan.record;
    output r5 as Loan.record;

function borrow:
    input r0 as Loan.record;
    input r1 as u64.private;
    is.eq r0.owner self.caller into r2;
    assert.eq r2 true;
    not r0.active into r3;
    assert.eq r3 true;
    add r1 r0.due_time into r4;
    cast r0.borrower r0.loan_id r0.lender r0.borrower r0.amount r0.interest 0u64 r4 r1 true 1u8 r0.collateral_amount r0.collateral_ratio r0.min_credit_score r0.has_collateral into r5 as Loan.record;
    output r5 as Loan.record;

function pay:
    input r0 as Loan.record;
    input r1 as u64.private;
    is.eq r0.owner self.caller into r2;
    assert.eq r2 true;
    assert.eq r0.active true;
    add r0.repaid r1 into r3;
    cast r0.interest into r4 as u64;
    mul r0.amount r4 into r5;
    div r5 10000u64 into r6;
    add r0.amount r6 into r7;
    gte r3 r7 into r8;
    not r8 into r9;
    ternary r8 2u8 1u8 into r10;
    cast r0.owner r0.loan_id r0.lender r0.borrower r0.amount r0.interest r3 r0.due_time r0.created r9 r10 r0.collateral_amount r0.collateral_ratio r0.min_credit_score r0.has_collateral into r11 as Loan.record;
    output r11 as Loan.record;

function check:
    input r0 as Loan.record;
    input r1 as u64.private;
    gt r1 r0.due_time into r2;
    cast r0.interest into r3 as u64;
    mul r0.amount r3 into r4;
    div r4 10000u64 into r5;
    add r0.amount r5 into r6;
    gte r0.repaid r6 into r7;
    output r0.active as boolean.private;
    output r2 as boolean.private;
    output r7 as boolean.private;
    output r0.loan_type as u8.private;

function calculate_total:
    input r0 as Loan.record;
    cast r0.interest into r1 as u64;
    mul r0.amount r1 into r2;
    div r2 10000u64 into r3;
    add r0.amount r3 into r4;
    output r4 as u64.private;

constructor:
    assert.eq edition 0u16;
