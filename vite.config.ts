import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  // Library build configuration
  if (mode === 'library') {
    return {
      plugins: [
        react(),
        dts({
          insertTypesEntry: true,
          include: ['src/**/*'],
          exclude: ['src/**/*.test.*', 'src/**/*.stories.*']
        })
      ],
      build: {
        lib: {
          entry: resolve(__dirname, 'src/index.ts'),
          name: 'OnboardingAssistant',
          formats: ['es', 'umd'],
          fileName: (format: string) => `index.${format === 'es' ? 'es.js' : 'js'}`
        },
        rollupOptions: {
          external: ['react', 'react-dom'],
          output: {
            globals: {
              react: 'React',
              'react-dom': 'ReactDOM'
            }
          }
        },
        sourcemap: true,
        emptyOutDir: true
      }
    };
  }

  // Development configuration
  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: true
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src")
      }
    }
  }
})
