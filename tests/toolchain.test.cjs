const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const repository = path.resolve(__dirname, "..");
const dockerfile = fs.readFileSync(
  path.join(repository, "Dockerfile"),
  "utf8",
);
const compose = fs.readFileSync(
  path.join(repository, "compose.yaml"),
  "utf8",
);

test("builds the development toolchain into the sandbox image", () => {
  for (const expected of [
    "PYTHON_VERSION",
    "UV_VERSION",
    "JAVA_VERSION",
    "MAVEN_VERSION",
    "RUST_VERSION",
    "GH_VERSION",
    "NEOVIM_VERSION",
    "NEOVIM_SHA256_AMD64",
    "NEOVIM_SHA256_ARM64",
    "TMUX_VERSION",
    "TMUX_SHA256",
    "STARSHIP_VERSION",
    "STARSHIP_SHA256_AMD64",
    "STARSHIP_SHA256_ARM64",
    "TREE_SITTER_CLI_VERSION",
    "C8CTL_VERSION",
    "CODEX_CLI_VERSION",
    "EZA_VERSION",
    "ZOXIDE_VERSION",
    "@camunda8/cli@${C8CTL_VERSION}",
    "cargo install",
    "--no-default-features",
    "tree-sitter-cli",
    "mosh",
    "corepack enable pnpm",
    "nvim-linux-${neovim_arch}.tar.gz",
    "tmux-${TMUX_VERSION}.tar.gz",
    "starship-${starship_arch}-unknown-linux-musl.tar.gz",
    "sha256sum --check --strict",
    "fzf",
    "tree",
    "bat",
  ]) {
    assert.match(dockerfile, new RegExp(escapeRegex(expected)));
  }
});

test("publishes a configurable Mosh UDP range", () => {
  assert.match(dockerfile, /EXPOSE 22\/tcp 60000-60010\/udp/);
  assert.match(compose, /MOSH_UDP_PORT_RANGE:-60000-60010/);
  assert.match(compose, /\/udp/);
});

test("uses a Codex CLI pin that cannot collide with the Codex session version", () => {
  assert.match(dockerfile, /@openai\/codex@\$\{CODEX_CLI_VERSION\}/);
  assert.match(compose, /CODEX_CLI_VERSION: \$\{CODEX_CLI_VERSION\}/);
  assert.doesNotMatch(compose, /\bCODEX_VERSION\b/);
});

test("replaces Copilot CLI with a pinned Pi harness as the agent user", () => {
  const environment = fs.readFileSync(
    path.join(repository, ".env.example"),
    "utf8",
  );

  assert.match(environment, /^PI_CLI_VERSION=\d+\.\d+\.\d+$/m);
  assert.match(dockerfile, /^ARG PI_CLI_VERSION$/m);
  assert.match(
    dockerfile,
    /USER agent\s+RUN npm install(?:(?!USER root)[\s\S])*"@earendil-works\/pi-coding-agent@\$\{PI_CLI_VERSION:\?PI_CLI_VERSION is required\}"/,
  );
  assert.match(
    dockerfile,
    /ln -s \/opt\/agent-tools\/node_modules\/\.bin\/pi \/usr\/local\/bin\/pi/,
  );
  assert.match(
    compose,
    /PI_CLI_VERSION: \$\{PI_CLI_VERSION:\?Set PI_CLI_VERSION in your environment file \(see \.env\.example\)\}/,
  );
  assert.doesNotMatch(dockerfile, /@github\/copilot|COPILOT_CLI_VERSION/);
  assert.doesNotMatch(compose, /COPILOT_CLI_VERSION/);
  assert.doesNotMatch(environment, /COPILOT_CLI_VERSION/);
});

test("does not grant the sandbox Docker daemon access", () => {
  assert.doesNotMatch(dockerfile, /docker\.sock|docker-cli|docker-ce-cli/);
  assert.doesNotMatch(compose, /docker\.sock/);
});

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
