import PromptChangeCard from './PromptChangeCard'

export default function BrowseRow({ title, entries, onOpen }) {
  if (!entries?.length) return null

  return (
    <section className="browse-row" aria-labelledby={`${title.replace(/\W+/g, '-').toLowerCase()}-row`}>
      <div className="row-heading">
        <h2 id={`${title.replace(/\W+/g, '-').toLowerCase()}-row`}>{title}</h2>
        <span>{entries.length} change{entries.length === 1 ? '' : 's'}</span>
      </div>
      <div className="row-scroller">
        {entries.slice(0, 12).map(entry => (
          <PromptChangeCard key={`${entry.model}-${entry.commit}-${entry.date}`} entry={entry} onOpen={onOpen} />
        ))}
      </div>
    </section>
  )
}
