# Expr Language Support

Complete language support for Expr language - syntax highlighting, intelligent formatting, and rainbow brackets all in one extension!

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

### 🌈 Rainbow Brackets & Indent Guides
- **Rainbow Brackets**: Color-coded parentheses by nesting depth (5 colors)
  - Coral Pink, Amber Orange, Sky Blue, Mint Green, Lilac Violet
- **Rainbow Indent Guides**: Subtle colored vertical lines for each indent level
  - Dark Brown, Brown, Blue, Teal, Violet
- Helps visualize nested expressions and structure at a glance
- Automatically skips comments and strings
- Can be toggled on/off in settings

### 🎨 Intelligent Code Formatting
- **Smart formatting** with multiline expansion
- **Preserves user intent**: Already multiline expressions stay multiline
- **Auto-indentation** based on parentheses and brackets
- **Smart spacing**:
  - Automatically adds space after commas
  - Correctly handles unary vs binary minus (`-1` vs `x - 1`)
  - No space between function name and opening paren
- **Comment handling**:
  - Preserves blank lines above standalone comments
  - Groups consecutive comment blocks together
  - Handles `#`, `//`, and `/* */` style comments
- **Format on save** support (enabled by default)

## Installation

### Install from code

```bash
npm run package:vscod
code --install-extension expr-lang-support-0.3.0.vsix
```

### VS Code Marketplace

Search the "Expr Language Support" in the Marketplace tab, and install the extension.

## Usage

### Syntax Highlighting
Automatically applied to `.expr` files!

### Format on Save
Format on save is enabled by default. To disable:
```json
{
  "[expr]": {
    "editor.formatOnSave": false
  }
}
```

## Configuration

All settings are optional and have sensible defaults:

```json
{
  // Formatter settings
  "expr.indentSize": 2,                    // Number of spaces for indentation (default: 2)
  "expr.maxLineLength": 120,               // Maximum line length before expanding (default: 120)

  // Rainbow brackets settings
  "expr.rainbowBrackets.enabled": true,    // Enable rainbow brackets and indent guides (default: true)

  // Format on save
  "[expr]": {
    "editor.formatOnSave": true,           // Auto-format on save (default: true)
    "editor.defaultFormatter": "daangn.expr-lang-support"
  }
}
```

### Disable Rainbow Brackets

If you prefer plain brackets without colors:

```json
{
  "expr.rainbowBrackets.enabled": false
}
```

## Formatting Examples

### Example 1: Auto-expansion for long expressions

**Before:**
```expr
IF(CANDIDATE_TYPE == candidate_type('ARTICLE'), calculate_score(Q_VALUE, P_IMPRESSION, OPERATION_SCORE), 0)
```

**After:**
```expr
IF(
  CANDIDATE_TYPE == candidate_type('ARTICLE'),
  calculate_score(Q_VALUE, P_IMPRESSION, OPERATION_SCORE),
  0
)
```

### Example 2: Smart spacing and negative numbers

**Before:**
```expr
min(1.0,(exp(2.0) - 1))
IF(x > 0, - 1, - 2)
```

**After:**
```expr
min(1.0, (exp(2.0) - 1))
IF(x > 0, -1, -2)
```

### Example 3: Comment handling

**Before:**
```expr
x * y
# Service weight
* 0.735
# Engagement score
* engagement
# Another comment
# Continuation of comment block
* decay
```

**After:**
```expr
x * y

# Service weight
* 0.735

# Engagement score
* engagement

# Another comment
# Continuation of comment block
* decay
```

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

## Development & Deployment

### Building from Source

```bash
# Clone the repository
git clone https://github.com/your-repo/expr-lang-support
cd expr-lang-support/packages/vscode

# Install dependencies
npm install

# Build the extension
npm run build

# Package the extension
npm run package
```

### Development

```bash
# Watch mode (auto-rebuild on changes)
npm run watch

# Then press F5 in VS Code to launch Extension Development Host
```

### Publishing to VS Code Marketplace

1. **Get Publisher Access Token**
   - Create an Azure DevOps account
   - Generate a Personal Access Token with `Marketplace (Manage)` scope
   - More info: https://code.visualstudio.com/api/working-with-extensions/publishing-extension

2. **Login to vsce**
   ```bash
   npm install -g @vscode/vsce
   vsce login <publisher-name>
   ```

3. **Publish**
   ```bash
   # Publish current version
   vsce publish

   # Or publish with version bump
   vsce publish patch  # 0.3.0 -> 0.3.1
   vsce publish minor  # 0.3.0 -> 0.4.0
   vsce publish major  # 0.3.0 -> 1.0.0
   ```

## Troubleshooting

### Extension not activating
- Make sure your file has `.expr` extension
- Reload VS Code: `Ctrl+Shift+P` → "Reload Window"

### Formatting not working
- Check that the extension is set as default formatter:
  ```json
  {
    "[expr]": {
      "editor.defaultFormatter": "daangn.expr-lang-support"
    }
  }
  ```

### Rainbow brackets not showing
- Check that rainbow brackets are enabled:
  ```json
  {
    "expr.rainbowBrackets.enabled": true
  }
  ```
- Reload VS Code after changing settings

## License

MIT
