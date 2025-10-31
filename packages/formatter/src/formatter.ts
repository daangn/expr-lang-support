export interface FormatOptions {
  indentSize: number;
}

const DEFAULT_OPTIONS: FormatOptions = {
  indentSize: 2,
};

export function format(input: string, options: Partial<FormatOptions> = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const lines = input.split('\n');
  const output: string[] = [];

  let indentLevel = 0;
  const indent = () => ' '.repeat(indentLevel * opts.indentSize);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty line
    if (!trimmed) {
      continue;
    }

    // Comment
    if (trimmed.startsWith('#')) {
      // Add blank line before comment if needed
      if (output.length > 0) {
        const lastLine = output[output.length - 1].trim();
        if (lastLine && !lastLine.startsWith('#')) {
          output.push('');
        }
      }
      output.push(indent() + trimmed);
      continue;
    }

    // Decrease indent if line starts with )
    if (trimmed.startsWith(')')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Add the line
    output.push(indent() + trimmed);

    // Increase indent for next line ONLY if current line ends with (
    if (trimmed.endsWith('(')) {
      indentLevel++;
    }
  }

  return output.join('\n') + '\n';
}
