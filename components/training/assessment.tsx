'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
type Draw = {
  id: string;
  questions: { id: string; prompt: string; options: string[] }[];
};
export function Assessment({
  module,
  quiz,
  prompt,
  diagram,
}: {
  module: string;
  quiz?: string;
  prompt?: string;
  diagram?: string[];
}) {
  const [draw, setDraw] = useState<Draw | null>(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const router = useRouter();
  async function send(body: object) {
    setBusy(true);
    setMessage('');
    try {
      const r = await fetch('/learn/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, module }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? 'Please try again');
      if (data.attempt) setDraw(data.attempt);
      if (data.grade) {
        const g = data.grade;
        setMessage(
          g.feedback ??
            (g.score !== undefined
              ? `${g.score}% · ${g.passed ? 'Passed' : 'Keep practicing — 90% required'}`
              : g.passed
                ? 'Diagram passed'
                : 'Check your measurements and try again'),
        );
        setDraw(null);
        router.refresh();
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Please try again');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="training-card">
      <h2>
        {quiz === 'exam'
          ? 'Module exam'
          : quiz
            ? 'Lesson check'
            : diagram
              ? 'Diagram exercise'
              : 'Explain it in your words'}
      </h2>
      {message && (
        <p role="status" className="training-feedback">
          {message}
        </p>
      )}
      {quiz && !draw && (
        <button disabled={busy} onClick={() => send({ action: 'start', quiz })}>
          Start {quiz === 'exam' ? 'exam' : 'check'}
        </button>
      )}
      {draw && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            send({
              action: 'submit',
              id: draw.id,
              answers: Object.fromEntries(
                draw.questions.map((q) => [q.id, Number(data.get(q.id))]),
              ),
            });
          }}
        >
          {draw.questions.map((q, i) => (
            <fieldset key={q.id}>
              <legend>
                {i + 1}. {q.prompt}
              </legend>
              {q.options.map((o, n) => (
                <label className="choice" key={o}>
                  <input required type="radio" name={q.id} value={n} />
                  {o}
                </label>
              ))}
            </fieldset>
          ))}
          <button disabled={busy}>Submit answers</button>
        </form>
      )}
      {prompt && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send({
              action: 'freetext',
              answer: new FormData(e.currentTarget).get('answer'),
            });
          }}
        >
          <p>{prompt}</p>
          <label>
            Your response
            <textarea
              name="answer"
              required
              minLength={20}
              maxLength={6000}
              rows={6}
            />
          </label>
          <button disabled={busy}>Submit explanation</button>
        </form>
      )}
      {diagram && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            send({
              action: 'diagram',
              answers: Object.fromEntries(
                diagram.map((k) => [k, Number(data.get(k))]),
              ),
            });
          }}
        >
          <p>Use the diagram in the lesson. Each figure accepts ±5%.</p>
          {diagram.map((k) => (
            <label key={k}>
              {k.replaceAll('_', ' ')}
              <input name={k} type="number" min="0" step="any" required />
            </label>
          ))}
          <button disabled={busy}>Check diagram</button>
        </form>
      )}
    </section>
  );
}
