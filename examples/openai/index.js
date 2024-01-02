import { OpenAI } from 'openai';
import { match, P } from 'ts-pattern';

import { Sentinel, StreamingParser, adapters } from 'fn-stream';
const { createChatCompletionTool } = adapters.openai;

const SUPPORTED_LANGUAGES = ['python', 'javascript', 'haskell'];

const Tool = createChatCompletionTool(
  'write-code',
  'Use this tool instead of writing code in a message.',
  {
    type: 'object',
    description: 'A tool to write code in a supported language. Send properties in objects in the order defined.',
    properties: {
      responses: {
        description: 'An array of responses to send to the user.',
        type: 'array',
        items: {
          type: 'object',
          properties: {
            preamble: {
              type: 'string',
              description: 'Optional message to send to the user before code code, typically describing the program you are about to write or replying to the user.',
            },
            language: {
              type: 'string',
              enum: SUPPORTED_LANGUAGES,
              description: 'The language to use for the code, as a lowercase string',
            },
            code: {
              type: 'string',
              description:
                'The code to send to the user; the contents of a file in the language specified',
            },
            postscript: {
              type: 'string',
              description: 'Optional message to send to the user after the code, typically describing how to use the program you wrote. Optional.',
            },
          },
          additionalProperties: false,
          required: ['language', 'code'],
        },
        additionalProperties: false,
      },
    },
    additionalProperties: false,
    required: ['responses'],
  },
);

console.log('✨ Calling OpenAI');

const client = new OpenAI();

const tools = [Tool];
const toolNames = tools.map((tool) => '`' + tool.name + '`').join(', ');

const { data, response } = await client.chat.completions
  .create({
    model: 'gpt-4-1106-preview',
    stream: true,
    max_tokens: 4_000,
    tool_choice: 'auto',
    tools,
    response_format: {
      type: 'json_object',
    },
    messages: [
      {
        role: 'system',
        content: `\
You are a helpful assistant.

# Using Tools

Call only one tool at a time, either ${toolNames} or respond to the user in a message, but do not do both or more than one. When using a tool, respond in JSON format.

You MUST NOT use the "parallel" or "multi_tool_use.parallel" tools. Those are not supported.
You must never make more than 1 Tool Call.
Tools that permit you to make more than one tool call - like ${Tool.function.name} - accept arrays so that you can make a single tool call.
`,
      },
      {
        role: 'user',
        content: `\
In each of your supported languages, write a program that:
1. Prints "Hello, world!".
2. Prints the 100th Fibonacci number.
`,
      },
    ],
  })
  .withResponse();

function unbufferedWrite(text, part) {
  if (process.env.FILTER_PART && process.env.FILTER_PART !== part) {
    return;
  }
  switch (part) {
    case 'preamble':
      process.stderr.write(xtermSlateBlue)
      break;
    case 'language':
      process.stderr.write(xtermDeepPink3);
      break;
    case 'code':
      process.stderr.write(xtermPurple);
      break;
    case 'postscript':
      process.stderr.write(xtermSteelBlue);
      break;
    default:
      process.stderr.write(colorReset);
      break;
  }
  process.stderr.write(text);
}

const xtermPurple = '\x1b[38;5;93m';
const xtermSlateBlue = '\x1b[38;5;99m';
const xtermSteelBlue = '\x1b[38;5;81m';
const xtermDeepPink3 = '\x1b[38;5;162m';
const colorReset = '\x1b[0m';

if (response.status !== 200) {
  throw new Error(`OpenAI returned a ${response.status} status code`);
}

console.log(`✨ OpenAI stream beginning`);

/**
 * @type {StreamingParser<(typeof Tool)["$inferParameters"]>}
 */
const parser = new StreamingParser({ stream: true });

// Some state to keep track of the programs:
const programs = [];
let currentLanguage = null;

// Handle each chunk of the LLM response as it is received:
for await (const chunk of data) {
  for (const choice of chunk.choices) {
    if (choice.delta.content) {
      unbufferedWrite(choice.delta.content, colorReset);
    }
    for (const toolCall of choice.delta?.tool_calls ?? []) {
      if (toolCall.function?.arguments) {
        const { events } = parser.parseIncremental(toolCall.function.arguments);
        for (const event of events) {
          // TODO: Rewrite to use `if` statements, pending https://github.com/microsoft/TypeScript/issues/56920
          // For now, we rely on the ts-pattern library to narrow the type of `event`:
          match(event)
            .with({ kind: 'partial', path: [P._, P._, 'preamble', Sentinel] }, (event) => {
              unbufferedWrite(event.value, 'preamble');
            })
            .with({ kind: 'complete', path: [P._, P._, 'preamble', Sentinel] }, () => {
              unbufferedWrite('\n\n', 'preamble');
            })
            .with({ kind: 'complete', path: [P._, P._, 'language', Sentinel] }, (event) => {
              // This type checks in TypeScript - the value is narrowed to the supported languages:
              currentLanguage = event.value;
              unbufferedWrite('```', 'preamble');
              unbufferedWrite(event.value + '\n', 'language');
            })
            .with({ kind: 'partial', path: [P._, P._, 'code', Sentinel] }, (event) => {
              unbufferedWrite(event.value, 'code');
            })
            .with({ kind: 'complete', path: [P._, P._, 'code', Sentinel] }, () => {
              programs.push({
                language: currentLanguage,
                code: event.value,
              });
              unbufferedWrite('\n');
              unbufferedWrite('```\n', 'postscript');
            })
            .with({ kind: 'partial', path: [P._, P._, 'postscript', Sentinel] }, (event) => {
              unbufferedWrite(event.value, 'postscript');
            })
            .with({ kind: 'complete', path: [P._, P._, 'postscript', Sentinel] }, (event) => {
              unbufferedWrite("\n\n");
            })
            .otherwise(() => {
              // Do nothing.
            });
        }
      }
    }
  }
}

unbufferedWrite('\n', colorReset);
console.log(`✨ The OpenAI call completed.`);

console.log('✨ Summary:')
for (const program of programs) {
  console.log(
    `Received a ${program.language} program that was ${program.code.length} characters long.\n`,
  );
}
