import { TAG_COLORS } from '../utils/tagColors'

export default function TagBadge({ tag }) {
  const color = TAG_COLORS[tag] ?? TAG_COLORS.other
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full border font-mono font-semibold uppercase tracking-wide"
      style={{ color, backgroundColor: `${color}1a`, borderColor: `${color}44` }}
    >
      {tag}
    </span>
  )
}
