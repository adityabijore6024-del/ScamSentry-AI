import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import crypto from 'node:crypto';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Run the integration tests against a real local server. Share one random test-only
// credential between server and test process; never use this generated value in production.
process.env.PORT ||= '3000';
process.env.SCAMSENTRY_AUTH_TOKEN ||= `test_${crypto.randomBytes(32).toString('hex')}`;
process.env.NODE_ENV = 'test';
const env = { ...process.env };
const server = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
  env,
  stdio: ['ignore', 'inherit', 'inherit'],
  windowsHide: true,
});
let serverReady = false;
try {
  for (let i = 0; i < 80; i++) {
    if (server.exitCode !== null) throw new Error(`Server exited before becoming ready (code ${server.exitCode}).`);
    try {
      const response = await fetch(`http://127.0.0.1:${process.env.PORT}/api/health`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) { serverReady = true; break; }
    } catch {}
    await delay(250);
  }
  if (!serverReady) throw new Error('Server did not become healthy at http://127.0.0.1:3000/api/health.');

  // Expand test files in Node rather than relying on shell glob expansion. This works
  // on Windows paths (including directories containing spaces) and POSIX systems.
  const testDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../test');
  const testFiles = readdirSync(testDir)
    .filter((name) => name.endsWith('.test.ts'))
    .sort()
    .map((name) => path.join(testDir, name));
  if (testFiles.length === 0) throw new Error(`No test files found in ${testDir}`);
  const tests = spawn(process.execPath, ['--test', '--import', 'tsx', ...testFiles], {
    env,
    stdio: 'inherit',
    windowsHide: true,
  });
  const code = await new Promise((resolve, reject) => {
    tests.once('error', reject);
    tests.once('exit', (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
  process.exitCode = code;
} catch (error) {
  console.error('[test-runner]', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([new Promise(resolve => server.once('exit', resolve)), delay(3000)]);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
}
