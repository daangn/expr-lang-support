# Expr Language Support

Syntax highlighting support for [Expr](https://github.com/expr-lang/expr) language in VS Code.

## Features

### ✨ Syntax Highlighting
- Full syntax highlighting for Expr language
- Support for all Expr language constructs:
  - Keywords: `let`, `if`, `else`, `in`, `and`, `or`, `not`
  - Operators: arithmetic, comparison, logical, pipe, ternary
  - Literals: numbers, strings, booleans, nil
  - Comments: `#`, `//`, and `/* */`
  - Built-in functions
  - Special variables: `$env`, `#`, `#acc`, `#index`

## 🚀 Quick Start

### Installation

1. Download the `.vsix` file from releases
2. Install in VS Code:
   - Open VS Code
   - Go to Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
   - Click the `...` menu at the top
   - Select "Install from VSIX..."
   - Choose the downloaded `.vsix` file

### Development Setup

```bash
# Clone the repository
git clone https://github.com/daangn/expr-lang-support.git
cd expr-lang-support

# Install dependencies
npm install

# Build the extension
npm run build:vscode

# Package the extension
npm run package:vscode
```

## Usage

Syntax highlighting is automatically applied to `.expr` files when you open them in VS Code.

## Supported Expr Language Features

- **Literals**: Numbers (decimal, hex, octal, binary), strings (single, double, backtick), booleans, nil
- **Operators**: `+`, `-`, `*`, `/`, `%`, `**`, `==`, `!=`, `<`, `>`, `<=`, `>=`, `&&`, `||`, `!`, `??`, `..`, `?.`
- **Collections**: Arrays `[1, 2, 3]`, Maps `{a: 1, b: 2}`
- **Functions**: Function calls with any number of arguments
- **Control Flow**: `if/else` statements, `let` variable bindings
- **Special Operators**:
  - Ternary: `condition ? true_value : false_value`
  - Pipe: `value | func1() | func2()`
  - Range: `1..10`
  - Slice: `array[1:3]`
  - Membership: `value in array`
- **String Operators**: `contains`, `startsWith`, `endsWith`, `matches`
- **Special Variables**: `$env.VAR`, `#` (predicate), `#acc` (accumulator), `#index`
- **Comments**: Line comments (`#`, `//`) and block comments (`/* */`)

## Language Configuration

The extension provides intelligent bracket matching, auto-closing pairs, and comment toggling:

- **Auto-closing pairs**: `()`, `[]`, `{}`, `""`, `''`, `` `` ``
- **Surrounding pairs**: Same as auto-closing
- **Comment toggle**: Use `Ctrl+/` (Windows/Linux) or `Cmd+/` (Mac)

## Example File

See `example.expr` for a comprehensive demonstration of all language features.

## 🏗 Project Structure

```
expr-lang-support/
├── packages/
│   └── vscode/             # VS Code extension
│       ├── src/
│       │   └── extension.ts
│       ├── syntaxes/       # TextMate grammar
│       └── package.json
│
├── package.json            # Root workspace config
└── README.md
```

## 🤝 Contributing

Found a bug or want to contribute? Issues and pull requests are welcome!

### Development Workflow

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Build and test: `npm run build`
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📝 Release Notes

### 0.2.0
- 🎨 Syntax highlighting for Expr language
- ⚙️ Language configuration (brackets, comments)
- 📝 Example files

### 0.1.0
- 🎉 Initial release

## License

MIT

---

**Enjoy coding with Expr!** 🚀
