export type JsonObject = { [key: string]: JsonValue };
export type JsonArray = JsonValue[];
export type JsonPrimitive = string | number | boolean | null;

export type JsonValue = JsonObject | JsonArray | JsonPrimitive;

export const parseStateSymbol: unique symbol = Symbol('ParseState');

export type PartialPrimitiveValue = 'complete' | 'partial' | undefined;

export type PartialObject = JsonObject & { [parseStateSymbol]: PartialPrimitiveValue };
export type PartialArray = JsonValue[] & { [parseStateSymbol]: PartialPrimitiveValue };

// We could use a symbol, but null is JSON serializable, which keeps the API serializable.
export const Sentinel = null;
export type Sentinel = typeof Sentinel;

type PathPart = string | number | Sentinel; // Symbol is not actually used.

type MapPartialParseEvent<T, PathPrefix extends Array<PathPart>> = {
  [K in keyof T]: K extends string | number ? ParseEvent<T[K], [...PathPrefix, K], 'complete'> : never;
};

// Prevent "any" types from distributing over all branches of the conditional type.
type IsStrictlyAny<T> = (T extends never ? true : false) extends false ? false : true;


// Used to prevent language server from showing InferParseEvent<...> and instead show the expanded type.
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

export type ParseEvent<
  T,
  PathPrefix extends PathPart[] = [],
  RootKind extends 'complete' | 'value' = 'value',
> =
  | {
      kind: RootKind;
      path: [...PathPrefix, Sentinel];
      value: T;
    }
  | (IsStrictlyAny<T> extends true
      ? {
          kind: 'complete';
          path: [...PathPrefix, ...PathPart[]];
          value: T;
        }
      : T extends string
      ? {
          kind: 'partial';
          path: [...PathPrefix, Sentinel];
          value: T;
        }
      : T extends JsonArray
      ? // prettier-ignore
        Expand<MapPartialParseEvent<T, PathPrefix> extends [...infer U] ? U[number] : never>
      : T extends JsonObject
      ? // prettier-ignore
        Expand<MapPartialParseEvent<T, PathPrefix> extends Record<any, infer U> ? U : never>
      : never);
