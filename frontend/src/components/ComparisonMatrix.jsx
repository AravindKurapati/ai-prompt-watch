import { MODEL_META } from '../utils/tagColors'

const SECTIONS = [
  ['identity_persona', 'Persona'],
  ['safety_policy', 'Safety'],
  ['tool_use', 'Tools'],
  ['memory_context', 'Memory'],
  ['formatting_output', 'Format'],
  ['workflow_instructions', 'Workflow'],
  ['security_boundaries', 'Security'],
]

export default function ComparisonMatrix({ comparison, stats }) {
  const models = Object.keys(comparison ?? {})

  if (!models.length) return null

  return (
    <section className="comparison-section" aria-labelledby="comparison-matrix">
      <div className="row-heading">
        <h2 id="comparison-matrix">Model Comparison Matrix</h2>
        <span>computed from section frequency</span>
      </div>
      <div className="comparison-table" role="table" aria-label="Model comparison matrix">
        <div className="comparison-row header" role="row">
          <span role="columnheader">Section</span>
          {models.map(model => (
            <span key={model} role="columnheader">{MODEL_META[model]?.label ?? model}</span>
          ))}
        </div>
        {SECTIONS.map(([section, label]) => (
          <div className="comparison-row" role="row" key={section}>
            <span role="cell">{label}</span>
            {models.map(model => (
              <span
                key={model}
                role="cell"
                className={`matrix-level level-${comparison[model]?.[section] ?? 'none'}`}
              >
                {comparison[model]?.[section] ?? 'none'}
              </span>
            ))}
          </div>
        ))}
      </div>
      <p className="matrix-note">
        Labels are relative to each model's tracked changes, not claims about live model behavior.
        Current prompt sizes range from {models.map(model => `${MODEL_META[model]?.label ?? model}: ${stats?.[model]?.current_prompt_length ?? 'n/a'}`).join(' / ')}.
      </p>
    </section>
  )
}
