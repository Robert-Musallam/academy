'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { publicPersona, publicRun } from '@/lib/sim/engine';

type Persona = ReturnType<typeof publicPersona>;
type Appointment = ReturnType<typeof publicRun>;
type Tier = Persona['tier'];
const labels = {
  rapport: 'Introduction & rapport',
  discovery: 'Discovery',
  measurement: 'Measurement & pricing',
  education: 'Education before price',
  objections: 'Objection handling',
  close: 'The close',
  next_step: 'Next step',
};
const maxima = {
  rapport: 10,
  discovery: 15,
  measurement: 10,
  education: 20,
  objections: 15,
  close: 20,
  next_step: 10,
};
export function Simulator({
  personas,
  endpoint,
  preview = false,
  mock = false,
}: {
  personas: Persona[];
  endpoint: string;
  preview?: boolean;
  mock?: boolean;
}) {
  const [tier, setTier] = useState<Tier>('warm');
  const [selected, setSelected] = useState(
    personas.find((p) => p.tier === 'warm')?.slug ?? personas[0].slug,
  );
  const persona = personas.find((p) => p.slug === selected)!;
  const [scenarioId, setScenarioId] = useState(persona.scenarios[0].id);
  const [run, setRun] = useState<Appointment | null>(null);
  const [history, setHistory] = useState<Appointment[]>([]);
  const [view, setView] = useState<'choose' | 'appointment' | 'history'>(
    'choose',
  );
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fetch(endpoint)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setHistory(d.history))
      .catch(() =>
        setError('Could not load appointment history. Reload to try again.'),
      );
  }, [endpoint]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [run?.messages.length, busy]);
  async function act(body: object) {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({
        error:
          'Could not complete the request. Reload the preview and try again.',
      }));
      if (!response.ok)
        throw new Error(data.error ?? 'Request failed. Try again.');
      setRun(data.run);
      setHistory(data.history);
      setView('appointment');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed. Try again.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function send(event: FormEvent) {
    event.preventDefault();
    if (run && (await act({ action: 'send', id: run.id, text }))) setText('');
  }
  const selectPersona = (p: Persona) => {
    setSelected(p.slug);
    setScenarioId(p.scenarios[0].id);
  };
  const chooseTier = (t: Tier) => {
    setTier(t);
    selectPersona(personas.find((p) => p.tier === t)!);
  };
  return (
    <div className="sim-shell">
      <header className="sim-header">
        <a href={preview ? '/review' : '/learn'} className="sim-brand">
          <span className="sim-mark">A</span> ACADEMY
          <span className="sim-brand-divider">/</span>
          <span className="sim-brand-track">Rock N Block</span>
        </a>
        <span className="sim-track-label">SALES & DESIGN CONSULTANT</span>
      </header>
      {(preview || mock) && (
        <div className="sim-preview-banner">
          <strong>{preview ? 'Interactive preview' : 'Practice mode'}</strong>
          <a
            href={preview ? '/review/yard' : '/learn/field-lab'}
            className="font-semibold underline"
          >
            Open the 3D field lab →
          </a>
          <span>
            Scripted homeowner replies · Illustrative scores · Practice only
          </span>
        </div>
      )}
      <main className="sim-main">
        <div className="sim-page-heading">
          <div>
            <p className="sim-eyebrow">MODULE 06 / THE APPOINTMENT LAB</p>
            <h1>Practice the conversation.</h1>
            <p>Build trust. Explain the value. Earn the next step.</p>
          </div>
          <nav aria-label="Simulator views" className="sim-view-tabs">
            <button
              aria-current={view !== 'history' ? 'page' : undefined}
              onClick={() =>
                setView(run?.status === 'active' ? 'appointment' : 'choose')
              }
            >
              Practice
            </button>
            <button
              aria-current={view === 'history' ? 'page' : undefined}
              onClick={() => setView('history')}
            >
              History <span>{history.length}</span>
            </button>
          </nav>
        </div>
        {error && (
          <p role="alert" className="sim-error">
            {error}
          </p>
        )}
        {view === 'choose' && (
          <>
            <div className="sim-stage-heading">
              <div>
                <h2>Meet your next homeowner</h2>
                <p>
                  Six personalities. Eighteen appointments. A different
                  challenge each time.
                </p>
              </div>
              <span className="sim-meta">
                40 turns / appointment · 10 starts / day (UTC)
              </span>
            </div>
            <div className="sim-tier-tabs" role="group" aria-label="Difficulty">
              {(['warm', 'standard', 'hard'] as Tier[]).map((t) => (
                <button
                  key={t}
                  aria-pressed={tier === t}
                  onClick={() => chooseTier(t)}
                >
                  <span>{t}</span>
                  <small>
                    {t === 'warm'
                      ? 'Build your rhythm'
                      : t === 'standard'
                        ? 'Work through hesitation'
                        : 'Earn their trust'}
                  </small>
                </button>
              ))}
            </div>
            <div className="sim-picker-grid">
              <section aria-label="Homeowners" className="sim-personas">
                {personas
                  .filter((p) => p.tier === tier)
                  .map((p, index) => (
                    <button
                      className="sim-persona"
                      aria-pressed={selected === p.slug}
                      key={p.slug}
                      onClick={() => selectPersona(p)}
                    >
                      <span className={'sim-avatar tone-' + index}>
                        {p.name
                          .split(' ')
                          .map((x) => x[0])
                          .filter((x) => x !== '&')
                          .slice(0, 2)
                          .join('')}
                      </span>
                      <span>
                        <strong>{p.name}</strong>
                        <small>{p.scenarios[0].project}</small>
                        <span className="sim-persona-count">
                          3 scenarios to explore
                        </span>
                      </span>
                      <span className="sim-radio">
                        {selected === p.slug ? '●' : '○'}
                      </span>
                    </button>
                  ))}
                <aside className="sim-coach-note">
                  <span className="sim-eyebrow">
                    A GOOD APPOINTMENT STARTS WITH CURIOSITY
                  </span>
                  <p>
                    You know the project request. Their priorities, concerns and
                    budget are yours to discover.
                  </p>
                  <p>
                    Listen first. The best question is usually better than
                    another pitch.
                  </p>
                </aside>
              </section>
              <section className="sim-scenario-panel">
                <div className="sim-panel-heading">
                  <p className="sim-eyebrow">
                    YOUR APPOINTMENT WITH {persona.name.toUpperCase()}
                  </p>
                  <h3>Choose the project.</h3>
                </div>
                <div className="sim-scenario-options">
                  {persona.scenarios.map((s, i) => (
                    <label
                      key={s.id}
                      className={
                        scenarioId === s.id
                          ? 'sim-scenario selected'
                          : 'sim-scenario'
                      }
                    >
                      <input
                        type="radio"
                        name="scenario"
                        value={s.id}
                        checked={scenarioId === s.id}
                        onChange={() => setScenarioId(s.id)}
                      />
                      <span className="sim-scenario-number">0{i + 1}</span>
                      <span>
                        <strong>{s.title}</strong>
                        <small>{s.size}</small>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="sim-brief">
                  <p>
                    <strong>Appointment brief</strong>
                  </p>
                  <p>
                    {
                      persona.scenarios.find((s) => s.id === scenarioId)
                        ?.project
                    }{' '}
                    · {persona.scenarios.find((s) => s.id === scenarioId)?.size}
                  </p>
                  <p>
                    Introduce yourself, discover what matters, and guide the
                    homeowner through your proposal.
                  </p>
                </div>
                <button
                  className="sim-button primary"
                  disabled={busy}
                  onClick={() =>
                    act({
                      action: 'start',
                      persona: persona.slug,
                      scenario: scenarioId,
                    })
                  }
                >
                  {busy ? 'Preparing appointment…' : 'Start appointment'}{' '}
                  <span aria-hidden>→</span>
                </button>
                <p className="sim-footnote">
                  {preview
                    ? 'Preview appointments do not count toward training completion.'
                    : 'Complete a passing appointment in each tier to finish this module.'}
                </p>
              </section>
            </div>
          </>
        )}
        {view === 'appointment' && run && (
          <div className="sim-appointment-grid">
            <section className="sim-conversation">
              <div className="sim-chat-heading">
                <div>
                  <span className="sim-tier-pill">{run.tier}</span>
                  <h2>{run.name}</h2>
                  <p>{run.scenario}</p>
                </div>
                <span className="sim-turn-count">{run.turns} / 40 turns</span>
              </div>
              <div
                className="sim-messages"
                role="log"
                aria-label="Appointment conversation"
                aria-live="polite"
              >
                {run.messages.map((m, i) => (
                  <div key={i} className={'sim-message ' + m.role}>
                    <span>
                      {m.role === 'user' ? 'YOU' : run.name.toUpperCase()}
                    </span>
                    <p>{m.content}</p>
                  </div>
                ))}
                {busy && (
                  <p className="sim-thinking" role="status">
                    {run.status === 'active'
                      ? 'Working on your appointment…'
                      : 'Preparing feedback…'}
                  </p>
                )}
                <div ref={endRef} />
              </div>
              {run.status === 'active' && (
                <form className="sim-compose" onSubmit={send}>
                  <label className="sr-only" htmlFor="reply">
                    Your reply
                  </label>
                  <textarea
                    id="reply"
                    placeholder="What would you say to the homeowner?"
                    value={text}
                    maxLength={4000}
                    onChange={(e) => setText(e.target.value)}
                    disabled={busy || run.turns >= 40}
                    rows={3}
                  />
                  <div>
                    <small>{text.length} / 4,000</small>
                    <button
                      className="sim-button primary"
                      disabled={busy || !text.trim() || run.turns >= 40}
                      type="submit"
                    >
                      Send reply ↑
                    </button>
                  </div>
                </form>
              )}
            </section>
            <aside className="sim-appointment-sidebar">
              {run.status === 'active' ? (
                <>
                  <p className="sim-eyebrow">APPOINTMENT NOTES</p>
                  <h3>Lead with understanding.</h3>
                  <ol>
                    <li>Discover their vision and priorities.</li>
                    <li>Explain products, installation and warranty.</li>
                    <li>Present the complete proposal and financing.</li>
                    <li>Address concerns and ask for the business.</li>
                    <li>Agree on the next contact.</li>
                  </ol>
                  <details>
                    <summary>Current territory guidance</summary>
                    <p>
                      Same-day drop cap:{' '}
                      <strong>{run.policy.max_same_day_drop_percent}%</strong>,
                      only after the full proposal and reinforced value.
                    </p>
                    <p>
                      Turf: lifetime. Pavers/materials: 3 years. Labor: 3 years.
                    </p>
                    <p>Base: {run.policy.turf_base}.</p>
                  </details>
                  <button
                    className="sim-button secondary"
                    disabled={busy || run.turns === 0}
                    onClick={() => act({ action: 'end', id: run.id })}
                  >
                    End & see feedback
                  </button>
                  <p className="sim-footnote">
                    End when your appointment has reached its next step. At 40
                    turns, end to view feedback.
                  </p>
                  {(preview || mock) && (
                    <p className="sim-mock-note">
                      This preview uses scripted replies. The sample score
                      demonstrates the feedback layout; it does not measure your
                      sales skill.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="sim-eyebrow">APPOINTMENT COMPLETE</p>
                  <h3>Take one improvement into the next conversation.</h3>
                  <button
                    className="sim-button primary"
                    onClick={() => {
                      setRun(null);
                      setView('choose');
                    }}
                  >
                    Choose another scenario →
                  </button>
                </>
              )}
            </aside>
            {run.grade && (
              <section className="sim-grade" aria-label="Grade card">
                <div className="sim-grade-summary">
                  <div>
                    <p className="sim-eyebrow">
                      {preview ? 'ILLUSTRATIVE FEEDBACK' : 'YOUR FEEDBACK'}
                    </p>
                    <h2>
                      {preview
                        ? 'Sample assessment'
                        : run.grade.passed
                          ? 'Appointment passed'
                          : 'Keep practicing'}
                    </h2>
                    <p>
                      {preview
                        ? 'Fixed mock scores show how feedback will appear. Live evaluation comes after provider setup.'
                        : 'Pass requires 75 overall and at least half the points in every dimension.'}
                    </p>
                  </div>
                  <div className="sim-score">
                    <strong>{run.grade.total_score}</strong>
                    <span>/ 100</span>
                    <small>
                      {preview
                        ? 'SAMPLE'
                        : run.grade.passed
                          ? 'PASSED'
                          : 'TRY AGAIN'}
                    </small>
                  </div>
                </div>
                <div className="sim-grade-grid">
                  <div>
                    <h3>The seven dimensions</h3>
                    {Object.entries(run.grade.dimensions).map(([key, d]) => (
                      <div className="sim-dimension" key={key}>
                        <div>
                          <span>{labels[key as keyof typeof labels]}</span>
                          <strong>
                            {d.score} / {maxima[key as keyof typeof maxima]}
                          </strong>
                        </div>
                        <meter
                          min={0}
                          max={maxima[key as keyof typeof maxima]}
                          value={d.score}
                          aria-label={labels[key as keyof typeof labels]}
                        />
                        <p>{d.reason}</p>
                      </div>
                    ))}
                  </div>
                  <div className="sim-fixes">
                    <h3>Three lines to improve</h3>
                    {run.grade.fixes.map((f, i) => (
                      <article key={i}>
                        <span className="sim-eyebrow">
                          0{i + 1} / TRY THIS NEXT TIME
                        </span>
                        <blockquote>“{f.quote}”</blockquote>
                        <p>{f.suggestion}</p>
                      </article>
                    ))}
                    <div className="sim-well">
                      <strong>One thing done well</strong>
                      <p>{run.grade.done_well}</p>
                    </div>
                  </div>
                </div>
                {run.grade.early_drop && (
                  <p className="sim-error">
                    Early drop detected: close capped at 9/20. Reinforce value
                    and present the full proposal before offering a discount.
                  </p>
                )}
              </section>
            )}
          </div>
        )}
        {view === 'history' && (
          <section className="sim-history">
            <div className="sim-stage-heading">
              <div>
                <h2>Your appointment history</h2>
                <p>
                  {preview
                    ? 'Local preview sessions only. History resets when the preview server restarts.'
                    : 'Revisit a conversation and bring its lessons into the next one.'}
                </p>
              </div>
            </div>
            {history.length === 0 ? (
              <div className="sim-empty">
                <h3>Your first appointment is waiting.</h3>
                <p>Choose a homeowner and start the conversation.</p>
                <button
                  className="sim-button primary"
                  onClick={() => setView('choose')}
                >
                  Choose an appointment →
                </button>
              </div>
            ) : (
              <div className="sim-history-list">
                {[...history].reverse().map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      setRun(r);
                      setView('appointment');
                    }}
                  >
                    <span>
                      <strong>{r.name}</strong>
                      <small>{r.scenario}</small>
                    </span>
                    <span className="sim-tier-pill">{r.tier}</span>
                    <span>
                      {r.grade
                        ? `${r.grade.total_score}/100${preview ? ' · sample' : ''}`
                        : `${r.turns} turns · resume`}
                    </span>
                    <span aria-hidden>→</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
        <footer className="sim-footer">
          <span>ROCK N BLOCK / ACADEMY</span>
          <span>Confidence comes from practice.</span>
        </footer>
      </main>
    </div>
  );
}
