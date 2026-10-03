const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const initializer = path.resolve(__dirname, '../scripts/initialize-claude.sh');

function fixture(t) {
  const directory = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'sandbox-claude-')));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const home = path.join(directory, 'home');
  const seed = path.join(directory, 'seed');
  fs.mkdirSync(home);
  fs.mkdirSync(seed);
  fs.writeFileSync(path.join(seed, 'version'), '1.2.3\n');
  fs.writeFileSync(path.join(seed, 'claude'), '#!/bin/sh\necho bundled\n', { mode: 0o755 });
  const run = () => spawnSync('bash', [initializer], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home, CLAUDE_SEED_DIRECTORY: seed },
  });
  return { home, seed, run, launcher: path.join(home, '.local/bin/claude') };
}

test('seeds a fresh Claude home without a download', t => {
  const { home, run, launcher } = fixture(t);
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.realpathSync(launcher), path.join(home, '.local/share/claude/versions/1.2.3'));
  assert.equal(spawnSync(launcher, { encoding: 'utf8' }).stdout.trim(), 'bundled');
  assert.equal(JSON.parse(fs.readFileSync(path.join(home, '.claude.json'), 'utf8')).installMethod, 'native');
});

test('preserves an updated Claude launcher and user settings across initialization', t => {
  const { home, seed, run, launcher } = fixture(t);
  assert.equal(run().status, 0);
  const updated = path.join(home, '.local/share/claude/versions/1.2.4');
  fs.writeFileSync(updated, '#!/bin/sh\necho updated\n', { mode: 0o755 });
  fs.unlinkSync(launcher);
  fs.symlinkSync(updated, launcher);
  const settings = path.join(home, '.claude');
  fs.mkdirSync(settings);
  fs.writeFileSync(path.join(settings, 'settings.json'), '{"hooks":{"custom":[]}}\n');
  fs.writeFileSync(path.join(home, '.claude.json'), JSON.stringify({ installMethod: 'npm-global', preference: 'preserve' }));
  fs.writeFileSync(path.join(seed, 'version'), '1.2.5\n');
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.realpathSync(launcher), updated);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(home, '.claude.json'), 'utf8')), { installMethod: 'native', preference: 'preserve' });
  assert.equal(fs.readFileSync(path.join(settings, 'settings.json'), 'utf8'), '{"hooks":{"custom":[]}}\n');
  assert.equal(spawnSync(launcher, { encoding: 'utf8' }).stdout.trim(), 'updated');
});

test('preserves a working Claude installation even when the image seed is unavailable', t => {
  const { seed, run, launcher } = fixture(t);
  assert.equal(run().status, 0);
  fs.rmSync(seed, { recursive: true });
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.equal(spawnSync(launcher, { encoding: 'utf8' }).stdout.trim(), 'bundled');
});
