import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const PRESETS = [
  { label: 'BRCA1 — c.5266dupC', gene: 'BRCA1', variant: 'c.5266dupC', tag: 'Hereditary breast cancer' },
  { label: 'HBB — p.Glu6Val', gene: 'HBB', variant: 'p.Glu6Val', tag: 'Sickle cell disease' },
  { label: 'CFTR — p.Phe508del', gene: 'CFTR', variant: 'p.Phe508del', tag: 'Cystic fibrosis' },
]

export const READING_LEVELS = [
  'Patient (plain English)',
  'Clinician (clinical)',
  'Child (simple)',
]

export function significanceColor(sig) {
  if (!sig) return { text: 'text-zinc-400', bg: 'bg-zinc-800', border: 'border-zinc-700', dot: 'bg-zinc-500' }
  const s = sig.toLowerCase()
  if (s.includes('pathogenic') && !s.includes('benign'))
    return { text: 'text-red-300', bg: 'bg-red-950/50', border: 'border-red-800/60', dot: 'bg-red-400' }
  if (s.includes('benign'))
    return { text: 'text-emerald-300', bg: 'bg-emerald-950/50', border: 'border-emerald-800/60', dot: 'bg-emerald-400' }
  if (s.includes('uncertain') || s.includes('vus'))
    return { text: 'text-amber-300', bg: 'bg-amber-950/50', border: 'border-amber-800/60', dot: 'bg-amber-400' }
  return { text: 'text-zinc-300', bg: 'bg-zinc-800/50', border: 'border-zinc-700', dot: 'bg-zinc-400' }
}
