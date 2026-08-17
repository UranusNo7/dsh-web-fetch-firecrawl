# @uranusno7/dsh-web-fetch-firecrawl

[Firecrawl](https://firecrawl.dev)-backed search and fetch providers for the DeepSeek Harness [web capability seam](https://deepseek-harness.github.io/deepseek-harness/subsystems/web) (`ctx.web`), packaged as a standalone third-party plugin. It searches through Firecrawl's `POST /search` endpoint and deep-scrapes URLs through `POST /scrape`.

This is the plugin form of the upstream `@deepseek-ai/dsh-web-fetch-firecrawl` package, published under a personal scope so it can be installed into a DSH profile without waiting for an upstream npm release. The GitHub distribution includes built `lib/` artifacts so a consumer does not need to run TypeScript during installation.

## Install

```sh
# into a desktop DSH profile from GitHub
pnpm --dir "$DSH_HOME/profiles/desktop" add github:UranusNo7/dsh-web-fetch-firecrawl
```

## Usage

Mount the plugin row in the profile composition (`cordis.yml` / `cordis.patch.yml`):

```yaml
- id: web-search-deepseek
  disabled: true

- id: web
  config:
    searchProvider: firecrawl
    fetchProvider: firecrawl

- id: tool-web
  config:
    search: true
    fetch: true

- insert:
    - id: web-fetch-firecrawl
      name: '@uranusno7/dsh-web-fetch-firecrawl'
      config:
        search: true
        apiKeyEnvs:
          - FIRECRAWL_API_KEY
          - FIRECRAWL_API_KEY_2
        keyCooldownMs: 300000
```

The plugin registers both providers under id `firecrawl`: `registerSearchProvider` for `web_search` when `search: true`, and `registerFetchProvider` for `web_fetch`. The profile must select `firecrawl` for both capabilities. Disable the DeepSeek search row when the deployment must not call that provider.

## Config

| Field | Default | Meaning |
|---|---|---|
| `apiKey` | (unset) | Literal Firecrawl API key. Prefer credential references so no secret enters configuration files. |
| `apiKeyEnv` | `FIRECRAWL_API_KEY` | One credential reference used when `apiKeyEnvs` is omitted. |
| `apiKeyEnvs` | (uses `apiKeyEnv`) | Multiple credential references for the account pool. Keys are resolved per operation and never written to the plugin configuration. |
| `search` | `false` | Register the Firecrawl-backed `web_search` provider. Keep false for fetch-only deployments. |
| `keyCooldownMs` | `300000` | Time a key is skipped after HTTP `401`, `402`, `403`, or `429`. |
| `baseURL` | `https://api.firecrawl.dev/v2` | Endpoint base; `/scrape` and `/search` are appended. |
| `maxContentChars` | `100000` | Maximum Markdown characters kept from one scrape. |
| `onlyMainContent` | `true` | Ask Firecrawl to strip navigation and return only the main page content. |

When `apiKeyEnvs` contains multiple references, search and fetch share one round-robin pool. A key that returns an authentication, credit, permission, or rate-limit response is cooled down and the request retries with the next resolved key. Only references are stored in configuration; values are resolved for each operation through the credentials service, then the launch environment. Use only accounts you own or are authorized to use, and follow Firecrawl's terms and quota rules.

Search sends `{ query, limit }` to `POST /search` and maps `data.web[]` (`url`, `title`, `description`, `publishedDate`) to DSH sources. Fetch sends the URL with `formats: ['markdown']` to `POST /scrape`; `data.markdown` maps to a `text` body, capped to `maxContentChars` and flagged `truncated`; `metadata.statusCode` maps to the result's `statusCode`; and `metadata.sourceURL` maps to its final `url`. Provider failures surface as `WebError` `WEB_PROVIDER_ERROR`; missing credentials use `WEB_PROVIDER_CREDENTIAL_MISSING`; invalid or credential-bearing target URLs use `WEB_INVALID_URL`/`WEB_BLOCKED_URL`; and aborted requests use `WEB_ABORTED`.

## Peer requirements

The host profile must provide: `@deepseek-ai/dsh-web` (the seam), `@deepseek-ai/dsh-credentials` (key resolution), `@deepseek-ai/dsh-launch-environment` (ambient key fallback), `@deepseek-ai/dsh-invariants` (runtime invariant), and `@deepseek-ai/cordis`.

## Model Experience

Indirectly, through `@deepseek-ai/dsh-tool-web`, which places this provider's `maxContentChars`-bounded Markdown under its fetch-result wrapper (`Fetched <url> (HTTP <status>)`) and retains provider failures while the Firecrawl API, key, and transport mechanics remain hidden.

#### KV Cache effect

Independent: the provider contributes no request tokens; the tool row that presents its results owns any prefix effect.

## Known Limitations and Deferred Work

- **Every requested URL is sent to Firecrawl's servers** — deep scraping runs on Firecrawl's network, not the harness's, so a URL naming an internal or private host is disclosed to a third party rather than fetched locally. Do not enable this provider where the model may name sensitive internal URLs.
- **Search uses web results only** — the provider maps Firecrawl's `data.web` group; image/news result groups are not exposed through the DSH web seam.
- **Only Markdown is returned for fetch** — `formats: ['markdown']` is fixed, so raw HTML is never available; `onlyMainContent: true` can drop legitimate content Firecrawl does not classify as main content.
- **The key pool is not an account manager** — it rotates only among configured credential references and does not create accounts, evade quotas, or guarantee a monthly free allowance.
- **Standalone snapshot** — this package is a frozen copy of the upstream `web-fetch-firecrawl` source; when the upstream package is released to npm, prefer it and remove this plugin.

## License

MIT
