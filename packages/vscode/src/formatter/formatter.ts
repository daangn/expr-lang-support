import { tokenize, TokenType, Token } from './lexer';

export interface FormatOptions {
  indentSize: number;
  maxLineLength: number;
}

const DEFAULT_OPTIONS: FormatOptions = {
  indentSize: 2,
  maxLineLength: 80,
};

export function format(input: string, options: Partial<FormatOptions> = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const tokens = tokenize(input).filter(t => t.type !== TokenType.EOF);

  const lines: string[] = [];
  let indentLevel = 0;
  let i = 0;

  const indent = () => ' '.repeat(indentLevel * opts.indentSize);

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

  // Measure content length until closing paren
  const measureToClosingParen = (startIdx: number): { length: number; hasNestedIF: boolean; endIdx: number } => {
    let depth = 0;
    let hasNestedIF = false;
    let j = startIdx;
    const collectedTokens: Token[] = [];

    for (; j < tokens.length; j++) {
      const t = tokens[j];
      if (t.type === TokenType.LPAREN) depth++;
      if (t.type === TokenType.RPAREN) {
        depth--;
        if (depth === 0) {
          // Found matching closing paren - include it and return
          collectedTokens.push(t);
          const length = tokensToString(collectedTokens).length;
          return { length, hasNestedIF, endIdx: j };
        }
      }
      if (t.type === TokenType.KEYWORD && t.value === 'IF' && j > startIdx) {
        hasNestedIF = true;
      }
      if (t.type !== TokenType.NEWLINE) {
        collectedTokens.push(t);
      }
    }

    const length = tokensToString(collectedTokens).length;
    return { length, hasNestedIF, endIdx: j };
  };

  // Format IF expression on multiple lines
  const formatIFMultiline = (startIdx: number): number => {
    let idx = startIdx;

    // Output "IF("
    lines.push(indent() + 'IF(');
    idx++; // Skip IF

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
          // End of IF - output last argument
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
        // Comment inside IF
        if (currentArg.length > 0) {
          lines.push(indent() + tokensToString(currentArg));
          currentArg = [];
        }
        lines.push(indent() + tok.value);
      } else if (tok.type === TokenType.KEYWORD && tok.value === 'IF') {
        // Nested IF - check if it needs expansion
        const nestedNextIdx = idx + 1;
        if (tokens[nestedNextIdx]?.type === TokenType.LPAREN) {
          const { length: nestedLength, hasNestedIF: nestedHasNested } = measureToClosingParen(nestedNextIdx);

          if (nestedLength > opts.maxLineLength || nestedHasNested) {
            // Nested IF needs expansion
            if (currentArg.length > 0) {
              lines.push(indent() + tokensToString(currentArg));
              currentArg = [];
            }
            idx = formatIFMultiline(idx);

            // Check if there's a comma after the nested IF
            if (idx < tokens.length && tokens[idx].type === TokenType.COMMA && depth === 1) {
              // Add comma to the last line
              if (lines.length > 0) {
                lines[lines.length - 1] += ',';
              }
              idx++; // Skip the comma
            }
            continue;
          } else {
            // Nested IF doesn't need expansion - treat it as part of current argument
            currentArg.push(tok);
          }
        } else {
          // No paren after IF - just add to current arg
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

    // Handle IF keyword
    if (token.type === TokenType.KEYWORD && token.value === 'IF') {
      const nextIdx = i + 1;
      if (tokens[nextIdx]?.type === TokenType.LPAREN) {
        const { length, hasNestedIF } = measureToClosingParen(nextIdx);

        // Expand if long or has nested IF
        if (length > opts.maxLineLength || hasNestedIF) {
          i = formatIFMultiline(i);
          continue;
        }
      }
      // If we don't expand, fall through to normal line processing
    }

    // Handle opening paren - check if we should expand
    if (token.type === TokenType.LPAREN) {
      // Look ahead to see if there's IF inside
      let nextIdx = i + 1;
      while (nextIdx < tokens.length && tokens[nextIdx].type === TokenType.NEWLINE) {
        nextIdx++;
      }

      if (tokens[nextIdx]?.type === TokenType.KEYWORD && tokens[nextIdx].value === 'IF') {
        const { length, hasNestedIF } = measureToClosingParen(nextIdx + 1);

        if (length > opts.maxLineLength || hasNestedIF) {
          // Check if last line ends with an operator
          const lastLine = lines.length > 0 ? lines[lines.length - 1].trim() : '';
          const endsWithOperator = lastLine.length > 0 && /[+\-*\/%&|<>=!]$/.test(lastLine);

          if (endsWithOperator) {
            // Append ( to the last line with a space
            lines[lines.length - 1] = lines[lines.length - 1] + ' (';
          } else {
            // Expand the paren on a new line
            lines.push(indent() + '(');
          }
          indentLevel++;
          i++;
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
    while (i < tokens.length) {
      const t = tokens[i];

      // Stop at newline or comment
      if (t.type === TokenType.NEWLINE) {
        break;
      }
      if (t.type === TokenType.COMMENT) {
        break;
      }

      // Stop at IF if it should be expanded
      if (t.type === TokenType.KEYWORD && t.value === 'IF') {
        const nextIdx = i + 1;
        if (tokens[nextIdx]?.type === TokenType.LPAREN) {
          const { length, hasNestedIF } = measureToClosingParen(nextIdx);
          if (length > opts.maxLineLength || hasNestedIF) {
            break; // Stop here, will be processed on next iteration
          }
        }
      }

      // Stop at opening paren if it contains an IF that should be expanded
      if (t.type === TokenType.LPAREN) {
        let nextIdx = i + 1;
        while (nextIdx < tokens.length && tokens[nextIdx].type === TokenType.NEWLINE) {
          nextIdx++;
        }
        if (tokens[nextIdx]?.type === TokenType.KEYWORD && tokens[nextIdx].value === 'IF') {
          const { length, hasNestedIF } = measureToClosingParen(nextIdx + 1);
          if (length > opts.maxLineLength || hasNestedIF) {
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
      lines.push(indent() + lineStr);

      // Check if line ends with (
      if (lineTokens[lineTokens.length - 1].type === TokenType.LPAREN) {
        indentLevel++;
      }
    }
  }

  return lines.join('\n') + '\n';
}
