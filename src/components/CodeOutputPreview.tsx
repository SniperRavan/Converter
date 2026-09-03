import React from 'react'

interface CodeOutputPreviewProps {
  content: string
  format: 'markdown' | 'html' | 'latex' | 'text' | 'json'
  filename?: string
}

export const CodeOutputPreview: React.FC<CodeOutputPreviewProps> = ({ content }) => {
  return (
    <div className="w-full h-full min-h-[460px] select-text">
      <pre className="font-mono text-xs sm:text-sm leading-relaxed text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-words">
        <code>{content || '// No output generated yet...'}</code>
      </pre>
    </div>
  )
}

export default CodeOutputPreview
