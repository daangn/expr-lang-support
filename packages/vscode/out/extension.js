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
const formatter_1 = require("./formatter");
function activate(context) {
    console.log('Expr language extension activated');
    // Register document formatter
    const formatterProvider = vscode.languages.registerDocumentFormattingEditProvider('expr', {
        provideDocumentFormattingEdits(document) {
            const config = vscode.workspace.getConfiguration('expr');
            const indentSize = config.get('indentSize', 2);
            try {
                const text = document.getText();
                const formatted = (0, formatter_1.format)(text, { indentSize });
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
    context.subscriptions.push(formatterProvider, formatCommand);
}
function deactivate() {
    console.log('Expr language extension deactivated');
}
//# sourceMappingURL=extension.js.map