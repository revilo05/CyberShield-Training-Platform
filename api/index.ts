import type { IncomingMessage, ServerResponse } from 'node:http';
import { attachDatabasePool } from '@vercel/functions';
import { createApp, type AppRuntime } from '../apps/api/src/app.js';

let runtimePromise: Promise<AppRuntime> | undefined;

async function getRuntime(): Promise<AppRuntime> {
  runtimePromise ??= createApp().then((runtime) => {
    attachDatabasePool(runtime.pool);
    return runtime;
  }).catch((error) => {
    runtimePromise = undefined;
    throw error;
  });
  return runtimePromise;
}

export default async function handler(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const runtime = await getRuntime();
  await new Promise<void>((resolve, reject) => {
    response.once('finish', resolve);
    response.once('close', resolve);
    response.once('error', reject);
    try {
      runtime.app(request, response);
    } catch (error) {
      reject(error);
    }
  });
}
