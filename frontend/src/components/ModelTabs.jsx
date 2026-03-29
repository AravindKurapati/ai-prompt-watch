import * as Tabs from '@radix-ui/react-tabs'
import { MODEL_META } from '../utils/tagColors'
import Timeline from './Timeline'

export default function ModelTabs({ timelines, overviewContent, onViewPrompt }) {
  const modelKeys = Object.keys(MODEL_META)

  return (
    <Tabs.Root defaultValue="overview" className="flex-1">
      <Tabs.List className="flex border-b border-border-dim px-6 overflow-x-auto">
        {[
          { value: 'overview', label: 'Overview', count: null },
          ...modelKeys.map(k => ({
            value: k,
            label: MODEL_META[k].label,
            count: timelines[k]?.length ?? 0,
          })),
        ].map(({ value, label, count }) => (
          <Tabs.Trigger
            key={value}
            value={value}
            className="font-display text-sm px-4 py-3 text-muted shrink-0 border-b-2 border-transparent data-[state=active]:text-primary data-[state=active]:border-blue-acc -mb-px transition-colors whitespace-nowrap"
          >
            {label}
            {count !== null && (
              <span className="ml-1.5 font-mono text-xs text-muted">{count}</span>
            )}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <div className="px-6 py-4">
        <Tabs.Content value="overview">{overviewContent}</Tabs.Content>
        {modelKeys.map(key => (
          <Tabs.Content key={key} value={key}>
            <Timeline
              entries={timelines[key] ?? []}
              modelName={key}
              onViewPrompt={onViewPrompt}
            />
          </Tabs.Content>
        ))}
      </div>
    </Tabs.Root>
  )
}
