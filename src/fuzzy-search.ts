import * as vscode from "vscode";
import * as path from "path";
import {
  showSearchResults,
  SearchResultItem,
  SearchResultItemNode,
} from "./components";

import { fastFindInFiles } from "fast-find-in-files";

// TODO: implement fuzzy search when the GUI work is done
export async function fuzzySearchCommand() {
  const searchTerm = await vscode.window.showInputBox({
    placeHolder: "Enter search term",
  });

  if (!searchTerm) {
    return;
  }

  let cwd;
  if (vscode.workspace.workspaceFolders) {
    cwd = vscode.workspace.workspaceFolders[0].uri.fsPath;
  } else {
    cwd = process.cwd();
  }

  let entries = fastFindInFiles(cwd, searchTerm);

  const results = [];

  for (let entry of entries) {
    let filename = path.basename(entry.filePath);
    let rootItem = new SearchResultItem(entry.filePath, 0, "");
    let rootNode = new SearchResultItemNode(
      rootItem,
      filename,
      path.relative(cwd, entry.filePath),
      []
    );
    for (let hit of entry.queryHits) {
      let childItem = new SearchResultItem(
        entry.filePath,
        hit.lineNumber,
        hit.line
      );
      let childNode = new SearchResultItemNode(
        childItem,
        hit.line,
        "",
        undefined
      );
      rootNode.children?.push(childNode);
    }
    results.push(rootNode);
  }

  showSearchResults(results);
}

export default fuzzySearchCommand;
