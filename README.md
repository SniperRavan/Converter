# Convertion

> **No logins, no paywalls, no data collection, forever.**  
> **Fully open source. Long live the handmade web.**  
>  
> Universal, privacy-first, client-side document conversion engine. Transform messy AI outputs, mixed Markdown, LaTeX mathematics, structured tables, and arbitrary text into clean, presentation-ready formats — entirely inside your browser.

---

## 💡 Core Philosophy

Convertion does not convert format A directly into format B. Doing pairwise conversions between $N$ formats requires $N \times (N-1)$ converters.

Instead, Convertion parses every supported input into a single, canonical **Normalized Document Model (AST)**, and then renders that model into the requested output format:

```text
                 ANY SUPPORTED INPUT
                         │
                         ↓
                 ┌───────────────┐
                 │    PARSERS    │
                 │ (MD, TeX, TXT)│
                 └───────┬───────┘
                         ↓
              ┌─────────────────────┐
              │ NORMALIZED DOCUMENT │
              │     MODEL (AST)     │
              └──────────┬──────────┘
                         ↓
                 ┌───────────────┐
                 │   RENDERERS   │
                 └───────┬───────┘
                         │
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
   Rich Preview      Copy Output       Download
                         │                │
                   ┌─────┼─────┐     ┌────┼─────┐
                   ↓     ↓     ↓     ↓    ↓     ↓
                  MD   HTML  LaTeX  PDF  DOCX  TXT
```

---

## 🔒 Privacy & Security First

- **100% Client-Side:** All parsing, AST transformations, and rendering execute locally in your browser.
- **Zero Telemetry:** No analytics scripts, no tracking pixels, no telemetry payloads.
- **Zero Remote Document Upload:** Your sensitive documents, code, and prompts never leave your device.
- **Deterministic Parsers:** No third-party LLM APIs are invoked during standard conversion. Fast, deterministic, and works offline.
- **Hardened Security Boundary:** All user-provided content is treated as untrusted input. Strict sanitization boundaries prevent XSS, neutralize dangerous URL schemes (`javascript:`, `data:`), and isolate active scripts.

---

## ⚡ Key Features

- **Mixed LLM Syntax Handling:** Seamlessly parses mixed headings, bold/italics, LaTeX blocks (`$$...$$`) and inline math (`$...$`), fenced code blocks with language labels, and formatted GFM tables.
- **Live Real-Time Preview:** Debounced instant rendering as you type or paste without pressing a "Convert" button.
- **Dynamic Format Options:** Dedicated settings panels per output format (CommonMark/GFM flavors, PDF orientation/margins, LaTeX document classes).
- **Diagnostics & Status:** Live document analysis displaying detected headings, tables, code blocks, and math expressions.
- **Motion & Accessibility Controls:** Full accessibility support including system `prefers-reduced-motion` compliance and a 3-state toggle (Full / Reduced / Off) for older or low-power devices.
- **One-Click Actions:** Copy formatted rich text, copy source markdown/HTML/LaTeX, or download standalone files with smart naming.

---

## 🛠️ Technology Stack

- **Framework:** React 19 + TypeScript + Vite
- **UI & Styling:** Tailwind CSS + shadcn/ui primitives + Lucide Icons
- **Visual Enhancements:** Canvas UI components with graceful fallbacks
- **Parsing Pipeline:** Unified ecosystem (`remark-parse`, `remark-gfm`, `remark-math`)
- **Mathematics:** KaTeX (browser-side rendering with error tolerance)
- **Code Highlighting:** Shiki / syntax highlighter
- **State Management:** Zustand
- **Schema Validation:** Zod

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- pnpm / npm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/Convertion.git
cd Convertion

# Install dependencies
pnpm install

# Start local development server
pnpm dev
```

---

## 📄 License

MIT
