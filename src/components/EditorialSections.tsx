import React from 'react'
import { BookOpen, Bot, FileCode } from 'lucide-react'

export const EditorialSections: React.FC = () => {
  return (
    <div className="w-full space-y-16 py-12">
      {/* ================= ABOUT THIS TOOL ================= */}
      <section id="about" className="scroll-mt-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
              About Converter
            </h2>
            <div className="w-12 h-1 bg-neutral-900 dark:bg-white mx-auto mt-3 rounded-full" />
          </div>

          <div className="space-y-6 text-neutral-700 dark:text-neutral-300 leading-relaxed text-base bg-white dark:bg-[#0a0a0a] p-8 sm:p-10 rounded-2xl border border-[#E5DDD0] dark:border-white/10 shadow-xs">
            <p>
              <strong className="text-neutral-900 dark:text-white font-semibold">
                Converter
              </strong>{' '}
              is a universal, privacy-first document engine designed to transform any document, mixed LLM response, code file, or table into any target format. Built on a normalized Document Object Model (AST), it eliminates the complexity of point-to-point translation by decomposing inputs into a unified intermediate representation.{' '}
              <strong className="text-neutral-900 dark:text-white font-semibold">
                It’s lightning fast
              </strong>, providing real-time AST compilation as you type.
            </p>
            <p>
              <strong className="text-neutral-900 dark:text-white font-semibold">
                Universal Compatibility:
              </strong>{' '}
              Input anything — Markdown, HTML, LaTeX, plain text, code, JSON, or images — and output directly to formatted Rich Text (for Microsoft Word, Google Docs, Notion, Apple Pages), clean Markdown, structured HTML, compilable LaTeX, Word (.doc), or PDF.
            </p>
            <p>
              <strong className="text-neutral-900 dark:text-white font-semibold">
                Dedicated LLM Mixed Stream Engine:
              </strong>{' '}
              Large Language Models (ChatGPT, Claude, DeepSeek, Gemini) frequently produce mixed outputs combining LaTeX formulas (<code className="px-1.5 py-0.5 rounded bg-[#FAF5ED] dark:bg-white/10 font-mono text-xs">\[...\]</code> and <code className="px-1.5 py-0.5 rounded bg-[#FAF5ED] dark:bg-white/10 font-mono text-xs">$$...$$</code>), embedded HTML tags, ASCII box tables, and code fences. Converter normalizes this chaotic mix instantly into a clean document structure without breaking formulas or tables.
            </p>
            <p>
              All processing happens locally in your browser —{' '}
              <strong className="text-neutral-900 dark:text-white font-semibold">
                privacy first
              </strong>. Your documents and AI conversations never leave your device, ensuring zero data collection, zero telemetry, and complete offline capability.
            </p>
          </div>
        </div>
      </section>

      {/* ================= USER GUIDE ================= */}
      <section id="guide" className="scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
              User Guide
            </h2>
            <div className="w-12 h-1 bg-neutral-900 dark:bg-white mx-auto mt-3 rounded-full" />
          </div>

          {/* Getting Started */}
          <div className="border border-[#E5DDD0] dark:border-white/10 rounded-2xl p-6 sm:p-8 bg-white dark:bg-[#0a0a0a] shadow-xs mb-6">
            <div className="flex items-center gap-2.5 mb-3">
              <BookOpen className="w-5 h-5 text-neutral-900 dark:text-white" />
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
                Getting Started
              </h3>
            </div>
            <p className="text-neutral-600 dark:text-neutral-300">
              <strong className="text-neutral-900 dark:text-white">
                Converter
              </strong>{' '}
              is designed for all files in $\to$ all files out:
            </p>
            <ol className="list-decimal pl-6 mt-4 space-y-2 text-neutral-700 dark:text-neutral-300">
              <li>Paste any content or upload any file into the left editor panel.</li>
              <li>Select your input mode (Auto-Detect, LLM Stream, Markdown, HTML, LaTeX, Text, JSON).</li>
              <li>Watch the live preview appear on the right in your chosen format (Rich Preview, Markdown, HTML, LaTeX, Text, or JSON AST).</li>
              <li>Copy to clipboard or export directly as Word (.doc), PDF, HTML, or LaTeX.</li>
            </ol>
          </div>

          {/* Side by side: File Upload & Copying Rich Text */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="border border-[#E5DDD0] dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#0a0a0a] shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <FileCode className="w-5 h-5 text-blue-600 dark:text-white" />
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
                  Universal File Ingestion
                </h3>
              </div>
              <p className="text-neutral-600 dark:text-neutral-300">
                You can upload or drop virtually any document or code file:
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-1.5 text-neutral-700 dark:text-neutral-300 text-sm">
                <li>Markdown (<code className="px-1 py-0.5 rounded bg-[#FAF5ED] dark:bg-white/10 font-mono text-xs">.md</code>, <code className="px-1 py-0.5 rounded bg-[#FAF5ED] dark:bg-white/10 font-mono text-xs">.markdown</code>)</li>
                <li>HTML documents (<code className="px-1 py-0.5 rounded bg-[#FAF5ED] dark:bg-white/10 font-mono text-xs">.html</code>, <code className="px-1 py-0.5 rounded bg-[#FAF5ED] dark:bg-white/10 font-mono text-xs">.htm</code>)</li>
                <li>LaTeX papers (<code className="px-1 py-0.5 rounded bg-[#FAF5ED] dark:bg-white/10 font-mono text-xs">.tex</code>)</li>
                <li>Data &amp; Code (<code className="px-1 py-0.5 rounded bg-[#FAF5ED] dark:bg-white/10 font-mono text-xs">.json</code>, <code className="px-1 py-0.5 rounded bg-[#FAF5ED] dark:bg-white/10 font-mono text-xs">.py</code>, <code className="px-1 py-0.5 rounded bg-[#FAF5ED] dark:bg-white/10 font-mono text-xs">.ts</code>, <code className="px-1 py-0.5 rounded bg-[#FAF5ED] dark:bg-white/10 font-mono text-xs">.txt</code>)</li>
                <li>Images: automatically embedded as data-URL Markdown</li>
              </ul>
            </div>

            <div className="border border-[#E5DDD0] dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#0a0a0a] shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Bot className="w-5 h-5 text-purple-600 dark:text-white" />
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
                  LLM Mixed Stream Slot
                </h3>
              </div>
              <p className="text-neutral-600 dark:text-neutral-300">
                Switch to the <strong>“LLM Stream (Mixed)”</strong> mode to handle messy AI responses:
              </p>
              <div className="mt-3 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                <p>
                  • Resolves unclosed code blocks and mixed LaTeX notation (<code className="px-1 py-0.5 rounded bg-[#FAF5ED] dark:bg-white/10 font-mono text-xs">\[...\]</code> and <code className="px-1 py-0.5 rounded bg-[#FAF5ED] dark:bg-white/10 font-mono text-xs">\(...\)</code>).
                </p>
                <p>
                  • Translates ASCII tables (<code className="px-1 py-0.5 rounded bg-[#FAF5ED] dark:bg-white/10 font-mono text-xs">+---+---+</code>) and raw HTML tags into native document blocks.
                </p>
                <p>
                  • Perfect for copying directly out of ChatGPT, Claude, DeepSeek, or Gemini into professional formats.
                </p>
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="border border-[#E5DDD0] dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#0a0a0a] shadow-xs mb-6">
            <h3 className="text-xl font-semibold mb-3 text-neutral-900 dark:text-white">
              Export Options
            </h3>
            <p className="text-neutral-600 dark:text-neutral-300 mb-4">
              Export your converted document in any standard format with a single click:
            </p>
            <div className="grid md:grid-cols-4 gap-4 text-sm">
              <div className="p-3.5 rounded-xl border border-[#E5DDD0] dark:border-white/10 bg-[#FAF5ED]/50 dark:bg-white/[0.02]">
                <h4 className="font-semibold text-neutral-900 dark:text-white">Word (.doc)</h4>
                <p className="text-neutral-600 dark:text-neutral-400 text-xs mt-1">Native Microsoft Word &amp; Google Docs document.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-[#E5DDD0] dark:border-white/10 bg-[#FAF5ED]/50 dark:bg-white/[0.02]">
                <h4 className="font-semibold text-neutral-900 dark:text-white">PDF Document</h4>
                <p className="text-neutral-600 dark:text-neutral-400 text-xs mt-1">Printable high-resolution portable document.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-[#E5DDD0] dark:border-white/10 bg-[#FAF5ED]/50 dark:bg-white/[0.02]">
                <h4 className="font-semibold text-neutral-900 dark:text-white">HTML / Markdown</h4>
                <p className="text-neutral-600 dark:text-neutral-400 text-xs mt-1">Clean semantic markup for web publishing.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-[#E5DDD0] dark:border-white/10 bg-[#FAF5ED]/50 dark:bg-white/[0.02]">
                <h4 className="font-semibold text-neutral-900 dark:text-white">LaTeX / JSON AST</h4>
                <p className="text-neutral-600 dark:text-neutral-400 text-xs mt-1">Academic papers and machine-readable AST trees.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FREQUENTLY ASKED QUESTIONS ================= */}
      <section id="faq" className="scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <div className="w-12 h-1 bg-neutral-900 dark:bg-white mx-auto mt-3 rounded-full" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-[#E5DDD0] dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#0a0a0a] shadow-xs hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2.5 text-neutral-900 dark:text-white">
                What makes Converter different from other tools?
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                Converter translates everything through a normalized Document AST rather than brittle string regexes. This enables all-file input to all-file output, including mixed LLM responses with math formulas and tables.
              </p>
            </div>

            <div className="border border-[#E5DDD0] dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#0a0a0a] shadow-xs hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2.5 text-neutral-900 dark:text-white">
                How does the LLM Mixed Stream slot work?
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                It specifically addresses LLM output quirks: fixing unclosed code fences, normalizing LaTeX delimiters (<code className="text-xs font-mono">\[...\]</code>), converting ASCII tables (<code className="text-xs font-mono">+---+</code>), and harmonizing inline HTML tags into clean AST blocks.
              </p>
            </div>

            <div className="border border-[#E5DDD0] dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#0a0a0a] shadow-xs hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2.5 text-neutral-900 dark:text-white">
                Does this tool store or upload my content?
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                No. All parsing, rendering, and exporting run 100% locally in your browser sandbox. No servers, no APIs, no tracking, and no data retention forever.
              </p>
            </div>

            <div className="border border-[#E5DDD0] dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#0a0a0a] shadow-xs hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2.5 text-neutral-900 dark:text-white">
                Can I copy directly into Word or Google Docs?
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                Yes! The <strong>“Copy Rich Text”</strong> button creates a dual-mime clipboard item (<code className="text-xs font-mono">text/html</code> + <code className="text-xs font-mono">text/plain</code>), allowing seamless pasting into Word, Google Docs, Notion, Slack, and Apple Pages with full table and formula formatting.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-[#E5DDD0] dark:border-white/10 pt-8 pb-12 text-center">
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
          <a href="#about" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
            About
          </a>
          <span className="hidden sm:inline">•</span>
          <a href="#guide" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
            User Guide
          </a>
          <span className="hidden sm:inline">•</span>
          <a href="#faq" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
            FAQ
          </a>
          <span className="hidden sm:inline">•</span>
          <span className="text-neutral-800 dark:text-neutral-200 font-medium">100% Client-Side Engine</span>
        </div>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-4">
          © 2026 Converter. No logins, no paywalls, no tracking. Long live the handmade web.
        </p>
      </footer>
    </div>
  )
}

export default EditorialSections
