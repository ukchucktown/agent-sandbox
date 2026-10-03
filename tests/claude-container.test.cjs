const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const test = require('node:test');

const image = process.env.CLAUDE_SANDBOX_TEST_IMAGE;

function docker(args) {
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 120000 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
}

test('native Claude updates persist across container recreation', {
  skip: !image && 'Set CLAUDE_SANDBOX_TEST_IMAGE to a freshly built sandbox image',
}, t => {
  const volume = `sandbox-claude-test-${randomUUID()}`;
  docker(['volume', 'create', volume]);
  t.after(() => docker(['volume', 'rm', volume]));
  const run = (script, offline = true) => docker([
    'run', '--rm', ...(offline ? ['--network', 'none'] : []),
    '--mount', `type=volume,source=${volume},target=/home/agent`,
    '--env', 'HOME=/home/agent', '--entrypoint', 'bash', image, '-lc',
    'set -euo pipefail; chown agent:agent /home/agent; ' +
      'gosu agent env HOME=/home/agent initialize-claude; ' +
      'gosu agent env HOME=/home/agent bash -lc ' + "'" + script + "'",
  ]);

  const fresh = run('set -euo pipefail; test "$(command -v claude)" = "$HOME/.local/bin/claude"; claude doctor');
  assert.match(fresh, /Running: native/);
  assert.match(fresh, /Auto-updates: enabled/);
  assert.match(fresh, /Auto-update channel: latest/);
  assert.match(fresh, /No installation issues found/);

  const updated = run('set -euo pipefail; claude update; ' +
    'readlink "$HOME/.local/bin/claude" > "$HOME/claude-test-launcher"; ' +
    'sha256sum "$HOME/.local/bin/claude" > "$HOME/claude-test-checksum"; ' +
    'mkdir -p "$HOME/.claude"; printf "%s\\n" "{\\"autoUpdatesChannel\\":\\"latest\\"}" > "$HOME/.claude/settings.json"; ' +
    'cp "$HOME/.claude/settings.json" "$HOME/claude-test-settings"', false);
  assert.match(updated, /up to date|Successfully updated|successfully updated/i);

  const recreated = run('set -euo pipefail; ' +
    'test "$(readlink "$HOME/.local/bin/claude")" = "$(cat "$HOME/claude-test-launcher")"; ' +
    'sha256sum --check "$HOME/claude-test-checksum"; ' +
    'cmp "$HOME/.claude/settings.json" "$HOME/claude-test-settings"; claude doctor');
  assert.match(recreated, /Running: native/);
  assert.match(recreated, /No installation issues found/);
});
