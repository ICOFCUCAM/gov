// English (baseline). Other locales mirror the Messages shape declared below.
// Per Companion 22 (plain language) — People's Editor reviews citizen-facing copy.

export interface Messages {
  common: {
    home: string;
    services: string;
    inbox: string;
    records: string;
    assistant: string;
    back: string;
    cancel: string;
    submit: string;
    save: string;
    close: string;
    next: string;
    learnMore: string;
    talkToAgent: string;
    talkToHuman: string;
  };
  wallet: {
    greeting: string;
    needsTo: string;
    receipts: string;
    showAllReceipts: string;
    accessHint: string;
    seeWhoAndWhy: string;
  };
  receipt: {
    title: string;
    whatHappened: string;
    whyThisAmount: string;
    wasAIInvolved: string;
    ifSomethingWrong: string;
    questionThis: string;
    submitComplaint: string;
    proof: string;
    verifySignature: string;
    continuationGuarantee: string;
  };
  contest: {
    headline: string;
    pickWhat: string;
    optionAsk: string;
    optionContest: string;
    optionComplaint: string;
    pickWhy: string;
    reasonAmount: string;
    reasonUnclear: string;
    reasonDisagree: string;
    noteLabel: string;
    submitted: string;
    caseOpened: string;
    paymentContinues: string;
  };
  assistant: {
    classANotice: string;
    sources: string;
  };
  doctrine: {
    fourSentences: string;
  };
  /** Permit and receipt detail pages. */
  detail: {
    notFoundPermit: string;
    notFoundReceipt: string;
    officer: string;
    actionNeeded: string;
    actionNeededText: string;
    details: string;
    progress: string;
    aiPermit: string;
    aiPermitBold: string;
    neverDelays: string;
    grantApproved: string;
    officerWithId: string;
    total: string;
    aiReceipt: string;
    aiReceiptBold: string;
    aiNotDecide: string;
  };
  /** Status badges, selective disclosure and the support thread. */
  more: {
    draft: string;
    submitted: string;
    inReview: string;
    needsInfo: string;
    approved: string;
    declined: string;
    billPaid: string;
    billOverdue: string;
    billDue: string;
    fullName: string;
    over18: string;
    dob: string;
    address: string;
    nationalId: string;
    vaccination: string;
    yes: string;
    nothingShared: string;
    declinedText: string;
    sharedTitle: string;
    sharedText: string;
    done: string;
    askingText: string;
    purpose: string;
    scope: string;
    chooseShare: string;
    notShared: string;
    shareN: string;
    selectOne: string;
    revokeLater: string;
    supportThread: string;
    supportDesk: string;
    citizen: string;
    supportTitle: string;
    fromSubstrate: string;
  };
  /** Wallet permits, inbox, payments, document verification and signing. */
  pages: {
    permits: string;
    newShort: string;
    noPermits: string;
    noPermitsHint: string;
    applyPermit: string;
    applyNewPermit: string;
    decisionDue: string;
    noDecisionDate: string;
    noMessages: string;
    noMessagesHint: string;
    unread: string;
    nothingUnread: string;
    read: string;
    viaChannel: string;
    payments: string;
    paymentsIntro: string;
    toPay: string;
    nothingDue: string;
    caughtUp: string;
    due: string;
    paying: string;
    payWith: string;
    paymentHistory: string;
    noPayments: string;
    receiptHash: string;
    paymentFailed: string;
    verifyDocument: string;
    verifyIntro: string;
    documentCode: string;
    checking: string;
    verify: string;
    valid: string;
    revoked: string;
    notValid: string;
    subject: string;
    issuer: string;
    type: string;
    issued: string;
    signDocument: string;
    signed: string;
    signedIntro: string;
    signature: string;
    signedAt: string;
    hash: string;
    documentId: string;
    signExplain: string;
    continueToSign: string;
    confirmSignature: string;
    twoFactors: string;
    faceVerified: string;
    lookCamera: string;
    keyVerified: string;
    tapKey: string;
    bothRequired: string;
    signing: string;
    sign: string;
    newIntro: string;
    permitType: string;
    business: string;
    building: string;
    marketStall: string;
    event: string;
    foodHandling: string;
    vehicle: string;
    whatFor: string;
    whatForHint: string;
    applicantName: string;
    municipalityLabel: string;
    premises: string;
    premisesHint: string;
    anythingKnow: string;
    plainLanguage: string;
    submitting: string;
    submitApplication: string;
    otherChannels: string;
    somethingWrong: string;
  };
  /** Wallet records, identity and receipts pages. */
  records: {
    identity: string;
    born: string;
    civicIdActive: string;
    showSelectively: string;
    howDisclosure: string;
    discloseOnly: string;
    over18: string;
    resident: string;
    licensedNurse: string;
    disclosureExplain: string;
    credentials: string;
    health: string;
    shareClinician: string;
    shareCode: string;
    whoLooked: string;
    allLogged: string;
    withConsent: string;
    showLess: string;
    showFullLog: string;
    digitalIdentity: string;
    municipality: string;
    statusActive: string;
    intro: string;
    introNot: string;
    shareDetails: string;
    howThisWorks: string;
    how1: string;
    how2: string;
    how3: string;
    how4: string;
    everythingState: string;
  };
  /** Wallet services: life situations, ministries and work in progress. */
  services: {
    search: string;
    placeholder: string;
    lifeSituations: string;
    noMatch: string;
    byMinistry: string;
    allMinistries: string;
    inProgress: string;
    progressGrant: string;
    progressTransfer: string;
    childTitle: string;
    childSub: string;
    schoolTitle: string;
    schoolSub: string;
    lossTitle: string;
    lossSub: string;
    businessTitle: string;
    businessSub: string;
    movingTitle: string;
    movingSub: string;
    olderTitle: string;
    olderSub: string;
    registerBirth: string;
    applyChildGrant: string;
    bookVaccinations: string;
    schoolEnrolment: string;
    requestTransfer: string;
    registerDeath: string;
    bereavementSupport: string;
    applyPermit: string;
    taxRegistration: string;
    changeAddress: string;
    transferUtilities: string;
    pensionServices: string;
    healthcareAccess: string;
    health: string;
    education: string;
    socialProtection: string;
    taxRevenue: string;
    landProperty: string;
    justice: string;
  };
  /** Wallet home: actions, to-dos and the sample receipts. */
  home: {
    walletName: string;
    doSomething: string;
    permits: string;
    payBill: string;
    identity: string;
    verifyDoc: string;
    sign: string;
    confirmAddress: string;
    confirmAddressHint: string;
    reviewTax: string;
    reviewTaxHint: string;
    today: string;
    yesterday: string;
    childGrant: string;
    healthUpdated: string;
    vaccination: string;
    taxDraftReady: string;
    noSignatureYet: string;
    signedBy: string;
    aiClass: string;
  };
}

