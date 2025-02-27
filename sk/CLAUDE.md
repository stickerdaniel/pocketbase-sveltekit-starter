# CLAUDE.md - SvelteKit Project Guide

## Build & Development Commands
- Run dev server: `bunx --bun vite dev`
- Build for production: `bunx --bun vite build`
- Preview build: `bunx --bun vite preview`
- Type check: `bunx svelte-kit sync && bunx svelte-check --tsconfig ./tsconfig.json`
- Format code: `bunx prettier --write .`
- Lint check: `bunx prettier --check .`
- Run tests: `bunx playwright test`
- Run single test: `bunx playwright test tests/smoke.test.ts`

## Code Style Guidelines
- **Formatting**: 2-space indentation, double quotes, 80 char line limit
- **Components**: PascalCase for traditional, kebab-case for shadcn/ui
- **Variables/Functions**: camelCase for all variables and functions
- **Types/Interfaces**: PascalCase with descriptive names
- **Files**: Follow SvelteKit conventions (+page.svelte, +layout.ts)
- **CSS**: Tailwind utility classes with custom theme variables
- **Errors**: Use try/catch with toast notifications for user feedback
- **TypeScript**: Use strict types, generics where appropriate
- **State**: Prefer Svelte stores for global state, $state for local
- **Components**: Use next shadcn-svelte components. Do not edit the core components in the ui folder.
- **Routing**: Use SvelteKit's routing system

Write Production Svelte 5 Code

## Project Structure
- SvelteKit with Tailwind CSS and shadcn/ui components
- PocketBase backend with type generation
- Playwright for testing