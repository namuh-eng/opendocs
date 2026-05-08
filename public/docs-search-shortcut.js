(function () {
  if (window.__docsSearchBootstrapInstalled) return;
  window.__docsSearchBootstrapInstalled = true;
  window.__docsSearchRequested = false;

  document.addEventListener("keydown", function (event) {
    if (
      String(event.key).toLowerCase() === "k" &&
      (event.metaKey || event.ctrlKey)
    ) {
      event.preventDefault();
      window.__docsSearchRequested = true;
      document.dispatchEvent(new CustomEvent("open-search"));
    }
  });
})();
