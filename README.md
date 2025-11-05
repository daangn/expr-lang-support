# Expr Language Support

VS Code extension for [Expr](https://github.com/expr-lang/expr) language with syntax highlighting, intelligent formatting, rainbow brackets, and file navigation.

## Features

- ✨ **Syntax Highlighting** - Full support for Expr language constructs
- 🌈 **Rainbow Brackets** - Color-coded parentheses by nesting depth
- 🎨 **Smart Formatting** - Auto-format with intelligent spacing and indentation
- 🔗 **File Navigation** - Click `"*.expr"` strings to jump to referenced files

## Installation

**From VS Code Marketplace:**

1. Open VS Code Extensions (`Ctrl+Shift+X` or `Cmd+Shift+X`)
2. Search for "Expr Lang - Syntax & Formatter"
3. Click Install

Or visit the [VS Code Marketplace](https://marketplace.visualstudio.com/vscode)

## Usage

Create a `.expr` file and start coding! Formatting: `Shift+Alt+F` (Windows/Linux) or `Shift+Option+F` (Mac)

### Configuration

```json
{
  "expr.indentSize": 2,
  "expr.maxLineLength": 120,
  "expr.rainbowBrackets.enabled": true,
  "[expr]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "daangn-ml-data-platform.expr-lang-support"
  }
}
```

## Development

```bash
# Build and package
npm install
npm run build:formatter
npm run build:vscode
npm run package
```

## License

MIT
