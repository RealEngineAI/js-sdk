export default class RealEngineAIClient {
    private static readonly PRODUCTION_ROOT_URL = "https://api.realengine.ai"

    private static readonly HTTP_TOO_MANY_REQUESTS = 429
    private static readonly HTTP_ACCEPTED = 202
    private static readonly SERVER_ERROR = 500

    private static readonly DEFAULT_WAIT_MS = 1000
    private static readonly MAX_BASE_WAIT_MS = 60000

    private static readonly LOCATION_HEADER = "Location"
    private static readonly RETRY_AFTER_HEADER = "X-Retry-After"

    private readonly rootUrl: string
    private readonly token: string
    private readonly maxRetries: number

    constructor(
        token: string,
        maxRetries = 5,
        rootUrl: string = RealEngineAIClient.PRODUCTION_ROOT_URL
    ) {
        if (!token) {
            throw new Error("token must not be null or empty")
        }

        if (maxRetries < 0) {
            throw new Error("maxRetries must be >= 0")
        }

        if (!rootUrl) {
            throw new Error("rootUrl must not be null or empty")
        }

        this.rootUrl = rootUrl.endsWith("/")
            ? rootUrl.substring(0, rootUrl.length - 1)
            : rootUrl
        this.token = token
        this.maxRetries = maxRetries
    }

    /**
     * Get the caption for the given image url
     * @param url The image url
     * @return The caption
     * @throws Error if the caption is empty
     * @throws RealEngineAIError if the request fails
     */
    public async getCaption(url: string): Promise<string> {
        const result = await this.call<string>(
            "/caption?url=" + encodeURIComponent(url)
        )
        if (!result) {
            throw new Error("The caption is empty")
        }

        return result
    }

    private async call<T>(path: string, retryCount = 0): Promise<T | undefined> {
        const url = this.getURL(path)
        // @ts-ignore
        const response = await fetch(url, {
            headers: {Authorization: `Bearer ${this.token}`},
        })
        const statusCode = response.status

        if (
            statusCode === RealEngineAIClient.HTTP_TOO_MANY_REQUESTS ||
            statusCode >= RealEngineAIClient.SERVER_ERROR
        ) {
            if (retryCount >= this.maxRetries) {
                throw new RealEngineAIError("Too many retries", statusCode, url)
            }

            const nextRetryCount = retryCount + 1
            const retryAfter = this.getRetryAfterMs(response, nextRetryCount)
            await sleep(retryAfter)

            return this.call(url, nextRetryCount)
        }

        if (statusCode === RealEngineAIClient.HTTP_ACCEPTED) {
            const location = response.headers.get(RealEngineAIClient.LOCATION_HEADER)
            if (!location) {
                throw new RealEngineAIError(
                    "The location header is empty",
                    statusCode,
                    url
                )
            }

            const retryAfter = this.getRetryAfterMs(response)
            await sleep(retryAfter)

            return this.call(location)
        }

        const data = (await response.json()) as RealEngineAIResponse<T>
        if (!data.success) {
            if (!data.error) {
                throw new RealEngineAIError("The error is empty", statusCode, url)
            }

            throw new RealEngineAIError(data.error, statusCode, url)
        }

        return data.data
    }

    // @ts-ignore
    private getRetryAfterMs(response: Response, retryCount = 0): number {
        const baseWaitTime =
            this.parseRetryAfterMs(response) * Math.pow(2, retryCount)
        const jitter = 0.5 + Math.random()
        return Math.min(RealEngineAIClient.MAX_BASE_WAIT_MS, baseWaitTime) * jitter
    }

    // @ts-ignore
    private parseRetryAfterMs(response: Response): number {
        const retryHeader = response.headers.get(
            RealEngineAIClient.RETRY_AFTER_HEADER
        )
        if (!retryHeader) {
            return RealEngineAIClient.DEFAULT_WAIT_MS
        }

        const seconds = parseFloat(retryHeader)
        if (isNaN(seconds)) {
            return RealEngineAIClient.DEFAULT_WAIT_MS
        }

        return seconds * 1000
    }

    private getURL(path: string): string {
        if (!path) {
            return this.rootUrl
        }

        if (path.startsWith("http")) {
            return path
        }

        if (!path.startsWith("/")) {
            path = "/" + path
        }

        return this.rootUrl + path
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export interface ErrorDTO {
    id: string
    msg: string
}

interface RealEngineAIResponse<T> {
    success: boolean
    data?: T
    error?: ErrorDTO
}

export class RealEngineAIError extends Error {
    errorId: string
    errorMessage: string
    httpStatus: number
    url: string

    constructor(message: string, httpStatus: number, url: string)
    constructor(error: ErrorDTO, httpStatus: number, url: string)
    constructor(
        messageOrError: string | ErrorDTO,
        httpStatus: number,
        url: string
    ) {
        super(
            typeof messageOrError === "string"
                ? `${messageOrError} http status: ${httpStatus}, url: ${url}`
                : `Error id: ${messageOrError.id}, message: ${messageOrError.msg}, http status: ${httpStatus}, url: ${url}`
        )

        if (typeof messageOrError === "string") {
            this.errorId = ""
            this.errorMessage = messageOrError
        } else {
            this.errorId = messageOrError.id
            this.errorMessage = messageOrError.msg
        }

        this.httpStatus = httpStatus
        this.url = url
    }
}
