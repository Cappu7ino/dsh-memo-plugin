# 备忘录（@local/dsh-memo · npm: dsh-memo-plugin）

DSH 桌面客户端里的全局便签本：左侧栏一个「备忘录」入口，随手记一笔，支持标签、搜索、置顶、完成勾选、归档、**定时提醒**，并让 AI 助手也能读写同一份笔记。

![icon](./icon.svg)

## 使用

- **左侧栏**：点击「备忘录」打开主面板，输入框自动获得焦点，Enter 保存、Shift+Enter 换行，标签用逗号分隔。
- **快捷键**：桌面端 `⌘ ⇧ M`（Windows/Linux 为 `Ctrl ⇧ M`）随时打开面板并聚焦输入框。快捷键可以在「设置 → 快捷键」里改成你自己的组合。
- **提醒**：给任意笔记设提醒时间（输入框里的「⏰ 提醒」，或笔记行上的「⏰」按钮；支持 10 分钟后 / 1 小时后 / 明天 09:00 快捷选项）。到点后右上角弹出提醒卡片，可「知道了」「10 分钟后再提醒」「1 小时后再提醒」「明天 09:00 再提醒」或「打开备忘录」；同时会尝试发一条系统通知，左侧栏的备忘录图标在有待处理提醒时显示**到期数量徽标**（如 `2`）。提醒也会持久化，重启后仍然有效。
- **重复提醒**：设置提醒时可以选择「不重复 / 每天 / 每周 / 工作日 / 每 15 分钟 / 每 30 分钟 / 每小时」。重复提醒在点「知道了」后会自动顺延到下一次，贪睡不会打乱重复节奏；笔记行上显示「🔁 每天」这样的标记。
- **今日待办**：顶部「今日」标签只列出今天到期、以及已到期未确认的提醒（按时间排序），打开备忘录先看今天要做什么。
- **通知偏好**：面板右上角「提醒设置」里可以开关系统通知、提示音，并设置静默时段（例如 22:00–08:00）。静默时段内仍然弹出提醒卡片，但不发系统通知、不响提示音。
- **笔记操作**：勾选完成、置顶、编辑正文与标签、归档/恢复、删除（第二次点击确认，移到回收站）。
- **回收站**：删除的笔记进入「回收站」视图，30 天内可一键恢复或彻底删除；到期自动清除。回收站里的笔记不参与搜索、提醒和 AI 上下文。
- **导出与备份**：设置面板「数据与备份」里可以导出 Markdown（只导出未删除的笔记，按未完成/已完成/归档分组）或 JSON（完整快照，含回收站），也可以手动「立即备份」。每天首次修改笔记时会自动写一份快照到 `backups/`；面板里会显示备份份数、磁盘占用和最近时间。重复备份相同内容会自动跳过，不占空间；「保留份数」可选 7/14/30/90 天，「清理旧备份」只保留最新一份。「从备份恢复」会列出所有快照（时间、大小、文件名），选中后需再点一次「确认恢复」；恢复前会自动把当前状态存成一份新快照，所以恢复本身也是可撤销的。
- **搜索与筛选**：按正文或标签搜索；「今日 / 未完成 / 已完成 / 提醒 / 归档 / 回收站」视图；点击标签按标签过滤。搜索默认**跨全部笔记**（含已完成、归档），结果带命中高亮和「找到 N 条」计数；搜索框旁的「全部笔记」开关控制搜索范围（开=全部笔记含回收站，关=只搜当前标签），悬停或键盘聚焦开关会显示说明。
- **键盘操作**：`/` 聚焦搜索；`↑ / ↓` 选择结果；`x` 完成/取消完成；`p` 置顶/取消置顶；`e` 或 `Enter` 编辑；`Delete` 删除（按两次确认）；`Esc` 清空搜索/取消选择。
- **偏好记忆**：语义开关、搜索范围（全部/当前视图）会记在本地（localStorage），下次打开面板保持上次选择。
- **语义搜索（可选，本地模型）**：面板右上角「设置 → 语义搜索」里打开后，搜索框旁会出现「语义」开关。打开时先按关键词匹配，再由本机的 Ollama embedding 模型补充「意思相近但字面不同」的笔记（例如搜「还钱」能命中「信用卡账单 15 号还款」），结果上带「语义 0.62」这样的相似度标记。模型默认 `bge-m3`，也可换成 `qwen3-embedding:0.6b`、`embeddinggemma:300m`；设置里能改端点、上下文长度，并提供「测试连接」「重建索引」。Ollama 没运行或模型不可用时会自动回退成纯关键词搜索，不影响其他功能。
- **AI 助手**：对话里直接说「记一下：周五交周报」或「我备忘录里关于牛奶的笔记是什么」即可，助手通过 `memo` 工具读写同一份数据；也可以说「明天 9 点提醒我看这条」——`memo` 工具支持 `remind_at` 参数，设置后会走同一套提醒。
- **来源会话**：AI 在某个会话里写下的笔记会记住来源会话（`sourceSessionId`），列表里显示「来源会话」入口，点一下跳回那个会话，方便回溯笔记上下文。
- **笔记 → 会话**：笔记行上的「↗ 会话」展开两个操作：「引用到输入框」把笔记以引用格式写入当前空白会话的草稿（当前会话已有内容时会复制到剪贴板并提示粘贴）；「开新会话」会新建（或复用空白）会话，并把笔记引用预填成草稿。两个入口和菜单项悬停时都有说明气泡。
- **会话上下文**：新会话（以及运行中的会话）会把「置顶笔记 + 到期提醒 + 24 小时内提醒」作为动态上下文提供给助手，所以问「我今天要做什么」它也能结合备忘录回答；子会话和 subagent 不会收到这段内容。

