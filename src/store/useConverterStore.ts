import { create } from 'zustand'
import type {
  NormalizedDocument,
  SupportedInputFormat,
  SupportedOutputFormat,
  FormatOptions,
} from '../core/types'
import { parseUniversalDocument, detectInputFormat } from '../parsers'
import type { DetectionResult } from '../parsers/detector'
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

export const LLM_SAMPLE_DOCUMENT = `# AI Model Reasoning Output: Quantum Wave Equation

Here is the exact derivation combining differential geometry, statistical physics, and discrete grid simulation.

> [!NOTE]
> The Hamiltonian operator $\\hat{H}$ governs state progression across unitary Hilbert space $\\mathcal{H}$.

### 1. Relativistic Dispersion & Action Principle

The relativistic energy-momentum invariant is written as:

\\[
E^2 = (pc)^2 + (m_0 c^2)^2
\\]

In field path integral formulation, the transition amplitude between initial $|\\psi_i\\rangle$ and final $|\\psi_f\\rangle$ states is:

$$
\\mathcal{Z} = \\int \\mathcal{D}\\phi \\, \\exp\\left( \\frac{i}{\\hbar} \\int d^4x \\, \\mathcal{L}[\\phi, \\partial_\\mu \\phi] \\right)
$$

### 2. Numerical Convergence Benchmark
+-------------------+------------+-------------+---------------+
| Solver Engine     | Grid Nodes | Error (L2)  | GPU Time (ms) |
+===================+============+=============+===============+
| Runge-Kutta 4th   | 256x256    | 1.42e-5     | 18.4          |
| Symplectic Verlet | 512x512    | 8.19e-7     | 42.1          |
| Spectral Fourier  | 1024x1024  | 3.05e-9     | 67.8          |
+-------------------+------------+-------------+---------------+

<div style="padding: 10px; border-left: 3px solid #10b981;">
  <strong>Performance Note:</strong> The spectral Fourier solver achieves <em>exponential spectral convergence</em> when periodic boundary conditions are strictly enforced.
</div>

### 3. Simulation Kernel (PyTorch CUDA)

\`\`\`python
import torch

@torch.compile
def quantum_step(psi: torch.Tensor, V: torch.Tensor, dt: float, dx: float) -> torch.Tensor:
    # Split-step Fourier kinetic propagation
    k = 2 * torch.pi * torch.fft.fftfreq(psi.shape[-1], d=dx, device=psi.device)
    kinetic_phase = torch.exp(-1j * (k ** 2) * dt / 2.0)
    potential_phase = torch.exp(-1j * V * dt / 2.0)
    
    psi = psi * potential_phase
    psi = torch.fft.ifft(torch.fft.fft(psi) * kinetic_phase)
    return psi * potential_phase
\`\`\`
`

interface ConverterStore {
  // Input
  inputContent: string
  setInputContent: (content: string, format?: SupportedInputFormat) => void
  inputFormat: SupportedInputFormat
  setInputFormat: (format: SupportedInputFormat) => void

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

  // Line Tracking & Sync Scroll
  activeLine: number | null
  setActiveLine: (line: number | null) => void
  syncScrollEnabled: boolean
  setSyncScrollEnabled: (enabled: boolean) => void

  // Actions
  loadSample: () => void
  loadLlmSample: () => void
  clearDocument: () => void
}

const initialDoc = parseUniversalDocument(SAMPLE_DOCUMENT, 'auto')
const initialDetection = detectInputFormat(SAMPLE_DOCUMENT)

export const useConverterStore = create<ConverterStore>((set, get) => ({
  inputContent: SAMPLE_DOCUMENT,
  inputFormat: 'auto',
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

  themeMode: (typeof window !== 'undefined' && (localStorage.getItem('convertion_theme') as 'dark' | 'light')) || 'dark',
  toggleThemeMode: () => {
    const next = get().themeMode === 'dark' ? 'light' : 'dark'
    if (typeof document !== 'undefined') {
      if (next === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      try {
        localStorage.setItem('convertion_theme', next)
      } catch {}
    }
    set({ themeMode: next })
  },

  motionMode: 'full',
  setMotionMode: (mode) => {
    set({ motionMode: mode })
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('motion-off', 'motion-reduced')
      if (mode === 'off') document.documentElement.classList.add('motion-off')
      if (mode === 'reduced') document.documentElement.classList.add('motion-reduced')
    }
  },

  activeLine: 1,
  setActiveLine: (line) => set({ activeLine: line }),
  syncScrollEnabled: true,
  setSyncScrollEnabled: (enabled) => set({ syncScrollEnabled: enabled }),

  setInputFormat: (format: SupportedInputFormat) => {
    const content = get().inputContent
    const doc = parseUniversalDocument(content, format)
    const detection = detectInputFormat(content)
    set({
      inputFormat: format,
      parsedDocument: doc,
      detectionResult: detection,
    })
  },

  setInputContent: (content: string, format?: SupportedInputFormat) => {
    const currentFormat = format || get().inputFormat
    const doc = parseUniversalDocument(content, currentFormat)
    const detection = detectInputFormat(content)
    set({
      inputContent: content,
      parsedDocument: doc,
      detectionResult: detection,
    })
  },

  loadSample: () => {
    const format = 'markdown'
    const doc = parseUniversalDocument(SAMPLE_DOCUMENT, format)
    const detection = detectInputFormat(SAMPLE_DOCUMENT)
    set({
      inputContent: SAMPLE_DOCUMENT,
      inputFormat: format,
      parsedDocument: doc,
      detectionResult: detection,
    })
  },

  loadLlmSample: () => {
    const format = 'llm-mixed'
    const doc = parseUniversalDocument(LLM_SAMPLE_DOCUMENT, format)
    const detection = detectInputFormat(LLM_SAMPLE_DOCUMENT)
    set({
      inputContent: LLM_SAMPLE_DOCUMENT,
      inputFormat: format,
      parsedDocument: doc,
      detectionResult: detection,
    })
  },

  clearDocument: () => {
    set({
      inputContent: '',
      inputFormat: 'auto',
      parsedDocument: createEmptyDocument(),
      detectionResult: detectInputFormat(''),
    })
  },
}))
