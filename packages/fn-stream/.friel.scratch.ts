import { JsonValue } from './dist';
import { StreamingParser } from './src';
import { ParseEvent } from './src/partial-json/parser';
import deepEqual from 'fast-deep-equal';
import deepDiff from 'deep-diff';

const parser = new StreamingParser({ stream: true });

let data = JSON.stringify({
  operations: [{ kind: 'replace', regexp: 'version="10.3.1"', replacement: 'version="9.6.0"' }],
});

let reconstructedObject: any;
let idx = 0;

function applyUpdate(root: any, { kind, path, value }: ParseEvent): void {
  let current = root;

  // Iterate over the path to reach the correct position in the object
  for (let i = 0; i < path.length; i++) {
    const key = path[i];

    // Check if we've reached the penultimate key and next key is nonzero or if path length is 1
    if (i === path.length - 1 || (path.length === 1 && key !== 0)) {
      // If we're at the end of the path, set the value
      current[key] = value;
    } else if (current[key] === undefined) {
      // Initialize an empty object or array based on the next key
      current[key] = typeof path[i + 1] === 'number' ? [] : {};
    }
    // Proceed to the next level
    current = current[key];
  }
}

// Start with an untyped object and refine the type during reconstruction
let result: any;
do {
  let amountToTake = 1;
  let slice = data.slice(idx, idx + amountToTake);
  idx += slice.length;

  for (const update of parser.parseIncremental(slice).events) {
    if (update.kind === 'partial') {
      console.log(JSON.stringify(update.value, null, 2));
    }

    console.log(JSON.stringify(update.path));
    // console.log(JSON.stringify(update, null, 2));
    // console.log(parser.parseState);
    // console.log(parser.lexState);
    // Handle the case of the empty path for the root object

    if (update.path.length === 0) {
      result = update.value;
    } else {
      // Ensure the root object is initialized properly
      if (result === undefined) {
        result = typeof update.path[0] === 'number' ? [] : {};
      }
      // Apply the update to the root object
      applyUpdate(result, update);
    }
  }
} while (idx < data.length);

console.log(result);
console.log(deepDiff(JSON.parse(data), result));