export const en: Messages = {
  common: {
    home: 'Home',
    services: 'Services',
    inbox: 'Inbox',
    records: 'Records',
    assistant: 'Assistant',
    back: 'Back',
    cancel: 'Cancel',
    submit: 'Submit',
    save: 'Save',
    close: 'Close',
    next: 'Next',
    learnMore: 'Learn more',
    talkToAgent: 'Talk to an agent',
    talkToHuman: 'Talk to a human officer',
  },
  wallet: {
    greeting: 'Good morning, {name}.',
    needsTo: 'You need to',
    receipts: 'Receipts',
    showAllReceipts: 'Show all receipts',
    accessHint: 'Today, {count} people looked at your records. All for the medical visit you booked.',
    seeWhoAndWhy: 'See who and why',
  },
  receipt: {
    title: 'Receipt',
    whatHappened: 'What happened',
    whyThisAmount: 'Why this amount',
    wasAIInvolved: 'Was AI involved?',
    ifSomethingWrong: "If something's wrong",
    questionThis: 'Question this decision',
    submitComplaint: 'Submit a complaint',
    proof: 'Proof',
    verifySignature: 'Verify signature',
    continuationGuarantee: 'If you contest, your payment continues while we review. You will not be punished for contesting.',
  },
  contest: {
    headline: 'Question this decision',
    pickWhat: 'What do you want to do?',
    optionAsk: 'Ask a question',
    optionContest: 'Contest the decision',
    optionComplaint: 'Submit a complaint',
    pickWhy: 'Why?',
    reasonAmount: 'The amount is wrong',
    reasonUnclear: "I'm not sure why this was decided",
    reasonDisagree: 'I disagree with the decision',
    noteLabel: 'Anything you want to tell us? (optional)',
    submitted: 'Submitted',
    caseOpened: 'Case {caseId} opened for receipt {receiptId}.',
    paymentContinues: 'Your payment continues while we review. We will let you know within 5 working days.',
  },
  assistant: {
    classANotice: 'I help you find information. I will not draft binding decisions here. For decisions, return to the case panel or talk to a human officer.',
    sources: 'Sources I used',
  },
  doctrine: {
    fourSentences: 'Humans govern. Institutions govern. Constitutions govern. AI assists.',
  },
  home: {
    walletName: 'Civic Wallet',
    doSomething: 'Do something',
    permits: 'Permits',
    payBill: 'Pay a bill',
    identity: 'Identity',
    verifyDoc: 'Verify a doc',
    sign: 'Sign',
    confirmAddress: 'Confirm your address',
    confirmAddressHint: 'for the school transfer — about 2 minutes',
    reviewTax: 'Review your tax draft',
    reviewTaxHint: 'due in {days} days',
    today: 'Today',
    yesterday: 'Yesterday',
    childGrant: 'Child grant deposited',
    healthUpdated: 'Health record updated',
    vaccination: 'vaccination (pneumococcal)',
    taxDraftReady: 'Tax draft {year} ready for review',
    noSignatureYet: 'no signature needed yet',
    signedBy: 'Signed by {name}',
    aiClass: 'AI: Class {cls}',
  },
  services: {
    search: 'Search services',
    placeholder: 'What do you need?',
    lifeSituations: 'Life situations',
    noMatch: 'No matching services.',
    byMinistry: 'By ministry',
    allMinistries: 'All ministries ({count})',
    inProgress: 'In progress',
    progressGrant: 'Child grant renewal — under review',
    progressTransfer: 'School transfer — waiting on the new school',
    childTitle: 'Having a child',
    childSub: 'birth registration, child grant, vaccinations',
    schoolTitle: 'Going to school',
    schoolSub: 'enrollment, transfer, feeding',
    lossTitle: 'Lost a family member',
    lossSub: 'death registration, estate, support',
    businessTitle: 'Starting a business',
    businessSub: 'permits, registration, tax',
    movingTitle: 'Moving house',
    movingSub: 'address change, utilities',
    olderTitle: 'Older adult support',
    olderSub: 'pension, healthcare, accommodations',
    registerBirth: 'Register a birth',
    applyChildGrant: 'Apply for child grant',
    bookVaccinations: 'Book vaccinations',
    schoolEnrolment: 'School enrolment',
    requestTransfer: 'Request a transfer',
    registerDeath: 'Register a death',
    bereavementSupport: 'Bereavement support',
    applyPermit: 'Apply for a permit',
    taxRegistration: 'Tax registration',
    changeAddress: 'Change of address',
    transferUtilities: 'Transfer utilities',
    pensionServices: 'Pension services',
    healthcareAccess: 'Healthcare access',
    health: 'Health',
    education: 'Education',
    socialProtection: 'Social protection',
    taxRevenue: 'Tax and revenue',
    landProperty: 'Land and property',
    justice: 'Justice and legal aid',
  },
  records: {
    identity: 'Identity',
    born: 'Born {date} ({place})',
    civicIdActive: 'CivicID active',
    showSelectively: 'Show selectively',
    howDisclosure: 'How selective disclosure works',
    discloseOnly: "Disclose only what's asked",
    over18: 'Over 18 — yes (date of birth stays hidden)',
    resident: 'Resident of {place} — yes (address stays hidden)',
    licensedNurse: 'Licensed nurse — yes (license number stays hidden)',
    disclosureExplain: 'Selective disclosure proves a fact (e.g. “over 18”) without revealing the underlying data. The verifier sees only the answer, signed by the state — never your full record.',
    credentials: 'Credentials',
    health: 'Health',
    shareClinician: 'Share with a clinician',
    shareCode: 'One-time share code {code} — valid 15 minutes, read-only, logged below when used.',
    whoLooked: 'Who has looked at my records?',
    allLogged: 'All access is logged. You see who, when, and why.',
    withConsent: 'With your consent',
    showLess: 'Show less',
    showFullLog: 'Show full access log ({count}) →',
    digitalIdentity: 'Digital identity',
    municipality: 'Municipality: {place}',
    statusActive: 'Status: active',
    intro: 'Your identity is yours. When a service asks for your details, you choose exactly what to share — and you can see what you are {not} sharing. There is no global ID number that follows you everywhere.',
    introNot: 'not',
    shareDetails: 'Share your details',
    howThisWorks: 'How this works',
    how1: 'Each service gets a different identifier — they cannot link you across services.',
    how2: 'You approve every disclosure, one at a time.',
    how3: 'You can revoke a disclosure later.',
    how4: 'Every disclosure appears in your records access log.',
    everythingState: 'Everything the state has on you',
  },
  pages: {
    permits: 'Permits',
    newShort: '+ New',
    noPermits: 'No permits yet',
    noPermitsHint: 'Apply for a permit and track its progress here.',
    applyPermit: 'Apply for a permit',
    applyNewPermit: 'Apply for a new permit',
    decisionDue: 'decision due {date}',
    noDecisionDate: 'no decision date yet',
    noMessages: 'No messages',
    noMessagesHint: 'Notifications from the state appear here.',
    unread: 'Unread',
    nothingUnread: 'Nothing unread.',
    read: 'Read',
    viaChannel: 'via {channel}',
    payments: 'Payments',
    paymentsIntro: 'Pay bills and fees here. Every payment gives you a receipt you can verify. We show the full amount and the rail before you pay — no hidden fees.',
    toPay: 'To pay',
    nothingDue: 'Nothing due',
    caughtUp: "You're all caught up.",
    due: 'Due {date}',
    paying: 'Paying…',
    payWith: 'Pay with {rail}',
    paymentHistory: 'Payment history',
    noPayments: 'No payments yet',
    receiptHash: 'Receipt hash:',
    paymentFailed: 'Payment failed',
    verifyDocument: 'Verify a document',
    verifyIntro: 'Paste or scan a document code to check it was really issued by the state and has not been altered. Try {valid} (valid), {revoked} (revoked), or anything else (invalid).',
    documentCode: 'Document code',
    checking: 'Checking…',
    verify: 'Verify',
    valid: '✓ Valid',
    revoked: 'Revoked',
    notValid: 'Not valid',
    subject: 'Subject',
    issuer: 'Issuer',
    type: 'Type',
    issued: 'Issued',
    signDocument: 'Sign a document',
    signed: 'Signed',
    signedIntro: 'You signed {title}. This signature is non-repudiable and recorded to the Audit Vault.',
    signature: 'Signature',
    signedAt: 'Signed at',
    hash: 'Hash',
    documentId: 'Document {id}',
    signExplain: 'By signing, you confirm the fire-safety annex is accurate and submit it to your bakery permit application.',
    continueToSign: 'Continue to sign',
    confirmSignature: 'Confirm your signature',
    twoFactors: 'Two factors keep your signature yours. Your biometric never leaves this device.',
    faceVerified: '✓ Face verified',
    lookCamera: '👤 Look at the camera',
    keyVerified: '✓ Key verified',
    tapKey: '🔑 Tap your security key',
    bothRequired: 'Both factors are required before you can sign.',
    signing: 'Signing…',
    sign: 'Sign',
    newIntro: 'Tell us what you need. You will get a receipt, a named officer, and a target decision date. You can track this any time and question any decision.',
    permitType: 'Permit type',
    business: 'Business permit',
    building: 'Building permit',
    marketStall: 'Market stall licence',
    event: 'Public event permit',
    foodHandling: 'Food handling permit',
    vehicle: 'Vehicle permit',
    whatFor: 'What is this for?',
    whatForHint: 'e.g. Bakery — small business permit',
    applicantName: 'Applicant name',
    municipalityLabel: 'Municipality',
    premises: 'Premises / location',
    premisesHint: 'e.g. Plot 4423',
    anythingKnow: 'Anything we should know? (optional)',
    plainLanguage: 'In plain language…',
    submitting: 'Submitting…',
    submitApplication: 'Submit application',
    otherChannels: 'Prefer not to use a phone? Dial *civic#, visit any office, or ask an agent. The same application works on every channel.',
    somethingWrong: 'Something went wrong',
  },
  more: {
    draft: 'Draft',
    submitted: 'Submitted',
    inReview: 'In review',
    needsInfo: 'Action needed',
    approved: 'Approved',
    declined: 'Declined',
    billPaid: 'Paid',
    billOverdue: 'Overdue',
    billDue: 'Due',
    fullName: 'Full name',
    over18: 'Over 18',
    dob: 'Date of birth',
    address: 'Address',
    nationalId: 'National ID number',
    vaccination: 'Pneumococcal vaccination',
    yes: 'Yes',
    nothingShared: 'Nothing shared',
    declinedText: 'You declined the request from {who}. No attributes were disclosed; the decline is noted in your access log.',
    sharedTitle: 'Shared',
    sharedText: 'You shared {n} of {total} requested attributes with {who} for this visit only. This is now in your records access log. You can revoke it later.',
    done: 'Done',
    askingText: '{who} is asking to verify the following, for the purpose of {purpose}, for {scope}:',
    purpose: 'scheduling a vaccination follow-up',
    scope: 'this visit only',
    chooseShare: 'Choose what to share',
    notShared: 'Not shared',
    shareN: 'Share {n} now',
    selectOne: 'Select at least one',
    revokeLater: 'You can revoke this later.',
    supportThread: 'Support thread',
    supportDesk: 'Citizen support desk',
    citizen: 'Citizen',
    supportTitle: 'Your conversation with the support desk',
    fromSubstrate: 'From the substrate',
  },
  detail: {
    notFoundPermit: 'Permit not found.',
    notFoundReceipt: 'Receipt not found.',
    officer: 'Officer {name}',
    actionNeeded: 'Action needed.',
    actionNeededText: 'The officer asked for more information. You can respond here, on paper at any office, or through an agent — whichever works for you.',
    details: 'Details',
    progress: 'Progress',
    aiPermit: 'An AI Copilot helped the reviewing officer by drafting a summary. {bold} The AI does not decide.',
    aiPermitBold: 'The officer signs every decision.',
    neverDelays: 'Questioning a decision never delays or penalises your application.',
    grantApproved: 'The Ministry of Social Protection approved your monthly child grant. Eligibility was verified by {officer}.',
    officerWithId: 'Officer {name} (ID {id})',
    total: 'Total: {amount}',
    aiReceipt: 'An AI Copilot helped Officer {name} by drafting an eligibility summary. {bold}',
    aiReceiptBold: 'The officer signed the decision.',
    aiNotDecide: 'The AI did not decide. The officer did.',
  },
};
