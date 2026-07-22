# Quill empty paragraph turndown spacing artifact

**What to know before touching editor serialization or spacer directives**

Turndown turns a Quill empty paragraph (`<p><br></p>`) into `\n\n  \n\n`, not a single blank line. `normalizeBlankLinesToSpacerDirectives` then counts that as three blank lines and emits `<!-- trama:spacer lines=2 -->` for what the user sees as one blank line.

Collapse each `\n\n[ \t]+\n\n` artifact to `\n\n\n` in `collapseTurndownEmptyParagraphArtifacts()` before spacer normalization. One artifact → spacer `lines=1`; two artifacts → `lines=2`.

The inverse load path has a separate trap: a Quill `BlockEmbed` clipboard matcher must return only the embed Delta operation. Appending `.insert('\n')` creates an actual `<p><br></p>` beside the loaded spacer. The document then displays an extra blank line and the next Turndown pass serializes a second spacer. Verify both the first flush and the saved-spacer reopen round trip.

After save, a leaked external watcher event can reload disk markdown and force-apply it into Quill (`reloadVersion++`), which replaces the live blank paragraph with the spacer blot and steals focus. Skip clean reloads when disk content matches the saved snapshot (`areEquivalentEditorValues`, not raw string equality).

**Files:** `src/shared/turndown-service-factory.ts`, `src/features/project-editor/pane/rich-markdown-editor/editor-session/editor-session-private/layout-directive-clipboard.ts`, `src/features/project-editor/use-project-editor-external-events-effect.ts`, `tests/blank-line-spacer-bug.test.ts`
