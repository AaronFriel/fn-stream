import type { JSONSchema, FromSchema } from 'json-schema-to-ts';
import type { ChatCompletionTool } from 'openai/resources';

export { type JSONSchema, FromSchema, ChatCompletionTool };

export type TypedChatCompletionTool<Name extends string, Spec extends JSONSchema> = ChatCompletionTool & {
  function: {
    name: Name;
    parameters: Spec;
  };

  /**
   * This is a phantom type, used to infer the type of the parameters from the schema.
   *
   * Use this type to get the type of the parameters, e.g.:
   * ```typescript
   * const Tool: TypedChatCompletionTool = createChatCompletionTool(...);
   * type ToolParameters = typeof Tool["$inferParameters"];
   * ```
   */
  $inferParameters: FromSchema<Spec>;
};

export function createChatCompletionTool<const Name extends string, const Spec extends JSONSchema>(name: Name, description: string, spec: Spec): TypedChatCompletionTool<Name, Spec> {
  return {
    type: 'function',
    function: {
      name,
      description,
      // @ts-ignore
      parameters: spec,
    },
  } as const;
}
