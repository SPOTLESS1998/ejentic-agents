// WHAT THE SCHOLARSHIP AGENT IS HUNTING FOR.
// Plain-English preferences fed to the AI so it can judge whether a scholarship
// genuinely fits — and skip the ones that don't. Edit freely as plans change.
//
// The applicant's name comes from profile/candidate.json (gitignored), so this
// file carries no personal details of its own.

import { CANDIDATE } from './candidate.js';

export const SCHOLAR = {
  applicant: CANDIDATE.name,
  nationality: 'Nigerian',
  level: "Master's (MSc)",

  // Fields of study to look for.
  fields: [
    'Machine Learning',
    'Artificial Intelligence',
    'Computational Linguistics',
    'Natural Language Processing',
    'Data Science',
    'Computer Science (AI focus)',
  ],

  // Where. Four destinations as of 2026-10-16 — Canada, the USA, New Zealand and
  // China — chosen because they are the countries that actually fund
  // international Master's students outright. China stays first: it has by far
  // the most fully-funded Master's places open to Nigerians, through CSC and the
  // university/provincial schemes. Canada and the USA mostly fund through the
  // university rather than a national award, and New Zealand through its
  // government scheme plus university awards.
  destinations:
    'PRIORITY DESTINATIONS: China (CSC Chinese Government Scholarship, university and provincial scholarships), USA (Fulbright Foreign Student Program, university graduate assistantships and fellowships), Canada (university-level funding packages for international Master\'s students) and New Zealand (UNIVERSITY awards only — the government Manaaki scheme does not accept Nigerians). ALSO welcome if genuinely open to a Nigerian applicant and fully funded: Europe, UK, Turkey and anywhere else.',

  // What makes one worth reporting.
  mustHave: [
    'Open to international students (Nigerian/African eligibility not excluded).',
    "Master's level (skip PhD-only and undergraduate-only).",
    'Fully funded — tuition plus a living stipend — or a substantial award close to it; say which honestly rather than rounding up.',
    'Relevant to the fields above, OR open across all fields.',
  ],

  // Hard skips.
  avoid: [
    'PhD-only or Bachelor-only scholarships.',
    'Scholarships that explicitly exclude African/Nigerian or non-EU students.',
    'Domestic-only national awards. Three that surface constantly and are NOT open to him: Canada Graduate Scholarships-Master\'s (CGS-M) is for Canadian citizens and permanent residents only; the Vanier CGS is doctoral; and Manaaki New Zealand Scholarships are open only to Pacific and a fixed list of Asian countries, with no African country eligible (verified 2026-10-16). A national award counts only if its own eligibility text names international students.',
    'Vague "apply here" aggregator pages with no actual named scholarship.',
    'Anything whose deadline has clearly already passed.',
  ],
};

// Compact string handed to the AI (keeps the prompt small = cheaper).
export function scholarSummary(): string {
  const s = SCHOLAR;
  return [
    `Applicant: ${s.applicant} (${s.nationality}), seeking a ${s.level}.`,
    `Fields: ${s.fields.join(', ')}.`,
    `Destinations: ${s.destinations}`,
    `Must have: ${s.mustHave.join(' ')}`,
    `Avoid: ${s.avoid.join(' ')}`,
  ].join('\n');
}
