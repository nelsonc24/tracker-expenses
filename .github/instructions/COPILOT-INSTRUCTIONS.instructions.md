---
applyTo: '**'
---
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.

- Use TypeScript for all new code.
- Follow the existing code style and conventions.
- Write clear and concise comments.
- Ensure all new features are covered by tests.
- Keep security in mind and validate all user inputs.
- Use the provided utility functions for common tasks (e.g., date formatting, database operations).
- When creating test scripts or utility scripts, place them in a `scripts/` folder instead of the project root.
- If you need to run the app manually, use `bun run dev` to start the development server and make sure to kill the port before starting a new instance using `lsof -ti:3001 | xargs kill -9` to free up port 3001.
- **Use shadcn-ui components as much as possible** for UI consistency and best practices:
  - Prefer shadcn-ui components over custom implementations when available
  - Install new shadcn-ui components using `bunx shadcn@latest add [component-name]`
  - Follow shadcn-ui patterns for component composition and styling
  - Leverage existing components like Button, Dialog, Alert Dialog, Input, Select, etc.
  - Reference shadcn-ui documentation at https://ui.shadcn.com/docs/components for implementation examples
  - Maintain consistent design patterns across the application using shadcn-ui primitives