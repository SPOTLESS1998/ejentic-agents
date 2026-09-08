// WHAT THE AGENCY SELLS.
// Used two ways:
//   1. The Job agent's LEAD hunt: find businesses that need these services, and
//      draft a cold pitch offering them.
//   2. The content agent's brand voice (src/context/brand.ts imports the
//      services list from here rather than keeping its own copy).
//
// The details live in `profile/company.json`, which is GITIGNORED — it holds a
// real contact email, so it stays out of the repo. Copy the template to start:
//
//     cp profile/company.example.json profile/company.json
//
// Edit that JSON as the offering evolves. `services` is THE SINGLE SOURCE OF
// TRUTH for what we sell: brand.ts used to keep a second hand-written copy and
// the two silently drifted until not one entry matched — the job agent hunted
// customers for one menu while the content agent advertised a different one to
// the public. Edit the JSON and both agents follow.

import { loadProfile } from './loadProfile.js';

export interface Company {
  name: string;
  tagline: string;
  founder: string;
  contactEmail: string;
  industries: string[];
  services: string[];
  idealCustomerSignals: string[];
  targetSegments: string;
}

export const EJENTIC = loadProfile<Company>('company');

export function ejenticSummary(): string {
  const e = EJENTIC;
  return [
    `${e.name}: ${e.tagline}`,
    `Industries: ${e.industries.join(', ')}.`,
    `Services offered: ${e.services.join(' ')}`,
    `Ideal customer signals: ${e.idealCustomerSignals.join(' ')}`,
    `Priority segments: ${e.targetSegments}`,
  ].join('\n');
}
