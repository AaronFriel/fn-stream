# Snapshot report for `examples/openai-immer.spec.ts`

The actual snapshot is saved in `openai-immer.spec.ts.snap`.

Generated by [AVA](https://avajs.dev).

## Advanced OpenAI Function Example

> state

    {
      toolActionIds: [
        'completionId-0-1',
        'completionId-1-0',
      ],
      toolActions: {
        'completionId-0-1': {
          bool: true,
          paramResults: [
            Promise {},
            Promise {},
          ],
          params: [
            'foo',
            'bar',
          ],
          value: 42,
        },
        'completionId-1-0': {
          bool: false,
          paramResults: [
            Promise {},
          ],
          params: [
            'thwomp',
          ],
          value: 4,
        },
      },
    }

> clientViewOfState

    {
      actions: 2,
      messageIds: [
        'completionId-0-0',
        'completionId-0-1',
        'completionId-0-2',
        'completionId-1-0',
      ],
      messages: {
        'completionId-0-0': {
          text: [
            'H',
            'e',
            'l',
            'l',
            'o',
            ',',
          ],
        },
        'completionId-0-1': {
          text: [
            'Action 42 was performed. Result: Result of foo, Result of bar',
          ],
        },
        'completionId-0-2': {
          text: [
            ' ',
            'w',
            'o',
            'r',
            'l',
            'd',
            '!',
          ],
        },
        'completionId-1-0': {
          text: [
            'Action 4 was not performed. Result: Result of thwomp',
          ],
        },
      },
    }

> sharedClientState

    {
      actions: 2,
      messageIds: [
        'completionId-0-0',
        'completionId-0-1',
        'completionId-0-2',
        'completionId-1-0',
      ],
      messages: {
        'completionId-0-0': {
          text: [
            'H',
            'e',
            'l',
            'l',
            'o',
            ',',
          ],
        },
        'completionId-0-1': {
          text: [
            'Action 42 was performed. Result: Result of foo, Result of bar',
          ],
        },
        'completionId-0-2': {
          text: [
            ' ',
            'w',
            'o',
            'r',
            'l',
            'd',
            '!',
          ],
        },
        'completionId-1-0': {
          text: [
            'Action 4 was not performed. Result: Result of thwomp',
          ],
        },
      },
    }

> clientPatches

    [
      {
        op: 'add',
        path: [
          'messages',
          'completionId-0-0',
        ],
        value: {
          text: [
            'H',
          ],
        },
      },
      {
        op: 'add',
        path: [
          'messageIds',
          0,
        ],
        value: 'completionId-0-0',
      },
      {
        op: 'add',
        path: [
          'messages',
          'completionId-0-0',
          'text',
          1,
        ],
        value: 'e',
      },
      {
        op: 'add',
        path: [
          'messages',
          'completionId-0-0',
          'text',
          2,
        ],
        value: 'l',
      },
      {
        op: 'add',
        path: [
          'messages',
          'completionId-0-0',
          'text',
          3,
        ],
        value: 'l',
      },
      {
        op: 'add',
        path: [
          'messages',
          'completionId-0-0',
          'text',
          4,
        ],
        value: 'o',
      },
      {
        op: 'add',
        path: [
          'messages',
          'completionId-0-0',
          'text',
          5,
        ],
        value: ',',
      },
      {
        op: 'add',
        path: [
          'messages',
          'completionId-0-1',
        ],
        value: {
          text: [
            'Action 42 was performed. Result: Result of foo, Result of bar',
          ],
        },
      },
      {
        op: 'add',
        path: [
          'messageIds',
          1,
        ],
        value: 'completionId-0-1',
      },
      {
        op: 'replace',
        path: [
          'actions',
        ],
        value: 1,
      },
      {
        op: 'add',
        path: [
          'messages',
          'completionId-0-2',
        ],
        value: {
          text: [
            ' ',
          ],
        },
      },
      {
        op: 'add',
        path: [
          'messageIds',
          2,
        ],
        value: 'completionId-0-2',
      },
      {
        op: 'add',
        path: [
          'messages',
          'completionId-0-2',
          'text',
          1,
        ],
        value: 'w',
      },
      {
        op: 'add',
        path: [
          'messages',
          'completionId-0-2',
          'text',
          2,
        ],
        value: 'o',
      },
      {
        op: 'add',
        path: [
          'messages',
          'completionId-0-2',
          'text',
          3,
        ],
        value: 'r',
      },
      {
        op: 'add',
        path: [
          'messages',
          'completionId-0-2',
          'text',
          4,
        ],
        value: 'l',
      },
      {
        op: 'add',
        path: [
          'messages',
          'completionId-0-2',
          'text',
          5,
        ],
        value: 'd',
      },
      {
        op: 'add',
        path: [
          'messages',
          'completionId-0-2',
          'text',
          6,
        ],
        value: '!',
      },
      {
        op: 'add',
        path: [
          'messages',
          'completionId-1-0',
        ],
        value: {
          text: [
            'Action 4 was not performed. Result: Result of thwomp',
          ],
        },
      },
      {
        op: 'add',
        path: [
          'messageIds',
          3,
        ],
        value: 'completionId-1-0',
      },
      {
        op: 'replace',
        path: [
          'actions',
        ],
        value: 2,
      },
    ]