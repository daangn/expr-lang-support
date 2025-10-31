#!/usr/bin/env node
import * as fs from 'fs';
import { format } from './formatter';

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: expr-fmt <file>');
    console.error('');
    console.error('Options:');
    console.error('  --indent-size <n>     Number of spaces for indentation (default: 2)');
    process.exit(1);
  }

  let file: string | null = null;
  let indentSize = 2;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--indent-size') {
      indentSize = parseInt(args[++i], 10);
    } else {
      file = args[i];
    }
  }

  if (!file) {
    console.error('No file specified');
    process.exit(1);
  }

  try {
    const input = fs.readFileSync(file, 'utf-8');
    const output = format(input, { indentSize });
    console.log(output);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

main();
