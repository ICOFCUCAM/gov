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
};
