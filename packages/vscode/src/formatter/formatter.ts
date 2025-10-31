import { tokenize, TokenType, Token } from './lexer';

export interface FormatOptions {
  indentSize: number;
  maxLineLength: number;
}

const DEFAULT_OPTIONS: FormatOptions = {
  indentSize: 2,
  maxLineLength: 120,
};

export function format(input: string, options: Partial<FormatOptions> = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const tokens = tokenize(input).filter(t => t.type !== TokenType.EOF);


  const lines: string[] = [];
  let indentLevel = 0;
  let i = 0;

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

  // Convert tokens to string
  const tokensToString = (toks: Token[]): string => {
    let result = '';
    for (let i = 0; i < toks.length; i++) {
      const tok = toks[i];
      if (tok.type === TokenType.NEWLINE) continue;

      // Check if previous token was an operator
      const prevTok = i > 0 ? toks[i - 1] : null;
      const prevIsOperator = prevTok?.type === TokenType.OPERATOR;

      // Add space before token if needed
      const needsSpace = result.length > 0 &&
          result[result.length - 1] !== '(' &&
          result[result.length - 1] !== '[' &&
          result[result.length - 1] !== ' ' &&
          (tok.type !== TokenType.LPAREN || prevIsOperator) &&  // Space before ( if after operator
          tok.type !== TokenType.RPAREN &&  // No space before )
          tok.type !== TokenType.RBRACKET && // No space before ]
          tok.type !== TokenType.COMMA;      // No space before ,
      // Note: We DO want space before [, so LBRACKET is not in the exclusion list

      if (needsSpace) {
        result += ' ';
      }

      result += tok.value;
    }
    return result;
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
    // Check if immediately followed by another LPAREN or a function call
    return nextToken.type === TokenType.LPAREN || isFunctionCall(nextIdx);
  };

  // Measure content length until closing paren
  const measureToClosingParen = (startIdx: number): { length: number; hasImmediateNesting: boolean; endIdx: number } => {
    let depth = 0;
    let j = startIdx;
    const collectedTokens: Token[] = [];
    const immediateNesting = hasImmediateNesting(startIdx);

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
          return { length, hasImmediateNesting: immediateNesting, endIdx: j };
        }
      }
      if (t.type !== TokenType.NEWLINE) {
        collectedTokens.push(t);
      }
    }

    const length = tokensToString(collectedTokens).length;
    return { length, hasImmediateNesting: immediateNesting, endIdx: j };
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

    while (idx < tokens.length && depth > 0) {
      const tok = tokens[idx];

      if (tok.type === TokenType.RPAREN) {
        depth--;
        if (depth === 0) {
          // End of function - output last argument
          if (currentArg.length > 0) {
            lines.push(indent() + tokensToString(currentArg));
          }
          indentLevel--;
          lines.push(indent() + ')');
          return idx + 1;
        } else {
          currentArg.push(tok);
        }
      } else if (tok.type === TokenType.LPAREN) {
        depth++;
        currentArg.push(tok);
      } else if (tok.type === TokenType.COMMA && depth === 1) {
        // Argument separator at top level
        if (currentArg.length > 0) {
          lines.push(indent() + tokensToString(currentArg) + ',');
        }
        currentArg = [];
      } else if (tok.type === TokenType.COMMENT) {
        // Comment inside function
        if (currentArg.length > 0) {
          lines.push(indent() + tokensToString(currentArg));
          currentArg = [];
        }
        lines.push(indent() + tok.value);
      } else if (isFunctionCall(idx)) {
        // Nested function call - check if it needs expansion
        const nestedNextIdx = idx + 1;
        const { length: nestedLength, hasImmediateNesting: nestedHasImmediate } = measureToClosingParen(nestedNextIdx);

        if (nestedLength > opts.maxLineLength || nestedHasImmediate) {
          // Nested function needs expansion
          if (currentArg.length > 0) {
            lines.push(indent() + tokensToString(currentArg));
            currentArg = [];
          }
          idx = formatFunctionMultiline(idx);

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
      } else if (tok.type !== TokenType.NEWLINE) {
        currentArg.push(tok);
      }

      idx++;
    }

    return idx;
  };

  // Main processing loop
  while (i < tokens.length) {
    const token = tokens[i];

    // Skip newlines
    if (token.type === TokenType.NEWLINE) {
      i++;
      continue;
    }

    // Handle comments
    if (token.type === TokenType.COMMENT) {
      // Add blank line before comment if needed
      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1].trim();
        if (lastLine && !lastLine.startsWith('#')) {
          lines.push('');
        }
      }
      lines.push(indent() + token.value);
      i++;
      continue;
    }

    // Handle function calls
    if (isFunctionCall(i)) {
      const nextIdx = i + 1;
      const { length, hasImmediateNesting } = measureToClosingParen(nextIdx);

      // Expand if long or has immediate nesting
      if (length > opts.maxLineLength || hasImmediateNesting) {
        i = formatFunctionMultiline(i);
        continue;
      }
      // If we don't expand, fall through to normal line processing
    }

    // Handle opening paren - check if we should expand
    if (token.type === TokenType.LPAREN) {
      // Look ahead to see if there's a function call inside
      let nextIdx = i + 1;
      while (nextIdx < tokens.length && tokens[nextIdx].type === TokenType.NEWLINE) {
        nextIdx++;
      }

      if (isFunctionCall(nextIdx)) {
        // Measure from the opening paren to include immediate nesting check
        const { length, hasImmediateNesting } = measureToClosingParen(i);

        if (length > opts.maxLineLength || hasImmediateNesting) {
          // Check if previous token was an operator
          const prevIsOp = prevTokenIsOperator(i);

          if (prevIsOp) {
            // Append ( to the last line with a space
            lines[lines.length - 1] = lines[lines.length - 1] + ' (';
          } else {
            // Expand the paren on a new line
            lines.push(indent() + '(');
          }
          indentLevel++;
          i++;

          // Also expand the inner function if immediate nesting
          if (hasImmediateNesting && isFunctionCall(nextIdx)) {
            i = formatFunctionMultiline(nextIdx);
          }
          continue;
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
          lines.push(indent() + ')');
          i++;
          continue;
        }
      }
    }

    // Collect current line tokens
    const lineTokens: Token[] = [];
    const lineStartIdx = i; // Remember where this line starts
    while (i < tokens.length) {
      const t = tokens[i];

      // Stop at newline or comment
      if (t.type === TokenType.NEWLINE) {
        break;
      }
      if (t.type === TokenType.COMMENT) {
        break;
      }

      // Stop at function call if it should be expanded
      if (isFunctionCall(i)) {
        const nextIdx = i + 1;
        const { length, hasImmediateNesting } = measureToClosingParen(nextIdx);
        if (length > opts.maxLineLength || hasImmediateNesting) {
          break; // Stop here, will be processed on next iteration
        }
      }

      // Stop at opening paren if it contains a function that should be expanded
      if (t.type === TokenType.LPAREN) {
        let nextIdx = i + 1;
        while (nextIdx < tokens.length && tokens[nextIdx].type === TokenType.NEWLINE) {
          nextIdx++;
        }
        if (isFunctionCall(nextIdx)) {
          // Measure from the opening paren to include immediate nesting check
          const { length, hasImmediateNesting } = measureToClosingParen(i);
          if (length > opts.maxLineLength || hasImmediateNesting) {
            break; // Stop here, will be processed on next iteration
          }
        }
      }

      lineTokens.push(t);
      i++;
    }

    // Output the line
    if (lineTokens.length > 0) {
      // Check if line starts with )
      if (lineTokens[0].type === TokenType.RPAREN) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      const lineStr = tokensToString(lineTokens);

      // Check if previous token (before this line) is an operator
      const prevIsOp = prevTokenIsOperator(lineStartIdx);

      if (prevIsOp && lineTokens[0].type !== TokenType.RPAREN) {
        // Append to the last line with a space
        lines[lines.length - 1] = lines[lines.length - 1] + ' ' + lineStr;
      } else {
        // Output on a new line
        lines.push(indent() + lineStr);
      }

      // Check if line ends with (
      if (lineTokens[lineTokens.length - 1].type === TokenType.LPAREN) {
        indentLevel++;
      }
    }
  }

  return lines.join('\n') + '\n';
}
