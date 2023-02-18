//@ts-ignore

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.

(function () {
  const vscode = acquireVsCodeApi();

  document.getElementById("search-term")?.addEventListener("keyup", (e) => {
    if (e.keyCode == 13) {
      post();
    }
  });
  document.getElementById("search-button")?.addEventListener("click", (e) => {
    post();
  });

  function post() {
    const searchTerm = document.getElementById("search-term").value;
    const includePattern = document.getElementById("include-pattern").value;
    const excludePattern = document.getElementById("exclude-pattern").value;
    vscode.postMessage({
      search: searchTerm,
      include: includePattern,
      exclude: excludePattern,
    });
  }
})();
