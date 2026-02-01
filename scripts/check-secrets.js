// Scans staged files for common secret patterns and fails if found.
const { execSync } = require('child_process');
const fs = require('fs');

try {
  const names = execSync('git diff --staged --name-only', { encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  if (names.length === 0) process.exit(0);
  const patterns = [/\bsk-[A-Za-z0-9]{24,}\b/, /OPENAI_API_KEY/, /-----BEGIN PRIVATE KEY-----/i, /AKIA[0-9A-Z]{16}/];
  let found = false;
  for (const name of names) {
    if (!fs.existsSync(name)) continue;
    const content = fs.readFileSync(name, 'utf8');
    for (const p of patterns) {
      if (p.test(content)) {
        console.error(`Potential secret detected in ${name}: pattern ${p}`);
        found = true;
      }
    }
  }
  if (found) {
    console.error('\nSecrets detected in staged files. Remove them before committing.');
    process.exit(1);
  }
  process.exit(0);
} catch (err) {
  console.error('Secret check failed', err.message);
  process.exit(1);
}