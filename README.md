# dsh-opencode-go-quota

在 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 **设置** 面板里新增一页 **OpenCode Go 额度**，实时显示 **OpenCode Go / Go Plus** 套餐的剩余额度：5 小时、本周、本月三档，带进度条、已用/上限金额、重置倒计时和手动刷新。

```
设置 → OpenCode 额度

OpenCode Go 额度                                            [↻ 刷新]
OpenCode Go / Go Plus 套餐的实时剩余额度，数据直接读取 opencode.ai Console。
[套餐 Go Plus]  本期结束 12/3 09:00                         更新于 12:20

┌──────────────────────────────────────────────────────────────────┐
│ 5 小时                                                       98% │
│ ██████████████████████████████████████████████████████████░░░    │
│ 剩余 $8.42 / $8.60     已用 $0.18     距重置 3小时12分            │
└──────────────────────────────────────────────────────────────────┘
┌ 本周 … ┐   ┌ 本月 … ┐
每 20 秒自动刷新；API Key 只在 Host 进程内使用，浏览器只拿到金额与百分比。
```

三档额度并排展示剩余百分比、进度条、剩余/上限金额和重置倒计时；额度紧张时进度条自动转琥珀色（≤25%）和红色（≤10%）。

## 工作原理

| 半 | 职责 |
| --- | --- |
| Host（`index.js`） | 用 DSH 凭据服务解析 `OPENCODE_GO_API_KEY`，请求官方 Console 接口 `https://opencode.ai/console/api/go/status`，归一化三个 meter，通过只读路由 `/plugins/opencode-go-quota/usage` 以同源 JSON 提供给前端 |
| Client（`client.js`） | 注册到 `settings.section` 插槽，作为设置面板里的一页；打开该页时 20 秒轮询、页面重新可见/窗口获焦时立即刷新 |

- **API Key 不出 Host 进程**：浏览器只拿到金额和百分比，拿不到密钥。
- **Host 缓存**：30 秒后台预热 + 5 秒最小请求间隔，多窗口共用，手动刷新走 `?force=1`。
- **只在设置页轮询**：额度页不打开时不发请求（Host 侧仍保留低频预热）。
- 无第三方依赖、无构建步骤，纯 ESM + 动态客户端模块。

## 安装

### 1. 从 GitHub 安装（其他机器推荐）

```bash
dsh plugin --profile "$DSH_PROFILE" add github:atticuswx/dsh-opencode-go-quota
```

或在 Web UI 的 **设置 → 插件 → 添加** 里填写 `github:atticuswx/dsh-opencode-go-quota`。

> 目标机器需要已经配置 OpenCode Go provider 与 `OPENCODE_GO_API_KEY` 凭据（插件只是复用它们，不额外保存）。

### 2. 从 npm 安装

```bash
dsh plugin --profile "$DSH_PROFILE" add dsh-opencode-go-quota
```

### 3. 本地目录开发

```bash
dsh plugin --profile "$DSH_PROFILE" add /绝对路径/dsh-opencode-go-quota
```

安装后刷新一次 Web 页面，打开 **设置 → OpenCode 额度** 即可看到该页。

## 配置

参数在 Loader 行里改（`cordis.patch.yml` 或 profile 的 `cordis.patch.yml`）：

```yaml
- id: opencode-go-quota
  name: 'dsh-opencode-go-quota'
  config:
    apiKeyRef: OPENCODE_GO_API_KEY  # 换成别的凭据名即可切账号
    refreshSeconds: 30              # Host 后台刷新间隔（10–3600）
    # endpoint: https://opencode.ai/console/api/go/status
    # routePath: /plugins/opencode-go-quota/usage
    # timeoutSeconds: 10
    # minimumFetchSeconds: 5
```

## 状态说明

页面读取失败时会直接显示原因，而不是留空：

| 显示 | 含义 |
| --- | --- |
| 未配置 OPENCODE_GO_API_KEY | 凭据服务里没有这个引用 |
| API Key 无效或已过期 | Console 返回 401/403 |
| 该账号没有 Go 套餐 | 接口 200 但没有 `access.meters` |
| 连接 opencode.ai 失败 / 请求超时 | 网络或超时 |

## 已知限制

- 只在设置面板中显示，不再占用输入框下方的空间。
- 额度是**套餐聚合**口径（Console 返回 5h / week / month 三个 meter），不是按模型拆分。
- 轮询而非推送，最坏延迟约 20 秒（打开该设置页时）。

## 更新日志

- **1.1.0** — 额度从输入框下方的常驻条改为 **设置 → OpenCode 额度** 独立设置页；补上中英文案切换与导航标签本地化；客户端依赖改为 `ui-settings-general`。
- **1.0.0** — 首个版本：`conversation.composer.dock` 常驻额度条。

## 发布到 GitHub（维护者）

仓库地址：<https://github.com/atticuswx/dsh-opencode-go-quota>

发布新版本（已在本地初始化并关联 SSH remote）：

```bash
git push -u origin main
git tag v1.1.0 && git push --tags
```

之后其他机器可安装固定版本：

```bash
dsh plugin --profile "$DSH_PROFILE" add github:atticuswx/dsh-opencode-go-quota#v1.1.0
```

发布到 npm（可选，需先 `npm login`）：

```bash
npm publish --access public
```

## 开发

```bash
node --check index.js
node --check client.js
```

改动 Host 半需要重载对应 Loader 行；改动 Client 半后刷新页面。仓库目录可直接被 `plugin_manager` 以目录形式安装。

## License

MIT。接口字段来自 OpenCode Console 的公开前端，随对方改版可能变化；请以 `https://opencode.ai/console` 页面显示为准。

---

English: a DeepSeek Harness plugin that renders your OpenCode Go / Go Plus allowance (5-hour, weekly, monthly) as a page inside the Settings panel. The host half resolves `OPENCODE_GO_API_KEY` from the harness credential service and proxies `https://opencode.ai/console/api/go/status`; the client half registers the page in `settings.section`. No third-party dependencies, no build step.
