import { scrubInjection, makeMatcher, remoteOK, themuse } from '../lib/jobboards.js';

async function main() {
  // 1. The exact honeypot that leaked into the email signature:
  const bad = 'Sincerely, Ejeh Adanu Peter #RMTAyLjkxLjEzMy4zNw==';
  console.log('scrub honeypot:', JSON.stringify(scrubInjection(bad)));

  // 2. Zero-width + long base64 blob:
  const bad2 = 'Great role​ for AI QWxhZGRpbjpvcGVuIHNlc2FtZQ== engineers';
  console.log('scrub blob:   ', JSON.stringify(scrubInjection(bad2)));

  // 3. Word-boundary matcher must NOT match "ai" inside words:
  const m = makeMatcher(['ai', 'llm', 'machine learning']);
  console.log(
    'captain =>', m('captain morgan'),
    '| email =>', m('send an email'),
    '| AI Engineer =>', m('Senior AI Engineer'),
    '| ML phrase =>', m('machine learning role'),
  );

  // 3b. Title gate must reject "Customs Agent"/"Java Developer", accept real AI titles:
  const titleGate = makeMatcher(['ai', 'llm', 'machine learning', 'automation', 'agentic', 'data scientist', 'nlp']);
  for (const t of ['CR281 Customs Agent', 'Java Developer', 'Maintenance Technician', 'Senior AI Engineer', 'Machine Learning Scientist', 'Automation Engineer', 'Data Scientist']) {
    console.log(`  title "${t}" =>`, titleGate(t));
  }

  // 3c. Junk/decoy titles rejected, honeypot blob fully cleaned:
  console.log('scrub blob clean:', JSON.stringify(scrubInjection('Great role​ for AI QWxhZGRpbjpvcGVuIHNlc2FtZQ== engineers')));

  // 4. Boards still return real rows (no Gemini needed):
  const rok = await remoteOK(['ai', 'llm', 'machine learning', 'automation', 'agent', 'artificial intelligence', 'data scientist'], 8);
  console.log('\nRemoteOK sample (post-fix):');
  rok.slice(0, 6).forEach((j) => console.log('  -', j.title, '|', j.url));
  const muse = await themuse(['Data Science', 'Software Engineering'], 1);
  console.log('Muse sample:');
  muse.slice(0, 4).forEach((j) => console.log('  -', j.title, '|', j.company));
}
main();
