# Contributing to Converter

Thank you for your interest in contributing to **Converter**! This project is an open-source, client-side AST document conversion engine designed to transform unstructured LLM output, academic LaTeX, Markdown, and HTML into production-ready documents.

---

## 🏛️ Architecture Overview

The core engine follows a strict **Compiler Pipeline** design:

```
[Raw Input] ──> [Parser / Detector] ──> [NormalizedDocument AST] ──> [Target Renderer] ──> [Export / Clipboard]
```

* **`src/core/types.ts`**: Defines the canonical AST nodes (`BlockNode`, `InlineNode`, `NormalizedDocument`). All inputs map *to* this schema; all outputs render *from* it.
* **`src/parsers/`**: Syntax parsers (`markdown.ts`, `latex.ts`, `html.ts`, `json.ts`, `llm-mixed.ts`, `normalizer.ts`). Parsers are deterministic and must never mutate global state.
* **`src/renderers/`**: Target format compilers (`markdown.ts`, `html.ts`, `latex.ts`, `text.ts`).
* **`src/utils/mathUnicode.ts`**: Translates LaTeX equations into clean Unicode math symbols for clipboard fallbacks.
* **`src/utils/exporters.ts`**: Document generation utilities for Microsoft Word (`.doc`) and paginated PDF.

---

## 🛠️ Development Setup

### Prerequisites
* **Node.js**: v18.0 or higher (v20+ recommended)
* **npm** or **pnpm**

### Quick Start

```bash
# 1. Clone your fork
git clone https://github.com/sniperravan/Converter.git
cd Converter

# 2. Install dependencies
npm install

# 3. Start the local Vite server
npm run dev
```

---

## 🧪 Testing & Quality Standards

We use **Vitest** for fast, deterministic unit testing and **Oxlint** for static analysis. All contributions must pass linting, type-checking, and unit tests:

```bash
# Run unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linter
npm run lint

# Verify production build and TypeScript types
npm run build
```

---

## 🧩 Adding a New Feature or Parser

1. **Adding a Syntax Feature:**
   - If adding support for a new LaTeX environment, macro, or markdown syntax, add parser logic in the respective `src/parsers/` module.
   - Add corresponding test cases in `tests/` covering both happy paths and edge cases.

2. **Clipboard Math Guidelines:**
   - When modifying math output, ensure all three clipboard targets remain intact:
     - **MathML (`text/html`)** for Microsoft Word OMML conversion.
     - **Rendered SVG with Unicode alt** for Google Docs.
     - **Formatted Unicode symbols (`text/plain`)** for plaintext, chat, and markdown.

---

## 📝 Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

* `feat(scope): ...` for new capabilities.
* `fix(scope): ...` for bug fixes.
* `test(scope): ...` for new or updated test suites.
* `docs: ...` for documentation updates.
* `perf: ...` for performance improvements.

---

## 📄 License

By contributing to Converter, you agree that your contributions will be licensed under the project's [MIT License](LICENSE).
