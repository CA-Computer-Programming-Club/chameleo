#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"

CONTAINER="$(basename "$PWD")"

record_lan_host() {
    local host="${CHAMELEO_LAN_HOST:-}"
    if [ -z "$host" ] && command -v ip >/dev/null 2>&1; then
        host="$(ip route get 1.1.1.1 2>/dev/null |
            awk '{for (i = 1; i < NF; i++) if ($i == "src") {print $(i + 1); exit}}')"
    fi
    if [ -n "$host" ]; then
        printf '%s\n' "$host" >.devcontainer/.lan-host
    else
        echo "[enter-dev] could not detect a LAN address; Expo will guess one." >&2
        echo "[enter-dev] set CHAMELEO_LAN_HOST=<ip> to override." >&2
    fi
}

share_host_adb() {
    command -v adb >/dev/null 2>&1 || return 0
    if command -v ss >/dev/null 2>&1; then
        ss -ltn 2>/dev/null | grep -qE '(0\.0\.0\.0|\*|\[::\]):5037[[:space:]]' && return 0
        ss -ltn 2>/dev/null | grep -qE '[:.]5037[[:space:]]' && adb kill-server >/dev/null 2>&1
    fi
    adb -a start-server >/dev/null 2>&1 ||
        echo "[enter-dev] could not start a shared adb server; run \`adb -a start-server\`." >&2
}

network_of() {
    local mode
    mode="$(docker inspect -f '{{.HostConfig.NetworkMode}}' "$CONTAINER" 2>/dev/null)"
    [ "$mode" = "default" ] && mode=bridge
    echo "$mode"
}

attached() {
    [ -n "$(docker inspect -f '{{range $n, $_ := .NetworkSettings.Networks}}{{$n}} {{end}}' \
        "$CONTAINER" 2>/dev/null)" ]
}

wanted_ports() {
    docker inspect -f '{{range $p, $bs := .HostConfig.PortBindings}}{{range $bs}}{{.HostPort}}
{{end}}{{end}}' "$CONTAINER" 2>/dev/null | grep .
}

unbound_ports() {
    command -v ss >/dev/null 2>&1 || return 0
    local listening port
    listening="$(ss -ltn 2>/dev/null)"
    while read -r port; do
        grep -qE "[:.]${port}[[:space:]]" <<<"$listening" || echo "$port"
    done < <(wanted_ports)
}

record_lan_host
share_host_adb

if [ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null)" = "true" ]; then
    if ! attached; then
        echo "$CONTAINER is running with no network endpoint; reattaching to $(network_of)." >&2
        docker network connect "$(network_of)" "$CONTAINER" || true
    fi

    if ! attached; then
        echo "Could not reattach $CONTAINER to $(network_of). Recreate it with:" >&2
        echo "    docker rm -f $CONTAINER && $0" >&2
        exit 1
    fi

    missing="$(unbound_ports || true)"
    if [ -n "$missing" ]; then
        echo "$CONTAINER is attached but these published ports are not bound on the host:" >&2
        echo "    $(tr '\n' ' ' <<<"$missing")" >&2
        echo "Another container is probably holding them. Find it with \`docker ps -a\`," >&2
        echo "remove it, then recreate this one:" >&2
        echo "    docker rm -f $CONTAINER && $0" >&2
        exit 1
    fi

    exec devcontainer exec --workspace-folder . bash
fi

devcontainer up --workspace-folder . >/dev/null

devcontainer exec --workspace-folder . .devcontainer/post-create.sh

exec devcontainer exec --workspace-folder . bash
