#include "../include/entropy_calculator.hpp"
#include <numeric>
#include <cstring>
#include <algorithm>

namespace prxray::core {

ThermodynamicEntropyEngine::ThermodynamicEntropyEngine() noexcept {
    initialize_natural_distribution();
}

void ThermodynamicEntropyEngine::initialize_natural_distribution() noexcept {
    // Standard baseline distribution of typical UTF-8 code (whitespace, alphanumeric, brackets)
    natural_code_prior_.fill(1e-6); // Laplace smoothing factor

    // Populate common ASCII code characters (a-z, A-Z, 0-9, syntax tokens)
    for (int c = 'a'; c <= 'z'; ++c) natural_code_prior_[c] = 0.055;
    for (int c = 'A'; c <= 'Z'; ++c) natural_code_prior_[c] = 0.025;
    for (int c = '0'; c <= '9'; ++c) natural_code_prior_[c] = 0.020;
    
    natural_code_prior_[' '] = 0.12;
    natural_code_prior_['\n'] = 0.04;
    natural_code_prior_['\t'] = 0.03;
    natural_code_prior_['{'] = 0.015;
    natural_code_prior_['}'] = 0.015;
    natural_code_prior_['('] = 0.018;
    natural_code_prior_[')'] = 0.018;
    natural_code_prior_[';'] = 0.020;
    natural_code_prior_['='] = 0.015;

    // Normalize distribution sum to 1.0
    double sum = std::accumulate(natural_code_prior_.begin(), natural_code_prior_.end(), 0.0);
    for (auto& p : natural_code_prior_) {
        p /= sum;
    }
}

EntropyMetric ThermodynamicEntropyEngine::evaluate_buffer(std::string_view buffer) const noexcept {
    if (buffer.empty()) {
        return {0.0, 0.0, 0.0, false};
    }

    const size_t len = buffer.size();

    // 1. Zero-Order Frequency Histogram
    std::array<uint32_t, 256> unigram_freq{};
    // 2. First-Order Transition Digraph Matrix: P(x_i | x_{i-1})
    // Flattened 256x256 transition table
    std::array<std::array<uint32_t, 256>, 256> transition_matrix{};

    uint8_t prev_byte = static_cast<uint8_t>(buffer[0]);
    unigram_freq[prev_byte]++;

    for (size_t i = 1; i < len; ++i) {
        const uint8_t curr_byte = static_cast<uint8_t>(buffer[i]);
        unigram_freq[curr_byte]++;
        transition_matrix[prev_byte][curr_byte]++;
        prev_byte = curr_byte;
    }

    // Compute Zero-Order Shannon Entropy H_0 = -sum(P(x) * log2(P(x)))
    double h0 = 0.0;
    std::array<double, 256> p_unigram{};

    for (size_t i = 0; i < 256; ++i) {
        if (unigram_freq[i] > 0) {
            const double p = static_cast<double>(unigram_freq[i]) / static_cast<double>(len);
            p_unigram[i] = p;
            h0 -= p * std::log2(p);
        }
    }

    // Compute First-Order Markov Conditional Entropy: H_1 = -sum_u P(u) * sum_v P(v|u) * log2(P(v|u))
    double h1 = 0.0;
    for (size_t u = 0; u < 256; ++u) {
        if (unigram_freq[u] == 0) continue;

        const double p_u = p_unigram[u];
        uint32_t row_total = 0;
        for (size_t v = 0; v < 256; ++v) {
            row_total += transition_matrix[u][v];
        }

        if (row_total == 0) continue;

        double row_entropy = 0.0;
        for (size_t v = 0; v < 256; ++v) {
            const uint32_t count = transition_matrix[u][v];
            if (count > 0) {
                const double p_v_given_u = static_cast<double>(count) / static_cast<double>(row_total);
                row_entropy -= p_v_given_u * std::log2(p_v_given_u);
            }
        }
        h1 += p_u * row_entropy;
    }

    // Compute Kullback-Leibler (KL) Divergence: D_KL(P || Q)
    double kl_divergence = 0.0;
    for (size_t i = 0; i < 256; ++i) {
        if (p_unigram[i] > 0.0) {
            const double q = natural_code_prior_[i];
            kl_divergence += p_unigram[i] * std::log2(p_unigram[i] / q);
        }
    }

    // Thermodynamic Decision Boundary:
    // Pure cryptographic material has high H_0 (> 4.5), high H_1 (> 3.5), and large deviation from natural code
    const bool is_secret = (h0 >= 4.45) && (h1 >= 3.2) && (len >= 20);

    return {h0, h1, kl_divergence, is_secret};
}

std::vector<TokenEntropyFinding> ThermodynamicEntropyEngine::scan_diff_stream(std::string_view diff_payload) const {
    std::vector<TokenEntropyFinding> findings;
    findings.reserve(32);

    uint32_t current_line = 1;
    size_t line_start = 0;

    while (line_start < diff_payload.size()) {
        size_t line_end = diff_payload.find('\n', line_start);
        if (line_end == std::string_view::npos) line_end = diff_payload.size();

        std::string_view line = diff_payload.substr(line_start, line_end - line_start);

        // Process only git addition lines
        if (line.starts_with('+') && !line.starts_with("+++")) {
            std::string_view content = line.substr(1);

            // Tokenize by delimiter boundaries
            size_t token_start = 0;
            for (size_t i = 0; i <= content.size(); ++i) {
                const bool is_delim = (i == content.size()) || 
                                      content[i] == ' ' || content[i] == '\t' || 
                                      content[i] == '"' || content[i] == '\'' || 
                                      content[i] == '`' || content[i] == '=' || 
                                      content[i] == ';' || content[i] == ',' ||
                                      content[i] == '(' || content[i] == ')';

                if (is_delim) {
                    if (i > token_start) {
                        std::string_view candidate = content.substr(token_start, i - token_start);

                        // Only evaluate candidates with potential cryptographic key length (16 to 120 chars)
                        if (candidate.size() >= 16 && candidate.size() <= 120) {
                            EntropyMetric metric = evaluate_buffer(candidate);

                            if (metric.is_cryptographic_secret) {
                                TokenEntropyFinding finding{};
                                finding.line_number = current_line;
                                finding.col_start = static_cast<uint32_t>(token_start + 1);
                                finding.col_end = static_cast<uint32_t>(i + 1);
                                finding.entropy = metric.shannon_h0;
                                finding.markov_entropy = metric.markov_h1;

                                const size_t copy_len = std::min(candidate.size(), sizeof(finding.token) - 1);
                                std::memcpy(finding.token, candidate.data(), copy_len);
                                finding.token[copy_len] = '\0';

                                const char* label = (metric.shannon_h0 > 5.1) ? "High-Order Key / Token" : "Entropy Anomaly";
                                std::strncpy(finding.signature_class, label, sizeof(finding.signature_class) - 1);

                                findings.push_back(finding);
                            }
                        }
                    }
                    token_start = i + 1;
                }
            }
        }

        current_line++;
        line_start = line_end + 1;
    }

    return findings;
}

} // namespace prxray::core