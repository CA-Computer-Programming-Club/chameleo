const { withPodfile } = require("expo/config-plugins");

const POD_NAMES = ["GoogleUtilities", "RecaptchaInterop"];

const SNIPPET = `
${POD_NAMES.map(
    (
        name,
    ) => `  if current_target_definition.respond_to?(:set_use_modular_headers_for_pod)
    current_target_definition.set_use_modular_headers_for_pod('${name}', true)
  else
    pod '${name}', :modular_headers => true
  end`,
).join("\n")}
`;

const ANCHOR = "  use_expo_modules!\n";

module.exports = function withGoogleSignInModularHeaders(config) {
    return withPodfile(config, (config) => {
        const contents = config.modResults.contents;

        if (contents.includes("withGoogleSignInModularHeaders.js")) {
            return config;
        }
        if (!contents.includes(ANCHOR)) {
            throw new Error(
                "withGoogleSignInModularHeaders: could not find `use_expo_modules!` in the " +
                    "Podfile.",
            );
        }

        config.modResults.contents = contents.replace(ANCHOR, ANCHOR + SNIPPET);
        return config;
    });
};
