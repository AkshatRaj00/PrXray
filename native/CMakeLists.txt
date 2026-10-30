cmake_minimum_required(VERSION 3.20)
project(prxray_ast_engine CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

include_directories(include)

set(SOURCES
    src/entropy_calculator.cpp
    src/ast_parser.cpp
    src/bindings.cpp
)

add_executable(prxray_ast_engine ${SOURCES})

# Emscripten Compilation & Optimization Flags
target_compile_options(prxray_ast_engine PRIVATE
    -O3
    -flto
    -msimd128
    -fno-exceptions
    -fno-rtti
)

target_link_options(prxray_ast_engine PRIVATE
    -O3
    -flto
    -sWASM=1
    -sMODULARIZE=1
    -sEXPORT_ES6=1
    -sEXPORT_NAME="createPRXRayEngine"
    -sALLOW_MEMORY_GROWTH=1
    -sINITIAL_MEMORY=33554432
    -sMAXIMUM_MEMORY=536870912
    -sENVIRONMENT="web,worker"
    -sFILESYSTEM=0
    -lembind
    -o "${CMAKE_CURRENT_SOURCE_DIR}/../public/wasm/prxray_ast_engine.js"
)