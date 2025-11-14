import { tokenize, TokenType, Token } from './lexer';

export interface FormatOptions {
  indentSize: number;
  maxLineLength: number;
}

const DEFAULT_OPTIONS: FormatOptions = {
  indentSize: 2,
  maxLineLength: 120,
};

/**
 * Operator constants for consistent handling throughout the formatter
 */
const OPERATORS = {
  // Logical operators
  OR: '||',
  AND: '&&',

  // Arithmetic operators
  PLUS: '+',
  MINUS: '-',
  MULTIPLY: '*',
  DIVIDE: '/',
  POWER: '**',

  // Comparison operators
  EQ: '==',
  NEQ: '!=',
  LT: '<',
  GT: '>',
  LTE: '<=',
  GTE: '>=',

  // Other operators
  IN: 'in',
  MATCHES: 'matches',
} as const;

/**
 * Operator groups for categorization
 */
const OPERATOR_GROUPS = {
  LOGICAL: [OPERATORS.OR, OPERATORS.AND],
  ARITHMETIC: [OPERATORS.PLUS, OPERATORS.MINUS, OPERATORS.MULTIPLY, OPERATORS.DIVIDE, OPERATORS.POWER],
  COMPARISON: [OPERATORS.EQ, OPERATORS.NEQ, OPERATORS.LT, OPERATORS.GT, OPERATORS.LTE, OPERATORS.GTE],
} as const;

