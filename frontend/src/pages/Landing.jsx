// Landing Page — Light Earth Tone Theme
// bg #f5f0e8 (cream) · text #2a1a08 (dark brown) · olive #8fa85a · tan #b8875a

import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ProteinHero3D } from '../components/ProteinHero3D'

function Noise() {
  return (
    <div aria-hidden style={{pointerEvents:'none',position:'fixed',inset:0,zIndex:999,opacity:0.025,
      backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
      backgroundRepeat:'repeat',backgroundSize:'200px 200px'}}/>
  )
}

function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(()=>{
    const h = ()=> setScrolled(window.scrollY > 32)
    window.addEventListener('scroll', h, {passive:true})
    return ()=> window.removeEventListener('scroll', h)
  },[])

  return (
    <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:50,transition:'all 0.3s',
      background: scrolled ? 'rgba(245,240,232,0.95)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(120,90,40,0.12)' : 'none'}}>
      <div style={{maxWidth:1280,margin:'0 auto',padding:'0 24px',height:64,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',color:'#5a7a20'}}>
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="30" height="30" aria-hidden="true">
              <path d="M 4 20 Q 8 8, 14 14 T 24 14 Q 28 14, 28 20" stroke="#5a7a20" strokeWidth="2" strokeLinecap="round" fill="none"/>
              <circle cx="9" cy="15" r="2.6" fill="#5a7a20"/>
              <circle cx="23" cy="15" r="2.6" fill="#b8875a"/>
              <path d="M 28 20 L 28 24" stroke="#5a7a20" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{fontSize:15,fontWeight:600,color:'#2a1a08',letterSpacing:'-0.015em',fontFamily:'Geist, system-ui, sans-serif'}}>Aminos</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:32}}>
          {['How it works','Data sources'].map(l=>(
            <a key={l} href={`#${l.toLowerCase().replace(/\s+/g,'-')}`}
              style={{fontSize:13,color:'rgba(70,45,15,0.5)',textDecoration:'none',transition:'color 0.2s',fontFamily:'Geist, system-ui, sans-serif'}}
              onMouseEnter={e=>e.target.style.color='rgba(42,26,8,0.9)'}
              onMouseLeave={e=>e.target.style.color='rgba(70,45,15,0.5)'}>{l}</a>
          ))}
        </div>
        <Link to="/app" style={{display:'flex',alignItems:'center',gap:6,fontSize:13,fontWeight:600,color:'#f5f0e8',background:'#2a1a08',border:'none',padding:'8px 18px',borderRadius:9999,cursor:'pointer',textDecoration:'none',transition:'all 0.2s',fontFamily:'Geist, system-ui, sans-serif'}}
          onMouseEnter={e=>e.currentTarget.style.background='#3d2810'}
          onMouseLeave={e=>e.currentTarget.style.background='#2a1a08'}>
          Open app
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </Link>
      </div>
    </nav>
  )
}

