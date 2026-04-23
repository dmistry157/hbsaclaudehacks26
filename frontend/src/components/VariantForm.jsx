import { useState } from 'react'
import { motion } from 'framer-motion'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { Dna, Zap, AlertTriangle } from 'lucide-react'
import { PRESETS, READING_LEVELS } from '../lib/utils'
import { cn } from '../lib/utils'

export function VariantForm({ onSubmit, isLoading }) {
  const [gene, setGene] = useState('')
  const [variant, setVariant] = useState('')
  const [level, setLevel] = useState(READING_LEVELS[0])
  const [errors, setErrors] = useState({})

  const applyPreset = (preset) => {
    setGene(preset.gene)
    setVariant(preset.variant)
    setErrors({})
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!gene.trim()) errs.gene = 'Required'
    if (!variant.trim()) errs.variant = 'Required'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    onSubmit({ gene: gene.trim().toUpperCase(), variant: variant.trim(), level })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Presets */}
      <div>
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Demo presets</p>
        <div className="space-y-1.5">
          {PRESETS.map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() => applyPreset(preset)}
              className={cn(
                'w-full text-left rounded-lg border px-3 py-2 transition-all duration-150',
                'border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-800/60',
                gene === preset.gene && variant === preset.variant
                  ? 'border-violet-700/60 bg-violet-950/30 hover:border-violet-600/60'
                  : '',
              )}
            >
              <div className="text-xs font-mono text-zinc-200">{preset.label}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{preset.tag}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-zinc-800" />

      {/* Inputs */}
      <Input
        label="Gene symbol"
        placeholder="e.g. BRCA1"
        value={gene}
        onChange={e => setGene(e.target.value)}
        error={errors.gene}
        className="font-mono uppercase"
      />

      <Input
        label="Variant notation"
        placeholder="e.g. c.5266dupC or p.Glu6Val"
        value={variant}
        onChange={e => setVariant(e.target.value)}
        error={errors.variant}
        className="font-mono"
      />

      {/* Reading level */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Explanation level</p>
        <div className="grid grid-cols-1 gap-1.5">
          {READING_LEVELS.map(l => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              className={cn(
                'rounded-lg border px-3 py-2 text-xs text-left transition-all duration-150',
                level === l
                  ? 'border-violet-700/60 bg-violet-950/30 text-violet-300'
                  : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300',
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Dna className="h-4 w-4 animate-spin" />
            Analyzing…
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" />
            Explain this variant
          </>
        )}
      </Button>

      <p className="text-xs text-zinc-700 leading-relaxed">
        Not medical advice. Results are for educational purposes only. Always consult a healthcare professional.
      </p>
    </form>
  )
}
