# polling-connection

[![build](https://github.com/gsantiago/polling-connection/actions/workflows/node.js.yml/badge.svg)](https://github.com/gsantiago/polling-connection/actions/workflows/node.js.yml)
[![downloads](https://img.shields.io/npm/dm/polling-connection)](https://www.npmjs.com/package/polling-connection)
[![npm](https://img.shields.io/npm/v/polling-connection)](https://www.npmjs.com/package/polling-connection)

🚧 WIP: Work in Progress 🚧

Event-based polling module written in TS with time tracking and aborting support.

:white_check_mark: Agnostic (works with axios, fetch or any async function) <br />
:white_check_mark: Written in TypeScript <br />
:white_check_mark: Time tracking <br />
:white_check_mark: Abort signal support <br />

## installation

NPM:

`npm install polling-connection`

Yarn:

`yarn add polling-connection`

## examples

- [Codesandbox example](https://codesandbox.io/s/polling-connect-example-368kh9)

## usage

Create a new connection:

```ts
import { polling } from "polling-connection";

const connection = polling({
  task: async ({ done, signal }) => {
    const response = await axios.get("user/status", { signal });
    if (response.data.status === 1) {
      done(response.data);
    }
  },
  timeout: 30000,
  delay: 3000,
});
```

Listen to the events:

```ts
connection.on("success", (data) => {
  console.log(data);
  console.log("The connection is automatically closed on success");
});

connection.on("timeout", () => {
  console.log("Connection is automatically closed on timeout");
});

connnection.on("second", ({ passed, remaining }) => {
  console.log("seconds passed:", passed);
  console.log("seconds remamining:", remaining);
});

connection.on("error", (err) => {
  console.error(err);
  console.log("The connection is still active");
});

connection.on("close", () => {
  console.log("The connection is closed");
});
```

Start the polling:

```ts
connection.start();
```

Manually close the connection:

```ts
connection.close();
```

Clear all event listeners:

```ts
connection.removeAllEventListeners();
```

Close connection and remove all event listeners:

```ts
connection.destroy();
```

## api

### `polling(options: PollingOptions) => PollingConnection`

Creates a new polling connection.

Available options:

| Option  | Description                                                          | Default            |
| ------- | -------------------------------------------------------------------- | ------------------ |
| task    | An async function that will be executed while the connection is open | Required           |
| delay   | Delay in milliseconds after each call                                | 3000 (3 seconds)   |
| timeout | Time in milliseconds for timeout                                     | 30000 (30 seconds) |

Example:

```ts
const connection = polling<ResultType>({
  task: async ({ done, signal }) => {
    const result = await someAsyncTask({ signal });
    if (result === "ok") {
      done(result);
    }
  },
});
```

The connection instance provides the following methods:

#### `start() => void`

Starts the connection and executes the task until it reaches the timeout or the connection is closed (either by success or manually closed)

Before calling this method you must add the event listeners.

Example:

```ts
connection.start();
```

#### `on(event: PollingEvent, data) => Unsubscribe`

Adds a new event listener.

Supported events:

| Event     | Description                                                                                                                                             | Arguments                             |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `start`   | When the connection is started                                                                                                                          | `{passed: number; remaining: number}` |
| `success` | When the `done` callback is called. The connection is also automatically closed, which means that the `close` event will also be called after `success` | The payload given to `done` callback  |
| `error`   | When the task throws an exception. **This does not closes the connection.**                                                                             | `err: unknown`                        |
| `timeout` | When the polling reaches the timeout. This closes the event, which means the `close` event are also triggered after this event.                         | None                                  |
| `second`  | When a second passes while the polling is active. The arguments are the passed and remaining time in seconds.                                           | `{passed: number; remaining: number}` |
| `close`   | When the connection is closed either my manualling calling the `close` or `destroy` events, or when the polling reaches the timeout                     | None                                  |

Example:

```ts
connection.on("start", () => {
  console.log("The connection is started");
});

connection.on("success", (data) => {
  console.log("done called with:", data);
});

connection.on("second", ({ passed, remaining }) => {
  console.log("seconds passed:", passed);
  console.log("seconds remaining:", remaining);
});

connection.on("error", (err) => {
  console.log("thrown exception:", err);
  console.log("...but the polling is still active");

  // Depending on the error you can close the connection
  if (isBadError(err)) {
    connection.close();
  }
});

connection.on("timeout", () => {
  console.log("polling reached the timeout");
  console.log("the polling will be closed and trigger the `close` event");
});

console.log("close", () => {
  console.log("the polling is closed");
});
```

This method also return the unsubscribe function:

```ts
const unsubscribe = connection("success", handleSuccess);

// ...

unsubscribe(); // remove the success listener
```

#### `close() => void`

Closes the connection.

#### `removeAllEventListeners() => void`

Removes all the event listeners.

#### `destroy() => void`

Closes the connection and remove all the event listeners.

## license

MIT
