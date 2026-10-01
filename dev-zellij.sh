#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"

[ -r .devcontainer/env.sh ] && . .devcontainer/env.sh

zellij --layout zellij-layout.kdl
