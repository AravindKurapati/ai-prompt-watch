import { TAG_COLORS } from '../utils/tagColors'

export default function TagBadge({ tag }) {
  const color = TAG_COLORS[tag] ?? TAG_COLORS.other
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full border font-mono"
      style={{ color, backgroundColor: `${color}22`, borderColor: `${color}44` }}
    >
      {tag}
    </span>
  )
}
