import { useEffect } from 'react'
import { MODEL_META } from '../utils/tagColors'

export default function FullPromptViewer({ entry, modelName, onClose }) {
  const label = MODEL_META[modelName]?.label ?? modelName

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function handleCopy() {
    navigator.clipboard.writeText(entry.content_snapshot ?? '')
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-[45vw] min-w-80 bg-surface border-l border-border-dim z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border-dim shrink-0">
          <span className="font-mono text-xs">
            <span className="text-blue-acc">{label}</span>
            <span className="text-muted"> · {entry.date} · {entry.commit}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="text-xs font-mono px-3 py-1 bg-bg border border-border-dim text-muted hover:text-primary rounded transition-colors"
            >
              copy
            </button>
            <button onClick={onClose} className="text-muted hover:text-primary text-base px-1 leading-none">
              ✕
            </button>
          </div>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <pre className="font-mono text-xs text-primary leading-relaxed whitespace-pre-wrap break-words">
            {entry.content_snapshot ?? 'No prompt content available.'}
          </pre>
        </div>
      </div>
    </>
  )
}
