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

  // Where. China is the priority (many fully-funded MSc scholarships open to
  // Nigerians), but strong global fully-funded options count too.
  destinations:
    'PRIORITY: China (e.g. CSC Chinese Government Scholarship, university & provincial scholarships). ALSO welcome: fully-funded scholarships anywhere open to Nigerian/African/international students (Europe, UK, Turkey, etc.).',

  // What makes one worth reporting.
  mustHave: [
    'Open to international students (Nigerian/African eligibility not excluded).',
    "Master's level (skip PhD-only and undergraduate-only).",
    'Fully funded or substantial funding (tuition + stipend) preferred; partial is OK if generous.',
    'Relevant to the fields above, OR open across all fields.',
  ],

  // Hard skips.
  avoid: [
    'PhD-only or Bachelor-only scholarships.',
    'Scholarships that explicitly exclude African/Nigerian or non-EU students.',
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
