import test from 'ava';
import * as JSON5 from './parser';
import { internalGetStateRoot, internalGetRoot } from './helpers/util';

test('parse() - errors - empty documents', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(
    () => {
      parser.parseComplete('');
    },
    {
      instanceOf: SyntaxError,
      message: /^JSON5: invalid end of input/,
    },
  ) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 1);
});

test('parse() - errors - comment', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(
    () => {
      parser.parse('/');
    },
    {
      instanceOf: SyntaxError,
      message: /^JSON5: invalid character '\/'/,
    },
  ) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 1);
});

test('parse() - errors - invalid characters in values', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(
    () => {
      parser.parse('a');
    },
    {
      instanceOf: SyntaxError,
      message: /^JSON5: invalid character 'a'/,
    },
  ) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 1);
});

test('parse() - errors - invalid property name', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(
    () => {
      parser.parse('{\\a:1}');
    },
    {
      instanceOf: SyntaxError,
      message: /^JSON5: invalid character '\\\\'/,
    },
  ) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 2);
});

test('parse() - errors - escaped property names', (t) => {
  const parser = new JSON5.StreamingParser();
  t.throws(() => parser.parseComplete('{\\u0061\\u0062:1,\\u0024\\u005F:2,\\u005F\\u0024:3}'));
});


test('parse() - errors - invalid identifier start characters', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(
    () => {
      parser.parse('{\\u0021:1}');
    },
    {
      instanceOf: SyntaxError,
      message: /^JSON5: invalid character '\\\\'/,
    },
  ) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 2);
});

test('parse() - errors - invalid characters following a sign', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(
    () => {
      parser.parse('-a');
    },
    {
      instanceOf: SyntaxError,
      message: /^JSON5: invalid character 'a'/,
    },
  ) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 2);
});

test('parse() - errors - invalid characters following an exponent indicator', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(
    () => {
      parser.parse('1ea');
    },
    {
      instanceOf: SyntaxError,
      message: /^JSON5: invalid character 'a'/,
    },
  ) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 3);
});

test('parse() - errors - invalid characters following an exponent sign', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(
    () => {
      parser.parse('1e-a');
    },
    {
      instanceOf: SyntaxError,
      message: /^JSON5: invalid character 'a'/,
    },
  ) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 4);
});

test('parse() - errors - invalid new lines in strings', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(
    () => {
      parser.parse('"\n"');
    },
    {
      instanceOf: SyntaxError,
      message: /^JSON5: invalid character '\\n'/,
    },
  ) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 2);
  t.is(err.columnNumber, 0);
});

test('parse() - errors - invalid identifier start characters in property names', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(
    () => {
      parser.parse('{!:1}');
    },
    {
      instanceOf: SyntaxError,
      message: /^JSON5: invalid character '!'/,
    },
  ) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 2);
});

test('parse() - errors - invalid characters following an array value', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(
    () => {
      parser.parse('[1!]');
    },
    {
      instanceOf: SyntaxError,
      message: /^JSON5: invalid character '!'/,
    },
  ) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 3);
});

test('parse() - errors - invalid characters in literals', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(
    () => {
      parser.parse('tru!');
    },
    {
      instanceOf: SyntaxError,
      message: /^JSON5: invalid character '!'/,
    },
  ) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 4);
});

test('parse() - errors - unterminated escapes', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(
    () => {
      parser.parseComplete('"\\');
    },
    {
      instanceOf: SyntaxError,
      message: /^JSON5: invalid end of input/,
    },
  ) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 3);
});

test('parse() - errors - invalid first digits in hexadecimal escapes', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(
    () => {
      parser.parse('"\\xg"');
    },
    {
      instanceOf: SyntaxError,
      message: /^JSON5: invalid character 'x'/,
    },
  ) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 3);
});

test('parse() - errors - invalid second digits in hexadecimal escapes', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(
    () => {
      parser.parse('"\\x0g"');
    },
    {
      instanceOf: SyntaxError,
      message: /^JSON5: invalid character 'x'/,
    },
  ) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 3);
});

test('parse() - errors - invalid unicode escapes', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(
    () => {
      parser.parse('"\\u000g"');
    },
    {
      instanceOf: SyntaxError,
      message: /^JSON5: invalid character 'g'/,
    },
  ) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 7);
});

for (let i = 1; i <= 9; i++) {
  test(`parse() - errors - escaped digit ${i}`, (t) => {
    const parser = new JSON5.StreamingParser();

    const err = t.throws(
      () => {
        parser.parse(`"\\${i}"`);
      },
      {
        instanceOf: SyntaxError,
        message: new RegExp(`^JSON5: invalid character '${i}'`),
      },
    ) as JSON5.ExtendedSyntaxError;
    t.is(err.lineNumber, 1);
    t.is(err.columnNumber, 3);
  });
}

