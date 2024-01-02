/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable n/file-extension-in-import */
/* eslint-disable ava/no-ignored-test-files */
import test from 'ava';
import { testProp } from '@fast-check/ava';
import { StreamingParser, ExtendedSyntaxError } from './parser';
import { multipleJsonObjects, partialJsonString, partitionedJson } from './helpers/arbitrary';
import { complete, partial } from './helpers/partials';
import { internalGetStateRoot, internalGetRoot } from './helpers/util';

if (process.env.NODE_PROFILE) {
  test.before(() => {
    console.profile();
  });

  test.after(() => {
    console.profileEnd();
  });
}

test('parse() - empty objects', (t) => {
  const parser = new StreamingParser();
  t.deepEqual(parser.parse('{}'), {}, 'parses empty objects');
});

test('parse() - double string property names', (t) => {
  const parser = new StreamingParser();
  t.deepEqual(parser.parseComplete('{"a":1}'), { a: 1 }, 'parses double string property names');
});

test('parse() - preserves __proto__ property names', (t) => {
  const parser = new StreamingParser();
  t.deepEqual(
    // eslint-disable-next-line no-proto
    parser.parseComplete('{"__proto__":1}').__proto__,
    1,
    'preserves __proto__ property names',
  );
});

test('parse() - multiple properties', (t) => {
  const parser = new StreamingParser();
  t.deepEqual(
    parser.parseComplete('{"abc":1,"def":2}'),
    { abc: 1, def: 2 },
    'parses multiple properties',
  );
});

test('parse() - nested objects', (t) => {
  const parser = new StreamingParser();
  t.deepEqual(parser.parseComplete('{"a":{"b":2}}'), { a: { b: 2 } }, 'parses nested objects');
});

test('parse() - empty arrays', (t) => {
  const parser = new StreamingParser();
  t.deepEqual(parser.parseComplete('[]'), [], 'parses empty arrays');
});

test('parse() - array values', (t) => {
  const parser = new StreamingParser();
  t.deepEqual(parser.parseComplete('[1]'), [1], 'parses array values');
});

test('parse() - multiple array values', (t) => {
  const parser = new StreamingParser();
  t.deepEqual(parser.parseComplete('[1,2]'), [1, 2], 'parses multiple array values');
});

test('parse() - nested arrays', (t) => {
  const parser = new StreamingParser();
  t.deepEqual(parser.parseComplete('[1,[2,3]]'), [1, [2, 3]], 'parses nested arrays');
});

test('parse() - nulls', (t) => {
  const parser = new StreamingParser();
  t.is(parser.parseComplete('null'), null, 'parses nulls');
});

test('parse() - true', (t) => {
  const parser = new StreamingParser();
  t.is(parser.parseComplete('true'), true, 'parses true');
});

test('parse() - false', (t) => {
  const parser = new StreamingParser();
  t.is(parser.parseComplete('false'), false, 'parses false');
});

test('parse() - negative zero', (t) => {
  const parser = new StreamingParser();
  t.deepEqual(parser.parseComplete('[-0]'), [-0], 'parses false');
});

test('parse() - integers', (t) => {
  const parser = new StreamingParser();
  t.deepEqual(parser.parseComplete('[1,23,456,7890]'), [1, 23, 456, 7890], 'parses integers');
});

test('parse() - signed numbers', (t) => {
  const parser = new StreamingParser();
  t.deepEqual(parser.parseComplete('[-1,-2,-0.1,-0]'), [-1, -2, -0.1, -0], 'parses signed numbers');
});

test('parse() - fractional numbers', (t) => {
  const parser = new StreamingParser();
  t.deepEqual(parser.parseComplete('[1.0,1.23]'), [1, 1.23], 'parses fractional numbers');
});

test('parse() - exponents', (t) => {
  const parser = new StreamingParser();
  t.deepEqual(
    parser.parseComplete('[1e0,1e1,1e01,1.e0,1.1e0,1e-1,1e+1]'),
    [1, 10, 10, 1, 1.1, 0.1, 10],
    'parses exponents',
  );
});

