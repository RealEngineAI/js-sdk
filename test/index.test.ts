import fetchMock from "jest-fetch-mock"
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "@jest/globals"
import RealEngineAIClient, { RealEngineAIError } from "../src/client"

beforeAll(() => {
  fetchMock.enableMocks()
})

afterAll(() => {
  fetchMock.disableMocks()
})

describe("RealEngineAIClient", () => {
  let client: RealEngineAIClient

  beforeEach(() => {
    client = new RealEngineAIClient("test-token", 5, "http://example.com/test")
  })

  afterEach(() => {
    fetchMock.resetMocks()
  })

  it("getCaptionSuccessTest", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({
        success: true,
        data: "This is a test caption",
      })
    )

    const actualCaption = await client.getCaption(
      "http://example.com/testImage"
    )

    // expect(fetchMock.mock.calls.length).toEqual(1);
    expect(actualCaption).toEqual("This is a test caption")
    // expect(fetchMock.mock.calls[0][0]).toEqual('/test-base-url/caption?url=http%3A%2F%2Fexample.com%2FtestImage');
    // expect(fetchMock.mock.calls[0][1].headers.Authorization).toEqual('Bearer test-token');
  })

  it("getCaptionFailureTest", async () => {
    fetchMock.mockResponses([
      JSON.stringify({
        success: false,
        error: {
          id: "test-error-id",
          msg: "The link is not accessible",
        },
      }),
      { status: 400 },
    ])

    await expect(
      client.getCaption("http://example.com/testImage")
    ).rejects.toThrow(RealEngineAIError)
  })

  it("getCaptionFailureRetries", async () => {
    fetchMock.mockResponses(
      [
        JSON.stringify({
          error: { id: "test-error-id", msg: "Something went wrong" },
        }),
        { status: 500, headers: { "X-Retry-After": "0.1" } },
      ],
      [
        JSON.stringify({ success: true, data: "This is a test caption" }),
        { status: 200, headers: { "X-Retry-After": "0.1" } },
      ]
    )

    const actualCaption = await client.getCaption(
      "http://example.com/testImage"
    )

    // expect(fetchMock.mock.calls.length).toEqual(2);
    expect(actualCaption).toEqual("This is a test caption")
    // expect(fetchMock.mock.calls[0][0]).toEqual('/test-base-url/caption?url=http%3A%2F%2Fexample.com%2FtestImage');
    // expect(fetchMock.mock.calls[0][1].headers.Authorization).toEqual('Bearer test-token');
    // expect(fetchMock.mock.calls[1][0]).toEqual('/test-base-url/caption?url=http%3A%2F%2Fexample.com%2FtestImage');
    // expect(fetchMock.mock.calls[1][1].headers.Authorization).toEqual('Bearer test-token');
  })

  it("getCaptionNotReady", async () => {
    fetchMock.mockResponses(
      [
        JSON.stringify({ success: true }),
        {
          status: 202,
          headers: {
            Location: "/task?id=test-task-id",
            "X-Retry-After": "0.1",
          },
        },
      ],
      [
        JSON.stringify({ success: true }),
        {
          status: 202,
          headers: {
            Location: "/task?id=test-task-id",
            "X-Retry-After": "0.1",
          },
        },
      ],
      [
        JSON.stringify({ success: true, data: "This is a test caption" }),
        { status: 200 },
      ]
    )

    const actualCaption = await client.getCaption(
      "http://example.com/testImage"
    )

    // expect(fetchMock.mock.calls.length).toEqual(3);
    expect(actualCaption).toEqual("This is a test caption")
    // expect(fetchMock.mock.calls[0][0]).toEqual('/test-base-url/caption?url=http%3A%2F%2Fexample.com%2FtestImage');
    // expect(fetchMock.mock.calls[0][1].headers.Authorization).toEqual('Bearer test-token');
    // expect(fetchMock.mock.calls[1][0]).toEqual('/test-base-url/task?id=test-task-id');
    // expect(fetchMock.mock.calls[1][1].headers.Authorization).toEqual('Bearer test-token');
    // expect(fetchMock.mock.calls[2][0]).toEqual('/test-base-url/task?id=test-task-id');
    // expect(fetchMock.mock.calls[2][1].headers.Authorization).toEqual('Bearer test-token');
  })
})
