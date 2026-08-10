// Loads environment variables. Locally it reads your `.env` file (via dotenv);
// on GitHub Actions the variables come from repo secrets, which dotenv leaves
// untouched. Either way, the rest of the code just calls requireEnv()/optionalEnv().
import 'dotenv/config';

/** Get a required variable, or throw a clear error if it's missing. */
export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(
      `Missing required env var: ${name}. Add it to your .env file (local) or GitHub Actions secrets (cloud).`,
    );
  }
  return v.trim();
}

/** Get an optional variable, falling back to a default if unset. */
export function optionalEnv(name: string, fallback = ''): string {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : fallback;
}
