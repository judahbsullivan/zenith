# Style Guide
## Code Style
- TypeScript only
- No implicit any
- Prefer explicit return types for public APIs
- Avoid magic strings
## Architectural Rules
- Compiler decisions > runtime decisions
- HTML is the source of truth
- Navigation controls rendering, not components
- Layouts persist unless explicitly changed
## Naming Conventions
- camelCase for variables
- PascalCase for components
- kebab-case for files where appropriate
- `.zenith` for user-facing components
## API Design Rules
- No developer flags for runtime behavior
- Behavior inferred via static analysis
- Fail loudly at compile time
## What to Avoid
- Implicit global state
- Hidden hydration logic
- Runtime heuristics
- JSX-only APIs
## Guiding Question
> "Can the compiler decide this instead?"
If yes — move it out of runtime.

## 🎯 Development Philosophy

- **Simplicity over complexity** - Zenith aims to be intuitive and straightforward
- **HTML-first** - HTML is the source of truth
- **Consistency** - Follow established patterns in the codebase
- **Iteration speed** - Don't let perfect be the enemy of good

## 🧪 Testing Your Changes

Before submitting a PR:

1. **Run the dev server** and verify your changes work:
   ```bash
   bun dev
   ```

2. **Build the project** to ensure no build errors:
   ```bash
   bun build
   ```

3. **Format your code**:
   ```bash
   bun run format
   ```

4. **Check formatting** (optional):
   ```bash
   bun run format:check
   ```
