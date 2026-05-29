# Git add should stage changed managed paths, not missing roots

When Trama scopes Git history to managed content, `git add -A -- <broad roots...>` looks tempting, but Git fails if some scoped roots do not exist in the current repository/project combination. The safer pattern is: discover the exact changed managed paths first, then stage only those paths. This keeps `.gitignore` behavior intact and avoids pathspec failures in partially populated projects or parent-repo scenarios.
