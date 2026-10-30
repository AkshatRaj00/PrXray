#pragma once

#include <string_view>
#include <array>
#include <cstdint>

namespace prxray::core {

struct KnownSecretSignature {
    std::string_view prefix;
    size_t exact_length;
    std::string_view label;
    bool enforce_exact_length;
};

// Zero-allocation deterministic prefix & boundary validator
class HeuristicSignatureMatcher {
public:
    static constexpr std::array<KnownSecretSignature, 12> CRITICAL_PATTERNS = {{
        {"AKIA", 20, "AWS Access Key ID", true},
        {"ASIA", 20, "AWS Temporary Access Key", true},
        {"ghp_", 40, "GitHub Personal Access Token", true},
        {"gho_", 40, "GitHub OAuth Access Token", true},
        {"ghu_", 40, "GitHub User-to-Server Token", true},
        {"ghs_", 40, "GitHub Server-to-Server Token", true},
        {"ghr_", 40, "GitHub Refresh Token", true},
        {"AIza", 39, "Google Cloud / Firebase API Key", true},
        {"sk_live_", 32, "Stripe Live Secret Key", false},
        {"rk_live_", 32, "Stripe Restricted Secret Key", false},
        {"xoxb-", 55, "Slack Bot User Token", false},
        {"-----BEGIN PRIVATE KEY-----", 0, "PKCS#8 Cryptographic Private Key", false}
    }};

    [[nodiscard]] static std::string_view match_signature(std::string_view token) noexcept {
        for (const auto& sig : CRITICAL_PATTERNS) {
            if (token.starts_with(sig.prefix)) {
                if (!sig.enforce_exact_length || token.size() == sig.exact_length) {
                    return sig.label;
                }
            }
        }
        return {};
    }
};

} // namespace prxray::core