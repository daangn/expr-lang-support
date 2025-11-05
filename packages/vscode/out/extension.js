"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const formatter_1 = require("./formatter");
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
let bracketDecorations = [];
// Decoration types for each indent level
let indentDecorations = [];
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
function updateBrackets(editor) {
    if (!editor || editor.document.languageId !== 'expr') {
        return;
    }
    const config = vscode.workspace.getConfiguration('expr');
    const enabled = config.get('rainbowBrackets.enabled', true);
    if (!enabled) {
        // Clear all decorations if disabled
        bracketDecorations.forEach((decoration) => {
            editor.setDecorations(decoration, []);
        });
        return;
    }
    const text = editor.document.getText();
    const decorationRanges = [];
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
            }
            else if (char === ')') {
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
    }
    catch (error) {
        // If parsing fails, silently skip coloring
        console.error('Rainbow bracket error:', error);
    }
}
function updateIndentGuides(editor) {
    if (!editor || editor.document.languageId !== 'expr') {
        return;
    }
    const config = vscode.workspace.getConfiguration('expr');
    const enabled = config.get('rainbowBrackets.enabled', true);
    const indentSize = config.get('indentSize', 2);
    if (!enabled) {
        // Clear all decorations if disabled
        indentDecorations.forEach((decoration) => {
            editor.setDecorations(decoration, []);
        });
        return;
    }
    const document = editor.document;
    const decorationRanges = [];
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
                }
                else {
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
    }
    catch (error) {
        console.error('Rainbow indent guide error:', error);
    }
}
class ExprFileLinkProvider {
    provideDocumentLinks(document) {
        const links = [];
        const text = document.getText();
        // Match quoted strings containing .expr files
        const regex = /["']([^"']+\.expr)["']/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
            const filePath = match[1];
            const startPos = document.positionAt(match.index + 1); // +1 to skip opening quote
            const endPos = document.positionAt(match.index + 1 + filePath.length);
            const range = new vscode.Range(startPos, endPos);
            try {
                // Resolve file path relative to current document
                const currentDir = path.dirname(document.uri.fsPath);
                const fullPath = path.resolve(currentDir, filePath);
                const fileUri = vscode.Uri.file(fullPath);
                // Create document link
                const link = new vscode.DocumentLink(range, fileUri);
                link.tooltip = `Open ${filePath}`;
                links.push(link);
            }
            catch (error) {
                console.error('[ExprLink] Error resolving expr file path:', error);
            }
        }
        return links;
    }
}
class ExprFileDefinitionProvider {
    provideDefinition(document, position) {
        console.log('[ExprDef] provideDefinition called at', position.line, position.character);
        const line = document.lineAt(position.line);
        const lineText = line.text;
        console.log('[ExprDef] Line text:', lineText);
        // Scan the entire line for .expr files and find the one under cursor
        const regex = /["']([^"']+\.expr)["']/g;
        let match;
        while ((match = regex.exec(lineText)) !== null) {
            const filePath = match[1];
            const matchStart = match.index + 1; // +1 to skip opening quote
            const matchEnd = matchStart + filePath.length;
            console.log('[ExprDef] Checking match:', filePath, 'range:', matchStart, '-', matchEnd);
            // Check if cursor is within this match (including the filename)
            if (position.character >= matchStart && position.character <= matchEnd) {
                console.log('[ExprDef] Cursor is within match!');
                try {
                    // Resolve file path relative to current document
                    const currentDir = path.dirname(document.uri.fsPath);
                    const fullPath = path.resolve(currentDir, filePath);
                    const fileUri = vscode.Uri.file(fullPath);
                    console.log('[ExprDef] Resolved full path:', fullPath);
                    // Create the range for the entire filename (without quotes)
                    const originSelectionRange = new vscode.Range(new vscode.Position(position.line, matchStart), new vscode.Position(position.line, matchEnd));
                    // Return LocationLink with explicit range for better hover UX
                    return [{
                            originSelectionRange: originSelectionRange,
                            targetUri: fileUri,
                            targetRange: new vscode.Range(0, 0, 0, 0),
                            targetSelectionRange: new vscode.Range(0, 0, 0, 0)
                        }];
                }
                catch (error) {
                    console.error('[ExprDef] Error resolving expr file path:', error);
                    return undefined;
                }
            }
        }
        console.log('[ExprDef] No match found');
        return undefined;
    }
}
function activate(context) {
    console.log('Expr language extension activated');
    // Create bracket decorations
    createBracketDecorations();
    // Create indent decorations
    createIndentDecorations();
    // Register document formatter
    const formatterProvider = vscode.languages.registerDocumentFormattingEditProvider('expr', {
        provideDocumentFormattingEdits(document) {
            const config = vscode.workspace.getConfiguration('expr');
            const indentSize = config.get('indentSize', 2);
            const maxLineLength = config.get('maxLineLength', 120);
            try {
                const text = document.getText();
                const formatted = (0, formatter_1.format)(text, { indentSize, maxLineLength });
                const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length));
                return [vscode.TextEdit.replace(fullRange, formatted)];
            }
            catch (error) {
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
    // Register document link provider for .expr file highlighting
    // Makes .expr files appear as clickable links in all file types
    const linkProvider = vscode.languages.registerDocumentLinkProvider({ scheme: 'file' }, new ExprFileLinkProvider());
    // Register definition provider for .expr file navigation
    // Works in all file types (markdown, plaintext, etc.)
    const definitionProvider = vscode.languages.registerDefinitionProvider({ scheme: 'file' }, new ExprFileDefinitionProvider());
    context.subscriptions.push(formatterProvider, formatCommand, editorChangeListener, documentChangeListener, configChangeListener, linkProvider, definitionProvider);
}
function deactivate() {
    console.log('Expr language extension deactivated');
    // Dispose all decorations
    bracketDecorations.forEach((d) => d.dispose());
    indentDecorations.forEach((d) => d.dispose());
}
//# sourceMappingURL=extension.js.map