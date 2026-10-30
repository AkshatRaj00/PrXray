#pragma once

#include <string_view>
#include <string>
#include <vector>
#include <cstdint>

namespace prxray::core {

enum class NodeType : uint8_t {
    ENTRY,
    BASIC_BLOCK,
    BRANCH_DECISION,
    MERGE_NODE,
    EXIT
};

enum class EdgeType : uint8_t {
    UNCONDITIONAL,
    BRANCH_TRUE,
    BRANCH_FALSE,
    LOOP_BACK
};

struct CFGEdge {
    uint32_t from_node;
    uint32_t to_node;
    EdgeType type;
};

struct CFGNode {
    uint32_t id;
    uint32_t start_line;
    uint32_t end_line;
    NodeType type;
};

// Represents the algebraic Control Flow Graph of an isolated routine
struct FunctionASTMetric {
    std::string name;
    uint32_t start_line;
    uint32_t end_line;
    uint32_t vertex_count;       // |V|
    uint32_t edge_count;         // |E|
    uint32_t connected_components; // p (usually 1 per routine)
    uint32_t cyclomatic_m;       // M = |E| - |V| + 2p
    uint32_t max_nesting_depth;
    bool is_hotspot;             // M > 15
};

class ASTDecisionEngine {
public:
    ASTDecisionEngine() = default;

    // Zero-copy AST routine partitioner and CFG builder
    [[nodiscard]] std::vector<FunctionASTMetric> analyze_source(std::string_view source_code) const;

private:
    // Builds CFG and computes cycle-space dimension M = |E| - |V| + 2p
    [[nodiscard]] FunctionASTMetric evaluate_function_graph(
        std::string_view fn_name,
        std::string_view body,
        uint32_t start_line,
        uint32_t end_line
    ) const;
};

} // namespace prxray::core