test('parse() - 1', (t) => {
  const parser = new StreamingParser();
  t.is(parser.parseComplete('1'), 1, 'parses 1');
});

test('parse() - double quoted strings', (t) => {
  const parser = new StreamingParser();
  // @ts-expect-error toString() is not part of the public API
  t.is(parser.parseComplete('"abc"'), 'abc', `parses double quoted strings ${parser.toString()}`);
});

test('parse() - quotes in strings', (t) => {
  const parser = new StreamingParser();
  t.deepEqual(parser.parseComplete(`["\\"","'"]`), ['"', "'"], 'parses quotes in strings');
});

test('parse() - escaped characters', (t) => {
  const parser = new StreamingParser();
  t.is(
    parser.parseComplete(`"\\b\\f\\n\\r\\t\\u01fF\\\\\\""`),
    '\b\f\n\r\t\u01FF\\"',
    'parses escaped characters',
  );
});

test('parse() - whitespace', (t) => {
  const parser = new StreamingParser();
  t.deepEqual(parser.parse('{\t\v\f \u00A0\uFEFF\n\r\u2028\u2029\u2003}'), {}, 'parses whitespace');
});

test('parse() - partially parsed string', (t) => {
  const parser = new StreamingParser();
  t.is(parser.parse('"abc'), 'abc');
  t.is(internalGetStateRoot(parser), 'partial');
  t.is(internalGetRoot(parser), 'abc');
  t.is(parser.parse('def'), 'abcdef');
  t.is(internalGetStateRoot(parser), 'partial');
  t.is(internalGetRoot(parser), 'abcdef');
  t.is(parser.parse('ghi"'), 'abcdefghi');
  t.is(internalGetStateRoot(parser), 'complete');
  t.is(internalGetRoot(parser), 'abcdefghi');
});

test(`parse() - partial after array value`, (t) => {
  const parser = new StreamingParser();
  t.deepEqual(parser.parse('["1"'), ['1']);
});

test(`parse() - continue after array value`, (t) => {
  const parser = new StreamingParser();
  t.deepEqual(parser.parse('["1"'), ['1']);
  t.deepEqual(parser.parse(',"2"'), ['1', '2']);
  t.deepEqual(parser.parse(']'), ['1', '2']);
});

test(`parse() - continue within array value`, (t) => {
  const parser = new StreamingParser();
  t.deepEqual(parser.parse('["1"'), ['1']);
  t.deepEqual(parser.parse(',"2'), ['1', '2']);
  t.deepEqual(parser.parse('3"'), ['1', '23']);
  t.deepEqual(parser.parse(',4]'), ['1', '23', 4]);
});

testProp('Can parse partial strings', [partialJsonString], (t, [string, jsonParts]) => {
  const parser = new StreamingParser();
  for (const part of jsonParts.slice(0, -1)) {
    t.notThrows(() => parser.parse(part));
    t.deepEqual(internalGetStateRoot(parser), 'partial');
  }
  const output = parser.parse(jsonParts.at(-1)!);
  t.deepEqual(internalGetStateRoot(parser), 'complete');
  t.deepEqual(output, string);
});

export function negativeZeroClean(value: any): boolean {
  if (Object.is(value, -0)) {
    return false;
  }

  if (value === null) {
    return true;
  }

  if (typeof value === 'object') {
    return Array.isArray(value)
      ? value.every((x) => negativeZeroClean(x))
      : Object.values(value as object).every((x) => negativeZeroClean(x));
  }

  return true;
}

testProp('Can parse partial JSON objects', [partitionedJson], (t, [value, jsonParts]) => {
  const parser = new StreamingParser();
  let output: any;
  let prefix = '';
  for (const [idx, part] of jsonParts.entries()) {
    if (idx === jsonParts.length - 1) {
      output = parser.parseComplete(part);
    } else {
      parser.parse(part);
    }

    prefix += part;
  }

  t.deepEqual(output, value);
});

