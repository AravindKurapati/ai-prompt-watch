export default function MethodologyPanel({ sources }) {
  const sourceEntries = Object.entries(sources ?? {})

  return (
    <section className="methodology-grid" aria-labelledby="methodology">
      <article>
        <p className="eyebrow">Methodology</p>
        <h2 id="methodology">Evidence first, inference second</h2>
        <p>
          Prompt changes are pulled from canonical tracked files, normalized into diffs, tagged with deterministic
          rules, and summarized for scanning. Full prompt snapshots load on demand from separate text files.
        </p>
        <p>
          Impact labels rank changelog significance inside this dataset. They are based on diff size, prompt-length
          movement, behavioral tags, and changed prompt sections.
        </p>
      </article>
      <article>
        <p className="eyebrow">Known Limitations</p>
        <h2>What not to overread</h2>
        <p>
          Prompt diffs do not prove runtime behavior. Summaries are model-assisted, source files may be partial,
          and a quiet timeline does not mean the product itself stayed quiet.
        </p>
        <p>
          Section labels are rule-based. They are useful for navigation and comparison, but they are not a formal
          safety evaluation.
        </p>
      </article>
      <article className="source-card">
        <p className="eyebrow">Source Provenance</p>
        <h2>Tracked files</h2>
        <div className="source-list">
          {sourceEntries.map(([model, source]) => (
            <span key={model}>
              <strong>{source.provider ?? model}</strong>
              {source.canonical_path ?? 'path unavailable'}
            </span>
          ))}
        </div>
      </article>
    </section>
  )
}
