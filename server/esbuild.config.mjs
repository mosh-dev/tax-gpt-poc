import esbuild from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import tscPlugin from "esbuild-plugin-tsc";
import { copy } from 'esbuild-plugin-copy';
import { spawn } from 'child_process';

const outPath = 'dist/app';

const config = {
  entryPoints: ['src/server.ts'],
  outfile: `${outPath}/server.mjs`,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  bundle: true,
  treeShaking: true,
  plugins: [
    nodeExternalsPlugin(),
    tscPlugin(),
    copy({
      resolveFrom: 'out',
      assets: [{
        from: ['./src/assets/**/*'],
        to: ['./assets']
      }],
      watch: true
    })
  ],
  loader: {
    '.ts': 'ts',
    '.json': 'json'
  },
  tsconfig: 'tsconfig.json'
};

const isWatch = process.argv.includes('--watch');
let serverProcess = null;

function startServer() {
  if (serverProcess) {
    serverProcess.kill();
  }

  console.log('🚀 Starting server...');
  serverProcess = spawn('node', [`${outPath}/server.mjs`], {
    stdio: 'inherit'
  });

  serverProcess.on('error', (error) => {
    console.error('Server error:', error);
  });
}

if (isWatch) {
  const context = await esbuild.context({
    ...config, plugins: [...config.plugins, {
      name: 'restart-server', setup(build) {
        build.onEnd((result) => {
          if (result.errors.length === 0) {
            console.log('✓ Build completed successfully');
            startServer();
          } else {
            console.error('Build failed with errors');
          }
        });
      }
    }]
  });

  await context.watch();
  console.log('👀 Watching for changes...');

  const shutdown = () => {
    console.log('\n👋 Stopping...');
    if (serverProcess) {
      serverProcess.kill();
    }
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} else {
  esbuild.build(config).then(() => {
    console.log('✓ Build completed successfully');
  }).catch((error) => {
    console.error('Build failed:', error);
    process.exit(1);
  });
}
