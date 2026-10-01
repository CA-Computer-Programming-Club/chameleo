#!/usr/bin/env bash

set -e

sudo chown "$(id -u):$(id -g)" /workspace/.venv /workspace/frontend/node_modules

for s in pyright-langserver typescript-language-server tsserver; do
    command -v "$s" >/dev/null 2>&1 || need_ls=1
done
if [ "$need_ls" = 1 ]; then
    npm install -g pyright 'typescript@^5.9' typescript-language-server
    NPM_BIN="$(npm config get prefix)/bin"
    for s in pyright-langserver typescript-language-server tsserver; do
        [ -e "$NPM_BIN/$s" ] && sudo ln -sf "$NPM_BIN/$s" "/usr/local/bin/$s"
    done
fi

NPM_MAJOR=12
if [ "$(npm --version | cut -d. -f1)" != "$NPM_MAJOR" ]; then
    npm install -g "npm@${NPM_MAJOR}"
fi

if ! npm ls -g --depth=0 @expo/ngrok >/dev/null 2>&1; then
    npm install -g '@expo/ngrok@^4.1'
fi

ZELLIJ_VERSION="0.41.2"
if ! command -v zellij >/dev/null 2>&1; then
    curl -fsSL "https://github.com/zellij-org/zellij/releases/download/v${ZELLIJ_VERSION}/zellij-x86_64-unknown-linux-musl.tar.gz" |
        sudo tar -xz -C /usr/local/bin
fi

if ! dpkg -s neovim less >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y --no-install-recommends neovim less
    sudo rm -rf /var/lib/apt/lists/*
fi

REQ=/workspace/backend/requirements.txt
STAMP=/workspace/.venv/.requirements.sha256
need_pip=0
if ! /workspace/.venv/bin/python -c 'import ensurepip' 2>/dev/null; then
    find /workspace/.venv -mindepth 1 -delete
    python3 -m venv /workspace/.venv
    need_pip=1
fi
if [ "$need_pip" = 1 ] || ! sha256sum -c "$STAMP" >/dev/null 2>&1; then
    /workspace/.venv/bin/pip install --upgrade pip wheel
    /workspace/.venv/bin/pip install -r "$REQ"
    sha256sum "$REQ" >"$STAMP"
fi

npm --prefix /workspace/frontend install

MARKER='# chameleo devcontainer'
if ! grep -qF "$MARKER" "$HOME/.bashrc" 2>/dev/null; then
    cat >>"$HOME/.bashrc" <<'BASHRC'

[ -r /workspace/.devcontainer/env.sh ] && . /workspace/.devcontainer/env.sh
BASHRC
fi
