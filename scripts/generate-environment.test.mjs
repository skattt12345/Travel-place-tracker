import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

async function setup(t) {
  const root = await mkdtemp(join(tmpdir(), 'travel-environment-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'scripts'));
  const script = join(root, 'scripts/generate-environment.mjs');
  await copyFile(new URL('./generate-environment.mjs', import.meta.url), script);
  const destination = join(root, 'src/environments/environment.ts');

  return {
    destination,
    run(apiKey) {
      const env = { ...process.env };
      delete env.GEOAPIFY_API_KEY;
      if (apiKey !== undefined) env.GEOAPIFY_API_KEY = apiKey;
      return spawnSync(process.execPath, [script], { env, encoding: 'utf8' });
    },
  };
}

test('missing key fails clearly without creating an environment file', async (t) => {
  const { run, destination } = await setup(t);
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /GEOAPIFY_API_KEY is required/);
  await assert.rejects(readFile(destination), { code: 'ENOENT' });
});

test('blank key leaves an existing environment file unchanged', async (t) => {
  const { run, destination } = await setup(t);
  await mkdir(join(destination, '..'), { recursive: true });
  await writeFile(destination, 'existing local configuration');
  const result = run('   ');
  assert.equal(result.status, 1);
  assert.equal(await readFile(destination, 'utf8'), 'existing local configuration');
});

test('generates escaped configuration without logging the supplied key', async (t) => {
  const { run, destination } = await setup(t);
  const apiKey = 'test-only-key"\\\n';
  const result = run(apiKey);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
  const source = await readFile(destination, 'utf8');
  const { environment } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
  assert.deepEqual(environment, {
    geoapify: { apiKey, baseUrl: 'https://api.geoapify.com' },
  });
});
