# Expr Language Support

VS Code extension for [Expr](https://github.com/expr-lang/expr) language with syntax highlighting, intelligent formatting, and rainbow brackets.

## Features

- ✨ **Syntax Highlighting** - Full support for Expr language constructs
- 🌈 **Rainbow Brackets** - Color-coded parentheses by nesting depth
- 🎨 **Smart Formatting** - Auto-format with intelligent spacing and indentation

## Installation

```bash
code --install-extension expr-lang-support-0.3.0.vsix
```

Or in VS Code: `Extensions` → `...` → `Install from VSIX...`

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
    "editor.defaultFormatter": "daangn.expr-lang-support"
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
