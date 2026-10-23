# dsh-opencode-go-quota

在 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的输入框下方常驻显示 **OpenCode Go / Go Plus** 套餐的剩余额度：5 小时、本周、本月三档，带进度条、明细面板和手动刷新。

```
● OpenCode Go    5 小时 ▮▮▮▮▮ 98%    本周 ▮▮▮▮▮ 95%    本月 ▮▮▮▮▮ 97%    明细  ↻
```

点「明细」展开：每档的剩余金额、已用/上限、距重置倒计时；底部显示套餐、本期结束与更新时间。额度紧张时进度条自动转琥珀色（≤25%）和红色（≤10%）。

## 工作原理

| 半 | 职责 |
| --- | --- |
| Host（`index.js`） | 用 DSH 凭据服务解析 `OPENCODE_GO_API_KEY`，请求官方 Console 接口 `https://opencode.ai/console/api/go/status`，归一化三个 meter，通过只读路由 `/plugins/opencode-go-quota/usage` 以同源 JSON 提供给前端 |
| Client（`client.js`） | 注册到 `conversation.composer.dock` 插槽，20 秒轮询、页面重新可见/窗口获焦时立即刷新，渲染额度条 |

- **API Key 不出 Host 进程**：浏览器只拿到金额和百分比，拿不到密钥。
- **Host 缓存**：30 秒后台预热 + 5 秒最小请求间隔，多窗口共用，手动刷新走 `?force=1`。
- 无第三方依赖、无构建步骤，纯 ESM + 动态客户端模块。

## 安装

### 1. 从 GitHub 安装（其他机器推荐）

```bash
dsh plugin --profile "$DSH_PROFILE" add github:<your-github-user>/dsh-opencode-go-quota
```

或在 Web UI 的 **设置 → 插件 → 添加** 里填写 `github:<your-github-user>/dsh-opencode-go-quota`。

> 目标机器需要已经配置 OpenCode Go provider 与 `OPENCODE_GO_API_KEY` 凭据（插件只是复用它们，不额外保存）。

### 2. 从 npm 安装

```bash
dsh plugin --profile "$DSH_PROFILE" add dsh-opencode-go-quota
```

### 3. 本地目录开发

```bash
dsh plugin --profile "$DSH_PROFILE" add /绝对路径/dsh-opencode-go-quota
```

安装后刷新一次 Web 页面即可看到额度条。

## 配置

插件没有独立设置页，参数在 Loader 行里改（`cordis.patch.yml` 或 profile 的 `cordis.patch.yml`）：

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

额度条读取失败时会直接显示原因，而不是留空：

| 显示 | 含义 |
| --- | --- |
| 未配置 OPENCODE_GO_API_KEY | 凭据服务里没有这个引用 |
| API Key 无效或已过期 | Console 返回 401/403 |
| 该账号没有 Go 套餐 | 接口 200 但没有 `access.meters` |
| 连接 opencode.ai 失败 / 请求超时 | 网络或超时 |

## 已知限制

- 只在有会话的对话页出现（挂在 composer dock，属于会话级插槽）。
- 额度是**套餐聚合**口径（Console 返回 5h / week / month 三个 meter），不是按模型拆分。
- 轮询而非推送，最坏延迟约 20 秒。

## 发布到 GitHub（维护者）

先在 GitHub 新建空仓库（不要勾选 README / .gitignore / LICENSE，本仓库已包含），然后：

```bash
git init -b main
git add .
git commit -m "feat: OpenCode Go quota strip for DeepSeek Harness"
git remote add origin https://github.com/<your-github-user>/dsh-opencode-go-quota.git
git push -u origin main
git tag v1.0.0 && git push --tags
```

之后其他机器可安装固定版本：

```bash
dsh plugin --profile "$DSH_PROFILE" add github:<your-github-user>/dsh-opencode-go-quota#v1.0.0
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

English: a DeepSeek Harness plugin that keeps your OpenCode Go / Go Plus allowance (5-hour, weekly, monthly) visible below the composer. The host half resolves `OPENCODE_GO_API_KEY` from the harness credential service and proxies `https://opencode.ai/console/api/go/status`; the client half renders it in `conversation.composer.dock`. No third-party dependencies, no build step.
