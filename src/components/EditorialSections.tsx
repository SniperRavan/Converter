import React from 'react'
import { BookOpen, Bot, FileCode, GraduationCap, ShieldCheck, FileText, Sigma } from 'lucide-react'
import { IssueReportSection } from './IssueReportSection'

export const EditorialSections: React.FC = () => {
  return (
    <div className="w-full space-y-16 py-12">
      {/* ================= USER GUIDE ================= */}
      <section id="guide" className="scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
              User Guide &amp; Solutions
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 max-w-xl mx-auto">
              Purpose-built conversion engines for ChatGPT math equations, Overleaf academic resumes, and private client-side documents.
            </p>
            <div className="w-12 h-1 bg-neutral-900 dark:bg-white mx-auto mt-3 rounded-full" />
          </div>

          {/* High-Intent Problem-Solving Workflows */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="border border-[#E5DDD0] dark:border-white/10 rounded-2xl p-5 bg-white dark:bg-[#0a0a0a] shadow-xs hover:border-blue-500/50 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <Sigma className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-neutral-900 dark:text-white text-base">
                ChatGPT Math to Word
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-xs mt-1.5 leading-relaxed">
                Fix broken <code className="font-mono text-[11px]">$...$</code> and <code className="font-mono text-[11px]">\[...\]</code> delimiters. Compiles AI equations into native MathML for Microsoft Word and Google Docs.
              </p>
            </div>

            <div className="border border-[#E5DDD0] dark:border-white/10 rounded-2xl p-5 bg-white dark:bg-[#0a0a0a] shadow-xs hover:border-emerald-500/50 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-neutral-900 dark:text-white text-base">
                Overleaf Resume to Word
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-xs mt-1.5 leading-relaxed">
                Convert academic LaTeX CVs (Jake's Resume, sb2nov) into ATS-compliant editable Word (.doc) files with intact margins and bullet hierarchies.
              </p>
            </div>

            <div className="border border-[#E5DDD0] dark:border-white/10 rounded-2xl p-5 bg-white dark:bg-[#0a0a0a] shadow-xs hover:border-purple-500/50 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-neutral-900 dark:text-white text-base">
                Markdown &amp; Obsidian to PDF
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-xs mt-1.5 leading-relaxed">
                Transform math-dense notes from Obsidian, Notion, and GitHub into corporate-ready Word docs or print-ready PDF files.
              </p>
            </div>

            <div className="border border-[#E5DDD0] dark:border-white/10 rounded-2xl p-5 bg-white dark:bg-[#0a0a0a] shadow-xs hover:border-amber-500/50 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-neutral-900 dark:text-white text-base">
                100% Client-Side Privacy
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-xs mt-1.5 leading-relaxed">
                Zero server uploads. Your confidential research papers, personal resumes, and proprietary code execute solely inside browser memory.
              </p>
            </div>
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
              is designed for all files in &rarr; all files out:
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
                  LLM Stream Parsing
                </h3>
              </div>
              <p className="text-neutral-600 dark:text-neutral-300">
                AI chatbots return mixed responses that traditional parsers break on:
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-1.5 text-neutral-700 dark:text-neutral-300 text-sm">
                <li>Automatic conversion of ASCII tables (<code className="px-1 py-0.5 rounded bg-[#FAF5ED] dark:bg-white/10 font-mono text-xs">|---|</code>, <code className="px-1 py-0.5 rounded bg-[#FAF5ED] dark:bg-white/10 font-mono text-xs">+---+</code>) to formatted grids</li>
                <li>Support for <code className="px-1 py-0.5 rounded bg-[#FAF5ED] dark:bg-white/10 font-mono text-xs">\[...\]</code> and <code className="px-1 py-0.5 rounded bg-[#FAF5ED] dark:bg-white/10 font-mono text-xs">$$...$$</code> KaTeX math display</li>
                <li>Self-healing of unclosed code blocks and HTML fragments</li>
                <li>One-click copy formatted directly for Google Docs and Microsoft Word</li>
              </ul>
            </div>
          </div>

          {/* Export Options Reference */}
          <div className="border border-[#E5DDD0] dark:border-white/10 rounded-2xl p-6 sm:p-8 bg-white dark:bg-[#0a0a0a] shadow-xs">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">
              Export Destinations
            </h3>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl border border-[#E5DDD0] dark:border-white/10 bg-[#FAF5ED]/50 dark:bg-white/[0.02]">
                <h4 className="font-semibold text-neutral-900 dark:text-white">Word (.doc)</h4>
                <p className="text-neutral-600 dark:text-neutral-400 text-xs mt-1">Native Microsoft Word file with styled typography and equations.</p>
              </div>
              <div className="p-3.5 rounded-xl border border-[#E5DDD0] dark:border-white/10 bg-[#FAF5ED]/50 dark:bg-white/[0.02]">
                <h4 className="font-semibold text-neutral-900 dark:text-white">PDF Document</h4>
                <p className="text-neutral-600 dark:text-neutral-400 text-xs mt-1">Print-ready document rendering via browser print engine.</p>
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
                How do I convert ChatGPT or Claude math formulas to Microsoft Word without broken $$ signs?
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                Paste your AI output into Converter and select the <strong>LLM Stream</strong> mode. Converter automatically detects LaTeX math delimiters (<code className="text-xs font-mono">$...$</code>, <code className="text-xs font-mono">$$...$$</code>, <code className="text-xs font-mono">\(...\)</code>, and <code className="text-xs font-mono">\[...\]</code>) and compiles them with KaTeX into native MathML. Click <strong>“Copy Rich Text”</strong> or <strong>“Word (.doc)”</strong> to paste directly into Microsoft Word or Google Docs as editable equations.
              </p>
            </div>

            <div className="border border-[#E5DDD0] dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#0a0a0a] shadow-xs hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2.5 text-neutral-900 dark:text-white">
                Can I convert an Overleaf or LaTeX academic resume/CV to Word (.doc)?
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                Yes! Paste your <code className="text-xs font-mono">.tex</code> source code or upload your LaTeX file. Converter uses an AST parser specifically tuned for popular academic CV templates (including Jake's Resume and sb2nov), transforming sections, dates, itemized bullets, and links into an ATS-friendly, fully editable Word document.
              </p>
            </div>

            <div className="border border-[#E5DDD0] dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#0a0a0a] shadow-xs hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2.5 text-neutral-900 dark:text-white">
                Why do ChatGPT equations break when copied into Google Docs, and how does Converter fix them?
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                Chatbots output equations in raw LaTeX delimiters that Google Docs and Word do not parse from the standard clipboard. Converter uses dual-MIME clipboard injection (<code className="text-xs font-mono">text/html</code> + <code className="text-xs font-mono">text/plain</code>) with pre-rendered MathML and KaTeX typography, ensuring equations paste as rendered formulas rather than raw code.
              </p>
            </div>

            <div className="border border-[#E5DDD0] dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#0a0a0a] shadow-xs hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2.5 text-neutral-900 dark:text-white">
                Is Converter safe for confidential research papers, resumes, and private documents?
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                Yes, 100%. All document parsing, KaTeX math typesetting, and file exports run locally in your browser sandbox using client-side JavaScript. Zero bytes of your text or files are ever sent to a remote server or third-party API.
              </p>
            </div>

            <div className="border border-[#E5DDD0] dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#0a0a0a] shadow-xs hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2.5 text-neutral-900 dark:text-white">
                Can I copy formatted tables and LaTeX equations directly to my clipboard?
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                Yes! The <strong>“Copy Rich Text”</strong> button injects formatted HTML directly onto your system clipboard, allowing instant pasting into Word, Google Docs, Notion, Obsidian, Slack, and Apple Pages with full table and equation layout preserved.
              </p>
            </div>

            <div className="border border-[#E5DDD0] dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-[#0a0a0a] shadow-xs hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2.5 text-neutral-900 dark:text-white">
                How does Converter handle messy ASCII tables and unclosed code blocks from AI chats?
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                In <strong>LLM Stream</strong> mode, Converter's streaming tokenizer self-heals unclosed markdown code fences, converts ragged ASCII box tables (<code className="text-xs font-mono">|---|</code>, <code className="text-xs font-mono">+---+</code>) into formatted data grids, and strips invalid escape sequences automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= ISSUES & COMMUNITY FEEDBACK ================= */}
      <IssueReportSection />

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-[#E5DDD0] dark:border-white/10 pt-8 pb-12 text-center">
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
          <a href="#converter" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
            Converter
          </a>
          <span className="hidden sm:inline">•</span>
          <a href="#guide" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
            User Guide
          </a>
          <span className="hidden sm:inline">•</span>
          <a href="#about" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
            About
          </a>
          <span className="hidden sm:inline">•</span>
          <a href="#faq" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
            FAQ
          </a>
          <span className="hidden sm:inline">•</span>
          <a href="#issues" className="hover:text-neutral-900 dark:hover:text-white transition-colors">
            Report Issue
          </a>
          <span className="hidden sm:inline">•</span>
          <a
            href="https://github.com/sniperravan"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-900 dark:hover:text-white font-medium transition-colors"
          >
            GitHub (@sniperravan)
          </a>
        </div>
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-4">
          © 2026 Converter · Crafted by <a href="https://github.com/sniperravan" target="_blank" rel="noopener noreferrer" className="underline hover:text-neutral-900 dark:hover:text-white">Akash (sniperravan)</a>. No logins, no paywalls, no tracking.
        </p>
      </footer>
    </div>
  )
}

export default EditorialSections
