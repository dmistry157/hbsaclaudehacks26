import { useState, useCallback, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// ─── Constants ────────────────────────────────────────────────────────────────
const PRESETS = [
  { label: 'BRCA1 — c.5266dupC', gene: 'BRCA1', variant: 'c.5266dupC', tag: 'Hereditary breast cancer' },
  { label: 'HBB — p.Glu6Val',    gene: 'HBB',   variant: 'p.Glu6Val',  tag: 'Sickle cell disease'     },
  { label: 'CFTR — p.Phe508del', gene: 'CFTR',  variant: 'p.Phe508del',tag: 'Cystic fibrosis'          },
]
const READING_LEVELS = ['Patient (plain English)', 'Clinician (clinical)', 'Child (simple)']
const INITIAL_STEPS = { parse:'idle', uniprot:'idle', alphafold:'idle', clinvar:'idle', explain:'idle' }

function significanceColor(sig) {
  if (!sig) return { text:'#b8a88a', bg:'rgba(220,210,195,0.6)', border:'rgba(120,90,40,0.2)', dot:'#9a8a6a' }
  const s = sig.toLowerCase()
  if (s.includes('pathogenic') && !s.includes('benign'))
    return { text:'#8a2010', bg:'rgba(255,235,230,0.9)', border:'rgba(196,102,74,0.4)', dot:'#c4664a' }
  if (s.includes('benign'))
    return { text:'#2a5020', bg:'rgba(220,240,210,0.9)', border:'rgba(90,140,60,0.4)',  dot:'#6a9840' }
  if (s.includes('uncertain') || s.includes('vus'))
    return { text:'#6a4a10', bg:'rgba(255,240,210,0.9)', border:'rgba(180,130,40,0.4)', dot:'#c4a040' }
  return   { text:'#5a4030', bg:'rgba(220,210,195,0.6)', border:'rgba(120,90,40,0.2)',  dot:'#9a8a6a' }
}

// ─── Icons ────────────────────────────────────────────────────────────────────
function DnaIcon({ size=14 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#8a7060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 15c6.667-6 13.333 0 20-6"/><path d="M9 22c1.798-1.998 2.518-3.995 2.807-5.993"/><path d="M15 2c-1.798 1.998-2.518 3.995-2.807 5.993"/><path d="m17 6-2.5-2.5"/><path d="m14 8-1-1"/><path d="m7 18 2.5 2.5"/><path d="m10 16 1 1"/><path d="m2 15 5 5"/><path d="m17 6 5-5"/></svg>
}

// ─── Status Pipeline ──────────────────────────────────────────────────────────
const PIPELINE_STEPS = [
  { id:'parse',     label:'Parsing variant'       },
  { id:'uniprot',   label:'UniProt lookup'         },
  { id:'alphafold', label:'AlphaFold structure'    },
  { id:'clinvar',   label:'ClinVar data'           },
  { id:'explain',   label:'Generating explanation' },
]

function StepIcon({ status }) {
  if (status==='done') return (
    <div style={{width:20,height:20,borderRadius:'50%',background:'rgba(107,124,69,0.15)',border:'1px solid rgba(143,168,90,0.5)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
      <svg width="10" height="10" viewBox="0 0 10 10"><polyline points="1.5,5 4,7.5 8.5,2.5" fill="none" stroke="#5a7a30" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
  )
  if (status==='loading') return (
    <div style={{width:20,height:20,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
      <div style={{width:14,height:14,border:'2px solid rgba(184,135,90,0.25)',borderTop:'2px solid #b8875a',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
    </div>
  )
  if (status==='error') return (
    <div style={{width:20,height:20,borderRadius:'50%',background:'rgba(196,102,74,0.12)',border:'1px solid rgba(196,102,74,0.4)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
      <svg width="10" height="10" viewBox="0 0 10 10"><line x1="2" y1="2" x2="8" y2="8" stroke="#c4664a" strokeWidth="1.5" strokeLinecap="round"/><line x1="8" y1="2" x2="2" y2="8" stroke="#c4664a" strokeWidth="1.5" strokeLinecap="round"/></svg>
    </div>
  )
  if (status==='skipped') return (
    <div style={{width:20,height:20,borderRadius:'50%',background:'rgba(180,160,130,0.15)',border:'1px solid rgba(120,90,40,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
      <div style={{width:5,height:5,borderRadius:'50%',background:'rgba(120,90,40,0.25)'}}/>
    </div>
  )
  return (
    <div style={{width:20,height:20,borderRadius:'50%',border:'1px solid rgba(120,90,40,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
      <div style={{width:5,height:5,borderRadius:'50%',background:'rgba(120,90,40,0.2)'}}/>
    </div>
  )
}

function StatusPipeline({ stepStatuses }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:8}}>
      {PIPELINE_STEPS.map(step => {
        const s = stepStatuses[step.id] || 'idle'
        return (
          <div key={step.id} style={{display:'flex',alignItems:'center',gap:10}}>
            <StepIcon status={s}/>
            <span style={{fontSize:13,color: s==='done'?'#2a1a08': s==='loading'?'#b8875a': s==='error'?'#c4664a':'#b8a890'}}>
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Data Card ────────────────────────────────────────────────────────────────
function DataCard({ analysisResult }) {
  if (!analysisResult) return null
  const { variant_info, protein_info, clinvar_info, domains_at_site } = analysisResult
  const sc = significanceColor(clinvar_info?.clinical_significance)

  return (
    <div style={{borderRadius:12,border:'1px solid rgba(120,90,40,0.16)',background:'rgba(245,240,232,0.95)',animation:'fadeUp 0.35s ease-out both'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px',borderBottom:'1px solid rgba(120,90,40,0.12)'}}>
        <span style={{fontSize:11,fontWeight:600,color:'#8a7060',textTransform:'uppercase',letterSpacing:'0.05em',display:'flex',alignItems:'center',gap:6}}>
          <DnaIcon/> Variant Details
        </span>
        {clinvar_info?.clinical_significance && (
          <span style={{display:'inline-flex',alignItems:'center',gap:5,borderRadius:9999,padding:'2px 10px',fontSize:11,fontWeight:500,background:sc.bg,color:sc.text,border:`1px solid ${sc.border}`}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:sc.dot,flexShrink:0}}/>
            {clinvar_info.clinical_significance}
          </span>
        )}
      </div>
      <div style={{padding:16}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          <Metric label="Protein" value={protein_info.protein_name} mono={false}/>
          <Metric label="UniProt" value={protein_info.uniprot_id}/>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
          <Metric label="Variant type" value={variant_info.type}/>
          <Metric label="Residue" value={variant_info.protein_position ? `${variant_info.ref_aa??'?'}${variant_info.protein_position}${variant_info.alt_aa??''}` : 'unknown'}/>
        </div>
        <Metric label="Protein length" value={`${protein_info.length} amino acids`}/>
        {domains_at_site?.length > 0 && (
          <div style={{marginTop:14}}>
            <p style={{fontSize:11,color:'#8a7060',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>Domains at variant site</p>
            {domains_at_site.map((d,i)=>(
              <div key={i} style={{fontSize:12,background:'rgba(120,90,40,0.07)',border:'1px solid rgba(120,90,40,0.12)',borderRadius:6,padding:'6px 10px',marginBottom:4}}>
                <span style={{color:'#b8875a',fontWeight:500}}>{d.type}</span>
                <span style={{color:'#8a7060'}}> — {d.description}</span>
                <span style={{color:'#b0a090',marginLeft:4}}>({d.start}–{d.end})</span>
              </div>
            ))}
          </div>
        )}
        {clinvar_info?.conditions?.length > 0 && (
          <div style={{marginTop:14}}>
            <p style={{fontSize:11,color:'#8a7060',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>Associated conditions</p>
            {clinvar_info.conditions.slice(0,4).map((c,i)=>(
              <div key={i} style={{fontSize:12,color:'#4a3020',display:'flex',gap:6,marginBottom:3}}>
                <span style={{color:'#b0a090',flexShrink:0}}>•</span><span>{c}</span>
              </div>
            ))}
          </div>
        )}
        {clinvar_info?.review_status && (
          <p style={{fontSize:11,color:'#b0a090',marginTop:12}}>
            ClinVar review: {clinvar_info.review_status}
            {clinvar_info.last_evaluated && ` · Last evaluated ${clinvar_info.last_evaluated}`}
          </p>
        )}
      </div>
    </div>
  )
}

function Metric({ label, value, mono=true }) {
  return (
    <div>
      <p style={{fontSize:11,color:'#8a7060',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:3}}>{label}</p>
      <p style={{fontSize:13,color:'#2a1a08',fontFamily:mono?'Geist Mono, monospace':'inherit',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={value}>{value??'—'}</p>
    </div>
  )
}

// ─── Protein Viewer (3Dmol.js) ────────────────────────────────────────────────
function ProteinViewer({ pdbUrl, highlightResidue, isLoading }) {
  const containerRef = useRef(null)
  const viewerRef = useRef(null)
  const [spinning, setSpinning] = useState(false)
  const [structureLoaded, setStructureLoaded] = useState(false)
  const [loadError, setLoadError] = useState(null)

  // Init 3Dmol viewer once
  useEffect(() => {
    if (!containerRef.current) return
    const $3Dmol = window.$3Dmol
    if (!$3Dmol) return
    const viewer = $3Dmol.createViewer(containerRef.current, {
      backgroundColor: 0xede8de,
      antialias: true,
    })
    viewerRef.current = viewer
    return () => { try { viewer.clear() } catch (_) {} }
  }, [])

  // Load structure when pdbUrl changes
  useEffect(() => {
    const viewer = viewerRef.current
    const $3Dmol = window.$3Dmol
    if (!viewer || !$3Dmol) return
    if (!pdbUrl) {
      viewer.clear(); viewer.render()
      setStructureLoaded(false); setLoadError(null)
      return
    }
    setLoadError(null); setStructureLoaded(false)
    fetch(pdbUrl)
      .then(r => { if (!r.ok) throw new Error(`Failed to fetch PDB (${r.status})`); return r.text() })
      .then(pdbText => {
        viewer.clear()
        viewer.addModel(pdbText, 'pdb')
        viewer.setStyle({}, { cartoon: { colorscheme: 'ssJmol', opacity: 0.9 } })
        if (highlightResidue) {
          viewer.setStyle(
            { resi: highlightResidue },
            { cartoon: { color: '#c4664a' }, sphere: { color: '#c4664a', radius: 0.8 } }
          )
          viewer.addLabel(`Residue ${highlightResidue}`, {
            resi: highlightResidue,
            backgroundColor: '#7a2010',
            fontColor: '#fdd9cc',
            fontSize: 11,
            borderColor: '#c4664a',
            borderThickness: 0.5,
            backgroundOpacity: 0.85,
            inFront: true,
          })
          viewer.zoomTo({ resi: highlightResidue }, 1200)
        } else {
          viewer.zoomTo()
        }
        viewer.spin('y', 0.5); setSpinning(true)
        viewer.render(); setStructureLoaded(true)
      })
      .catch(err => setLoadError(err.message))
  }, [pdbUrl, highlightResidue])

  const toggleSpin = () => {
    const v = viewerRef.current; if (!v) return
    if (spinning) { v.spin(false) } else { v.spin('y', 0.5) }
    setSpinning(s => !s)
  }
  const zoomIn  = () => viewerRef.current?.zoom(1.25, 400)
  const zoomOut = () => viewerRef.current?.zoom(0.8,  400)
  const reset   = () => {
    const v = viewerRef.current; if (!v) return
    highlightResidue ? v.zoomTo({ resi: highlightResidue }, 600) : v.zoomTo({}, 600)
    v.render()
  }

  const btnStyle = {
    width:28, height:28, borderRadius:6,
    background:'rgba(245,240,232,0.85)', border:'1px solid rgba(120,90,40,0.2)',
    backdropFilter:'blur(4px)', display:'flex', alignItems:'center', justifyContent:'center',
    cursor:'pointer', color:'#8a7060', transition:'all 0.15s', fontSize:13,
  }

  return (
    <div style={{position:'relative', width:'100%', height:'100%', borderRadius:10, overflow:'hidden', background:'#ede8de'}}>
      {/* 3Dmol mount */}
      <div ref={containerRef} style={{position:'absolute', inset:0}}/>

      {/* Loading overlay */}
      {isLoading && !structureLoaded && (
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,background:'rgba(237,232,222,0.9)',zIndex:10}}>
          <div style={{width:40,height:40,border:'3px solid rgba(184,135,90,0.2)',borderTop:'3px solid #b8875a',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
          <p style={{fontSize:12,color:'#b0a080',fontFamily:'Geist Mono, monospace'}}>Fetching AlphaFold structure…</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !pdbUrl && !loadError && (
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14}}>
          <div style={{width:56,height:56,borderRadius:'50%',background:'rgba(143,168,90,0.12)',border:'1px solid rgba(143,168,90,0.3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <DnaIcon size={24}/>
          </div>
          <p style={{fontSize:13,color:'#b0a080',textAlign:'center',maxWidth:200}}>Enter a variant to visualize its 3D structure</p>
        </div>
      )}

      {/* Error state */}
      {loadError && (
        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8}}>
          <p style={{fontSize:13,color:'#c4664a'}}>Structure unavailable</p>
          <p style={{fontSize:11,color:'#b0a080',fontFamily:'Geist Mono, monospace',maxWidth:240,textAlign:'center'}}>{loadError}</p>
        </div>
      )}

      {/* Controls */}
      {structureLoaded && (
        <div style={{position:'absolute',bottom:10,right:10,display:'flex',gap:6,zIndex:20}}>
          {[
            { label:'＋', action: zoomIn,     title:'Zoom in'  },
            { label:'－', action: zoomOut,    title:'Zoom out' },
            { label:'↺',  action: reset,      title:'Reset'    },
            { label: spinning ? '⏸' : '▶', action: toggleSpin, title: spinning ? 'Pause' : 'Spin' },
          ].map(({ label, action, title }) => (
            <button key={title} onClick={action} title={title} style={btnStyle}
              onMouseEnter={e=>{ e.currentTarget.style.background='rgba(245,240,232,1)'; e.currentTarget.style.color='#2a1a08' }}
              onMouseLeave={e=>{ e.currentTarget.style.background='rgba(245,240,232,0.85)'; e.currentTarget.style.color='#8a7060' }}>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Residue badge */}
      {structureLoaded && highlightResidue && (
        <div style={{position:'absolute',top:10,left:10,zIndex:20,display:'flex',alignItems:'center',gap:6,borderRadius:6,background:'rgba(196,102,74,0.15)',border:'1px solid rgba(196,102,74,0.4)',backdropFilter:'blur(4px)',padding:'4px 10px'}}>
          <span style={{width:7,height:7,borderRadius:'50%',background:'#c4664a',animation:'pulse 1.5s ease-in-out infinite'}}/>
          <span style={{fontSize:11,color:'#8a2010',fontFamily:'Geist Mono, monospace'}}>Residue {highlightResidue}</span>
        </div>
      )}
    </div>
  )
}

// ─── Explanation Panel ────────────────────────────────────────────────────────
function SimpleMarkdown({ text }) {
  const lines = text.split('\n')
  const elements = []
  let key = 0
  for (const line of lines) {
    if (line.startsWith('## ')) {
      elements.push(<h2 key={key++} style={{fontSize:14,fontWeight:600,color:'#2a1a08',margin:'0 0 10px',fontStyle:'italic'}}>{line.slice(3)}</h2>)
    } else if (line === '') {
      elements.push(<div key={key++} style={{height:6}}/>)
    } else {
      const parts = line.split(/(\*\*[^*]+\*\*)/)
      elements.push(
        <p key={key++} style={{fontSize:13,color:'#6a5040',lineHeight:1.7,margin:'0 0 4px'}}>
          {parts.map((p,i) => p.startsWith('**') ? <strong key={i} style={{color:'#2a1a08',fontWeight:600}}>{p.slice(2,-2)}</strong> : p)}
        </p>
      )
    }
  }
  return <div>{elements}</div>
}

function ExplanationPanel({ text, isStreaming, levelLabel }) {
  const icons = { 'Patient (plain English)': '◉', 'Clinician (clinical)': '⊕', 'Child (simple)': '◎' }
  return (
    <div style={{borderRadius:12,border:'1px solid rgba(120,90,40,0.16)',background:'rgba(245,240,232,0.95)',display:'flex',flexDirection:'column',height:'100%'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px',borderBottom:'1px solid rgba(120,90,40,0.12)'}}>
        <span style={{fontSize:11,fontWeight:600,color:'#8a7060',textTransform:'uppercase',letterSpacing:'0.05em'}}>
          {icons[levelLabel]??'◉'} {levelLabel}
        </span>
        {isStreaming && (
          <span style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:'#b8875a'}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#b8875a',animation:'pulse 1.5s ease-in-out infinite'}}/>
            Generating…
          </span>
        )}
      </div>
      <div style={{padding:16,flex:1,overflowY:'auto'}}>
        <SimpleMarkdown text={text + (isStreaming?' ▌':'')}/>
      </div>
    </div>
  )
}

// ─── Variant Form ─────────────────────────────────────────────────────────────
function VariantForm({ onSubmit, isLoading }) {
  const [gene, setGene] = useState('')
  const [variant, setVariant] = useState('')
  const [level, setLevel] = useState(READING_LEVELS[0])
  const [errors, setErrors] = useState({})

  const applyPreset = (p) => { setGene(p.gene); setVariant(p.variant); setErrors({}) }

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
    <form onSubmit={handleSubmit} style={{display:'flex',flexDirection:'column',gap:20}}>
      <div>
        <p style={{fontSize:11,fontWeight:500,color:'#8a7060',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>Demo presets</p>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {PRESETS.map(preset => {
            const active = gene === preset.gene && variant === preset.variant
            return (
              <button key={preset.label} type="button" onClick={() => applyPreset(preset)}
                style={{textAlign:'left',borderRadius:8,border:`1px solid ${active?'rgba(90,107,48,0.5)':'rgba(120,90,40,0.22)'}`,padding:'8px 12px',background:active?'rgba(90,107,48,0.12)':'rgba(235,228,215,0.6)',cursor:'pointer',transition:'all 0.15s'}}
                onMouseEnter={e=>{ if(!active){ e.currentTarget.style.borderColor='rgba(120,90,40,0.4)'; e.currentTarget.style.background='rgba(220,210,195,0.9)' }}}
                onMouseLeave={e=>{ if(!active){ e.currentTarget.style.borderColor='rgba(120,90,40,0.22)'; e.currentTarget.style.background='rgba(235,228,215,0.6)' }}}>
                <div style={{fontSize:12,fontFamily:'Geist Mono, monospace',color:'#2a1a08'}}>{preset.label}</div>
                <div style={{fontSize:11,color:'#8a7060',marginTop:2}}>{preset.tag}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div style={{borderTop:'1px solid rgba(120,90,40,0.18)'}}/>

      {/* Gene input */}
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        <label style={{fontSize:11,fontWeight:500,color:'#8a7060',textTransform:'uppercase',letterSpacing:'0.05em'}}>Gene symbol</label>
        <input value={gene} onChange={e=>setGene(e.target.value)} placeholder="e.g. BRCA1"
          style={{width:'100%',background:'rgba(245,240,232,0.9)',border:`1px solid ${errors.gene?'#c4664a':'rgba(120,90,40,0.28)'}`,borderRadius:8,padding:'8px 12px',fontSize:13,color:'#2a1a08',fontFamily:'Geist Mono, monospace',outline:'none',transition:'border 0.15s'}}
          onFocus={e=>e.target.style.borderColor='rgba(107,124,69,0.6)'}
          onBlur={e=>e.target.style.borderColor=errors.gene?'#c4664a':'rgba(120,90,40,0.28)'}/>
        {errors.gene && <p style={{fontSize:11,color:'#c4664a',margin:0}}>{errors.gene}</p>}
      </div>

      {/* Variant input */}
      <div style={{display:'flex',flexDirection:'column',gap:6}}>
        <label style={{fontSize:11,fontWeight:500,color:'#8a7060',textTransform:'uppercase',letterSpacing:'0.05em'}}>Variant notation</label>
        <input value={variant} onChange={e=>setVariant(e.target.value)} placeholder="e.g. c.5266dupC or p.Glu6Val"
          style={{width:'100%',background:'rgba(245,240,232,0.9)',border:`1px solid ${errors.variant?'#c4664a':'rgba(120,90,40,0.28)'}`,borderRadius:8,padding:'8px 12px',fontSize:13,color:'#2a1a08',fontFamily:'Geist Mono, monospace',outline:'none',transition:'border 0.15s'}}
          onFocus={e=>e.target.style.borderColor='rgba(107,124,69,0.6)'}
          onBlur={e=>e.target.style.borderColor=errors.variant?'#c4664a':'rgba(120,90,40,0.28)'}/>
        {errors.variant && <p style={{fontSize:11,color:'#c4664a',margin:0}}>{errors.variant}</p>}
      </div>

      {/* Reading level */}
      <div>
        <p style={{fontSize:11,fontWeight:500,color:'#8a7060',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>Explanation level</p>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {READING_LEVELS.map(l => {
            const active = level === l
            return (
              <button key={l} type="button" onClick={()=>setLevel(l)}
                style={{borderRadius:8,border:`1px solid ${active?'rgba(90,107,48,0.5)':'rgba(120,90,40,0.22)'}`,padding:'8px 12px',background:active?'rgba(90,107,48,0.12)':'rgba(235,228,215,0.6)',cursor:'pointer',fontSize:12,color:active?'#3a5020':'#8a7060',textAlign:'left',fontFamily:'inherit',transition:'all 0.15s'}}
                onMouseEnter={e=>{ if(!active){ e.currentTarget.style.borderColor='rgba(120,90,40,0.4)'; e.currentTarget.style.color='#5a4030' }}}
                onMouseLeave={e=>{ if(!active){ e.currentTarget.style.borderColor='rgba(120,90,40,0.22)'; e.currentTarget.style.color='#8a7060' }}}>
                {l}
              </button>
            )
          })}
        </div>
      </div>

      <button type="submit" disabled={isLoading}
        style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:8,borderRadius:8,padding:'10px 16px',fontSize:13,fontWeight:500,background:'#5a6b30',color:'#f5f0e8',border:'none',cursor:isLoading?'not-allowed':'pointer',opacity:isLoading?0.6:1,transition:'all 0.15s',boxShadow:'0 4px 16px rgba(90,107,48,0.3)'}}
        onMouseEnter={e=>{ if(!isLoading) e.currentTarget.style.filter='brightness(1.1)' }}
        onMouseLeave={e=>{ e.currentTarget.style.filter='' }}>
        {isLoading ? (
          <><div style={{width:14,height:14,border:'2px solid rgba(255,255,255,0.3)',borderTop:'2px solid #fff',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>Analyzing…</>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            Explain this variant
          </>
        )}
      </button>

      <p style={{fontSize:11,color:'#b0a080',lineHeight:1.6}}>Not medical advice. Results are for educational purposes only. Always consult a healthcare professional.</p>
    </form>
  )
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────
function ChatPanel({ analysisResult, explanation, gene, variantInput }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusText, setStatusText] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    const userMsg = { role: 'user', content: text }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    setStatusText('Thinking…')

    const allMessages = [...messages, userMsg]

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis: {
            gene,
            variant_input: variantInput,
            ...analysisResult,
            explanation,
          },
          messages: allMessages,
        }),
      })

      if (!resp.ok) throw new Error(`Server error (${resp.status})`)

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let responseText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6).trim()
          if (raw === '[DONE]') break
          try {
            const parsed = JSON.parse(raw)
            if (parsed.tool) setStatusText(parsed.tool)
            if (parsed.text) responseText = parsed.text
            if (parsed.error) throw new Error(parsed.error)
          } catch (_) {}
        }
      }

      setMessages(prev => [...prev, { role: 'assistant', content: responseText }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, something went wrong: ${err.message}` }])
    } finally {
      setLoading(false)
      setStatusText('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  const hasContext = !!(analysisResult && gene)

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',borderRadius:12,border:'1px solid rgba(120,90,40,0.16)',background:'rgba(245,240,232,0.97)',overflow:'hidden'}}>
      {/* Header */}
      <div style={{flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 16px',borderBottom:'1px solid rgba(120,90,40,0.12)'}}>
        <span style={{fontSize:11,fontWeight:600,color:'#8a7060',textTransform:'uppercase',letterSpacing:'0.05em',display:'flex',alignItems:'center',gap:6}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8a7060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Chat with your health assistant
        </span>
        {hasContext && (
          <span style={{fontSize:11,color:'rgba(90,107,48,0.8)',fontFamily:'Geist Mono, monospace',background:'rgba(90,107,48,0.1)',border:'1px solid rgba(90,107,48,0.25)',borderRadius:4,padding:'2px 8px'}}>
            {gene} · {variantInput}
          </span>
        )}
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',padding:16,display:'flex',flexDirection:'column',gap:12}}>
        {!hasContext && (
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',gap:10,opacity:0.5}}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#8a7060" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <p style={{fontSize:12,color:'#8a7060',textAlign:'center',maxWidth:220}}>Run an analysis first — then ask anything about the variant, conditions, or next steps.</p>
          </div>
        )}

        {hasContext && messages.length === 0 && !loading && (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <p style={{fontSize:12,color:'#8a7060',marginBottom:4}}>Suggested questions:</p>
            {[
              `What does the ${gene} ${variantInput} variant mean for my health?`,
              'Are there any lifestyle changes I should consider?',
              'What questions should I bring to my doctor?',
              'Could this affect my family members?',
            ].map(q => (
              <button key={q} onClick={() => { setInput(q); inputRef.current?.focus() }}
                style={{textAlign:'left',fontSize:12,color:'#5a4030',background:'rgba(120,90,40,0.07)',border:'1px solid rgba(120,90,40,0.18)',borderRadius:8,padding:'8px 12px',cursor:'pointer',lineHeight:1.5,transition:'all 0.15s',fontFamily:'inherit'}}
                onMouseEnter={e=>{ e.currentTarget.style.background='rgba(120,90,40,0.12)'; e.currentTarget.style.borderColor='rgba(120,90,40,0.3)' }}
                onMouseLeave={e=>{ e.currentTarget.style.background='rgba(120,90,40,0.07)'; e.currentTarget.style.borderColor='rgba(120,90,40,0.18)' }}>
                {q}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{display:'flex',gap:10,flexDirection: m.role==='user' ? 'row-reverse' : 'row',alignItems:'flex-start'}}>
            <div style={{
              flexShrink:0, width:28, height:28, borderRadius:'50%',
              background: m.role==='user' ? 'rgba(42,26,8,0.12)' : 'rgba(90,107,48,0.15)',
              border: `1px solid ${m.role==='user' ? 'rgba(42,26,8,0.15)' : 'rgba(90,107,48,0.3)'}`,
              display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,
              color: m.role==='user' ? '#2a1a08' : '#3a5020',
            }}>
              {m.role==='user' ? '?' : '✦'}
            </div>
            <div style={{
              maxWidth:'80%',borderRadius:10,padding:'10px 14px',
              background: m.role==='user' ? 'rgba(42,26,8,0.07)' : 'rgba(90,107,48,0.09)',
              border: `1px solid ${m.role==='user' ? 'rgba(42,26,8,0.12)' : 'rgba(90,107,48,0.2)'}`,
            }}>
              <SimpleMarkdown text={m.content}/>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{display:'flex',gap:10,alignItems:'flex-start'}}>
            <div style={{flexShrink:0,width:28,height:28,borderRadius:'50%',background:'rgba(90,107,48,0.15)',border:'1px solid rgba(90,107,48,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,color:'#3a5020'}}>✦</div>
            <div style={{borderRadius:10,padding:'10px 14px',background:'rgba(90,107,48,0.09)',border:'1px solid rgba(90,107,48,0.2)',display:'flex',alignItems:'center',gap:8}}>
              <div style={{width:12,height:12,border:'2px solid rgba(90,107,48,0.3)',borderTop:'2px solid #5a6b30',borderRadius:'50%',animation:'spin 0.8s linear infinite',flexShrink:0}}/>
              <span style={{fontSize:12,color:'#6a8040',fontStyle:'italic'}}>{statusText}</span>
            </div>
          </div>
        )}

        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{flexShrink:0,borderTop:'1px solid rgba(120,90,40,0.12)',padding:12,display:'flex',gap:8}}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={!hasContext || loading}
          placeholder={hasContext ? 'Ask about your results, treatments, next steps…' : 'Run an analysis first'}
          rows={1}
          style={{
            flex:1, resize:'none', borderRadius:8, border:'1px solid rgba(120,90,40,0.28)',
            background: hasContext ? 'rgba(245,240,232,0.9)' : 'rgba(245,240,232,0.5)',
            padding:'9px 12px', fontSize:13, color:'#2a1a08', fontFamily:'inherit',
            outline:'none', transition:'border 0.15s', lineHeight:1.5,
            opacity: hasContext ? 1 : 0.6,
          }}
          onFocus={e=>e.target.style.borderColor='rgba(107,124,69,0.6)'}
          onBlur={e=>e.target.style.borderColor='rgba(120,90,40,0.28)'}
        />
        <button onClick={send} disabled={!hasContext || loading || !input.trim()}
          style={{
            flexShrink:0, width:38, height:38, borderRadius:8, border:'none',
            background: hasContext && input.trim() ? '#5a6b30' : 'rgba(120,90,40,0.18)',
            color: hasContext && input.trim() ? '#f5f0e8' : '#b0a080',
            cursor: hasContext && input.trim() ? 'pointer' : 'not-allowed',
            display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s',
          }}
          onMouseEnter={e=>{ if(!loading && input.trim()) e.currentTarget.style.filter='brightness(1.1)' }}
          onMouseLeave={e=>{ e.currentTarget.style.filter='' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function VariantApp() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const handleLogout = async () => { await logout(); navigate('/login') }

  const [isLoading, setIsLoading] = useState(false)
  const [stepStatuses, setStepStatuses] = useState(INITIAL_STEPS)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [explanation, setExplanation] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState(null)
  const [currentLevel, setCurrentLevel] = useState(READING_LEVELS[0])
  const [activeTab, setActiveTab] = useState('explanation') // 'explanation' | 'chat'
  const [lastGene, setLastGene] = useState('')
  const [lastVariant, setLastVariant] = useState('')

  const setStep = (id, status) => setStepStatuses(prev => ({...prev, [id]: status}))
  const tick = (ms=120) => new Promise(r => setTimeout(r, ms))

  const handleSubmit = useCallback(async ({ gene, variant, level }) => {
    setIsLoading(true)
    setError(null)
    setAnalysisResult(null)
    setExplanation('')
    setCurrentLevel(level)
    setStepStatuses(INITIAL_STEPS)
    setActiveTab('explanation')
    setLastGene(gene)
    setLastVariant(variant)
    setStep('parse', 'loading')
    await tick()
    setStep('parse', 'done')
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
      setIsLoading(false)
      return
    }

    setStep('uniprot', 'done')
    await tick(300)
    setStep('alphafold', result.pdb_url ? 'done' : 'skipped')
    await tick(200)
    setStep('clinvar', result.clinvar_info ? 'done' : 'skipped')

    setAnalysisResult(result)
    setIsLoading(false)

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
        const lines = buffer.split('\n')
        buffer = lines.pop()
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

  const showBottomPanel = !!(explanation || isStreaming || analysisResult)

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',overflow:'hidden',background:'#f5f0e8'}}>
      {/* Header */}
      <header style={{flexShrink:0,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 20px',height:52,borderBottom:'1px solid rgba(120,90,40,0.15)',background:'rgba(245,240,232,0.95)',backdropFilter:'blur(8px)',zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <Link to="/" style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'#8a7060',textDecoration:'none',transition:'color 0.2s'}}
            onMouseEnter={e=>e.currentTarget.style.color='#2a1a08'}
            onMouseLeave={e=>e.currentTarget.style.color='#8a7060'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Home
          </Link>
          <span style={{color:'rgba(120,90,40,0.25)'}}>·</span>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22" aria-hidden="true">
              <path d="M 4 20 Q 8 8, 14 14 T 24 14 Q 28 14, 28 20" stroke="#5a7a20" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <circle cx="9" cy="15" r="2.6" fill="#5a7a20"/>
              <circle cx="23" cy="15" r="2.6" fill="#b8875a"/>
              <path d="M 28 20 L 28 24" stroke="#5a7a20" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span style={{fontWeight:600,fontSize:14,color:'#2a1a08',fontFamily:'Geist, system-ui, sans-serif'}}>Aminos</span>
          </div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          {user && <span style={{fontSize:12,color:'rgba(70,45,15,0.4)',fontFamily:'Geist Mono, monospace'}}>{user.email}</span>}
          <button onClick={handleLogout} style={{fontSize:12,color:'rgba(70,45,15,0.5)',background:'none',border:'1px solid rgba(120,90,40,0.2)',borderRadius:9999,padding:'4px 12px',cursor:'pointer',fontFamily:'Geist, system-ui, sans-serif',transition:'all 0.2s'}}
            onMouseEnter={e=>{e.currentTarget.style.color='#2a1a08';e.currentTarget.style.borderColor='rgba(120,90,40,0.4)'}}
            onMouseLeave={e=>{e.currentTarget.style.color='rgba(70,45,15,0.5)';e.currentTarget.style.borderColor='rgba(120,90,40,0.2)'}}>
            Log out
          </button>
        </div>
      </header>

      {/* Body */}
      <div style={{flex:1,display:'flex',overflow:'hidden'}}>
        {/* Sidebar */}
        <aside style={{width:296,flexShrink:0,display:'flex',flexDirection:'column',borderRight:'1px solid rgba(120,90,40,0.18)',overflowY:'auto',background:'#f5f0e8'}}>
          <div style={{padding:16,display:'flex',flexDirection:'column',gap:16}}>
            <VariantForm onSubmit={handleSubmit} isLoading={isLoading}/>

            {error && (
              <div style={{display:'flex',gap:8,borderRadius:8,background:'rgba(255,235,230,0.9)',border:'1px solid rgba(196,102,74,0.35)',padding:12,animation:'fadeIn 0.2s'}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c4664a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginTop:1}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <p style={{fontSize:12,color:'#a03020',lineHeight:1.55,margin:0}}>{error}</p>
              </div>
            )}

            {(isLoading || analysisResult) && (
              <div style={{borderRadius:12,border:'1px solid rgba(120,90,40,0.18)',background:'rgba(235,228,215,0.6)',padding:16,animation:'fadeIn 0.3s'}}>
                <p style={{fontSize:11,fontWeight:600,color:'#8a7060',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12}}>Pipeline</p>
                <StatusPipeline stepStatuses={stepStatuses}/>
              </div>
            )}

            <DataCard analysisResult={analysisResult}/>
          </div>
        </aside>

        {/* Main */}
        <main style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden',background:'#ede8de'}}>
          {/* Protein viewer */}
          <div style={{flex:showBottomPanel ? '0 0 42%' : 1, minHeight:0, padding:12, paddingBottom: showBottomPanel ? 6 : 12}}>
            <div style={{width:'100%',height:'100%',borderRadius:10,overflow:'hidden',border:'1px solid rgba(120,90,40,0.14)'}}>
              <ProteinViewer
                pdbUrl={analysisResult?.pdb_url}
                highlightResidue={analysisResult?.variant_info?.protein_position}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Bottom panel: Explanation + Chat tabs */}
          {showBottomPanel && (
            <div style={{flex:1,minHeight:0,display:'flex',flexDirection:'column',padding:'0 12px 12px',animation:'slideUp 0.4s ease-out'}}>
              {/* Tab bar */}
              <div style={{flexShrink:0,display:'flex',gap:2,marginBottom:6}}>
                {[
                  { id:'explanation', label:'Explanation' },
                  { id:'chat',        label:'Chat' },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    style={{
                      padding:'6px 14px', fontSize:12, fontWeight: activeTab===tab.id ? 600 : 400,
                      fontFamily:'Geist, system-ui, sans-serif',
                      color: activeTab===tab.id ? '#2a1a08' : 'rgba(70,45,15,0.45)',
                      background: activeTab===tab.id ? 'rgba(245,240,232,0.95)' : 'transparent',
                      border: activeTab===tab.id ? '1px solid rgba(120,90,40,0.2)' : '1px solid transparent',
                      borderRadius:'8px 8px 0 0', borderBottom:'none',
                      cursor:'pointer', transition:'all 0.15s',
                    }}>
                    {tab.label}
                    {tab.id==='chat' && (
                      <span style={{marginLeft:6,fontSize:10,background:'rgba(90,107,48,0.15)',color:'#3a5020',border:'1px solid rgba(90,107,48,0.25)',borderRadius:9999,padding:'1px 6px'}}>AI</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div style={{flex:1,minHeight:0}}>
                {activeTab==='explanation' && (
                  <ExplanationPanel
                    text={explanation}
                    isStreaming={isStreaming}
                    levelLabel={currentLevel}
                  />
                )}
                {activeTab==='chat' && (
                  <ChatPanel
                    analysisResult={analysisResult}
                    explanation={explanation}
                    gene={lastGene}
                    variantInput={lastVariant}
                  />
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
