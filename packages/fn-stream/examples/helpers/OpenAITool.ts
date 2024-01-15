import { ChatCompletionChunk, ChatCompletionTool } from 'openai/resources';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

const MessageArguments = z.object({
  message: z.object({
    text: z.string(),
  }),
});

const ActionArguments = z.object({
  action: z.object({
    params: z.array(z.string()),
    value: z.number(),
    bool: z.boolean(),
  }),
});

const ToolProperties = z.object({
  parts: z.array(z.union([MessageArguments, ActionArguments])),
});

// Not used, validates that the types are compatible.
export const OpenAITool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'test',
    description: 'a test tool',
    parameters: zodToJsonSchema(ToolProperties),
  },
};

export type OpenAIToolParameters = z.infer<typeof ToolProperties>;

export function generateCompletionChunks(toolCalls: OpenAIToolParameters[]): ChatCompletionChunk[] {
  let index = 0;
  const completionChunks: ChatCompletionChunk[] = toolCalls.flatMap((call, callIndex) => {
    const parameters = JSON.stringify(call);

    const pieces = [...Array.from({ length: parameters.length }, (_, i) => parameters[i])];

    return pieces.map((piece): ChatCompletionChunk => {
      return {
        id: 'completionId',
        created: 0,
        model: 'n/a',
        object: 'chat.completion.chunk',
        choices: [
          {
            delta: {
              tool_calls: [
                {
                  index: callIndex,
                  function: {
                    arguments: piece,
                    name: 'test',
                  },
                },
              ],
            },
            finish_reason: null,
            index: index++,
          },
        ],
      };
    });
  });
  return completionChunks;
}

export function generateToolCalls(): OpenAIToolParameters[] {
  return [
    {
      parts: [
        {
          message: {
            text: 'Hello,',
          },
        },
        {
          action: {
            bool: true,
            value: 42,
            params: ['foo', 'bar'],
          },
        },
        {
          message: {
            text: ' world!',
          },
        },
      ],
    },
    {
      parts: [
        {
          action: {
            bool: false,
            value: 4,
            params: ['thwomp'],
          },
        },
      ],
    },
  ];
}