testProp('Can parse multiple JSON objects', [multipleJsonObjects], (t, [values, jsonParts]) => {
  const parser = new StreamingParser({ stream: true });
  let items: any[] = [];
  for (const part of jsonParts) {
    const output = parser.parseIncremental(part);
    for (const iterator of output.events) {
      if (iterator.kind === 'value') {
        items.push(iterator.value);
      }
    }
  }
  t.is(items.length, values.length);
  t.deepEqual(items, values);
});

test(`parse() - continue string with escape`, (t) => {
  const parser = new StreamingParser();
  t.is(parser.parse('"'), '');
  t.is(parser.parse('\\'), '');
});

test(`parse() - continue in before array value`, (t) => {
  const parser = new StreamingParser();
  t.deepEqual(parser.parse('["1"'), ['1']);
  t.deepEqual(parser.parse(',"2'), ['1', '2']);
  t.deepEqual(parser.parse('3",'), ['1', '23']);
  t.deepEqual(parser.parse('4]'), ['1', '23', 4]);
});

for (const suffix of ['null', '"', '1', 'true', '{}', '[]']) {
  test(`parse() - error - incorrectly continued after array with suffix ${JSON.stringify(
    suffix,
  )}`, (t) => {
    const parser = new StreamingParser();
    t.deepEqual(parser.parse('["1"'), ['1']);
    t.deepEqual(parser.parse(',"2"'), ['1', '2']);

    let errorChar = suffix[0];
    if (errorChar === '"') {
      errorChar = '\\"';
    }

    const err = t.throws(
      () => {
        parser.parse(`]${suffix}`);
      },
      {
        instanceOf: SyntaxError,
        message: `JSON5: invalid character '${errorChar}' at 1:10`,
      },
    ) as ExtendedSyntaxError;
    t.is(err.lineNumber, 1);
    t.is(err.columnNumber, 10);
  });
}

test('parse() - integer', (t) => {
  const parser = new StreamingParser();

  t.is(parser.parse('-'), undefined);
  t.is(internalGetStateRoot(parser), 'partial');

  t.is(parser.parse('1'), undefined);
  t.is(internalGetStateRoot(parser), 'partial');

  t.deepEqual(parser.parseComplete('2'), -12);
  t.is(internalGetStateRoot(parser), 'complete');
});

test('parse() - complex', (t) => {
  // Note: partial(v) mutates the object and adds a [parseStateSymbol] property with the value
  // 'partial', complete(v) does the same with the value 'complete'.

  const parser = new StreamingParser();
  t.deepEqual(parser.parse('{"":["'), { '': [''] });

  t.deepEqual(internalGetStateRoot(parser), partial({ '': partial(['partial']) }));

  t.deepEqual(parser.parse('foo'), { '': ['foo'] });
  t.deepEqual(parser.parse('bar'), { '': ['foobar'] });
  t.deepEqual(internalGetStateRoot(parser), partial({ '': partial(['partial']) }));

  t.deepEqual(parser.parse('"'), { '': ['foobar'] });
  t.deepEqual(internalGetStateRoot(parser), partial({ '': partial(['complete']) }));

  t.deepEqual(parser.parse(',"baz'), { '': ['foobar', 'baz'] });
  t.deepEqual(internalGetStateRoot(parser), partial({ '': partial(['complete', 'partial']) }));

  t.deepEqual(parser.parse('zap"]'), { '': ['foobar', 'bazzap'] });
  t.deepEqual(internalGetStateRoot(parser), partial({ '': complete(['complete', 'complete']) }));

  t.deepEqual(parser.parseComplete('}'), { '': ['foobar', 'bazzap'] });
  t.deepEqual(internalGetStateRoot(parser), complete({ '': complete(['complete', 'complete']) }));
});

test('parser#toString()', (t) => {
  const parser = new StreamingParser();
  t.deepEqual(
    // @ts-expect-error toString() is not part of the public API
    parser.toString(),
    JSON.stringify({
      source: '',
      parseState: 'start',
      outputStack: [],
      stateStack: [],
      pathStack: [],
      pos: 0,
      line: 1,
      column: 0,
      parseEvents: [],
      stream: false,
      endOfInput: false,
      lexState: 'default',
      partialLex: false,
    }),
  );
});
