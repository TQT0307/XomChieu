import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import {defineConfig} from 'vite';
function browserBundleNodeGuard() {
  return {
    name: 'browser-bundle-node-guard',
    generateBundle(_options: unknown, bundle: Record<string, any>) {
      const forbiddenPatterns = [
        { pattern: /readFileSync/, label: 'Node fs.readFileSync' },
        { pattern: /node:test/, label: 'node:test' },
        { pattern: /training form opens only from Contact navigation/, label: 'test source code' }
      ];
      for (const [fileName, output] of Object.entries(bundle)) {
        if (output?.type !== 'chunk') continue;
        for (const forbidden of forbiddenPatterns) {
          if (forbidden.pattern.test(output.code)) {
            this.error(`Không thể phát hành ${fileName}: bundle trình duyệt chứa ${forbidden.label}. Kiểm tra lại file trong src, không chép file tests vào src.`);
          }
        }
      }
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), browserBundleNodeGuard()],
    resolve: {
      alias: {
        '@': process.cwd(),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
