# @expr-lang/formatter

Simple and clean formatter for Expr language.

## Installation

### Global installation
```bash
npm install -g @expr-lang/formatter
```

### Local installation
```bash
npm install --save-dev @expr-lang/formatter
```

## Usage

### CLI

```bash
# Format a file and print to stdout
expr-fmt file.expr

# Custom indentation size
expr-fmt --indent-size 4 file.expr
```

### Programmatic API

```typescript
import { format } from '@expr-lang/formatter';

const input = `
IF(condition, value1, value2)
* factor
`;

const output = format(input, { indentSize: 2 });
console.log(output);
```

## How it works

The formatter is intentionally simple:
1. You manually break expressions into multiple lines as you prefer
2. The formatter automatically fixes the indentation
3. Lines ending with `(` increase indent for the next line
4. Lines starting with `)` decrease indent

## Example

### Input
```expr
# comment
IF(a > b,
result1,
result2)
* factor
```

### Output
```expr
# comment
IF(a > b,
  result1,
  result2)
* factor
```

## Options

```typescript
interface FormatOptions {
  indentSize: number;  // Default: 2
}
```

## License

MIT
