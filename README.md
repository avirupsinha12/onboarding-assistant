# Onboarding Assistant

A React TypeScript library built with Vite and Express for development, designed to be used as an npm package in other applications.

## Features

- 🚀 **Express + Vite Development Server** - Fast development with hot module replacement
- 📦 **NPM Package Ready** - Configured for publishing and use in other projects
- ⚡ **TypeScript Support** - Full TypeScript support with type declarations
- 🎨 **React Components** - Pre-built onboarding assistant components
- 🔧 **Dual Build Modes** - Development server and library build

## Installation

```bash
npm install --legacy-peer-deps
```

## Development

Start the development server:

```bash
npm run dev
```

This will start the Vite development server at `http://localhost:3001` (or next available port).

## Building the Library

Build the library for distribution:

```bash
npm run build:lib
```

This creates optimized ES and UMD bundles in the `dist/` directory with TypeScript declarations.

## Usage as a Library

After building, you can use this package in other applications:

## Scripts

- `npm run dev` - Start development server
- `npm run dev:server` - Start Express + Vite server
- `npm run build` - Build for production
- `npm run build:lib` - Build as library
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

## Project Structure

```
src/
├── components/
│   └── OnboardingAssistant.tsx  # Main component
├── index.ts                     # Library exports
├── main.tsx                     # Development app entry
└── index.css                    # Styles
```
