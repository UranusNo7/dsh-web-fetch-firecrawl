/**
 * `@uranusno7/dsh-web-fetch-firecrawl`: registers Firecrawl-backed search and fetch providers
 * with `ctx.web`. A function/namespace plugin (NOT a default-export service): it registers into
 * the seam's provider registries, while the `ctx.web` key remains owned by `@deepseek-ai/dsh-web`.
 *
 * @module @deepseek-ai/dsh-web-fetch-firecrawl
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export { FIRECRAWL_DEFAULT_BASE_URL, FIRECRAWL_DEFAULT_MAX_CONTENT_CHARS, FIRECRAWL_FETCH_PROVIDER_ID, FirecrawlFetchProvider, } from './provider.ts';
export type { FirecrawlFetchProviderOptions } from './provider.ts';
export { FIRECRAWL_DEFAULT_SEARCH_MAX_RESULTS, FIRECRAWL_SEARCH_PROVIDER_ID, FirecrawlSearchProvider, mapFirecrawlSearchResponse, } from './search.ts';
export type { FirecrawlSearchProviderOptions } from './search.ts';
export { FIRECRAWL_DEFAULT_KEY_COOLDOWN_MS, FirecrawlApiKeyPool, FirecrawlCredentialMissingError, FirecrawlHttpError, FirecrawlKeyPoolCooldownError, isKeyRotationStatus, } from './key-pool.ts';
export type { FirecrawlApiKeyPoolOptions } from './key-pool.ts';
export type { FirecrawlSearchResponse, FirecrawlSearchItem } from './types.ts';
/** Cordis plugin name used by loader diagnostics. */
export declare const name = "web-fetch-firecrawl";
/** The web seam this provider registers into. */
export declare const inject: string[];
/** Plugin config (all optional — `apply` fills env-var and constant defaults). */
export interface Config {
    /** Literal Firecrawl API key; prefer credential references so no secret enters configuration files. */
    apiKey?: string;
    /** Single credential reference used when `apiKeyEnvs` is omitted. */
    apiKeyEnv?: string;
    /** Multiple credential references used as a round-robin account pool. */
    apiKeyEnvs?: string[];
    /** Enable the Firecrawl-backed `web_search` provider in addition to fetch. */
    search?: boolean;
    /** Skip a key for this many milliseconds after 401/402/403/429. */
    keyCooldownMs?: number;
    /** Endpoint base; `/scrape` and `/search` are appended. Defaults to the public API. */
    baseURL?: string;
    /** Maximum Markdown characters kept from one scrape. Defaults to 100000. */
    maxContentChars?: number;
    /** Ask Firecrawl to return only the main page content. Defaults to true. */
    onlyMainContent?: boolean;
}
export declare const Config: z<Config>;
/** Register the Firecrawl fetch provider and optional search provider with `ctx.web`. */
export declare function apply(ctx: Context, config: Config): void;
