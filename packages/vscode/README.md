# Expr Language Support

Complete language support for [Expr](https://github.com/expr-lang/expr) language - syntax highlighting and formatting in one extension!

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

### 🎨 Code Formatting
- Simple and clean formatter (~50 lines of code)
- Respects your code structure
- Auto-indentation based on parentheses
- Smart comment handling with blank lines
- Format on save support

## Installation

1. Download the `.vsix` file
2. Open VS Code
3. Go to Extensions view (`Ctrl+Shift+X` or `Cmd+Shift+X`)
4. Click the `...` menu at the top
5. Select "Install from VSIX..."
6. Choose the downloaded `expr-lang-support-0.3.0.vsix` file

## Usage

### Syntax Highlighting
Automatically applied to `.expr` files!

### Code Formatting

#### Format Document
- **Command Palette**: Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac), then type "Format Document"
- **Keyboard Shortcut**: `Shift+Alt+F` (Windows/Linux) or `Shift+Option+F` (Mac)
- **Context Menu**: Right-click in the editor and select "Format Document"

#### Format on Save
Format on save is enabled by default. To disable:
```json
{
  "[expr]": {
    "editor.formatOnSave": false
  }
}
```

## Configuration

```json
{
  "expr.indentSize": 2  // Number of spaces for indentation
}
```

## Formatting Example

### Before
```expr
# comment
IF(a > b,
result1,
result2)
* factor
```

### After
```expr
# comment
IF(a > b,
  result1,
  result2)
* factor
```

## How the Formatter Works

The formatter is intentionally simple:
1. You manually break expressions into multiple lines as you prefer
2. The formatter automatically fixes the indentation
3. Lines ending with `(` increase indent for the next line
4. Lines starting with `)` decrease indent
5. Blank lines are added before comments (except consecutive comments)

## Supported Language Features

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

- **Auto-closing pairs**: `()`, `[]`, `{}`, `""`, `''`, `` `` ``
- **Surrounding pairs**: Same as auto-closing
- **Comment toggle**: Use `Ctrl+/` (Windows/Linux) or `Cmd+/` (Mac)

## License

MIT

---

**Enjoy coding with Expr!** 🚀
