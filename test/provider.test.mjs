import assert from 'node:assert/strict'
import test from 'node:test'
import {
  FirecrawlApiKeyPool,
  FirecrawlSearchProvider,
  apply,
  mapFirecrawlSearchResponse,
} from '../lib/index.js'

const originalFetch = globalThis.fetch

test.afterEach(() => {
  globalThis.fetch = originalFetch
})

test('maps Firecrawl web results to DSH sources', () => {
  const result = mapFirecrawlSearchResponse({
    success: true,
    data: {
      web: [{
        url: 'https://example.com',
        title: 'Example',
        description: 'An example result',
        publishedDate: '2026-01-01',
      }],
    },
  })
  assert.deepEqual(result, {
    sources: [{
      url: 'https://example.com',
      title: 'Example',
      snippet: 'An example result',
      publishedAt: '2026-01-01',
    }],
    truncated: false,
  })
})

test('rotates the shared key pool after a credit failure', async () => {
  const authorizationHeaders = []
  globalThis.fetch = async (_input, init) => {
    authorizationHeaders.push(new Headers(init?.headers).get('authorization'))
    if (authorizationHeaders.length === 1) {
      return new Response(JSON.stringify({ error: 'credits exhausted' }), { status: 402 })
    }
    return new Response(JSON.stringify({
      success: true,
      data: { web: [{ url: 'https://example.com', title: 'Example' }] },
    }), { status: 200, headers: { 'content-type': 'application/json' } })
  }

  const pool = new FirecrawlApiKeyPool({
    apiKeyRefs: ['FIRECRAWL_API_KEY_1', 'FIRECRAWL_API_KEY_2'],
    resolveApiKey: async (reference) => `${reference}-secret`,
    cooldownMs: 60_000,
  })
  const provider = new FirecrawlSearchProvider({ keyPool: pool, baseURL: 'https://api.firecrawl.dev/v2' })
  const result = await provider.search({ query: 'DeepSeek Harness', maxResults: 1 })

  assert.deepEqual(authorizationHeaders, [
    'Bearer FIRECRAWL_API_KEY_1-secret',
    'Bearer FIRECRAWL_API_KEY_2-secret',
  ])
  assert.deepEqual(result.sources, [{ url: 'https://example.com', title: 'Example' }])
})

test('plugin registers fetch and optional search providers', () => {
  const registered = { fetch: [], search: [] }
  const ctx = {
    web: {
      registerFetchProvider(provider) { registered.fetch.push(provider) },
      registerSearchProvider(provider) { registered.search.push(provider) },
    },
    get() { return undefined },
  }

  apply(ctx, {
    apiKeyEnvs: ['FIRECRAWL_API_KEY_1', 'FIRECRAWL_API_KEY_2'],
    search: true,
    keyCooldownMs: 60_000,
  })

  assert.deepEqual(registered.fetch.map((provider) => provider.id), ['firecrawl'])
  assert.deepEqual(registered.search.map((provider) => provider.id), ['firecrawl'])
})
