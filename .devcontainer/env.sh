if [ -z "${REACT_NATIVE_PACKAGER_HOSTNAME:-}" ] && [ -r /workspace/.devcontainer/.lan-host ]; then
    _lan_host="$(cat /workspace/.devcontainer/.lan-host)"
    [ -n "$_lan_host" ] && export REACT_NATIVE_PACKAGER_HOSTNAME="$_lan_host"
    unset _lan_host
fi

if [ -z "${EXPO_TOKEN:-}" ] && [ -r /workspace/.devcontainer/.expo-token ]; then
    _expo_token="$(tr -d '[:space:]' </workspace/.devcontainer/.expo-token)"
    [ -n "$_expo_token" ] && export EXPO_TOKEN="$_expo_token"
    unset _expo_token
fi
