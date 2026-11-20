// Vice Sunset Cover Studio (gta6-cover-art-01) — the hand-in program.
//
// Node 22, standard library only. It takes the entry's app/ folder (plain
// static files a desktop browser loads offline) and its screenshots/ folder,
// copies both into the grader's output directory, and writes
// dossier.json there with the vendored make.fun library, so the judge can
// read the app's source and screenshots.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Inside the grader MAKEFUN_OUTPUT_DIR is unset and /output is used.
// Both runs must write the same bytes, so this program writes nothing
// else and never reads the clock or the network.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(name) {
  const from = join(here, name);
  const to = join(out, name);
  if (!existsSync(from)) return 0;
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
  let count = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isFile()) count += 1;
      else if (entry.isDirectory()) walk(join(dir, entry.name));
    }
  };
  walk(to);
  return count;
}

mkdirSync(out, { recursive: true });
const appFiles = copyTree('app');
const shotFiles = copyTree('screenshots');

// The gate's caps for this bounty (RULES.txt, "The gate"): the dossier text
// is capped at 160 KiB, at most 4 screenshots of 256 KiB each, app/ at most
// 993 files and 48 MiB, and no path under app/ over 1000 bytes.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

const shotBytes = existsSync(join(out, 'screenshots'))
  ? readdirSync(join(out, 'screenshots')).reduce(
      (sum, f) => sum + statSync(join(out, 'screenshots', f)).size, 0)
  : 0;
console.log(
  `handed in ${appFiles} app files and ${shotFiles} screenshots ` +
  `(${shotBytes} bytes) with dossier.json (${dossier.length} bytes) to ${out}`,
);
