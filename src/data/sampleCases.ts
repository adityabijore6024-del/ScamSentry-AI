export interface SampleTestCase {
  id: string;
  category: string;
  title: string;
  badge: string;
  messageText: string;
  url?: string;
  expectedRisk: 'CRITICAL' | 'HIGH' | 'ELEVATED' | 'LOW';
  keyFlags: string[];
}

export const SAMPLE_TEST_CASES: SampleTestCase[] = [
  {
    id: 'sample-internship',
    category: 'Student & Career Fraud',
    title: 'Google DeepMind Remote Research Internship Offer',
    badge: 'Fake Job Phishing',
    expectedRisk: 'CRITICAL',
    keyFlags: ['Telegram recruiter', 'Advance equipment fee', 'Domain mismatch'],
    url: 'https://careers-google-verify.xyz/login?session=apply',
    messageText: `Dear Candidate,

Congratulations! Based on your LinkedIn profile, the Google DeepMind Research Team has shortlisted you for a remote Machine Learning Research Assistant internship ($48/hr, 20 hrs/week).

To finalize your onboarding paperwork and receive your pre-configured Apple MacBook Pro M3 workstation, you must immediately connect with our Talent Coordinator on Telegram (@GoogleTalent_HR_Bot).

A refundable deposit of $150 is required via Zelle or Apple Gift Card to activate company equipment insurance before your start date. Complete your identity verification here:
https://careers-google-verify.xyz/login?session=apply

Failure to respond within 24 hours will forfeit your spot.`
  },
  {
    id: 'sample-amazon',
    category: 'E-Commerce & Impersonation',
    title: 'Amazon Prime Unauthorized Transaction Lockout',
    badge: 'Account Suspension Threat',
    expectedRisk: 'HIGH',
    keyFlags: ['Deceptive subdomain', 'Urgency pressure', 'Impersonation'],
    url: 'https://amazon.com.security-order-verification.click/portal',
    messageText: `Amazon Security Alert: We detected an unauthorized purchase of Sony OLED TV ($1,499.00) from an unrecognized device in Dallas, TX.

Your Prime account will be suspended within 2 hours unless you confirm this was you. If you did not make this purchase, verify your identity and cancel the transaction immediately:
https://amazon.com.security-order-verification.click/portal

Do not share this link with anyone.`
  },
  {
    id: 'sample-bank-otp',
    category: 'Financial Credential Harvesting',
    title: 'Chase Bank Suspicious Wire Transfer & OTP Stealer',
    badge: 'OTP & Credential Harvesting',
    expectedRisk: 'CRITICAL',
    keyFlags: ['OTP theft', 'Irreversible wire threat', 'Bank impersonation'],
    messageText: `Chase Fraud Prevention: A pending wire transfer of $4,850.00 to account **9412 is being processed.

To CANCEL this unauthorized transfer, reply immediately with the 6-digit One-Time Passcode (OTP) sent to your mobile phone.

Failure to provide the passcode within 15 minutes will release the funds to the recipient. Chase Fraud Dept: 1-800-555-0199.`
  },
  {
    id: 'sample-courier-customs',
    category: 'Delivery & Smishing',
    title: 'USPS / Postal Courier Clearance Duty Fee',
    badge: 'Package Delivery SMS',
    expectedRisk: 'HIGH',
    keyFlags: ['Lookalike domain', 'Small payment hook', 'Smishing'],
    url: 'http://usps-track-package-duty.top/pay',
    messageText: `USPS Delivery Notice: Your incoming package tracking #9400111899562849 has been placed on hold at our regional sorting facility due to an unpaid customs handling fee of $2.45.

Please update your delivery address and pay the fee online to resume dispatch:
http://usps-track-package-duty.top/pay

Parcels unclaimed within 48 hours will be returned to sender.`
  },
  {
    id: 'sample-crypto-job',
    category: 'Task Scams & Crypto',
    title: 'Daily Rating Tasks & USDT Cloud Staking Opportunity',
    badge: 'Crypto Task Scam',
    expectedRisk: 'HIGH',
    keyFlags: ['Crypto demand', 'Advance deposit', 'Unrealistic earnings'],
    messageText: `Hi! Are you looking for a flexible part-time online job?
Earn $300-$800 daily by simply rating hotel apps and completing data optimization tasks for 30 minutes a day!

No experience necessary. We pay daily via USDT (Tether). To unlock your VIP task account and receive your $50 signup bonus, send 30 USDT to our contract wallet for gas activation.
Contact our manager on WhatsApp: +1-202-555-0182.`
  }
];
