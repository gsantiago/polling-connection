import { polling, PollingConnection, PollingOptions } from "../src";

jest.useFakeTimers();

const mockedFetchStatus = jest.fn();

const spies = {
  start: jest.fn(),
  success: jest.fn(),
  error: jest.fn(),
  timeout: jest.fn(),
  close: jest.fn(),
  second: jest.fn(),
};

const setup = (options?: Partial<PollingOptions<string>>) =>
  polling<string>({
    task: async ({ done, signal }) => {
      const status = await mockedFetchStatus({ signal });
      if (status === "active") {
        done(status);
      }
    },
    ...options,
  });

test("creates a new polling connection", () => {
  const connection = setup();

  expect(connection).toBeInstanceOf(PollingConnection);
});

test("start event", () => {
  const connection = setup();

  connection.on("start", spies.start);

  connection.start();

  expect(spies.start).toHaveBeenCalledWith({
    passed: 0,
    remaining: 30,
  });
});

test("timeout and close events", () => {
  const connection = setup();

  connection.on("timeout", spies.timeout);
  connection.on("close", spies.close);

  connection.start();

  jest.advanceTimersByTime(30000);

  expect(spies.timeout).toHaveBeenCalled();
  expect(spies.close).toHaveBeenCalled();
});

test("error event", (done) => {
  const mockError = new Error();
  mockedFetchStatus.mockRejectedValueOnce(mockError);

  const connection = setup();

  connection.on("error", (err) => {
    expect(err).toBe(mockError);
    done();
  });

  connection.start();
});

test("success event", (done) => {
  mockedFetchStatus.mockResolvedValueOnce("active");

  expect.assertions(1);

  const connection = setup();

  connection.on("close", () => {
    done();
  });

  connection.on("success", (value) => {
    expect(value).toBe("active");
  });

  connection.start();
});

test("second event", (done) => {
  mockedFetchStatus.mockResolvedValue("inactive");

  const connection = setup({ timeout: 5000, delay: 1000 });

  connection.on("close", done);

  connection.on("second", spies.second);

  connection.start();

  jest.advanceTimersByTime(1000);

  expect(spies.second).toHaveBeenCalledWith({
    passed: 1,
    remaining: 4,
  });

  jest.advanceTimersByTime(1000);

  expect(spies.second).toHaveBeenCalledWith({
    passed: 2,
    remaining: 3,
  });

  jest.advanceTimersByTime(1000);

  expect(spies.second).toHaveBeenCalledWith({
    passed: 3,
    remaining: 2,
  });

  jest.advanceTimersByTime(1000);

  expect(spies.second).toHaveBeenCalledWith({
    passed: 4,
    remaining: 1,
  });

  jest.advanceTimersByTime(1000);
});

test("remove event listeners", () => {
  const connection = setup();

  connection.on("start", spies.start);
  connection.on("timeout", spies.timeout);
  connection.on("close", spies.close);

  connection.start();

  expect(spies.start).toHaveBeenCalled();

  connection.removeAllEventListeners();

  jest.advanceTimersByTime(30000);

  expect(spies.timeout).not.toHaveBeenCalled();
  expect(spies.close).not.toHaveBeenCalled();
});

test("detroy method", () => {
  const connection = setup();

  connection.on("start", spies.start);
  connection.on("close", spies.close);

  connection.start();

  expect(spies.start).toHaveBeenCalled();

  connection.destroy();

  expect(spies.close).toHaveBeenCalled();

  spies.start.mockClear();

  connection.start();

  expect(spies.start).not.toHaveBeenCalled();

  connection.close();
});

test("abort signal", (done) => {
  mockedFetchStatus.mockImplementation(
    ({ signal }: { signal: AbortSignal }) =>
      new Promise(() => {
        signal.addEventListener("abort", () => {
          done();
        });
      })
  );

  const connection = setup();

  connection.start();
  connection.close();
});
