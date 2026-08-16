/**
 * `FirecrawlFetchProvider`: a `WebFetchProvider` that deep-scrapes a URL through Firecrawl's
 * `POST /scrape` endpoint and returns the page's Markdown as a `text` body. Firecrawl fetches the
 * page server-side (rendering JavaScript), so this provider never contacts the target URL itself
 * and never follows the page's redirects locally — `metadata.sourceURL` reports the final URL.
 * @module @deepseek-ai/dsh-web-fetch-firecrawl/provider
 */
import type { WebFetchProvider, WebFetchRequest, WebFetchResult } from '@deepseek-ai/dsh-web';
import type { CredentialRef } from '@deepseek-ai/dsh-credentials';
import type { FirecrawlScrapeResponse } from './types.ts';
/** Stable id this provider registers under. */
export declare const FIRECRAWL_FETCH_PROVIDER_ID = "firecrawl";
/** Default Firecrawl API base; `/scrape` is the operation. */
export declare const FIRECRAWL_DEFAULT_BASE_URL = "https://api.firecrawl.dev/v2";
/** Default maximum Markdown characters kept from one scrape. */
export declare const FIRECRAWL_DEFAULT_MAX_CONTENT_CHARS = 100000;
/** Resolved provider options (the plugin's `apply` supplies credential and constant defaults). */
export interface FirecrawlFetchProviderOptions {
    /** Literal Firecrawl API key; when present it wins over {@link resolveApiKey}. */
    apiKey?: string;
    /** Resolve the current Firecrawl API key for one scrape operation. */
    resolveApiKey?: () => Promise<string | undefined>;
    /** Credential reference named by missing-credential diagnostics. */
    apiKeyEnv?: CredentialRef;
    /** Endpoint base; `/scrape` is appended. */
    baseURL: string;
    /** Maximum Markdown characters kept from one scrape (truncation is flagged). */
    maxContentChars: number;
    /** Ask Firecrawl to strip navigation and return only the main page content. */
    onlyMainContent: boolean;
}
/**
 * Validate a scrape target URL before it is sent to Firecrawl: http(s) only, no embedded
 * credentials, parseable. Throws {@link WebError} `WEB_INVALID_URL` or `WEB_BLOCKED_URL`.
 *
 * @param input - the raw URL string from the fetch request.
 * @returns the parsed URL.
 */
export declare function validateFirecrawlUrl(input: string): URL;
/**
 * Map a Firecrawl scrape response to a normalized fetch result. `markdown` is a `text` body;
 * `metadata.statusCode` is the target page's status (a non-2xx page is a result, not an error),
 * and `metadata.sourceURL` is the final URL after Firecrawl followed the page's redirects. The
 * returned Markdown is capped to `maxContentChars` and flagged `truncated`.
 *
 * @param response - the parsed `POST /scrape` response body.
 * @param requestUrl - the URL the caller asked to scrape (fallback when `sourceURL` is absent).
 * @param maxContentChars - inclusive bound on the returned Markdown length.
 * @returns the normalized fetch result.
 */
export declare function mapFirecrawlResponse(response: FirecrawlScrapeResponse, requestUrl: string, maxContentChars: number): WebFetchResult;
/** The Firecrawl-backed fetch provider; HTTP redirects fail as `WEB_PROVIDER_ERROR`. */
export declare class FirecrawlFetchProvider implements WebFetchProvider {
    private readonly options;
    readonly id = "firecrawl";
    constructor(options: FirecrawlFetchProviderOptions);
    available(): boolean;
    fetch(request: WebFetchRequest, signal?: AbortSignal): Promise<WebFetchResult>;
    /**
     * Resolve one operation's credential without retaining it on the provider.
     * @param signal - abort signal for the surrounding fetch.
     * @returns the resolved key.
     */
    private apiKey;
}
