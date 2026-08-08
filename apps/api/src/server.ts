import 'dotenv/config';
import { createApp } from './app.js';
const runtime = await createApp();
const server = runtime.app.listen(runtime.config.port, () => console.log(`CyberShield API running on http://localhost:${runtime.config.port}`));
async function shutdown(signal: string) { console.log(`${signal}: closing CyberShield API`); server.close(async () => { await runtime.pool.end(); process.exit(0); }); }
process.on('SIGTERM', () => void shutdown('SIGTERM')); process.on('SIGINT', () => void shutdown('SIGINT'));
