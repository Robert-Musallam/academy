// The only module allowed to contact an LLM. Credentials are read by runtime only.
import { z } from 'zod';
import type { Message, Persona, Scenario } from '@/lib/sim/schema';

export type Usage = {
  provider: string;
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  estimated_cost_usd: number;
};
export type Result<T> = { value: T; usage: Usage };
export type ChatInput = {
  system: string;
  messages: Message[];
  persona: Persona;
  scenario: Scenario;
};
export interface Provider {
  chat(input: ChatInput): Promise<Result<string>>;
  gradeJSON<T>(input: {
    system: string;
    messages: Message[];
    schema: z.ZodType<T>;
    mockValue: T;
  }): Promise<Result<T>>;
}
const mockUsage: Usage = {
  provider: 'mock',
  model: 'scripted-v1',
  prompt_tokens: 0,
  completion_tokens: 0,
  estimated_cost_usd: 0,
};
export class MockProvider implements Provider {
  async chat({ messages, persona, scenario }: ChatInput) {
    const turn = messages.filter((m) => m.role === 'user').length;
    const last = messages.at(-1)?.content.toLowerCase() ?? '';
    let value = persona.triggers.find((t) => t.after_turn === turn)?.line;
    if (!value) {
      if (/budget|investment.*comfortable/.test(last))
        value = `I had ${scenario.hidden_budget} in mind. Help me understand what that includes.`;
      else if (
        /vision|accomplish|use.*space|matter|priority|important/.test(last)
      )
        value = `${scenario.priority} ${scenario.constraint}`;
      else if (/spouse|partner|decision/.test(last))
        value = persona.spouse_status;
      else if (/next.*contact|follow.up|call.*tomorrow|phone number/.test(last))
        value =
          'Tomorrow afternoon works for a follow-up. What number should I use to reach you?';
      else if (/ready.*move|earn.*business|move forward/.test(last))
        value = `Before deciding, I need this addressed: ${persona.same_day_close_condition}`;
      else
        value = [
          'Can you walk me through what that means for this project?',
          'How does that help with what I told you matters to me?',
          'What is included in the installation and warranty?',
        ][(turn - 1) % 3];
    }
    return { value, usage: { ...mockUsage } };
  }
  async gradeJSON<T>({
    schema,
    mockValue,
  }: {
    system: string;
    messages: Message[];
    schema: z.ZodType<T>;
    mockValue: T;
  }) {
    return { value: schema.parse(mockValue), usage: { ...mockUsage } };
  }
}
const responseSchema = z.object({
  status: z.string(),
  output: z.array(
    z.object({
      type: z.string(),
      content: z
        .array(z.object({ type: z.string(), text: z.string().optional() }))
        .optional(),
    }),
  ),
  usage: z.object({
    input_tokens: z.number().nonnegative(),
    output_tokens: z.number().nonnegative(),
  }),
});
export class OpenAIProvider implements Provider {
  private async request(
    system: string,
    messages: Message[],
    operation: 'chat' | 'grade',
    schema?: unknown,
  ): Promise<Result<string>> {
    const key = process.env.OPENAI_API_KEY;
    const model =
      process.env[operation === 'chat' ? 'LLM_CHAT_MODEL' : 'LLM_GRADE_MODEL'];
    const inputPrice = Number(process.env.LLM_INPUT_USD_PER_MILLION);
    const outputPrice = Number(process.env.LLM_OUTPUT_USD_PER_MILLION);
    if (
      !key ||
      !model ||
      !Number.isFinite(inputPrice) ||
      !Number.isFinite(outputPrice) ||
      inputPrice < 0 ||
      outputPrice < 0
    )
      throw new Error('Provider configuration requires Gate 16 setup');
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal: AbortSignal.timeout(45000),
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        store: false,
        instructions: system,
        input: messages,
        max_output_tokens: operation === 'chat' ? 600 : 3000,
        ...(schema
          ? {
              text: {
                format: {
                  type: 'json_schema',
                  name: 'academy_grade',
                  strict: true,
                  schema,
                },
              },
            }
          : {}),
      }),
    });
    if (!response.ok)
      throw new Error('Provider request failed; retry the operation');
    const data = responseSchema.parse(await response.json());
    const value = data.output
      .flatMap((o) => o.content ?? [])
      .filter((c) => c.type === 'output_text')
      .map((c) => c.text ?? '')
      .join('');
    if (data.status !== 'completed' || !value)
      throw new Error('Provider returned no complete response');
    return {
      value,
      usage: {
        provider: 'openai',
        model,
        prompt_tokens: data.usage.input_tokens,
        completion_tokens: data.usage.output_tokens,
        estimated_cost_usd:
          (data.usage.input_tokens * inputPrice +
            data.usage.output_tokens * outputPrice) /
          1e6,
      },
    };
  }
  async chat(input: ChatInput) {
    return this.request(input.system, input.messages, 'chat');
  }
  async gradeJSON<T>({
    system,
    messages,
    schema,
  }: {
    system: string;
    messages: Message[];
    schema: z.ZodType<T>;
    mockValue: T;
  }) {
    const result = await this.request(
      system,
      messages,
      'grade',
      z.toJSONSchema(schema),
    );
    return { ...result, value: schema.parse(JSON.parse(result.value)) };
  }
}
export function configuredProvider(): Provider {
  if (process.env.LLM_PROVIDER === 'mock') return new MockProvider();
  if (process.env.LLM_PROVIDER === 'openai') return new OpenAIProvider();
  throw new Error('Select an LLM provider at Gate 16');
}
export const chat = (input: ChatInput) => configuredProvider().chat(input);
export const gradeJSON = <T>(input: {
  system: string;
  messages: Message[];
  schema: z.ZodType<T>;
  mockValue: T;
}) => configuredProvider().gradeJSON(input);
