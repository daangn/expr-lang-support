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

  // Convert tokens to string
  const tokensToString = (toks: Token[], prevTokenBeforeLine?: Token | null): string => {
    let result = '';

    for (let i = 0; i < toks.length; i++) {
      const tok = toks[i];
      if (tok.type === TokenType.NEWLINE) continue;

      // Special handling for minus at line start
      if (tok.type === TokenType.OPERATOR && tok.value === '-' && result.length === 0) {
        const nextTok = i + 1 < toks.length ? toks[i + 1] : null;
        if (nextTok?.type === TokenType.NUMBER) {
          // Check previous token before this line to determine if it's binary or unary
          // Binary if previous was: number, identifier, ), ]
          // Unary if previous was: (, [, ,, operator, or nothing
          const isBinaryMinus = prevTokenBeforeLine && (
            prevTokenBeforeLine.type === TokenType.NUMBER ||
            prevTokenBeforeLine.type === TokenType.IDENTIFIER ||
            prevTokenBeforeLine.type === TokenType.RPAREN ||
            prevTokenBeforeLine.type === TokenType.RBRACKET
          );

          if (isBinaryMinus) {
            // Binary minus: add space after it
            result += '- ';
            continue;
          }
          // Otherwise it's unary minus, process normally
        }
      }

      // Check if previous token was an operator or minus sign
      const prevTok = i > 0 ? toks[i - 1] : null;

      // Check if this is unary minus (negative number) vs binary minus (subtraction)
      // Unary minus: after operator, lparen, comma, lbracket
      // Binary minus: after number, identifier, rparen, rbracket
      const prevIsMinus = prevTok?.type === TokenType.OPERATOR && prevTok?.value === '-';

      const isUnaryMinus = prevIsMinus && tok.type === TokenType.NUMBER &&
        (i < 2 ||
         (toks[i - 2]?.type === TokenType.OPERATOR) ||
         (toks[i - 2]?.type === TokenType.LPAREN) ||
         (toks[i - 2]?.type === TokenType.COMMA) ||
         (toks[i - 2]?.type === TokenType.LBRACKET));

      // Don't add space between unary minus and number
      const skipSpaceForUnaryMinus = isUnaryMinus;

      // Always add space after comma
      const needsSpaceAfterComma = result.length > 0 && result[result.length - 1] === ',';

      // Check if previous token was identifier/keyword (function name)
      const prevIsIdentifier = prevTok?.type === TokenType.IDENTIFIER || prevTok?.type === TokenType.KEYWORD;

      // Check if previous token is ! operator
      const prevIsNot = prevTok?.type === TokenType.OPERATOR && prevTok?.value === '!';

      // Add space before token if needed
      const needsSpace = result.length > 0 &&
          result[result.length - 1] !== '(' &&
          result[result.length - 1] !== '[' &&
          result[result.length - 1] !== ' ' &&
          !(tok.type === TokenType.LPAREN && prevIsIdentifier) &&  // No space between function name and (
          !(tok.type === TokenType.LPAREN && prevIsNot) &&  // No space between ! and (
          tok.type !== TokenType.RPAREN &&  // No space before )
          tok.type !== TokenType.RBRACKET && // No space before ]
          tok.type !== TokenType.COMMA;      // No space before ,

      // Always add space before comment if there's content before it
      const needsSpaceBeforeComment = tok.type === TokenType.COMMENT && result.length > 0;

      if ((needsSpace || needsSpaceBeforeComment || needsSpaceAfterComma) && !skipSpaceForUnaryMinus) {
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

          // Check if there's an inline comment immediately after the closing paren (no newline in between)
          let closingLine = indent() + ')';
          let nextIdx = idx + 1;
          // Only attach comment if it's the immediate next token (not after newline)
          if (nextIdx < tokens.length && tokens[nextIdx].type === TokenType.COMMENT) {
            // Append inline comment to closing paren
            closingLine += ' ' + tokens[nextIdx].value;
            lines.push(closingLine);
            lastOutputWasComment = false;
            return nextIdx + 1; // Skip past the comment
          }

          lines.push(closingLine);
          lastOutputWasComment = false;
          return idx + 1;
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

        if (prevIsOp) {
          // Append ( to the last line with a space
          lines[lines.length - 1] = lines[lines.length - 1] + ' (';
        } else {
          // Expand the paren on a new line
          lines.push(indent() + '(');
        }
        indentLevel++;
        lastProcessedToken = token; // LPAREN
        i++;

        // Also expand the inner function if immediate nesting
        if (hasImmediateNesting && hasFunctionInside) {
          i = formatFunctionMultiline(nextIdx);
          // After multiline function, the last processed token is RPAREN
          if (i > 0) lastProcessedToken = tokens[i - 1];
        }
        continue;
      }
    }

    // Handle closing paren
    if (token.type === TokenType.RPAREN) {
      // Check if this closes an expanded structure
      if (indentLevel > 0) {
        const prevLine = lines[lines.length - 1];
        if (prevLine && prevLine.trim().endsWith(')')) {
          indentLevel--;

          // Check if next token is || ( pattern - if so, include on same line
          let nextIdx = i + 1;
          while (nextIdx < tokens.length && tokens[nextIdx].type === TokenType.NEWLINE) {
            nextIdx++;
          }
          const nextToken = nextIdx < tokens.length ? tokens[nextIdx] : null;

          if (nextToken?.type === TokenType.OPERATOR && nextToken.value === '||') {
            // Look further to see if ( follows ||
            let next2Idx = nextIdx + 1;
            while (next2Idx < tokens.length && tokens[next2Idx].type === TokenType.NEWLINE) {
              next2Idx++;
            }
            const next2Token = next2Idx < tokens.length ? tokens[next2Idx] : null;

            if (next2Token?.type === TokenType.LPAREN) {
              // Output ) || ( on same line
              lines.push(indent() + ') || (');
              lastProcessedToken = next2Token;
              i = next2Idx + 1;
              indentLevel++;
              continue;
            }
          }

          lines.push(indent() + ')');
          lastProcessedToken = token; // RPAREN
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

      // Stop before ( if previous is && and next token after ( is also (
      // This creates the pattern: &&\n( when we have &&((
      if (t.type === TokenType.LPAREN && lineTokens.length > 0) {
        const lastToken = lineTokens[lineTokens.length - 1];
        if (lastToken.type === TokenType.OPERATOR && lastToken.value === '&&') {
          // Look ahead to see if next token is also (
          let nextIdx = i + 1;
          while (nextIdx < tokens.length && tokens[nextIdx].type === TokenType.NEWLINE) {
            nextIdx++;
          }
          const nextToken = nextIdx < tokens.length ? tokens[nextIdx] : null;
          if (nextToken?.type === TokenType.LPAREN) {
            // We have &&(( pattern - break before this (
            break;
          }
        }
      }

      // Stop before || operator if previous token is ) AND next token is not (
      // This creates the pattern: )\n|| but keeps ) || ( on same line
      if (t.type === TokenType.OPERATOR && t.value === '||' && lineTokens.length > 0) {
        const lastToken = lineTokens[lineTokens.length - 1];
        // Look ahead to see what comes after ||
        let nextIdx = i + 1;
        while (nextIdx < tokens.length && tokens[nextIdx].type === TokenType.NEWLINE) {
          nextIdx++;
        }
        const nextToken = nextIdx < tokens.length ? tokens[nextIdx] : null;

        // Break only if previous is ) and next is NOT (
        if (lastToken.type === TokenType.RPAREN && nextToken?.type !== TokenType.LPAREN) {
          break;
        }
      }

      // Stop at function call if it should be expanded
      if (isFunctionCall(i)) {
        const nextIdx = i + 1;
        const { length, hasNewlines } = measureToClosingParen(nextIdx);
        if (length > opts.maxLineLength || hasNewlines) {
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

        // Update last processed token to the last token in this line
        lastProcessedToken = lineTokens[lineTokens.length - 1];
      }
    }
  }

  return lines.join('\n') + '\n';
}
