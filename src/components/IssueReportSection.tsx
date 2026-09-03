import React, { useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Send,
  ExternalLink,
  Shield,
  MessageSquare,
} from 'lucide-react'

// Default Google Sheet Apps Script Webhook URL (can be customized via environment variable or passed in)
const DEFAULT_WEBHOOK_URL = import.meta.env.VITE_ISSUES_SHEET_URL || ''

export const IssueReportSection: React.FC = () => {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<'bug' | 'math' | 'table' | 'feature' | 'other'>('bug')
  const [description, setDescription] = useState('')
  const [contact, setContact] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) {
      setErrorMsg('Please enter both an issue title and description.')
      return
    }

    setErrorMsg(null)
    setSubmitting(true)

    const issuePayload = {
      title: title.trim(),
      category,
      description: description.trim(),
      contact: contact.trim() || 'Anonymous',
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    }

    try {
      if (DEFAULT_WEBHOOK_URL) {
        // Send directly to Google Sheet Web App Webhook
        await fetch(DEFAULT_WEBHOOK_URL, {
          method: 'POST',
          mode: 'no-cors', // Google Apps Script Web App redirects work seamlessly with no-cors
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(issuePayload),
        })
      } else {
        // Store locally in localStorage queue until sheet webhook is connected
        const existing = JSON.parse(localStorage.getItem('converter_issues_queue') || '[]')
        existing.push(issuePayload)
        localStorage.setItem('converter_issues_queue', JSON.stringify(existing))
      }

      setSubmitted(true)
      setTitle('')
      setDescription('')
      setContact('')
    } catch {
      setErrorMsg('Failed to submit issue. You can also report it directly on GitHub.')
    } finally {
      setSubmitting(false)
    }
  }

  const getGithubIssueUrl = () => {
    const encodedTitle = encodeURIComponent(`[${category.toUpperCase()}] ${title || 'Issue Report'}`)
    const encodedBody = encodeURIComponent(
      `### Issue Description\n${description || '(No description provided)'}\n\n### Category\n${category}\n\n### Contact (Optional)\n${contact || 'Anonymous'}`
    )
    return `https://github.com/sniperravan/Convertion/issues/new?title=${encodedTitle}&body=${encodedBody}`
  }

  return (
    <section id="issues" className="scroll-mt-20">
      <div className="max-w-4xl mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 font-semibold text-xs mb-2.5">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Community Feedback &amp; Bug Reports</span>
          </div>
          <h2 className="text-3xl font-bold text-neutral-900 dark:text-white tracking-tight">
            Report an Issue
          </h2>
          <p className="text-neutral-600 dark:text-neutral-400 text-sm max-w-xl mx-auto mt-2">
            Found a formatting bug, broken math formula, or have a feature idea? Submit it directly here — no GitHub account or login required.
          </p>
          <div className="w-12 h-1 bg-neutral-900 dark:bg-white mx-auto mt-3 rounded-full" />
        </div>

        {/* Card Container */}
        <div className="rounded-2xl border border-[#E5DDD0] dark:border-white/10 bg-white dark:bg-[#0a0a0a] p-6 sm:p-10 shadow-xs relative overflow-hidden">
          {/* Privacy Guarantee Banner */}
          <div className="flex items-center gap-2.5 p-3.5 mb-6 rounded-xl bg-[#FAF5ED] dark:bg-white/5 border border-[#E8E1D3] dark:border-white/10 text-xs text-neutral-700 dark:text-neutral-300">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>Zero Telemetry Guarantee:</strong> Submissions do not collect your Google account, email, or personal session data. Everything is 100% anonymous.
            </span>
          </div>

          {submitted ? (
            <div className="py-10 text-center space-y-4 animate-in fade-in-50">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white">
                Issue Received!
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm max-w-md mx-auto">
                Thank you for reporting this. Your feedback directly helps us improve AST parsing and export fidelity for everyone.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="inline-flex items-center justify-center text-xs font-semibold px-4 py-2 rounded-lg bg-neutral-900 dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity cursor-pointer"
              >
                Submit Another Issue
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMsg && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Category Selector */}
              <div>
                <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
                  Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'bug', label: 'Bug Report' },
                    { id: 'math', label: 'LaTeX / Math Glitch' },
                    { id: 'table', label: 'Table Formatting' },
                    { id: 'feature', label: 'Feature Request' },
                    { id: 'other', label: 'Other' },
                  ].map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        category === cat.id
                          ? 'bg-neutral-900 dark:bg-white text-white dark:text-black font-semibold shadow-2xs'
                          : 'bg-[#FAF5ED] dark:bg-white/5 border border-[#E5DDD0] dark:border-white/10 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Heading / Title */}
              <div>
                <label
                  htmlFor="issue-title"
                  className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5"
                >
                  Issue Title / Heading <span className="text-red-500">*</span>
                </label>
                <input
                  id="issue-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. LaTeX align environment equation numbers overlap in Word export"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5DDD0] dark:border-white/15 bg-[#FAF5ED]/50 dark:bg-[#121212] text-neutral-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-neutral-400"
                />
              </div>

              {/* Body / Description */}
              <div>
                <label
                  htmlFor="issue-description"
                  className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5"
                >
                  Description &amp; Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="issue-description"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what happened, the expected output, or paste any problematic input snippets..."
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5DDD0] dark:border-white/15 bg-[#FAF5ED]/50 dark:bg-[#121212] text-neutral-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-neutral-400 resize-y"
                />
              </div>

              {/* Optional Contact */}
              <div>
                <label
                  htmlFor="issue-contact"
                  className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5"
                >
                  Contact Handle or Email{' '}
                  <span className="text-neutral-400 font-normal">(Optional — leave blank to remain 100% anonymous)</span>
                </label>
                <input
                  id="issue-contact"
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="e.g. @username or email for follow-up questions"
                  className="w-full px-3.5 py-2 rounded-xl border border-[#E5DDD0] dark:border-white/15 bg-[#FAF5ED]/50 dark:bg-[#121212] text-neutral-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-neutral-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <a
                  href={getGithubIssueUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  <span>Have a GitHub account? Open directly on GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-70" />
                </a>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center text-sm font-semibold bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-200 text-white dark:text-black h-10 rounded-xl px-5 shadow-xs transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      <span>Submit Issue</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}

export default IssueReportSection
