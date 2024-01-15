import { OpenAI } from 'openai';
import { match, P } from 'ts-pattern';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { StreamingParser, Sentinel } from 'fn-stream';

const userPrompt =
  process.argv[2] ??
  `In each of your supported languages, write a program that prints "Hello, World"`;

const languages =
  process.argv.length >= 3 ? process.argv.slice(3) : ['python', 'javascript', 'rust'];

const WriteCodeParams = z
  .object({
    responses: z
      .array(
        z.object({
          preamble: z
            .string()
            .optional()
            .describe(
              'Optional message to send to the user before code code, typically describing the program you are about to write or a first message replying to the user.',
            ),
          language: z
            .enum(languages)
            .describe(
              'The language to use for the code, as a lowercase string. These are the supported languages.',
            ),
          code: z
            .string()
            .describe(
              'The code to send to the user; the contents of a file in the language specified',
            ),
          postscript: z
            .string()
            .optional()
            .describe(
              'Optional message to send to the user after the code, typically describing how to use the program you wrote.',
            ),
        }),
      )
      .describe('An array of responses to send to the user.'),
  })
  .describe('The parameters for the write-code tool.');

/** @type {import('openai/resources/index.mjs').ChatCompletionTool} */
const WriteCodeTool = {
  function: {
    name: 'write-code',
    description:
      'Use this tool to respond to requests to write code or programs instead of writing a message',
    parameters: zodToJsonSchema(WriteCodeParams),
  },
};

console.log('✨  Calling OpenAI');

const client = new OpenAI();

/** @type {import('openai/resources/index.mjs').ChatCompletionTool[]} */
const tools = [WriteCodeTool];
const toolNames = tools.map((tool) => '`' + tool.function.name + '`').join(', ');

const { data, response } = await client.chat.completions
  .create({
    model: 'gpt-4-1106-preview',
    stream: true,
    max_tokens: 4_000,
    tool_choice: 'auto',
    tools,
    messages: [
      {
        role: 'system',
        content: `\
You are a helpful assistant.

# Using Tools

Call only one tool at a time, either ${toolNames} or respond to the user in a message, but do not do both or more than one.
When using a tool, order properties in the same order as the schema.
Prefer using tools which provide structured responses over unstructured text replies (even, e.g.: markdown).

You MUST NOT use the "parallel" or "multi_tool_use.parallel" tools. Those are not supported.
You must never make more than 1 Tool Call.
Tools that permit you to make more than one tool call - like ${Tool.function.name} - accept arrays so that you can make a single tool call.
`,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  })
  .withResponse();

const xtermPurple = '\x1b[38;5;93m';
const xtermSlateBlue = '\x1b[38;5;99m';
const xtermSteelBlue = '\x1b[38;5;81m';
const xtermDeepPink3 = '\x1b[38;5;162m';
const colorReset = '\x1b[0m';

function unbufferedWrite(text, part) {
  if (part && process.env.FILTER_PART && process.env.FILTER_PART !== part) {
    return;
  }
  switch (part) {
    case 'preamble':
      process.stdout.write(xtermSlateBlue);
      break;
    case 'language':
      process.stdout.write(xtermDeepPink3);
      break;
    case 'code':
      process.stdout.write(xtermPurple);
      break;
    case 'postscript':
      process.stdout.write(xtermSteelBlue);
      break;
    default:
      process.stdout.write(colorReset);
      break;
  }
  process.stdout.write(text);
}

if (response.status !== 200) {
  throw new Error(`OpenAI returned a ${response.status} status code`);
}

console.log(`✨  OpenAI stream beginning`);

/**
 * @type {StreamingParser<z.infer<typeof WriteCodeParams>>}
 */
const parser = new StreamingParser({ stream: true });

// Some state to keep track of the programs:
const programs = [];
let currentLanguage = null;

// Handle each chunk of the LLM response as it is received:
for await (const chunk of data) {
  for (const choice of chunk.choices) {
    if (choice.delta.content) {
      unbufferedWrite(choice.delta.content);
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
              unbufferedWrite('\n', 'code');
              unbufferedWrite('```\n', 'postscript');
            })
            .with({ kind: 'partial', path: [P._, P._, 'postscript', Sentinel] }, (event) => {
              unbufferedWrite(event.value, 'postscript');
            })
            .with({ kind: 'complete', path: [P._, P._, 'postscript', Sentinel] }, (event) => {
              unbufferedWrite('\n\n');
            })
            .otherwise(() => {
              // Do nothing.
            });
        }
      }
    }
  }
}

unbufferedWrite('\n');
console.log(`✨  The OpenAI call completed.`);

console.log('✨  Summary:');
for (const program of programs) {
  console.log(
    `Received a ${program.language} program that was ${program.code.length} characters long.\n`,
  );
}
