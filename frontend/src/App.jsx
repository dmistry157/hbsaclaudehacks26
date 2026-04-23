import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Dna, Github, AlertCircle } from 'lucide-react'
import { VariantForm } from './components/VariantForm'
import { ProteinViewer } from './components/ProteinViewer'
import { ExplanationPanel } from './components/ExplanationPanel'
import { DataCard } from './components/DataCard'
import { StatusPipeline } from './components/StatusPipeline'

const INITIAL_STEPS = {
  parse: 'idle',
  uniprot: 'idle',
  alphafold: 'idle',
  clinvar: 'idle',
  explain: 'idle',
}

export default function App() {
  const [isLoading, setIsLoading] = useState(false)
  const [stepStatuses, setStepStatuses] = useState(INITIAL_STEPS)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [explanation, setExplanation] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState(null)
  const [currentLevel, setCurrentLevel] = useState('Patient (plain English)')

  const setStep = (id, status) =>
    setStepStatuses(prev => ({ ...prev, [id]: status }))

  const handleSubmit = useCallback(async ({ gene, variant, level }) => {
    setIsLoading(true)
    setError(null)
    setAnalysisResult(null)
    setExplanation('')
    setCurrentLevel(level)
    setStepStatuses(INITIAL_STEPS)

    // Step 1: parse (instant — visual only)
    setStep('parse', 'loading')
    await tick()
    setStep('parse', 'done')

    // Step 2–4: call backend analyze endpoint
    setStep('uniprot', 'loading')

    let result
    try {
      const resp = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gene, variant }),
      })

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        throw new Error(data.detail ?? `Server error (${resp.status})`)
      }

      result = await resp.json()
    } catch (err) {
      setError(err.message)
      setStep('uniprot', 'error')
      setStep('alphafold', 'idle')
      setStep('clinvar', 'idle')
      setIsLoading(false)
      return
    }

    setStep('uniprot', 'done')
    await tick()
    setStep('alphafold', result.pdb_url ? 'done' : 'skipped')
    await tick()
    setStep('clinvar', result.clinvar_info ? 'done' : 'skipped')

    setAnalysisResult(result)
    setIsLoading(false)

    // Step 5: stream explanation
    setStep('explain', 'loading')
    setIsStreaming(true)
    setExplanation('')

    try {
      const explainResp = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gene,
          variant_info: result.variant_info,
          protein_info: result.protein_info,
          clinvar_info: result.clinvar_info,
          domains_at_site: result.domains_at_site,
          level_label: level,
        }),
      })

      const reader = explainResp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Parse SSE lines
        const lines = buffer.split('\n')
        buffer = lines.pop() // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') break
          try {
            const parsed = JSON.parse(raw)
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.text) setExplanation(prev => prev + parsed.text)
          } catch (_) {}
        }
      }
    } catch (err) {
      setError(`Explanation failed: ${err.message}`)
      setStep('explain', 'error')
    } finally {
      setIsStreaming(false)
      setStep('explain', 'done')
    }
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-zinc-950">
      {/* Nav */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-violet-600/20 border border-violet-600/30 flex items-center justify-center">
            <Dna className="h-4 w-4 text-violet-400" />
          </div>
          <span className="font-semibold text-sm text-zinc-100">Variant Explainer</span>
          <span className="text-xs text-zinc-600 hidden sm:inline">· AlphaFold · UniProt · ClinVar</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-600 hidden md:inline">Educational use only — not medical advice</span>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <aside className="w-80 flex-shrink-0 flex flex-col border-r border-zinc-800/60 overflow-y-auto">
          <div className="p-4 space-y-5 flex-1">
            <VariantForm onSubmit={handleSubmit} isLoading={isLoading} />

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex gap-2 rounded-lg bg-red-950/40 border border-red-800/50 p-3"
                >
                  <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300 leading-relaxed">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Pipeline status */}
            <AnimatePresence>
              {(isLoading || analysisResult) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="rounded-xl border border-zinc-800/60 bg-zinc-900/50 p-4"
                >
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
                    Pipeline
                  </p>
                  <StatusPipeline stepStatuses={stepStatuses} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Data card */}
            <DataCard analysisResult={analysisResult} />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* 3D Viewer — top half */}
          <div className="flex-1 min-h-0 p-3">
            <ProteinViewer
              pdbUrl={analysisResult?.pdb_url ?? null}
              highlightResidue={analysisResult?.variant_info?.protein_position ?? null}
              isLoading={isLoading}
            />
          </div>

          {/* Explanation — bottom half, slides up */}
          <AnimatePresence>
            {(explanation || isStreaming) && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: '40%', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="flex-shrink-0 overflow-hidden px-3 pb-3"
              >
                <ExplanationPanel
                  text={explanation}
                  isStreaming={isStreaming}
                  levelLabel={currentLevel}
                  hasResult={!!explanation}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  )
}

// Tiny helper: yield to the microtask queue so React can flush state updates
function tick(ms = 120) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
