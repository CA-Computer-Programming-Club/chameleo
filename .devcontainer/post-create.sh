#!/usr/bin/env bash

set -e

sudo chown "$(id -u):$(id -g)" /workspace/.venv /workspace/frontend/node_modules /opt/android-sdk "$HOME"

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

if ! dpkg -s neovim less unzip openjdk-17-jdk-headless >/dev/null 2>&1; then
    sudo apt-get update
    sudo apt-get install -y --no-install-recommends neovim less unzip openjdk-17-jdk-headless
    sudo rm -rf /var/lib/apt/lists/*
fi
sudo ln -sfn "/usr/lib/jvm/java-17-openjdk-$(dpkg --print-architecture)" /usr/lib/jvm/java-17

ANDROID_HOME=/opt/android-sdk
CMDLINE_TOOLS_BUILD=16111833
ANDROID_PACKAGES=(
    "platform-tools"
    "platforms;android-36"
    "build-tools;36.0.0"
    "ndk;27.1.12297006"
    "cmake;3.22.1"
)
SDKMANAGER="$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager"
if [ ! -x "$SDKMANAGER" ]; then
    tmp="$(mktemp -d)"
    curl -fsSL -o "$tmp/cmdline-tools.zip" \
        "https://dl.google.com/android/repository/commandlinetools-linux-${CMDLINE_TOOLS_BUILD}_latest.zip"
    unzip -q "$tmp/cmdline-tools.zip" -d "$tmp"
    mkdir -p "$ANDROID_HOME/cmdline-tools"
    rm -rf "$ANDROID_HOME/cmdline-tools/latest"
    mv "$tmp/cmdline-tools" "$ANDROID_HOME/cmdline-tools/latest"
    rm -rf "$tmp"
fi
SDK_STAMP="$ANDROID_HOME/.packages"
if [ "$(cat "$SDK_STAMP" 2>/dev/null)" != "${ANDROID_PACKAGES[*]}" ]; then
    export JAVA_HOME=/usr/lib/jvm/java-17
    yes | "$SDKMANAGER" --sdk_root="$ANDROID_HOME" --licenses >/dev/null || true
    "$SDKMANAGER" --sdk_root="$ANDROID_HOME" "${ANDROID_PACKAGES[@]}"
    printf '%s' "${ANDROID_PACKAGES[*]}" >"$SDK_STAMP"
fi
ADB="$ANDROID_HOME/platform-tools/adb"
if [ "$(head -c 2 "$ADB")" != "#!" ]; then
    mv "$ADB" "$ADB.real"
fi
cmp -s /workspace/.devcontainer/adb-shim.sh "$ADB" || install -m 755 /workspace/.devcontainer/adb-shim.sh "$ADB"

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
