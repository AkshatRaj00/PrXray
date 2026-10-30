#include <emscripten/bind.h>
#include "../include/entropy_calculator.hpp"
#include "../include/ast_parser.hpp"

using namespace emscripten;
using namespace prxray::core;

// Custom adapter to expose token C-string safely to JavaScript string
std::string get_token_str(const TokenEntropyFinding& f) {
    return std::string(f.token);
}

std::string get_signature_str(const TokenEntropyFinding& f) {
    return std::string(f.signature_class);
}

EMSCRIPTEN_BINDINGS(prxray_wasm_core) {
    // 1. Value Object: EntropyMetric
    value_object<EntropyMetric>("EntropyMetric")
        .field("shannon_h0", &EntropyMetric::shannon_h0)
        .field("markov_h1", &EntropyMetric::markov_h1)
        .field("kl_divergence_natural", &EntropyMetric::kl_divergence_natural)
        .field("is_cryptographic_secret", &EntropyMetric::is_cryptographic_secret);

    // 2. Value Object: TokenEntropyFinding
    value_object<TokenEntropyFinding>("TokenEntropyFinding")
        .field("line_number", &TokenEntropyFinding::line_number)
        .field("col_start", &TokenEntropyFinding::col_start)
        .field("col_end", &TokenEntropyFinding::col_end)
        .field("entropy", &TokenEntropyFinding::entropy)
        .field("markov_entropy", &TokenEntropyFinding::markov_entropy)
        .field("token", &get_token_str)
        .field("signature_class", &get_signature_str);

    // 3. Vector Registration for Findings
    register_vector<TokenEntropyFinding>("VectorTokenEntropyFinding");

    // 4. Value Object: FunctionASTMetric
    value_object<FunctionASTMetric>("FunctionASTMetric")
        .field("name", &FunctionASTMetric::name)
        .field("start_line", &FunctionASTMetric::start_line)
        .field("end_line", &FunctionASTMetric::end_line)
        .field("vertex_count", &FunctionASTMetric::vertex_count)
        .field("edge_count", &FunctionASTMetric::edge_count)
        .field("connected_components", &FunctionASTMetric::connected_components)
        .field("cyclomatic_m", &FunctionASTMetric::cyclomatic_m)
        .field("max_nesting_depth", &FunctionASTMetric::max_nesting_depth)
        .field("is_hotspot", &FunctionASTMetric::is_hotspot);

    // 5. Vector Registration for AST Metrics
    register_vector<FunctionASTMetric>("VectorFunctionASTMetric");

    // 6. ThermodynamicEntropyEngine Class Binding
    class_<ThermodynamicEntropyEngine>("ThermodynamicEntropyEngine")
        .constructor<>()
        .function("evaluate_buffer", &ThermodynamicEntropyEngine::evaluate_buffer)
        .function("scan_diff_stream", &ThermodynamicEntropyEngine::scan_diff_stream);

    // 7. ASTDecisionEngine Class Binding
    class_<ASTDecisionEngine>("ASTDecisionEngine")
        .constructor<>()
        .function("analyze_source", &ASTDecisionEngine::analyze_source);
}