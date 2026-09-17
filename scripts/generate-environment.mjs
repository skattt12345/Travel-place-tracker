import { mkdir, writeFile } from 'node:fs/promises';

const apiKey = process.env.GEOAPIFY_API_KEY;

if (!apiKey?.trim()) {
  console.error('GEOAPIFY_API_KEY is required for the Vercel build. Set it in Vercel Environment Variables.');
  process.exit(1);
}

const environment = {
  geoapify: {
    apiKey,
    baseUrl: 'https://api.geoapify.com',
  },
};

const directory = new URL('../src/environments/', import.meta.url);
await mkdir(directory, { recursive: true });
await writeFile(
  new URL('environment.ts', directory),
  `export const environment = ${JSON.stringify(environment, null, 2)};\n`,
  'utf8',
);
