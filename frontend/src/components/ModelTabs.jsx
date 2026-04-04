import * as Tabs from '@radix-ui/react-tabs'
import { MODEL_META } from '../utils/tagColors'
import Timeline from './Timeline'

export default function ModelTabs({ timelines, onViewPrompt }) {
  const modelKeys = Object.keys(MODEL_META)
  const tabs = modelKeys.map(k => ({
    value: k,
    label: MODEL_META[k].label,
    count: timelines[k]?.length ?? 0,
  }))

  return (
    <Tabs.Root defaultValue={modelKeys[0]} className="flex flex-col">
      <Tabs.List className="flex border-b border-border-dim overflow-x-auto">
        {tabs.map(({ value, label, count }) => (
          <Tabs.Trigger
            key={value}
            value={value}
            className="font-display text-sm px-4 py-2.5 text-muted shrink-0 border-b-2 border-transparent data-[state=active]:text-primary data-[state=active]:border-blue-acc -mb-px transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            {label}
            <span className="font-mono text-[10px] bg-surface border border-border-dim px-1.5 py-0.5 rounded-full text-muted">
              {count}
            </span>
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      <div className="pt-4">
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
