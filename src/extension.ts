import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {


  context.subscriptions.push(
    vscode.commands.registerCommand('global-fuzzy-search.fuzzySearch', async () => {
      const searchTerm = await vscode.window.showInputBox({
        placeHolder: 'Enter search term'
      });
  
      if (!searchTerm) {
        return;
      }
  
      const files = await vscode.workspace.findFiles('**/*');
        const results = [];

        for (const file of files) {
          try {
            const document = await vscode.workspace.openTextDocument(file);
            const content = document.getText();
            if (content.includes(searchTerm)) {
              let item = new SearchResultItem(document.fileName,1,"line-text");
              results.push(
                new SearchResultItemNode(item,"hello", vscode.TreeItemCollapsibleState.Expanded)
              );
            }
          } catch(error) {

          }
        }

        console.log(results);
        showSearchResults(results);
        

        // const dataProvider =  new TreeDataProvider(results);
        // const resultsTreeView = vscode.window.createTreeView('searchResults', {
        //   treeDataProvider: dataProvider,
        //   showCollapseAll: true
        // });
        
        // resultsTreeView.reveal(dataProvider.data[0]);
      
    }),

    vscode.commands.registerCommand('extension.openFile', (filePath: string) => {
      vscode.workspace.openTextDocument(filePath).then(document => {
        vscode.window.showTextDocument(document, vscode.ViewColumn.One);
      });
    })
  );
}

class SearchResultItem {
  constructor(public filePath: string, public lineNumber: number, public lineText: string) {}
}

class SearchResultItemNode implements vscode.TreeItem {
  children: SearchResultItemNode[]|undefined;
  constructor(public item: SearchResultItem, public label: string, public collapsibleState: vscode.TreeItemCollapsibleState) {}

  get command(): vscode.Command | undefined {
    return {
      command: 'searchResult.openFile',
      title: 'Open File',
      arguments: [this.item.filePath, this.item.lineNumber]
    };
  }

  get tooltip(): string {
    return `${this.item.filePath}`;
  }

  get description(): string {
    return `Line ${this.item.lineNumber}: ${this.item.lineText}`;
  }
}


class SearchResultDataProvider implements vscode.TreeDataProvider<SearchResultItemNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<SearchResultItemNode | undefined> = new vscode.EventEmitter<SearchResultItemNode | undefined>();
  readonly onDidChangeTreeData: vscode.Event<SearchResultItemNode | undefined> = this._onDidChangeTreeData.event;

  data:SearchResultItemNode[];

  constructor(public items: SearchResultItemNode[]) {
    this.data = items;
  }

  getTreeItem(element: SearchResultItemNode): SearchResultItemNode {
    return element;
  }

  getChildren(element?: SearchResultItemNode): vscode.ProviderResult<SearchResultItemNode[]>  {
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
  const searchResultsTreeView = vscode.window.createTreeView('searchResults', {
    treeDataProvider: new SearchResultDataProvider(items),
    showCollapseAll: true
  });

  searchResultsTreeView.onDidChangeSelection(e => {
    if (e.selection.length === 0) {
      return;
    }
    const [selected] = e.selection;
    const { filePath, lineNumber } = selected.item;
    vscode.workspace.openTextDocument(filePath).then(doc => {
      vscode.window.showTextDocument(doc, {
        selection: new vscode.Selection(lineNumber, 0, lineNumber, 0)
      });
    });
  });
}