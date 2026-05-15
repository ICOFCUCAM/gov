// Kiswahili — translations to be reviewed by sovereign-validated terminology
// committee + People's Editor (Companion 148 §8). Skeleton provided.
import type { Messages } from './en';

export const sw: Messages = {
  common: {
    home: 'Mwanzo',
    services: 'Huduma',
    inbox: 'Sanduku',
    records: 'Kumbukumbu',
    assistant: 'Msaidizi',
    back: 'Rudi',
    cancel: 'Ghairi',
    submit: 'Wasilisha',
    save: 'Hifadhi',
    close: 'Funga',
    next: 'Endelea',
    learnMore: 'Jifunze zaidi',
    talkToAgent: 'Ongea na wakala',
    talkToHuman: 'Ongea na afisa wa binadamu',
  },
  wallet: {
    greeting: 'Habari ya asubuhi, {name}.',
    needsTo: 'Unahitaji ku',
    receipts: 'Stakabadhi',
    showAllReceipts: 'Onyesha stakabadhi zote',
    accessHint: 'Leo, watu {count} wameangalia kumbukumbu zako. Wote kwa ajili ya ziara yako ya matibabu.',
    seeWhoAndWhy: 'Tazama nani na kwa nini',
  },
  receipt: {
    title: 'Stakabadhi',
    whatHappened: 'Nini kilichotokea',
    whyThisAmount: 'Kwa nini kiasi hiki',
    wasAIInvolved: 'Je, AI ilihusika?',
    ifSomethingWrong: 'Iwapo kuna kasoro',
    questionThis: 'Hoji uamuzi huu',
    submitComplaint: 'Wasilisha malalamiko',
    proof: 'Uthibitisho',
    verifySignature: 'Thibitisha saini',
    continuationGuarantee: 'Ukihoji, malipo yako yataendelea wakati tukikagua. Hutaadhibiwa kwa kuhoji.',
  },
  contest: {
    headline: 'Hoji uamuzi huu',
    pickWhat: 'Unataka kufanya nini?',
    optionAsk: 'Uliza swali',
    optionContest: 'Hoji uamuzi',
    optionComplaint: 'Wasilisha malalamiko',
    pickWhy: 'Kwa nini?',
    reasonAmount: 'Kiasi si sahihi',
    reasonUnclear: 'Sielewi sababu ya uamuzi huu',
    reasonDisagree: 'Sikubaliani na uamuzi',
    noteLabel: 'Kuna kitu unataka kutuambia? (hiari)',
    submitted: 'Imewasilishwa',
    caseOpened: 'Kesi {caseId} imefunguliwa kwa stakabadhi {receiptId}.',
    paymentContinues: 'Malipo yako yataendelea wakati tukikagua. Tutakujulisha ndani ya siku 5 za kazi.',
  },
  assistant: {
    classANotice: 'Ninakusaidia kupata maelezo. Sitatoa uamuzi rasmi hapa. Kwa uamuzi, rudi kwenye paneli ya kesi au ongea na afisa.',
    sources: 'Vyanzo nilivyotumia',
  },
  doctrine: {
    fourSentences: 'Binadamu wanatawala. Taasisi zinatawala. Katiba zinatawala. AI husaidia.',
  },
};
