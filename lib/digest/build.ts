import { z } from 'zod';
const textBlock = z
  .object({
    type: z.literal('TextBlock'),
    text: z.string().min(1),
    wrap: z.literal(true),
    weight: z.literal('Bolder').optional(),
    size: z.literal('Medium').optional(),
  })
  .strict();
export const adaptiveSchema = z
  .object({
    type: z.literal('message'),
    attachments: z
      .array(
        z
          .object({
            contentType: z.literal('application/vnd.microsoft.card.adaptive'),
            contentUrl: z.null(),
            content: z
              .object({
                $schema: z.literal(
                  'http://adaptivecards.io/schemas/adaptive-card.json',
                ),
                type: z.literal('AdaptiveCard'),
                version: z.literal('1.2'),
                body: z.array(textBlock).min(1),
              })
              .strict(),
          })
          .strict(),
      )
      .length(1),
  })
  .strict();
export type DigestMember = {
  id: string;
  email: string;
  created_at: string;
  activity: string[];
  started: string[];
  passes: { title: string; at: string }[];
  sims: { tier: string; at: string }[];
};
export function denverDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
export function scheduledNow(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    weekday: 'short',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return (
    parts.find((p) => p.type === 'weekday')?.value === 'Mon' &&
    parts.find((p) => p.type === 'hour')?.value === '07'
  );
}
export function reportingWeek(now: Date) {
  const end = new Date(denverDate(now) + 'T00:00:00Z');
  end.setUTCDate(end.getUTCDate() - ((end.getUTCDay() + 6) % 7));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 7);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}
export function buildDigest(
  tenant: string,
  members: DigestMember[],
  now = new Date(),
) {
  const week = reportingWeek(now),
    within = (at: string) => {
      const d = denverDate(new Date(at));
      return d >= week.start && d < week.end;
    };
  const started = members.filter(
    (m) => m.started.length && within([...m.started].sort()[0]),
  );
  const passed = members.flatMap((m) =>
    m.passes.filter((p) => within(p.at)).map((p) => `${m.email}: ${p.title}`),
  );
  const sims = members.flatMap((m) =>
    m.sims.filter((p) => within(p.at)).map((p) => ({ email: m.email, ...p })),
  );
  const stalled = members.filter(
    (m) =>
      now.getTime() -
        Math.max(
          new Date(m.created_at).getTime(),
          ...m.activity.map((a) => new Date(a).getTime()),
        ) >
        3 * 86400000 && !m.passes.some((p) => p.title === 'Field'),
  );
  const escape = (s: string) => s.replace(/[\[\]<>*_`]/g, '').slice(0, 220);
  const list = (values: string[]) =>
    values.length
      ? values.slice(0, 20).map(escape).join('\n') +
        (values.length > 20
          ? `\n…and ${values.length - 20} more; see Academy.`
          : '')
      : 'None';
  const block = (text: string) => ({
    type: 'TextBlock' as const,
    text,
    wrap: true as const,
  });
  const card = adaptiveSchema.parse({
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        contentUrl: null,
        content: {
          $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
          type: 'AdaptiveCard',
          version: '1.2',
          body: [
            {
              ...block(`${tenant} · Academy weekly digest`),
              weight: 'Bolder',
              size: 'Medium',
            },
            block(
              `Reporting week ${week.start} to ${week.end} (end exclusive), America/Denver`,
            ),
            block(
              `Trainees started: ${started.length}\n${list(started.map((m) => m.email))}`,
            ),
            block(`Modules passed: ${passed.length}\n${list(passed)}`),
            block(
              `Simulator passes: ${['warm', 'standard', 'hard'].map((t) => `${t} ${sims.filter((s) => s.tier === t).length}`).join(' · ')}\n${list(sims.map((s) => `${s.email}: ${s.tier}`))}`,
            ),
            block(
              `No activity for more than 3 days: ${stalled.length}\n${list(stalled.map((m) => m.email))}`,
            ),
          ],
        },
      },
    ],
  });
  if (Buffer.byteLength(JSON.stringify(card)) > 27000)
    throw new Error('Digest exceeds delivery limit');
  return { week, payload: card };
}
