import * as esbuild from 'esbuild';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

const define = {
  'process.env.EXTENSION_API_URL': JSON.stringify(
    process.env.EXTENSION_API_URL || 'http://localhost:3001',
  ),
  'process.env.EXTENSION_WEB_URL': JSON.stringify(
    process.env.EXTENSION_WEB_URL || process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000',
  ),
};

async function build() {
  const dist = path.join(__dirname, 'dist');
  await fs.rm(dist, { recursive: true, force: true });
  await fs.mkdir(dist, { recursive: true });

  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src/content.ts')],
    bundle: true,
    outfile: path.join(dist, 'content.js'),
    format: 'iife',
    platform: 'browser',
    target: 'chrome100',
    minify: true,
    define,
  });

  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src/background.ts')],
    bundle: true,
    outfile: path.join(dist, 'background.js'),
    format: 'esm',
    platform: 'browser',
    target: 'chrome100',
    minify: true,
    define,
  });

  await fs.copyFile(path.join(__dirname, 'src/manifest.json'), path.join(dist, 'manifest.json'));
  console.log('Extension built to dist/');
}

if (isWatch) {
  await build();
  const ctx = await esbuild.context({
    entryPoints: [path.join(__dirname, 'src/content.ts')],
    bundle: true,
    outfile: path.join(__dirname, 'dist/content.js'),
    format: 'iife',
    platform: 'browser',
  });
  await ctx.watch();
} else {
  await build();
}
