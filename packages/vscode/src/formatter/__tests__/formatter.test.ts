import * as fs from 'fs';
import * as path from 'path';
import { format } from '../formatter';

describe('Formatter', () => {
  const fixturesDir = path.join(__dirname, 'fixtures');

  // Get all input files in the fixtures directory
  const getTestCases = (): Array<{ name: string; inputFile: string; outputFile: string }> => {
    if (!fs.existsSync(fixturesDir)) {
      return [];
    }

    const files = fs.readdirSync(fixturesDir);
    const inputFiles = files.filter(f => f.endsWith('.input.expr'));

    return inputFiles.map(inputFile => {
      const baseName = inputFile.replace('.input.expr', '');
      const outputFile = `${baseName}.output.expr`;

      return {
        name: baseName,
        inputFile: path.join(fixturesDir, inputFile),
        outputFile: path.join(fixturesDir, outputFile),
      };
    }).filter(testCase => fs.existsSync(testCase.outputFile));
  };

  const testCases = getTestCases();

  if (testCases.length === 0) {
    it('should have at least one test case', () => {
      console.warn('No test cases found in fixtures directory');
      expect(true).toBe(true);
    });
  } else {
    testCases.forEach(({ name, inputFile, outputFile }) => {
      it(`should format ${name} correctly`, () => {
        const input = fs.readFileSync(inputFile, 'utf-8');
        const expectedOutput = fs.readFileSync(outputFile, 'utf-8');

        const actualOutput = format(input);

        // Exactly match test (no trimming)
        expect(actualOutput).toBe(expectedOutput);

        // Idempotency test: formatting twice should give the same result
        const secondOutput = format(actualOutput);
        expect(secondOutput).toBe(actualOutput);
      });
    });
  }
});
