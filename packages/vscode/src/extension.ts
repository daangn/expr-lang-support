import * as vscode from 'vscode';
import { format } from './formatter';

// Rainbow bracket colors - optimized for readability
const BRACKET_COLORS = [
  '#F1798B', // Coral Pink
  '#F1A25E', // Amber Orange
  '#5CA8F7', // Sky Blue
  '#6AD18A', // Mint Green
  '#8B7CF6', // Lilac Violet
];

// Rainbow indent guide colors - subtle tones
const INDENT_COLORS = [
  '#8A594A', // Dark Brown
  '#B0895A', // Brown
  '#4A78A8', // Blue
  '#4DAA9A', // Teal
  '#6A5BAE', // Violet
];

// Decoration types for each bracket depth
let bracketDecorations: vscode.TextEditorDecorationType[] = [];

// Decoration types for each indent level
let indentDecorations: vscode.TextEditorDecorationType[] = [];

function createBracketDecorations() {
  // Clear existing decorations
  bracketDecorations.forEach((d) => d.dispose());
  bracketDecorations = [];

  // Create decoration for each color
  BRACKET_COLORS.forEach((color) => {
    const decoration = vscode.window.createTextEditorDecorationType({
      color: color,
    });
    bracketDecorations.push(decoration);
  });
}

function createIndentDecorations() {
  // Clear existing decorations
  indentDecorations.forEach((d) => d.dispose());
  indentDecorations = [];

  // Create decoration for each indent color
  INDENT_COLORS.forEach((color) => {
    const decoration = vscode.window.createTextEditorDecorationType({
      borderWidth: '0 0 0 1px',
      borderStyle: 'solid',
      borderColor: color,
    });
    indentDecorations.push(decoration);
  });
}

function updateBrackets(editor: vscode.TextEditor | undefined) {
  if (!editor || editor.document.languageId !== 'expr') {
    return;
  }

  const config = vscode.workspace.getConfiguration('expr');
  const enabled = config.get<boolean>('rainbowBrackets.enabled', true);

  if (!enabled) {
    // Clear all decorations if disabled
    bracketDecorations.forEach((decoration) => {
      editor.setDecorations(decoration, []);
    });
    return;
  }

  const text = editor.document.getText();
  const decorationRanges: vscode.Range[][] = [];

  // Initialize arrays for each depth
  for (let i = 0; i < BRACKET_COLORS.length; i++) {
    decorationRanges.push([]);
  }

  try {
    let depth = 0;
    let i = 0;

    while (i < text.length) {
      const char = text[i];

      // Skip single-line comments (# or //)
      if (char === '#' || (char === '/' && text[i + 1] === '/')) {
        while (i < text.length && text[i] !== '\n') {
          i++;
        }
        continue;
      }

      // Skip multiline comments (/* ... */)
      if (char === '/' && text[i + 1] === '*') {
        i += 2;
        while (i < text.length) {
          if (text[i] === '*' && text[i + 1] === '/') {
            i += 2;
            break;
          }
          i++;
        }
        continue;
      }

      // Skip strings (single quotes)
      if (char === "'") {
        i++;
        while (i < text.length) {
          if (text[i] === '\\') {
            i += 2; // Skip escaped character
            continue;
          }
          if (text[i] === "'") {
            i++;
            break;
          }
          i++;
        }
        continue;
      }

      // Skip strings (double quotes)
      if (char === '"') {
        i++;
        while (i < text.length) {
          if (text[i] === '\\') {
            i += 2; // Skip escaped character
            continue;
          }
          if (text[i] === '"') {
            i++;
            break;
          }
          i++;
        }
        continue;
      }

      // Color brackets
      if (char === '(') {
        const colorIndex = depth % BRACKET_COLORS.length;
        const startPos = editor.document.positionAt(i);
        const endPos = editor.document.positionAt(i + 1);
        decorationRanges[colorIndex].push(new vscode.Range(startPos, endPos));
        depth++;
      } else if (char === ')') {
        depth--;
        const colorIndex = Math.max(0, depth % BRACKET_COLORS.length);
        const startPos = editor.document.positionAt(i);
        const endPos = editor.document.positionAt(i + 1);
        decorationRanges[colorIndex].push(new vscode.Range(startPos, endPos));
      }

      i++;
    }

    // Apply decorations
    decorationRanges.forEach((ranges, index) => {
      editor.setDecorations(bracketDecorations[index], ranges);
    });
  } catch (error) {
    // If parsing fails, silently skip coloring
    console.error('Rainbow bracket error:', error);
  }
}

