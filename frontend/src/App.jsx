import { useTimeline } from './hooks/useTimeline'
import StatsBar from './components/StatsBar'

export default function App() {
  const { data, error } = useTimeline()
  if (error) return <div className="p-8 text-red-acc font-mono text-sm">Error: {error.message}</div>
  if (!data) return <div className="p-8 text-muted font-mono text-sm">Loading...</div>
  return (
    <div className="min-h-screen bg-bg">
      <StatsBar data={data} />
      <p className="px-6 py-4 font-mono text-xs text-muted">models: {data.models.join(', ')}</p>
    </div>
  )
}
