import { z } from 'zod';

const EnvSchema = z.object({
  LINKEDIN_LI_AT: z
    .string()
    .min(1, 'Set LINKEDIN_LI_AT to the li_at cookie of your LinkedIn session.'),
  LINKEDIN_JSESSIONID: z
    .string()
    .min(
      1,
      'Set LINKEDIN_JSESSIONID to the JSESSIONID cookie of your LinkedIn session.',
    ),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('127.0.0.1'),
});
export type Env = z.infer<typeof EnvSchema>;

/**
 * Reads and validates the environment once at startup, so a missing cookie
 * fails loudly instead of on the first request.
 */
function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (parsed.success) return parsed.data;
  const problems = parsed.error.issues.map((issue) => `  - ${issue.message}`);
  throw new Error(`Invalid environment:\n${problems.join('\n')}`);
}

export const env = loadEnv();
