(function() {
  document.addEventListener('DOMContentLoaded', () => {
    const nav = document.createElement('nav');
    nav.className = 'help-nav';

    const links = [
      { id: 'getting-started', label: 'Getting Started', file: 'getting-started.html' },
      { id: 'maps', label: 'Maps', file: 'maps.html' },
      { id: 'wiki-tags', label: 'Wiki Tags', file: 'wiki-tags.html' },
      { id: 'ai-import-export', label: 'AI Import/Export', file: 'ai-import-export.html' },
      { id: 'book-export', label: 'Book Export', file: 'book-export.html' },
      { id: 'git-snapshots', label: 'Git Snapshots', file: 'git-snapshots.html' },
      { id: 'about', label: 'About', file: 'about.html' }
    ];

    const currentFile = window.location.pathname.split('/').pop() || 'getting-started.html';

    links.forEach(link => {
      const a = document.createElement('a');
      a.href = link.file;
      a.textContent = link.label;
      if (currentFile === link.file) {
        a.className = 'active';
      }
      nav.appendChild(a);
    });

    document.body.insertBefore(nav, document.body.firstChild);
  });
})();
