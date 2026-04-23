import { motion, AnimatePresence } from 'framer-motion'
import { Check, Loader2, AlertCircle, Circle } from 'lucide-react'

const STEPS = [
  { id: 'parse',     label: 'Parsing variant' },
  { id: 'uniprot',   label: 'UniProt lookup' },
  { id: 'alphafold', label: 'AlphaFold structure' },
  { id: 'clinvar',   label: 'ClinVar data' },
  { id: 'explain',   label: 'Generating explanation' },
]

// status: 'idle' | 'loading' | 'done' | 'error' | 'skipped'
export function StatusPipeline({ stepStatuses }) {
  return (
    <div className="space-y-2">
      {STEPS.map((step, i) => {
        const status = stepStatuses[step.id] ?? 'idle'
        return (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.25 }}
            className="flex items-center gap-3"
          >
            <StepIcon status={status} />
            <span
              className={
                status === 'done'
                  ? 'text-zinc-300 text-sm'
                  : status === 'loading'
                  ? 'text-violet-300 text-sm font-medium'
                  : status === 'error'
                  ? 'text-red-400 text-sm'
                  : 'text-zinc-600 text-sm'
              }
            >
              {step.label}
            </span>
          </motion.div>
        )
      })}
    </div>
  )
}

function StepIcon({ status }) {
  if (status === 'done')
    return (
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        className="h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0"
      >
        <Check className="h-3 w-3 text-emerald-400" />
      </motion.div>
    )

  if (status === 'loading')
    return (
      <div className="h-5 w-5 flex items-center justify-center flex-shrink-0">
        <Loader2 className="h-4 w-4 text-violet-400 animate-spin" />
      </div>
    )

  if (status === 'error')
    return (
      <div className="h-5 w-5 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center flex-shrink-0">
        <AlertCircle className="h-3 w-3 text-red-400" />
      </div>
    )

  if (status === 'skipped')
    return (
      <div className="h-5 w-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0">
        <span className="h-1.5 w-1.5 rounded-full bg-zinc-600" />
      </div>
    )

  // idle
  return (
    <div className="h-5 w-5 rounded-full border border-zinc-700 flex items-center justify-center flex-shrink-0">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
    </div>
  )
}
