import { MODEL_META } from '../utils/tagColors'

export default function ModelMark({ model, label, color, size = 'md' }) {
  const meta = MODEL_META[model] ?? { label, color, mark: label?.[0] ?? '?' }
  return (
    <span className={`model-mark model-mark-${size}`} style={{ '--model-color': color ?? meta.color }} aria-hidden="true">
      <span>{meta.mark}</span>
    </span>
  )
}
