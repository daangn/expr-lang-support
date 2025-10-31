// Simple tokenizer for Expr language
export enum TokenType {
  COMMENT = 'COMMENT',
  LPAREN = 'LPAREN',
  RPAREN = 'RPAREN',
  LBRACKET = 'LBRACKET',
  RBRACKET = 'RBRACKET',
  COMMA = 'COMMA',
  NEWLINE = 'NEWLINE',
  OPERATOR = 'OPERATOR',
  KEYWORD = 'KEYWORD',
  IDENTIFIER = 'IDENTIFIER',
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}

const KEYWORDS = new Set(['IF', 'in', 'and', 'or', 'not', 'let']);
const OPERATORS = ['==', '!=', '>=', '<=', '>', '<', '&&', '||', '**', '+', '-', '*', '/', '%'];

export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  while (i < input.length) {
    const char = input[i];

    // Skip whitespace (except newlines)
    if (char === ' ' || char === '\t' || char === '\r') {
      i++;
      col++;
      continue;
    }

    // Newline
    if (char === '\n') {
      tokens.push({ type: TokenType.NEWLINE, value: '\n', line, col });
      i++;
      line++;
      col = 1;
      continue;
    }

    // Comment (# or //)
    if (char === '#' || (char === '/' && input[i + 1] === '/')) {
      const start = i;
      while (i < input.length && input[i] !== '\n') {
        i++;
      }
      tokens.push({ type: TokenType.COMMENT, value: input.slice(start, i), line, col });
      col += i - start;
      continue;
    }

    // Parentheses
    if (char === '(') {
      tokens.push({ type: TokenType.LPAREN, value: '(', line, col });
      i++;
      col++;
      continue;
    }
    if (char === ')') {
      tokens.push({ type: TokenType.RPAREN, value: ')', line, col });
      i++;
      col++;
      continue;
    }

    // Brackets
    if (char === '[') {
      tokens.push({ type: TokenType.LBRACKET, value: '[', line, col });
      i++;
      col++;
      continue;
    }
    if (char === ']') {
      tokens.push({ type: TokenType.RBRACKET, value: ']', line, col });
      i++;
      col++;
      continue;
    }

    // Comma
    if (char === ',') {
      tokens.push({ type: TokenType.COMMA, value: ',', line, col });
      i++;
      col++;
      continue;
    }

    // String
    if (char === '"' || char === "'" || char === '`') {
      const quote = char;
      const start = i;
      i++;
      while (i < input.length && input[i] !== quote) {
        if (input[i] === '\\') i++;
        i++;
      }
      i++; // closing quote
      tokens.push({ type: TokenType.STRING, value: input.slice(start, i), line, col });
      col += i - start;
      continue;
    }

    // Number
    if (char >= '0' && char <= '9') {
      const start = i;
      while (i < input.length && (input[i] >= '0' && input[i] <= '9' || input[i] === '.' || input[i] === 'e' || input[i] === 'E')) {
        i++;
      }
      tokens.push({ type: TokenType.NUMBER, value: input.slice(start, i), line, col });
      col += i - start;
      continue;
    }

    // Operators (multi-char first)
    let foundOp = false;
    for (const op of OPERATORS) {
      if (input.slice(i, i + op.length) === op) {
        tokens.push({ type: TokenType.OPERATOR, value: op, line, col });
        i += op.length;
        col += op.length;
        foundOp = true;
        break;
      }
    }
    if (foundOp) continue;

    // Identifier or keyword
    if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_' || char === '$') {
      const start = i;
      while (i < input.length && ((input[i] >= 'a' && input[i] <= 'z') ||
             (input[i] >= 'A' && input[i] <= 'Z') ||
             (input[i] >= '0' && input[i] <= '9') ||
             input[i] === '_' || input[i] === '$')) {
        i++;
      }
      const value = input.slice(start, i);
      const type = KEYWORDS.has(value) ? TokenType.KEYWORD : TokenType.IDENTIFIER;
      tokens.push({ type, value, line, col });
      col += i - start;
      continue;
    }

    // Unknown character - skip
    i++;
    col++;
  }

  tokens.push({ type: TokenType.EOF, value: '', line, col });
  return tokens;
}
