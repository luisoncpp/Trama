# IPC Handler Export Chain Discovery

When adding a new IPC handler, ensure the export chain is complete at all three levels:

1. `order-handlers.ts` exports `handleReorderFiles`
2. `project-handlers/index.ts` re-exports from `order-handlers.js`
3. `handlers/index.ts` re-exports from `project-handlers/index.js` ← **this level was missing**
4. `electron/ipc.ts` imports from `handlers/index.js`

Skipping level 3 causes `npm run build:electron` to fail with:
```
error TS2305: Module '"./ipc/handlers/index.js"' has no exported member 'handleReorderFiles'
```

Lesson: Always verify the full export chain when adding new IPC handlers. The `handlers/index.ts` re-export block must be kept in sync with what's re-exported from `project-handlers/index.ts`.
