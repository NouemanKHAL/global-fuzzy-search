import * as vscode from "vscode";

export class SearchResultItem {
  constructor(
    public filePath: string,
    public lineNumber: number,
    public lineText: string,
    public start:number = 0,
    public end:number = 0
  ) {}
}

export class SearchResultItemNode extends vscode.TreeItem {
  constructor(
    public item: SearchResultItem,
    public label: string,
    public description: string,
    public children?: SearchResultItemNode[]
  ) {
    super(label, children ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None);
    this.description = description;
    this.iconPath = children ? vscode.ThemeIcon.File : undefined;
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
    }).then(() =>{
      highlightLine(lineNumber, selected.item.start, selected.item.end);
    });
  });

  vscode.commands.executeCommand("searchResults.focus");
}


async function highlightLine(lineNumber: number, start:number, end:number) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  const document = editor.document;
  const line = document.lineAt(lineNumber);
  const startPos = new vscode.Position(lineNumber, start);
  const endPos = new vscode.Position(lineNumber, end);

  const range = new vscode.Range(startPos, endPos);
  const decoration = {
    range,
    hoverMessage: `Line ${lineNumber}`,
  };
  editor.setDecorations(DECORATION_TYPE, [decoration]);
}

const DECORATION_TYPE = vscode.window.createTextEditorDecorationType({
  backgroundColor: 'rgba(255,235,59, 0.3)',
  overviewRulerLane: vscode.OverviewRulerLane.Center,
  isWholeLine: false,
});