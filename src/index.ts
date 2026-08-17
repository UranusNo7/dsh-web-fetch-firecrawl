/**
 * `@uranusno7/dsh-web-fetch-firecrawl`: registers Firecrawl-backed search and fetch providers
 * with `ctx.web`. A function/namespace plugin (NOT a default-export service): it registers into
 * the seam's provider registries, while the `ctx.web` key remains owned by `@deepseek-ai/dsh-web`.
 *
 * @module @deepseek-ai/dsh-web-fetch-firecrawl
 */

import type { Context } from '@deepseek-ai/cordis'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import {
  FirecrawlFetchProvider,
  FIRECRAWL_DEFAULT_BASE_URL,
  FIRECRAWL_DEFAULT_MAX_CONTENT_CHARS,
} from './provider.ts'
import {
  FIRECRAWL_DEFAULT_KEY_COOLDOWN_MS,
  FirecrawlApiKeyPool,
} from './key-pool.ts'
import { FirecrawlSearchProvider } from './search.ts'

export {
  FIRECRAWL_DEFAULT_BASE_URL,
  FIRECRAWL_DEFAULT_MAX_CONTENT_CHARS,
  FIRECRAWL_FETCH_PROVIDER_ID,
  FirecrawlFetchProvider,
} from './provider.ts'
export type { FirecrawlFetchProviderOptions } from './provider.ts'
export {
  FIRECRAWL_DEFAULT_SEARCH_MAX_RESULTS,
  FIRECRAWL_SEARCH_PROVIDER_ID,
  FirecrawlSearchProvider,
  mapFirecrawlSearchResponse,
} from './search.ts'
export type { FirecrawlSearchProviderOptions } from './search.ts'
export {
  FIRECRAWL_DEFAULT_KEY_COOLDOWN_MS,
  FirecrawlApiKeyPool,
  FirecrawlCredentialMissingError,
  FirecrawlHttpError,
  FirecrawlKeyPoolCooldownError,
  isKeyRotationStatus,
} from './key-pool.ts'
export type { FirecrawlApiKeyPoolOptions } from './key-pool.ts'
export type { FirecrawlSearchResponse, FirecrawlSearchItem } from './types.ts'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'web-fetch-firecrawl'

/** The web seam this provider registers into. */
export const inject = ['web']

const DEFAULT_API_KEY_ENV = 'FIRECRAWL_API_KEY'

/** Plugin config (all optional — `apply` fills env-var and constant defaults). */
export interface Config {
  /** Literal Firecrawl API key; prefer credential references so no secret enters configuration files. */
  apiKey?: string
  /** Single credential reference used when `apiKeyEnvs` is omitted. */
  apiKeyEnv?: string
  /** Multiple credential references used as a round-robin account pool. */
  apiKeyEnvs?: string[]
  /** Enable the Firecrawl-backed `web_search` provider in addition to fetch. */
  search?: boolean
  /** Skip a key for this many milliseconds after 401/402/403/429. */
  keyCooldownMs?: number
  /** Endpoint base; `/scrape` and `/search` are appended. Defaults to the public API. */
  baseURL?: string
  /** Maximum Markdown characters kept from one scrape. Defaults to 100000. */
  maxContentChars?: number
  /** Ask Firecrawl to return only the main page content. Defaults to true. */
  onlyMainContent?: boolean
}

export const Config: z<Config> = z.object({
  apiKey: z.string().role('secret'),
  apiKeyEnv: z.string().role('credential-ref').default(DEFAULT_API_KEY_ENV),
  apiKeyEnvs: z.array(z.string().role('credential-ref')),
  search: z.boolean().default(false),
  keyCooldownMs: z.number().step(1).min(1).default(FIRECRAWL_DEFAULT_KEY_COOLDOWN_MS),
  baseURL: z.string(),
  maxContentChars: z.number().step(1).min(1),
  onlyMainContent: z.boolean(),
})

/** Register the Firecrawl fetch provider and optional search provider with `ctx.web`. */
export function apply(ctx: Context, config: Config): void {
  const literalApiKey = config.apiKey !== undefined && config.apiKey.length > 0
    ? config.apiKey
    : undefined
  const apiKeyRefs = normalizeApiKeyRefs(config)
  const pool = new FirecrawlApiKeyPool({
    ...literalApiKey === undefined ? {} : { apiKey: literalApiKey },
    apiKeyRefs,
    resolveApiKey: async (reference) => resolveCredential(ctx, reference),
    cooldownMs: config.keyCooldownMs ?? FIRECRAWL_DEFAULT_KEY_COOLDOWN_MS,
  })
  const baseURL = config.baseURL ?? FIRECRAWL_DEFAULT_BASE_URL

  ctx.web.registerFetchProvider(new FirecrawlFetchProvider({
    keyPool: pool,
    apiKeyEnv: credentialRef(config.apiKeyEnv ?? DEFAULT_API_KEY_ENV),
    baseURL,
    maxContentChars: config.maxContentChars ?? FIRECRAWL_DEFAULT_MAX_CONTENT_CHARS,
    onlyMainContent: config.onlyMainContent ?? true,
  }))
  if (config.search === true) ctx.web.registerSearchProvider(new FirecrawlSearchProvider({ keyPool: pool, baseURL }))
}

function normalizeApiKeyRefs(config: Config): string[] {
  const refs = config.apiKeyEnvs !== undefined && config.apiKeyEnvs.length > 0
    ? config.apiKeyEnvs
    : [config.apiKeyEnv ?? DEFAULT_API_KEY_ENV]
  return [...new Set(refs.filter((reference) => reference.length > 0))]
}

async function resolveCredential(ctx: Context, reference: string): Promise<string | undefined> {
  const ref = credentialRef(reference)
  const credentials = ctx.get('credentials')
  if (credentials !== undefined) return (await credentials.resolve(ref))?.value
  // Without the seam the launch environment is the whole credential plane.
  const ambient = launchEnvironmentOf(ctx).get(ref)
  return ambient !== undefined && ambient.value.length > 0 ? ambient.value : undefined
}