export function format(input: string, options: Partial<FormatOptions> = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const tokens = tokenize(input).filter(t => t.type !== TokenType.EOF);

  /**
   * Operator type checking helpers
   */
  const isOperator = (token: Token | null, operatorValue: string): boolean => {
    return token?.type === TokenType.OPERATOR && token.value === operatorValue;
  };

  const isArithmeticOperator = (token: Token | null): boolean => {
    if (!token || token.type !== TokenType.OPERATOR) return false;
    return (OPERATOR_GROUPS.ARITHMETIC as readonly string[]).includes(token.value);
  };

  // Reserved for future use
  // const isLogicalOperator = (token: Token | null): boolean => {
  //   if (!token || token.type !== TokenType.OPERATOR) return false;
  //   return (OPERATOR_GROUPS.LOGICAL as readonly string[]).includes(token.value);
  // };

  const lines: string[] = [];
  let indentLevel = 0;
  let i = 0;
  let lastProcessedToken: Token | null = null;
  let pendingBlankLines = 0; // Track blank lines to preserve

  const indent = () => ' '.repeat(indentLevel * opts.indentSize);

  // Check if token at index is a function call (function name followed by LPAREN)
  const isFunctionCall = (idx: number): boolean => {
    if (idx >= tokens.length) return false;
    const tok = tokens[idx];
    const nextTok = tokens[idx + 1];
    return (tok.type === TokenType.IDENTIFIER || tok.type === TokenType.KEYWORD) &&
           nextTok?.type === TokenType.LPAREN;
  };

  // Get function name at index (assumes isFunctionCall returned true)
  const getFunctionName = (idx: number): string => {
    return tokens[idx].value;
  };

  // Check if previous non-whitespace token is an operator
  const prevTokenIsOperator = (currentIdx: number): boolean => {
    for (let j = currentIdx - 1; j >= 0; j--) {
      const t = tokens[j];
      if (t.type === TokenType.NEWLINE) continue;
      return t.type === TokenType.OPERATOR;
    }
    return false;
  };

  const getPrevOperator = (currentIdx: number): string | null => {
    for (let j = currentIdx - 1; j >= 0; j--) {
      const t = tokens[j];
      if (t.type === TokenType.NEWLINE) continue;
      if (t.type === TokenType.OPERATOR) return t.value;
      return null;
    }
    return null;
  };

  /**
   * Token classification: Check if token represents a value
   * (number, string, identifier, or closing bracket/paren)
   */
  const isValueToken = (tok: Token | null): boolean => {
    if (!tok) return false;
    return tok.type === TokenType.NUMBER ||
           tok.type === TokenType.STRING ||
           tok.type === TokenType.IDENTIFIER ||
           tok.type === TokenType.RPAREN ||
           tok.type === TokenType.RBRACKET;
  };

  /**
   * Determine if minus operator is unary (negative sign) or binary (subtraction)
   * based on the preceding token.
   */
  const isMinusUnary = (prevToken: Token | null): boolean => {
    if (!prevToken) return true; // Minus at start is unary

    // Unary if previous token cannot be a value (after operators, opening brackets, comma)
    return prevToken.type === TokenType.OPERATOR ||
           prevToken.type === TokenType.LPAREN ||
           prevToken.type === TokenType.COMMA ||
           prevToken.type === TokenType.LBRACKET;
  };

  /**
   * Determine if minus at line start is binary subtraction (not unary negative).
   * This handles multi-line arithmetic expressions where minus starts a new line.
   */
  const isMinusBinaryAtLineStart = (
    prevTokenBeforeLine: Token | null,
    tokensInLine: Token[],
    minusIdx: number
  ): boolean => {
    // If we have clear context from previous line
    if (prevTokenBeforeLine) {
      // Definitely unary after these tokens
      if (isMinusUnary(prevTokenBeforeLine)) {
        return false;
      }
      // Binary after value tokens
      if (isValueToken(prevTokenBeforeLine)) {
        return true;
      }
      // Binary after arithmetic operator if line has more tokens (multi-line arithmetic)
      if (isArithmeticOperator(prevTokenBeforeLine) && minusIdx + 2 < tokensInLine.length) {
        return true;
      }
    }

    // No clear context, check pattern: - NUMBER * IDENTIFIER (not function call)
    if (minusIdx + 3 < tokensInLine.length &&
        tokensInLine[minusIdx + 1]?.type === TokenType.NUMBER &&
        isOperator(tokensInLine[minusIdx + 2], OPERATORS.MULTIPLY) &&
        tokensInLine[minusIdx + 3]?.type === TokenType.IDENTIFIER &&
        !(minusIdx + 4 < tokensInLine.length && tokensInLine[minusIdx + 4]?.type === TokenType.LPAREN)) {
      return true;
    }

    return false;
  };

  /**
   * Check if we need a space before current token given the previous token
   */
  const needsSpaceBefore = (
    currentToken: Token,
    previousToken: Token | null,
    lastCharInResult: string
  ): boolean => {
    // Already has space
    if (lastCharInResult === ' ') return false;

    // At start of line - no space needed
    if (lastCharInResult === '') return false;

    // No previous token
    if (!previousToken) return false;

    // Never space before these
    if (currentToken.type === TokenType.RPAREN ||
        currentToken.type === TokenType.RBRACKET ||
        currentToken.type === TokenType.COMMA) {
      return false;
    }

    // Never space after these
    if (lastCharInResult === '(' || lastCharInResult === '[') {
      return false;
    }

    // No space between function name and opening paren
    const prevIsCallable = previousToken.type === TokenType.IDENTIFIER ||
                           previousToken.type === TokenType.KEYWORD;
    if (currentToken.type === TokenType.LPAREN && prevIsCallable) {
      return false;
    }

    // No space between unary operators (! or -) and opening paren
    const prevIsUnary = previousToken.type === TokenType.OPERATOR &&
                        (previousToken.value === '!' || previousToken.value === '-');
    if (currentToken.type === TokenType.LPAREN && prevIsUnary) {
      return false;
    }

    // Default: add space
    return true;
  };

  /**
   * Convert a sequence of tokens to a formatted string.
   * Applies spacing rules and handles special cases like unary/binary minus.
   */
  const tokensToString = (toks: Token[], prevTokenBeforeLine?: Token | null): string => {
    let result = '';

    for (let i = 0; i < toks.length; i++) {
      const tok = toks[i];
      if (tok.type === TokenType.NEWLINE) continue;

      const prevTok = i > 0 ? toks[i - 1] : (prevTokenBeforeLine ?? null);
      const nextTok = i + 1 < toks.length ? toks[i + 1] : null;
      const lastChar = result.length > 0 ? result[result.length - 1] : '';

      // Handle minus operator spacing: binary (subtraction) vs unary (negative)
      if (isOperator(tok, OPERATORS.MINUS)) {
        // Case 1: Minus at line start followed by number
        if (result.length === 0 && nextTok?.type === TokenType.NUMBER) {
          if (isMinusBinaryAtLineStart(prevTokenBeforeLine ?? null, toks, i)) {
            result += '- ';
            continue;
          }
          // Otherwise unary, will be handled by normal spacing rules below
        }
        // Case 2: Unary minus within line (after LPAREN, COMMA, LBRACKET)
        // Note: after other operators like ==, we want normal spacing
        else if (prevTok &&
                 (prevTok.type === TokenType.LPAREN ||
                  prevTok.type === TokenType.COMMA ||
                  prevTok.type === TokenType.LBRACKET)) {
          // Unary: no space before minus
          result += OPERATORS.MINUS;
          continue;
        }
      }

      // Handle number after unary minus: no space
      if (tok.type === TokenType.NUMBER && isOperator(prevTok, OPERATORS.MINUS)) {
        const beforeMinus = i >= 2 ? toks[i - 2] : (prevTokenBeforeLine ?? null);
        if (isMinusUnary(beforeMinus)) {
          result += tok.value;
          continue;
        }
      }

      // Apply spacing rules
      const needsSpace = needsSpaceBefore(tok, prevTok, lastChar);

      // Special case: Always space before comments
      const forceSpace = tok.type === TokenType.COMMENT && result.length > 0;

      // Special case: Always space after comma
      const spaceAfterComma = lastChar === ',';

      if (needsSpace || forceSpace || spaceAfterComma) {
        result += ' ';
      }

      result += tok.value;
    }
    return result;
  };

  /**
   * Determines if we should break the line before the current token.
   * This encapsulates the line breaking rules for logical expressions.
   *
   * Rules:
   * 1. &&(( pattern: Break before ( when && is followed by nested parens
   *    Rationale: && connects conditions, and (( signals a complex nested condition
   * 2. ) || pattern: Break before || when ) is followed by || but not (
   *    Rationale: ) || ( are peer alternatives (same level), but ) || <other> are different structures
   */
  const shouldBreakBeforeToken = (
    currentToken: Token,
    currentIdx: number,
    lineTokens: Token[],
    lookAheadToken: Token | null
  ): boolean => {
    if (lineTokens.length === 0) return false;

    const lastInLine = lineTokens[lineTokens.length - 1];

    // Rule 1: Break before ( if previous is && and next is also (
    // This creates &&\n(( for complex nested conditions
    if (currentToken.type === TokenType.LPAREN) {
      if (isOperator(lastInLine, OPERATORS.AND)) {
        if (lookAheadToken?.type === TokenType.LPAREN) {
          return true;
        }
      }
    }

    // Rule 2: Break before || if previous is ) AND there's something other than inline tokens after ||
    // This preserves inline || expressions like (a) || (b) but breaks when the input has newlines
    if (isOperator(currentToken, OPERATORS.OR)) {
      if (lastInLine.type === TokenType.RPAREN) {
        // Check what comes after ||: if it's a NEWLINE or if the next meaningful token is NOT on the same line
        const nextIdx = currentIdx + 1;
        if (nextIdx < tokens.length) {
          const nextToken = tokens[nextIdx];
          // If there's a newline or comment immediately after ||, break
          if (nextToken.type === TokenType.NEWLINE || nextToken.type === TokenType.COMMENT) {
            return true;
          }
          // Otherwise, keep inline (e.g., ) || ( on same line)
        }
      }
    }

    return false;
  };

  /**
   * Helper to look ahead past newlines and get the next meaningful token
   */
  const peekNextToken = (fromIdx: number): { token: Token | null; idx: number } => {
    let idx = fromIdx;
    while (idx < tokens.length && tokens[idx].type === TokenType.NEWLINE) {
      idx++;
    }
    return { token: idx < tokens.length ? tokens[idx] : null, idx };
  };

  /**
   * Checks if a paren expression immediately contains another nested paren expression.
   * This represents a nested parenthesized structure: `((...))`
   *
   * Language structure:
   * - Parenthesized expression: `(expression)`
   * - Nested parenthesized: `((expression))` - outer paren wraps inner paren expression
   *
   * Returns true if the content right after the opening paren is another opening paren.
   */
  const isNestedParenExpression = (parenIdx: number): boolean => {
    if (tokens[parenIdx]?.type !== TokenType.LPAREN) return false;
    // Only consider it nested if the next LPAREN is immediately adjacent (no NEWLINE between)
    // This prevents already-formatted code from being treated as nested again
    const nextIdx = parenIdx + 1;
    return nextIdx < tokens.length && tokens[nextIdx]?.type === TokenType.LPAREN;
  };

  /**
   * Determines what should follow a closing paren based on language structure.
   * This encapsulates the grammar rules for closing parentheses.
   *
   * Language structures:
   * 1. Function argument ending: `)` + `,` = "),`
   *    Rationale: In function calls like IF(cond, value1, value2), comma separates arguments
   * 2. Simple closing: Just ")"
   *    Rationale: Default case, operators like || will be on separate lines
   *
   * Returns: { suffix: string, skipToIdx: number }
   * - suffix: what to append after ")" (e.g., ",", "")
   * - skipToIdx: index to continue processing from
   */
  const getClosingParenSuffix = (
    currentIdx: number
  ): { suffix: string; skipToIdx: number } => {
    const { token: next1, idx: idx1 } = peekNextToken(currentIdx + 1);

    // Structure 1: Function argument ending "),<next-arg>"
    if (next1?.type === TokenType.COMMA) {
      return { suffix: ',', skipToIdx: idx1 + 1 };
    }

    // Structure 2: Simple closing
    return { suffix: '', skipToIdx: currentIdx + 1 };
  };

  // Check if there's immediate nesting (paren/function right after opening)
  const hasImmediateNesting = (startIdx: number): boolean => {
    // startIdx should point to LPAREN
    if (tokens[startIdx]?.type !== TokenType.LPAREN) return false;

    let nextIdx = startIdx + 1;
    // Skip newlines
    while (nextIdx < tokens.length && tokens[nextIdx].type === TokenType.NEWLINE) {
      nextIdx++;
    }

    if (nextIdx >= tokens.length) return false;

    const nextToken = tokens[nextIdx];

    // If next token is LPAREN, check if it's part of a function call or just a paren expression
    // (exp(...)) is NOT immediate nesting, but IF(IF(...)) IS immediate nesting
    if (nextToken.type === TokenType.LPAREN) {
      // Check what comes before this opening paren
      // If previous token (before startIdx) is a function/identifier, then this is immediate nesting
      // Example: IF((...)) - the second ( is at startIdx, previous is IF
      const prevIdx = startIdx - 1;
      if (prevIdx >= 0) {
        const prevToken = tokens[prevIdx];
        // If previous is identifier/keyword (function name), then this is immediate nesting
        if (prevToken.type === TokenType.IDENTIFIER || prevToken.type === TokenType.KEYWORD) {
          return true;
        }
      }
      // Otherwise (exp(...)) is just a parenthesized expression, not immediate nesting
      return false;
    }

    // Check if immediately followed by a function call
    // But only if previous token is a function name (meaning this is inside a function call)
    // Example: IF(exp(...)) is immediate nesting, but (exp(...)) is not
    if (isFunctionCall(nextIdx)) {
      const prevIdx = startIdx - 1;
      if (prevIdx >= 0) {
        const prevToken = tokens[prevIdx];
        // Only immediate nesting if previous is a function name
        return prevToken.type === TokenType.IDENTIFIER || prevToken.type === TokenType.KEYWORD;
      }
    }

    return false;
  };

  // Measure content length until closing paren
  const measureToClosingParen = (startIdx: number): { length: number; hasImmediateNesting: boolean; hasNewlines: boolean; endIdx: number } => {
    let depth = 0;
    let j = startIdx;
    const collectedTokens: Token[] = [];
    const immediateNesting = hasImmediateNesting(startIdx);
    let foundNewline = false;

    for (; j < tokens.length; j++) {
      const t = tokens[j];
      if (t.type === TokenType.LPAREN) {
        depth++;
      }
      if (t.type === TokenType.RPAREN) {
        depth--;
        if (depth === 0) {
          // Found matching closing paren - include it and return
          collectedTokens.push(t);
          const length = tokensToString(collectedTokens).length;
          return { length, hasImmediateNesting: immediateNesting, hasNewlines: foundNewline, endIdx: j };
        }
      }
      if (t.type === TokenType.NEWLINE) {
        foundNewline = true;
      } else {
        collectedTokens.push(t);
      }
    }

    const length = tokensToString(collectedTokens).length;
    return { length, hasImmediateNesting: immediateNesting, hasNewlines: foundNewline, endIdx: j };
  };

  // Format function call on multiple lines
  const formatFunctionMultiline = (startIdx: number): number => {
    let idx = startIdx;
    const funcName = getFunctionName(idx);

    // Check if previous token is an operator
    const prevIsOp = prevTokenIsOperator(startIdx);

    if (prevIsOp) {
      // Append function call to the last line with a space
      lines[lines.length - 1] = lines[lines.length - 1] + ' ' + funcName + '(';
    } else {
      // Output "FUNC(" on a new line
      lines.push(indent() + funcName + '(');
    }

    idx++; // Skip function name

    if (tokens[idx]?.type === TokenType.LPAREN) {
      idx++; // Skip opening paren
    }

    indentLevel++;

    // Collect arguments separated by commas at depth 1
    let depth = 1;
    let currentArg: Token[] = [];
    let consecutiveNewlines = 0; // Track consecutive newlines for blank line preservation
    let skipIncrement = false; // Flag to skip idx++ after multiline paren processing
    let lastOutputWasComment = false; // Track if last output line was a comment

    while (idx < tokens.length && depth > 0) {
      const tok = tokens[idx];
      skipIncrement = false;

      if (tok.type === TokenType.RPAREN) {
        depth--;
        if (depth === 0) {
          // End of function - output last argument
          if (currentArg.length > 0) {
            lines.push(indent() + tokensToString(currentArg));
            lastOutputWasComment = false;
          }
          indentLevel--;

          // Determine what should follow the closing paren based on language structure
          const { suffix, skipToIdx } = getClosingParenSuffix(idx);
          let closingLine = indent() + ')' + suffix;

          // Special case: check for inline comment immediately after ) (no newline)
          // This is separate from suffix logic as it's about inline documentation
          const immediateNext = idx + 1;
          if (immediateNext < tokens.length && tokens[immediateNext].type === TokenType.COMMENT) {
            closingLine = indent() + ')' + ' ' + tokens[immediateNext].value;
            lines.push(closingLine);
            lastOutputWasComment = false;
            return immediateNext + 1;
          }

          lines.push(closingLine);
          lastOutputWasComment = false;
          return skipToIdx;
        } else {
          currentArg.push(tok);
          consecutiveNewlines = 0;
        }
      } else if (tok.type === TokenType.LPAREN) {
        depth++;

        // Check if this paren has multiline content AND is long enough to warrant expansion
        const { hasNewlines: parenHasNewlines, length: parenLength } = measureToClosingParen(idx);

        if (parenHasNewlines && depth === 2 && parenLength > opts.maxLineLength) {
          // This is a multiline paren inside function argument that's too long
          // Output current arg content before the paren if exists, including the opening paren
          currentArg.push(tok);

          if (currentArg.length > 0) {
            lines.push(indent() + tokensToString(currentArg));
            currentArg = [];
          }

          indentLevel++;
          idx++; // Move past the LPAREN

          // Process content inside paren line by line
          let parenDepth = 1;
          let parenLine: Token[] = [];
          let parenConsecutiveNewlines = 0;
          let parenLastOutputWasComment = false;

          while (idx < tokens.length && parenDepth > 0) {
            const t = tokens[idx];

            if (t.type === TokenType.LPAREN) {
              parenDepth++;
              parenLine.push(t);
              parenConsecutiveNewlines = 0;
            } else if (t.type === TokenType.RPAREN) {
              parenDepth--;
              if (parenDepth === 0) {
                // Output last line if exists
                if (parenLine.length > 0) {
                  lines.push(indent() + tokensToString(parenLine));
                  parenLastOutputWasComment = false;
                }
                indentLevel--;
                // Add closing paren to currentArg so it combines with rest of expression
                // e.g., ") > 0.0" will be on one line
                currentArg.push(t);
                break;
              } else {
                parenLine.push(t);
                parenConsecutiveNewlines = 0;
              }
            } else if (t.type === TokenType.NEWLINE) {
              // Output current paren line if it has content
              if (parenLine.length > 0) {
                lines.push(indent() + tokensToString(parenLine));
                parenLine = [];
                parenLastOutputWasComment = false;
              }
              parenConsecutiveNewlines++;
            } else if (t.type === TokenType.COMMENT) {
              // Check if this is a standalone comment (has newlines before it)
              if (parenConsecutiveNewlines > 0 || parenLine.length === 0) {
                // Standalone comment - output current line first if exists
                if (parenLine.length > 0) {
                  lines.push(indent() + tokensToString(parenLine));
                  parenLine = [];
                  parenLastOutputWasComment = false;
                }
                // Add blank line only if last output was NOT a comment
                if (!parenLastOutputWasComment) {
                  const blankLines = Math.max(1, parenConsecutiveNewlines - 1);
                  for (let j = 0; j < blankLines; j++) {
                    lines.push('');
                  }
                }
                // Output the comment
                lines.push(indent() + t.value);
                parenLastOutputWasComment = true;
              } else {
                // Inline comment - add to current line
                parenLine.push(t);
              }
              parenConsecutiveNewlines = 0;
            } else {
              // Regular token - output blank lines if needed
              if (parenConsecutiveNewlines > 1) {
                // Output current line first if exists
                if (parenLine.length > 0) {
                  lines.push(indent() + tokensToString(parenLine));
                  parenLine = [];
                  parenLastOutputWasComment = false;
                }
                // Add blank lines
                const blankLines = parenConsecutiveNewlines - 1;
                for (let j = 0; j < blankLines; j++) {
                  lines.push('');
                }
              }
              parenLine.push(t);
              parenConsecutiveNewlines = 0;
              parenLastOutputWasComment = false;
            }
            idx++;
          }

          // Decrease depth back to 1 since we handled both opening and closing paren
          depth--;
          consecutiveNewlines = 0;
          // idx points to RPAREN, move past it and skip the loop's increment
          idx++;
          skipIncrement = true;
          continue;
        }

        currentArg.push(tok);
        consecutiveNewlines = 0;
      } else if (tok.type === TokenType.COMMA && depth === 1) {
        // Argument separator at top level
        if (currentArg.length > 0) {
          let line = indent() + tokensToString(currentArg) + ',';

          // Check if next token is a comment (inline comment after comma)
          let nextIdx = idx + 1;
          if (nextIdx < tokens.length && tokens[nextIdx].type === TokenType.COMMENT) {
            // Append inline comment
            line += ' ' + tokens[nextIdx].value;
            idx = nextIdx; // Skip the comment token in next iteration
          }

          lines.push(line);
          lastOutputWasComment = false;
        }
        currentArg = [];
        consecutiveNewlines = 0;
      } else if (tok.type === TokenType.COMMENT) {
        // Comment inside function - check if it's inline or standalone
        // If there were newlines before, it's standalone
        if (consecutiveNewlines > 0 || currentArg.length === 0) {
          // Standalone comment: output current arg first if exists
          if (currentArg.length > 0) {
            lines.push(indent() + tokensToString(currentArg));
            currentArg = [];
            lastOutputWasComment = false;
          }
          // Add blank line only if last output was NOT a comment
          if (!lastOutputWasComment) {
            const blankLines = Math.max(1, consecutiveNewlines - 1);
            for (let j = 0; j < blankLines; j++) {
              lines.push('');
            }
          }
          lines.push(indent() + tok.value);
          lastOutputWasComment = true;
        } else {
          // Inline comment: append to current argument
          currentArg.push(tok);
        }
        consecutiveNewlines = 0;
      } else if (isFunctionCall(idx)) {
        // Nested function call - check if it needs expansion
        const nestedNextIdx = idx + 1;
        const { length: nestedLength, hasNewlines: nestedHasNewlines } = measureToClosingParen(nestedNextIdx);

        // Only expand if it's long or is multiline
        if (nestedLength > opts.maxLineLength || nestedHasNewlines) {
          // Nested function needs expansion
          if (currentArg.length > 0) {
            lines.push(indent() + tokensToString(currentArg));
            currentArg = [];
            lastOutputWasComment = false;
          }
          idx = formatFunctionMultiline(idx);
          lastOutputWasComment = false;

          // Check if there's a comma after the nested function
          if (idx < tokens.length && tokens[idx].type === TokenType.COMMA && depth === 1) {
            // Add comma to the last line
            if (lines.length > 0) {
              lines[lines.length - 1] += ',';
            }
            idx++; // Skip the comma
          }
          continue;
        } else {
          // Nested function doesn't need expansion - treat it as part of current argument
          currentArg.push(tok);
        }
      } else if (tok.type === TokenType.NEWLINE) {
        consecutiveNewlines++;
      } else {
        currentArg.push(tok);
        consecutiveNewlines = 0;
      }

      if (!skipIncrement) {
        idx++;
      }
    }

    return idx;
  };

  // Main processing loop
  while (i < tokens.length) {
    const token = tokens[i];

    // Track consecutive newlines for blank line preservation
    if (token.type === TokenType.NEWLINE) {
      let newlineCount = 0;
      while (i < tokens.length && tokens[i].type === TokenType.NEWLINE) {
        newlineCount++;
        i++;
      }
      // Multiple newlines mean blank lines (newlineCount - 1 blank lines)
      if (newlineCount > 1) {
        pendingBlankLines += newlineCount - 1;
      }
      continue;
    }

    // Handle function calls
    if (isFunctionCall(i)) {
      const nextIdx = i + 1;
      const { length, hasNewlines } = measureToClosingParen(nextIdx);

      // Expand if long or was already multiline
      if (length > opts.maxLineLength || hasNewlines) {
        i = formatFunctionMultiline(i);
        // After multiline function, the last processed token is RPAREN
        if (i > 0) lastProcessedToken = tokens[i - 1];
        continue;
      }
      // If we don't expand, fall through to normal line processing
    }

    // Handle opening paren - check if we should expand
    if (token.type === TokenType.LPAREN) {
      // Skip expansion if we just processed || or opening paren
      // Rationale: || ( already started a new context, inner content should use line collection
      const skipExpansion = lastProcessedToken &&
                           (lastProcessedToken.type === TokenType.LPAREN ||
                            isOperator(lastProcessedToken, OPERATORS.OR));

      if (skipExpansion) {
        // Fall through to line collection
      } else {
        // Measure from the opening paren to check if expansion is needed
        const { length, hasImmediateNesting, hasNewlines } = measureToClosingParen(i);

        // Look ahead to see if there's a function call inside
        let nextIdx = i + 1;
        while (nextIdx < tokens.length && tokens[nextIdx].type === TokenType.NEWLINE) {
          nextIdx++;
        }
        const hasFunctionInside = isFunctionCall(nextIdx);

        // Expand if: long or was multiline
        if (length > opts.maxLineLength || hasNewlines) {
        // Check if previous token was an operator
        const prevIsOp = prevTokenIsOperator(i);

        // Check if this is a nested paren expression: ((...)
        // But NOT if the previous was already an opening paren or ||
        // Rationale: || ( already starts a new context, inner ( is not "nested"
        const skipNested = lastProcessedToken &&
                          (lastProcessedToken.type === TokenType.LPAREN ||
                           isOperator(lastProcessedToken, OPERATORS.OR));
        const isNested = isNestedParenExpression(i) && !skipNested;

        if (prevIsOp) {
          // Check if the operator is || - if so, don't append ( on same line
          // Rationale: || should have its operands on separate lines
          const prevOp = getPrevOperator(i);
          if (prevOp === OPERATORS.OR) {
            // Put ( on new line
            lines.push(indent() + '(');
            indentLevel++;
            lastProcessedToken = token; // LPAREN
            i++;
          } else {
            // Binary operator with paren operand: `operator (`
            lines[lines.length - 1] = lines[lines.length - 1] + ' (';
            indentLevel++;
            lastProcessedToken = token; // LPAREN
            i++;
          }

          // If nested paren expression, the inner paren should be on new line
          // This creates: `* (\n  (\n    ...\n  )\n)`
          // Rationale: nested structure should be visually separated for clarity
          if (isNested) {
            // Output the inner opening paren on a new line
            lines.push(indent() + '(');
            indentLevel++;
            lastProcessedToken = tokens[i]; // The inner LPAREN
            i++; // Move past the inner LPAREN

            // Check if there's a function call inside the inner paren
            const innerNextIdx = i;
            const innerHasFunctionInside = isFunctionCall(innerNextIdx);
            if (hasImmediateNesting && innerHasFunctionInside) {
              i = formatFunctionMultiline(innerNextIdx);
              if (i > 0) lastProcessedToken = tokens[i - 1];
            }
          } else if (hasImmediateNesting && hasFunctionInside) {
            // Expand inner function if it's a function call
            i = formatFunctionMultiline(nextIdx);
            if (i > 0) lastProcessedToken = tokens[i - 1];
          }
          continue;
        } else {
          // Non-operator context - paren on new line
          lines.push(indent() + '(');
          indentLevel++;
          lastProcessedToken = token; // LPAREN
          i++;

          // Also expand the inner function if immediate nesting
          if (hasImmediateNesting && hasFunctionInside) {
            i = formatFunctionMultiline(nextIdx);
            if (i > 0) lastProcessedToken = tokens[i - 1];
          }
          continue;
        }
        }
      }
    }

    // Handle closing paren
    if (token.type === TokenType.RPAREN) {
      // Check if this closes an expanded structure
      if (indentLevel > 0) {
        const prevLine = lines[lines.length - 1];
        if (prevLine && prevLine.trim().endsWith(')')) {
          indentLevel--;

          // Determine what should follow the closing paren based on language structure
          const { suffix, skipToIdx } = getClosingParenSuffix(i);
          const lineContent = indent() + ')' + suffix;
          lines.push(lineContent);

          // Update position and last processed token
          lastProcessedToken = tokens[skipToIdx - 1] || token;
          i = skipToIdx;
          continue;
        }
      }
    }

    // Collect current line tokens
    const lineTokens: Token[] = [];
    const lineStartIdx = i; // Remember where this line starts
    while (i < tokens.length) {
      const t = tokens[i];

      // Stop at newline
      if (t.type === TokenType.NEWLINE) {
        break;
      }

      // Include comment but stop after it
      if (t.type === TokenType.COMMENT) {
        lineTokens.push(t);
        i++;
        break;
      }

      // Check if we should break before this token based on logical expression structure
      const { token: lookAheadToken } = peekNextToken(i + 1);
      if (shouldBreakBeforeToken(t, i, lineTokens, lookAheadToken)) {
        break;
      }

      // Stop at function call if it should be expanded
      if (isFunctionCall(i)) {
        const nextIdx = i + 1;
        const { length, hasNewlines } = measureToClosingParen(nextIdx);
        if (length > opts.maxLineLength || hasNewlines) {
          break; // Stop here, will be processed on next iteration
        }
      }

      // Stop at opening paren if it should be expanded
      if (t.type === TokenType.LPAREN) {
        // Check if this is a nested paren expression after operator
        // e.g., `* ((` should break to `* (\n  (`
        // But NOT if we just processed ) || ( or || ( pattern
        const skipNested = lastProcessedToken &&
                          (lastProcessedToken.type === TokenType.LPAREN ||
                           isOperator(lastProcessedToken, OPERATORS.OR));
        if (lineTokens.length > 0 && !skipNested) {
          const lastToken = lineTokens[lineTokens.length - 1];
          if (lastToken.type === TokenType.OPERATOR && isNestedParenExpression(i)) {
            break; // Stop before this paren, will be processed as nested
          }
        }

        // Check if it contains a function that should be expanded
        let nextIdx = i + 1;
        while (nextIdx < tokens.length && tokens[nextIdx].type === TokenType.NEWLINE) {
          nextIdx++;
        }
        if (isFunctionCall(nextIdx)) {
          // Measure from the opening paren
          const { length, hasNewlines } = measureToClosingParen(i);
          if (length > opts.maxLineLength || hasNewlines) {
            break; // Stop here, will be processed on next iteration
          }
        }
      }

      lineTokens.push(t);
      i++;
    }

    // Output the line
    if (lineTokens.length > 0) {
      // Check if this is a standalone comment (comment is the only token)
      const isStandaloneComment = lineTokens.length === 1 && lineTokens[0].type === TokenType.COMMENT;

      if (isStandaloneComment) {
        // Output pending blank lines first
        for (let j = 0; j < pendingBlankLines; j++) {
          lines.push('');
        }
        pendingBlankLines = 0;

        // Standalone comment: add blank line before if needed (only if no pending blank lines were added)
        if (lines.length > 0 && lastProcessedToken &&
            lastProcessedToken.type !== TokenType.COMMENT &&
            lastProcessedToken.type !== TokenType.LPAREN) {
          // Only add if we didn't just add blank lines
          const lastLine = lines[lines.length - 1];
          if (lastLine.trim() !== '') {
            lines.push('');
          }
        }
        lines.push(indent() + lineTokens[0].value);
        lastProcessedToken = lineTokens[0];
      } else {
        // Regular line (possibly with inline comment)
        // Output pending blank lines first
        for (let j = 0; j < pendingBlankLines; j++) {
          lines.push('');
        }
        pendingBlankLines = 0;

        // Check if line starts with )
        if (lineTokens[0].type === TokenType.RPAREN) {
          indentLevel = Math.max(0, indentLevel - 1);
        }

        // Find previous non-NEWLINE token before this line
        let prevTokenIdx = lineStartIdx - 1;
        while (prevTokenIdx >= 0 && tokens[prevTokenIdx].type === TokenType.NEWLINE) {
          prevTokenIdx--;
        }
        const prevTokenBeforeLine = prevTokenIdx >= 0 ? tokens[prevTokenIdx] : null;

        const lineStr = tokensToString(lineTokens, prevTokenBeforeLine);

        /**
         * Determine if this line should start on a new line or be appended to the previous line.
         *
         * Line breaking rules:
         * 1. Lines starting with ) always start new line
         * 2. Arithmetic operators (+, -) at line start indicate multi-line expression -> new line
         * 3. Logical operator || followed by ( with newline between -> new line for (
         * 4. Other cases: if previous line ends with operator, append to it
         */
        const shouldStartNewLine = (): boolean => {
          // Rule 1: Closing paren always starts new line
          if (lineTokens[0].type === TokenType.RPAREN) {
            return true;
          }

          // Check if previous token (before this line) is an operator
          const prevIsOp = prevTokenIsOperator(lineStartIdx);
          if (!prevIsOp) {
            return true; // No operator before, start new line
          }

          // Rule 2: Arithmetic operators at line start indicate multi-line arithmetic
          if (isOperator(lineTokens[0], OPERATORS.PLUS) || isOperator(lineTokens[0], OPERATORS.MINUS)) {
            return true;
          }

          // Rule 3: || followed by ( with newline between
          if (isOperator(prevTokenBeforeLine, OPERATORS.OR) && lineTokens[0].type === TokenType.LPAREN) {
            const hasNewlineBetween = lineStartIdx > 0 && tokens[lineStartIdx - 1].type === TokenType.NEWLINE;
            return hasNewlineBetween;
          }

          // Default: append to previous line (operator continuation)
          return false;
        };

        if (shouldStartNewLine()) {
          lines.push(indent() + lineStr);
        } else {
          // Append to the last line with a space
          lines[lines.length - 1] = lines[lines.length - 1] + ' ' + lineStr;
        }

        // Check if line ends with (
        if (lineTokens[lineTokens.length - 1].type === TokenType.LPAREN) {
          indentLevel++;
        }

        // Update last processed token to the last token in this line
        lastProcessedToken = lineTokens[lineTokens.length - 1];
      }
    }
  }

  return lines.join('\n') + '\n';
}
