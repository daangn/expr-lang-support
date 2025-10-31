# Expr Language Syntax Highlighter

VSCode extension for syntax highlighting [Expr language](https://expr-lang.org/) files.

## Features

- Syntax highlighting for `.expr` files
- Support for all Expr language features:
  - Comments (line and block)
  - Keywords (`let`, `if`, `else`, `in`)
  - Boolean and nil literals
  - Numbers (decimal, hex, octal, binary, float)
  - Strings (single, double, backtick with escape sequences)
  - Operators (arithmetic, comparison, logical, ternary, nil coalescing)
  - Built-in functions (string, array, map, date, numeric, type conversion, etc.)
  - Special variables (`$env`, `#`, `#acc`, `#index`)
  - Collections (arrays, maps)

## Installation

### From Source

1. Clone this repository
2. Open in VSCode
3. Press `F5` to launch Extension Development Host
4. Open a `.expr` file to see syntax highlighting

### Manual Installation

1. Copy this folder to your VSCode extensions directory:
   - Windows: `%USERPROFILE%\.vscode\extensions`
   - macOS/Linux: `~/.vscode/extensions`
2. Reload VSCode
3. Open any `.expr` file

## Usage

Simply open any file with the `.expr` extension, and syntax highlighting will be applied automatically.

## Example

See `example.expr` for a comprehensive demonstration of all language features.

## Language Reference

This extension is based on the official [Expr language definition](https://expr-lang.org/docs/language-definition).

## License

MIT
