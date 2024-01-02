import test from 'ava';
import * as immer from 'immer';
import type { ChatCompletionChunk } from 'openai/resources';
import PQueue from 'p-queue';
import { P, match } from 'ts-pattern';

import { ParseEvent, Sentinel } from '../src/types';
import {
  OpenAIToolParameters,
  generateCompletionChunks,
  generateToolCalls,
} from './helpers/OpenAITool';
import { StreamingParser } from '../src';
immer.enablePatches();

test('Advanced OpenAI Function Example', async (t) => {
  // Like the above, but we use:
  // * immer with producePatches to generate client state updates
  // * p-queue to queue up updates to state
  const toolCalls = generateToolCalls();

  // We generate completion chunks, each contains a single character of the stringified JSON.
  const completionChunks: ChatCompletionChunk[] = generateCompletionChunks(toolCalls);

  type SharedClientState = {
    messages: {
      [id: string]: {
        text: string[];
      };
    };
    messageIds: string[];
    actions: number;
  };

  type ServerState = {
    toolActions: {
      [id: string]: {
        value?: number;
        bool?: boolean;
        params?: string[];
        paramResults?: Promise<string>[];
      };
    };
    toolActionIds: string[];
  };

  // We use Immer to generate patches to the client state, which we demonstrate here.
  let clientViewOfState: SharedClientState = {
    messages: {},
    messageIds: [],
    actions: 0,
  };

  let sharedClientState: SharedClientState = {
    messages: {},
    messageIds: [],
    actions: 0,
  };

  let state: ServerState = {
    toolActions: {},
    toolActionIds: [],
  };

  const queue = new PQueue({ concurrency: 1 });
  type ServerAction = {
    chunkId: string;
    callIndex: number;
    event: ParseEvent<OpenAIToolParameters>;
  };

  let clientPatches: immer.Patch[] = [];

  const produceClient = (fn: (sharedClientState: immer.Draft<SharedClientState>) => void) => {
    const [nextState, patches] = immer.produceWithPatches(
      sharedClientState,
      (sharedClientState) => {
        fn(sharedClientState);
      },
    );

    clientPatches = clientPatches.concat(patches);
    sharedClientState = nextState;

    // Using Immer, we have an inefficient, but simple protocol for updating client state from the
    // server.
    // When using Immer for this purpose, it's vastly more efficient on the wire if we break strings
    // into ropes (string[]), and if we key objects by their ID. We've done that here.
    const serializedPatch = JSON.stringify(patches);
    queue.add(() => {
      const deserializedPatch = JSON.parse(serializedPatch);
      clientViewOfState = immer.applyPatches(clientViewOfState, deserializedPatch);
    });

    return sharedClientState;
  };

  const produceServer = (fn: (state: immer.Draft<ServerState>) => void) => {
    state = immer.produce(state, (state) => {
      fn(state);
    });

    return state;
  };

  const handler = async (action: ServerAction) => {
    // We can make blocking calls in here, if we need to. In the case of this example, it's
    // unnecessary.
    // We build up the server state as a result of a series of actions.
    await match(action.event)
      // Low latency streaming of messages to the client:
      .with(
        { kind: 'partial', path: ['parts', P.number, 'message', 'text', Sentinel] },
        (event) => {
          // In a client-server scenario, we would send the message to the client here as well as
          // update the server's shared state.
          const id = `${action.chunkId}-${action.callIndex}-${event.path[1]}`;

          produceClient((sharedClientState) => {
            let message = sharedClientState.messages[id];
            if (!message) {
              sharedClientState.messageIds.push(id);
              message = sharedClientState.messages[id] = {
                text: [],
              };
            }
            message.text.push(event.value);
          });
        },
      )
      .with(
        { kind: 'partial', path: ['parts', P.number, 'action', 'params', P.number, Sentinel] },
        () => {
          // Intentionally not handled, we want whole param values.
        },
      )
      .with(
        { kind: 'complete', path: ['parts', P.number, 'action', 'params', P.number, Sentinel] },
        (event) => {
          produceServer((state) => {
            const actionId = `${action.chunkId}-${action.callIndex}-${event.path[1]}`;
            let toolAction = state.toolActions[actionId];
            if (!toolAction) {
              toolAction = state.toolActions[actionId] = {};
              state.toolActionIds.push(actionId);
            }
            toolAction.params = toolAction.params ?? [];
            toolAction.params.push(event.value);
            toolAction.paramResults = toolAction.paramResults ?? [];
            toolAction.paramResults.push(
              Promise.resolve().then(() => {
                return `Result of ${event.value}`;
              }),
            );
          });
        },
      )
      .with({ kind: 'complete', path: ['parts', P.number, 'action', P._, Sentinel] }, (event) => {
        produceServer((state) => {
          const actionId = `${action.chunkId}-${action.callIndex}-${event.path[1]}`;
          let toolAction = state.toolActions[actionId];
          if (!toolAction) {
            toolAction = state.toolActions[actionId] = {};
            state.toolActionIds.push(actionId);
          }
          switch (event.path[3]) {
            case 'bool': {
              toolAction.bool = event.value as boolean;
              break;
            }
            case 'value': {
              toolAction.value = event.value as number;
              break;
            }
          }
        });
      })
      .with({ kind: 'complete', path: ['parts', P.number, 'action', Sentinel] }, (event) => {
        queue.add(async () => {
          // We now know the action must exist, and each of its params must have a result.
          const actionId = `${action.chunkId}-${action.callIndex}-${event.path[1]}`;
          const toolAction = state.toolActions[actionId];
          const paramResults = await Promise.all(toolAction.paramResults!);

          const stringifiedResults = paramResults.join(', ');

          // Let's update the client state with the result - or alternatively, we queue up a new LLM call!
          produceClient((sharedClientState) => {
            sharedClientState.actions++;
            sharedClientState.messages[actionId] = {
              text: [
                `Action ${toolAction.value} ${
                  toolAction.bool ? 'was' : 'was not'
                } performed. Result: ${stringifiedResults}`,
              ],
            };
            sharedClientState.messageIds.push(actionId);
          });
        });
      })
      .with({ kind: 'value' }, () => {
        // console.log('Completed a tool call');
      })
      .with({ kind: 'complete' }, () => {
        // console.log(`Completed a part of a tool call: ${event.path.map((x) => x.toString())}`);
      })
      .otherwise(() => {
        // Ignored.
      });
  };

  const parser = new StreamingParser<OpenAIToolParameters>({ stream: true });
  for (const chunk of completionChunks) {
    for (const choice of chunk.choices) {
      for (const toolCall of choice.delta.tool_calls!) {
        if (toolCall.function?.arguments) {
          const { events } = parser.parseIncremental(toolCall.function.arguments);
          for (const event of events) {
            const chunkId = chunk.id;
            const callIndex = toolCall.index;
            await handler({ chunkId, callIndex, event });
          }
        }
      }
    }
  }

  await queue.onIdle();

  t.snapshot(state, 'state');
  t.snapshot(clientViewOfState, 'clientViewOfState');
  t.snapshot(sharedClientState, 'sharedClientState');
  t.deepEqual(clientViewOfState, sharedClientState);
  t.snapshot(clientPatches, 'clientPatches');
});
