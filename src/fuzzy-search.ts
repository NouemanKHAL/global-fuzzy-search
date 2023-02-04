import * as vscode from "vscode";
import * as path from "path";
import { distance } from 'fastest-levenshtein';

import {
  showSearchResults,
  SearchResultItem,
  SearchResultItemNode,
} from "./components";


class LineMatch {
  constructor(public line: string, public lineNumber: number) {}
}

// TODO: consider splitting the pattern by spaces?
function fuzzyMatch(fileContent: string, pattern: string): LineMatch[] {
  const lines = fileContent.split("\n");

  let results = [];

  for (const [i, line] of lines.entries()) {
    const words = line.split(" ");
    for (const word of words) {
      if (distance(word, pattern) <= 5) {
          results.push(new LineMatch(line, i));
          break;
      }
    }
  }

  return results;
}

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

  const results = [];

  const files = await vscode.workspace.findFiles('**/*');

  for (const file of files) {
    try {
      const document = await vscode.workspace.openTextDocument(file);
      const documentText = document.getText();
      
      let hits = fuzzyMatch(documentText, searchTerm);
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
        let childItem = new SearchResultItem(
          file.fsPath,
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
    } catch(error) {
      console.error(`Error opening file: ${error}`);
      continue;
    }
  }

  console.debug(results);

  showSearchResults(results);
}

export default fuzzySearchCommand;
