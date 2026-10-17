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
};
