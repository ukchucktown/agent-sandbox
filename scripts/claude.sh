#!/usr/bin/env bash

set -euo pipefail

# Docker exec and non-login commands also use the persistent native launcher.
export PATH="/home/agent/.local/bin:${PATH}"
exec /home/agent/.local/bin/claude "$@"
