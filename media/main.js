//@ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.

(function () {
    console.log("webview started");
    const vscode = acquireVsCodeApi();
    vscode.postMessage({type: "searchTerm", value: "hello"});
    console.log("webview finished");
}());


