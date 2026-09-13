import { rideItems, dayItems } from '@/lib/manager/forms';
import type { FormRow } from '@/lib/training/types';
export function Evaluation({
  type,
  existing,
  action,
}: {
  type: 'ride_along' | 'day5_eval' | 'hcp_exercise';
  existing?: FormRow;
  action: (data: FormData) => Promise<void>;
}) {
  const items: Record<string, string> =
    type === 'ride_along' ? rideItems : type === 'day5_eval' ? dayItems : {};
  const response = existing?.responses ?? {};
  const ratings = response.ratings as
    Record<string, { score: number; notes: string }> | undefined;
  return (
    <section className="training-card" aria-label={type}>
      <h2>
        {type === 'ride_along'
          ? 'Ride-along checklist'
          : type === 'day5_eval'
            ? 'Day 5 evaluation'
            : 'HCP exercise sign-off'}
      </h2>
      {existing && (
        <p>
          Last saved{' '}
          {new Date(existing.completed_at!).toLocaleDateString('en-US')}
        </p>
      )}
      <form action={action}>
        <input type="hidden" name="type" value={type} />
        {Object.entries(items).map(([key, label]) => (
          <fieldset key={key}>
            <legend>{label}</legend>
            <label>
              Rating: {label}
              <select
                name={key}
                required
                defaultValue={ratings?.[key]?.score ?? ''}
              >
                <option value="">Choose 1–5</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}{' '}
                    {n === 1
                      ? '— Needs coaching'
                      : n === 5
                        ? '— Consistent and confident'
                        : ''}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Notes: {label}
              <textarea
                name={`${key}_notes`}
                maxLength={2000}
                defaultValue={ratings?.[key]?.notes ?? ''}
              />
            </label>
          </fieldset>
        ))}
        {type === 'day5_eval' && (
          <>
            <label>
              Strengths
              <textarea
                name="strengths"
                required
                maxLength={3000}
                defaultValue={String(response.strengths ?? '')}
              />
            </label>
            <label>
              Weaknesses and coaching plan
              <textarea
                name="weaknesses"
                required
                maxLength={3000}
                defaultValue={String(response.weaknesses ?? '')}
              />
            </label>
          </>
        )}
        {type !== 'ride_along' && (
          <label>
            <input
              type="checkbox"
              name="passed"
              defaultChecked={existing?.passed}
            />{' '}
            {type === 'day5_eval'
              ? 'Day 5 passed'
              : 'HCP estimate exercise complete'}
          </label>
        )}
        <label>
          Overall notes
          <textarea
            name="notes"
            maxLength={4000}
            defaultValue={existing?.notes ?? ''}
          />
        </label>
        <button>
          Save{' '}
          {type === 'ride_along'
            ? 'ride-along'
            : type === 'day5_eval'
              ? 'Day 5'
              : 'HCP sign-off'}
        </button>
      </form>
    </section>
  );
}
