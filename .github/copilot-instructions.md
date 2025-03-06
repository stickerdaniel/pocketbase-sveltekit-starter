# Project Context for GitHub Copilot

This is a PocketBase/SvelteKit starter application that combines:

## Architecture
- Frontend: SvelteKit (static, client-side only, using `adapter-static`)
- Backend: PocketBase (Golang-based)

## Key Features
- Static JAMstack architecture for high performance
- PocketBase backend provides:
  - SQLite database
  - CRUD API
  - Realtime subscriptions
  - Authentication (email + OAuth2)
  - File storage
  - Extensible with JavaScript or Golang hooks

## Development Setup
The project can be set up in three ways:
1. Docker (recommended)
2. PocketBase binary
3. Go tools directly

## Project Structure
- `/pb/` - PocketBase backend
- `/sk/` - SvelteKit frontend
- Frontend runs on port 5173
- Backend runs on port 8090

## UI Components
- Uses shadcn-ui (https://next.shadcn-svelte.com/docs) components located in `sk/src/lib/components/ui/`
- These components should be used when building the UI, but not modified directly
- Components follow shadcn-ui style system with Tailwind CSS
- shadcn-ui components look great out of the box - avoid adding unnecessary Tailwind classes to them

## Coding Style
- Use Svelte 5 features including runes ($state, $derived, etc.) for reactive state management
- Use Tailwind CSS classes for styling
  - Prefer Tailwind utility classes over custom CSS
  - Only use plain CSS when there's no Tailwind alternative available
  - Keep component styles minimal since shadcn-ui components are well-styled by default
- Follow component-based architecture with clear separation of concerns

## Extension Points
- Backend can be extended via:
  - JavaScript hooks in `pb/pb_hooks/`
  - Golang customizations in `main.go`
- Frontend is fully customizable using SvelteKit components and routes