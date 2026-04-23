import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Card, CardHeader, CardBody } from './ui/Card'
import { BookOpen, Stethoscope, Baby } from 'lucide-react'

const LEVEL_ICONS = {
  'Patient (plain English)': BookOpen,
  'Clinician (clinical)': Stethoscope,
  'Child (simple)': Baby,
}

export function ExplanationPanel({ text, isStreaming, levelLabel, hasResult }) {
  const Icon = LEVEL_ICONS[levelLabel] ?? BookOpen

  return (
    <AnimatePresence>
      {(hasResult || isStreaming) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="h-full flex flex-col"
        >
          <Card className="flex flex-col h-full">
            <CardHeader>
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5" />
                {levelLabel}
              </span>
              {isStreaming && (
                <span className="flex items-center gap-1.5 text-xs text-violet-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
                  Generating…
                </span>
              )}
            </CardHeader>
            <CardBody className="flex-1 overflow-y-auto">
              <div className="explanation-prose text-sm leading-relaxed">
                <ReactMarkdown>{text + (isStreaming ? ' ▌' : '')}</ReactMarkdown>
              </div>
            </CardBody>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
