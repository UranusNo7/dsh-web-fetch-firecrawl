# @uranusno7/dsh-web-fetch-firecrawl

A [Firecrawl](https://firecrawl.dev)-backed `WebFetchProvider` for the DeepSeek Harness [web capability seam](https://deepseek-harness.github.io/deepseek-harness/subsystems/web) (`ctx.web`), packaged as a standalone third-party plugin. It deep-scrapes a URL through Firecrawl's `POST /scrape` endpoint and returns the page's Markdown as a `text` body.

This is the plugin form of the upstream `@deepseek-ai/dsh-web-fetch-firecrawl` package, published under a personal scope so it can be installed into a DSH profile without waiting for an upstream npm release.

## Install

```sh
# into a DSH profile (via the desktop app's plugin command or the dsh CLI)
dsh plugin install @uranusno7/dsh-web-fetch-firecrawl
```

## Usage

Mount the plugin row in the profile composition (`cordis.yml` / `cordis.patch.yml`):

```yaml
- id: web-fetch-firecrawl
  name: '@uranusno7/dsh-web-fetch-firecrawl'
  config:
    apiKeyEnv: FIRECRAWL_API_KEY
```

The provider registers into `ctx.web` under id `firecrawl`. The deployment must select it as the fetch provider for the session's `web`/`tool-web` rows for the model's fetch calls to reach Firecrawl.

## Config

| Field | Default | Meaning |
|---|---|---|
| `apiKey` | (unset) | Literal Firecrawl API key. Prefer `apiKeyEnv` so no secret enters configuration files. |
| `apiKeyEnv` | `FIRECRAWL_API_KEY` | Credential reference resolved for each scrape, through the credentials service then the launch environment. A missing key fails the scrape with `WEB_PROVIDER_CREDENTIAL_MISSING`. |
| `baseURL` | `https://api.firecrawl.dev/v2` | Endpoint base; `/scrape` is appended. An unparseable value makes the provider unavailable. |
| `maxContentChars` | `100000` | Maximum Markdown characters kept from one scrape. |
| `onlyMainContent` | `true` | Ask Firecrawl to strip navigation and return only the main page content. |

The API key is resolved for each scrape (literal `apiKey` wins, else the credentials service, else the launch environment); a keyless scrape fails with `WEB_PROVIDER_CREDENTIAL_MISSING`. The request `url` is sent as Firecrawl's `url` with a fixed `formats: ['markdown']`. On success, `data.markdown` maps to a `text` body, capped to `maxContentChars` and flagged `truncated`; `metadata.statusCode` maps to the result's `statusCode` (the target page's status, defaulting to `200`); and `metadata.sourceURL` maps to the result's final `url`, falling back to the request URL when absent. Provider failures (HTTP errors, a `success: false` body, network failure, unparseable or wrong-shape bodies) surface as `WebError` `WEB_PROVIDER_ERROR`; an invalid or credential-bearing target URL surfaces as `WEB_INVALID_URL`/`WEB_BLOCKED_URL`; an aborted request surfaces as `WEB_ABORTED`. HTTP redirects on the credential-bearing API request are rejected before the `Location` target is contacted.

## Peer requirements

The host profile must provide: `@deepseek-ai/dsh-web` (the seam), `@deepseek-ai/dsh-credentials` (key resolution), `@deepseek-ai/dsh-launch-environment` (ambient key fallback), `@deepseek-ai/dsh-invariants` (runtime invariant), and `@deepseek-ai/cordis`.

## Model Experience

Indirectly, through `@deepseek-ai/dsh-tool-web`, which places this provider's `maxContentChars`-bounded Markdown under its fetch-result wrapper (`Fetched <url> (HTTP <status>)`) and retains provider failures while the Firecrawl API, key, and transport mechanics remain hidden.

#### KV Cache effect

Independent: the provider contributes no request tokens; the tool row that presents its results owns any prefix effect.

## Known Limitations and Deferred Work

- **Every requested URL is sent to Firecrawl's servers** — deep scraping runs on Firecrawl's network, not the harness's, so a URL naming an internal or private host is disclosed to a third party rather than fetched locally. Do not enable this provider where the model may name sensitive internal URLs.
- **Only Markdown is returned** — `formats: ['markdown']` is fixed, so raw HTML is never available; `onlyMainContent: true` can drop legitimate content Firecrawl does not classify as main content.
- **Standalone snapshot** — this package is a frozen copy of the upstream `web-fetch-firecrawl` source; when the upstream package is released to npm, prefer it and remove this plugin.

## License

MIT
