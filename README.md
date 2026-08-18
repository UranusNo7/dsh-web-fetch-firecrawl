# @uranusno7/dsh-web-fetch-firecrawl

面向 DeepSeek Harness 的 Firecrawl Web 插件。它把 Firecrawl 接入 DSH 的 `ctx.web`，同时提供 `web_search` 搜索和 `web_fetch` 网页抓取，因此 DSH 可以不依赖 DeepSeek 官方搜索 provider。

项目地址：<https://github.com/UranusNo7/dsh-web-fetch-firecrawl>

## 项目作用

插件注册两个 provider，provider id 都是 `firecrawl`：

- **搜索**：调用 Firecrawl `POST /v2/search`，把 `data.web[]` 转换为 DSH 的来源列表。
- **抓取**：调用 Firecrawl `POST /v2/scrape`，把页面 Markdown 转换为 DSH 的 `web_fetch` 结果。
- **账号池**：search 和 fetch 共享 API key pool，按凭据引用名轮询使用 key。
- **故障切换**：某个 key 返回 `401`、`402`、`403` 或 `429` 时，插件冷却该 key 并尝试下一个 key。

插件只负责 provider，不负责创建 Firecrawl 账号、申请 API key 或绕过额度限制。只使用你拥有或获授权使用的账号，并遵守 [Firecrawl 服务条款](https://www.firecrawl.dev/terms)。

## 安装到 DSH Desktop profile

先退出 DSH Desktop，然后在包含 DSH profile 的环境中执行：

```sh
pnpm --dir "$DSH_HOME/profiles/desktop" add github:UranusNo7/dsh-web-fetch-firecrawl
```

Windows 默认的 `DSH_HOME` 通常是：

```text
C:\Users\<用户名>\.dsh
```

如果 GitHub git 下载不稳定，可以使用固定 commit 的 codeload 地址。固定版本可以保证构建结果可复现：

```sh
pnpm --dir "$DSH_HOME/profiles/desktop" add https://codeload.github.com/UranusNo7/dsh-web-fetch-firecrawl/tar.gz/e279cd7f928563e8f3606a0160598a3ba48863a8
```

安装后重启 DSH Desktop。桌面 fork 如果要把插件内置到安装包，请把这个插件作为固定 commit 的生产依赖加入桌面构建，并在桌面自有的 `cordis.patch.yml` 中挂载它；详见“内置到桌面安装包”。

## 配置 API key

推荐把真实 key 写入 DSH credentials 文件，而不是写入 Cordis 配置或 Git 仓库。

Windows 默认凭据文件：

```text
C:\Users\<用户名>\.dsh\.credentials.yaml
```

单个账号的配置示例：

```yaml
FIRECRAWL_API_KEY: "fc-你的FirecrawlKey"
```

配置文件中只应存在你自己的 key。不要把真实 key 发到聊天、提交到 GitHub，或写进 `cordis.patch.yml`。

## 挂载插件并关闭 DeepSeek 搜索

在 DSH profile 的 `cordis.patch.yml` 中加入：

```yaml
- id: web-search-deepseek
  disabled: true

- id: web
  config:
    searchProvider: firecrawl
    fetchProvider: firecrawl

- insert:
    - id: web-fetch-firecrawl
      name: '@uranusno7/dsh-web-fetch-firecrawl'
      config:
        search: true
        apiKeyEnvs:
          - FIRECRAWL_API_KEY
        keyCooldownMs: 300000
```

这里的配置含义是：

- `web-search-deepseek.disabled: true`：不再挂载 DeepSeek 官方搜索 provider。
- `searchProvider: firecrawl`：`web_search` 使用 Firecrawl。
- `fetchProvider: firecrawl`：`web_fetch` 使用 Firecrawl。
- `search: true`：注册 Firecrawl 搜索 provider。
- `keyCooldownMs: 300000`：key 发生账号相关错误后冷却 5 分钟。

如果 profile 中已经存在 `id: web-fetch-firecrawl` 的插入项，请修改原项，不要重复插入同一个插件。

## 开启模型的搜索和抓取工具

`web` provider 与模型可见的 `tool-web` 是两层配置。当前会话使用的 agent preset 必须同时开启 `search` 和 `fetch`：

```yaml
- id: tool-web
  name: '@deepseek-ai/dsh-tool-web'
  config:
    search: true
    fetch: true
    searchTimeoutMs: 60000
```

推荐使用包含这段配置的 `minimal-web` 或 `standard-firecrawl` 预设。

### minimal-web

`minimal-web` 保留极简模式的编码工具，并开启 `web_search` 与 `web_fetch`。

### standard-firecrawl

`standard-firecrawl` 保留标准模式的完整编码工具，并开启 `web_search` 与 `web_fetch`。标准模式原本可能关闭 `web_fetch`，因此要同时搜索和抓取时应选择这个变体，而不是原始 `standard`。

新建会话时，在预设选择器中选择：

```text
标准模式（Firecrawl）
```

或者：

```text
极简模式（含 Web）
```

测试提示词示例：

```text
搜索 DeepSeek Harness 的最新官方文档，列出来源链接，并抓取最相关的官方页面。
```

## 配置多账号 key pool

号池只保存**凭据引用名**，不保存 key 值。先在 credentials 文件中配置多个引用：

```yaml
FIRECRAWL_API_KEY: "fc-第一个账号的Key"
FIRECRAWL_API_KEY_2: "fc-第二个账号的Key"
FIRECRAWL_API_KEY_3: "fc-第三个账号的Key"
```

再在插件配置中列出引用名：

```yaml
config:
  search: true
  apiKeyEnvs:
    - FIRECRAWL_API_KEY
    - FIRECRAWL_API_KEY_2
    - FIRECRAWL_API_KEY_3
  keyCooldownMs: 300000
```

运行规则：

1. search 和 fetch 共用同一个 key pool。
2. 可用 key 按引用名轮询。
3. `401` 表示认证失败，`402` 通常表示 credits/余额不足，`403` 表示权限问题，`429` 表示速率或配额限制。
4. 发生上述错误时，当前 key 进入冷却窗口，当前请求继续尝试下一个 key。
5. 所有 key 都没有配置或都在冷却时，请求返回 provider 错误。

号池不会读取每个账户剩余 credits，也不会保证每次请求只消耗一个点。实际消耗以 Firecrawl API 返回值和账户计划为准。参考：[Firecrawl Search API](https://docs.firecrawl.dev/api-reference/endpoint/search)、[Firecrawl Errors](https://docs.firecrawl.dev/api-reference/errors)、[Firecrawl Rate limits](https://docs.firecrawl.dev/rate-limits)。

## 内置到 DSH Desktop 安装包

如果要让新版本桌面安装包自带插件，而不是让每台机器手动安装 profile 插件，需要在 `deepseek-harness-desktop` fork 中完成三项配置：

1. 在 `dsh-plugin-desktop/package.json` 中加入固定 commit 的 `@uranusno7/dsh-web-fetch-firecrawl` 生产依赖，并更新根目录 `yarn.lock`。
2. 在 `dsh-plugin-desktop/cordis.patch.yml` 中插入 `web-fetch-firecrawl`，并配置 `web.searchProvider: firecrawl`、`web.fetchProvider: firecrawl`。
3. 在 `dsh-plugin-desktop/agent-presets/standard-firecrawl/` 放入桌面自有预设，使 `tool-web.search` 和 `tool-web.fetch` 都为 `true`。

桌面构建禁止修改 `deepseek-harness/` 上游 submodule。内置插件只会让包随安装程序分发，不会内置任何用户 API key；每台机器仍需在自己的 DSH credentials 中配置 key。

## 插件配置参考

| 配置项 | 默认值 | 作用 |
|---|---|---|
| `apiKey` | 未设置 | 直接提供一个 key；不推荐写入配置文件。 |
| `apiKeyEnv` | `FIRECRAWL_API_KEY` | 单个 credentials 引用名。未配置 `apiKeyEnvs` 时使用它。 |
| `apiKeyEnvs` | 使用 `apiKeyEnv` | 多个 credentials 引用名，组成账号池。 |
| `search` | `false` | 是否注册 Firecrawl `web_search` provider。 |
| `keyCooldownMs` | `300000` | `401/402/403/429` 后跳过当前 key 的毫秒数。 |
| `baseURL` | `https://api.firecrawl.dev/v2` | Firecrawl API 基地址；插件追加 `/search` 和 `/scrape`。 |
| `maxContentChars` | `100000` | 单次抓取保留的最大 Markdown 字符数。 |
| `onlyMainContent` | `true` | 是否要求 Firecrawl 只返回页面主要内容。 |

## 运行时限制

- 搜索只使用 Firecrawl 的 `data.web` 结果，不暴露图片或新闻结果组。
- 抓取请求由 Firecrawl 服务器执行，目标 URL 会发送给 Firecrawl；不要将内部地址或敏感地址交给此 provider。
- 抓取固定请求 Markdown，不返回原始 HTML。
- Firecrawl key 的可用性在请求期间解析；缺少 key 时返回 `WEB_PROVIDER_CREDENTIAL_MISSING`。
- provider 的网络、HTTP、响应解析失败返回 `WEB_PROVIDER_ERROR`；取消请求返回 `WEB_ABORTED`。

## 开发与验证

```sh
git clone https://github.com/UranusNo7/dsh-web-fetch-firecrawl.git
cd dsh-web-fetch-firecrawl
npm install
npm test
```

`npm test` 会先构建 TypeScript，再运行 provider 测试。当前测试覆盖：

- Firecrawl 搜索响应到 DSH 来源的映射；
- 账号 credits 错误后的 key 轮换；
- 插件同时注册 search/fetch provider。

构建产物位于 `lib/`，并提交到 GitHub 仓库，以便 GitHub 依赖安装时直接加载，不要求消费者现场运行 TypeScript 构建。

## 许可证

MIT
