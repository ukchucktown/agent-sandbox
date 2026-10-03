const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const image = process.env.FD_SANDBOX_TEST_IMAGE;

test("Pi file search respects ignores outside a Git repository", {
  skip: !image && "Set FD_SANDBOX_TEST_IMAGE to a sandbox image with the fd update",
}, () => {
  const environment = fs.readFileSync(path.join(__dirname, "..", ".env.example"), "utf8");
  const version = environment.match(/^FD_VERSION=(.+)$/m)[1];
  const result = spawnSync("docker", [
    "run", "--rm", "--network", "none", "--user", "agent",
    "--env", `EXPECTED_FD_VERSION=${version}`,
    "--env", "PI_OFFLINE=1", "--entrypoint", "node", "-i", image,
    "--input-type=module", "-",
  ], {
    encoding: "utf8",
    timeout: 30000,
    input: `
      import assert from "node:assert/strict";
      import fs from "node:fs";
      import os from "node:os";
      import path from "node:path";
      import { spawnSync } from "node:child_process";
      import { createFindTool } from "/opt/agent-tools/node_modules/@earendil-works/pi-coding-agent/dist/index.js";

      const installed = spawnSync("fd", ["--version"], { encoding: "utf8" });
      assert.equal(installed.status, 0, installed.stderr);
      assert.equal(installed.stdout.trim(), "fd " + process.env.EXPECTED_FD_VERSION);
      const directory = fs.mkdtempSync(path.join(os.tmpdir(), "pi-fd-"));
      fs.mkdirSync(path.join(directory, ".hidden"));
      fs.writeFileSync(path.join(directory, ".gitignore"), "ignored.txt\\n");
      fs.writeFileSync(path.join(directory, "ignored.txt"), "fixture");
      fs.writeFileSync(path.join(directory, "visible.txt"), "fixture");
      fs.writeFileSync(path.join(directory, ".hidden", "nested.txt"), "fixture");
      const found = await createFindTool(directory).execute("fd-regression", { pattern: "*.txt", path: directory });
      const output = found.content.filter(block => block.type === "text").map(block => block.text).join("\\n");
      assert.match(output, /visible\\.txt/);
      assert.doesNotMatch(output, /ignored\\.txt/);
      assert.match(output, /\\.hidden\\/nested\\.txt/);
    `,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
