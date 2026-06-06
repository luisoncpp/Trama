(function() {
  const theme = document.documentElement.dataset.theme || 'dark';
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  window.__TRAMA_THEME_UPDATE__ = function(newTheme) {
    document.documentElement.dataset.theme = newTheme;
    document.documentElement.style.colorScheme = newTheme;
  };
})();
