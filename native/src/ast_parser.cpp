#include "../include/ast_parser.hpp"
#include <algorithm>
#include <stack>

namespace prxray::core {

FunctionASTMetric ASTDecisionEngine::evaluate_function_graph(
    std::string_view fn_name,
    std::string_view body,
    uint32_t start_line,
    uint32_t end_line
) const {
    std::vector<CFGNode> vertices;
    std::vector<CFGEdge> edges;
    vertices.reserve(64);
    edges.reserve(128);

    uint32_t next_id = 0;

    // Node 0: Routine Entry
    vertices.push_back({next_id++, start_line, start_line, NodeType::ENTRY});

    uint32_t current_active_node = 0;
    uint32_t current_depth = 0;
    uint32_t max_depth = 0;

    size_t line_start = 0;
    uint32_t line_num = start_line;

    while (line_start < body.size()) {
        size_t line_end = body.find('\n', line_start);
        if (line_end == std::string_view::npos) line_end = body.size();

        std::string_view line = body.substr(line_start, line_end - line_start);

        // Track Scope / Nesting Depth
        for (char ch : line) {
            if (ch == '{') {
                current_depth++;
                max_depth = std::max(max_depth, current_depth);
            } else if (ch == '}') {
                if (current_depth > 0) current_depth--;
            }
        }

        // Branching Decision Signatures: if, for, while, catch, case, ?, &&, ||
        size_t pos = 0;
        bool has_decision = false;

        const std::string_view keywords[] = {"if", "for", "while", "catch", "case"};
        for (const auto& kw : keywords) {
            pos = line.find(kw);
            while (pos != std::string_view::npos) {
                // Ensure boundary isolation (not part of an identifier like 'tariff')
                const bool left_bound = (pos == 0) || !std::isalnum(static_cast<unsigned char>(line[pos - 1])) && line[pos - 1] != '_';
                const bool right_bound = (pos + kw.size() >= line.size()) || !std::isalnum(static_cast<unsigned char>(line[pos + kw.size()])) && line[pos + kw.size()] != '_';

                if (left_bound && right_bound) {
                    has_decision = true;

                    // Create Decision Vertex and split edges
                    const uint32_t decision_node = next_id++;
                    const uint32_t fallthrough_node = next_id++;

                    vertices.push_back({decision_node, line_num, line_num, NodeType::BRANCH_DECISION});
                    vertices.push_back({fallthrough_node, line_num, line_num, NodeType::BASIC_BLOCK});

                    edges.push_back({current_active_node, decision_node, EdgeType::UNCONDITIONAL});
                    edges.push_back({decision_node, fallthrough_node, EdgeType::BRANCH_TRUE});
                    edges.push_back({decision_node, fallthrough_node, EdgeType::BRANCH_FALSE});

                    current_active_node = fallthrough_node;
                }
                pos = line.find(kw, pos + kw.size());
            }
        }

        // Logical branch operators: &&, ||, and ternary ?
        const std::string_view ops[] = {"&&", "||", "?"};
        for (const auto& op : ops) {
            pos = line.find(op);
            while (pos != std::string_view::npos) {
                const uint32_t decision_node = next_id++;
                const uint32_t branch_node = next_id++;

                vertices.push_back({decision_node, line_num, line_num, NodeType::BRANCH_DECISION});
                vertices.push_back({branch_node, line_num, line_num, NodeType::BASIC_BLOCK});

                edges.push_back({current_active_node, decision_node, EdgeType::UNCONDITIONAL});
                edges.push_back({decision_node, branch_node, EdgeType::BRANCH_TRUE});
                edges.push_back({decision_node, branch_node, EdgeType::BRANCH_FALSE});

                current_active_node = branch_node;
                pos = line.find(op, pos + op.size());
            }
        }

        line_num++;
        line_start = line_end + 1;
    }

    // Node: Routine Exit
    const uint32_t exit_node = next_id++;
    vertices.push_back({exit_node, end_line, end_line, NodeType::EXIT});
    edges.push_back({current_active_node, exit_node, EdgeType::UNCONDITIONAL});

    // Graph Dimensions
    const uint32_t V = static_cast<uint32_t>(vertices.size());
    const uint32_t E = static_cast<uint32_t>(edges.size());
    constexpr uint32_t p = 1; // 1 Connected graph component per routine

    // McCabe Theorem: M = |E| - |V| + 2p
    // Guaranteed mathematically: M >= 1
    const int32_t raw_m = static_cast<int32_t>(E) - static_cast<int32_t>(V) + (2 * p);
    const uint32_t cyclomatic_m = static_cast<uint32_t>(std::max(1, raw_m));

    return {
        std::string(fn_name),
        start_line,
        end_line,
        V,
        E,
        p,
        cyclomatic_m,
        max_depth,
        cyclomatic_m > 15
    };
}

std::vector<FunctionASTMetric> ASTDecisionEngine::analyze_source(std::string_view source_code) const {
    std::vector<FunctionASTMetric> metrics;
    metrics.reserve(16);

    uint32_t current_line = 1;
    size_t line_start = 0;

    while (line_start < source_code.size()) {
        size_t line_end = source_code.find('\n', line_start);
        if (line_end == std::string_view::npos) line_end = source_code.size();

        std::string_view line = source_code.substr(line_start, line_end - line_start);

        // Locate function definitions: "function foo", "const foo = () =>", "class methods"
        size_t fn_pos = line.find("function ");
        std::string fn_name;

        if (fn_pos != std::string_view::npos) {
            size_t name_start = fn_pos + 9;
            while (name_start < line.size() && (line[name_start] == ' ' || line[name_start] == '\t')) name_start++;
            size_t name_end = line.find('(', name_start);
            if (name_end != std::string_view::npos) {
                fn_name = std::string(line.substr(name_start, name_end - name_start));
            }
        } else {
            size_t arrow_pos = line.find("=>");
            if (arrow_pos != std::string_view::npos && line.find('(') != std::string_view::npos) {
                size_t assign_pos = line.find('=');
                if (assign_pos != std::string_view::npos && assign_pos < arrow_pos) {
                    size_t name_end = assign_pos;
                    while (name_end > 0 && (line[name_end - 1] == ' ' || line[name_end - 1] == '\t')) name_end--;
                    size_t name_start = name_end;
                    while (name_start > 0 && (std::isalnum(static_cast<unsigned char>(line[name_start - 1])) || line[name_start - 1] == '_' || line[name_start - 1] == '$')) name_start--;
                    fn_name = std::string(line.substr(name_start, name_end - name_start));
                }
            }
        }

        if (!fn_name.empty()) {
            // Find function body scope boundaries
            size_t body_start = source_code.find('{', line_start);
            if (body_start != std::string_view::npos) {
                int brace_count = 1;
                size_t cursor = body_start + 1;
                uint32_t body_lines = 0;

                while (cursor < source_code.size() && brace_count > 0) {
                    if (source_code[cursor] == '{') brace_count++;
                    else if (source_code[cursor] == '}') brace_count--;
                    else if (source_code[cursor] == '\n') body_lines++;
                    cursor++;
                }

                if (brace_count == 0) {
                    std::string_view fn_body = source_code.substr(body_start, cursor - body_start);
                    const uint32_t fn_end_line = current_line + body_lines;

                    metrics.push_back(evaluate_function_graph(fn_name, fn_body, current_line, fn_end_line));

                    // Advance cursor past the evaluated function
                    current_line = fn_end_line;
                    line_start = cursor;
                    continue;
                }
            }
        }

        current_line++;
        line_start = line_end + 1;
    }

    return metrics;
}

} // namespace prxray::core