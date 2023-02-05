import * as vscode from "vscode";
import * as path from "path";
import { distance } from "fastest-levenshtein";

import {
  showSearchResults,
  SearchResultItem,
  SearchResultItemNode,
} from "./components";

function isAlphaNumeric(str: string): boolean {
  return /^[a-z0-9]+$/gi.test(str);
}

function isSubSequence(sought: string, chain: string): boolean {
  let ci = 0;
  for (const ch of sought.split("")) {
    if (!isAlphaNumeric(ch)) {
      continue;
    }
    ci = chain.indexOf(ch, ci);
    if (ci < 0) {
      if (ci < 0) {
        return false;
      }
    }
    ++ci;
  }
  return true;
}

async function fuzzyMatch(
  file: vscode.Uri,
  pattern: string,
  maxDistance: number
): Promise<SearchResultItem[]> {
  const document = await vscode.workspace.openTextDocument(file);
  const fileContent = document.getText();
  const lines = fileContent.split(/\r?\n/);

  let results: SearchResultItem[] = [];
  pattern = pattern.toLowerCase();

  for (let [idx, line] of lines.entries()) {
    const newline = line.toLowerCase();
    let k = pattern.length + 2;
    let word = newline.substring(0, Math.min(k, newline.length));

    let hits = new Map<number, SearchResultItem[]>();

    for (let i = 0; i <= newline.length - k; i++) {
      if (word[0] !== " ") {
        let dist = distance(pattern, word);
        if (dist <= pattern.length / 4 + 1 && isSubSequence(pattern, word)) {
          let searchItem = new SearchResultItem(
            file.fsPath,
            idx,
            line,
            i,
            i + k
          );
          console.log(
            `match found: pattern:'${pattern}' word:'${word}' with start:${i} and end:${
              i + k
            }`
          );
          if (hits.get(dist) !== undefined) {
            hits.get(dist)?.push(searchItem);
          } else {
            hits.set(dist, [searchItem]);
          }
        }
      }
      word = word.substring(1) + newline[i + k];
    }
    const keys = Array.from(hits.keys()).sort();
    if (keys.length >= 1) {
      let res = hits.get(keys[0]);
      if (res === undefined) {
        continue;
      }
      const newRes = mergeAdjacent(res);
      results = results.concat(newRes);
    }
  }

  return results;
}

function areAdjacent(a: SearchResultItem, b: SearchResultItem) {
  if (a.filePath !== b.filePath) {
    return false;
  }
  if (a.lineNumber !== b.lineNumber) {
    return false;
  }
  return a.start + 1 === b.start;
}

function mergeAdjacent(arr: SearchResultItem[]) {
  const merged: SearchResultItem[] = [];

  for (let i = 0; i < arr.length; i++) {
    if (i + 1 >= arr.length || !areAdjacent(arr[i], arr[i + 1])) {
      merged.push(arr[i]);
      continue;
    }
    let next = i;

    while (next + 1 < arr.length && areAdjacent(arr[next], arr[next + 1])) {
      next++;
    }

    if (next + 1 !== arr.length) {
      next--;
    }

    let tmpItem = new SearchResultItem(
      arr[i].filePath,
      arr[i].lineNumber,
      arr[i].lineText,
      arr[i].start,
      arr[next].end
    );

    merged.push(tmpItem);

    i = next;
  }

  return merged;
}

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

  const results = [];

  const excludePattern = `{**/node_modules,**/bower_components,**/vendor,**/.git,**/.svn,**/.hg,**/CVS,**/.DS_Store,**/__pycache__}`;
  const files = await vscode.workspace.findFiles("**/*", excludePattern);

  for (const file of files) {
    try {
      let hits = await fuzzyMatch(file, searchTerm, 0.2 * searchTerm.length);
      if (hits.length === 0) {
        continue;
      }
      let filename = path.basename(file.fsPath);
      let rootItem = new SearchResultItem(file.fsPath, 0, "");
      let rootNode = new SearchResultItemNode(
        rootItem,
        filename,
        path.relative(cwd, file.fsPath),
        []
      );

      for (const hit of hits) {
        let childNode = new SearchResultItemNode(
          hit,
          hit.lineText,
          "",
          undefined
        );
        rootNode.children?.push(childNode);
      }
      results.push(rootNode);
    } catch (error) {
      console.error(`Error opening file: ${error}`);
      continue;
    }
  }

  showSearchResults(results);
}

export default fuzzySearchCommand;
