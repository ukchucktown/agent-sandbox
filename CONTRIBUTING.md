# Contributing

Thanks for helping make Agent Sandbox safer, more portable, and easier to use.

## Design boundaries

Changes should preserve the project's core safety properties:

- No Docker socket, host home directory, SSH configuration, or credential-store
  mounts.
- No privileged container mode.
- Bind mounts remain explicit and validated; read-only is preferred.
- SSH remains key-only, with remote reachability enabled deliberately.
- Credentials and agent state stay in ignored files or named volumes.
- Tool versions remain pinned and upgrades remain intentional.

Open an issue before changing one of these boundaries or adding a major
toolchain. Explain the use case, required host access, and safer alternatives
that were considered.

## Validate a change

Run the repository tests and syntax checks:

```bash
node --test tests/*.test.cjs
bash -n sandbox entrypoint.sh healthcheck.sh
zsh -n shell/zshrc shell/aliases.zsh shell/fzf.zsh
docker compose --env-file .env.example config --quiet
```

If the Dockerfile or runtime behavior changed, also build a fresh image and run
`./sandbox status`. Exercise mount changes with temporary directories that do
not contain personal files.

After a fresh image build, verify the Pi and Moshi integration:

```bash
AGENT_SANDBOX_TEST_IMAGE=agent-sandbox:local node --test tests/pi-container.test.cjs
```

This test uses a disposable container with no network access or host mounts.
It checks the Pi version, Copilot provider registration, Moshi extension
handlers, and preservation of existing settings and extensions. Without
`AGENT_SANDBOX_TEST_IMAGE`, the host-side suite skips this container test.

## Pull requests

Keep pull requests focused and describe:

- The user-visible behavior being changed.
- Any new host access, network exposure, or persistent state.
- Tests performed locally.
- Documentation and example configuration updated with the change.

Never include tokens, SSH private keys, pairing data, agent histories, private
hostnames, or real project mount paths.
