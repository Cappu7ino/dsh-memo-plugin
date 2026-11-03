/**
 * 备忘录 (Memo) — Web Client half.
 *
 * Registers the left-sidebar entry and the global main panel. The panel talks
 * to the Host half over the authenticated exact Fetch route `/api/memo`; it
 * never imports another Harness Client package, and every colour comes from a
 * `--dsw-*` theme token so light/dark switching needs no code.
 *
 * The bundle is hand-written against the lazy module table: the factory may
 * only require platform modules (React), never a relative file.
 */
window.__ModuleLoader__.load({
  id: '@local/dsh-memo',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    /** Locale namespace and main-panel key share the route name. */
    const NS = 'memo'
    const PANEL_ID = 'memo'
    /** Endpoint relative to the document base, like the Connection carrier. */
    const ENDPOINT = 'api/memo'

    /** Simplified Chinese dictionary; also the key source of truth. */
    const zh = {
      panel: '备忘录',
      subtitle: '{count} 条笔记',
      capturePlaceholder: '记一笔…（Enter 保存，Shift+Enter 换行）',
      tagPlaceholder: '标签，用逗号分隔（可选）',
      save: '记一笔',
      saving: '保存中…',
      searchPlaceholder: '搜索笔记或标签',
      filterActive: '未完成',
      filterDone: '已完成',
      filterArchived: '归档',
      allTags: '全部标签',
      emptyActive: '还没有笔记，随手记一笔吧。',
      emptyDone: '还没有完成的笔记。',
      emptyArchived: '归档是空的。',
      emptySearch: '没有匹配的笔记。',
      loading: '正在读取备忘录…',
      loadFailed: '无法读取备忘录',
      retry: '重试',
      refresh: '刷新',
      refreshAria: '刷新备忘录',
      shortcutHint: '打开备忘录',
      pinned: '已置顶',
      pin: '置顶',
      unpin: '取消置顶',
      edit: '编辑',
      editSave: '保存',
      editCancel: '取消',
      archive: '归档',
      unarchive: '恢复',
      delete: '删除',
      confirmDelete: '确认删除',
      done: '标记完成',
      undone: '标记未完成',
      justNow: '刚刚',
      noteActions: '笔记操作',
      openShortcutMac: '⌘ ⇧ M',
      openShortcutOther: 'Ctrl ⇧ M',
      filterRemind: '提醒',
      remind: '提醒',
      remindSet: '设置提醒',
      remindSave: '保存提醒',
      remindClear: '清除提醒',
      remindCancel: '取消',
      remindOverdue: '已到期',
      remindUpcoming: '提醒',
      remindAcked: '已提醒',
      remindQuick10: '10 分钟后',
      remindQuick60: '1 小时后',
      remindQuickTomorrow: '明天 09:00',
      remindAtLabel: '提醒时间',
      remindToastTitle: '备忘录提醒',
      remindAcknowledge: '知道了',
      remindSnooze: '10 分钟后再提醒',
      remindSnooze60: '1 小时后再提醒',
      remindSnoozeTomorrow: '明天 09:00 再提醒',
      remindMoreDue: '还有 {count} 条到期提醒',
      repeatLabel: '重复',
      repeatNone: '不重复',
      repeatDaily: '每天',
      repeatWeekly: '每周',
      repeatWeekdays: '工作日',
      repeatEvery15: '每 15 分钟',
      repeatEvery30: '每 30 分钟',
      repeatEvery60: '每小时',
      repeatToastHint: '🔁 {label}，确认后自动顺延到下一次',
      filterToday: '今日',
      emptyToday: '今天没有待办提醒。',
      filterTrash: '回收站',
      emptyTrash: '回收站是空的。',
      restore: '恢复',
      purge: '彻底删除',
      confirmPurge: '确认彻底删除',
      deletedAt: '删除于 {time}',
      deleteToTrash: '移到回收站',
      trashHint: '回收站中的笔记 30 天后自动清除',
      dataTitle: '数据与备份',
      exportMarkdown: '导出 Markdown',
      exportJson: '导出 JSON',
      backupNow: '立即备份',
      backupEmpty: '还没有本地备份（每天首次修改笔记时自动备份）。',
      backupLine: '已备份 {count} 份 · 占用 {size} · 最近 {time}',
      exportDone: '已导出 {file}',
      exportFailed: '导出失败：{error}',
      backupDone: '备份完成',
      backupFailed: '备份失败：{error}',
      backupUnchanged: '内容无变化，未新增备份',
      backupRetention: '保留份数',
      backupRetentionOption: '{days} 天',
      backupCleanup: '清理旧备份',
      backupCleanupDone: '已清理 {count} 份旧备份',
      backupCleanupNone: '没有可清理的旧备份',
      restoreFromBackup: '从备份恢复',
      restoreHint: '选择一个快照恢复。恢复前会先把当前状态备份一份。',
      restoreLoading: '正在读取备份列表…',
      restoreEmpty: '没有可用的备份。',
      restoreConfirm: '确认恢复',
      restoreConfirmHint: '再点一次「确认恢复」才会执行；当前全部笔记会被该快照覆盖。',
      restoreCancel: '取消',
      restoreDone: '已恢复到 {time} 的备份',
      restoreFailed: '恢复失败：{error}',
      searchCount: '找到 {count} 条',
      searchAllHint: '搜索全部笔记（含已完成/归档/回收站）',
      searchCurrent: '当前视图',
      searchAll: '全部笔记',
      searchScopeHint: '勾选后搜索全部笔记；取消则只搜当前视图',
      searchScopeTip: '搜索范围：开启后，搜索会覆盖全部笔记（含已完成、归档和回收站）；关闭则只搜索当前标签里的笔记。',
      semanticTip: '语义搜索：在关键词结果之外，再用本地模型补充意思相近的笔记（需要本机 Ollama 运行）。',
      archivedBadge: '已归档',
      keyboardHint: '↑↓ 选择 · x 完成 · p 置顶 · e 编辑 · Delete 删除 · / 搜索',
      searchTrashHint: '回收站中还有 {count} 条匹配（切到「全部笔记」可查看）',
      searchLiveHint: '正常笔记中还有 {count} 条匹配（切到「全部笔记」可查看）',
      reloadHint: '请按 ⌘R 刷新应用，加载最新插件后再试',
      sessionActions: '会话',
      sessionActionsHint: '引用到输入框，或围绕这条笔记开新会话',
      sessionInsert: '引用到输入框',
      sessionNew: '开新会话',
      sessionInsertHint: '空白会话会直接插入；当前会话已有内容时会复制到剪贴板，粘贴即可。',
      sessionCopied: '当前会话已有内容，引用已复制到剪贴板，直接粘贴即可',
      sessionCopyFailed: '复制失败，请手动复制笔记内容',
      sessionActionFailed: '无法创建会话，请重试',
      sessionActionsTip: '把这条笔记变成会话输入：写入空白会话的草稿，或复制引用。',
      sessionInsertTip: '空白会话会直接插入引用；当前会话已有内容时会复制到剪贴板，粘贴即可。',
      sessionNewTip: '新建或复用空白会话，把这条笔记作为引用草稿打开。',
      sessionCancel: '取消',
      settingsTitle: '提醒设置',
      settingsNotifications: '系统通知',
      settingsSound: '提示音',
      settingsQuiet: '静默时段（只弹卡片，不响铃/不发系统通知）',
      settingsQuietFrom: '开始',
      settingsQuietTo: '结束',
      settingsSave: '保存设置',
      settingsCancel: '取消',
      settingsOpen: '提醒设置',
      settingsOpenAll: '设置',
      semanticTitle: '语义搜索',
      semanticEnable: '启用语义搜索（本地 Ollama）',
      semanticEndpoint: 'Ollama 端点',
      semanticModel: '嵌入模型',
      semanticNumCtx: '上下文长度',
      semanticTest: '测试连接',
      semanticTestOk: '连接正常：{model} · {dim} 维 · {ms} ms',
      semanticTestFail: '连接失败：{error}',
      semanticReindex: '重建索引',
      semanticIndexing: '正在建立索引 {done}/{total}',
      semanticIndexed: '已索引 {done}/{total}',
      semanticHint: '开启后，搜索结果会先按关键词匹配，再由本地模型补充语义相近的笔记；需要本机运行 Ollama。',
      semanticSearching: '语义搜索中…',
      semanticHits: '语义补充 {count} 条',
      semanticUnavailable: '本地模型不可用，已显示关键词结果',
      semanticBuilding: '语义索引建立中 {done}/{total}',
      semanticBadge: '语义',
      semanticBadgeTitle: '语义匹配 · 相似度 {score}',
      semanticOff: '语义',
      quietHint: '静默时段：只显示卡片',
      openMemo: '打开备忘录',
      captureRemind: '⏰ 提醒',
      captureRemindSet: '已设提醒：{time}',
      emptyRemind: '还没有设置提醒的笔记。',
      sourceSession: '来源会话',
      openSourceSession: '打开来源会话',
      sourceSessionMissing: '来源会话已不可用',
      untitledSession: '未命名会话',
      newSession: '新会话',
    }

    /** English dictionary, key-for-key with the Chinese source. */
    const en = {
      panel: 'Memo',
      subtitle: '{count} notes',
      capturePlaceholder: 'Jot a note… (Enter saves, Shift+Enter adds a line)',
      tagPlaceholder: 'Tags, comma separated (optional)',
      save: 'Save',
      saving: 'Saving…',
      searchPlaceholder: 'Search notes or tags',
      filterActive: 'Open',
      filterDone: 'Done',
      filterArchived: 'Archived',
      allTags: 'All tags',
      emptyActive: 'No notes yet — jot one above.',
      emptyDone: 'Nothing completed yet.',
      emptyArchived: 'Nothing archived.',
      emptySearch: 'No matching notes.',
      loading: 'Loading memos…',
      loadFailed: 'Could not load memos',
      retry: 'Retry',
      refresh: 'Refresh',
      refreshAria: 'Refresh memos',
      shortcutHint: 'Open Memo',
      pinned: 'Pinned',
      pin: 'Pin',
      unpin: 'Unpin',
      edit: 'Edit',
      editSave: 'Save',
      editCancel: 'Cancel',
      archive: 'Archive',
      unarchive: 'Restore',
      delete: 'Delete',
      confirmDelete: 'Delete?',
      done: 'Mark done',
      undone: 'Mark open',
      justNow: 'just now',
      noteActions: 'Note actions',
      openShortcutMac: '⌘ ⇧ M',
      openShortcutOther: 'Ctrl ⇧ M',
      filterRemind: 'Reminders',
      remind: 'Remind',
      remindSet: 'Set reminder',
      remindSave: 'Save reminder',
      remindClear: 'Clear reminder',
      remindCancel: 'Cancel',
      remindOverdue: 'Overdue',
      remindUpcoming: 'Reminder',
      remindAcked: 'Reminded',
      remindQuick10: 'In 10 minutes',
      remindQuick60: 'In 1 hour',
      remindQuickTomorrow: 'Tomorrow 09:00',
      remindAtLabel: 'Reminder time',
      remindToastTitle: 'Memo reminder',
      remindAcknowledge: 'Got it',
      remindSnooze: 'Snooze 10 minutes',
      remindSnooze60: 'Snooze 1 hour',
      remindSnoozeTomorrow: 'Snooze until tomorrow 09:00',
      remindMoreDue: '{count} more due',
      repeatLabel: 'Repeat',
      repeatNone: 'No repeat',
      repeatDaily: 'Daily',
      repeatWeekly: 'Weekly',
      repeatWeekdays: 'Weekdays',
      repeatEvery15: 'Every 15 minutes',
      repeatEvery30: 'Every 30 minutes',
      repeatEvery60: 'Hourly',
      repeatToastHint: '🔁 {label} — acknowledging schedules the next one',
      filterToday: 'Today',
      emptyToday: 'No reminders left for today.',
      filterTrash: 'Trash',
      emptyTrash: 'The recycle bin is empty.',
      restore: 'Restore',
      purge: 'Delete forever',
      confirmPurge: 'Really delete?',
      deletedAt: 'Deleted {time}',
      deleteToTrash: 'Move to trash',
      trashHint: 'Notes in the trash are removed automatically after 30 days',
      dataTitle: 'Data & backups',
      exportMarkdown: 'Export Markdown',
      exportJson: 'Export JSON',
      backupNow: 'Back up now',
      backupEmpty: 'No local backups yet (one is written on the first edit each day).',
      backupLine: '{count} backup(s) · {size} · latest {time}',
      exportDone: 'Exported {file}',
      exportFailed: 'Export failed: {error}',
      backupDone: 'Backup written',
      backupFailed: 'Backup failed: {error}',
      backupUnchanged: 'Nothing changed — no new backup',
      backupRetention: 'Keep',
      backupRetentionOption: '{days} days',
      backupCleanup: 'Clean old backups',
      backupCleanupDone: 'Removed {count} old backup(s)',
      backupCleanupNone: 'No old backups to clean',
      restoreFromBackup: 'Restore from backup',
      restoreHint: 'Pick a snapshot to restore. The current state is backed up first.',
      restoreLoading: 'Loading backups…',
      restoreEmpty: 'No backups available.',
      restoreConfirm: 'Confirm restore',
      restoreConfirmHint: 'Click again to confirm; all current notes will be replaced by that snapshot.',
      restoreCancel: 'Cancel',
      restoreDone: 'Restored the backup from {time}',
      restoreFailed: 'Restore failed: {error}',
      searchCount: '{count} match(es)',
      searchAllHint: 'Searching all notes (done, archived and trashed included)',
      searchCurrent: 'Current view',
      searchAll: 'All notes',
      searchScopeHint: 'Checked: search all notes. Unchecked: current view only',
      searchScopeTip: 'Search scope: when on, search covers all notes (done, archived and trashed included); when off, only the notes in the current tab.',
      semanticTip: 'Semantic search: beyond keyword hits, the local model adds notes that are close in meaning (requires Ollama running locally).',
      archivedBadge: 'Archived',
      keyboardHint: '↑↓ select · x done · p pin · e edit · Delete remove · / search',
      searchTrashHint: '{count} match(es) in the recycle bin (switch to "All notes" to see them)',
      searchLiveHint: '{count} match(es) in normal notes (switch to "All notes" to see them)',
      reloadHint: 'Press ⌘R to reload the app and load the latest plugin',
      sessionActions: 'Session',
      sessionActionsHint: 'Quote into the composer, or open a new session about this note',
      sessionInsert: 'Quote into composer',
      sessionNew: 'New session',
      sessionInsertHint: 'A blank session receives the quote directly; otherwise it is copied to the clipboard to paste.',
      sessionCopied: 'The current session already has content — the quote was copied to the clipboard',
      sessionCopyFailed: 'Copy failed — please copy the note manually',
      sessionActionFailed: 'Could not create a session — please try again',
      sessionActionsTip: 'Turn this note into session input: quote it into a blank draft, or copy the quote.',
      sessionInsertTip: 'A blank session receives the quote directly; otherwise it is copied to the clipboard to paste.',
      sessionNewTip: 'Create or reuse a blank session with this note quoted in the draft.',
      sessionCancel: 'Cancel',
      settingsTitle: 'Reminder settings',
      settingsNotifications: 'System notifications',
      settingsSound: 'Sound',
      settingsQuiet: 'Quiet hours (card only, no sound or system notification)',
      settingsQuietFrom: 'From',
      settingsQuietTo: 'To',
      settingsSave: 'Save settings',
      settingsCancel: 'Cancel',
      settingsOpen: 'Reminder settings',
      settingsOpenAll: 'Settings',
      semanticTitle: 'Semantic search',
      semanticEnable: 'Enable semantic search (local Ollama)',
      semanticEndpoint: 'Ollama endpoint',
      semanticModel: 'Embedding model',
      semanticNumCtx: 'Context length',
      semanticTest: 'Test connection',
      semanticTestOk: 'Connected: {model} · {dim} dims · {ms} ms',
      semanticTestFail: 'Connection failed: {error}',
      semanticReindex: 'Rebuild index',
      semanticIndexing: 'Indexing {done}/{total}',
      semanticIndexed: 'Indexed {done}/{total}',
      semanticHint: 'When on, search shows keyword hits first and then notes that are close in meaning, using a local model. Requires Ollama running on this machine.',
      semanticSearching: 'Searching by meaning…',
      semanticHits: '{count} semantic matches',
      semanticUnavailable: 'Local model unavailable — showing keyword results',
      semanticBuilding: 'Building the semantic index {done}/{total}',
      semanticBadge: 'semantic',
      semanticBadgeTitle: 'Semantic match · similarity {score}',
      semanticOff: 'Semantic',
      quietHint: 'Quiet hours: card only',
      openMemo: 'Open Memo',
      captureRemind: '⏰ Remind',
      captureRemindSet: 'Reminder set: {time}',
      emptyRemind: 'No notes have a reminder yet.',
      sourceSession: 'Source session',
      openSourceSession: 'Open source session',
      sourceSessionMissing: 'Source session is no longer available',
      untitledSession: 'Untitled session',
      newSession: 'New session',
    }

    /** Component-local styles; every colour is a Harness theme token. */
    const STYLES = `
.dsh-memo-root {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  color: var(--dsw-alias-label-primary);
  background: var(--dsw-alias-bg-base);
  font-size: var(--dsw-content-font-size, 14px);
}
.dsh-memo-head {
  flex: none;
  box-sizing: border-box;
  padding: calc(var(--dsh-frame-top-clearance, 0px) + 16px) 24px 12px;
  padding-left: max(24px, calc(var(--dsh-frame-leading-clearance, 0px) + 20px));
  border-bottom: 1px solid var(--dsw-alias-border-l2);
}
.dsh-memo-head-inner, .dsh-memo-body-inner { max-width: 820px; margin: 0 auto; }
.dsh-memo-title-row { display: flex; align-items: center; gap: 10px; min-height: 32px; }
.dsh-memo-title-icon { display: inline-flex; color: var(--dsw-alias-state-business-primary); }
.dsh-memo-title { margin: 0; font-size: 17px; font-weight: 600; line-height: 24px; }
.dsh-memo-sub { color: var(--dsw-alias-label-tertiary); font-size: 12px; }
.dsh-memo-title-spacer { flex: 1 1 auto; }
.dsh-memo-shortcut {
  display: inline-flex; align-items: center; height: 24px; padding: 0 8px;
  border: 1px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-sm, 6px);
  color: var(--dsw-alias-label-tertiary); font-size: 11px; white-space: nowrap;
}
.dsh-memo-ghost {
  display: inline-flex; align-items: center; justify-content: center;
  height: 28px; padding: 0 10px; border-radius: var(--dsw-radius-sm, 6px);
  border: 1px solid transparent; background: transparent; color: var(--dsw-alias-label-secondary);
  font: inherit; font-size: 12px; line-height: 1; cursor: pointer;
}
.dsh-memo-ghost:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsh-memo-ghost[data-active='true'] { color: var(--dsw-alias-state-warn-primary); }
.dsh-memo-ghost:focus-visible, .dsh-memo-capture-text:focus-visible, .dsh-memo-capture-tags:focus-visible,
.dsh-memo-search:focus-visible, .dsh-memo-tab:focus-visible, .dsh-memo-chip:focus-visible,
.dsh-memo-check:focus-visible, .dsh-memo-action:focus-visible, .dsh-memo-primary:focus-visible,
.dsh-memo-edit-text:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
.dsh-memo-capture {
  margin-top: 12px; border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-lg, 10px); background: var(--dsw-alias-bg-layer-1);
  transition: border-color .15s ease;
}
.dsh-memo-capture:focus-within { border-color: var(--dsw-alias-state-business-primary); }
.dsh-memo-capture-text {
  display: block; box-sizing: border-box; width: 100%; min-height: 64px; max-height: 220px;
  padding: 12px 14px 4px; border: 0; background: transparent; color: inherit;
  font: inherit; line-height: 1.55; resize: none;
}
.dsh-memo-capture-text::placeholder, .dsh-memo-search::placeholder,
.dsh-memo-capture-tags::placeholder { color: var(--dsw-alias-label-tertiary); }
.dsh-memo-capture-text:focus, .dsh-memo-search:focus, .dsh-memo-capture-tags:focus, .dsh-memo-edit-text:focus { outline: none; }
.dsh-memo-capture-foot { display: flex; align-items: center; gap: 8px; padding: 0 8px 8px 14px; }
.dsh-memo-capture-tags {
  flex: 1 1 auto; min-width: 0; height: 28px; border: 0; background: transparent;
  color: inherit; font: inherit; font-size: 12px;
}
.dsh-memo-primary {
  flex: none; display: inline-flex; align-items: center; justify-content: center;
  height: 30px; padding: 0 14px; border: 0; border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-state-business-primary); color: var(--dsw-alias-label-primary-inverted, #fff);
  font: inherit; font-size: 13px; font-weight: 500; cursor: pointer;
}
.dsh-memo-primary:hover { filter: brightness(1.05); }
.dsh-memo-primary:disabled { opacity: .45; cursor: default; filter: none; }
.dsh-memo-tools { display: flex; align-items: center; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.dsh-memo-tabs { display: inline-flex; align-items: center; gap: 2px; padding: 2px; border-radius: var(--dsw-radius-md, 8px); background: var(--dsw-alias-bg-layer-2); }
.dsh-memo-tab {
  display: inline-flex; align-items: center; gap: 6px; height: 26px; padding: 0 10px;
  border: 0; border-radius: var(--dsw-radius-sm, 6px); background: transparent;
  color: var(--dsw-alias-label-secondary); font: inherit; font-size: 12px; cursor: pointer;
}
.dsh-memo-tab:hover { color: var(--dsw-alias-label-primary); }
.dsh-memo-tab[data-active='true'] { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); box-shadow: 0 1px 2px rgba(0,0,0,.12); }
.dsh-memo-tab-count { color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.dsh-memo-search {
  flex: 1 1 180px; min-width: 120px; height: 30px; padding: 0 10px; box-sizing: border-box;
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-bg-layer-1); color: inherit; font: inherit; font-size: 12px;
}
.dsh-memo-settings {
  display: flex; flex-direction: column; gap: 8px; margin-top: 10px; padding: 10px 12px;
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-lg, 10px);
  background: var(--dsw-alias-bg-layer-1);
}
.dsh-memo-settings-title { font-size: 12px; font-weight: 600; color: var(--dsw-alias-label-secondary); }
.dsh-memo-settings-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--dsw-alias-label-secondary); flex-wrap: wrap; }
.dsh-memo-settings-row label { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }
.dsh-memo-settings-time { width: 86px; height: 26px; }
.dsh-memo-settings-actions { display: flex; gap: 6px; }
.dsh-memo-tagbar { display: flex; align-items: center; gap: 6px; margin-top: 8px; overflow-x: auto; padding-bottom: 2px; }
.dsh-memo-chip {
  flex: none; display: inline-flex; align-items: center; gap: 4px; height: 22px; padding: 0 8px;
  border: 1px solid var(--dsw-alias-border-l2); border-radius: 999px; background: transparent;
  color: var(--dsw-alias-label-tertiary); font: inherit; font-size: 11px; cursor: pointer; white-space: nowrap;
}
.dsh-memo-chip:hover { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l3); }
.dsh-memo-chip[data-active='true'] { color: var(--dsw-alias-state-business-primary); border-color: var(--dsw-alias-state-business-primary); }
.dsh-memo-body {
  flex: 1 1 auto; min-height: 0; overflow-y: auto; box-sizing: border-box;
  padding: 14px 24px 48px; padding-left: max(24px, calc(var(--dsh-frame-leading-clearance, 0px) + 20px));
}
.dsh-memo-banner {
  display: flex; align-items: center; gap: 10px; margin-bottom: 12px; padding: 8px 12px;
  border: 1px solid var(--dsw-alias-state-error-primary); border-radius: var(--dsw-radius-md, 8px);
  color: var(--dsw-alias-state-error-primary); font-size: 12px;
}
.dsh-memo-banner-spacer { flex: 1 1 auto; }
.dsh-memo-list { display: flex; flex-direction: column; gap: 8px; }
.dsh-memo-item {
  display: flex; align-items: flex-start; gap: 10px; padding: 10px 10px 10px 12px;
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-lg, 10px);
  background: var(--dsw-alias-bg-layer-1);
}
.dsh-memo-item[data-pinned='true'] { border-color: var(--dsw-alias-border-l3); }
.dsh-memo-item[data-done='true'] .dsh-memo-note-text { color: var(--dsw-alias-label-tertiary); text-decoration: line-through; }
.dsh-memo-item[data-archived='true'] .dsh-memo-note-text { color: var(--dsw-alias-label-tertiary); }
.dsh-memo-item[data-trash='true'] { opacity: .78; background: var(--dsw-alias-bg-layer-2); }
.dsh-memo-item[data-selected='true'] { box-shadow: inset 0 0 0 2px var(--dsw-alias-state-business-primary); }
.dsh-memo-hit {
  padding: 0 1px; border-radius: 3px; color: var(--dsw-alias-label-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary) 24%, transparent);
}
.dsh-memo-archived-flag { color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.dsh-memo-icon-wrap { position: relative; display: inline-flex; align-items: center; justify-content: center; }
.dsh-memo-icon-badge {
  position: absolute; top: -4px; right: -5px; min-width: 14px; height: 14px; padding: 0 3px; box-sizing: border-box;
  border-radius: 7px; background: var(--dsw-alias-state-warn-primary);
  color: var(--dsw-alias-label-primary-inverted, #fff);
  font-family: inherit; font-size: 9px; font-weight: 600; line-height: 14px; text-align: center;
  pointer-events: none;
}
.dsh-memo-session-menu {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 8px; padding: 8px;
  border: 1px dashed var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-bg-layer-2);
}
.dsh-memo-session-hint { flex: 1 1 100%; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 1.5; }
.dsh-memo-action-notice {
  margin-bottom: 10px; padding: 6px 10px;
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary); font-size: 12px;
}
.dsh-memo-keyhint { margin-top: 8px; color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 1.4; }
.dsh-memo-item[data-trash='true'] .dsh-memo-note-text { color: var(--dsw-alias-label-secondary); }
.dsh-memo-check {
  flex: none; display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; margin-top: 1px; padding: 0; box-sizing: border-box;
  border: 1.5px solid var(--dsw-alias-border-l3); border-radius: 5px;
  background: transparent; color: var(--dsw-alias-label-primary-inverted, #fff); cursor: pointer;
}
.dsh-memo-check[data-checked='true'] { background: var(--dsw-alias-state-business-primary); border-color: var(--dsw-alias-state-business-primary); }
.dsh-memo-main { flex: 1 1 auto; min-width: 0; }
.dsh-memo-note-text { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.5; }
.dsh-memo-note-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 5px; }
.dsh-memo-note-time { color: var(--dsw-alias-label-caption); font-size: 11px; }
.dsh-memo-tag {
  display: inline-flex; align-items: center; height: 18px; padding: 0 6px;
  border-radius: 999px; background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-tertiary); font-size: 11px; border: 0; cursor: pointer; font-family: inherit;
}
.dsh-memo-tag:hover { color: var(--dsw-alias-label-primary); }
.dsh-memo-pin-flag { color: var(--dsw-alias-state-warn-primary); font-size: 11px; }
.dsh-memo-source {
  display: inline-flex; align-items: center; gap: 4px; max-width: 260px; height: 20px;
  padding: 0 8px; border: 1px solid var(--dsw-alias-border-l3); border-radius: 999px;
  background: transparent; color: var(--dsw-alias-state-business-primary);
  font: inherit; font-size: 11px; line-height: 1; cursor: pointer; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap;
}
.dsh-memo-source:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dsh-memo-source[data-available='false'] { color: var(--dsw-alias-label-tertiary); border-color: var(--dsw-alias-border-l2); cursor: default; }
.dsh-memo-source:focus-visible {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
.dsh-memo-actions { flex: none; display: inline-flex; align-items: center; gap: 2px; opacity: .55; transition: opacity .12s ease; }
.dsh-memo-item:hover .dsh-memo-actions, .dsh-memo-item:focus-within .dsh-memo-actions, .dsh-memo-actions[data-confirm='true'] { opacity: 1; }
.dsh-memo-action {
  display: inline-flex; align-items: center; justify-content: center; height: 26px;
  padding: 0 7px; border: 0; border-radius: var(--dsw-radius-sm, 6px);
  background: transparent; color: var(--dsw-alias-label-secondary);
  font: inherit; font-size: 11px; line-height: 1; cursor: pointer; white-space: nowrap;
}
.dsh-memo-action:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dsh-memo-action[data-danger='true']:hover { background: var(--dsw-alias-interactive-bg-hover-danger); color: var(--dsw-alias-state-error-primary); }
.dsh-memo-action:disabled { opacity: .4; cursor: default; }
.dsh-memo-edit-row { display: flex; flex-direction: column; gap: 6px; }
.dsh-memo-edit-text {
  box-sizing: border-box; width: 100%; min-height: 56px; padding: 8px 10px;
  border: 1px solid var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-bg-base); color: inherit; font: inherit; line-height: 1.5; resize: vertical;
}
.dsh-memo-edit-foot { display: flex; align-items: center; gap: 8px; }
.dsh-memo-edit-tags {
  flex: 1 1 auto; min-width: 0; height: 28px; padding: 0 8px; box-sizing: border-box;
  border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-sm, 6px);
  background: var(--dsw-alias-bg-base); color: inherit; font: inherit; font-size: 12px;
}
.dsh-memo-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
  min-height: 180px; color: var(--dsw-alias-label-tertiary); font-size: 13px; text-align: center;
}
.dsh-memo-empty-icon { color: var(--dsw-alias-border-l4); }
.dsh-memo-loading { display: flex; align-items: center; justify-content: center; min-height: 140px; color: var(--dsw-alias-label-tertiary); font-size: 13px; }
.dsh-memo-remind-meta { display: inline-flex; align-items: center; gap: 3px; color: var(--dsw-alias-label-tertiary); font-size: 11px; white-space: nowrap; }
.dsh-memo-remind-meta[data-overdue='true'] { color: var(--dsw-alias-state-warn-primary); font-weight: 500; }
.dsh-memo-remind-editor {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 8px; padding: 8px;
  border: 1px dashed var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-bg-layer-2);
}
.dsh-memo-remind-select { padding-right: 4px; }
.dsh-memo-remind-input {
  height: 28px; padding: 0 8px; box-sizing: border-box; border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-sm, 6px); background: var(--dsw-alias-bg-base);
  color: inherit; font: inherit; font-size: 12px; color-scheme: light dark;
}
.dsh-memo-remind-quick { display: inline-flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.dsh-memo-toast {
  position: absolute; right: 24px; top: calc(var(--dsh-frame-top-clearance, 0px) + 14px);
  z-index: 40; width: 348px; max-width: calc(100vw - 48px); box-sizing: border-box;
  display: flex; flex-direction: column; gap: 6px; padding: 12px 14px 12px 16px;
  border: 1px solid var(--dsw-alias-border-l3); border-left: 3px solid var(--dsw-alias-state-warn-primary);
  border-radius: var(--dsw-radius-lg, 10px); background: var(--dsw-alias-bg-layer-1);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .16);
  color: var(--dsw-alias-label-primary); font-size: 13px; line-height: 1.5;
  animation: dsh-memo-toast-in .16s ease-out;
}
@keyframes dsh-memo-toast-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: none; }
}
.dsh-memo-toast-head { display: flex; align-items: center; gap: 8px; min-height: 20px; }
.dsh-memo-toast-icon { display: inline-flex; flex: none; color: var(--dsw-alias-state-warn-primary); }
.dsh-memo-toast-title { flex: 1 1 auto; font-weight: 600; font-size: 13px; }
.dsh-memo-toast-time { color: var(--dsw-alias-label-tertiary); font-size: 11px; white-space: nowrap; }
.dsh-memo-toast-text {
  color: var(--dsw-alias-label-primary); overflow-wrap: anywhere;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}
.dsh-memo-toast-more { color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.dsh-memo-toast-actions { display: flex; align-items: center; gap: 6px; margin-top: 4px; flex-wrap: wrap; }
.dsh-memo-toast .dsh-memo-primary { height: 26px; padding: 0 10px; font-size: 12px; }
.dsh-memo-toast .dsh-memo-ghost { height: 26px; padding: 0 8px; font-size: 12px; }
@media (prefers-reduced-motion: reduce) {
  .dsh-memo-toast { animation: none; }
}
@keyframes dsh-memo-pulse { 0%, 100% { opacity: .45 } 50% { opacity: 1 } }
.dsh-memo-loading::before {
  content: ''; width: 14px; height: 14px; margin-right: 8px; border-radius: 50%;
  border: 2px solid var(--dsw-alias-border-l3); border-top-color: var(--dsw-alias-state-business-primary);
  animation: dsh-memo-spin .8s linear infinite;
}
@keyframes dsh-memo-spin { to { transform: rotate(360deg) } }
@media (prefers-reduced-motion: reduce) {
  .dsh-memo-loading::before { animation: none; }
  .dsh-memo-capture, .dsh-memo-actions { transition: none; }
}
.dsh-memo-search-row { flex: 1 1 220px; display: inline-flex; align-items: center; gap: 6px; min-width: 150px; }
.dsh-memo-search-row .dsh-memo-search { flex: 1 1 auto; }
.dsh-memo-switch-wrap, .dsh-memo-tip { position: relative; display: inline-flex; align-items: center; }
.dsh-memo-tip-pop[data-align='left'] { left: 0; right: auto; }
.dsh-memo-tip-pop {
  position: absolute; top: calc(100% + 8px); right: 0; z-index: 60;
  width: 262px; max-width: 70vw; box-sizing: border-box;
  padding: 8px 10px; border: 1px solid var(--dsw-alias-border-l2); border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-secondary);
  font-size: 11px; line-height: 1.5; text-align: left; white-space: normal;
  box-shadow: 0 6px 20px rgba(0, 0, 0, .18);
  opacity: 0; visibility: hidden; transform: translateY(-2px);
  transition: opacity .12s ease, transform .12s ease, visibility .12s;
  pointer-events: none;
}
.dsh-memo-switch-wrap:hover .dsh-memo-tip-pop,
.dsh-memo-switch-wrap:focus-within .dsh-memo-tip-pop,
.dsh-memo-tip:hover .dsh-memo-tip-pop,
.dsh-memo-tip:focus-within .dsh-memo-tip-pop { opacity: 1; visibility: visible; transform: none; }
@media (prefers-reduced-motion: reduce) { .dsh-memo-tip-pop { transition: none; } }
.dsh-memo-switch {
  flex: none; position: relative; display: inline-flex; align-items: center; gap: 7px;
  height: 30px; padding: 0 2px; color: var(--dsw-alias-label-secondary);
  font: inherit; font-size: 12px; cursor: pointer; white-space: nowrap; user-select: none;
}
.dsh-memo-switch:hover { color: var(--dsw-alias-label-primary); }
.dsh-memo-switch-label { line-height: 1; }
.dsh-memo-switch input {
  position: absolute; width: 1px; height: 1px; margin: 0; opacity: 0; pointer-events: none;
}
.dsh-memo-switch-track {
  position: relative; flex: none; width: 32px; height: 18px; box-sizing: border-box;
  border-radius: 999px; border: 1px solid var(--dsw-alias-border-l3);
  background: var(--dsw-alias-bg-layer-2);
  transition: background .15s ease, border-color .15s ease;
}
.dsh-memo-switch-thumb {
  position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; border-radius: 50%;
  background: var(--dsw-alias-label-tertiary);
  transition: transform .15s ease, background .15s ease;
}
.dsh-memo-switch input:checked + .dsh-memo-switch-track {
  background: var(--dsw-alias-state-business-primary);
  border-color: var(--dsw-alias-state-business-primary);
}
.dsh-memo-switch input:checked + .dsh-memo-switch-track .dsh-memo-switch-thumb {
  transform: translateX(14px); background: var(--dsw-alias-label-primary-inverted, #fff);
}
.dsh-memo-switch input:focus-visible + .dsh-memo-switch-track {
  outline: var(--dsw-focus-ring-width, 2px) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
@media (prefers-reduced-motion: reduce) {
  .dsh-memo-switch-track, .dsh-memo-switch-thumb { transition: none; }
}
.dsh-memo-semantic-line { margin-top: 6px; color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.dsh-memo-semantic-line[data-warn='true'] { color: var(--dsw-alias-state-warn-primary); }
.dsh-memo-semantic-flag {
  display: inline-flex; align-items: center; height: 18px; padding: 0 6px;
  border-radius: 999px; background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-state-business-primary); font-size: 10px; white-space: nowrap;
}
.dsh-memo-settings-divider { height: 1px; margin: 4px 0; background: var(--dsw-alias-border-l2); }
.dsh-memo-restore {
  display: flex; flex-direction: column; gap: 6px; margin-top: 8px; padding: 8px;
  border: 1px dashed var(--dsw-alias-border-l3); border-radius: var(--dsw-radius-md, 8px);
  background: var(--dsw-alias-bg-layer-2); max-height: 240px; overflow-y: auto;
}
.dsh-memo-restore-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--dsw-alias-label-secondary); padding: 2px 4px; border-radius: var(--dsw-radius-sm, 6px); }
.dsh-memo-restore-row[data-picked='true'] { background: var(--dsw-alias-bg-layer-1); }
.dsh-memo-restore-time { flex: none; min-width: 90px; font-variant-numeric: tabular-nums; }
.dsh-memo-restore-size { flex: none; min-width: 52px; color: var(--dsw-alias-label-tertiary); }
.dsh-memo-restore-name { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--dsw-alias-label-tertiary); font-size: 11px; }
.dsh-memo-settings-hint { color: var(--dsw-alias-label-tertiary); font-size: 11px; line-height: 1.5; }
`

    /**
     * Join truthy class names.
     * @param {...unknown} parts - candidate class names.
     * @returns the joined string.
     */
    function cn(...parts) {
      return parts.filter((part) => typeof part === 'string' && part.length > 0).join(' ')
    }

    /** @returns the textarea row count that fits `text`, bounded for layout stability. */
    function rowsFor(text) {
      const lines = String(text ?? '').split('\n')
      return Math.min(8, Math.max(2, lines.length))
    }

    /** localStorage key for the panel preferences. */
    const PREF_KEY = 'memo.preferences.v1'

    /**
     * Read the persisted panel preferences; storage may be unavailable.
     * @returns the stored object (possibly empty).
     */
    function readPreferences() {
      try {
        if (typeof localStorage === 'undefined') return {}
        const raw = localStorage.getItem(PREF_KEY)
        return raw === null ? {} : JSON.parse(raw)
      } catch {
        return {}
      }
    }

    /**
     * Merge one preference patch into storage.
     * @param patch - fields to persist.
     */
    function writePreferences(patch) {
      try {
        if (typeof localStorage === 'undefined') return
        localStorage.setItem(PREF_KEY, JSON.stringify({ ...readPreferences(), ...patch }))
      } catch {
        // Persisting preferences is best-effort only.
      }
    }

    /**
     * Split one note body into plain and highlighted segments for a search term.
     * @param text - note text.
     * @param term - trimmed search term (already lower-cased by callers as needed).
     * @returns the original string, or React nodes with `mark` segments.
     */
    function highlightText(text, term) {
      if (term.length === 0) return text
      const lower = text.toLowerCase()
      const needle = term.toLowerCase()
      const parts = []
      let cursor = 0
      let found = lower.indexOf(needle)
      while (found !== -1) {
        if (found > cursor) parts.push(text.slice(cursor, found))
        parts.push(h('mark', { key: `hit-${found}`, className: 'dsh-memo-hit' }, text.slice(found, found + needle.length)))
        cursor = found + needle.length
        found = lower.indexOf(needle, cursor)
      }
      if (parts.length === 0) return text
      if (cursor < text.length) parts.push(text.slice(cursor))
      return parts
    }

    /**
     * Human size for the backup line.
     * @param bytes - byte count.
     * @returns e.g. `8 KB`, `1.4 MB`.
     */
    function formatBytes(bytes) {
      const value = Number(bytes)
      if (!Number.isFinite(value) || value <= 0) return '0 KB'
      if (value < 1024) return `${value} B`
      if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`
      return `${Math.round(value / (1024 * 1024) * 10) / 10} MB`
    }

    /**
     * Format one ISO timestamp for a row.
     * @param iso - stored timestamp.
     * @returns a short date-time string in the browser locale.
     */
    function formatTimestamp(iso) {
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return ''
      try {
        return new Intl.DateTimeFormat(undefined, {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }).format(date)
      } catch {
        return date.toISOString().slice(5, 16).replace('T', ' ')
      }
    }

    /**
     * Convert a stored ISO reminder into the local value a datetime-local input expects.
     * @param iso - stored reminder time.
     * @returns `YYYY-MM-DDTHH:mm`, or an empty string when there is no reminder.
     */
    function toLocalInput(iso) {
      if (iso == null || iso === '') return ''
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return ''
      const pad = (value) => String(value).padStart(2, '0')
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    /**
     * Convert a datetime-local input value into a stored ISO reminder.
     * @param value - input value.
     * @returns an ISO string, or null for an empty or invalid value.
     */
    function fromLocalInput(value) {
      if (typeof value !== 'string' || value.length === 0) return null
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? null : date.toISOString()
    }

    /** @returns an ISO reminder time `minutes` from now. */
    function isoAfterMinutes(minutes) {
      return new Date(Date.now() + minutes * 60000).toISOString()
    }

    /** @returns an ISO reminder time for tomorrow at 09:00 local time. */
    function isoTomorrowMorning() {
      const date = new Date()
      date.setDate(date.getDate() + 1)
      date.setHours(9, 0, 0, 0)
      return date.toISOString()
    }

    /** Repeat choices shared by the capture box and the row editor. */
    const REPEAT_VALUES = ['', 'daily', 'weekly', 'weekdays', 'interval:15', 'interval:30', 'interval:60']

    /**
     * Map one repeat select value to the wire fields.
     * @param value - select value such as `'daily'`, `'interval:30'` or `''`.
     * @returns `{ repeat, repeatMinutes }` accepted by the Host.
     */
    function repeatSpecFromValue(value) {
      if (value === 'daily' || value === 'weekly' || value === 'weekdays') return { repeat: value, repeatMinutes: null }
      if (typeof value === 'string' && value.startsWith('interval:')) {
        const minutes = Number(value.slice('interval:'.length))
        if (Number.isSafeInteger(minutes) && minutes > 0) return { repeat: 'interval', repeatMinutes: minutes }
      }
      return { repeat: null, repeatMinutes: null }
    }

    /**
     * Map one note's stored repeat rule back to a select value.
     * @param note - note row.
     * @returns the matching select value.
     */
    function repeatValueOf(note) {
      if (note.repeat === 'daily' || note.repeat === 'weekly' || note.repeat === 'weekdays') return note.repeat
      if (note.repeat === 'interval') return `interval:${String(note.repeatMinutes ?? 60)}`
      return ''
    }

    /**
     * Human label of a repeat select value or note.
     * @param t - bound locale translator.
     * @param value - select value.
     * @returns the localized label, empty when the reminder does not repeat.
     */
    function repeatLabelOf(t, value) {
      if (value === 'daily') return t('repeatDaily')
      if (value === 'weekly') return t('repeatWeekly')
      if (value === 'weekdays') return t('repeatWeekdays')
      if (value === 'interval:15') return t('repeatEvery15')
      if (value === 'interval:30') return t('repeatEvery30')
      if (value === 'interval:60') return t('repeatEvery60')
      if (typeof value === 'string' && value.startsWith('interval:')) return t('repeatLabel')
      return ''
    }

    /**
     * Whether one note's reminder is due.
     * @param note - candidate note.
     * @param now - current epoch milliseconds.
     * @returns true when a live reminder has reached its time and is not acknowledged.
     */
    function isReminderDue(note, now) {
      return note.remindAt != null && note.remindAckedAt == null && !note.done && !note.archived && Date.parse(note.remindAt) <= now
    }

    /**
     * Whether two timestamps fall on the same local calendar day.
     * @param left - ISO timestamp.
     * @param right - Date to compare against.
     * @returns true on the same local day.
     */
    function sameLocalDay(left, right) {
      const a = new Date(left)
      return a.getFullYear() === right.getFullYear() && a.getMonth() === right.getMonth() && a.getDate() === right.getDate()
    }

    /**
     * Whether one note belongs to the today list: an open note whose reminder is
     * scheduled for today, or an unacknowledged overdue one.
     * @param note - candidate note.
     * @param now - current epoch milliseconds.
     * @returns true when the note is worth doing today.
     */
    function isTodayTodo(note, now) {
      if (note.archived || note.done || note.remindAt == null) return false
      const time = Date.parse(note.remindAt)
      if (Number.isNaN(time)) return false
      return sameLocalDay(note.remindAt, new Date(now)) || (time <= now && note.remindAckedAt == null)
    }

    /**
     * Due reminders, soonest first.
     * @param notes - all notes.
     * @param now - current epoch milliseconds.
     * @returns due notes.
     */
    function dueNotes(notes, now) {
      return notes.filter((note) => isReminderDue(note, now)).sort((left, right) => left.remindAt.localeCompare(right.remindAt))
    }

    /**
     * Read one memo response body, turning a non-ok envelope into an Error.
     * @param response - Fetch response.
     * @returns the decoded body.
     */
    async function readMemoResponse(response) {
      let body
      try {
        body = await response.json()
      } catch {
        body = null
      }
      if (!response.ok) {
        const reason = body !== null && typeof body.error === 'string' ? body.error : `HTTP ${response.status}`
        throw new Error(reason)
      }
      if (body === null || body.ok !== true) throw new Error('the memo store answered an unexpected body')
      return body
    }

    /**
     * Create the React-free memo store shared by the panel and its actions.
     * Loads and mutations are serialized so a slow response cannot publish an
     * older list over a newer one.
     * @returns the observable store plus its commands.
     */
    function createMemoStore() {
      let snapshot = { status: 'loading', notes: [], settings: copySettings(DEFAULT_SETTINGS), semantic: null, backup: null, error: null, busy: false }
      const listeners = new Set()
      let loading = null
      let queue = Promise.resolve()

      const publish = (patch) => {
        snapshot = { ...snapshot, ...patch }
        for (const listener of [...listeners]) listener()
      }

      const endpoint = () => new URL(ENDPOINT, document.baseURI).href

      const load = (options) => {
        const quiet = options?.quiet === true
        if (loading !== null) return loading
        if (!quiet) publish({ status: snapshot.notes.length === 0 ? 'loading' : snapshot.status, error: null })
        loading = (async () => {
          try {
            const body = await readMemoResponse(await fetch(endpoint(), { headers: { accept: 'application/json' } }))
            publish({
              status: 'ready',
              notes: body.notes,
              ...(body.settings === undefined ? {} : { settings: copySettings(body.settings) }),
              ...(body.semantic === undefined ? {} : { semantic: body.semantic }),
              ...(body.backup === undefined ? {} : { backup: body.backup }),
              error: null,
            })
          } catch (error) {
            if (quiet && snapshot.notes.length > 0) publish({ status: 'ready' })
            else publish({ status: snapshot.notes.length === 0 ? 'error' : 'ready', error: errorMessage(error) })
          } finally {
            loading = null
          }
        })()
        return loading
      }

      const send = (operation) => {
        const run = queue.then(async () => {
          publish({ busy: true, error: null })
          try {
            const body = await readMemoResponse(await fetch(endpoint(), {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(operation),
            }))
            publish({
              status: 'ready',
              notes: body.notes,
              ...(body.settings === undefined ? {} : { settings: copySettings(body.settings) }),
              ...(body.semantic === undefined ? {} : { semantic: body.semantic }),
              ...(body.backup === undefined ? {} : { backup: body.backup }),
              busy: false,
              error: null,
            })
            return true
          } catch (error) {
            publish({ busy: false, error: errorMessage(error) })
            return false
          }
        })
        queue = run.then(() => undefined, () => undefined)
        return run
      }

      /**
       * One auxiliary POST (semantic search, status, rebuild) that must not touch
       * the note list or the busy flag.
       * @param operation - `{ op, ... }` body for the Host.
       * @returns the decoded body.
       */
      const invoke = (operation) => {
        const run = queue.then(async () => {
          try {
            const body = await readMemoResponse(await fetch(endpoint(), {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(operation),
            }))
            if (Array.isArray(body.notes)) {
              publish({
                status: 'ready',
                notes: body.notes,
                ...(body.settings === undefined ? {} : { settings: copySettings(body.settings) }),
                busy: false,
              })
            }
            if (body.semantic !== undefined) publish({ semantic: body.semantic })
            if (body.backup !== undefined) publish({ backup: body.backup })
            return body
          } catch (error) {
            publish({ error: errorMessage(error) })
            throw error
          }
        })
        queue = run.then(() => undefined, () => undefined)
        return run
      }

      return {
        getSnapshot: () => snapshot,
        subscribe: (listener) => {
          listeners.add(listener)
          return () => {
            listeners.delete(listener)
          }
        },
        load,
        send,
        invoke,
        search: (query) => invoke({ op: 'search', query }),
        semanticStatus: () => invoke({ op: 'semanticStatus' }),
        reindex: () => invoke({ op: 'reindex' }),
        testEmbedding: (semantic) => invoke({ op: 'testEmbedding', semantic }),
        exportNotes: (format) => invoke({ op: 'export', format }),
        backupNow: () => invoke({ op: 'backupNow' }),
        cleanupBackups: () => invoke({ op: 'cleanupBackups', keep: 1 }),
        listBackups: () => invoke({ op: 'listBackups' }),
        restoreBackup: (name) => invoke({ op: 'restoreBackup', name }),
      }
    }

    /**
     * Create the tiny observable the shortcut uses to request focus, even when
     * the panel is already the active one.
     * @returns {{getSnapshot: () => number, subscribe: (listener: () => void) => () => void, bump: () => void}} the focus store.
     */
    function createFocusStore() {
      let version = 0
      const listeners = new Set()
      return {
        getSnapshot: () => version,
        subscribe: (listener) => {
          listeners.add(listener)
          return () => {
            listeners.delete(listener)
          }
        },
        bump: () => {
          version += 1
          for (const listener of [...listeners]) listener()
        },
      }
    }

    /** Fallback preferences until the Host answers. */
    const DEFAULT_SETTINGS = {
      systemNotifications: true,
      sound: false,
      quietHours: { enabled: false, start: '22:00', end: '08:00' },
      semantic: { enabled: false, endpoint: 'http://127.0.0.1:11434', model: 'bge-m3', numCtx: 1024, minScore: 0.48 },
      backup: { retentionDays: 30 },
    }

    /**
     * Copy one settings object so UI drafts never mutate the store snapshot.
     * @param settings - settings to copy.
     * @returns a detached copy.
     */
    function copySettings(settings) {
      const source = settings !== null && typeof settings === 'object' ? settings : DEFAULT_SETTINGS
      return {
        systemNotifications: source.systemNotifications !== false,
        sound: source.sound === true,
        quietHours: {
          enabled: source.quietHours?.enabled === true,
          start: source.quietHours?.start ?? DEFAULT_SETTINGS.quietHours.start,
          end: source.quietHours?.end ?? DEFAULT_SETTINGS.quietHours.end,
        },
        semantic: {
          enabled: source.semantic?.enabled === true,
          endpoint: typeof source.semantic?.endpoint === 'string' ? source.semantic.endpoint : DEFAULT_SETTINGS.semantic.endpoint,
          model: typeof source.semantic?.model === 'string' ? source.semantic.model : DEFAULT_SETTINGS.semantic.model,
          numCtx: Number.isSafeInteger(source.semantic?.numCtx) ? source.semantic.numCtx : DEFAULT_SETTINGS.semantic.numCtx,
          minScore: typeof source.semantic?.minScore === 'number' ? source.semantic.minScore : DEFAULT_SETTINGS.semantic.minScore,
        },
        backup: {
          retentionDays: Number.isSafeInteger(source.backup?.retentionDays) ? source.backup.retentionDays : DEFAULT_SETTINGS.backup.retentionDays,
        },
      }
    }

    /**
     * Whether a clock time falls inside a quiet-hours window (wrapping midnight).
     * @param clock - minutes since local midnight.
     * @param start - `HH:MM` window start.
     * @param end - `HH:MM` window end.
     * @returns true inside the window.
     */
    function insideQuietHours(clock, start, end) {
      const parse = (value) => {
        const match = /^(\d{2}):(\d{2})$/.exec(String(value ?? ''))
        return match === null ? null : Number(match[1]) * 60 + Number(match[2])
      }
      const from = parse(start)
      const to = parse(end)
      if (from === null || to === null || from === to) return false
      return from < to ? clock >= from && clock < to : clock >= from || clock < to
    }

    /**
     * Current local clock reading in minutes.
     * @returns minutes since local midnight.
     */
    function localClockMinutes() {
      const date = new Date()
      return date.getHours() * 60 + date.getMinutes()
    }

    /** @returns a soft two-tone reminder chime, or nothing when audio is unavailable. */
    function playReminderSound() {
      try {
        const AudioCtor = globalThis.AudioContext ?? globalThis.webkitAudioContext
        if (typeof AudioCtor !== 'function') return
        const audio = new AudioCtor()
        const now = audio.currentTime
        for (const [offset, frequency] of [[0, 880], [0.18, 1174.66]]) {
          const oscillator = audio.createOscillator()
          const gain = audio.createGain()
          oscillator.type = 'sine'
          oscillator.frequency.value = frequency
          gain.gain.setValueAtTime(0.0001, now + offset)
          gain.gain.exponentialRampToValueAtTime(0.12, now + offset + 0.02)
          gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.16)
          oscillator.connect(gain).connect(audio.destination)
          oscillator.start(now + offset)
          oscillator.stop(now + offset + 0.18)
        }
        setTimeout(() => void audio.close().catch(() => {}), 600)
      } catch {
        // Sound is a preference, never a failure path.
      }
    }

    /** @returns a human-readable message from an unknown rejection. */
    function errorMessage(error) {
      if (error instanceof Error && error.message.length > 0) return error.message
      return String(error)
    }

    /** @returns a small clock glyph for the reminder toast. */
    function ReminderGlyph({ size = 15 }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 2,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
        },
        h('circle', { cx: 12, cy: 12, r: 9 }),
        h('path', { d: 'M12 7v5l3.2 2' }),
      )
    }

    /**
     * The note glyph without any state; used by both the sidebar entry and the page
     * title so neither has to know about the other's props.
     * @param props - glyph size.
     */
    function MemoGlyph({ size = 18 }) {
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
        },
        h('path', { d: 'M6.5 3.5h8.2L19 7.8v12.7h-12.5z' }),
        h('path', { d: 'M14.7 3.5v4.3H19' }),
        h('path', { d: 'M9 12h6M9 15.5h6' }),
      )
    }

    /**
     * Sidebar entry glyph: the note mark plus a warning dot while a reminder is due.
     * @param props - sidebar size, selected state and the injected memo state hook.
     */
    function MemoIcon({ size = 18, useMemoState }) {
      const dueCount =
        useMemoState === undefined
          ? 0
          : useMemoState((state) => {
              let count = 0
              for (const note of state.notes) {
                if (note.deletedAt != null || note.archived || note.done) continue
                if (note.remindAt == null || note.remindAckedAt != null) continue
                if (Date.parse(note.remindAt) <= Date.now()) count += 1
              }
              return count
            })
      return h(
        'span',
        { className: 'dsh-memo-icon-wrap', 'data-due': dueCount > 0 ? 'true' : 'false' },
        h(
          'svg',
          {
            width: size,
            height: size,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth: 1.7,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            'aria-hidden': true,
          },
          h('path', { d: 'M6.5 3.5h8.2L19 7.8v12.7h-12.5z' }),
          h('path', { d: 'M14.7 3.5v4.3H19' }),
          h('path', { d: 'M9 12h6M9 15.5h6' }),
        ),
        dueCount > 0 ? h('span', { className: 'dsh-memo-icon-badge', 'aria-hidden': true }, dueCount > 99 ? '99+' : String(dueCount)) : null,
      )
    }

    /** @returns the empty-state illustration. */
    function EmptyMark() {
      return h(
        'svg',
        { className: 'dsh-memo-empty-icon', width: 34, height: 34, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, 'aria-hidden': true },
        h('rect', { x: 4, y: 3.5, width: 16, height: 17, rx: 2.5 }),
        h('path', { d: 'M8 9h8M8 13h8M8 17h5' }),
      )
    }

    /**
     * Document-wide style sheet. The memo page and the reminder toast may not be
     * mounted at the same time, so the sheet lives in its own frame entry rather
     * than inside either component.
     * @returns the style element for the shared overlay slot.
     */
    function MemoGlobalStyles() {
      return h('style', null, STYLES)
    }

    /**
     * Frame-wide reminder toast. It reads the shared store, shows the earliest due
     * reminder, and mirrors it to a desktop notification when the page is allowed
     * to send one. Acknowledging writes through the Host so every window agrees.
     * @param props - slot standard props plus injected actions, formatter and hooks.
     */
    function ReminderToast(props) {
      const { t, actions, formatTime, onOpenMemo, useMemoState } = props
      const snapshot = useMemoState((state) => state)
      const [tick, setTick] = React.useState(0)
      const notified = React.useRef(new Set())

      React.useEffect(() => {
        const timer = setInterval(() => setTick((value) => value + 1), 15000)
        return () => clearInterval(timer)
      }, [])

      const due = React.useMemo(() => dueNotes(snapshot.notes, Date.now()), [snapshot.notes, tick])
      const settings = snapshot.settings ?? copySettings(DEFAULT_SETTINGS)
      const quiet = settings.quietHours.enabled && insideQuietHours(localClockMinutes(), settings.quietHours.start, settings.quietHours.end)

      React.useEffect(() => {
        for (const note of due) {
          const key = `${note.id}@${note.remindAt}`
          if (notified.current.has(key)) continue
          notified.current.add(key)
          if (quiet) continue
          if (settings.sound) playReminderSound()
          if (!settings.systemNotifications) continue
          if (typeof Notification === 'undefined' || Notification.permission !== 'granted') continue
          try {
            new Notification(t('remindToastTitle'), { body: note.text })
          } catch {
            // Desktop notifications are optional; the in-app toast remains.
          }
        }
      }, [due, t, quiet, settings.sound, settings.systemNotifications])

      const note = due[0]
      if (note === undefined) return null
      return h(
        'div',
        { className: 'dsh-memo-toast', role: 'status', 'aria-live': 'polite' },
        h(
          'div',
          { className: 'dsh-memo-toast-head' },
          h('span', { className: 'dsh-memo-toast-icon' }, h(ReminderGlyph, { size: 15 })),
          h('span', { className: 'dsh-memo-toast-title' }, t('remindToastTitle')),
          h('span', { className: 'dsh-memo-toast-time' }, formatTime(note.remindAt)),
        ),
        h('div', { className: 'dsh-memo-toast-text' }, note.text),
        quiet ? h('div', { className: 'dsh-memo-toast-more' }, t('quietHint')) : null,
        note.repeat == null
          ? null
          : h('div', { className: 'dsh-memo-toast-more' }, t('repeatToastHint').replace('{label}', repeatLabelOf(t, repeatValueOf(note)))),
        due.length > 1 ? h('div', { className: 'dsh-memo-toast-more' }, t('remindMoreDue').replace('{count}', String(due.length - 1))) : null,
        h(
          'div',
          { className: 'dsh-memo-toast-actions' },
          h(
            'button',
            { type: 'button', className: 'dsh-memo-primary', onClick: () => void actions.send({ op: 'ackReminder', id: note.id }) },
            t('remindAcknowledge'),
          ),
          h(
            'button',
            { type: 'button', className: 'dsh-memo-ghost', onClick: () => void actions.send({ op: 'snoozeReminder', id: note.id, minutes: 10 }) },
            t('remindSnooze'),
          ),
          h(
            'button',
            { type: 'button', className: 'dsh-memo-ghost', onClick: () => void actions.send({ op: 'snoozeReminder', id: note.id, minutes: 60 }) },
            t('remindSnooze60'),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dsh-memo-ghost',
              onClick: () => void actions.send({ op: 'snoozeReminder', id: note.id, until: isoTomorrowMorning() }),
            },
            t('remindSnoozeTomorrow'),
          ),
          h('button', { type: 'button', className: 'dsh-memo-ghost', onClick: onOpenMemo }, t('openMemo')),
        ),
      )
    }

    /**
     * The memo page: quick capture, filters, search and the note list.
     * @param props - slot standard props plus the store, focus store and formatters.
     */
    function MemoPanel(props) {
      const { t, actions, formatTime, parseTags, useMemoState, useFocusRequest, usePanelInfo, useSessions, onOpenSession, onStartSession } = props
      const snapshot = useMemoState((state) => state)
      const focusVersion = useFocusRequest((version) => version)
      const active = usePanelInfo((info) => info.activePanelId === PANEL_ID)
      const sessionsById = useSessions((list) => list.byId)
      const mainSession = React.useMemo(() => {
        const rows = Object.values(sessionsById ?? {})
        return rows.find((row) => (row.retainedBy?.mainView ?? 0) > 0) ?? null
      }, [sessionsById])

      const sourceSessionLabel = (sessionId) => {
        const row = sessionsById[sessionId]
        if (row === undefined) return { label: t('sourceSessionMissing'), available: false }
        return { label: row.blank ? t('newSession') : row.title || t('untitledSession'), available: true }
      }

      const [draft, setDraft] = React.useState('')
      const [draftTags, setDraftTags] = React.useState('')
      const [search, setSearch] = React.useState('')
      const [filter, setFilter] = React.useState('active')
      const [tagFilter, setTagFilter] = React.useState(null)
      const [editing, setEditing] = React.useState(null)
      const [confirmId, setConfirmId] = React.useState(null)
      const [reminderEdit, setReminderEdit] = React.useState(null)
      const [captureRemindOpen, setCaptureRemindOpen] = React.useState(false)
      const [captureRemindAt, setCaptureRemindAt] = React.useState(null)
      const [captureRepeat, setCaptureRepeat] = React.useState('')
      const [settingsOpen, setSettingsOpen] = React.useState(false)
      const [settingsDraft, setSettingsDraft] = React.useState(() => copySettings(DEFAULT_SETTINGS))
      const [semanticMode, setSemanticMode] = React.useState(() => readPreferences().semanticMode !== false)
      const [searchInAll, setSearchInAll] = React.useState(() => readPreferences().searchInAll !== false)
      const [selectedIndex, setSelectedIndex] = React.useState(-1)
      const [semanticResult, setSemanticResult] = React.useState(null)
      const [semanticPending, setSemanticPending] = React.useState(false)
      const [semanticBusy, setSemanticBusy] = React.useState(false)
      const [semanticTestResult, setSemanticTestResult] = React.useState('')
      const [dataNotice, setDataNotice] = React.useState('')
      const [, setClockTick] = React.useState(0)
      const [restoreOpen, setRestoreOpen] = React.useState(false)
      const [restoreEntries, setRestoreEntries] = React.useState(null)
      const [restorePick, setRestorePick] = React.useState(null)
      const [restoreBusy, setRestoreBusy] = React.useState(false)
      const [sessionMenuId, setSessionMenuId] = React.useState(null)
      const [actionNotice, setActionNotice] = React.useState('')
      const inputRef = React.useRef(null)
      const searchRef = React.useRef(null)
      const itemRefs = React.useRef(new Map())
      const keyStateRef = React.useRef({})
      const keyboardConfirmRef = React.useRef(null)

      // Transient feedback for note → session actions.
      React.useEffect(() => {
        if (actionNotice === '') return undefined
        const timer = setTimeout(() => setActionNotice(''), 4000)
        return () => clearTimeout(timer)
      }, [actionNotice])

      // Re-evaluate reminder badges while the page stays open.
      React.useEffect(() => {
        const timer = setInterval(() => setClockTick((value) => value + 1), 30000)
        return () => clearInterval(timer)
      }, [])

      React.useEffect(() => {
        writePreferences({ semanticMode })
      }, [semanticMode])

      React.useEffect(() => {
        writePreferences({ searchInAll })
      }, [searchInAll])

      // Panel-level keyboard control. The latest state is read through a ref so
      // the listener can be bound once per activation.
      React.useEffect(() => {
        keyStateRef.current = { visible, selectedIndex, search, settingsOpen, restoreOpen, sessionMenuId }
      })
      React.useEffect(() => {
        if (!active) return undefined
        const onKeyDown = (event) => {
          if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
          const target = event.target
          if (target !== null && target !== undefined && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable === true)) return
          const state = keyStateRef.current
          if (state.settingsOpen === true || state.restoreOpen === true) return
          const list = state.visible ?? []
          const index = state.selectedIndex ?? -1
          if (event.key === '/') {
            event.preventDefault()
            if (searchRef.current !== null) searchRef.current.focus()
            return
          }
          if (event.key === 'Escape') {
            keyboardConfirmRef.current = null
            if (state.sessionMenuId != null) {
              event.preventDefault()
              setSessionMenuId(null)
              return
            }
            if ((state.search ?? '').length > 0) {
              event.preventDefault()
              setSearch('')
            } else if (index >= 0) {
              event.preventDefault()
              setSelectedIndex(-1)
            }
            return
          }
          if (list.length === 0) return
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setSelectedIndex((current) => Math.min(list.length - 1, current + 1))
            return
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault()
            setSelectedIndex((current) => Math.max(0, current <= 0 ? 0 : current - 1))
            return
          }
          if (index < 0 || index >= list.length) return
          const note = list[index]
          if (note === undefined || note.deletedAt != null) return
          if (event.key === 'x' || event.key === 'X') {
            event.preventDefault()
            void actions.send({ op: 'update', id: note.id, done: !note.done })
          } else if (event.key === 'p' || event.key === 'P') {
            event.preventDefault()
            void actions.send({ op: 'update', id: note.id, pinned: !note.pinned })
          } else if (event.key === 'e' || event.key === 'E' || event.key === 'Enter') {
            event.preventDefault()
            startEdit(note)
          } else if (event.key === 'Delete') {
            event.preventDefault()
            if (keyboardConfirmRef.current === note.id) {
              keyboardConfirmRef.current = null
              setConfirmId(null)
              void actions.send({ op: 'delete', id: note.id })
            } else {
              keyboardConfirmRef.current = note.id
              setConfirmId(note.id)
            }
          }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => document.removeEventListener('keydown', onKeyDown)
      }, [active, actions])

      // Load the backup list when the restore picker is open.
      React.useEffect(() => {
        if (!restoreOpen) return undefined
        let cancelled = false
        setRestoreEntries(null)
        setRestorePick(null)
        void actions
          .listBackups()
          .then((body) => {
            if (cancelled) return
            setRestoreEntries(Array.isArray(body.backups) ? body.backups : [])
          })
          .catch(() => {
            if (!cancelled) setRestoreEntries([])
          })
        return () => {
          cancelled = true
        }
      }, [restoreOpen, actions])

      React.useEffect(() => {
        void actions.load()
      }, [actions])

      React.useEffect(() => {
        if (active) void actions.load()
      }, [active, actions])

      React.useEffect(() => {
        if (!active || inputRef.current === null) return undefined
        const frame = requestAnimationFrame(() => {
          if (inputRef.current !== null) inputRef.current.focus()
        })
        return () => cancelAnimationFrame(frame)
      }, [active, focusVersion])

      const notes = snapshot.notes
      const semantic = snapshot.semantic ?? null
      const semanticEnabled = snapshot.settings.semantic.enabled === true

      // Semantic search: debounce keystrokes, then ask the Host to rank by meaning.
      React.useEffect(() => {
        const query = search.trim()
        if (!semanticEnabled || !semanticMode || query.length === 0) {
          setSemanticResult(null)
          setSemanticPending(false)
          return undefined
        }
        let cancelled = false
        const timer = setTimeout(() => {
          setSemanticPending(true)
          void actions
            .search(query)
            .then((body) => {
              if (cancelled) return
              const scores = new Map()
              for (const match of Array.isArray(body.matches) ? body.matches : []) scores.set(match.id, match.score)
              setSemanticResult({ query, scores })
              setSemanticPending(false)
            })
            .catch(() => {
              if (cancelled) return
              setSemanticResult({ query, scores: new Map() })
              setSemanticPending(false)
            })
        }, 300)
        return () => {
          cancelled = true
          clearTimeout(timer)
        }
      }, [search, semanticEnabled, semanticMode, actions])

      // While the index is being built, refresh progress so the hint line moves.
      const semanticBuilding = semantic?.building === true
      React.useEffect(() => {
        if (!semanticEnabled || !semanticBuilding || typeof actions.semanticStatus !== 'function') return undefined
        const timer = setInterval(() => {
          void actions.semanticStatus().catch(() => undefined)
        }, 1500)
        return () => clearInterval(timer)
      }, [semanticEnabled, semanticBuilding, actions])
      const counts = React.useMemo(() => {
        let open = 0
        let done = 0
        let archived = 0
        let remind = 0
        let today = 0
        let trash = 0
        const nowMs = Date.now()
        for (const note of notes) {
          if (note.deletedAt != null) {
            trash += 1
            continue
          }
          if (note.archived) {
            archived += 1
            continue
          }
          if (note.remindAt != null) remind += 1
          if (isTodayTodo(note, nowMs)) today += 1
          if (note.done) done += 1
          else open += 1
        }
        return { active: open, done, archived, remind, today, trash }
      }, [notes])

      const tagCatalog = React.useMemo(() => {
        const seen = new Map()
        for (const note of notes) {
          if (note.archived || note.deletedAt != null) continue
          for (const tag of note.tags) seen.set(tag, (seen.get(tag) ?? 0) + 1)
        }
        return [...seen.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      }, [notes])

      const visible = React.useMemo(() => {
        const rawTerm = search.trim()
        const term = rawTerm.toLowerCase()
        // With a query and the "all notes" scope, the view filter is bypassed so
        // archived or completed matches are not hidden behind the current tab.
        const scopeAll = rawTerm.length > 0 && searchInAll && filter !== 'trash'
        const inView = notes.filter((note) => {
          if (filter === 'trash') {
            if (note.deletedAt == null) return false
          } else if (!scopeAll && note.deletedAt != null) {
            return false
          }
          if (tagFilter !== null && !note.tags.includes(tagFilter)) return false
          if (scopeAll) return true
          if (filter === 'today') return isTodayTodo(note, Date.now())
          if (filter === 'remind') return !note.archived && note.remindAt != null
          if (filter === 'archived') return note.archived
          if (note.archived) return false
          if (filter === 'active') return !note.done
          if (filter === 'done') return note.done
          return true
        })
        if (term.length === 0) {
          if (filter === 'trash') return inView.slice().sort((left, right) => (right.deletedAt ?? '').localeCompare(left.deletedAt ?? ''))
          return filter === 'remind' || filter === 'today'
            ? inView.slice().sort((left, right) => (left.remindAt ?? '').localeCompare(right.remindAt ?? ''))
            : inView
        }
        const keyword = inView.filter((note) => note.text.toLowerCase().includes(term) || note.tags.some((tag) => tag.toLowerCase().includes(term)))
        const semanticScores = semanticResult !== null && semanticResult.query === rawTerm ? semanticResult.scores : null
        if (!semanticEnabled || !semanticMode || semanticScores === null || semanticScores.size === 0) return keyword
        const keywordIds = new Set(keyword.map((note) => note.id))
        const extras = inView
          .filter((note) => !keywordIds.has(note.id) && semanticScores.has(note.id))
          .sort((left, right) => semanticScores.get(right.id) - semanticScores.get(left.id))
          .slice(0, 6)
          .map((note) => ({ ...note, semanticScore: semanticScores.get(note.id) }))
        const merged = keyword.concat(extras)
        if (filter === 'trash') return merged.slice().sort((left, right) => (right.deletedAt ?? '').localeCompare(left.deletedAt ?? ''))
        return filter === 'remind' || filter === 'today'
          ? merged.slice().sort((left, right) => (left.remindAt ?? '').localeCompare(right.remindAt ?? ''))
          : merged
      }, [notes, filter, tagFilter, search, searchInAll, semanticEnabled, semanticMode, semanticResult])

      // Keep the keyboard selection inside the current result list.
      React.useEffect(() => {
        setSelectedIndex((index) => (index >= visible.length ? visible.length - 1 : index))
      }, [visible])

      // Scroll the selected row into view.
      React.useEffect(() => {
        if (selectedIndex < 0) return
        const note = visible[selectedIndex]
        if (note === undefined) return
        const node = itemRefs.current.get(note.id)
        if (node !== undefined && typeof node.scrollIntoView === 'function') node.scrollIntoView({ block: 'nearest' })
      }, [selectedIndex, visible])

      const submitDraft = async () => {
        const text = draft.trim()
        if (text.length === 0) return
        const repeatSpec = repeatSpecFromValue(captureRepeat)
        const saved = await actions.send({ op: 'create', text, tags: parseTags(draftTags), remindAt: captureRemindAt, ...repeatSpec })
        if (saved) {
          setDraft('')
          setDraftTags('')
          setCaptureRemindAt(null)
          setCaptureRepeat('')
          setCaptureRemindOpen(false)
          if (inputRef.current !== null) inputRef.current.focus()
        }
      }

      const onDraftKeyDown = (event) => {
        if (event.key !== 'Enter' || event.shiftKey) return
        if (event.nativeEvent !== undefined && event.nativeEvent.isComposing) return
        event.preventDefault()
        void submitDraft()
      }

      const toggleDone = (note) => {
        void actions.send({ op: 'update', id: note.id, done: !note.done })
      }

      const togglePinned = (note) => {
        void actions.send({ op: 'update', id: note.id, pinned: !note.pinned })
      }

      const toggleArchived = (note) => {
        void actions.send({ op: 'update', id: note.id, archived: !note.archived })
      }

      const quoteForNote = (note) => {
        const body = note.text.split('\n').map((line) => `> ${line}`).join('\n')
        const tags = note.tags.length === 0 ? '' : `\n标签：${note.tags.map((tag) => `#${tag}`).join(' ')}`
        return `备忘录引用（${formatTime(note.createdAt)}）：\n${body}${tags}\n\n`
      }

      const copyText = async (text) => {
        if (typeof navigator !== 'undefined' && navigator.clipboard !== undefined && typeof navigator.clipboard.writeText === 'function') {
          await navigator.clipboard.writeText(text)
          return true
        }
        if (typeof document === 'undefined' || document.body === undefined) return false
        const area = document.createElement('textarea')
        area.value = text
        area.style.position = 'fixed'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        const ok = document.execCommand('copy')
        area.remove()
        return ok
      }

      const startSessionWithQuote = (note) => {
        setSessionMenuId(null)
        if (typeof onStartSession !== 'function') {
          setActionNotice(t('sessionActionFailed'))
          return
        }
        const started = onStartSession({ prompt: quoteForNote(note), whenDraftExists: 'append' })
        if (started !== true) setActionNotice(t('sessionActionFailed'))
      }

      const insertQuote = async (note) => {
        const quote = quoteForNote(note)
        setSessionMenuId(null)
        // A blank session's composer is reachable through the public draft-initialization API.
        if (mainSession !== null && mainSession.blank === true && typeof onStartSession === 'function') {
          if (onStartSession({ prompt: quote, whenDraftExists: 'append' }) === true) return
        }
        try {
          const copied = await copyText(quote)
          setActionNotice(copied ? t('sessionCopied') : t('sessionCopyFailed'))
        } catch {
          setActionNotice(t('sessionCopyFailed'))
        }
      }

      const removeNote = (note) => {
        if (confirmId !== note.id) {
          setConfirmId(note.id)
          return
        }
        setConfirmId(null)
        void actions.send({ op: 'delete', id: note.id })
      }

      const restoreNote = (note) => {
        void actions.send({ op: 'restore', id: note.id })
      }

      const purgeNote = (note) => {
        if (confirmId !== note.id) {
          setConfirmId(note.id)
          return
        }
        setConfirmId(null)
        void actions.send({ op: 'purge', id: note.id })
      }

      const startEdit = (note) => {
        setConfirmId(null)
        setReminderEdit(null)
        setEditing({ id: note.id, text: note.text, tags: note.tags.join(', ') })
      }

      const saveEdit = async () => {
        if (editing === null) return
        const text = editing.text.trim()
        if (text.length === 0) return
        const saved = await actions.send({ op: 'update', id: editing.id, text, tags: parseTags(editing.tags) })
        if (saved) setEditing(null)
      }

      const openReminderEditor = (note) => {
        setEditing(null)
        setConfirmId(null)
        setReminderEdit({ id: note.id, value: toLocalInput(note.remindAt), repeat: repeatValueOf(note) })
      }

      const saveReminder = async () => {
        if (reminderEdit === null) return
        const remindAt = reminderEdit.value.length === 0 ? null : fromLocalInput(reminderEdit.value)
        if (reminderEdit.value.length > 0 && remindAt === null) return
        const repeatSpec = repeatSpecFromValue(reminderEdit.repeat)
        const saved = await actions.send({ op: 'update', id: reminderEdit.id, remindAt, ...repeatSpec })
        if (saved) setReminderEdit(null)
      }

      const clearReminder = async (note) => {
        const saved = await actions.send({ op: 'update', id: note.id, remindAt: null })
        if (saved) setReminderEdit(null)
      }

      const quickChip = (label, onClick) => h('button', { type: 'button', className: 'dsh-memo-chip', onClick }, label)

      const renderItem = (note) => {
        const isEditing = editing !== null && editing.id === note.id
        const confirming = confirmId === note.id
        const trashed = note.deletedAt != null
        return h(
          'li',
          {
            key: note.id,
            ref: (node) => {
              if (node === null) itemRefs.current.delete(note.id)
              else itemRefs.current.set(note.id, node)
            },
            className: 'dsh-memo-item',
            'data-selected': selectedIndex >= 0 && visible[selectedIndex] !== undefined && visible[selectedIndex].id === note.id ? 'true' : 'false',
            'data-pinned': note.pinned ? 'true' : 'false',
            'data-done': note.done ? 'true' : 'false',
            'data-archived': note.archived ? 'true' : 'false',
            'data-trash': trashed ? 'true' : 'false',
          },
          trashed
            ? null
            : h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-memo-check',
                  'data-checked': note.done ? 'true' : 'false',
                  'aria-label': note.done ? t('undone') : t('done'),
                  'aria-pressed': note.done,
                  disabled: snapshot.busy,
                  onClick: () => toggleDone(note),
                },
                note.done ? '✓' : '',
              ),
          h(
            'div',
            { className: 'dsh-memo-main' },
            isEditing
              ? h(
                  'div',
                  { className: 'dsh-memo-edit-row' },
                  h('textarea', {
                    className: 'dsh-memo-edit-text',
                    value: editing.text,
                    rows: rowsFor(editing.text),
                    onChange: (event) => setEditing({ ...editing, text: event.target.value }),
                    onKeyDown: (event) => {
                      if (event.key === 'Escape') {
                        event.preventDefault()
                        setEditing(null)
                      }
                      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                        event.preventDefault()
                        void saveEdit()
                      }
                    },
                  }),
                  h(
                    'div',
                    { className: 'dsh-memo-edit-foot' },
                    h('input', {
                      className: 'dsh-memo-edit-tags',
                      value: editing.tags,
                      placeholder: t('tagPlaceholder'),
                      onChange: (event) => setEditing({ ...editing, tags: event.target.value }),
                    }),
                    h(
                      'button',
                      { type: 'button', className: 'dsh-memo-primary', disabled: snapshot.busy, onClick: () => void saveEdit() },
                      t('editSave'),
                    ),
                    h('button', { type: 'button', className: 'dsh-memo-ghost', onClick: () => setEditing(null) }, t('editCancel')),
                  ),
                )
              : h(
                  React.Fragment,
                  null,
                  h('div', { className: 'dsh-memo-note-text' }, highlightText(note.text, search.trim())),
                  h(
                    'div',
                    { className: 'dsh-memo-note-meta' },
                    note.tags.map((tag) =>
                      h(
                        'button',
                        {
                          key: tag,
                          type: 'button',
                          className: 'dsh-memo-tag',
                          title: `#${tag}`,
                          onClick: () => {
                            setTagFilter(tag)
                            setFilter(note.archived ? 'archived' : filter === 'archived' ? 'active' : filter)
                          },
                        },
                        `#${tag}`,
                      ),
                    ),
                    h('span', { className: 'dsh-memo-note-time', title: note.updatedAt }, formatTime(note.updatedAt)),
                    note.deletedAt == null
                      ? null
                      : h('span', { className: 'dsh-memo-remind-meta' }, `🗑 ${t('deletedAt').replace('{time}', formatTime(note.deletedAt))}`),
                    note.repeat == null
                      ? null
                      : h('span', { className: 'dsh-memo-remind-meta dsh-memo-repeat-meta', title: t('repeatLabel') }, `🔁 ${repeatLabelOf(t, repeatValueOf(note))}`),
                    note.remindAt == null
                      ? null
                      : h(
                          'span',
                          {
                            className: 'dsh-memo-remind-meta',
                            'data-overdue': isReminderDue(note, Date.now()) ? 'true' : 'false',
                            title: note.remindAt,
                          },
                          isReminderDue(note, Date.now())
                            ? `⏰ ${t('remindOverdue')} · ${formatTime(note.remindAt)}`
                            : note.remindAckedAt != null
                              ? `⏰ ${t('remindAcked')} · ${formatTime(note.remindAt)}`
                              : `⏰ ${formatTime(note.remindAt)}`,
                        ),
                    note.archived ? h('span', { className: 'dsh-memo-archived-flag' }, t('archivedBadge')) : null,
                    note.deletedAt == null ? null : h('span', { className: 'dsh-memo-archived-flag' }, t('filterTrash')),
                    note.pinned ? h('span', { className: 'dsh-memo-pin-flag' }, `★ ${t('pinned')}`) : null,
                    note.semanticScore == null
                      ? null
                      : h(
                          'span',
                          { className: 'dsh-memo-semantic-flag', title: t('semanticBadgeTitle').replace('{score}', note.semanticScore.toFixed(2)) },
                          `${t('semanticBadge')} ${note.semanticScore.toFixed(2)}`,
                        ),
                    note.sourceSessionId == null
                      ? null
                      : (() => {
                          const source = sourceSessionLabel(note.sourceSessionId)
                          return h(
                            'button',
                            {
                              type: 'button',
                              className: 'dsh-memo-source',
                              'data-available': source.available ? 'true' : 'false',
                              title: source.available ? t('openSourceSession') : t('sourceSessionMissing'),
                              disabled: !source.available,
                              onClick: () => {
                                if (source.available) onOpenSession(note.sourceSessionId)
                              },
                            },
                            `↗ ${t('sourceSession')} · ${source.label}`,
                          )
                        })(),
                  ),
                ),
            reminderEdit !== null && reminderEdit.id === note.id
              ? h(
                  'div',
                  { className: 'dsh-memo-remind-editor' },
                  h('input', {
                    type: 'datetime-local',
                    className: 'dsh-memo-remind-input',
                    value: reminderEdit.value,
                    'aria-label': t('remindAtLabel'),
                    onChange: (event) => setReminderEdit({ ...reminderEdit, value: event.target.value }),
                  }),
                  h(
                    'select',
                    {
                      className: 'dsh-memo-remind-input dsh-memo-remind-select',
                      value: reminderEdit.repeat,
                      'aria-label': t('repeatLabel'),
                      onChange: (event) => setReminderEdit({ ...reminderEdit, repeat: event.target.value }),
                    },
                    REPEAT_VALUES.map((value) => h('option', { key: value === '' ? 'none' : value, value }, value === '' ? t('repeatNone') : repeatLabelOf(t, value))),
                  ),
                  h(
                    'span',
                    { className: 'dsh-memo-remind-quick' },
                    quickChip(t('remindQuick10'), () => setReminderEdit({ ...reminderEdit, value: toLocalInput(isoAfterMinutes(10)) })),
                    quickChip(t('remindQuick60'), () => setReminderEdit({ ...reminderEdit, value: toLocalInput(isoAfterMinutes(60)) })),
                    quickChip(t('remindQuickTomorrow'), () => setReminderEdit({ ...reminderEdit, value: toLocalInput(isoTomorrowMorning()) })),
                  ),
                  h('button', { type: 'button', className: 'dsh-memo-primary', disabled: snapshot.busy, onClick: () => void saveReminder() }, t('remindSave')),
                  note.remindAt == null
                    ? null
                    : h('button', { type: 'button', className: 'dsh-memo-ghost', disabled: snapshot.busy, onClick: () => void clearReminder(note) }, t('remindClear')),
                  h('button', { type: 'button', className: 'dsh-memo-ghost', onClick: () => setReminderEdit(null) }, t('remindCancel')),
                )
              : null,
            sessionMenuId === note.id && !trashed
              ? h(
                  'div',
                  { className: 'dsh-memo-session-menu' },
                  h('div', { className: 'dsh-memo-session-hint' }, t('sessionInsertHint')),
                  h(
                    'span',
                    { className: 'dsh-memo-tip' },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsh-memo-ghost',
                        'aria-describedby': `memo-insert-tip-${note.id}`,
                        onClick: () => void insertQuote(note),
                      },
                      t('sessionInsert'),
                    ),
                    h('span', { className: 'dsh-memo-tip-pop', role: 'tooltip', id: `memo-insert-tip-${note.id}`, 'data-align': 'left' }, t('sessionInsertTip')),
                  ),
                  h(
                    'span',
                    { className: 'dsh-memo-tip' },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsh-memo-ghost',
                        'aria-describedby': `memo-new-tip-${note.id}`,
                        onClick: () => startSessionWithQuote(note),
                      },
                      t('sessionNew'),
                    ),
                    h('span', { className: 'dsh-memo-tip-pop', role: 'tooltip', id: `memo-new-tip-${note.id}`, 'data-align': 'left' }, t('sessionNewTip')),
                  ),
                  h('button', { type: 'button', className: 'dsh-memo-ghost', onClick: () => setSessionMenuId(null) }, t('sessionCancel')),
                )
              : null,
          ),
          trashed
            ? h(
                'div',
                { className: 'dsh-memo-actions', 'data-confirm': confirming ? 'true' : 'false' },
                h(
                  'button',
                  { type: 'button', className: 'dsh-memo-action', disabled: snapshot.busy, onClick: () => restoreNote(note) },
                  `↩ ${t('restore')}`,
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    className: 'dsh-memo-action',
                    'data-danger': 'true',
                    disabled: snapshot.busy,
                    onClick: () => purgeNote(note),
                    onBlur: () => {
                      if (confirmId === note.id) setConfirmId(null)
                    },
                  },
                  confirming ? t('confirmPurge') : t('purge'),
                ),
              )
            : h(
            'div',
            { className: 'dsh-memo-actions', 'data-confirm': confirming ? 'true' : 'false' },
            h(
              'button',
              { type: 'button', className: 'dsh-memo-action', title: note.pinned ? t('unpin') : t('pin'), disabled: snapshot.busy, onClick: () => togglePinned(note) },
              note.pinned ? `★ ${t('unpin')}` : `☆ ${t('pin')}`,
            ),
            isEditing
              ? null
              : h('button', { type: 'button', className: 'dsh-memo-action', title: t('edit'), disabled: snapshot.busy, onClick: () => startEdit(note) }, t('edit')),
            h(
              'button',
              { type: 'button', className: 'dsh-memo-action', title: note.remindAt == null ? t('remindSet') : t('remindSet'), disabled: snapshot.busy, onClick: () => openReminderEditor(note) },
              note.remindAt == null ? `⏰ ${t('remind')}` : '⏰',
            ),
            note.archived
              ? h('button', { type: 'button', className: 'dsh-memo-action', disabled: snapshot.busy, onClick: () => toggleArchived(note) }, t('unarchive'))
              : h('button', { type: 'button', className: 'dsh-memo-action', disabled: snapshot.busy, onClick: () => toggleArchived(note) }, t('archive')),
            h(
              'span',
              { className: 'dsh-memo-tip' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-memo-action',
                  'aria-describedby': `memo-session-tip-${note.id}`,
                  disabled: snapshot.busy,
                  onClick: () => setSessionMenuId((current) => (current === note.id ? null : note.id)),
                },
                `↗ ${t('sessionActions')}`,
              ),
              h('span', { className: 'dsh-memo-tip-pop', role: 'tooltip', id: `memo-session-tip-${note.id}` }, t('sessionActionsTip')),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dsh-memo-action',
                'data-danger': 'true',
                disabled: snapshot.busy,
                onClick: () => removeNote(note),
                onBlur: () => {
                  if (confirmId === note.id) setConfirmId(null)
                },
              },
              confirming ? t('confirmDelete') : t('delete'),
            ),
          ),
        )
      }

      const semanticStatusLabel = () => {
        if (!semanticEnabled) return null
        if (semanticPending) return t('semanticSearching')
        if (semantic?.building === true) {
          const done = semantic.progress > 0 ? semantic.progress : semantic.indexed
          return t('semanticBuilding').replace('{done}', String(done ?? 0)).replace('{total}', String(semantic?.total ?? 0))
        }
        const term = search.trim()
        if (semantic === null || term.length === 0 || !semanticMode || semanticResult === null || semanticResult.query !== term) return null
        if (semantic.available === false) return t('semanticUnavailable')
        const count = visible.reduce((total, note) => total + (note.semanticScore == null ? 0 : 1), 0)
        return count === 0 ? null : t('semanticHits').replace('{count}', String(count))
      }

      const searchStatusLabel = () => {
        const term = search.trim()
        if (term.length === 0) return semanticStatusLabel()
        const parts = [t('searchCount').replace('{count}', String(visible.length))]
        const needle = search.trim().toLowerCase()
        const matchesTerm = (note) => note.text.toLowerCase().includes(needle) || note.tags.some((tag) => tag.toLowerCase().includes(needle))
        if (filter === 'trash') {
          const liveMatches = notes.filter((note) => note.deletedAt == null && (tagFilter === null || note.tags.includes(tagFilter)) && matchesTerm(note)).length
          if (liveMatches > 0) parts.push(t('searchLiveHint').replace('{count}', String(liveMatches)))
        } else if (searchInAll) {
          parts.push(t('searchAllHint'))
        } else {
          const trashMatches = notes.filter((note) => note.deletedAt != null && (tagFilter === null || note.tags.includes(tagFilter)) && matchesTerm(note)).length
          if (trashMatches > 0) parts.push(t('searchTrashHint').replace('{count}', String(trashMatches)))
        }
        const semanticLine = semanticStatusLabel()
        if (semanticLine !== null) parts.push(semanticLine)
        return parts.join(' · ')
      }

      const semanticSettingsStatus = () => {
        if (settingsDraft.semantic.enabled !== true) return t('semanticHint')
        if (semantic !== null && semantic.building === true) {
          const done = semantic.progress > 0 ? semantic.progress : semantic.indexed
          return t('semanticIndexing').replace('{done}', String(done ?? 0)).replace('{total}', String(semantic.total ?? 0))
        }
        if (semantic !== null && semantic.available === false) return t('semanticUnavailable')
        if ((semantic?.indexed ?? 0) > 0) return t('semanticIndexed').replace('{done}', String(semantic.indexed)).replace('{total}', String(semantic.total ?? 0))
        return t('semanticHint')
      }

      const testSemantic = async () => {
        setSemanticBusy(true)
        setSemanticTestResult('')
        try {
          const body = await actions.testEmbedding(settingsDraft.semantic)
          const test = body?.test ?? {}
          setSemanticTestResult(
            t('semanticTestOk')
              .replace('{model}', String(test.model ?? settingsDraft.semantic.model))
              .replace('{dim}', String(test.dim ?? '?'))
              .replace('{ms}', String(test.ms ?? '?')),
          )
        } catch (error) {
          setSemanticTestResult(t('semanticTestFail').replace('{error}', errorMessage(error)))
        } finally {
          setSemanticBusy(false)
        }
      }

      const rebuildSemanticIndex = async () => {
        setSemanticBusy(true)
        try {
          const saved = await actions.send({ op: 'updateSettings', settings: settingsDraft })
          if (!saved) return
          setSettingsOpen(false)
          await actions.reindex().catch(() => undefined)
        } finally {
          setSemanticBusy(false)
        }
      }

      const dataBackupLine = () => {
        const backup = snapshot.backup
        if (backup === null || (backup.count ?? 0) === 0) return t('backupEmpty')
        return t('backupLine')
          .replace('{count}', String(backup.count))
          .replace('{size}', formatBytes(backup.bytes))
          .replace('{time}', backup.lastAt == null ? '—' : formatTime(backup.lastAt))
      }

      const exportMemo = async (format) => {
        try {
          if (typeof actions.exportNotes !== 'function') throw new Error(t('reloadHint'))
          const body = await actions.exportNotes(format)
          const blob = new Blob([body.content], { type: body.mime })
          const url = URL.createObjectURL(blob)
          const anchor = document.createElement('a')
          anchor.href = url
          anchor.download = body.filename
          anchor.rel = 'noopener'
          document.body.appendChild(anchor)
          anchor.click()
          anchor.remove()
          setTimeout(() => URL.revokeObjectURL(url), 1000)
          setDataNotice(t('exportDone').replace('{file}', body.filename))
        } catch (error) {
          setDataNotice(t('exportFailed').replace('{error}', errorMessage(error)))
        }
      }

      const writeBackupNow = async () => {
        try {
          if (typeof actions.backupNow !== 'function') throw new Error(t('reloadHint'))
          const body = await actions.backupNow()
          setDataNotice(body?.backup?.skipped === true ? t('backupUnchanged') : t('backupDone'))
        } catch (error) {
          setDataNotice(t('backupFailed').replace('{error}', errorMessage(error)))
        }
      }

      const cleanupBackups = async () => {
        try {
          if (typeof actions.cleanupBackups !== 'function') throw new Error(t('reloadHint'))
          const body = await actions.cleanupBackups()
          const removed = body?.backup?.removed ?? 0
          setDataNotice(removed === 0 ? t('backupCleanupNone') : t('backupCleanupDone').replace('{count}', String(removed)))
        } catch (error) {
          setDataNotice(t('backupFailed').replace('{error}', errorMessage(error)))
        }
      }

      const toggleRestorePicker = () => {
        setRestoreOpen((open) => !open)
        setRestorePick(null)
      }

      const restoreFromBackup = async (entry) => {
        if (restorePick !== entry.name) {
          setRestorePick(entry.name)
          return
        }
        setRestoreBusy(true)
        try {
          if (typeof actions.restoreBackup !== 'function') throw new Error(t('reloadHint'))
          await actions.restoreBackup(entry.name)
          setRestoreOpen(false)
          setRestorePick(null)
          setDataNotice(t('restoreDone').replace('{time}', formatTime(entry.at)))
        } catch (error) {
          setDataNotice(t('restoreFailed').replace('{error}', errorMessage(error)))
        } finally {
          setRestoreBusy(false)
        }
      }

      const emptyText = () => {
        if (search.trim().length > 0) return t('emptySearch')
        if (filter === 'done') return t('emptyDone')
        if (filter === 'archived') return t('emptyArchived')
        if (filter === 'trash') return t('emptyTrash')
        if (filter === 'remind') return t('emptyRemind')
        if (filter === 'today') return t('emptyToday')
        return t('emptyActive')
      }

      const tab = (id, label, count) =>
        h(
          'button',
          {
            type: 'button',
            className: 'dsh-memo-tab',
            'data-active': filter === id ? 'true' : 'false',
            onClick: () => {
              setFilter(id)
              if (search.trim().length > 0) setSearch('')
            },
          },
          label,
          h('span', { className: 'dsh-memo-tab-count' }, String(count)),
        )

      return h(
        'div',
        { className: 'dsh-memo-root' },
        h(
          'header',
          { className: 'dsh-memo-head' },
          h(
            'div',
            { className: 'dsh-memo-head-inner' },
            h(
              'div',
              { className: 'dsh-memo-title-row' },
              h('span', { className: 'dsh-memo-title-icon' }, h(MemoGlyph, { size: 20 })),
              h('h1', { className: 'dsh-memo-title' }, t('panel')),
              h('span', { className: 'dsh-memo-sub' }, t('subtitle').replace('{count}', String(notes.filter((note) => note.deletedAt == null).length))),
              h('span', { className: 'dsh-memo-title-spacer' }),
              h(
                'span',
                { className: 'dsh-memo-shortcut', title: t('shortcutHint') },
                (typeof document !== 'undefined' && document.documentElement.dataset.platform === 'darwin') || (typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)) ? t('openShortcutMac') : t('openShortcutOther'),
              ),
              h(
                'button',
                { type: 'button', className: 'dsh-memo-ghost', 'aria-label': t('refreshAria'), title: t('refresh'), disabled: snapshot.status === 'loading', onClick: () => void actions.load() },
                t('refresh'),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dsh-memo-ghost',
                  'aria-label': t('settingsOpenAll'),
                  title: t('settingsOpenAll'),
                  onClick: () => {
                    setSettingsDraft(copySettings(snapshot.settings))
                    setSemanticTestResult('')
                    setDataNotice('')
                    setSettingsOpen((open) => !open)
                  },
                },
                t('settingsOpenAll'),
              ),
            ),
            settingsOpen
              ? h(
                  'div',
                  { className: 'dsh-memo-settings' },
                  h('div', { className: 'dsh-memo-settings-title' }, t('settingsTitle')),
                  h(
                    'div',
                    { className: 'dsh-memo-settings-row' },
                    h('label', null, h('input', { type: 'checkbox', checked: settingsDraft.systemNotifications, onChange: (event) => setSettingsDraft({ ...settingsDraft, systemNotifications: event.target.checked }) }), t('settingsNotifications')),
                    h('label', null, h('input', { type: 'checkbox', checked: settingsDraft.sound, onChange: (event) => setSettingsDraft({ ...settingsDraft, sound: event.target.checked }) }), t('settingsSound')),
                  ),
                  h(
                    'div',
                    { className: 'dsh-memo-settings-row' },
                    h('label', null, h('input', { type: 'checkbox', checked: settingsDraft.quietHours.enabled, onChange: (event) => setSettingsDraft({ ...settingsDraft, quietHours: { ...settingsDraft.quietHours, enabled: event.target.checked } }) }), t('settingsQuiet')),
                  ),
                  h(
                    'div',
                    { className: 'dsh-memo-settings-row' },
                    h('span', null, t('settingsQuietFrom')),
                    h('input', {
                      type: 'time',
                      className: 'dsh-memo-remind-input dsh-memo-settings-time',
                      value: settingsDraft.quietHours.start,
                      disabled: !settingsDraft.quietHours.enabled,
                      onChange: (event) => setSettingsDraft({ ...settingsDraft, quietHours: { ...settingsDraft.quietHours, start: event.target.value } }),
                    }),
                    h('span', null, t('settingsQuietTo')),
                    h('input', {
                      type: 'time',
                      className: 'dsh-memo-remind-input dsh-memo-settings-time',
                      value: settingsDraft.quietHours.end,
                      disabled: !settingsDraft.quietHours.enabled,
                      onChange: (event) => setSettingsDraft({ ...settingsDraft, quietHours: { ...settingsDraft.quietHours, end: event.target.value } }),
                    }),
                  ),
                  h('div', { className: 'dsh-memo-settings-divider' }),
                  h('div', { className: 'dsh-memo-settings-title' }, t('semanticTitle')),
                  h(
                    'div',
                    { className: 'dsh-memo-settings-row' },
                    h(
                      'label',
                      null,
                      h('input', {
                        type: 'checkbox',
                        checked: settingsDraft.semantic.enabled,
                        onChange: (event) => setSettingsDraft({ ...settingsDraft, semantic: { ...settingsDraft.semantic, enabled: event.target.checked } }),
                      }),
                      t('semanticEnable'),
                    ),
                  ),
                  h(
                    'div',
                    { className: 'dsh-memo-settings-row' },
                    h('span', null, t('semanticEndpoint')),
                    h('input', {
                      className: 'dsh-memo-remind-input',
                      style: { flex: '1 1 220px', minWidth: '150px' },
                      value: settingsDraft.semantic.endpoint,
                      disabled: !settingsDraft.semantic.enabled,
                      onChange: (event) => setSettingsDraft({ ...settingsDraft, semantic: { ...settingsDraft.semantic, endpoint: event.target.value } }),
                    }),
                  ),
                  h(
                    'div',
                    { className: 'dsh-memo-settings-row' },
                    h('span', null, t('semanticModel')),
                    h('input', {
                      className: 'dsh-memo-remind-input',
                      list: 'dsh-memo-semantic-models',
                      style: { width: '190px' },
                      value: settingsDraft.semantic.model,
                      disabled: !settingsDraft.semantic.enabled,
                      onChange: (event) => setSettingsDraft({ ...settingsDraft, semantic: { ...settingsDraft.semantic, model: event.target.value } }),
                    }),
                    h(
                      'datalist',
                      { id: 'dsh-memo-semantic-models' },
                      ['bge-m3', 'qwen3-embedding:0.6b', 'embeddinggemma:300m'].map((model) => h('option', { key: model, value: model })),
                    ),
                    h('span', null, t('semanticNumCtx')),
                    h('input', {
                      type: 'number',
                      min: 128,
                      max: 32768,
                      step: 128,
                      className: 'dsh-memo-remind-input dsh-memo-settings-time',
                      value: settingsDraft.semantic.numCtx,
                      disabled: !settingsDraft.semantic.enabled,
                      onChange: (event) => setSettingsDraft({ ...settingsDraft, semantic: { ...settingsDraft.semantic, numCtx: Number(event.target.value) } }),
                    }),
                  ),
                  h('div', { className: 'dsh-memo-settings-hint' }, semanticSettingsStatus()),
                  semanticTestResult === '' ? null : h('div', { className: 'dsh-memo-settings-hint' }, semanticTestResult),
                  h(
                    'div',
                    { className: 'dsh-memo-settings-actions' },
                    h('button', { type: 'button', className: 'dsh-memo-ghost', disabled: semanticBusy || !settingsDraft.semantic.enabled, onClick: () => void testSemantic() }, t('semanticTest')),
                    h('button', { type: 'button', className: 'dsh-memo-ghost', disabled: semanticBusy || !settingsDraft.semantic.enabled, onClick: () => void rebuildSemanticIndex() }, t('semanticReindex')),
                  ),
                  h('div', { className: 'dsh-memo-settings-divider' }),
                  h('div', { className: 'dsh-memo-settings-title' }, t('dataTitle')),
                  h('div', { className: 'dsh-memo-settings-hint' }, dataBackupLine()),
                  h(
                    'div',
                    { className: 'dsh-memo-settings-row' },
                    h('span', null, t('backupRetention')),
                    h(
                      'select',
                      {
                        className: 'dsh-memo-remind-input',
                        value: String(settingsDraft.backup.retentionDays),
                        onChange: (event) => setSettingsDraft({ ...settingsDraft, backup: { ...settingsDraft.backup, retentionDays: Number(event.target.value) } }),
                      },
                      [7, 14, 30, 90].map((days) => h('option', { key: days, value: String(days) }, t('backupRetentionOption').replace('{days}', String(days)))),
                    ),
                  ),
                  dataNotice === '' ? null : h('div', { className: 'dsh-memo-settings-hint' }, dataNotice),
                  h(
                    'div',
                    { className: 'dsh-memo-settings-actions' },
                    h('button', { type: 'button', className: 'dsh-memo-ghost', onClick: () => void exportMemo('markdown') }, t('exportMarkdown')),
                    h('button', { type: 'button', className: 'dsh-memo-ghost', onClick: () => void exportMemo('json') }, t('exportJson')),
                    h('button', { type: 'button', className: 'dsh-memo-ghost', onClick: () => void writeBackupNow() }, t('backupNow')),
                    h('button', { type: 'button', className: 'dsh-memo-ghost', onClick: () => void cleanupBackups() }, t('backupCleanup')),
                    h('button', { type: 'button', className: 'dsh-memo-ghost', disabled: restoreBusy, onClick: toggleRestorePicker }, t('restoreFromBackup')),
                  ),
                  restoreOpen
                    ? h(
                        'div',
                        { className: 'dsh-memo-restore' },
                        h('div', { className: 'dsh-memo-settings-hint' }, t('restoreHint')),
                        restoreEntries === null
                          ? h('div', { className: 'dsh-memo-settings-hint' }, t('restoreLoading'))
                          : restoreEntries.length === 0
                            ? h('div', { className: 'dsh-memo-settings-hint' }, t('restoreEmpty'))
                            : restoreEntries.map((entry) =>
                                h(
                                  'div',
                                  { key: entry.name, className: 'dsh-memo-restore-row', 'data-picked': restorePick === entry.name ? 'true' : 'false' },
                                  h('span', { className: 'dsh-memo-restore-time' }, entry.at === undefined ? entry.name : formatTime(entry.at)),
                                  h('span', { className: 'dsh-memo-restore-size' }, formatBytes(entry.size)),
                                  h('span', { className: 'dsh-memo-restore-name', title: entry.name }, entry.name),
                                  h(
                                    'button',
                                    {
                                      type: 'button',
                                      className: restorePick === entry.name ? 'dsh-memo-primary' : 'dsh-memo-ghost',
                                      disabled: restoreBusy,
                                      onClick: () => void restoreFromBackup(entry),
                                    },
                                    restorePick === entry.name ? t('restoreConfirm') : t('restore'),
                                  ),
                                ),
                              ),
                        restorePick === null ? null : h('div', { className: 'dsh-memo-settings-hint' }, t('restoreConfirmHint')),
                        h('div', { className: 'dsh-memo-settings-actions' }, h('button', { type: 'button', className: 'dsh-memo-ghost', onClick: toggleRestorePicker }, t('restoreCancel'))),
                      )
                    : null,
                  h(
                    'div',
                    { className: 'dsh-memo-settings-actions' },
                    h(
                      'button',
                      {
                        type: 'button',
                        className: 'dsh-memo-primary',
                        disabled: snapshot.busy,
                        onClick: async () => {
                          const saved = await actions.send({ op: 'updateSettings', settings: settingsDraft })
                          if (saved) setSettingsOpen(false)
                        },
                      },
                      t('settingsSave'),
                    ),
                    h('button', { type: 'button', className: 'dsh-memo-ghost', onClick: () => setSettingsOpen(false) }, t('settingsCancel')),
                  ),
                )
              : null,
            h(
              'div',
              { className: 'dsh-memo-capture' },
              h('textarea', {
                ref: inputRef,
                className: 'dsh-memo-capture-text',
                value: draft,
                rows: rowsFor(draft),
                placeholder: t('capturePlaceholder'),
                onChange: (event) => setDraft(event.target.value),
                onKeyDown: onDraftKeyDown,
              }),
              h(
                'div',
                { className: 'dsh-memo-capture-foot' },
                h('input', {
                  className: 'dsh-memo-capture-tags',
                  value: draftTags,
                  placeholder: t('tagPlaceholder'),
                  onChange: (event) => setDraftTags(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void submitDraft()
                    }
                  },
                }),
                h(
                  'button',
                  { type: 'button', className: 'dsh-memo-ghost', 'data-active': captureRemindOpen || captureRemindAt !== null ? 'true' : 'false', onClick: () => setCaptureRemindOpen((open) => !open) },
                  captureRemindAt === null ? t('captureRemind') : t('captureRemindSet').replace('{time}', formatTime(captureRemindAt)),
                ),
                h('button', { type: 'button', className: 'dsh-memo-primary', disabled: snapshot.busy || draft.trim().length === 0, onClick: () => void submitDraft() }, snapshot.busy ? t('saving') : t('save')),
              ),
              captureRemindOpen
                ? h(
                    'div',
                    { className: 'dsh-memo-remind-editor', style: { margin: '0 10px 10px', background: 'transparent' } },
                    h('input', {
                      type: 'datetime-local',
                      className: 'dsh-memo-remind-input',
                      value: toLocalInput(captureRemindAt),
                      'aria-label': t('remindAtLabel'),
                      onChange: (event) => setCaptureRemindAt(fromLocalInput(event.target.value)),
                    }),
                    h(
                      'select',
                      {
                        className: 'dsh-memo-remind-input dsh-memo-remind-select',
                        value: captureRepeat,
                        'aria-label': t('repeatLabel'),
                        onChange: (event) => setCaptureRepeat(event.target.value),
                      },
                      REPEAT_VALUES.map((value) => h('option', { key: value === '' ? 'none' : value, value }, value === '' ? t('repeatNone') : repeatLabelOf(t, value))),
                    ),
                    h(
                      'span',
                      { className: 'dsh-memo-remind-quick' },
                      quickChip(t('remindQuick10'), () => setCaptureRemindAt(isoAfterMinutes(10))),
                      quickChip(t('remindQuick60'), () => setCaptureRemindAt(isoAfterMinutes(60))),
                      quickChip(t('remindQuickTomorrow'), () => setCaptureRemindAt(isoTomorrowMorning())),
                    ),
                    captureRemindAt === null
                      ? null
                      : h('button', { type: 'button', className: 'dsh-memo-ghost', onClick: () => setCaptureRemindAt(null) }, t('remindClear')),
                  )
                : null,
            ),
            h(
              'div',
              { className: 'dsh-memo-tools' },
              h(
                'div',
                { className: 'dsh-memo-tabs', role: 'tablist' },
                tab('today', t('filterToday'), counts.today),
                tab('active', t('filterActive'), counts.active),
                tab('done', t('filterDone'), counts.done),
                tab('remind', t('filterRemind'), counts.remind),
                tab('archived', t('filterArchived'), counts.archived),
                tab('trash', t('filterTrash'), counts.trash),
              ),
              h(
                'div',
                { className: 'dsh-memo-search-row' },
                h('input', {
                  ref: searchRef,
                  className: 'dsh-memo-search',
                  value: search,
                  placeholder: t('searchPlaceholder'),
                  onChange: (event) => setSearch(event.target.value),
                  onKeyDown: (event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault()
                      if (search.length > 0) setSearch('')
                      else event.currentTarget.blur()
                    } else if (event.key === 'ArrowDown' && visible.length > 0) {
                      event.preventDefault()
                      setSelectedIndex(0)
                    }
                  },
                  'aria-label': t('searchPlaceholder'),
                }),
                h(
                  'span',
                  { className: 'dsh-memo-switch-wrap' },
                  h(
                    'label',
                    { className: 'dsh-memo-switch' },
                    h('span', { className: 'dsh-memo-switch-label' }, t('searchAll')),
                    h('input', {
                      type: 'checkbox',
                      role: 'switch',
                      checked: searchInAll,
                      'aria-label': t('searchAll'),
                      'aria-describedby': 'memo-scope-tip',
                      onChange: (event) => setSearchInAll(event.target.checked),
                    }),
                    h('span', { className: 'dsh-memo-switch-track' }, h('span', { className: 'dsh-memo-switch-thumb' })),
                  ),
                  h('span', { className: 'dsh-memo-tip-pop', role: 'tooltip', id: 'memo-scope-tip' }, t('searchScopeTip')),
                ),
                semanticEnabled
                  ? h(
                      'span',
                      { className: 'dsh-memo-switch-wrap' },
                      h(
                        'label',
                        { className: 'dsh-memo-switch' },
                        h('span', { className: 'dsh-memo-switch-label' }, t('semanticOff')),
                        h('input', {
                          type: 'checkbox',
                          role: 'switch',
                          checked: semanticMode,
                          'aria-label': t('semanticTitle'),
                          'aria-describedby': 'memo-semantic-tip',
                          onChange: (event) => setSemanticMode(event.target.checked),
                        }),
                        h('span', { className: 'dsh-memo-switch-track' }, h('span', { className: 'dsh-memo-switch-thumb' })),
                      ),
                      h('span', { className: 'dsh-memo-tip-pop', role: 'tooltip', id: 'memo-semantic-tip' }, t('semanticTip')),
                    )
                  : null,
              ),
            ),
            searchStatusLabel() === null ? null : h('div', { className: 'dsh-memo-semantic-line', 'data-warn': semantic !== null && semantic.available === false ? 'true' : 'false' }, searchStatusLabel()),
            tagCatalog.length === 0
              ? null
              : h(
                  'div',
                  { className: 'dsh-memo-tagbar' },
                  h(
                    'button',
                    { type: 'button', className: 'dsh-memo-chip', 'data-active': tagFilter === null ? 'true' : 'false', onClick: () => setTagFilter(null) },
                    t('allTags'),
                  ),
                  tagCatalog.map(([tag, count]) =>
                    h(
                      'button',
                      { key: tag, type: 'button', className: 'dsh-memo-chip', 'data-active': tagFilter === tag ? 'true' : 'false', onClick: () => setTagFilter(tagFilter === tag ? null : tag) },
                      `#${tag}`,
                      h('span', null, String(count)),
                    ),
                  ),
                ),
            h('div', { className: 'dsh-memo-keyhint' }, t('keyboardHint')),
          ),
        ),
        h(
          'main',
          { className: 'dsh-memo-body' },
          h(
            'div',
            { className: 'dsh-memo-body-inner' },
            snapshot.error === null
              ? null
              : h(
                  'div',
                  { className: 'dsh-memo-banner', role: 'alert' },
                  h('span', null, t('loadFailed'), ': ', snapshot.error),
                  h('span', { className: 'dsh-memo-banner-spacer' }),
                  h('button', { type: 'button', className: 'dsh-memo-ghost', onClick: () => void actions.load() }, t('retry')),
                ),
            actionNotice === '' ? null : h('div', { className: 'dsh-memo-action-notice', role: 'status' }, actionNotice),
            snapshot.status === 'loading'
              ? h('div', { className: 'dsh-memo-loading', role: 'status' }, t('loading'))
              : snapshot.status === 'error'
                ? h(
                    'div',
                    { className: 'dsh-memo-empty' },
                    h(EmptyMark, null),
                    h('span', null, t('loadFailed')),
                    h('button', { type: 'button', className: 'dsh-memo-ghost', onClick: () => void actions.load() }, t('retry')),
                  )
                : visible.length === 0
                  ? h('div', { className: 'dsh-memo-empty' }, h(EmptyMark, null), h('span', null, emptyText()))
                  : h('ul', { className: 'dsh-memo-list', style: { listStyle: 'none', margin: 0, padding: 0 } }, visible.map(renderItem)),
          ),
        ),
      )
    }

    /**
     * Mount the sidebar entry, the main panel and the global shortcut.
     * @param ctx - Client plugin Context.
     */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'memo: dictionaries')
      const t = ctx.locale.bind(NS)
      const store = createMemoStore()
      const focusStore = createFocusStore()
      // Session navigation is optional: a composition without the workspace UI
      // simply disables the source-session chip instead of failing activation.
      let openSession = null
      let startSession = null
      ctx.inject(['uiWorkspace'], (workspaceCtx) => {
        openSession = (sessionId) => workspaceCtx.uiWorkspace.openSession(sessionId)
        // `startSession` fills a blank session draft (or creates one) with the note quote.
        startSession = (options) => workspaceCtx.uiWorkspace.startSession(undefined, options)
      })
      const parseTags = (text) =>
        String(text ?? '')
          .split(/[,，;；\s]+/)
          .map((tag) => tag.trim().replace(/^#+/, ''))
          .filter((tag, index, all) => tag.length > 0 && all.indexOf(tag) === index)

      ctx.slots.inject('sidebar.panellist', () =>
        ctx.slots.register(
          {
            name: 'sidebar.panellist',
            id: PANEL_ID,
            order: 10,
            label: () => t('panel'),
            locale: NS,
            inject: () => ({ hooks: { memoState: store } }),
          },
          MemoIcon,
        ),
      )

      ctx.slots.inject('main', () =>
        ctx.slots.register(
          {
            name: 'main',
            key: PANEL_ID,
            locale: NS,
            inject: () => ({
              actions: {
                send: store.send,
                load: store.load,
                search: store.search,
                semanticStatus: store.semanticStatus,
                reindex: store.reindex,
                testEmbedding: store.testEmbedding,
                exportNotes: store.exportNotes,
                backupNow: store.backupNow,
                cleanupBackups: store.cleanupBackups,
                listBackups: store.listBackups,
                restoreBackup: store.restoreBackup,
              },
              parseTags,
              formatTime: formatTimestamp,
              onOpenSession: (sessionId) => {
                if (openSession === null) return
                try {
                  openSession(sessionId)
                } catch (error) {
                  console.warn('memo: could not open the source session', error)
                }
              },
              onStartSession: (options) => {
                if (startSession === null) return false
                try {
                  startSession(options)
                  return true
                } catch (error) {
                  console.warn('memo: could not start a session', error)
                  return false
                }
              },
              hooks: { memoState: store, focusRequest: focusStore },
            }),
          },
          MemoPanel,
        ),
      )

      // Reminder delivery: one frame-wide toast plus a background poll so a due
      // reminder reaches the user even while the memo page is not open.
      ctx.slots.inject('shell.overlay', () =>
        ctx.slots.register({ name: 'shell.overlay', id: 'memo.styles' }, MemoGlobalStyles),
      )

      ctx.slots.inject('shell.overlay', () =>
        ctx.slots.register(
          {
            name: 'shell.overlay',
            id: 'memo.reminder-toast',
            locale: NS,
            inject: () => ({
              actions: { send: store.send },
              formatTime: formatTimestamp,
              onOpenMemo: () => {
                try {
                  ctx.layout.selectPanel(PANEL_ID)
                } catch {
                  return
                }
                focusStore.bump()
              },
              hooks: { memoState: store },
            }),
          },
          ReminderToast,
        ),
      )

      ctx.effect(() => {
        void store.load({ quiet: true })
        const timer = setInterval(() => void store.load({ quiet: true }), 20000)
        return () => clearInterval(timer)
      }, 'memo: reminder polling')

      ctx.inject(['shortcuts'], (shortcutCtx) => {
        const openMemo = () => {
          try {
            ctx.layout.selectPanel(PANEL_ID)
          } catch (error) {
            console.warn('memo: main panel is not available', error)
            return
          }
          focusStore.bump()
        }
        ctx.effect(
          () =>
            shortcutCtx.shortcuts.register({
              id: 'memo.open',
              label: () => t('shortcutHint'),
              aliases: ['memo', 'notes', 'open memo', '备忘录'],
              defaults: {
                'desktop:macos': { code: 'KeyM', modifiers: ['primary', 'shift'] },
                'desktop:windows': { code: 'KeyM', modifiers: ['primary', 'shift'] },
                'desktop:linux': { code: 'KeyM', modifiers: ['primary', 'shift'] },
                'web:macos': { code: 'KeyM', modifiers: ['primary', 'alt'] },
                'web:windows': { code: 'KeyM', modifiers: ['primary', 'alt'] },
              },
              regions: ['page', 'editable'],
              modals: [],
              resolve: () => ({ status: 'handled', run: openMemo }),
            }),
          'memo: open shortcut',
        )
      })
    }

    return { inject: ['slots', 'locale', 'layout'], apply }
  },
})
