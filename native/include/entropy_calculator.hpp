#pragma once

#include <string_view>
#include <vector>
#include <array>
#include <cstdint>
#include <cmath>

namespace prxray::core {

struct EntropyMetric {
    double shannon_h0;           // Base-2 Shannon Entropy (0.0 to 8.0)
    double markov_h1;            // 1st-Order Conditional Markov Entropy
    double kl_divergence_natural;// Relative entropy against standard source code baseline
    bool is_cryptographic_secret;
};

struct TokenEntropyFinding {
    uint32_t line_number;
    uint32_t col_start;
    uint32_t col_end;
    double entropy;
    double markov_entropy;
    char token[128];
    char signature_class[64];
};

class ThermodynamicEntropyEngine {
public:
    ThermodynamicEntropyEngine() noexcept;

    // Fast zero-allocation byte-level analysis using string_view
    [[nodiscard]] EntropyMetric evaluate_buffer(std::string_view buffer) const noexcept;

    // Line-by-line diff stream analysis returning flagged high-dimensional tokens
    [[nodiscard]] std::vector<TokenEntropyFinding> scan_diff_stream(std::string_view diff_payload) const;

private:
    // Natural code probability distribution baseline for KL-Divergence
    std::array<double, 256> natural_code_prior_{};

    void initialize_natural_distribution() noexcept;
};

} // namespace prxray::core