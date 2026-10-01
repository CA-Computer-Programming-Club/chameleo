#!/usr/bin/env bash

set -e

cd "$(dirname "$0")"

CONTAINER="$(basename "$PWD")"

remove=0
volumes=0
for arg in "$@"; do
    case "$arg" in
    --down) remove=1 ;;
    -v | --volumes)
        remove=1
        volumes=1
        ;;
    *)
        echo "[stop-dev] unknown option: $arg" >&2
        exit 2
        ;;
    esac
done

if [ "$remove" = 1 ]; then
    if docker rm -f "$CONTAINER" >/dev/null 2>&1; then
        echo "[stop-dev] removed container $CONTAINER"
    else
        echo "[stop-dev] no container named $CONTAINER"
    fi
else
    if docker stop "$CONTAINER" >/dev/null 2>&1; then
        echo "[stop-dev] stopped container $CONTAINER (resume with ./enter-dev.sh)"
    else
        echo "[stop-dev] no running container named $CONTAINER"
    fi
fi

if [ "$volumes" = 1 ]; then
    if docker volume rm "${CONTAINER}-venv" "${CONTAINER}-node-modules" >/dev/null 2>&1; then
        echo "[stop-dev] removed dependency volumes"
    else
        echo "[stop-dev] no dependency volumes to remove"
    fi
fi