function Hero() {
  return (
    <section style={{position:'relative',minHeight:'100vh',overflow:'hidden',display:'flex',alignItems:'center'}}>
      {/* Protein canvas — wider container, center at ~60% */}
      <div style={{position:'absolute',left:'33%',right:0,top:0,bottom:0,zIndex:0}}>
        <ProteinHero3D/>
      </div>
      {/* Gradient: cream covers left text area, fades into protein */}
      <div style={{position:'absolute',inset:0,zIndex:1,
        background:'linear-gradient(108deg, rgba(245,240,232,0.99) 0%, rgba(245,240,232,0.98) 34%, rgba(245,240,232,0.55) 54%, rgba(245,240,232,0.05) 76%, rgba(245,240,232,0.0) 100%)'}}/>
      {/* Text layer */}
      <div style={{position:'relative',zIndex:2,maxWidth:1280,margin:'0 auto',width:'100%',padding:'120px 24px 80px'}}>
        <div style={{maxWidth:600}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,border:'1px solid rgba(120,90,40,0.2)',borderRadius:9999,padding:'4px 12px',marginBottom:32,animation:'fadeIn 0.5s 0.1s both',background:'rgba(245,240,232,0.7)'}}>
            <span style={{width:6,height:6,borderRadius:'50%',background:'#8fa85a',animation:'pulse 1.5s ease-in-out infinite'}}/>
            <span style={{fontSize:11,fontFamily:'Geist Mono, monospace',color:'rgba(70,45,15,0.55)',letterSpacing:'0.1em',textTransform:'uppercase'}}>AlphaFold · UniProt · ClinVar · Claude</span>
          </div>
          <div style={{marginBottom:24,animation:'fadeUp 0.7s 0.2s both'}}>
            <div style={{fontSize:68,lineHeight:1.05,fontWeight:700,color:'#2a1a08',letterSpacing:'-0.03em',fontFamily:'Lora, Georgia, serif'}}>Your genetic</div>
            <div style={{fontSize:68,lineHeight:1.05,fontWeight:700,letterSpacing:'-0.03em',fontFamily:'Lora, Georgia, serif',WebkitTextStroke:'1.5px rgba(42,26,8,0.4)',color:'transparent'}}>report,</div>
            <div style={{fontSize:68,lineHeight:1.05,fontWeight:400,fontStyle:'italic',color:'#2a1a08',letterSpacing:'-0.02em',fontFamily:'Lora, Georgia, serif'}}>finally explained.</div>
          </div>
          <p style={{fontSize:17,color:'rgba(70,45,15,0.6)',lineHeight:1.65,maxWidth:480,marginBottom:40,animation:'fadeIn 0.6s 0.75s both'}}>
            Paste any variant from your genetic report — BRCA1, HBB, CFTR. See the exact mutation site in 3D. Get a plain-language explanation at whatever reading level you need.
          </p>
          <div style={{display:'flex',alignItems:'center',gap:16,animation:'fadeIn 0.5s 0.9s both'}}>
            <Link to="/app" style={{display:'flex',alignItems:'center',gap:8,background:'#2a1a08',color:'#f5f0e8',textDecoration:'none',fontSize:14,fontWeight:600,padding:'12px 24px',borderRadius:9999,cursor:'pointer',transition:'all 0.2s',boxShadow:'0 4px 20px rgba(42,26,8,0.2)',fontFamily:'Geist, system-ui, sans-serif'}}
              onMouseEnter={e=>e.currentTarget.style.background='#3d2810'}
              onMouseLeave={e=>e.currentTarget.style.background='#2a1a08'}>
              Try the demo
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
            <a href="#how-it-works" style={{display:'flex',alignItems:'center',gap:6,fontSize:13,color:'rgba(70,45,15,0.5)',textDecoration:'none',transition:'color 0.2s'}}
              onMouseEnter={e=>e.currentTarget.style.color='rgba(42,26,8,0.85)'}
              onMouseLeave={e=>e.currentTarget.style.color='rgba(70,45,15,0.5)'}>
              See how it works
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </a>
          </div>
          <p style={{marginTop:24,fontSize:12,color:'rgba(70,45,15,0.3)',fontFamily:'Geist Mono, monospace',animation:'fadeIn 0.5s 1.1s both'}}>Free · No account · Not medical advice</p>
        </div>
      </div>
      {/* Scroll nudge */}
      <div style={{position:'absolute',bottom:32,left:'50%',transform:'translateX(-50%)',zIndex:2,animation:'fadeIn 0.5s 1.5s both'}}>
        <div style={{animation:'bounce 2s ease-in-out infinite'}}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(70,45,15,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
      </div>
    </section>
  )
}

