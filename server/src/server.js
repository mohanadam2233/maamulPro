import app from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';

let server;
try {
  await connectDatabase();
  server = app.listen(env.PORT, () => console.log(`MaamulPro API running at http://localhost:${env.PORT}`));
} catch (error) {
  console.error('Database connection failed:', error.message);
  process.exit(1);
}

const shutdown = async (signal) => {
  console.log(`${signal} received; shutting down`);
  server?.close(() => process.exit(0));
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
