import { useEffect, useMemo, useRef, useState } from 'react'
import ModelMark from './ModelMark'
import TagBadge from './TagBadge'
import { ALL_TAGS, TAG_COLORS } from '../utils/tagColors'
import { cleanSummary, formatDelta, formatNumber } from '../utils/timelineBrowse'

const LAB_TAGS = ['all', 'safety', 'tool_definition', 'persona', 'memory', 'policy', 'capability']

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function getChangeIntensity(entry) {
  const lineChange = entry?.diff?.total_change ?? ((entry?.diff?.added_count ?? 0) + (entry?.diff?.removed_count ?? 0))
  const promptDelta = Math.abs(entry?.prompt_delta ?? 0)
  return clamp((lineChange / 180) + (promptDelta / 18000), 0.25, 2.4)
}

function getLinePreview(entry) {
  const added = entry?.diff?.added?.find(line => String(line).trim())
  const removed = entry?.diff?.removed?.find(line => String(line).trim())
  return String(added || removed || cleanSummary(entry)).replace(/\s+/g, ' ').slice(0, 90)
}

export default function PromptPhysicsLab({ entries, profiles, onOpen }) {
  const canvasRef = useRef(null)
  const [selectedModel, setSelectedModel] = useState(profiles.find(profile => profile.totalChanges)?.model ?? profiles[0]?.model ?? '')
  const [selectedTag, setSelectedTag] = useState('all')
  const [frameIndex, setFrameIndex] = useState(0)
  const [wind, setWind] = useState(62)
  const [turbulence, setTurbulence] = useState(48)
  const [stiffness, setStiffness] = useState(56)
  const [paused, setPaused] = useState(false)

  const modelProfiles = profiles.filter(profile => profile.totalChanges)
  const activeProfile = profiles.find(profile => profile.model === selectedModel) ?? modelProfiles[0] ?? profiles[0]
  const activeModel = activeProfile?.model ?? ''

  const scopedEntries = entries.filter(entry => {
    if (activeModel && entry.model !== activeModel) return false
    if (selectedTag === 'all') return true
    return (entry.behavioral_tags ?? []).includes(selectedTag)
  })
  const modelEntries = scopedEntries.length ? scopedEntries : entries.filter(entry => entry.model === activeModel)

  const activeIndex = clamp(frameIndex, 0, Math.max(modelEntries.length - 1, 0))
  const activeEntry = modelEntries[activeIndex]
  const activeTags = useMemo(
    () => activeEntry?.behavioral_tags?.length ? activeEntry.behavioral_tags : ['other'],
    [activeEntry],
  )
  const intensity = getChangeIntensity(activeEntry)
  const weight = clamp((activeEntry?.prompt_length ?? activeProfile?.currentPromptLength ?? 20000) / 90000, 0.35, 2.2)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext('2d')
    let animationId = 0
    let start = performance.now()
    let running = true

    function resize() {
      const rect = canvas.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function draw(time) {
      if (!running) return
      const rect = canvas.getBoundingClientRect()
      const width = rect.width
      const height = rect.height
      const elapsed = paused ? 0 : (time - start) / 1000
      if (paused) start = time

      ctx.clearRect(0, 0, width, height)

      const gradient = ctx.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, 'rgba(2, 6, 10, 0.92)')
      gradient.addColorStop(0.52, 'rgba(8, 14, 20, 0.64)')
      gradient.addColorStop(1, 'rgba(1, 4, 9, 0.9)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      ctx.save()
      ctx.globalAlpha = 0.24
      ctx.strokeStyle = 'rgba(230, 237, 243, 0.12)'
      ctx.lineWidth = 1
      for (let x = 28; x < width; x += 42) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
        ctx.stroke()
      }
      for (let y = 28; y < height; y += 42) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }
      ctx.restore()

      const columns = 18
      const rows = 7
      const left = width * 0.12
      const top = height * 0.2
      const sheetWidth = width * 0.74
      const sheetHeight = height * 0.43
      const windForce = wind / 100
      const turbulenceForce = turbulence / 100
      const stiffnessDamp = 1.35 - stiffness / 115
      const amplitude = 16 * intensity * windForce * stiffnessDamp
      const tagColor = TAG_COLORS[activeTags[0]] ?? TAG_COLORS.other

      const points = []
      for (let row = 0; row < rows; row += 1) {
        const line = []
        for (let col = 0; col < columns; col += 1) {
          const u = col / (columns - 1)
          const v = row / (rows - 1)
          const wave = Math.sin(elapsed * (1.1 + turbulenceForce * 2.2) + u * 6.4 + v * 2.3)
          const crossWave = Math.cos(elapsed * 0.72 + u * 2.8 - v * 5.2)
          const sag = Math.sin(u * Math.PI) * weight * 18
          line.push({
            x: left + u * sheetWidth + wave * amplitude * (0.2 + v),
            y: top + v * sheetHeight + sag + crossWave * amplitude * 0.34,
          })
        }
        points.push(line)
      }

      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (let row = 0; row < rows - 1; row += 1) {
        const alpha = 0.08 + row * 0.012
        ctx.beginPath()
        points[row].forEach((point, col) => {
          if (col === 0) ctx.moveTo(point.x, point.y)
          else ctx.lineTo(point.x, point.y)
        })
        ;[...points[row + 1]].reverse().forEach(point => ctx.lineTo(point.x, point.y))
        ctx.closePath()
        ctx.fillStyle = `rgba(196, 218, 230, ${alpha})`
        ctx.fill()
      }
      ctx.restore()

      ctx.save()
      ctx.strokeStyle = 'rgba(205, 224, 234, 0.32)'
      ctx.lineWidth = 1
      points.forEach(line => {
        ctx.beginPath()
        line.forEach((point, col) => {
          if (col === 0) ctx.moveTo(point.x, point.y)
          else ctx.lineTo(point.x, point.y)
        })
        ctx.stroke()
      })
      for (let col = 0; col < columns; col += 3) {
        ctx.beginPath()
        points.forEach((line, row) => {
          const point = line[col]
          if (row === 0) ctx.moveTo(point.x, point.y)
          else ctx.lineTo(point.x, point.y)
        })
        ctx.stroke()
      }
      ctx.restore()

      const added = activeEntry?.diff?.added_count ?? 0
      const removed = activeEntry?.diff?.removed_count ?? 0
      const markers = Math.min(18, Math.max(6, Math.round((added + removed) / 70)))
      for (let i = 0; i < markers; i += 1) {
        const line = points[(i * 2) % rows]
        const point = line[(i * 5 + 3) % columns]
        const isRemoval = i % 4 === 0
        ctx.fillStyle = isRemoval ? 'rgba(248, 81, 73, 0.88)' : i % 3 === 0 ? 'rgba(210, 153, 34, 0.86)' : 'rgba(63, 185, 80, 0.88)'
        ctx.fillRect(point.x - 16, point.y - 2, 32 + (i % 3) * 16, 4)
      }

      ctx.save()
      ctx.fillStyle = 'rgba(1, 4, 9, 0.58)'
      ctx.strokeStyle = 'rgba(230, 237, 243, 0.2)'
      ctx.lineWidth = 1
      const panelWidth = Math.min(300, width * 0.42)
      const panelX = width - panelWidth - 24
      const panelY = height - 128
      ctx.beginPath()
      ctx.roundRect(panelX, panelY, panelWidth, 92, 8)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#aebdca'
      ctx.font = '10px IBM Plex Mono, monospace'
      ctx.fillText('ACTIVE PROMPT FORCE', panelX + 16, panelY + 24)
      ctx.fillStyle = '#f0f6fc'
      ctx.font = '16px Syne, sans-serif'
      ctx.fillText(`${formatNumber(activeEntry?.diff?.total_change ?? 0)} changed lines`, panelX + 16, panelY + 50)
      ctx.fillStyle = tagColor
      ctx.font = '11px IBM Plex Mono, monospace'
      ctx.fillText(activeTags.slice(0, 3).join(' / '), panelX + 16, panelY + 74)
      ctx.restore()

      if (!paused) animationId = window.requestAnimationFrame(draw)
    }

    resize()
    draw(performance.now())
    window.addEventListener('resize', resize)

    return () => {
      running = false
      window.cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [activeEntry, activeProfile?.currentPromptLength, activeTags, intensity, paused, stiffness, turbulence, weight, wind])

  return (
    <section className="content-section physics-lab-section" id="lab" aria-labelledby="lab-heading">
      <div className="section-heading split">
        <div>
          <p className="eyebrow">Lab</p>
          <h2 id="lab-heading">Prompt physics lab</h2>
          <p>Prompt fragments move like weighted sheets. Change volume, tag category, and prompt length drive the visual response.</p>
        </div>
        <span className="model-chip">
          <ModelMark model={activeProfile?.model} color={activeProfile?.color} size="sm" />
          {activeProfile?.label ?? 'Model'}
        </span>
      </div>

      <div className="physics-lab" style={{ '--model-color': activeProfile?.color ?? '#9db2c5' }}>
        <div className="physics-stage">
          <canvas ref={canvasRef} aria-label="Animated prompt sheet simulation" />
          <div className="physics-readout">
            <span>{activeEntry?.date ?? 'No date'}</span>
            <strong>{activeEntry ? cleanSummary(activeEntry) : 'No prompt change selected'}</strong>
            <em>{getLinePreview(activeEntry)}</em>
            <div className="tag-strip">
              {activeTags.slice(0, 4).map(tag => <TagBadge key={tag} tag={tag} />)}
            </div>
          </div>
        </div>

        <aside className="physics-controls" aria-label="Prompt physics controls">
          <label>
            Model
            <select value={activeProfile?.model ?? ''} onChange={event => { setSelectedModel(event.target.value); setFrameIndex(0) }}>
              {modelProfiles.map(profile => (
                <option key={profile.model} value={profile.model}>{profile.label}</option>
              ))}
            </select>
          </label>

          <label>
            Signal
            <select value={selectedTag} onChange={event => { setSelectedTag(event.target.value); setFrameIndex(0) }}>
              {LAB_TAGS.filter(tag => tag === 'all' || ALL_TAGS.includes(tag)).map(tag => (
                <option key={tag} value={tag}>{tag === 'all' ? 'All tags' : tag}</option>
              ))}
            </select>
          </label>

          <label>
            Timeline
            <input
              type="range"
              min="0"
              max={Math.max(modelEntries.length - 1, 0)}
              value={activeIndex}
              onChange={event => setFrameIndex(Number(event.target.value))}
            />
          </label>

          <label>
            Wind
            <input type="range" min="0" max="100" value={wind} onChange={event => setWind(Number(event.target.value))} />
          </label>

          <label>
            Turbulence
            <input type="range" min="0" max="100" value={turbulence} onChange={event => setTurbulence(Number(event.target.value))} />
          </label>

          <label>
            Stiffness
            <input type="range" min="0" max="100" value={stiffness} onChange={event => setStiffness(Number(event.target.value))} />
          </label>

          <div className="physics-metrics">
            <span><strong>{formatDelta(activeEntry?.prompt_delta)}</strong> delta</span>
            <span><strong>{formatNumber(activeEntry?.prompt_length)}</strong> chars</span>
            <span><strong>{activeEntry?.impact_level ?? 'n/a'}</strong> impact</span>
          </div>

          <div className="physics-actions">
            <button type="button" className="secondary-action" onClick={() => setPaused(value => !value)}>
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button type="button" className="secondary-action" onClick={() => { setWind(62); setTurbulence(48); setStiffness(56) }}>
              Reset
            </button>
            {activeEntry && (
              <button type="button" className="primary-action" onClick={() => onOpen(activeEntry, 'diff')}>
                Open diff
              </button>
            )}
          </div>
        </aside>
      </div>
    </section>
  )
}
