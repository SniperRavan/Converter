import React from 'react'
import { BookOpen } from 'lucide-react'

export const EditorialSections: React.FC = () => {
  return (
    <div className="w-full space-y-16 py-12">
      {/* ================= ABOUT THIS TOOL ================= */}
      <section id="about" className="scroll-mt-20">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              About This Tool
            </h2>
            <div className="w-12 h-1 bg-blue-600 dark:bg-blue-500 mx-auto mt-3 rounded-full" />
          </div>

          <div className="space-y-6 text-slate-700 dark:text-slate-300 leading-relaxed text-base bg-white dark:bg-slate-900/60 p-8 sm:p-10 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
            <p>
              <strong className="text-slate-900 dark:text-white font-semibold">
                Markdown to Rich Text Converter
              </strong>{' '}
              is a lightweight, privacy-first web tool designed to instantly transform your Markdown content into rich, formatted text. It helps writers, developers, and teams quickly prepare documents for publishing or sharing across modern text editors and platforms.{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">
                It’s lightning fast
              </strong>, providing real-time previews as you type.
            </p>
            <p>
              The converter works with all major platforms and applications that support rich text formatting, making it{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">
                universally compatible
              </strong>. Whether you’re using Microsoft Word, Google Docs, Notion, or Apple Pages, your converted content maintains structure and formatting accurately.
            </p>
            <p>
              All processing happens locally in your browser —{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">
                privacy first
              </strong>. Your content never leaves your device, ensuring security and confidentiality. Even large Markdown files are processed quickly without sending data to external servers.
            </p>
            <p>
              The converter supports{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">
                GitHub Flavored Markdown (GFM)
              </strong>, handling headings, lists, links, images, code blocks, tables, math equations, and other common Markdown syntax elements. You can also{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">
                export your converted text
              </strong>{' '}
              as HTML, Word (.docx), PDF, or LaTeX — perfect for web publishing, documentation, or printing. The tool preserves structure and formatting to match the original Markdown as closely as possible.
            </p>
            <p>
              Whether you’re preparing blog posts, documentation, or team notes,{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">
                Markdown to Rich Text Converter
              </strong>{' '}
              saves time, ensures consistent formatting, and works seamlessly across all your tools. No installation, no sign-up, completely free to use.
            </p>
          </div>
        </div>
      </section>

      {/* ================= USER GUIDE ================= */}
      <section id="guide" className="scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              User Guide
            </h2>
            <div className="w-12 h-1 bg-blue-600 dark:bg-blue-500 mx-auto mt-3 rounded-full" />
          </div>

          {/* Getting Started */}
          <div className="border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 sm:p-8 bg-white dark:bg-slate-900/60 shadow-xs mb-6">
            <div className="flex items-center gap-2.5 mb-3">
              <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                Getting Started
              </h3>
            </div>
            <p className="text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-white">
                Markdown to Rich Text Converter
              </strong>{' '}
              is designed to be simple and intuitive. Follow these quick steps to get started:
            </p>
            <ol className="list-decimal pl-6 mt-4 space-y-2 text-slate-700 dark:text-slate-300">
              <li>Paste your Markdown content into the left editor panel.</li>
              <li>See the formatted rich text preview appear instantly on the right.</li>
              <li>Copy the output or export it in your preferred format.</li>
              <li>
                <strong>Exporting:</strong> After converting your Markdown, you can export the content as:
                <ul className="list-disc pl-6 mt-2 space-y-1.5 text-sm">
                  <li>
                    <strong className="text-slate-900 dark:text-white">HTML:</strong> Clean HTML for web pages or emails.
                  </li>
                  <li>
                    <strong className="text-slate-900 dark:text-white">Word (.docx):</strong> Ready-to-use document compatible with Microsoft Word and other editors.
                  </li>
                  <li>
                    <strong className="text-slate-900 dark:text-white">PDF:</strong> Portable PDF format for easy sharing or printing.
                  </li>
                </ul>
              </li>
            </ol>
          </div>

          {/* Side by side: File Upload & Copying Rich Text */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-slate-900/60 shadow-xs">
              <h3 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">
                File Upload
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                You can upload Markdown files directly instead of pasting text:
              </p>
              <ul className="list-disc pl-6 mt-3 space-y-1.5 text-slate-700 dark:text-slate-300 text-sm">
                <li>Click the <strong>“Upload .md”</strong> button in the editor.</li>
                <li>Select your <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono text-xs">.md</code> or <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono text-xs">.markdown</code> file.</li>
                <li>Or drag and drop the file directly into the editor.</li>
              </ul>
              <p className="mt-4 text-xs text-slate-500 font-mono">
                <strong>Supported formats:</strong> .md, .markdown, .txt, .png, .svg
              </p>
            </div>

            <div className="border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-slate-900/60 shadow-xs">
              <h3 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">
                Copying Rich Text
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                The <strong>“Copy Rich Text”</strong> button preserves all Markdown formatting when pasting into:
              </p>
              <div className="mt-3 space-y-2 text-sm text-slate-700 dark:text-slate-300">
                <p>
                  <strong className="text-slate-900 dark:text-white">Text Editors:</strong> Microsoft Word, Google Docs, Apple Pages
                </p>
                <p>
                  <strong className="text-slate-900 dark:text-white">Online Platforms:</strong> Notion, Slack, Discord, Gmail, Outlook
                </p>
              </div>
            </div>
          </div>

          {/* Export Options */}
          <div className="border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-slate-900/60 shadow-xs mb-6">
            <h3 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">
              Export Options
            </h3>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Export your converted rich text in multiple formats, perfect for sharing or documentation:
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-1 text-slate-900 dark:text-white">HTML Export</h4>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Clean HTML with inline styles — ideal for embedding in web pages or email templates.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1 text-slate-900 dark:text-white">Word Export</h4>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Native <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 font-mono text-xs">.docx</code> format that opens perfectly in Microsoft Word and compatible editors.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-1 text-slate-900 dark:text-white">PDF Export</h4>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Portable PDF format for easy sharing or printing of your converted Markdown.
                </p>
              </div>
            </div>
          </div>

          {/* Supported Markdown Syntax (Exact 7 blocks from markdowntorichtext.com) */}
          <div className="border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 sm:p-8 bg-white dark:bg-slate-900/60 shadow-xs">
            <h3 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">
              Supported Markdown Syntax
            </h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              The converter supports standard Markdown syntax. Here are some commonly used elements:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-1.5 text-slate-900 dark:text-white text-sm">Headers (H1-H6)</h4>
                <div className="bg-slate-100 dark:bg-slate-950 p-3.5 rounded-xl text-xs font-mono border border-slate-200/60 dark:border-white/5 space-y-1 text-slate-700 dark:text-slate-300">
                  <div># H1 Header</div>
                  <div>## H2 Header</div>
                  <div>### H3 Header</div>
                  <div>#### H4 Header</div>
                  <div>##### H5 Header</div>
                  <div>###### H6 Header</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-1.5 text-slate-900 dark:text-white text-sm">Ordered &amp; Unordered Lists</h4>
                <div className="bg-slate-100 dark:bg-slate-950 p-3.5 rounded-xl text-xs font-mono border border-slate-200/60 dark:border-white/5 space-y-1 text-slate-700 dark:text-slate-300">
                  <div>- Unordered list item</div>
                  <div>* Another item</div>
                  <div>+ Yet another item</div>
                  <div className="pt-1">1. Ordered list item</div>
                  <div>2. Second item</div>
                  <div>3. Third item</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-1.5 text-slate-900 dark:text-white text-sm">Bold &amp; Italic Text</h4>
                <div className="bg-slate-100 dark:bg-slate-950 p-3.5 rounded-xl text-xs font-mono border border-slate-200/60 dark:border-white/5 space-y-1 text-slate-700 dark:text-slate-300">
                  <div>**Bold text** or __Bold text__</div>
                  <div>*Italic text* or _Italic text_</div>
                  <div>~~Strikethrough text~~</div>
                  <div>`Inline code`</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-1.5 text-slate-900 dark:text-white text-sm">Code Blocks &amp; Inline Code</h4>
                <div className="bg-slate-100 dark:bg-slate-950 p-3.5 rounded-xl text-xs font-mono border border-slate-200/60 dark:border-white/5 space-y-1 text-slate-700 dark:text-slate-300">
                  <div>```javascript</div>
                  <div>function hello() &#123; console.log('Hello!'); &#125;</div>
                  <div>```</div>
                  <div>`your_code_here`</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-1.5 text-slate-900 dark:text-white text-sm">Links &amp; Images</h4>
                <div className="bg-slate-100 dark:bg-slate-950 p-3.5 rounded-xl text-xs font-mono border border-slate-200/60 dark:border-white/5 space-y-1 text-slate-700 dark:text-slate-300">
                  <div>[Link text](https://example.com)</div>
                  <div>![Alt text](image-url.jpg)</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-1.5 text-slate-900 dark:text-white text-sm">Blockquotes</h4>
                <div className="bg-slate-100 dark:bg-slate-950 p-3.5 rounded-xl text-xs font-mono border border-slate-200/60 dark:border-white/5 space-y-1 text-slate-700 dark:text-slate-300">
                  <div>&gt; This is a blockquote</div>
                  <div>&gt; It can span multiple lines</div>
                </div>
              </div>

              <div className="md:col-span-2">
                <h4 className="font-semibold mb-1.5 text-slate-900 dark:text-white text-sm">Tables</h4>
                <div className="bg-slate-100 dark:bg-slate-950 p-3.5 rounded-xl text-xs font-mono border border-slate-200/60 dark:border-white/5 space-y-1 text-slate-700 dark:text-slate-300 overflow-x-auto">
                  <div>| Header 1 | Header 2 |</div>
                  <div>|----------|----------|</div>
                  <div>| Cell 1   | Cell 2   |</div>
                  <div>| Cell 3   | Cell 4   |</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= FREQUENTLY ASKED QUESTIONS ================= */}
      <section id="faq" className="scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <div className="w-12 h-1 bg-blue-600 dark:bg-blue-500 mx-auto mt-3 rounded-full" />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-slate-900/60 shadow-xs hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2.5 text-slate-900 dark:text-white">
                Is this tool completely free?
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Yes! <strong>Markdown to Rich Text Converter</strong> is completely free to use — with no hidden costs, subscriptions, or premium tiers. It’s 100% free forever.
              </p>
            </div>

            <div className="border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-slate-900/60 shadow-xs hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2.5 text-slate-900 dark:text-white">
                Does this tool store or upload my content?
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                No. Your Markdown is processed entirely in your browser, never uploaded to any server. This ensures full <strong>privacy, security, and data ownership</strong>.
              </p>
            </div>

            <div className="border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-slate-900/60 shadow-xs hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2.5 text-slate-900 dark:text-white">
                Which applications support the copied rich text?
              </h3>
              <div className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed space-y-1">
                <p>The rich text output works with nearly all major platforms, including:</p>
                <p><strong>Office Suites:</strong> Microsoft Word, Google Docs, Apple Pages, LibreOffice Writer</p>
                <p><strong>Online Platforms:</strong> Notion, Slack, Discord, Gmail, Outlook</p>
              </div>
            </div>

            <div className="border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-slate-900/60 shadow-xs hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2.5 text-slate-900 dark:text-white">
                Which Markdown syntax is supported?
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                We support GitHub Flavored Markdown (GFM), including headers, lists, links, images, code blocks, blockquotes, tables, and strikethrough text. All Markdown structures are preserved accurately when converted.
              </p>
            </div>

            <div className="border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-slate-900/60 shadow-xs hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2.5 text-slate-900 dark:text-white">
                Why does formatting look different in Word or Notion?
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Visual styles may vary slightly because each editor renders text spacing differently. The structure of your Markdown remains intact — only the default styling differs across platforms.
              </p>
            </div>

            <div className="border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-slate-900/60 shadow-xs hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2.5 text-slate-900 dark:text-white">
                Can I use this converter offline?
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Yes! Once the page has loaded, you can continue using it even without an internet connection. All conversion logic runs locally in your browser, making it both fast and private.
              </p>
            </div>

            <div className="border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-slate-900/60 shadow-xs hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2.5 text-slate-900 dark:text-white">
                Is it safe for confidential or work-related documents?
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                Absolutely. No data ever leaves your device. This makes the tool suitable for personal, academic, or professional use — including private or internal files.
              </p>
            </div>

            <div className="border border-slate-200/80 dark:border-white/10 rounded-2xl p-6 bg-white dark:bg-slate-900/60 shadow-xs hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold mb-2.5 text-slate-900 dark:text-white">
                How can I report a bug or suggest a feature?
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                We welcome feedback! You can submit issues or ideas on our GitHub page or through the site’s feedback form. Your input helps us make Markdown to Rich Text Converter better for everyone.
              </p>
            </div>
          </div>

          <p className="text-center text-slate-500 text-sm mt-12 max-w-2xl mx-auto">
            Still have questions about Markdown conversion, export options, or privacy?
            <br />
            We’re constantly improving <strong>Markdown to Rich Text Converter</strong> to make it more reliable, private, and easy to use.
          </p>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-slate-200/80 dark:border-white/10 pt-8 pb-12 text-center">
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
          <a href="#about" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            About
          </a>
          <span className="hidden sm:inline">•</span>
          <a href="#guide" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            User Guide
          </a>
          <span className="hidden sm:inline">•</span>
          <a href="#faq" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
            FAQ
          </a>
          <span className="hidden sm:inline">•</span>
          <span className="text-emerald-500 font-medium">100% Client-Side Engine</span>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
          © 2026 MarkdownConverter. No logins, no paywalls, no tracking. Long live the handmade web.
        </p>
      </footer>
    </div>
  )
}

export default EditorialSections
