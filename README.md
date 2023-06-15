# RealEngine.ai SDK for JavaScript</h1>

A simple and easy to use client for the <a href="https://www.realengine.ai">RealEngine.ai API</a></b>

## Installation

```
npm install @realengineai/client
```

## Usage

Import and initialize a client using an **API token** from the [RealEngine AI Dashboard](https://app.realengine.ai).

```js
import RealEngineAIClient from "@realengineai/client"

// Initializing a client
const realEngineAIClient = new RealEngineAIClient(
  process.env.REAL_ENGINE_AI_TOKEN
)
```

Make a request to get captions for an image.

```js
const caption = await client.getCaption("http://link.to/image.jpg")
```

### Handling errors

If the API returns an unsuccessful response, the returned `Promise` rejects with a `RealEngineAIError`.

The error contains a unique error ID that can be used by RealEngine AI support team.

## Requirements

This package supports the following minimum versions:

- Runtime: `node >= 18`
- Type definitions (optional): `typescript >= 4.5`

## Contributing

Contributions are welcome!

### License

This project is licensed under the terms of the MIT license. See the [License](https://github.com/RealEngineAI/js-sdk/blob/main/LICENSE)
file for details.
