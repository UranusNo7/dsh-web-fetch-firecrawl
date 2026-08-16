/**
 * `@deepseek-ai/dsh-web-fetch-firecrawl`: registers a Firecrawl-backed `WebFetchProvider`
 * with `ctx.web`. A function/namespace plugin (NOT a default-export service): it registers INTO
 * the seam's fetch registry, exactly as `@deepseek-ai/dsh-web-fetch-http` registers the local
 * HTTP fetcher. The `ctx.web` key is owned by `@deepseek-ai/dsh-web`.
 *
 * @module @deepseek-ai/dsh-web-fetch-firecrawl
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
export { FIRECRAWL_DEFAULT_BASE_URL, FIRECRAWL_DEFAULT_MAX_CONTENT_CHARS, FIRECRAWL_FETCH_PROVIDER_ID, FirecrawlFetchProvider, } from './provider.ts';
export type { FirecrawlFetchProviderOptions } from './provider.ts';
/** Cordis plugin name used by loader diagnostics. */
export declare const name = "web-fetch-firecrawl";
/** The web seam this provider registers into. */
export declare const inject: string[];
/** Plugin config (all optional — `apply` fills env-var and constant defaults). */
export interface Config {
    /** Literal Firecrawl API key; prefer {@link apiKeyEnv} so no secret enters configuration files. */
    apiKey?: string;
    /** Credential reference resolved for each scrape; defaults to `FIRECRAWL_API_KEY`. */
    apiKeyEnv?: string;
    /** Endpoint base; `/scrape` is appended. Defaults to the public API. */
    baseURL?: string;
    /** Maximum Markdown characters kept from one scrape. Defaults to 100000. */
    maxContentChars?: number;
    /** Ask Firecrawl to return only the main page content. Defaults to true. */
    onlyMainContent?: boolean;
}
export declare const Config: z<Config>;
/** Register the Firecrawl fetch provider with `ctx.web`. */
export declare function apply(ctx: Context, config: Config): void;
