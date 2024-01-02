# fn-stream

`fn-stream` is a library that makes it possible to combine generative AI (large language models) with tools in interactive, low-latency applications.

Typical generative AI tools require users to choose between **streaming responses**, and **structured data** - called "tools".

With `fn-stream`, you can have both: structured data, streamed and handled however it makes sense for _your_ application.

## How it Works

The key components of the `fn-stream` library are:

* The online `StreamingParser` that can parse JSON output from a large language model token-by-token or character-by-character.
* The format and type of `ParseEvents` to take the guesswork out of working with partially parsed objects.
* The [`ts-pattern` package](https://github.com/gvergnaud/ts-pattern) which makes it possible to correctly pattern match on the parse events.
* Adapters for defining tools for large language model APIs, such as the [`openai` package](https://www.npmjs.com/package/openai), making it easy to define a tool and write code against it with a minimum of guesswork.
  * The OpenAI adapter uses the wonderful [`json-schema-to-ts` package](https://github.com/ThomasAribart/json-schema-to-ts) to reduce boilerplate.

This library is written in TypeScript but does not require it!

## Examples

### CLI Example with OpenAI

This example, from [examples/openai/index.js](./examples/openai/index.js), shows how the fn-stream tool can be used to incrementally stream parts of a response to the user in a CLI program.

In this example we prompt the model to generate code in a number of languages, using a tool definition to separate the code from the conversation. The tool's schema matches this TypeScript type:

```typescript
type ToolArguments {
  responses: {
    preamble?: string;
    language: string;
    code: string;
    postscript?: string;
  }[]
}
```

The `fn-stream` library allows us to extract and summarize the code, here just the length, without requiring additional LLM API calls, finnicky parsing logic, or long delays.

<details>
<summary>Running this example
</summary>

1. Run `pnpm install` (see: [`pnpm`` installation](https://pnpm.io/installation)) in the root directory to install `fn-stream` in the workspace.

2. Set the OPENAI_API_KEY environment variable, you may need to [sign up for an OpenAI API account](https://platform.openai.com/signup):

3. In the `examples/openai` directory, run the example:

   ```bash
   node ./index.js
   ```

4. You should see output streaming after the call.

5. Try running with the `FILTER_PART` environment variable to filter the output to just one of the **preamble** (message before code), **language**, **code**, or **postscript** (message after code).

   ```bash
   FILTER_PART=code node ./index.js
   ```
</details>

#### Full output

In this example, we prompt the model for code and the tool's schema limits the languages to the arguments after the prompt: JavaScript, Python, and Rust. We print the conversation, colorized by which field is rendered.

There is no Markdown parsing behind this, just streaming, structured output! The code fence backticks are inserted by the program when receiving a "language" field, and the closing backticks are inserted when the "code" field is complete.

![A screen recording of the example. The program emits programs in Python, JavaScript, and Rust, and the text and code are rendered using different colors in the terminal.](examples/openai/demo.svg)

#### Field extraction

In this example, we run the program with the default prompt and languages. This prompts the model to write "Hello World" in three languages. The `FILTER_PART` environment variable is used to filter the result to just the code. Again, the language model is not emitting unstructured text. The model is still producing the preamble, language, and postscript fields, they are filtered out of the text response.

By using `fn-stream`, we can prompt a model to generate multimodal output, text, code, structured data, and operate on or stream only what the application needs.

![A screen recording of the example. The program emits *just* code, with no other content.](examples/openai/helloworld.svg)

### More examples

These tests showcase using `fn-stream` in a more client and server style:
* [OpenAI with separate server and client state, with hand-written reducers](./packages/fn-stream/examples/openai-reducer.spec.ts)
* [OpenAI with separate server and client state, using immer to simplify synchronizing state](./packages/fn-stream/examples/openai-immer.spec.ts)
