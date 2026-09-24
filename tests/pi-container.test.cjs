const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const image = process.env.AGENT_SANDBOX_TEST_IMAGE;

test("Pi loads the Moshi extension and preserves user settings", {
  skip: !image && "Set AGENT_SANDBOX_TEST_IMAGE to a freshly built sandbox image",
}, () => {
  const environment = fs.readFileSync(
    path.join(__dirname, "..", ".env.example"),
    "utf8",
  );
  const version = environment.match(/^PI_CLI_VERSION=(.+)$/m)[1];
  const result = spawnSync("docker", [
    "run", "--rm", "--network", "none", "--user", "agent",
    "--env", `EXPECTED_PI_VERSION=${version}`,
    "--env", "PI_OFFLINE=1",
    "--entrypoint", "bash", "-i", image, "-lc",
    "set -euo pipefail; " +
      'test "$(pi --version)" = "$EXPECTED_PI_VERSION"; ' +
      "if command -v copilot; then exit 1; fi; " +
      "moshi-hook install --target pi; node --input-type=module -",
  ], {
    encoding: "utf8",
    timeout: 60000,
    input: `
      import assert from "node:assert/strict";
      import fs from "node:fs";
      import path from "node:path";
      import { spawnSync } from "node:child_process";
      import { createAgentSession } from "/opt/agent-tools/node_modules/@earendil-works/pi-coding-agent/dist/index.js";

      const directory = path.join(process.env.HOME, ".pi", "agent");
      const settingsPath = path.join(directory, "settings.json");
      const settings = JSON.stringify({
        defaultProvider: "openai",
        defaultModel: "gpt-5.5",
        theme: "dark",
      });
      fs.writeFileSync(settingsPath, settings);
      const userExtension = path.join(directory, "extensions", "user-extension.ts");
      const userCode = 'export default function (pi) { pi.on("session_start", async () => {}); }';
      fs.writeFileSync(userExtension, userCode);

      const install = spawnSync("moshi-hook", ["install", "--target", "pi"], {
        encoding: "utf8",
        timeout: 10000,
      });
      assert.equal(install.status, 0, install.stderr);
      assert.equal(fs.readFileSync(settingsPath, "utf8"), settings);
      assert.equal(fs.readFileSync(userExtension, "utf8"), userCode);

      const { session, extensionsResult } = await createAgentSession();
      try {
        assert.deepEqual(extensionsResult.errors, []);
        const moshi = extensionsResult.extensions.filter(
          extension => extension.resolvedPath === path.join(directory, "extensions", "moshi-hooks.ts"),
        );
        assert.equal(moshi.length, 1);
        for (const event of ["session_start", "before_agent_start", "agent_settled", "session_shutdown"]) {
          assert.ok(moshi[0].handlers.has(event), "Missing Pi handler: " + event);
        }
        assert.ok(extensionsResult.extensions.some(extension => extension.resolvedPath === userExtension));
      } finally {
        session.dispose();
      }

      const models = spawnSync("pi", ["--offline", "--list-models", "github-copilot"], {
        encoding: "utf8",
        timeout: 15000,
        env: { ...process.env, COPILOT_GITHUB_TOKEN: "test-fixture-not-a-real-token" },
      });
      assert.equal(models.status, 0, models.stderr);
      assert.match(models.stdout, /github-copilot/);
    `,
  });

  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
