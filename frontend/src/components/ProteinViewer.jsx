import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Atom, ZoomIn, ZoomOut, RotateCcw, Pause, Play } from 'lucide-react'
import { cn } from '../lib/utils'

export function ProteinViewer({ pdbUrl, highlightResidue, isLoading }) {
  const containerRef = useRef(null)
  const viewerRef = useRef(null)
  const [spinning, setSpinning] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [structureLoaded, setStructureLoaded] = useState(false)

  // Init 3Dmol viewer once
  useEffect(() => {
    if (!containerRef.current) return
    const $3Dmol = window.$3Dmol
    if (!$3Dmol) return

    const viewer = $3Dmol.createViewer(containerRef.current, {
      backgroundColor: '0x09090b',
      antialias: true,
      id: 'protein-viewer',
    })
    viewerRef.current = viewer

    return () => {
      try { viewer.clear() } catch (_) {}
    }
  }, [])

  // Load structure when pdbUrl changes
  useEffect(() => {
    const viewer = viewerRef.current
    const $3Dmol = window.$3Dmol
    if (!viewer || !$3Dmol) return
    if (!pdbUrl) {
      viewer.clear()
      viewer.render()
      setStructureLoaded(false)
      return
    }

    setLoadError(null)
    setStructureLoaded(false)

    // Fetch PDB text then hand to 3Dmol
    fetch(pdbUrl)
      .then(r => {
        if (!r.ok) throw new Error(`Failed to fetch PDB (${r.status})`)
        return r.text()
      })
      .then(pdbText => {
        viewer.clear()
        viewer.addModel(pdbText, 'pdb')

        // Base style: cartoon by secondary structure
        viewer.setStyle({}, {
          cartoon: { colorscheme: 'ssJmol', opacity: 0.85 },
        })

        // Highlight mutant residue
        if (highlightResidue) {
          viewer.setStyle(
            { resi: highlightResidue },
            {
              cartoon: { color: '#ef4444' },
              sphere: { color: '#ef4444', radius: 0.9 },
              stick: { color: '#ef4444', radius: 0.25 },
            }
          )
          viewer.addLabel(
            `Variant · Residue ${highlightResidue}`,
            {
              resi: highlightResidue,
              backgroundColor: '#7f1d1d',
              fontColor: '#fecaca',
              fontSize: 11,
              borderColor: '#ef4444',
              borderThickness: 0.5,
              backgroundOpacity: 0.9,
              inFront: true,
            }
          )
          // Zoom toward mutation, not all the way in
          viewer.zoomTo({ resi: highlightResidue }, 1200)
        } else {
          viewer.zoomTo()
        }

        viewer.spin('y', 0.5)
        viewer.render()
        setStructureLoaded(true)
        setSpinning(true)
      })
      .catch(err => {
        setLoadError(err.message)
      })
  }, [pdbUrl, highlightResidue])

  const toggleSpin = () => {
    const viewer = viewerRef.current
    if (!viewer) return
    if (spinning) {
      viewer.spin(false)
    } else {
      viewer.spin('y', 0.5)
    }
    setSpinning(s => !s)
  }

  const zoomIn = () => viewerRef.current?.zoom(1.25, 500)
  const zoomOut = () => viewerRef.current?.zoom(0.8, 500)
  const reset = () => {
    const viewer = viewerRef.current
    if (!viewer) return
    if (highlightResidue) {
      viewer.zoomTo({ resi: highlightResidue }, 600)
    } else {
      viewer.zoomTo({}, 600)
    }
    viewer.render()
  }

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800/60">
      {/* 3Dmol mount target */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Loading overlay */}
      <AnimatePresence>
        {isLoading && !structureLoaded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/90 z-10"
          >
            <div className="relative mb-4">
              <Atom className="h-12 w-12 text-violet-400 animate-spin" style={{ animationDuration: '3s' }} />
              <div className="absolute inset-0 rounded-full border border-violet-500/20 animate-ping" />
            </div>
            <p className="text-sm text-zinc-400">Loading structure…</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      <AnimatePresence>
        {!isLoading && !pdbUrl && !loadError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
          >
            <Atom className="h-16 w-16 text-zinc-800 mb-3" />
            <p className="text-sm text-zinc-600">Enter a variant to load the 3D structure</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      {loadError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-sm text-red-400 mb-1">Structure unavailable</p>
          <p className="text-xs text-zinc-600 max-w-48 text-center">{loadError}</p>
        </div>
      )}

      {/* Controls — only when structure is loaded */}
      <AnimatePresence>
        {structureLoaded && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 z-20"
          >
            {[
              { icon: ZoomIn, action: zoomIn, title: 'Zoom in' },
              { icon: ZoomOut, action: zoomOut, title: 'Zoom out' },
              { icon: RotateCcw, action: reset, title: 'Reset view' },
              { icon: spinning ? Pause : Play, action: toggleSpin, title: spinning ? 'Pause rotation' : 'Resume rotation' },
            ].map(({ icon: Icon, action, title }) => (
              <button
                key={title}
                onClick={action}
                title={title}
                className="h-7 w-7 rounded-md bg-zinc-900/80 border border-zinc-700/60 backdrop-blur flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:border-zinc-600 transition-colors"
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Residue badge */}
      <AnimatePresence>
        {structureLoaded && highlightResidue && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded-md bg-red-950/70 border border-red-800/50 backdrop-blur px-2.5 py-1"
          >
            <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-xs text-red-300 font-mono">Residue {highlightResidue}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
