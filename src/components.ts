import * as vscode from "vscode";

export class SearchResultItem {
  constructor(
    public filePath: string,
    public lineNumber: number,
    public lineText: string
  ) {}
}

export class SearchResultItemNode extends vscode.TreeItem {
  constructor(
    public item: SearchResultItem,
    public label: string,
    public collapsibleState: vscode.TreeItemCollapsibleState,
    iconPath?:
      | string
      | vscode.Uri
      | {
          light: string | vscode.Uri;
          dark: string | vscode.Uri;
        }
      | vscode.ThemeIcon,
    public children?: SearchResultItemNode[]
  ) {
    super(label, collapsibleState);
    this.command = {
      command: "searchResult.openFile",
      title: "Open File",
      arguments: [this.item.filePath, this.item.lineNumber],
    };
    this.iconPath = iconPath;
  }
}

class SearchResultDataProvider
  implements vscode.TreeDataProvider<SearchResultItemNode>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    SearchResultItemNode | undefined
  > = new vscode.EventEmitter<SearchResultItemNode | undefined>();
  readonly onDidChangeTreeData: vscode.Event<SearchResultItemNode | undefined> =
    this._onDidChangeTreeData.event;

  data: SearchResultItemNode[];

  constructor(public items: SearchResultItemNode[]) {
    this.data = items;
  }

  getTreeItem(element: SearchResultItemNode): SearchResultItemNode {
    return element;
  }

  getChildren(
    element?: SearchResultItemNode
  ): vscode.ProviderResult<SearchResultItemNode[]> {
    if (element === undefined) {
      return this.data;
    }
    return element.children;
  }

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }
}

export function showSearchResults(items: SearchResultItemNode[]): void {
  const searchResultsTreeView = vscode.window.createTreeView("searchResults", {
    treeDataProvider: new SearchResultDataProvider(items),
    showCollapseAll: true,
  });

  searchResultsTreeView.onDidChangeSelection((e) => {
    if (e.selection.length === 0) {
      return;
    }
    const [selected] = e.selection;
    const { filePath, lineNumber } = selected.item;
    vscode.workspace.openTextDocument(filePath).then((doc) => {
      vscode.window.showTextDocument(doc, {
        selection: new vscode.Selection(lineNumber, 0, lineNumber, 0),
      });
    });
  });

  vscode.commands.executeCommand("searchResults.focus");
}
