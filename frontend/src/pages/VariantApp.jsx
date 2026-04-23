import { useState, useCallback, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'

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

// ─── Protein Viewer (canvas) ──────────────────────────────────────────────────
function ProteinViewer({ state, gene, variantPos, proteinLength }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const rotRef = useRef(0)

  useEffect(() => {
    if (state !== 'loaded') { cancelAnimationFrame(animRef.current); return }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    const seed = (gene||'X').charCodeAt(0)
    const points = []
    const N = 80
    for (let i=0;i<N;i++) {
      const t = i/(N-1)
      const x = W*0.1 + t*(W*0.8)
      const y = H/2 + Math.sin(t*Math.PI*3 + seed*0.3)*H*0.22 + Math.cos(t*Math.PI*5 + seed)*H*0.08
      points.push({x,y,t})
    }
    const varPct = variantPos && proteinLength ? variantPos/proteinLength : 0.5
    const varIdx = Math.floor(varPct*(N-1))

    function draw(rot) {
      ctx.clearRect(0,0,W,H)
      ctx.fillStyle = '#ede8de'
      ctx.fillRect(0,0,W,H)
      // Subtle grid
      ctx.strokeStyle = 'rgba(120,90,40,0.05)'
      ctx.lineWidth = 1
      for (let x=0;x<W;x+=40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
      for (let y=0;y<H;y+=40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }

      ctx.shadowBlur = 10
      for (let i=1;i<points.length;i++) {
        const a = points[i-1], b = points[i]
        const t = a.t
        let color
        if (t < 0.15 || (t > 0.6 && t < 0.75)) color = `rgba(70,95,35,${0.7+Math.sin(rot+t*10)*0.1})`
        else if (t < 0.35) color = `rgba(107,135,55,${0.65+Math.cos(rot+t*8)*0.1})`
        else if (t < 0.5)  color = `rgba(170,120,60,${0.6+Math.sin(rot+t*6)*0.1})`
        else if (t < 0.62) color = `rgba(140,80,30,${0.65+Math.cos(rot+t*7)*0.1})`
        else               color = `rgba(60,85,145,${0.65+Math.sin(rot+t*9)*0.1})`
        ctx.shadowColor = color
        ctx.strokeStyle = color
        ctx.lineWidth = 5; ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(a.x, a.y + Math.sin(rot*0.5+i*0.2)*3)
        ctx.lineTo(b.x, b.y + Math.sin(rot*0.5+(i+1)*0.2)*3)
        ctx.stroke()
      }
      ctx.shadowBlur = 0

      if (variantPos) {
        const vp = points[varIdx]
        if (vp) {
          const pulse = 0.7 + Math.sin(Date.now()*0.004)*0.3
          ctx.shadowColor = '#c4664a'; ctx.shadowBlur = 18*pulse
          ctx.strokeStyle = `rgba(196,102,74,${pulse})`; ctx.lineWidth = 2
          ctx.beginPath(); ctx.arc(vp.x, vp.y + Math.sin(rot*0.5+varIdx*0.2)*3, 10, 0, Math.PI*2); ctx.stroke()
          ctx.fillStyle = `rgba(196,102,74,${0.3*pulse})`
          ctx.beginPath(); ctx.arc(vp.x, vp.y + Math.sin(rot*0.5+varIdx*0.2)*3, 8, 0, Math.PI*2); ctx.fill()
          ctx.shadowBlur = 0
          ctx.fillStyle = '#c4664a'; ctx.font = '11px Geist Mono, monospace'
          ctx.fillText(`aa ${variantPos}`, vp.x+14, vp.y-8)
        }
      }

      ctx.fillStyle = 'rgba(120,90,40,0.2)'; ctx.font = '11px Geist Mono, monospace'
      ctx.fillText('AlphaFold · predicted structure', 12, H-12)
      const items = [['rgba(70,95,35,0.9)','Very high (>90)'],['rgba(107,135,55,0.9)','High (70–90)'],['rgba(170,120,60,0.9)','Medium (50–70)'],['rgba(140,80,30,0.9)','Low (<50)']]
      items.forEach(([c,l],i) => {
        ctx.fillStyle=c; ctx.fillRect(12, 14+i*18, 24, 6)
        ctx.fillStyle='rgba(70,45,15,0.4)'; ctx.font='10px Geist Mono, monospace'
        ctx.fillText(l, 42, 20+i*18)
      })
      ctx.fillStyle='rgba(70,45,15,0.06)'; ctx.font='bold 36px Geist Mono, monospace'
      ctx.fillText(gene||'', W/2-30, H/2+12)
    }

    function loop() { rotRef.current += 0.012; draw(rotRef.current); animRef.current = requestAnimationFrame(loop) }
    loop()
    return () => cancelAnimationFrame(animRef.current)
  }, [state, gene, variantPos, proteinLength])

  if (state === 'empty') return (
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,background:'#ede8de',borderRadius:10}}>
      <div style={{width:56,height:56,borderRadius:'50%',background:'rgba(143,168,90,0.12)',border:'1px solid rgba(143,168,90,0.3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <DnaIcon size={24}/>
      </div>
      <p style={{fontSize:13,color:'#b0a080',textAlign:'center',maxWidth:200}}>Enter a variant to visualize its 3D structure</p>
    </div>
  )

  if (state === 'loading') return (
    <div style={{width:'100%',height:'100%',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:14,background:'#ede8de',borderRadius:10}}>
      <div style={{width:40,height:40,border:'3px solid rgba(184,135,90,0.2)',borderTop:'3px solid #b8875a',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
      <p style={{fontSize:12,color:'#b0a080',fontFamily:'Geist Mono, monospace'}}>Fetching AlphaFold structure…</p>
    </div>
  )

  return <canvas ref={canvasRef} width={800} height={480} style={{width:'100%',height:'100%',borderRadius:10,display:'block'}}/>
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

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function VariantApp() {
  const [isLoading, setIsLoading] = useState(false)
  const [stepStatuses, setStepStatuses] = useState(INITIAL_STEPS)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [explanation, setExplanation] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState(null)
  const [currentLevel, setCurrentLevel] = useState(READING_LEVELS[0])
  const [viewerState, setViewerState] = useState('empty')
  const [currentGene, setCurrentGene] = useState('')

  const setStep = (id, status) => setStepStatuses(prev => ({...prev, [id]: status}))
  const tick = (ms=120) => new Promise(r => setTimeout(r, ms))

  const handleSubmit = useCallback(async ({ gene, variant, level }) => {
    setIsLoading(true)
    setError(null)
    setAnalysisResult(null)
    setExplanation('')
    setCurrentLevel(level)
    setStepStatuses(INITIAL_STEPS)
    setViewerState('loading')
    setCurrentGene(gene)

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
      setViewerState('empty')
      return
    }

    setStep('uniprot', 'done')
    await tick(300)
    setStep('alphafold', result.pdb_url ? 'done' : 'skipped')
    await tick(200)
    setStep('clinvar', result.clinvar_info ? 'done' : 'skipped')

    setAnalysisResult(result)
    setIsLoading(false)
    setViewerState('loaded')

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

  const showExplanation = explanation || isStreaming

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
        <span style={{fontSize:12,color:'#b0a080',fontFamily:'Geist Mono, monospace'}}>Educational use only — not medical advice</span>
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
          <div style={{flex:1,minHeight:0,padding:12}}>
            <div style={{width:'100%',height:'100%',borderRadius:10,overflow:'hidden',border:'1px solid rgba(120,90,40,0.14)'}}>
              <ProteinViewer
                state={viewerState}
                gene={currentGene}
                variantPos={analysisResult?.variant_info?.protein_position}
                proteinLength={analysisResult?.protein_info?.length}
              />
            </div>
          </div>

          {showExplanation && (
            <div style={{flexShrink:0,height:'38%',padding:'0 12px 12px',animation:'slideUp 0.4s ease-out'}}>
              <ExplanationPanel
                text={explanation}
                isStreaming={isStreaming}
                levelLabel={currentLevel}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