## 数据

- 位置：`$DSH_HOME/storages/memo/notes.json`（默认 `~/.dsh/storages/memo/notes.json`），所有会话、所有工作区共享一份。
- 每条笔记的提醒字段：`remindAt`（ISO 时间，或 `null`）与 `remindAckedAt`（用户确认/稍后的时间，或 `null`）；重写提醒时间会清空确认时间。
- `sourceSessionId` 记录写下笔记的会话 id（仅 AI 工具写入时记录，面板手动新建的笔记为 `null`）。
- 写入是串行且原子的（临时文件 + rename），文件损坏时会把坏文件改名为 `notes.json.corrupt-<时间戳>` 并从空清单继续。
- 备份/迁移：直接复制该 JSON 文件即可。
- 语义索引：保存在同目录的 `embeddings.bin` + `embeddings.meta.json`（每条笔记一个归一化向量，2000 条约 6–8 MB）。删除这两个文件只会让下次重新建立索引，不影响笔记。切换模型、维度或索引格式变化时会自动重建。
- 回收站：`deletedAt` 字段记录删除时间，30 天后自动清除；彻底删除会直接移除记录。
- 恢复：面板里可以直接选一份快照恢复，无需退出应用；恢复会覆盖当前全部笔记与偏好设置（恢复前自动留一份安全快照）。
- 备份：`backups/memo-YYYYMMDD.json` 每天一份；「立即备份」另写一份带时间戳的快照。份数上限由 `settings.backup.retentionDays` 控制（默认 30，界面可选 7/14/30/90），超出自动删除最旧的。内容与最新快照完全一致时不会写新文件（连点「立即备份」也不占空间）。手工恢复也可把对应 JSON 复制回 `notes.json`（先完全退出应用）。

## 结构

| 文件 | 作用 |
|---|---|
| `index.js` | Host 半：笔记存储、`/api/memo` 认证路由、`memo` 工具 |
| `client.js` | Web Client 半：左侧栏入口、主面板、快捷键、locale 字典 |
| `cordis.patch.yml` | bundle patch：插入 `memo` 这一行 |
| `locale/zh.json`、`locale/en.json` | 插件列表里显示的名称与描述 |
| `icon.svg` | 插件图标 |

Host 与 Client 的边界：Client 只通过 `/api/memo`（GET 列表、POST 变更、POST 语义检索）读写；路由注册在 Connection 的认证 Fetch 通道上，因此和页面同源、同 Cookie 校验，其他本地进程无法直接读写。语义检索由 Host 直接请求本机 Ollama（默认 `http://127.0.0.1:11434`），不经过任何云服务。

## 接口（供维护者）

`GET /api/memo` → `{ ok: true, notes: Note[], settings: Settings, semantic: SemanticStatus, backup: BackupStatus }`

`POST /api/memo`，body 为以下之一：

```jsonc
{ "op": "create", "text": "…", "tags": ["…"], "remindAt": "2026-11-02T01:00:00.000Z" }
{ "op": "update", "id": "…", "text": "…", "tags": ["…"], "pinned": true, "done": true, "archived": false, "remindAt": null }
{ "op": "snoozeReminder", "id": "…", "minutes": 10 }
{ "op": "ackReminder", "id": "…" }
{ "op": "delete", "id": "…" }        // 移到回收站（软删除）
{ "op": "restore", "id": "…" }
{ "op": "purge", "id": "…" }          // 彻底删除（仅限回收站中的笔记）
{ "op": "export", "format": "markdown" }   // → { ok, format, filename, mime, content }
{ "op": "backupNow" }                 // → { ok: true, backup: { count, lastAt, bytes, retentionDays, skipped? } }
{ "op": "cleanupBackups", "keep": 1 } // → { ok: true, backup: { …, removed } }
{ "op": "listBackups" }               // → { ok: true, backups: [{ name, size, at }], backup }
{ "op": "restoreBackup", "name": "memo-20261102.json" }   // → { ok: true, restored: { name, notes }, notes, settings, semantic, backup }
{ "op": "updateSettings", "settings": { "sound": true, "quietHours": { "enabled": true, "start": "22:00", "end": "08:00" }, "semantic": { "enabled": true, "endpoint": "http://127.0.0.1:11434", "model": "bge-m3", "numCtx": 1024 } } }
{ "op": "search", "query": "还钱" }            // → { ok: true, matches: [{ id, score }], semantic }
{ "op": "semanticStatus" }                     // → { ok: true, semantic }
{ "op": "reindex" }                            // → { ok: true, semantic }（后台全量重建）
{ "op": "testEmbedding", "semantic": { "model": "bge-m3" } }   // → { ok: true, test: { model, dim, ms } }
```

