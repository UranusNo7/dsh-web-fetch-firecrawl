/**
 * `FirecrawlSearchProvider`: a `WebSearchProvider` backed by Firecrawl's `POST /search` endpoint.
 * @module @uranusno7/dsh-web-fetch-firecrawl/search
 */
import type { WebSearchProvider, WebSearchRequest, WebSearchResult } from '@deepseek-ai/dsh-web';
import { FirecrawlApiKeyPool } from './key-pool.ts';
import type { FirecrawlSearchResponse } from './types.ts';
/** Stable id this provider registers under for the search capability. */
export declare const FIRECRAWL_SEARCH_PROVIDER_ID = "firecrawl";
/** Default number of results requested when the seam omits a limit. */
export declare const FIRECRAWL_DEFAULT_SEARCH_MAX_RESULTS = 8;
/** Resolved options for the Firecrawl search provider. */
export interface FirecrawlSearchProviderOptions {
    /** Shared account/key pool used by search and fetch. */
    readonly keyPool: FirecrawlApiKeyPool;
    /** Firecrawl API base; `/search` is appended. */
    readonly baseURL: string;
}
/** Search provider that maps Firecrawl `data.web[]` results to DSH sources. */
export declare class FirecrawlSearchProvider implements WebSearchProvider {
    private readonly options;
    readonly id = "firecrawl";
    /**
     * @param options - shared key pool and Firecrawl endpoint.
     */
    constructor(options: FirecrawlSearchProviderOptions);
    /** Cheap local usability check; credential resolution and network calls happen during search. */
    available(): boolean;
    /**
     * Search Firecrawl and normalize its web results.
     *
     * @param request - query and optional DSH result bound.
     * @param signal - optional cancellation signal.
     * @returns normalized citeable sources.
     */
    search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult>;
    private request;
}
/** Map Firecrawl's web-only result group to the portable DSH source list. */
export declare function mapFirecrawlSearchResponse(response: FirecrawlSearchResponse): WebSearchResult;
