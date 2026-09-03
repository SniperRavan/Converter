// Canonical Normalized Document Model (AST) for Convertion
// All input parsers map TO this model; all exporters render FROM this model.

export type Alignment = 'left' | 'center' | 'right' | null

export interface BaseNode {
  id?: string
  startLine?: number
  endLine?: number
}

// Inline Nodes
export interface TextNode extends BaseNode {
  type: 'text'
  value: string
}

export interface StrongNode extends BaseNode {
  type: 'strong'
  children: InlineNode[]
}

export interface EmphasisNode extends BaseNode {
  type: 'emphasis'
  children: InlineNode[]
}

export interface StrikethroughNode extends BaseNode {
  type: 'strikethrough'
  children: InlineNode[]
}

export interface InlineCodeNode extends BaseNode {
  type: 'inlineCode'
  value: string
}

export interface InlineMathNode extends BaseNode {
  type: 'inlineMath'
  value: string
  source?: string
}

export interface LinkNode extends BaseNode {
  type: 'link'
  url: string
  title?: string
  children: InlineNode[]
}

export interface ImageNode extends BaseNode {
  type: 'image'
  url: string
  alt?: string
  title?: string
}

export type InlineNode =
  | TextNode
  | StrongNode
  | EmphasisNode
  | StrikethroughNode
  | InlineCodeNode
  | InlineMathNode
  | LinkNode
  | ImageNode

// Block Nodes
export interface HeadingNode extends BaseNode {
  type: 'heading'
  level: 1 | 2 | 3 | 4 | 5 | 6
  children: InlineNode[]
}

export interface ParagraphNode extends BaseNode {
  type: 'paragraph'
  children: InlineNode[]
}

export interface BlockquoteNode extends BaseNode {
  type: 'blockquote'
  children: BlockNode[]
}

export interface ListItemNode extends BaseNode {
  type: 'listItem'
  children: (BlockNode | InlineNode)[]
}

export interface ListNode extends BaseNode {
  type: 'list'
  ordered: boolean
  start?: number
  items: ListItemNode[]
}

export interface CodeBlockNode extends BaseNode {
  type: 'codeBlock'
  language: string
  value: string
}

export interface MathBlockNode extends BaseNode {
  type: 'mathBlock'
  value: string
  source?: string
}

export interface TableCellNode extends BaseNode {
  type: 'tableCell'
  children: InlineNode[]
  align?: Alignment
}

export interface TableRowNode extends BaseNode {
  type: 'tableRow'
  cells: TableCellNode[]
}

export interface TableNode extends BaseNode {
  type: 'table'
  headers: TableCellNode[]
  rows: TableRowNode[]
  alignments: Alignment[]
}

export interface ThematicBreakNode extends BaseNode {
  type: 'thematicBreak'
}

export interface RawBlockNode extends BaseNode {
  type: 'rawBlock'
  content: string
}

export type BlockNode =
  | HeadingNode
  | ParagraphNode
  | BlockquoteNode
  | ListNode
  | CodeBlockNode
  | MathBlockNode
  | TableNode
  | ThematicBreakNode
  | RawBlockNode

// Root Document
export interface DocumentStats {
  headings: number
  paragraphs: number
  codeBlocks: number
  mathExpressions: number
  tables: number
  lists: number
  characters: number
  words: number
}

export interface NormalizedDocument {
  type: 'document'
  version: 1
  metadata: {
    title?: string
    author?: string
    createdAt: string
    sourceFormat: string
  }
  children: BlockNode[]
  stats: DocumentStats
}

// Supported Input Formats
export type SupportedInputFormat =
  | 'auto'
  | 'llm-mixed'
  | 'markdown'
  | 'html'
  | 'latex'
  | 'text'
  | 'json'

// Supported Conversion Formats
export type SupportedOutputFormat =
  | 'preview'
  | 'markdown'
  | 'html'
  | 'latex'
  | 'text'
  | 'word'
  | 'pdf'
  | 'json'

export interface FormatOptions {
  markdown: {
    flavor: 'gfm' | 'commonmark'
  }
  html: {
    includeWrapper: boolean
    inlineStyles: boolean
  }
  latex: {
    documentClass: 'article' | 'report' | 'book'
    includePreamble: boolean
  }
  text: {
    preserveTableBorders: boolean
  }
}
