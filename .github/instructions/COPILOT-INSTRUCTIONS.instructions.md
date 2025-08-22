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
- if you need to run the app manually, use `bun run dev` to start the development server and make sure to kill the port before starting a new instance using `lsof -ti:3001 | xargs kill -9` to free up port 3001.