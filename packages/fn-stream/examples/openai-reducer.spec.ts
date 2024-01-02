import test from 'ava';
import { P, match } from 'ts-pattern';

import { StreamingParser } from '../src/partial-json/parser';
import { ParseEvent, Sentinel } from '../src/types';

import {
  OpenAIToolParameters,
  generateCompletionChunks,
  generateToolCalls,
} from './helpers/OpenAITool';

test('OpenAI Function Example', async (t) => {
  const toolCalls = generateToolCalls();

  // We generate completion chunks, each contains a single character of the stringified JSON.
  const completionChunks = generateCompletionChunks(toolCalls);

  // Now we implement a little reducer that takes the completion chunks and builds up the final object.
  type SharedClientState = {
    messages: {
      id: string;
      text: string;
    }[];
    actions: number;
  };

  type ClientMessage =
    | {
        type: 'message';
        payload: {
          id: string;
          text: string;
        };
      }
    | {
        type: 'incrementActions';
        payload: undefined;
      };

  type ServerState = {
    toolActions: {
      id: string;
      value?: number;
      bool?: boolean;
      params?: string[];
      paramResults?: Promise<string>[];
    }[];
  };

  let sharedClientState: SharedClientState = {
    messages: [],
    actions: 0,
  };

  let state: ServerState = {
    toolActions: [],
  };

  // Written in a pure "redux" style:
  const sharedClientReducer = (state: SharedClientState, action: ClientMessage) => {
    switch (action.type) {
      case 'message': {
        const messageIndex = state.messages.findIndex((m) => m.id === action.payload.id);

        if (messageIndex === -1) {
          return {
            ...state,
            messages: [
              ...state.messages,
              {
                id: action.payload.id,
                text: action.payload.text,
              },
            ],
          };
        } else {
          let message = state.messages[messageIndex];
          message = {
            ...message,
            text: message.text + action.payload.text,
          };
          return {
            ...state,
            messages: [
              ...state.messages.slice(0, messageIndex),
              action.payload,
              ...state.messages.slice(messageIndex + 1),
            ],
          };
        }
      }
      case 'incrementActions': {
        return {
          ...state,
          actions: state.actions + 1,
        };
      }
    }
  };

  type ServerAction = {
    chunkId: string;
    callIndex: number;
    event: ParseEvent<OpenAIToolParameters>;
  };

  // On the server, we perform direct mutation of the state for simplicity here - we will show an
  // example that is async-safe using Immer later.
  const reducer = async (state: ServerState, action: ServerAction) => {
    // We build up the server state as a result of a series of actions.
    await match(action.event)
      // Low latency streaming of messages to the client:
      .with(
        { kind: 'partial', path: ['parts', P.number, 'message', 'text', Sentinel] },
        (event) => {
          // In a client-server scenario, we would send the message to the client here as well as
          // update the server's shared state.
          const id = `${action.chunkId}-${action.callIndex}-${event.path[1]}`;
          sharedClientState = sharedClientReducer(sharedClientState, {
            type: 'message',
            payload: {
              id,
              text: event.value,
            },
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
          const actionId = `${action.chunkId}-${action.callIndex}-${event.path[1]}`;
          let toolAction = state.toolActions.find((a) => a.id === actionId);
          if (!toolAction) {
            state.toolActions.push(
              (toolAction = {
                id: actionId,
              }),
            );
          }
          toolAction.params = toolAction.params ?? [];
          toolAction.params.push(event.value);
          toolAction.paramResults = toolAction.paramResults ?? [];
          toolAction.paramResults.push(
            Promise.resolve().then(() => {
              return `Result of ${event.value}`;
            }),
          );
        },
      )
      .with({ kind: 'complete', path: ['parts', P.number, 'action', P._, Sentinel] }, (event) => {
        const actionId = `${action.chunkId}-${action.callIndex}-${event.path[1]}`;
        let toolAction = state.toolActions.find((a) => a.id === actionId);
        if (!toolAction) {
          state.toolActions.push(
            (toolAction = {
              id: actionId,
            }),
          );
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
      })
      .with({ kind: 'complete', path: ['parts', P.number, 'action', Sentinel] }, async (event) => {
        // We now know the action must exist, and each of its params must have a result.
        const actionId = `${action.chunkId}-${action.callIndex}-${event.path[1]}`;
        const toolAction = state.toolActions.find((a) => a.id === actionId)!;
        const paramResults = await Promise.all(toolAction.paramResults!);

        const stringifiedResults = paramResults.join(', ');

        // Let's update the client state with the result - or alternatively, we queue up a new LLM call!
        sharedClientState = sharedClientReducer(sharedClientState, {
          type: 'incrementActions',
          payload: undefined,
        });

        sharedClientState = sharedClientReducer(sharedClientState, {
          type: 'message',
          payload: {
            id: actionId,
            text: `Action ${toolAction.value} ${
              toolAction.bool ? 'was' : 'was not'
            } performed. Result: ${stringifiedResults}`,
          },
        });
      })
      .with({ kind: 'value' }, () => {
        // console.log('Completed a tool call');
      })
      .with({ kind: 'complete' }, () => {
        // console.log(`Completed a part of a tool call: ${event.path.map((x) => x.toString())}`);
      })
      .with({ kind: 'partial' }, () => {
        // console.log(`Partially updated a property of a tool call: ${event.path.map((x) => x.toString())}`);
      })
      .exhaustive();
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
            await reducer(state, { chunkId, callIndex, event });
          }
        }
      }
    }
  }

  t.snapshot(state);
});