test('parse() - errors - octal escapes', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(
    () => {
      parser.parse(`"\\01"`);
    },
    {
      instanceOf: SyntaxError,
      message: /^JSON5: invalid character '0'/,
    },
  ) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 3);
});

test('parse() - errors - multiple values', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(
    () => {
      parser.parse('1 2');
    },
    {
      instanceOf: SyntaxError,
      message: /^JSON5: invalid character '2'/,
    },
  ) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 3);
});

test('parse() - errors - control characters escaped in the message', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(
    () => {
      parser.parse('\x01');
    },
    {
      instanceOf: SyntaxError,
      message: /^JSON5: invalid character '\\x01'/,
    },
  ) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 1);
});

test('parse() - unclosed objects before property names', (t) => {
  const parser = new JSON5.StreamingParser();

  t.deepEqual(parser.parse('{'), {});
});

test('parse() - unclosed objects after property names', (t) => {
  const parser = new JSON5.StreamingParser();

  t.deepEqual(parser.parse('{"a"'), {});
});

test('parse() - errors - unclosed objects before property values', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(
    () => {
      parser.parse('{a:');
    },
    {
      instanceOf: SyntaxError,
      message: /^JSON5: invalid character 'a'/,
    },
  ) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 2);
});

test('parse() - errors - unclosed objects after property values', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(
    () => {
      parser.parse('{a:1');
    },
    {
      instanceOf: SyntaxError,
      message: /^JSON5: invalid character 'a'/,
    },
  ) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 2);
});

test('parse() - unclosed arrays before values', (t) => {
  const parser = new JSON5.StreamingParser();

  t.deepEqual(parser.parse('['), []);
});

test('parse() - errors - unclosed arrays after values', (t) => {
  const parser = new JSON5.StreamingParser();

  t.deepEqual(parser.parse('['), []);
});

test('parse() - error - number with 0', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(() => parser.parse('0x'), {
    instanceOf: SyntaxError,
    message: /^JSON5: invalid character 'x'/,
  }) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 2);
});

test('parse() - error - NaN', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(() => parser.parse('NaN'), {
    instanceOf: SyntaxError,
    message: /^JSON5: invalid character 'N'/,
  }) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 1);
});

test('parse() - Infinity', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(() => parser.parse('[Infinity,-Infinity]'), {
    instanceOf: SyntaxError,
    message: /^JSON5: invalid character 'I'/,
  }) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 2);
});

test('parse() - error - leading decimal points', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(() => parser.parse('[.1,.23]'), {
    instanceOf: SyntaxError,
    message: /^JSON5: invalid character '.'/,
  }) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 2);
});

test('parse() - error - trailing decimal points', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(() => parser.parse('[0.]'), {
    instanceOf: SyntaxError,
    message: /^JSON5: invalid character ']'/,
  }) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 4);
});

test('parse() - leading + in a number', (t) => {
  const parser = new JSON5.StreamingParser();

  const err = t.throws(() => parser.parse('+1.23e100'), {
    instanceOf: SyntaxError,
    message: /^JSON5: invalid character '\+'/,
  }) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 1);
});

test('parse() - error - incorrectly completed partial string', (t) => {
  const parser = new JSON5.StreamingParser();
  t.deepEqual(parser.parse('"abc'), 'abc');
  t.deepEqual(internalGetStateRoot(parser), 'partial');
  t.deepEqual(internalGetRoot(parser), 'abc');

  const err = t.throws(
    () => {
      parser.parse('"{}');
    },
    {
      instanceOf: SyntaxError,
      message: /^JSON5: invalid character '\{'/,
    },
  ) as JSON5.ExtendedSyntaxError;
  t.is(err.lineNumber, 1);
  t.is(err.columnNumber, 6);
});

for (const suffix of ['null', '"', '1', 'true', '{}', '[]']) {
  test(`parse() - error - incorrectly completed partial string with suffix ${JSON.stringify(
    suffix,
  )}`, (t) => {
    const parser = new JSON5.StreamingParser();
    t.deepEqual(parser.parse('"abc'), 'abc');
    t.deepEqual(internalGetStateRoot(parser), 'partial');
    t.deepEqual(internalGetRoot(parser), 'abc');

    let errorChar = suffix[0];
    if (errorChar === '"') {
      errorChar = '\\"';
    }

    const err = t.throws(
      () => {
        parser.parse(`"${suffix}`);
      },
      {
        instanceOf: SyntaxError,
        message: `JSON5: invalid character '${errorChar}' at 1:6`,
      },
    ) as JSON5.ExtendedSyntaxError;
    t.is(err.lineNumber, 1);
    t.is(err.columnNumber, 6);
  });
}
