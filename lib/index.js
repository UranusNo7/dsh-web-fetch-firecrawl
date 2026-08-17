/**
 * `@uranusno7/dsh-web-fetch-firecrawl`: registers Firecrawl-backed search and fetch providers
 * with `ctx.web`. A function/namespace plugin (NOT a default-export service): it registers into
 * the seam's provider registries, while the `ctx.web` key remains owned by `@deepseek-ai/dsh-web`.
 *
 * @module @deepseek-ai/dsh-web-fetch-firecrawl
 */
import { credentialRef } from '@deepseek-ai/dsh-credentials';
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment';
import z from '@deepseek-ai/schemastery';
import { FirecrawlFetchProvider, FIRECRAWL_DEFAULT_BASE_URL, FIRECRAWL_DEFAULT_MAX_CONTENT_CHARS, } from "./provider.js";
import { FIRECRAWL_DEFAULT_KEY_COOLDOWN_MS, FirecrawlApiKeyPool, } from "./key-pool.js";
import { FirecrawlSearchProvider } from "./search.js";
export { FIRECRAWL_DEFAULT_BASE_URL, FIRECRAWL_DEFAULT_MAX_CONTENT_CHARS, FIRECRAWL_FETCH_PROVIDER_ID, FirecrawlFetchProvider, } from "./provider.js";
export { FIRECRAWL_DEFAULT_SEARCH_MAX_RESULTS, FIRECRAWL_SEARCH_PROVIDER_ID, FirecrawlSearchProvider, mapFirecrawlSearchResponse, } from "./search.js";
export { FIRECRAWL_DEFAULT_KEY_COOLDOWN_MS, FirecrawlApiKeyPool, FirecrawlCredentialMissingError, FirecrawlHttpError, FirecrawlKeyPoolCooldownError, isKeyRotationStatus, } from "./key-pool.js";
/** Cordis plugin name used by loader diagnostics. */
export const name = 'web-fetch-firecrawl';
/** The web seam this provider registers into. */
export const inject = ['web'];
const DEFAULT_API_KEY_ENV = 'FIRECRAWL_API_KEY';
export const Config = z.object({
    apiKey: z.string().role('secret'),
    apiKeyEnv: z.string().role('credential-ref').default(DEFAULT_API_KEY_ENV),
    apiKeyEnvs: z.array(z.string().role('credential-ref')),
    search: z.boolean().default(false),
    keyCooldownMs: z.number().step(1).min(1).default(FIRECRAWL_DEFAULT_KEY_COOLDOWN_MS),
    baseURL: z.string(),
    maxContentChars: z.number().step(1).min(1),
    onlyMainContent: z.boolean(),
});
/** Register the Firecrawl fetch provider and optional search provider with `ctx.web`. */
export function apply(ctx, config) {
    const literalApiKey = config.apiKey !== undefined && config.apiKey.length > 0
        ? config.apiKey
        : undefined;
    const apiKeyRefs = normalizeApiKeyRefs(config);
    const pool = new FirecrawlApiKeyPool({
        ...literalApiKey === undefined ? {} : { apiKey: literalApiKey },
        apiKeyRefs,
        resolveApiKey: async (reference) => resolveCredential(ctx, reference),
        cooldownMs: config.keyCooldownMs ?? FIRECRAWL_DEFAULT_KEY_COOLDOWN_MS,
    });
    const baseURL = config.baseURL ?? FIRECRAWL_DEFAULT_BASE_URL;
    ctx.web.registerFetchProvider(new FirecrawlFetchProvider({
        keyPool: pool,
        apiKeyEnv: credentialRef(config.apiKeyEnv ?? DEFAULT_API_KEY_ENV),
        baseURL,
        maxContentChars: config.maxContentChars ?? FIRECRAWL_DEFAULT_MAX_CONTENT_CHARS,
        onlyMainContent: config.onlyMainContent ?? true,
    }));
    if (config.search === true)
        ctx.web.registerSearchProvider(new FirecrawlSearchProvider({ keyPool: pool, baseURL }));
}
function normalizeApiKeyRefs(config) {
    const refs = config.apiKeyEnvs !== undefined && config.apiKeyEnvs.length > 0
        ? config.apiKeyEnvs
        : [config.apiKeyEnv ?? DEFAULT_API_KEY_ENV];
    return [...new Set(refs.filter((reference) => reference.length > 0))];
}
async function resolveCredential(ctx, reference) {
    const ref = credentialRef(reference);
    const credentials = ctx.get('credentials');
    if (credentials !== undefined)
        return (await credentials.resolve(ref))?.value;
    // Without the seam the launch environment is the whole credential plane.
    const ambient = launchEnvironmentOf(ctx).get(ref);
    return ambient !== undefined && ambient.value.length > 0 ? ambient.value : undefined;
}
