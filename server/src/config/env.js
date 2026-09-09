import 'dotenv/config';
import { z } from 'zod';

const developmentAccessSecret = 'development-access-secret-change-me-now';
const developmentRefreshSecret = 'development-refresh-secret-change-me';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  MONGODB_URI: z.string().min(1).default('mongodb://127.0.0.1:27017/maamulpro'),
  JWT_ACCESS_SECRET: z.string().min(32).default(developmentAccessSecret),
  JWT_REFRESH_SECRET: z.string().min(32).default(developmentRefreshSecret),
  ACCESS_TOKEN_MINUTES: z.coerce.number().positive().default(15),
  REFRESH_TOKEN_DAYS: z.coerce.number().positive().default(7),
}).superRefine((values, context) => {
  if (values.NODE_ENV !== 'production') return;
  if (values.JWT_ACCESS_SECRET === developmentAccessSecret) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['JWT_ACCESS_SECRET'], message: 'A production access-token secret is required' });
  }
  if (values.JWT_REFRESH_SECRET === developmentRefreshSecret) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['JWT_REFRESH_SECRET'], message: 'A production refresh-token secret is required' });
  }
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