function updateIndentGuides(editor: vscode.TextEditor | undefined) {
  if (!editor || editor.document.languageId !== 'expr') {
    return;
  }

  const config = vscode.workspace.getConfiguration('expr');
  const enabled = config.get<boolean>('rainbowBrackets.enabled', true);
  const indentSize = config.get<number>('indentSize', 2);

  if (!enabled) {
    // Clear all decorations if disabled
    indentDecorations.forEach((decoration) => {
      editor.setDecorations(decoration, []);
    });
    return;
  }

  const document = editor.document;
  const decorationRanges: vscode.Range[][] = [];

  // Initialize arrays for each indent level
  for (let i = 0; i < INDENT_COLORS.length; i++) {
    decorationRanges.push([]);
  }

  try {
    for (let lineNum = 0; lineNum < document.lineCount; lineNum++) {
      const line = document.lineAt(lineNum);
      const text = line.text;

      // Skip empty lines
      if (text.trim().length === 0) {
        continue;
      }

      // Calculate leading spaces
      let leadingSpaces = 0;
      for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') {
          leadingSpaces++;
        } else {
          break;
        }
      }

      // Calculate indent levels
      const indentLevels = Math.floor(leadingSpaces / indentSize);

      // Create decorations for each indent level on this line
      for (let level = 0; level < indentLevels; level++) {
        const colorIndex = level % INDENT_COLORS.length;
        const indentPos = level * indentSize;
        const startPos = new vscode.Position(lineNum, indentPos);
        const endPos = new vscode.Position(lineNum, indentPos + 1);
        decorationRanges[colorIndex].push(new vscode.Range(startPos, endPos));
      }
    }

    // Apply decorations
    decorationRanges.forEach((ranges, index) => {
      editor.setDecorations(indentDecorations[index], ranges);
    });
  } catch (error) {
    console.error('Rainbow indent guide error:', error);
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Expr language extension activated');

  // Create bracket decorations
  createBracketDecorations();

  // Create indent decorations
  createIndentDecorations();

  // Register document formatter
  const formatterProvider = vscode.languages.registerDocumentFormattingEditProvider('expr', {
    provideDocumentFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
      const config = vscode.workspace.getConfiguration('expr');
      const indentSize = config.get<number>('indentSize', 2);
      const maxLineLength = config.get<number>('maxLineLength', 120);

      try {
        const text = document.getText();
        const formatted = format(text, { indentSize, maxLineLength });

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

  // Update brackets and indent guides for active editor
  updateBrackets(vscode.window.activeTextEditor);
  updateIndentGuides(vscode.window.activeTextEditor);

  // Update brackets and indent guides when active editor changes
  const editorChangeListener = vscode.window.onDidChangeActiveTextEditor((editor) => {
    updateBrackets(editor);
    updateIndentGuides(editor);
  });

  // Update brackets and indent guides when document changes
  const documentChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
    if (vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
      updateBrackets(vscode.window.activeTextEditor);
      updateIndentGuides(vscode.window.activeTextEditor);
    }
  });

  // Update brackets and indent guides when configuration changes
  const configChangeListener = vscode.workspace.onDidChangeConfiguration((event) => {
    if (event.affectsConfiguration('expr.rainbowBrackets') || event.affectsConfiguration('expr.indentSize')) {
      updateBrackets(vscode.window.activeTextEditor);
      updateIndentGuides(vscode.window.activeTextEditor);
    }
  });

  context.subscriptions.push(
    formatterProvider,
    formatCommand,
    editorChangeListener,
    documentChangeListener,
    configChangeListener
  );
}

export function deactivate() {
  console.log('Expr language extension deactivated');
  // Dispose all decorations
  bracketDecorations.forEach((d) => d.dispose());
  indentDecorations.forEach((d) => d.dispose());
}
