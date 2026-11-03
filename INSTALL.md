# 安装备忘录插件（分发给其他人）

> 适用：DeepSeek Harness Desktop `>= 0.2.1-rc.5`。
> 不需要迁移任何数据；首次打开是空备忘录，数据保存在各自的 `~/.dsh/storages/memo/`。

## 三种分发渠道

| 渠道 | 别人怎么装 | 状态 |
|---|---|---|
| **npm** | 插件页 Add plugin → `dsh-memo-plugin` | **已上线（1.0.0）**，可直接安装 |
| **Git 仓库** | 插件页 Add plugin → Git 地址 | 推送仓库后可用（免审核、秒级生效） |
| **离线 tgz** | 双击 `install-memo-plugin.command` 或插件页选 tgz | 现在就能用 |

## 方式一：插件页一键安装（推荐）

1. 打开 DeepSeek Harness → 左侧「插件」
2. 点「Add plugin / 添加插件」
3. 填入以下任意一种：
   - npm 包名 `dsh-memo-plugin`（也可写 `dsh-memo-plugin@1.0.0` 锁定版本）
   - Git 地址，例如 `https://github.com/Cappu7ino/dsh-memo`
   - 本地 `.tgz` 文件（下载后选中）
4. 点「Enable now」启用
5. **完全退出 DSH（⌘Q）再重新打开**（Host 插件需要重启加载）

打开后左侧栏出现「备忘录」即可使用，无需任何配置。

## 方式二：命令行安装

```sh
# macOS 默认路径；Windows/Linux 换成对应的 dsh 可执行文件
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  plugin --profile desktop add <包名 | .tgz 路径 | Git 地址>
```

Git 地址的实测写法：

```sh
# GitHub 简写
dsh plugin --profile desktop add github:Cappu7ino/dsh-memo
# 等价 git URL
dsh plugin --profile desktop add git+https://github.com/Cappu7ino/dsh-memo.git
# 锁定版本（需要 tag）
dsh plugin --profile desktop add github:Cappu7ino/dsh-memo#v1.0.0
```

安装完成后**完全退出并重开 DSH**。

> 如果提示 profile 未初始化：先打开一次 DSH Desktop，再完全退出后执行命令。

## 方式三：离线安装脚本（tgz）

1. 把 `dsh-memo-plugin-<版本>.tgz` 和 `install-memo-plugin.command`（macOS）放在同一目录
2. macOS 双击 `install-memo-plugin.command`；Linux 执行 `bash install-memo-plugin.sh <tgz>`
3. 按提示重启 DSH

脚本会先把 tgz 复制到稳定目录（`~/.dsh/dist/`）再安装。**不要删掉这个 tgz**：`dsh plugin add` 会记录它的绝对路径，删掉后以后安装/更新别的插件时 pnpm 会报找不到文件（已实测）。

## 功能说明与前置条件

- 基础功能（笔记、标签、搜索、提醒、回收站、导出/备份、AI `memo` 工具）**开箱即用**
- **语义搜索是可选项**，默认关闭：在「备忘录 → 设置 → 语义搜索」启用，并要求本机运行 Ollama：
  ```sh
  ollama pull bge-m3
  ```
  没有 Ollama 时搜索自动回退为关键词匹配，不影响其他功能
- 插件通过 DSH 客户端公开接口工作；DSH 大版本升级后如遇界面异常，先回退 DSH 版本或等待插件适配

## 卸载

```sh
dsh plugin --profile desktop remove dsh-memo-plugin
```

Git / tgz 安装时依赖名也是 `dsh-memo-plugin`（发布包名一致），卸载命令相同。
卸载不会删除 `~/.dsh/storages/memo/` 里的笔记。

## 维护者：打包与发布

```sh
# 在作者的工作区里
./scripts/build-memo-plugin.sh                 # 生成 dist/dsh-memo-plugin-<version>.tgz
./scripts/build-memo-plugin.sh --version 1.0.1 # 升级版本
./scripts/publish-memo-plugin.sh               # 发布到 npm
```

- npm 对**首次发布的新包**走 staged publishing：包名先占位（`0.0.0-stage`），审核通过后才可安装。1.0.0 已通过审核；以后升级发布时同样**需要新的版本号**
- 发布构建会把包名同步改写进 `package.json`、`cordis.patch.yml` 和 `client.js` 的 module id（DSH 客户端 loader 会校验三者一致）；源码目录仍保持 `@local/dsh-memo`，不影响本机 `link:` 安装
- 推送 Git 仓库后，可用 `./scripts/build-memo-plugin.sh --repo https://github.com/Cappu7ino/dsh-memo` 把仓库地址写进发布包
