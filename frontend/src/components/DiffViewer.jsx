import ReactDiffViewer from 'react-diff-viewer-continued'

const STYLES = {
  variables: {
    dark: {
      diffViewerBackground:  '#0d1117',
      addedBackground:       '#0e4429',
      addedColor:            '#3fb950',
      removedBackground:     '#4b1113',
      removedColor:          '#f85149',
      wordAddedBackground:   '#1a7f37',
      wordRemovedBackground: '#7d2026',
      gutterBackground:      '#161b22',
      gutterColor:           '#8b949e',
    },
  },
}

export default function DiffViewer({ diff }) {
  const oldValue = (diff.removed || []).join('\n')
  const newValue = (diff.added   || []).join('\n')
  const truncated = (diff.added_count ?? 0) > 30 || (diff.removed_count ?? 0) > 30

  return (
    <div className="mt-3">
      <ReactDiffViewer
        oldValue={oldValue}
        newValue={newValue}
        splitView={true}
        useDarkTheme={true}
        styles={STYLES}
        leftTitle="removed"
        rightTitle="added"
      />
      <p className="text-xs text-muted font-mono mt-1.5">
        {truncated
          ? `showing first 30 of ${Math.max(diff.added_count ?? 0, diff.removed_count ?? 0)} changed lines`
          : 'showing all changed lines'}
      </p>
    </div>
  )
}
