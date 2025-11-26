import esbuild from 'esbuild';
import { nodeExternalsPlugin } from 'esbuild-node-externals';
import { spawn } from 'child_process';

const outPath = 'dist/app';

const config = {
  entryPoints: ['src/app/bootstrap/server.ts'],
  outfile: `${outPath}/server.mjs`,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  bundle: true,
  plugins: [nodeExternalsPlugin()],
  loader: {
    '.ts': 'ts',
    '.json': 'json'
  }
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
    ...config,
    plugins: [
      ...config.plugins,
      {
        name: 'restart-server',
        setup(build) {
          build.onEnd((result) => {
            if (result.errors.length === 0) {
              console.log('✓ Build completed successfully');
              startServer();
            } else {
              console.error('Build failed with errors');
            }
          });
        }
      }
    ]
  });

  await context.watch();
  console.log('👀 Watching for changes...');

  process.on('SIGINT', () => {
    console.log('\n👋 Stopping...');
    if (serverProcess) {
      serverProcess.kill();
    }
    process.exit(0);
  });
} else {
  esbuild.build(config).then(() => {
    console.log('✓ Build completed successfully');
  }).catch((error) => {
    console.error('Build failed:', error);
    process.exit(1);
  });
}
