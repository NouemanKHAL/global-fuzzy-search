import path = require('path');
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
            let lineNumber = -1;
            let lineText = "";

            for (let i = 0; i < content.length; i++) {
              let line = document.lineAt(i).text;
              if (line.includes(searchTerm)) {
                lineNumber = i;
                lineText = line;
                break;
              }
            }
            let item = new SearchResultItem(document.fileName,lineNumber,lineText);
              results.push(item);
          } catch(error) {

          }
        }

        console.log(results);
        showSearchResults(results);
       
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

class SearchResultItemNode extends vscode.TreeItem {
  constructor(public item: SearchResultItem, public label: string, public collapsibleState: vscode.TreeItemCollapsibleState, iconPath?: string | vscode.Uri | {
    light: string | vscode.Uri;
    dark: string | vscode.Uri;
} | vscode.ThemeIcon, public children?:SearchResultItemNode[]) {
    super(label, collapsibleState);
    this.command = {
      command: 'searchResult.openFile',
      title: 'Open File',
      arguments: [this.item.filePath, this.item.lineNumber]
    };
    this.iconPath = iconPath;
  }
}

class SearchResultDataProvider implements vscode.TreeDataProvider<SearchResultItemNode> {
  private _onDidChangeTreeData: vscode.EventEmitter<SearchResultItemNode | undefined> = new vscode.EventEmitter<SearchResultItemNode | undefined>();
  readonly onDidChangeTreeData: vscode.Event<SearchResultItemNode | undefined> = this._onDidChangeTreeData.event;

  data:SearchResultItemNode[];

  tree:Map<string, SearchResultItemNode[]>;

  constructor(public items: SearchResultItem[]) {
    this.data = items.map(item => new SearchResultItemNode(item, path.basename(item.filePath), vscode.TreeItemCollapsibleState.Collapsed, undefined));
    this.tree = new Map<string, SearchResultItemNode[]>;
    for (let d of this.data) {
      if (this.tree.get(d.label) !== undefined) {
        this.tree.get(d.label)?.push(d);
      } else {
        this.tree.set(d.label, [d]);
      }
    }
    this.data = [];
    for (let [k, v] of this.tree) {
      if (v.length === 0) {
        continue;
      }
      let first = v.at(0);
      if (first !== undefined) {
        for (let value of v) {
          value.collapsibleState = vscode.TreeItemCollapsibleState.None;
          value.iconPath = vscode.ThemeIcon.File;
        }
        let root = new SearchResultItemNode(new SearchResultItem(k, 0, ""), k, vscode.TreeItemCollapsibleState.Collapsed, vscode.ThemeIcon.Folder,v.slice(0));
        this.data.push(root);
      }
    }
    
    console.dir(this.tree);
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

export function showSearchResults(items: SearchResultItem[]): void {
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

  vscode.commands.executeCommand("searchResults.focus");
}