变更类响应为 `{ ok: true, notes: Note[], settings: Settings, semantic: SemanticStatus }`（按置顶、更新时间排序），失败为 `{ ok: false, error }` 加 4xx/5xx。`Settings` 为 `{ systemNotifications, sound, quietHours: { enabled, start, end }, semantic: { enabled, endpoint, model, numCtx, minScore } }`；`SemanticStatus` 为 `{ enabled, model, available, indexed, total, dim, building, progress, error }`。`minScore` 是相似度门槛（默认 0.48），换模型后可在设置里（或直接改 JSON）微调。

`Note`：`{ id, text, tags, pinned, done, archived, deletedAt, sourceSessionId, remindAt, remindAckedAt, repeat, repeatMinutes, repeatAnchor, createdAt, updatedAt }`。`BackupStatus` 为 `{ count, lastAt, bytes, retentionDays, dir }`。`Settings.backup` 为 `{ retentionDays }`（1–365，默认 30）。重复提醒的 `ackReminder` 会把 `remindAt` 顺延到下一次（不清空提醒），`snoozeReminder` 只推迟本次时间、保留重复规则。

## 安装与卸载

### 本机开发安装

本插件是本地 bundle，从源码安装走 `link:`（会写入 profile 的依赖与 `dsh.profile.bundles`）：

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  plugin --profile desktop add /path/to/plugins/dsh-memo
```

安装后完整退出并重新打开 DeepSeek Harness，左侧栏即出现「备忘录」。

### 分发给其他人

分发产物由 `scripts/build-memo-plugin.sh` 生成在作者的 `dist/` 目录；别人有三种安装方式（详见 [INSTALL.md](./INSTALL.md)）：

| 渠道 | 别人的安装方式 | 状态 |
|---|---|---|
| npm | 插件页 Add plugin → `dsh-memo-plugin` | 首次发布需 npm 暂存审核（staged publishing） |
| Git 仓库 | 插件页 Add plugin → Git 地址 | 推送仓库后可用 |
| 离线 tgz | 双击 `install-memo-plugin.command`，或插件页选 tgz | 立即可用 |

### 卸载

```sh
# 本机开发安装（link:）
dsh plugin --profile desktop remove @local/dsh-memo
# npm / Git / tgz 安装
dsh plugin --profile desktop remove dsh-memo-plugin
```

卸载不会删除 `~/.dsh/storages/memo/notes.json`，重装后笔记仍在。

## 已知限制

- 数据是单机单 profile 的，不做云同步。
- 提醒只在 DSH 运行时触发（内置提醒卡片 + 尽力而为的系统通知），应用完全退出后不会补发。
- 「每天 / 每周」按固定 24 小时 / 7 天步进，跨夏令时的地区时间会漂移一小时（当前 Asia/Shanghai 无此问题）。
- 提醒到点检测是客户端 20 秒轮询，触发时间最多延迟约 20 秒。
- 面板没有虚拟滚动；笔记量到数千条时（Host 硬上限 2000 条）列表渲染会变慢。
- 归档笔记不会自动清理，需要手动删除。
- 删除是软删除（回收站保留 30 天）；彻底删除后只能从 `backups/` 里的历史快照恢复，备份默认保留 30 份（可调）。备份是完整快照，磁盘占用约为 `notes.json` 大小 × 保留份数（2000 条普通笔记约 30 MB 上限），设置面板会显示实际占用。
- Markdown 导出不含回收站笔记；JSON 导出是完整快照（含回收站与偏好设置）。
- 语义搜索依赖本机 Ollama：应用启动时不会自动拉起它；Ollama 未运行时「语义」开关仍可点，但只会返回关键词结果。首次开启或换模型后需要重建索引（2000 条约 15–35 秒，后台进行，期间可正常用关键词搜索）。
- 语义相似度对短文本比较敏感：不相关的短句也可能有 0.4–0.5 的基线相似度，所以结果按相似度排序、并在界面上标出分数；默认门槛 0.48 是为 `bge-m3` 调的，换用其他模型建议用「测试连接」确认后再观察效果。
