// LOADS YOUR PRIVATE PROFILE FILES.
//
// The agents need real details about you and your company — your name, email,
// what you sell — but those must never be committed. So they live in
// `profile/*.json`, which is gitignored, and only `profile/*.example.json`
// templates are tracked.
//
// This is the same pattern the lead-generation-system uses for its per-client
// config: a `_template` in git, the real thing on disk only.
//
// If the real file is missing we THROW rather than fall back to the template.
// Falling back would be worse than crashing: the agent would happily email a
// real employer signed "Your Full Name".

import { readFileSync, existsSync } from 'node:fs';

export function loadProfile<T>(name: string): T {
  const real = new URL(`../../profile/${name}.json`, import.meta.url);
  const template = `profile/${name}.example.json`;

  if (!existsSync(real)) {
    throw new Error(
      `Missing profile/${name}.json — the agents cannot run without it.\n` +
      `  Fix:  cp ${template} profile/${name}.json   then edit in your real details.\n` +
      `  (profile/${name}.json is gitignored on purpose, so it never reaches GitHub.)`
    );
  }

  try {
    return JSON.parse(readFileSync(real, 'utf8')) as T;
  } catch (err) {
    throw new Error(
      `profile/${name}.json is not valid JSON: ${(err as Error).message}\n` +
      `  Compare it against ${template}.`
    );
  }
}
