import { z } from 'zod';
import type { RiskLevel } from './assessEvidence.ts';

export interface SafetyActionItem {
  id: string;
  type: 'DO_NOT' | 'VERIFICATION_STEP' | 'REMEDIATION_STEP' | 'OFFICIAL_REPORTING';
  title: string;
  description: string;
  priority: 'URGENT' | 'HIGH' | 'RECOMMENDED';
}

export interface OfficialReportingPortal {
  name: string;
  jurisdiction: string;
  url: string;
  purpose: string;
}

export interface SafetyPlanResult {
  riskLevel: RiskLevel;
  primaryDirective: string;
  actionItems: SafetyActionItem[];
  officialReportingPortals: OfficialReportingPortal[];
  disclaimer: string;
}

export const CreateSafetyPlanInputSchema = z.object({
  riskLevel: z.enum(['LOW', 'ELEVATED', 'HIGH', 'CRITICAL']),
  hasCredentialsExposed: z.boolean().default(false),
  hasPaymentDemanded: z.boolean().default(false),
  claimedOrganization: z.string().nullable().optional(),
});

export function createSafetyPlan(
  riskLevel: RiskLevel,
  hasCredentialsExposed: boolean,
  hasPaymentDemanded: boolean,
  claimedOrganization?: string | null
): SafetyPlanResult {
  const actionItems: SafetyActionItem[] = [];

  // Primary directive
  let primaryDirective = 'Exercise standard cyber hygiene and verify sender identity.';
  if (riskLevel === 'CRITICAL' || riskLevel === 'HIGH') {
    primaryDirective = 'DO NOT reply, click links, or provide financial/credential info. Disconnect communication immediately.';
  } else if (riskLevel === 'ELEVATED') {
    primaryDirective = 'Treat this communication as unverified. Independently corroborate with the claimed entity before taking any action.';
  }

  // 1. Immediate Prohibitions
  actionItems.push({
    id: 'act-1',
    type: 'DO_NOT',
    title: 'Never disclose One-Time Passwords (OTPs) or security PINs',
    description: 'No legitimate customer service agent, recruiter, or banking security officer will ever ask you to read back a verification code sent to your phone or email.',
    priority: 'URGENT'
  });

  if (hasPaymentDemanded || riskLevel === 'HIGH' || riskLevel === 'CRITICAL') {
    actionItems.push({
      id: 'act-2',
      type: 'DO_NOT',
      title: 'Do not transfer funds via non-reversible channels',
      description: 'Refuse requests to pay for job training, background checks, equipment, parcel release fees, or taxes via gift cards, wire transfer, Zelle, Venmo, or cryptocurrency.',
      priority: 'URGENT'
    });
  }

  // 2. Independent Verification Pathways
  const targetOrg = claimedOrganization || 'the organization';
  actionItems.push({
    id: 'act-3',
    type: 'VERIFICATION_STEP',
    title: `Independently verify with ${targetOrg}`,
    description: `Open a new browser tab and navigate directly to the verified official portal of ${targetOrg}. Use published customer support numbers or career portal listings, never phone numbers or links provided inside the suspicious message.`,
    priority: 'HIGH'
  });

  // 3. Remediation Steps (if user already interacted)
  if (hasCredentialsExposed || riskLevel === 'CRITICAL') {
    actionItems.push({
      id: 'act-4',
      type: 'REMEDIATION_STEP',
      title: 'Account compromise containment',
      description: 'If you have already entered login details or financial info on a linked site, immediately navigate to your genuine account from a clean device, change your password, sign out all active sessions, and contact your bank to freeze impacted cards.',
      priority: 'URGENT'
    });
  }

  // 4. Reporting Portals
  const officialReportingPortals: OfficialReportingPortal[] = [
    {
      name: 'FTC Report Fraud',
      jurisdiction: 'United States (Federal Trade Commission)',
      url: 'https://reportfraud.ftc.gov',
      purpose: 'Official federal reporting for consumer scams, fake jobs, and impersonation.'
    },
    {
      name: 'FBI Internet Crime Complaint Center (IC3)',
      jurisdiction: 'United States (Federal Bureau of Investigation)',
      url: 'https://www.ic3.gov',
      purpose: 'Reporting internet-facilitated crimes, wire fraud, ransomware, and identity theft.'
    },
    {
      name: 'Google Safe Browsing & Anti-Phishing',
      jurisdiction: 'Global Web Protection',
      url: 'https://safebrowsing.google.com/safebrowsing/report_phish/',
      purpose: 'Flag malicious URLs for automated browser protection worldwide.'
    },
    {
      name: 'Anti-Phishing Working Group (APWG)',
      jurisdiction: 'Global Cybersecurity Consortium',
      url: 'https://apwg.org/reportphishing/',
      purpose: 'Global clearinghouse for phishing URL analysis and takedown coordination.'
    }
  ];

  const disclaimer = 'ScamSentry AI provides educational risk analysis and defensive guidance based on observable heuristics. We are not a law enforcement agency or legal counsel. If you have suffered financial loss, file an official police and IC3 report immediately.';

  return {
    riskLevel,
    primaryDirective,
    actionItems,
    officialReportingPortals,
    disclaimer
  };
}
