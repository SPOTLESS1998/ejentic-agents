// WHO THE JOB AGENT IS HUNTING FOR.
//
// A plain-English profile of the candidate. The agent feeds this to the LLM so
// it can judge whether a job genuinely fits — and draft an application email
// that speaks in the candidate's real voice and experience.
//
// The details themselves live in `profile/candidate.json`, which is GITIGNORED.
// That keeps your name, phone number and email out of the repo, and it means
// anyone can clone this and hunt for themselves by copying the template:
//
//     cp profile/candidate.example.json profile/candidate.json
//
// To update your profile later, edit that JSON file — not this one.

import { loadProfile } from './loadProfile.js';

export interface Candidate {
  name: string;
  email: string;
  phone: string;
  location: string;
  twitter: string;
  headline: string;
  preferences: {
    remote: boolean;
    locationPreference: string;
    employmentTypes: string[];
  };
  targetRoles: string[];
  strengths: string[];
  education: string;
  dealbreakers: string[];
}

export const CANDIDATE = loadProfile<Candidate>('candidate');

// A compact string version handed to the LLM (keeps the prompt small = cheaper).
export function candidateSummary(): string {
  const c = CANDIDATE;
  return [
    `Name: ${c.name} (${c.location}). ${c.headline}`,
    `Wants: ${c.preferences.employmentTypes.join(' or ')}, ${c.preferences.locationPreference}`,
    `Target roles: ${c.targetRoles.join(', ')}.`,
    `Strengths: ${c.strengths.join(' ')}`,
    `Education: ${c.education}`,
    `Dealbreakers: ${c.dealbreakers.join(' ')}`,
  ].join('\n');
}
