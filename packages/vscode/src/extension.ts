import * as vscode from 'vscode';
import { format } from './formatter';

export function activate(context: vscode.ExtensionContext) {
  console.log('Expr language extension activated');

  // Register document formatter
  const formatterProvider = vscode.languages.registerDocumentFormattingEditProvider('expr', {
    provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
      const config = vscode.workspace.getConfiguration('expr');
      const indentSize = config.get<number>('indentSize', 2);

      try {
        const text = document.getText();
        const formatted = format(text, { indentSize });

        const fullRange = new vscode.Range(
          document.positionAt(0),
          document.positionAt(text.length)
        );

        return [vscode.TextEdit.replace(fullRange, formatted)];
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Expr formatting error: ${message}`);
        return [];
      }
    },
  });

  // Register format command
  const formatCommand = vscode.commands.registerCommand('expr.format', () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      return;
    }

    if (editor.document.languageId !== 'expr') {
      vscode.window.showErrorMessage('This command is only available for Expr files');
      return;
    }

    vscode.commands.executeCommand('editor.action.formatDocument');
  });

  context.subscriptions.push(formatterProvider, formatCommand);
}

export function deactivate() {
  console.log('Expr language extension deactivated');
}
