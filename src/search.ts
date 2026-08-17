/**
 * `FirecrawlSearchProvider`: a `WebSearchProvider` backed by Firecrawl's `POST /search` endpoint.
 * @module @uranusno7/dsh-web-fetch-firecrawl/search
 */

import { WebError } from '@deepseek-ai/dsh-web'
import type { WebSearchProvider, WebSearchRequest, WebSearchResult } from '@deepseek-ai/dsh-web'
import {
  FirecrawlApiKeyPool,
  FirecrawlCredentialMissingError,
  FirecrawlHttpError,
  FirecrawlKeyPoolCooldownError,
} from './key-pool.ts'
import type { FirecrawlSearchResponse } from './types.ts'

/** Stable id this provider registers under for the search capability. */
export const FIRECRAWL_SEARCH_PROVIDER_ID = 'firecrawl'

/** Default number of results requested when the seam omits a limit. */
export const FIRECRAWL_DEFAULT_SEARCH_MAX_RESULTS = 8

/** Resolved options for the Firecrawl search provider. */
export interface FirecrawlSearchProviderOptions {
  /** Shared account/key pool used by search and fetch. */
  readonly keyPool: FirecrawlApiKeyPool
  /** Firecrawl API base; `/search` is appended. */
  readonly baseURL: string
}

/** Search provider that maps Firecrawl `data.web[]` results to DSH sources. */
export class FirecrawlSearchProvider implements WebSearchProvider {
  readonly id = FIRECRAWL_SEARCH_PROVIDER_ID

  /**
   * @param options - shared key pool and Firecrawl endpoint.
   */
  constructor(private readonly options: FirecrawlSearchProviderOptions) {}

  /** Cheap local usability check; credential resolution and network calls happen during search. */
  available(): boolean {
    return this.options.keyPool.available() && URL.canParse(this.options.baseURL)
  }

  /**
   * Search Firecrawl and normalize its web results.
   *
   * @param request - query and optional DSH result bound.
   * @param signal - optional cancellation signal.
   * @returns normalized citeable sources.
   */
  async search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult> {
    throwIfAborted(signal)
    try {
      const response = await this.options.keyPool.run((apiKey) => this.request(apiKey, request, signal))
      return mapFirecrawlSearchResponse(response)
    } catch (error: unknown) {
      if (error instanceof WebError) throw error
      if (error instanceof FirecrawlCredentialMissingError) {
        throw new WebError(
          'Firecrawl search has no configured API key; store one through the credentials service or launch environment',
          'WEB_PROVIDER_CREDENTIAL_MISSING',
        )
      }
      if (error instanceof FirecrawlKeyPoolCooldownError) {
        throw new WebError('all configured Firecrawl API keys are cooling down', 'WEB_PROVIDER_ERROR')
      }
      if (error instanceof FirecrawlHttpError) {
        throw new WebError(`Firecrawl search request failed: ${error.message}`, 'WEB_PROVIDER_ERROR')
      }
      if (signal?.aborted === true || isAbortError(error)) {
        throw new WebError('Firecrawl search aborted', 'WEB_ABORTED', { cause: error })
      }
      throw new WebError(`Firecrawl search request failed: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
    }
  }

  private async request(
    apiKey: string,
    request: WebSearchRequest,
    signal?: AbortSignal,
  ): Promise<FirecrawlSearchResponse> {
    throwIfAborted(signal)
    let response: Response
    try {
      response = await fetch(`${this.options.baseURL}/search`, {
        method: 'POST',
        redirect: 'error',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
          accept: 'application/json',
          'user-agent': 'deepseek-harness/0.2.0',
        },
        body: JSON.stringify({
          query: request.query,
          limit: request.maxResults ?? FIRECRAWL_DEFAULT_SEARCH_MAX_RESULTS,
        }),
        ...signal !== undefined ? { signal } : {},
      })
    } catch (error: unknown) {
      if (signal?.aborted === true || isAbortError(error)) {
        throw new WebError('Firecrawl search aborted', 'WEB_ABORTED', { cause: error })
      }
      throw error
    }

    if (!response.ok) throw new FirecrawlHttpError(response.status, await responseErrorMessage(response, signal))

    let payload: FirecrawlSearchResponse
    try {
      payload = await response.json() as FirecrawlSearchResponse
    } catch (error: unknown) {
      if (signal?.aborted === true || isAbortError(error)) {
        throw new WebError('Firecrawl search aborted', 'WEB_ABORTED', { cause: error })
      }
      throw error
    }
    if (payload.success === false) {
      throw new FirecrawlHttpError(response.status, payload.error ?? payload.message ?? 'Firecrawl search failed')
    }
    return payload
  }
}

/** Map Firecrawl's web-only result group to the portable DSH source list. */
export function mapFirecrawlSearchResponse(response: FirecrawlSearchResponse): WebSearchResult {
  const sources = (response.data?.web ?? [])
    .filter((item) => typeof item.url === 'string' && item.url.length > 0)
    .map((item) => ({
      url: item.url,
      ...item.title === undefined || item.title.length === 0 ? {} : { title: item.title },
      ...item.description === undefined || item.description.length === 0 ? {} : { snippet: item.description },
      ...item.publishedDate === undefined || item.publishedDate.length === 0 ? {} : { publishedAt: item.publishedDate },
    }))
  return { sources, truncated: false }
}

async function responseErrorMessage(response: Response, signal?: AbortSignal): Promise<string> {
  try {
    const payload = await response.json() as { error?: string; message?: string }
    return payload.error ?? payload.message ?? `Firecrawl API error (HTTP ${response.status})`
  } catch (error: unknown) {
    if (signal?.aborted === true || isAbortError(error)) {
      throw new WebError('Firecrawl search aborted', 'WEB_ABORTED', { cause: error })
    }
    return `Firecrawl API error (HTTP ${response.status})`
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted === true) throw new WebError('Firecrawl search aborted', 'WEB_ABORTED', { cause: signal.reason })
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}
