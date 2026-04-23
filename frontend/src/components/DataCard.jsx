import { motion } from 'framer-motion'
import { Card, CardHeader, CardBody } from './ui/Card'
import { Badge } from './ui/Badge'
import { significanceColor } from '../lib/utils'
import { Dna, MapPin, FlaskConical, Layers } from 'lucide-react'

export function DataCard({ analysisResult }) {
  if (!analysisResult) return null

  const { variant_info, protein_info, clinvar_info, domains_at_site } = analysisResult
  const sigColors = significanceColor(clinvar_info?.clinical_significance)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      <Card>
        <CardHeader>
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
            <Dna className="h-3.5 w-3.5" />
            Variant Details
          </span>
          {clinvar_info?.clinical_significance && (
            <Badge
              dot
              dotColor={sigColors.dot}
              className={`${sigColors.bg} ${sigColors.text} border ${sigColors.border}`}
            >
              {clinvar_info.clinical_significance}
            </Badge>
          )}
        </CardHeader>
        <CardBody className="space-y-3">
          {/* Protein row */}
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Protein" value={protein_info.protein_name} mono={false} />
            <Metric label="UniProt" value={protein_info.uniprot_id} />
          </div>

          {/* Variant row */}
          <div className="grid grid-cols-2 gap-2">
            <Metric label="Variant type" value={variant_info.type} />
            <Metric
              label="Residue"
              value={
                variant_info.protein_position
                  ? `${variant_info.ref_aa ?? '?'}${variant_info.protein_position}${variant_info.alt_aa ?? ''}`
                  : 'unknown'
              }
            />
          </div>

          {/* Length */}
          <Metric
            label="Protein length"
            value={`${protein_info.length} amino acids`}
          />

          {/* Domains */}
          {domains_at_site?.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Layers className="h-3 w-3" /> Domains at variant site
              </p>
              <div className="space-y-1">
                {domains_at_site.map((d, i) => (
                  <div key={i} className="text-xs rounded-md bg-zinc-800/60 px-2.5 py-1.5">
                    <span className="text-violet-300 font-medium">{d.type}</span>
                    <span className="text-zinc-400"> — {d.description}</span>
                    <span className="text-zinc-600 ml-1">({d.start}–{d.end})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ClinVar conditions */}
          {clinvar_info?.conditions?.length > 0 && (
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <FlaskConical className="h-3 w-3" /> Associated conditions
              </p>
              <div className="space-y-1">
                {clinvar_info.conditions.slice(0, 4).map((c, i) => (
                  <div key={i} className="text-xs text-zinc-300 flex items-start gap-1.5">
                    <span className="text-zinc-600 mt-0.5">•</span>
                    <span>{c}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ClinVar review status */}
          {clinvar_info?.review_status && (
            <p className="text-xs text-zinc-600">
              ClinVar review: {clinvar_info.review_status}
              {clinvar_info.last_evaluated && ` · Last evaluated ${clinvar_info.last_evaluated}`}
            </p>
          )}
        </CardBody>
      </Card>
    </motion.div>
  )
}

function Metric({ label, value, mono = true }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm text-zinc-200 ${mono ? 'font-mono' : ''} truncate`} title={value}>
        {value ?? '—'}
      </p>
    </div>
  )
}
