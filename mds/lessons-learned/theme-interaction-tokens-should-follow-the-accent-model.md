# Theme interaction tokens should follow the accent model

When the theme defines a semantic split between transient interaction color and warning color, editor-specific tokens need to stay mapped to that same model.

In Trama, transient cues are blue (`--accent`) and warning/destructive cues are warm (`--warning-*`). The Quill toolbar had its own dark-mode token, `--quill-active`, and it had drifted to an amber value. That made ordinary hover/active toolbar states look like warning UI and introduced a brown cast even though the main theme comments and semantics said those states should be accent-colored.

For future theme work: if a UI element is hover/focus/active but not warning/destructive, make it inherit from the accent family or an equivalent semantic token. Do not create a separate component token with a different hue unless the UI meaning is intentionally different.
