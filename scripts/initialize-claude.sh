#!/usr/bin/env bash

set -euo pipefail

seed_directory="${CLAUDE_SEED_DIRECTORY:-/opt/claude-seed}"
launcher="${HOME}/.local/bin/claude"

# An updated native installation takes precedence over the image's seed.
if [[ ! -x "${launcher}" ]]; then
  version=$(cat "${seed_directory}/version")
  versions="${HOME}/.local/share/claude/versions"
  install -d -m 0755 "${HOME}/.local/bin" "${versions}"
  install -m 0755 "${seed_directory}/claude" "${versions}/${version}"
  ln -sfn "${versions}/${version}" "${launcher}"
fi

# Record the install method without replacing existing preferences or hooks.
node - "${HOME}/.claude.json" <<'JS'
const fs = require("node:fs");
const path = process.argv[2];
const config = fs.existsSync(path) ? JSON.parse(fs.readFileSync(path, "utf8")) : {};
if (config.installMethod !== "native") {
  config.installMethod = "native";
  const temporary = `${path}.native-install-${process.pid}`;
  fs.writeFileSync(temporary, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(temporary, path);
}
JS
