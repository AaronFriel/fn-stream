import { ChatCompletionChunk } from 'openai/resources';
import { createChatCompletionTool } from '../../src/adapters/openai';

export const OpenAITool = createChatCompletionTool('test', 'a test tool', {
  type: 'object',
  properties: {
    // We want a moderately complex type here as an example. This is a hypothetical "tool" that
    // can alternate between sending messages to the user, and taking actions.
    parts: {
      type: 'array',
      items: {
        type: 'object',
        oneOf: [
          {
            type: 'object',
            properties: {
              message: {
                type: 'object',
                properties: {
                  text: { type: 'string' },
                },
                required: ['text'],
                additionalProperties: false,
              },
            },
            required: ['message'],
            additionalProperties: false,
          },
          {
            type: 'object',
            properties: {
              action: {
                type: 'object',
                properties: {
                  params: { type: 'array', items: { type: 'string' } },
                  value: { type: 'integer' },
                  bool: { type: 'boolean' },
                },
                required: ['params', 'value', 'bool'],
                additionalProperties: false,
              },
            },
            required: ['action'],
            additionalProperties: false,
          },
        ],
      },
    },
  },
  required: ['parts'],
  additionalProperties: false,
});

export type OpenAIToolParameters = (typeof OpenAITool)['$inferParameters'];

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