function StatsBar() {
  const stats = [
    {value:'3',label:'Live data APIs',detail:'UniProt · AlphaFold · ClinVar'},
    {value:'< 30s',label:'Full analysis',detail:'Fetch → structure → explain'},
    {value:'3',label:'Reading levels',detail:'Patient · Clinician · Child'},
    {value:'100%',label:'Free to use',detail:'No account required'},
  ]
  return (
    <section style={{borderTop:'1px solid rgba(120,90,40,0.12)',borderBottom:'1px solid rgba(120,90,40,0.12)',background:'rgba(120,90,40,0.04)'}}>
      <div style={{maxWidth:1280,margin:'0 auto',padding:'40px 24px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:1}}>
        {stats.map((s,i)=>(
          <div key={s.label} style={{padding:'8px 24px',borderRight:i<3?'1px solid rgba(120,90,40,0.08)':'none'}}>
            <span style={{fontSize:40,fontWeight:400,color:'#2a1a08',display:'block',marginBottom:4,fontFamily:'Lora, Georgia, serif'}}>{s.value}</span>
            <span style={{fontSize:14,fontWeight:500,color:'rgba(70,45,15,0.7)',display:'block',marginBottom:2}}>{s.label}</span>
            <span style={{fontSize:11,fontFamily:'Geist Mono, monospace',color:'rgba(70,45,15,0.35)'}}>{s.detail}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function Problem() {
  return (
    <section style={{padding:'112px 24px',background:'#f5f0e8'}}>
      <div style={{maxWidth:1280,margin:'0 auto',display:'grid',gridTemplateColumns:'1fr 1fr',gap:128,alignItems:'start'}}>
        <div>
          <p style={{fontSize:11,fontFamily:'Geist Mono, monospace',color:'rgba(70,45,15,0.38)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:24}}>The problem</p>
          <h2 style={{fontSize:48,fontWeight:700,color:'#2a1a08',lineHeight:1.15,marginBottom:32,letterSpacing:'-0.02em',fontFamily:'Lora, Georgia, serif'}}>The gap that<br/><em style={{fontWeight:400}}>shouldn't exist.</em></h2>
          <div style={{display:'flex',flexDirection:'column',gap:20,color:'rgba(70,45,15,0.62)',lineHeight:1.7,fontSize:15}}>
            <p>Genetic testing is growing 15% year over year. Direct-to-consumer panels now cover hundreds of variants. The science has outpaced the communication by a decade.</p>
            <p>Patients receive results in PDFs dense with notation like <code style={{fontFamily:'Geist Mono, monospace',fontSize:13,color:'rgba(42,26,8,0.85)',background:'rgba(120,90,40,0.1)',padding:'2px 6px',borderRadius:4}}>BRCA1 c.5266dupC</code> with no explanation of what the protein does, what the variant changes, or what it means for their health.</p>
            <p>That knowledge exists in clinicians' heads. We built the bridge.</p>
          </div>
        </div>
        <div style={{paddingTop:56}}>
          <div style={{borderLeft:'2px solid rgba(120,90,40,0.18)',paddingLeft:24,marginBottom:32}}>
            <p style={{fontSize:26,fontWeight:400,color:'rgba(60,35,10,0.72)',lineHeight:1.65,fontStyle:'italic',fontFamily:'Lora, Georgia, serif'}}>
              "Maria gets a call. Her BRCA1 test came back positive. She has a 12-page PDF and a Google search that terrifies her."
            </p>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[['1 in 8','women will develop breast cancer in their lifetime'],["~50%","of patients don't understand genetic test results"],['< 5 min','is how long most clinicians spend explaining a result']].map(([stat,label])=>(
              <div key={stat} style={{display:'flex',alignItems:'baseline',gap:16}}>
                <span style={{fontSize:24,color:'rgba(70,45,15,0.55)',fontWeight:400,flexShrink:0,width:80,fontFamily:'Lora, Georgia, serif'}}>{stat}</span>
                <span style={{fontSize:13,color:'rgba(70,45,15,0.45)'}}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    {num:'01',title:'Enter your variant',body:"Paste the notation directly from your report — e.g. BRCA1 c.5266dupC or HBB p.Glu6Val. We parse both coding (c.) and protein-level (p.) HGVS notation.",accent:'#8fa85a'},
    {num:'02',title:'Fetch the 3D structure',body:"AlphaFold's predicted structure loads in seconds. The exact mutated residue lights up in terracotta against the full protein fold — color-coded by confidence score.",accent:'#b8875a'},
    {num:'03',title:'Pull clinical evidence',body:"ClinVar tells us what researchers know: pathogenic, benign, or uncertain. We surface the conditions it's been linked to and the review status.",accent:'#c4a060'},
    {num:'04',title:'Plain language explanation',body:"Claude reasons about the variant's structural context, the domain it falls in, and what that region does. Then explains it at your reading level.",accent:'#4a6fa5'},
  ]
  return (
    <section id="how-it-works" style={{padding:'112px 24px',borderTop:'1px solid rgba(120,90,40,0.1)',background:'#f5f0e8'}}>
      <div style={{maxWidth:1280,margin:'0 auto'}}>
        <div style={{marginBottom:64}}>
          <p style={{fontSize:11,fontFamily:'Geist Mono, monospace',color:'rgba(70,45,15,0.38)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:16}}>How it works</p>
          <h2 style={{fontSize:48,fontWeight:700,color:'#2a1a08',letterSpacing:'-0.02em',fontFamily:'Lora, Georgia, serif'}}>Four steps,<br/><em style={{fontWeight:400}}>under thirty seconds.</em></h2>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:1,background:'rgba(120,90,40,0.1)',borderRadius:16,overflow:'hidden'}}>
          {steps.map(step=>(
            <div key={step.num} style={{background:'#f5f0e8',padding:'40px',position:'relative',transition:'background 0.2s',cursor:'default'}}
              onMouseEnter={e=>e.currentTarget.style.background='#ede8de'}
              onMouseLeave={e=>e.currentTarget.style.background='#f5f0e8'}>
              <div style={{position:'absolute',top:16,right:24,fontSize:80,fontWeight:700,color:step.accent,opacity:0.07,lineHeight:1,pointerEvents:'none',userSelect:'none'}}>{step.num}</div>
              <div style={{fontSize:11,fontFamily:'Geist Mono, monospace',color:step.accent,marginBottom:16,fontWeight:500}}>{step.num}</div>
              <h3 style={{fontSize:19,fontWeight:600,color:'#2a1a08',marginBottom:12,fontFamily:'Lora, Georgia, serif'}}>{step.title}</h3>
              <p style={{fontSize:13,color:'rgba(70,45,15,0.58)',lineHeight:1.65}}>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function DataSources() {
  const sources = [
    {name:'UniProt',tag:'Protein identity',description:'Curated protein database with sequence, length, domain annotations, and functional sites for 500,000+ reviewed entries.',pills:['Sequence','Domains','Active sites','Swiss-Prot reviewed'],url:'https://www.uniprot.org'},
    {name:'AlphaFold EBI',tag:'3D Structure',description:"DeepMind's predicted protein structures for 200M+ proteins. We fetch the PDB file directly and render it with the variant residue highlighted.",pills:['PDB structure','Residue positions','200M+ proteins','Free API'],url:'https://alphafold.ebi.ac.uk'},
    {name:'ClinVar',tag:'Clinical significance',description:"NCBI's archive of human variants and their clinical interpretations — pathogenicity classifications and disease associations from labs worldwide.",pills:['Pathogenicity','Review status','Disease links','NCBI'],url:'https://www.ncbi.nlm.nih.gov/clinvar/'},
  ]
  return (
    <section id="data-sources" style={{padding:'112px 24px',borderTop:'1px solid rgba(120,90,40,0.1)',background:'#ede8de'}}>
      <div style={{maxWidth:1280,margin:'0 auto'}}>
        <div style={{marginBottom:64}}>
          <p style={{fontSize:11,fontFamily:'Geist Mono, monospace',color:'rgba(70,45,15,0.38)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:16}}>Data sources</p>
          <h2 style={{fontSize:48,fontWeight:700,color:'#2a1a08',letterSpacing:'-0.02em',fontFamily:'Lora, Georgia, serif'}}>Three trusted APIs. <em style={{fontWeight:400}}>No keys required.</em></h2>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
          {sources.map(src=>(
            <div key={src.name} style={{borderRadius:16,border:'1px solid rgba(120,90,40,0.15)',background:'rgba(245,240,232,0.8)',padding:24,display:'flex',flexDirection:'column',transition:'all 0.3s',cursor:'default'}}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(245,240,232,1)';e.currentTarget.style.borderColor='rgba(120,90,40,0.28)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='rgba(245,240,232,0.8)';e.currentTarget.style.borderColor='rgba(120,90,40,0.15)'}}>
              <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16}}>
                <div>
                  <p style={{fontSize:17,fontWeight:600,color:'#2a1a08'}}>{src.name}</p>
                  <p style={{fontSize:11,fontFamily:'Geist Mono, monospace',color:'rgba(70,45,15,0.42)',marginTop:2}}>{src.tag}</p>
                </div>
                <a href={src.url} target="_blank" rel="noopener noreferrer" style={{color:'rgba(70,45,15,0.35)',transition:'color 0.2s'}}
                  onMouseEnter={e=>e.currentTarget.style.color='rgba(42,26,8,0.7)'}
                  onMouseLeave={e=>e.currentTarget.style.color='rgba(70,45,15,0.35)'}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </a>
              </div>
              <p style={{fontSize:13,color:'rgba(70,45,15,0.58)',lineHeight:1.65,marginBottom:20,flex:1}}>{src.description}</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {src.pills.map(p=>(
                  <span key={p} style={{fontSize:10,fontFamily:'Geist Mono, monospace',color:'rgba(70,45,15,0.5)',background:'rgba(120,90,40,0.08)',border:'1px solid rgba(120,90,40,0.14)',padding:'2px 8px',borderRadius:9999}}>{p}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function DemoCTA() {
  const demos = [['HBB','p.Glu6Val','Sickle cell'],['BRCA1','c.5266dupC','Breast cancer'],['CFTR','p.Phe508del','Cystic fibrosis']]
  return (
    <section style={{padding:'112px 24px',borderTop:'1px solid rgba(120,90,40,0.1)',background:'#f5f0e8'}}>
      <div style={{maxWidth:1280,margin:'0 auto'}}>
        <div style={{borderRadius:24,border:'1px solid rgba(120,90,40,0.15)',background:'#ede8de',padding:'80px',textAlign:'center',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',inset:0,pointerEvents:'none',background:'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(143,168,90,0.08) 0%, transparent 70%)'}}/>
          <p style={{fontSize:11,fontFamily:'Geist Mono, monospace',color:'rgba(70,45,15,0.38)',textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:24}}>Live demo</p>
          <h2 style={{fontSize:64,fontWeight:700,color:'#2a1a08',marginBottom:24,lineHeight:1.1,letterSpacing:'-0.03em',fontFamily:'Lora, Georgia, serif'}}>See your protein<br/><em style={{fontWeight:400}}>in 3D.</em></h2>
          <p style={{fontSize:15,color:'rgba(70,45,15,0.55)',maxWidth:480,margin:'0 auto 40px',lineHeight:1.65}}>Pick one of our demo variants — sickle cell, BRCA1, cystic fibrosis — or paste your own. The full analysis runs in under 30 seconds.</p>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginBottom:40,flexWrap:'wrap'}}>
            {demos.map(([gene,variant,label])=>(
              <Link key={gene} to="/app" style={{display:'flex',alignItems:'center',gap:8,border:'1px solid rgba(120,90,40,0.2)',borderRadius:9999,padding:'8px 16px',background:'rgba(245,240,232,0.8)',cursor:'pointer',transition:'all 0.2s',textDecoration:'none'}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(120,90,40,0.4)';e.currentTarget.style.background='rgba(245,240,232,1)'}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(120,90,40,0.2)';e.currentTarget.style.background='rgba(245,240,232,0.8)'}}>
                <span style={{fontFamily:'Geist Mono, monospace',fontSize:12,color:'rgba(70,45,15,0.75)'}}>{gene}</span>
                <span style={{fontFamily:'Geist Mono, monospace',fontSize:12,color:'rgba(70,45,15,0.42)'}}>{variant}</span>
                <span style={{fontSize:10,color:'rgba(70,45,15,0.3)'}}>· {label}</span>
              </Link>
            ))}
          </div>
          <Link to="/app" style={{display:'inline-flex',alignItems:'center',gap:10,background:'#2a1a08',color:'#f5f0e8',textDecoration:'none',fontSize:15,fontWeight:600,padding:'14px 32px',borderRadius:9999,cursor:'pointer',boxShadow:'0 8px 32px rgba(42,26,8,0.18)',transition:'all 0.2s',fontFamily:'Geist, system-ui, sans-serif'}}
            onMouseEnter={e=>e.currentTarget.style.background='#3d2810'}
            onMouseLeave={e=>e.currentTarget.style.background='#2a1a08'}>
            Open the demo
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </Link>
          <p style={{marginTop:24,fontSize:11,color:'rgba(70,45,15,0.28)',fontFamily:'Geist Mono, monospace'}}>Not medical advice · For educational use only</p>
        </div>
      </div>
    </section>
  )
}

function LandingFooter() {
  return (
    <footer style={{borderTop:'1px solid rgba(120,90,40,0.1)',padding:'48px 24px',background:'#ede8de'}}>
      <div style={{maxWidth:1280,margin:'0 auto',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
            <div style={{width:20,height:20,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="20" aria-hidden="true">
                <path d="M 4 20 Q 8 8, 14 14 T 24 14 Q 28 14, 28 20" stroke="#5a7a20" strokeWidth="2" strokeLinecap="round" fill="none"/>
                <circle cx="9" cy="15" r="2.6" fill="#5a7a20"/>
                <circle cx="23" cy="15" r="2.6" fill="#b8875a"/>
                <path d="M 28 20 L 28 24" stroke="#5a7a20" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{fontSize:13,color:'rgba(70,45,15,0.5)',fontFamily:'Geist, system-ui, sans-serif'}}>Aminos</span>
          </div>
          <p style={{fontSize:11,color:'rgba(70,45,15,0.32)',fontFamily:'Geist Mono, monospace'}}>Built at HBS AI Hackathon 2026</p>
        </div>
        <div style={{textAlign:'right'}}>
          <p style={{fontSize:12,color:'rgba(70,45,15,0.4)',marginBottom:4}}>Data: UniProt · AlphaFold EBI · ClinVar (NCBI)</p>
          <p style={{fontSize:11,color:'rgba(70,45,15,0.28)',fontFamily:'Geist Mono, monospace',maxWidth:360}}>For educational purposes only. Not medical advice. Always consult a healthcare professional.</p>
        </div>
      </div>
    </footer>
  )
}

export default function Landing() {
  return (
    <div style={{background:'#f5f0e8',color:'#2a1a08',minHeight:'100vh',overflowX:'hidden'}}>
      <Noise/>
      <LandingNav/>
      <Hero/>
      <StatsBar/>
      <Problem/>
      <HowItWorks/>
      <DataSources/>
      <DemoCTA/>
      <LandingFooter/>
    </div>
  )
}
