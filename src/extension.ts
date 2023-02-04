import * as vscode from "vscode";
import fuzzySearchCommand from "./fuzzy-search";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "global-fuzzy-search.fuzzySearch",
      fuzzySearchCommand
    ),

    vscode.commands.registerCommand(
      "global-fuzzy-search.openFile",
      (filePath: string) => {
        vscode.workspace.openTextDocument(filePath).then((document) => {
          vscode.window.showTextDocument(document, vscode.ViewColumn.One);
        });
      }
    )
  );
}
