#!/usr/bin/env bash

real="$(dirname "$0")/adb.real"
args=("$@")
serial=()
if [ "${args[0]}" = "-s" ]; then
    serial=(-s "${args[1]}")
    args=("${args[@]:2}")
fi

if [ "${args[*]}" = "emu avd name" ]; then
    for prop in ro.boot.qemu.avd_name ro.kernel.qemu.avd_name; do
        name="$("$real" "${serial[@]}" shell getprop "$prop" 2>/dev/null | tr -d '\r')"
        if [ -n "$name" ]; then
            printf '%s\nOK\n' "$name"
            exit 0
        fi
    done
fi

exec "$real" "$@"
