import { create } from 'zustand'
import type { NormalizedDocument, SupportedOutputFormat, FormatOptions } from '../core/types'
import { parseMarkdown } from '../parsers/markdown'
import { detectInputFormat, type DetectionResult } from '../parsers/detector'
import { createEmptyDocument } from '../core/stats'

export const SAMPLE_DOCUMENT = `# Machine Learning Fundamentals

Machine learning is **a subset of artificial intelligence** that enables systems to learn from data.

> "The goal of machine learning is not to replace humans, but to amplify human intelligence."

## 1. Key Mathematical Formulations

The linear regression cost function (Mean Squared Error) is defined as:

$$
J(\\theta) = \\frac{1}{2m} \\sum_{i=1}^{m} (h_\\theta(x^{(i)}) - y^{(i)})^2
$$

The famous mass-energy equivalence $E = mc^2$ shows the relationship between mass and energy.

## 2. Model Performance Benchmarks

| Model Architecture | Parameters | Accuracy (%) | Inference (ms) |
|:---|:---:|---:|---:|
| Transformer-Base | 110M | 94.2 | 14.5 |
| Vision-Transformer | 86M | 92.8 | 11.2 |
| LightConvNet | 12M | 88.5 | 3.1 |

## 3. Implementation Example

Here is a clean PyTorch module definition:

\`\`\`python
import torch
import torch.nn as nn

class LinearModel(nn.Module):
    def __init__(self, in_features: int, out_features: int):
        super().__init__()
        self.linear = nn.Linear(in_features, out_features)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return torch.relu(self.linear(x))

model = LinearModel(in_features=128, out_features=10)
print(f"Parameters: {sum(p.numel() for p in model.parameters())}")
\`\`\`

## 4. Key Advantages
- **Privacy-First:** Deterministic local execution.
- **Interoperability:** Markdown $\\rightarrow$ AST $\\rightarrow$ Multiple formats.
- **Zero Latency:** Live real-time parsing.
`

interface ConverterStore {
  // Input
  inputContent: string
  setInputContent: (content: string) => void

  // Parsing & State
  parsedDocument: NormalizedDocument
  detectionResult: DetectionResult

  // Options
  selectedFormat: SupportedOutputFormat
  setSelectedFormat: (format: SupportedOutputFormat) => void

  formatOptions: FormatOptions
  updateFormatOptions: <K extends keyof FormatOptions>(key: K, options: Partial<FormatOptions[K]>) => void

  // Preferences
  themeMode: 'dark' | 'light'
  toggleThemeMode: () => void

  motionMode: 'full' | 'reduced' | 'off'
  setMotionMode: (mode: 'full' | 'reduced' | 'off') => void

  // Actions
  loadSample: () => void
  clearDocument: () => void
}

const initialDoc = parseMarkdown(SAMPLE_DOCUMENT)
const initialDetection = detectInputFormat(SAMPLE_DOCUMENT)

export const useConverterStore = create<ConverterStore>((set, get) => ({
  inputContent: SAMPLE_DOCUMENT,
  parsedDocument: initialDoc,
  detectionResult: initialDetection,

  selectedFormat: 'preview',
  setSelectedFormat: (format) => set({ selectedFormat: format }),

  formatOptions: {
    markdown: { flavor: 'gfm' },
    html: { includeWrapper: true, inlineStyles: false },
    latex: { documentClass: 'article', includePreamble: true },
    text: { preserveTableBorders: true },
  },

  updateFormatOptions: (key, options) =>
    set((state) => ({
      formatOptions: {
        ...state.formatOptions,
        [key]: { ...state.formatOptions[key], ...options },
      },
    })),

  themeMode: 'dark',
  toggleThemeMode: () => {
    const next = get().themeMode === 'dark' ? 'light' : 'dark'
    if (typeof document !== 'undefined') {
      if (next === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
    set({ themeMode: next })
  },

  motionMode: 'full',
  setMotionMode: (mode) => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('motion-off', 'motion-reduced')
      if (mode === 'off') {
        document.documentElement.classList.add('motion-off')
      } else if (mode === 'reduced') {
        document.documentElement.classList.add('motion-reduced')
      }
    }
    set({ motionMode: mode })
  },

  setInputContent: (content: string) => {
    const doc = parseMarkdown(content)
    const detection = detectInputFormat(content)
    set({
      inputContent: content,
      parsedDocument: doc,
      detectionResult: detection,
    })
  },

  loadSample: () => {
    const doc = parseMarkdown(SAMPLE_DOCUMENT)
    const detection = detectInputFormat(SAMPLE_DOCUMENT)
    set({
      inputContent: SAMPLE_DOCUMENT,
      parsedDocument: doc,
      detectionResult: detection,
    })
  },

  clearDocument: () => {
    set({
      inputContent: '',
      parsedDocument: createEmptyDocument(),
      detectionResult: detectInputFormat(''),
    })
  },
}))
