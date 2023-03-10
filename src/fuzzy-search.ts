import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { distance } from "fastest-levenshtein";

import {
  showSearchResults,
  SearchResultItem,
  SearchResultItemNode,
} from "./components";

function isAlphaNumeric(c: string): boolean {
  return (c > "0" && c < "9") || (c > "a" && c < "z") || (c > "A" && c < "Z");
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

  for (const [idx, line] of lines.entries()) {
    const newline = line.toLowerCase();
    const k = pattern.length + (pattern.length > 5 ? 2 : 1);
    let word = newline.substring(0, Math.min(k, newline.length));

    const hits = new Map<number, SearchResultItem[]>();

    for (let i = 0; i <= newline.length - k; ++i) {
      if (word[0] !== " ") {
        const dist = distance(pattern, word);
        if (
          dist <= Math.ceil(pattern.length / 4) + 1 &&
          isSubSequence(pattern, word)
        ) {
          const searchItem = new SearchResultItem(
            file.fsPath,
            idx,
            line,
            i,
            i + k
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
    const keys = Array.from(hits.keys());
    if (keys.length >= 1) {
      const res = hits.get(keys[0]);
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

    const tmpItem = new SearchResultItem(
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

  const results = await fuzzySearch(searchTerm);
  showSearchResults(results);
}

export async function fuzzySearch(
  searchTerm: string,
  includePattern?: string,
  excludePattern?: string
) {
  let cwd = process.cwd();
  
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!workspaceFolder) {
    return [];
  }

  if (!includePattern) {
    includePattern = "**/*";
  }

  if (!excludePattern) {
    const config = vscode.workspace.getConfiguration("files", null);
    excludePattern = config.get("exclude");
  }

  const files = await vscode.workspace.findFiles(
    includePattern,
    excludePattern
  );

  const results: SearchResultItemNode[] = [];

  const allPromises = files.map((file) => processFile(cwd, searchTerm, file));

  const values = await Promise.allSettled(allPromises);

  values.forEach((element) => {
    if (element.status === "fulfilled") {
      if (element.value !== null) {
        results.push(element.value);
      }
    }
  });

  return results;
}

async function processFile(
  cwd: string,
  searchTerm: string,
  file: any
): Promise<SearchResultItemNode | null> {
  const matches = await fuzzyMatch(file, searchTerm, 0.2 * searchTerm.length);
  return getItemTreeNode(cwd, file, matches);
}

async function getItemTreeNode(
  cwd: string,
  file: any,
  hits: any
): Promise<SearchResultItemNode | null> {
  if (hits.length === 0) {
    return null;
  }
  const filename = path.basename(file.fsPath);
  const rootItem = new SearchResultItem(file.fsPath, 0, "");
  const rootNode = new SearchResultItemNode(
    rootItem,
    filename,
    path.relative(cwd, file.fsPath),
    []
  );

  const promises = hits.map(async (hit: any) => {
    const childNode = new SearchResultItemNode(
      hit,
      hit.lineText,
      "",
      undefined
    );
    await rootNode.children?.push(childNode);
  });

  await Promise.all(promises);
  return rootNode;
}

export default fuzzySearchCommand;
