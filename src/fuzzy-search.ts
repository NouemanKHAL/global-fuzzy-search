import * as vscode from "vscode";
import { showSearchResults, SearchResultItem } from "./components";

export async function fuzzySearchCommand() {
  const searchTerm = await vscode.window.showInputBox({
    placeHolder: "Enter search term",
  });

  if (!searchTerm) {
    return;
  }

  const files = await vscode.workspace.findFiles("**/*");
  const results = [];

  for (const file of files) {
    try {
      const document = await vscode.workspace.openTextDocument(file);
      const content = document.getText();
      let lineNumber = -1;
      let lineText = "";

      for (let i = 0; i < content.length; i++) {
        let line = document.lineAt(i).text;
        if (line.includes(searchTerm)) {
          lineNumber = i;
          lineText = line;
          let item = new SearchResultItem(
            document.fileName,
            lineNumber,
            lineText
          );
          results.push(item);
        }
      }
    } catch (error) {}
  }

  console.log(results);
  showSearchResults(results);
}

export default fuzzySearchCommand;
