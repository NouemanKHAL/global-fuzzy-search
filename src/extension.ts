import * as vscode from "vscode";
import fuzzySearchCommand from "./fuzzy-search";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "global-fuzzy-search.fuzzySearch",
      fuzzySearchCommand
    ),
  );
}
