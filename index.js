/**
 * 备忘录 (Memo) — Host half.
 *
 * Owns the single global note store under `$DSH_HOME/storages/memo/` and exposes
 * it two ways:
 *
 * - an authenticated exact Fetch route at `/api/memo` (GET list, POST mutation)
 *   that the Web Client module (`client.js`) reads through the browser cookie
 *   carrier, and
 * - one model-facing `memo` tool so the assistant can record and look up notes.
 *
 * The Web UI is the only write path a person uses; the tool is the model's.
 * Writes are serialized and committed with an atomic rename so a crash never
 * leaves a half-written store.
 *
 * @module @local/dsh-memo
 */
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

/** Stable Loader plugin name. */
export const name = 'memo'

/** The Fetch route needs the authenticated browser carrier. */
export const inject = ['connection']

/** Route path owned by this bundle. Must be exactly one `/api/<endpoint>`. */
const ROUTE_PATH = '/api/memo'

/** Store format version. */
const FORMAT_VERSION = 1

/** Reminder notification preferences plus the optional local semantic search. */
const DEFAULT_SETTINGS = Object.freeze({
  systemNotifications: true,
  sound: false,
  quietHours: Object.freeze({ enabled: false, start: '22:00', end: '08:00' }),
  semantic: Object.freeze({
    enabled: false,
    endpoint: 'http://127.0.0.1:11434',
    model: 'bge-m3',
    numCtx: 1024,
    minScore: 0.48,
  }),
  backup: Object.freeze({ retentionDays: 30 }),
})

/** 24-hour clock accepted by quiet hours. */
const CLOCK_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

/** Local Ollama HTTP endpoint; the host talks to it directly, no cloud call. */
const ENDPOINT_PATTERN = /^https?:\/\/[^\s/]+(?:\/[^\s]*)?$/

/** Ollama model names such as `bge-m3`, `qwen3-embedding:0.6b` or `library/model`. */
const MODEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,79}$/

/**
 * Normalize one embedding endpoint, falling back on anything unparseable.
 * @param value - candidate endpoint URL.
 * @param fallback - endpoint to use when the candidate is unusable.
 * @returns a scheme-qualified URL without a trailing slash.
 */
function normalizeEndpoint(value, fallback) {
  if (typeof value !== 'string') return fallback
  const endpoint = value.trim().replace(/\/+$/u, '')
  return endpoint.length <= 200 && ENDPOINT_PATTERN.test(endpoint) ? endpoint : fallback
}

/**
 * Normalize the optional semantic-search preferences.
 * @param raw - stored or partially supplied semantic settings.
 * @returns a complete semantic settings object.
 */
function normalizeSemantic(raw) {
  const source = raw !== null && typeof raw === 'object' ? raw : {}
  const numCtx = Number(source.numCtx)
  const minScore = Number(source.minScore)
  return {
    enabled: source.enabled === true,
    endpoint: normalizeEndpoint(source.endpoint, DEFAULT_SETTINGS.semantic.endpoint),
    model: typeof source.model === 'string' && MODEL_PATTERN.test(source.model.trim()) ? source.model.trim() : DEFAULT_SETTINGS.semantic.model,
    numCtx: Number.isSafeInteger(numCtx) && numCtx >= 128 && numCtx <= 32768 ? numCtx : DEFAULT_SETTINGS.semantic.numCtx,
    minScore: Number.isFinite(minScore) && minScore > 0 && minScore <= 1 ? minScore : DEFAULT_SETTINGS.semantic.minScore,
  }
}

/**
 * Normalize the backup rotation preference.
 * @param raw - stored or partially supplied backup settings.
 * @returns `{ retentionDays }` within the accepted range.
 */
function normalizeBackup(raw) {
  const source = raw !== null && typeof raw === 'object' ? raw : {}
  const days = Number(source.retentionDays)
  return { retentionDays: Number.isSafeInteger(days) && days >= 1 && days <= 365 ? days : DEFAULT_SETTINGS.backup.retentionDays }
}

/**
 * Normalize preferences, tolerating missing or malformed fields.
 * @param raw - stored or partially supplied settings object.
 * @returns a complete settings object.
 */
function normalizeSettings(raw) {
  const source = raw !== null && typeof raw === 'object' ? raw : {}
  const quiet = source.quietHours !== null && typeof source.quietHours === 'object' ? source.quietHours : {}
  const clock = (value, fallback) => (typeof value === 'string' && CLOCK_PATTERN.test(value) ? value : fallback)
  return {
    systemNotifications: source.systemNotifications !== false,
    sound: source.sound === true,
    quietHours: {
      enabled: quiet.enabled === true,
      start: clock(quiet.start, DEFAULT_SETTINGS.quietHours.start),
      end: clock(quiet.end, DEFAULT_SETTINGS.quietHours.end),
    },
    semantic: normalizeSemantic(source.semantic),
    backup: normalizeBackup(source.backup),
  }
}

/**
 * Detach one settings object from the store.
 * @param settings - normalized settings.
 * @returns a detached copy safe to hand to the Client.
 */
function copySettings(settings) {
  return {
    systemNotifications: settings.systemNotifications,
    sound: settings.sound,
    quietHours: { ...settings.quietHours },
    semantic: { ...settings.semantic },
    backup: { ...settings.backup },
  }
}

/** Hard limits that keep one personal store readable and cheap to clock. */
const MAX_NOTES = 2000
const MAX_TEXT_LENGTH = 20000
const MAX_TAGS = 12
const MAX_TAG_LENGTH = 32
const MAX_VIEW_NOTES = 100

/** Files holding the local embedding index next to `notes.json`. */
const EMBED_BIN_FILE = 'embeddings.bin'
const EMBED_META_FILE = 'embeddings.meta.json'

/** Bump when the stored index layout changes; older files are rebuilt. */
const EMBED_VERSION = 1

/** Notes embedded per request: short batches keep the UI responsive. */
const EMBED_BATCH = 16

/** Longest note text sent to the embedder; longer notes are truncated. */
const EMBED_TEXT_LIMIT = 4000

/** Keep the embedding model loaded between searches. */
const EMBED_KEEP_ALIVE = '30m'

/** How long one availability probe stays fresh. */
const PROBE_TTL_MS = 60000

/** How often a failed indexing pass may retry. */
const RETRY_DELAY_MS = 30000

/** Soft-deleted notes (the recycle bin) are purged after this many days. */
const TRASH_RETENTION_DAYS = 30

/** Daily snapshots written next to `notes.json`. */
const BACKUP_DIR_NAME = 'backups'

/** Backup file names accepted for listing and restore (no path traversal). */
const BACKUP_NAME_PATTERN = /^memo-\d{8}(?:-\d{6})?\.json$/u

/**
 * Local calendar stamp, `YYYYMMDD`, used for backup file names so a day is one
 * snapshot even across a timezone-aware midnight.
 * @param date - instant to stamp.
 * @returns the local date stamp.
 */
function localDateStamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`
}

/** @returns a local time stamp `HHMMSS` for on-demand snapshots. */
function localTimeStamp(date = new Date()) {
  const pad = (value) => String(value).padStart(2, '0')
  return `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

/** A rejected mutation or malformed request; `status` becomes the HTTP status. */
class MemoError extends Error {
  /**
   * @param status - HTTP status the route answers with.
   * @param message - short reason safe to show in the page.
   */
  constructor(status, message) {
    super(message)
    this.name = 'MemoError'
    this.status = status
  }
}

/**
 * Resolve the directory holding this profile's memo store. The Host process
 * inherits `DSH_HOME` from the launcher; the homedir fallback only keeps a bare
 * `node index.js` smoke test working.
 * @returns absolute store directory.
 */
function resolveStoreDir() {
  const home = process.env.DSH_HOME?.trim()
  return home === undefined || home.length === 0
    ? join(homedir(), '.dsh', 'storages', 'memo')
    : join(home, 'storages', 'memo')
}

/** @returns the current instant as an ISO-8601 string. */
function now() {
  return new Date().toISOString()
}

/**
 * Coerce raw JSON into the canonical note shape, dropping what cannot be read.
 * @param value - one record as stored.
 * @returns a normalized note, or `undefined` when the record is unusable.
 */
function normalizeNote(value) {
  if (value === null || typeof value !== 'object') return undefined
  const text = typeof value.text === 'string' ? value.text : ''
  if (text.length === 0) return undefined
  const id = typeof value.id === 'string' && value.id.length > 0 ? value.id : randomUUID()
  const tags = Array.isArray(value.tags)
    ? value.tags.filter((tag) => typeof tag === 'string' && tag.length > 0).slice(0, MAX_TAGS)
    : []
  const timestamp = typeof value.updatedAt === 'string' ? value.updatedAt : now()
  return {
    id,
    text: text.slice(0, MAX_TEXT_LENGTH),
    tags,
    pinned: value.pinned === true,
    done: value.done === true,
    archived: value.archived === true,
    deletedAt: typeof value.deletedAt === 'string' && !Number.isNaN(Date.parse(value.deletedAt)) ? new Date(value.deletedAt).toISOString() : null,
    sourceSessionId: typeof value.sourceSessionId === 'string' && value.sourceSessionId.length > 0 ? value.sourceSessionId : null,
    repeat: value.repeat === 'daily' || value.repeat === 'weekly' || value.repeat === 'weekdays' || value.repeat === 'interval' ? value.repeat : null,
    repeatMinutes: typeof value.repeatMinutes === 'number' && Number.isSafeInteger(value.repeatMinutes) ? value.repeatMinutes : null,
    repeatAnchor: typeof value.repeatAnchor === 'string' && !Number.isNaN(Date.parse(value.repeatAnchor)) ? new Date(value.repeatAnchor).toISOString() : null,
    remindAt: typeof value.remindAt === 'string' && !Number.isNaN(Date.parse(value.remindAt)) ? new Date(value.remindAt).toISOString() : null,
    remindAckedAt: typeof value.remindAckedAt === 'string' && !Number.isNaN(Date.parse(value.remindAckedAt)) ? new Date(value.remindAckedAt).toISOString() : null,
    createdAt: typeof value.createdAt === 'string' ? value.createdAt : timestamp,
    updatedAt: timestamp,
  }
}

/**
 * Validate and normalize one tag list from the Client or the tool.
 * @param value - candidate tag list.
 * @returns trimmed, de-duplicated tags.
 */
function normalizeTags(value) {
  if (value === undefined) return []
  if (!Array.isArray(value)) throw new MemoError(400, 'tags must be an array of strings')
  const tags = []
  for (const raw of value) {
    if (typeof raw !== 'string') throw new MemoError(400, 'tags must be an array of strings')
    const tag = raw.trim().replace(/^#+/, '')
    if (tag.length === 0) continue
    if (tag.length > MAX_TAG_LENGTH) throw new MemoError(400, `a tag is longer than ${MAX_TAG_LENGTH} characters`)
    if (!tags.includes(tag)) tags.push(tag)
    if (tags.length > MAX_TAGS) throw new MemoError(400, `at most ${MAX_TAGS} tags per note`)
  }
  return tags
}

/**
 * Validate note text from the Client or the tool.
 * @param value - candidate text.
 * @returns trimmed text.
 */
function normalizeText(value) {
  if (typeof value !== 'string') throw new MemoError(400, 'text must be a string')
  const text = value.trim()
  if (text.length === 0) throw new MemoError(400, 'text must not be empty')
  if (text.length > MAX_TEXT_LENGTH) throw new MemoError(400, `text is longer than ${MAX_TEXT_LENGTH} characters`)
  return text
}

/**
 * Validate one reminder time. Empty values clear the reminder; anything else
 * must be a parseable ISO-8601 date-time and is stored in UTC.
 * @param value - candidate reminder time, already normalized for `undefined` by callers.
 * @returns the canonical ISO string, or null to clear the reminder.
 */
function normalizeRemindAt(value) {
  if (value === null || value === '' || value === undefined) return null
  if (typeof value !== 'string') throw new MemoError(400, 'remindAt must be an ISO-8601 string or null')
  const time = Date.parse(value)
  if (Number.isNaN(time)) throw new MemoError(400, 'remindAt must be a valid ISO-8601 date-time')
  return new Date(time).toISOString()
}

/** Accepted repeat kinds; the stored rule is flat so the JSON stays simple. */
const REPEAT_KINDS = new Set(['daily', 'weekly', 'weekdays', 'interval'])

/**
 * Validate a repeat rule read from the Client or the tool.
 * @param repeat - `null`, `'none'`, or a supported kind.
 * @param minutes - interval length, required for `'interval'`.
 * @returns the canonical `{ repeat, repeatMinutes }` pair.
 */
function normalizeRepeat(repeat, minutes) {
  if (repeat === undefined || repeat === null || repeat === 'none' || repeat === '') return { repeat: null, repeatMinutes: null }
  if (typeof repeat !== 'string' || !REPEAT_KINDS.has(repeat)) throw new MemoError(400, `repeat must be one of none/daily/weekly/weekdays/interval`)
  if (repeat !== 'interval') return { repeat, repeatMinutes: null }
  if (minutes === undefined || minutes === null) throw new MemoError(400, 'an interval repeat needs repeatMinutes')
  if (!Number.isSafeInteger(minutes) || minutes < 15 || minutes > 10080) throw new MemoError(400, 'repeatMinutes must be an integer between 15 and 10080')
  return { repeat, repeatMinutes: minutes }
}

/**
 * Step length of one repeat rule.
 * @param repeat - canonical repeat kind.
 * @param minutes - interval length.
 * @returns milliseconds per occurrence.
 */
function repeatStepMs(repeat, minutes) {
  if (repeat === 'daily') return 24 * 3600 * 1000
  if (repeat === 'weekly') return 7 * 24 * 3600 * 1000
  if (repeat === 'interval') return (minutes ?? 60) * 60000
  return 0
}

/**
 * Next weekday occurrence strictly after `now`, keeping the anchor's UTC
 * time-of-day and skipping Saturday/Sunday. UTC is used because reminders are
 * stored as instants; for time zones far from UTC the weekday may differ.
 * @param anchor - ISO time of the occurrence the rule is based on.
 * @param nowMs - current epoch milliseconds.
 * @returns the next ISO occurrence on a weekday.
 */
function advanceWeekdayOccurrence(anchor, nowMs) {
  const base = new Date(anchor)
  if (Number.isNaN(base.getTime())) return null
  const now = new Date(nowMs)
  const candidate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    base.getUTCHours(),
    base.getUTCMinutes(),
    base.getUTCSeconds(),
    base.getUTCMilliseconds(),
  ))
  while (candidate.getTime() <= nowMs || candidate.getUTCDay() === 0 || candidate.getUTCDay() === 6) {
    candidate.setUTCDate(candidate.getUTCDate() + 1)
  }
  return candidate.toISOString()
}

/**
 * Next occurrence strictly after `now`, counted from the anchor without looping.
 * @param anchor - ISO time of the occurrence the rule is based on.
 * @param repeat - canonical repeat kind.
 * @param minutes - interval length.
 * @param nowMs - current epoch milliseconds.
 * @returns the next ISO occurrence, or null when the rule is invalid.
 */
function advanceOccurrence(anchor, repeat, minutes, nowMs) {
  if (repeat === 'weekdays') return advanceWeekdayOccurrence(anchor, nowMs)
  const base = Date.parse(anchor)
  const step = repeatStepMs(repeat, minutes)
  if (Number.isNaN(base) || step <= 0) return null
  const steps = Math.max(1, Math.floor((nowMs - base) / step) + 1)
  return new Date(base + steps * step).toISOString()
}

/**
 * Validate one optional source session id (set by the `memo` tool when the note
 * is written from a conversation; the UI never sends it).
 * @param value - candidate session id.
 * @returns the id, or null when the note has no conversation source.
 */
function normalizeSourceSessionId(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') throw new MemoError(400, 'sourceSessionId must be a string or null')
  if (value.length > 200) throw new MemoError(400, 'sourceSessionId is too long')
  return value
}

/**
 * The one global note store. Reads are served from memory after the first load;
 * every mutation is serialized, applied to a draft copy, persisted, then
 * published, so a rejected mutation never changes the visible list.
 */
class MemoStore {
  /** @param dir - directory holding `notes.json`. */
  constructor(dir) {
    this.dir = dir
    this.file = join(dir, 'notes.json')
    this.notes = []
    this.settings = normalizeSettings(DEFAULT_SETTINGS)
    this.loaded = false
    this.loading = null
    this.queue = Promise.resolve()
    this.changeListeners = new Set()
    this.backupDir = join(dir, BACKUP_DIR_NAME)
    this.backupDay = null
    this.backupCount = 0
    this.backupLastAt = null
  }

  /**
   * Subscribe to committed note/settings changes (used to keep the embedding
   * index in step with the store).
   * @param listener - called after each successful commit.
   * @returns an unsubscribe function.
   */
  onChange(listener) {
    this.changeListeners.add(listener)
    return () => {
      this.changeListeners.delete(listener)
    }
  }

  /** Tell subscribers that a mutation was committed. */
  notifyChange() {
    for (const listener of [...this.changeListeners]) {
      try {
        listener()
      } catch (error) {
        process.stderr.write(`[memo] change listener failed: ${error instanceof Error ? error.message : String(error)}\n`)
      }
    }
  }

  /**
   * Read the store once. A corrupt file is preserved beside the store (renamed)
   * and starts empty instead of failing every later request.
   * @returns when the in-memory list is authoritative.
   */
  async load() {
    if (this.loaded) return
    if (this.loading !== null) return this.loading
    this.loading = (async () => {
      try {
        let text
        try {
          text = await readFile(this.file, 'utf8')
        } catch (error) {
          if (error?.code !== 'ENOENT') throw error
          return
        }
        let parsed
        try {
          parsed = JSON.parse(text)
        } catch {
          const backup = `${this.file}.corrupt-${Date.now()}`
          await rename(this.file, backup).catch(() => {})
          return
        }
        const records = Array.isArray(parsed?.notes) ? parsed.notes : []
        const cutoff = Date.now() - TRASH_RETENTION_DAYS * 24 * 3600 * 1000
        const normalized = records.map(normalizeNote).filter((note) => note !== undefined)
        this.notes = normalized.filter((note) => note.deletedAt === null || Date.parse(note.deletedAt) > cutoff)
        this.settings = normalizeSettings(parsed?.settings)
        if (this.notes.length !== normalized.length) await this.persist()
      } finally {
        this.loaded = true
        this.loading = null
      }
    })()
    return this.loading
  }

  /** @returns the serialized store document. */
  serialize() {
    return `${JSON.stringify({ version: FORMAT_VERSION, notes: this.notes, settings: this.settings }, null, 2)}\n`
  }

  /** Persist the current list atomically, then keep today's backup snapshot. */
  async persist() {
    await mkdir(this.dir, { recursive: true })
    const temporary = `${this.file}.${process.pid}.${randomUUID()}.tmp`
    const text = this.serialize()
    await writeFile(temporary, text, { mode: 0o600 })
    await rename(temporary, this.file)
    await this.writeDailyBackup()
  }

  /**
   * @param text - snapshot payload.
   * @returns its sha256 digest, used to skip byte-identical backups.
   */
  backupDigest(text) {
    return createHash('sha256').update(text).digest('hex')
  }

  /**
   * List the snapshots with their sizes and modification times.
   * @returns entries sorted by modification time (oldest first).
   */
  async listBackups() {
    let names
    try {
      names = (await readdir(this.backupDir)).filter((name) => /^memo-\d{8}(?:-\d{6})?\.json$/u.test(name))
    } catch {
      return []
    }
    const entries = []
    for (const name of names) {
      try {
        const fileStat = await stat(join(this.backupDir, name))
        entries.push({ name, size: fileStat.size, mtimeMs: fileStat.mtimeMs })
      } catch {
        // A snapshot removed mid-scan is simply not listed.
      }
    }
    entries.sort((left, right) => left.mtimeMs - right.mtimeMs || left.name.localeCompare(right.name))
    return entries
  }

  /**
   * Read the most recently written snapshot's digest so an unchanged store does
   * not write a duplicate backup.
   * @returns `{ name, digest }`, or null when no backup exists or it cannot be read.
   */
  async latestBackupEntry() {
    const entries = await this.listBackups()
    if (entries.length === 0) return null
    const name = entries[entries.length - 1].name
    try {
      return { name, digest: this.backupDigest(await readFile(join(this.backupDir, name), 'utf8')) }
    } catch {
      return null
    }
  }

  /**
   * Snapshot the store into the backup directory and rotate old files.
   * A snapshot identical to the newest one is skipped, so repeated clicks do not
   * consume disk.
   * @param force - use a timestamped file name instead of today's daily name.
   * @returns the refreshed backup status (plus `skipped` when nothing was written).
   */
  async createBackup(force = false) {
    const today = localDateStamp()
    const dir = this.backupDir
    const text = this.serialize()
    const digest = this.backupDigest(text)
    const latest = await this.latestBackupEntry()
    if (latest !== null && latest.digest === digest) return { ...(await this.backupStatus()), skipped: true }
    if (!force && this.backupDay === today) return this.backupStatus()
    await mkdir(dir, { recursive: true })
    const name = force ? `memo-${today}-${localTimeStamp()}.json` : `memo-${today}.json`
    const file = join(dir, name)
    const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`
    await writeFile(temporary, text, { mode: 0o600 })
    await rename(temporary, file)
    this.backupDay = today
    await this.pruneBackups()
    return this.backupStatus()
  }

  /**
   * Write today's snapshot when the store changes for the first time today.
   * Failures are logged and never block a write.
   */
  async writeDailyBackup() {
    if (this.backupDay === localDateStamp()) return
    try {
      await this.createBackup(false)
    } catch (error) {
      process.stderr.write(`[memo] daily backup skipped: ${error instanceof Error ? error.message : String(error)}\n`)
    }
  }

  /** Keep only the newest `backup.retentionDays` snapshots. */
  async pruneBackups() {
    let names
    try {
      names = (await readdir(this.backupDir)).filter((name) => /^memo-\d{8}(?:-\d{6})?\.json$/u.test(name)).sort()
    } catch {
      return
    }
    const limit = this.settings.backup.retentionDays
    const extra = names.slice(0, Math.max(0, names.length - limit))
    for (const name of extra) {
      await unlink(join(this.backupDir, name)).catch(() => {})
    }
  }

  /**
   * Read the backup directory and refresh the cached counters.
   * @returns `{ count, lastAt, retentionDays }`.
   */
  /**
   * Replace the whole store with one snapshot. The current state is snapshotted
   * first, so a restore is itself undoable.
   * @param name - backup file name, validated against the backup pattern.
   * @returns `{ kind: 'restore', restored, settings }`.
   */
  async restoreBackup(name) {
    if (typeof name !== 'string' || !BACKUP_NAME_PATTERN.test(name)) throw new MemoError(400, 'invalid backup name')
    const file = join(this.backupDir, name)
    let text
    try {
      text = await readFile(file, 'utf8')
    } catch (error) {
      if (error?.code === 'ENOENT') throw new MemoError(404, `no backup named "${name}"`)
      throw error
    }
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      throw new MemoError(400, 'the backup file is not valid JSON')
    }
    const records = Array.isArray(parsed?.notes) ? parsed.notes : null
    if (records === null) throw new MemoError(400, 'the backup file has no notes')
    const normalized = records.map(normalizeNote).filter((note) => note !== undefined)
    if (records.length > 0 && normalized.length === 0) throw new MemoError(400, 'the backup file has no readable notes')
    const settings = normalizeSettings(parsed?.settings)
    const run = this.queue.then(async () => {
      await this.load()
      // Keep the pre-restore state as a timestamped snapshot.
      await this.createBackup(true).catch(() => undefined)
      this.notes = normalized
      this.settings = settings
      await this.persist()
      this.notifyChange()
      return { kind: 'restore', restored: { name, notes: normalized.length }, settings: copySettings(this.settings) }
    })
    this.queue = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }


  async backupStatus() {
    await this.load()
    const retentionDays = this.settings.backup.retentionDays
    const entries = await this.listBackups()
    const bytes = entries.reduce((total, entry) => total + entry.size, 0)
    const newestAt = entries.length === 0 ? null : new Date(entries[entries.length - 1].mtimeMs).toISOString()
    this.backupCount = entries.length
    this.backupLastAt = newestAt
    return { count: entries.length, lastAt: newestAt, bytes, retentionDays, dir: this.backupDir }
  }

  /**
   * Remove older snapshots, keeping the newest `keep` ones.
   * @param keep - number of snapshots to retain.
   * @returns the refreshed status plus how many files were removed.
   */
  async cleanupBackups(keep = 1) {
    let names
    try {
      names = (await readdir(this.backupDir)).filter((name) => /^memo-\d{8}(?:-\d{6})?\.json$/u.test(name)).sort()
    } catch {
      return { ...(await this.backupStatus()), removed: 0 }
    }
    const keepCount = Math.max(0, Math.min(keep, names.length))
    const removable = names.slice(0, names.length - keepCount)
    for (const name of removable) {
      await unlink(join(this.backupDir, name)).catch(() => {})
    }
    return { ...(await this.backupStatus()), removed: removable.length }
  }

  /**
   * Snapshot the store for a read.
   * @returns a shallow copy of the note list.
   */
  async list() {
    await this.load()
    return this.notes.slice()
  }

  /**
   * Synchronous snapshot for the prompt-context provider, which runs on every
   * assembly and must not await IO. Empty until the first load finishes.
   * @returns the notes currently held in memory.
   */
  snapshotSync() {
    return this.loaded ? this.notes : []
  }

  /**
   * Apply one mutation under the write queue.
   * @param apply - receives a draft copy; may throw `MemoError` to reject.
   * @returns the committed note list.
   */
  async mutate(apply) {
    const run = this.queue.then(async () => {
      await this.load()
      const draft = this.notes.map((note) => ({ ...note, tags: note.tags.slice() }))
      const result = await apply(draft)
      if (draft.length > MAX_NOTES) throw new MemoError(400, `the memo store is full (${MAX_NOTES} notes)`)
      this.notes = draft
      await this.persist()
      this.notifyChange()
      return result === undefined ? this.notes.slice() : result
    })
    this.queue = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  /**
   * Snapshot settings for a read.
   * @returns a shallow copy of the notification preferences.
   */
  async settingsSnapshot() {
    await this.load()
    return copySettings(this.settings)
  }

  /**
   * Replace notification preferences under the write queue.
   * @param next - complete normalized settings.
   * @returns the committed settings.
   */
  async updateSettings(next) {
    const run = this.queue.then(async () => {
      await this.load()
      this.settings = next
      await this.persist()
      this.notifyChange()
      return copySettings(this.settings)
    })
    this.queue = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  /**
   * Dispatch one Client operation.
   * @param operation - `{ op, ... }` body from `POST /api/memo`.
   * @returns the committed note list.
   */
  async apply(operation) {
    if (operation === null || typeof operation !== 'object') throw new MemoError(400, 'expected a JSON object body')
    const op = operation.op
    if (op === 'create') {
      const text = normalizeText(operation.text)
      const tags = normalizeTags(operation.tags)
      const remindAt = normalizeRemindAt(operation.remindAt)
      const sourceSessionId = normalizeSourceSessionId(operation.sourceSessionId)
      const { repeat, repeatMinutes } = normalizeRepeat(operation.repeat, operation.repeatMinutes)
      if (repeat !== null && remindAt === null) throw new MemoError(400, 'a repeating reminder needs a reminder time')
      return this.mutate((draft) => {
        draft.push({
          id: randomUUID(),
          text,
          tags,
          pinned: false,
          done: false,
          archived: false,
          deletedAt: null,
          sourceSessionId,
          remindAt,
          remindAckedAt: null,
          repeat,
          repeatMinutes,
          repeatAnchor: repeat === null ? null : remindAt,
          createdAt: now(),
          updatedAt: now(),
        })
      })
    }
    if (op === 'update') {
      const id = requireId(operation.id)
      const patch = readPatch(operation)
      return this.mutate((draft) => {
        const note = draft.find((candidate) => candidate.id === id)
        if (note === undefined) throw new MemoError(404, `no note "${id}"`)
        Object.assign(note, patch, { updatedAt: now() })
        if (Object.hasOwn(patch, 'remindAt')) {
          // A written reminder is a fresh reminder: drop the old acknowledgement and
          // rebuild the anchor the repeat rule counts from.
          note.remindAckedAt = null
          note.repeatAnchor = note.remindAt
          if (note.remindAt === null) {
            note.repeat = null
            note.repeatMinutes = null
          }
        }
        if (Object.hasOwn(patch, 'repeat')) {
          note.repeat = patch.repeat
          note.repeatMinutes = patch.repeatMinutes
          if (patch.repeat === null) note.repeatAnchor = null
          else if (note.repeatAnchor === null) note.repeatAnchor = note.remindAt
          if (patch.repeat !== null && note.remindAt === null) throw new MemoError(400, 'a repeating reminder needs a reminder time')
        }
      })
    }
    if (op === 'snoozeReminder') {
      const id = requireId(operation.id)
      const nowMs = Date.now()
      let target
      if (operation.until !== undefined) {
        if (typeof operation.until !== 'string' || Number.isNaN(Date.parse(operation.until))) throw new MemoError(400, 'snooze until must be an ISO-8601 date-time')
        target = new Date(Date.parse(operation.until)).toISOString()
        if (Date.parse(target) <= nowMs) throw new MemoError(400, 'snooze until must be in the future')
      } else {
        const minutes = Number(operation.minutes ?? 10)
        if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 10080) throw new MemoError(400, 'snooze minutes must be between 1 and 10080')
        target = new Date(nowMs + minutes * 60000).toISOString()
      }
      return this.mutate((draft) => {
        const note = draft.find((candidate) => candidate.id === id)
        if (note === undefined) throw new MemoError(404, `no note "${id}"`)
        note.remindAt = target
        note.remindAckedAt = null
        note.updatedAt = now()
      })
    }
    if (op === 'ackReminder') {
      const id = requireId(operation.id)
      const nowMs = Date.now()
      return this.mutate((draft) => {
        const note = draft.find((candidate) => candidate.id === id)
        if (note === undefined) throw new MemoError(404, `no note "${id}"`)
        const next = note.repeat == null ? null : advanceOccurrence(note.repeatAnchor ?? note.remindAt, note.repeat, note.repeatMinutes, nowMs)
        if (next === null) {
          note.remindAckedAt = now()
        } else {
          note.remindAt = next
          note.repeatAnchor = next
          note.remindAckedAt = null
        }
        note.updatedAt = now()
      })
    }
    if (op === 'delete') {
      // Deleting moves the note to the recycle bin; a second `purge` destroys it.
      const id = requireId(operation.id)
      return this.mutate((draft) => {
        const note = draft.find((candidate) => candidate.id === id)
        if (note === undefined) throw new MemoError(404, `no note "${id}"`)
        if (note.deletedAt !== null) throw new MemoError(400, 'the note is already in the recycle bin')
        note.deletedAt = now()
        note.updatedAt = now()
      })
    }
    if (op === 'restore') {
      const id = requireId(operation.id)
      return this.mutate((draft) => {
        const note = draft.find((candidate) => candidate.id === id)
        if (note === undefined) throw new MemoError(404, `no note "${id}"`)
        if (note.deletedAt === null) throw new MemoError(400, 'the note is not in the recycle bin')
        note.deletedAt = null
        note.updatedAt = now()
      })
    }
    if (op === 'purge') {
      const id = requireId(operation.id)
      return this.mutate((draft) => {
        const index = draft.findIndex((candidate) => candidate.id === id)
        if (index === -1) throw new MemoError(404, `no note "${id}"`)
        if (draft[index].deletedAt === null) throw new MemoError(400, 'only notes in the recycle bin can be destroyed')
        draft.splice(index, 1)
      })
    }
    if (op === 'export') {
      const format = operation.format === 'json' ? 'json' : 'markdown'
      await this.load()
      const exportedAt = now()
      const stamp = `${localDateStamp()}-${localTimeStamp()}`
      if (format === 'json') {
        return {
          kind: 'export',
          format,
          filename: `memo-${stamp}.json`,
          mime: 'application/json;charset=utf-8',
          content: renderJsonExport(this.notes, this.settings, exportedAt),
        }
      }
      return {
        kind: 'export',
        format,
        filename: `memo-${stamp}.md`,
        mime: 'text/markdown;charset=utf-8',
        content: renderMarkdownExport(this.notes, exportedAt),
      }
    }
    if (op === 'backupNow') {
      const run = this.queue.then(async () => {
        await this.load()
        return { kind: 'backup', backup: await this.createBackup(true) }
      })
      this.queue = run.then(
        () => undefined,
        () => undefined,
      )
      return run
    }
    if (op === 'cleanupBackups') {
      const rawKeep = Number(operation.keep ?? 1)
      const keep = Number.isSafeInteger(rawKeep) ? Math.max(0, Math.min(rawKeep, 100)) : 1
      const run = this.queue.then(async () => {
        await this.load()
        return { kind: 'backup', backup: await this.cleanupBackups(keep) }
      })
      this.queue = run.then(
        () => undefined,
        () => undefined,
      )
      return run
    }
    if (op === 'listBackups') {
      const run = this.queue.then(async () => {
        await this.load()
        const entries = await this.listBackups()
        const backups = entries
          .slice()
          .reverse()
          .map((entry) => ({ name: entry.name, size: entry.size, at: new Date(entry.mtimeMs).toISOString() }))
        return { kind: 'backupList', backups, backup: await this.backupStatus() }
      })
      this.queue = run.then(
        () => undefined,
        () => undefined,
      )
      return run
    }
    if (op === 'restoreBackup') return this.restoreBackup(operation.name)
    if (op === 'updateSettings') {
      const patch = operation.settings !== null && typeof operation.settings === 'object' ? operation.settings : null
      if (patch === null) throw new MemoError(400, 'updateSettings needs a settings object')
      const semantic = patch.semantic !== null && typeof patch.semantic === 'object' ? patch.semantic : {}
      return this.updateSettings(
        normalizeSettings({
          ...this.settings,
          ...patch,
          quietHours: { ...this.settings.quietHours, ...(patch.quietHours ?? {}) },
          semantic: { ...this.settings.semantic, ...semantic },
          backup: { ...this.settings.backup, ...(patch.backup !== null && typeof patch.backup === 'object' ? patch.backup : {}) },
        }),
      )
    }
    throw new MemoError(400, `unknown memo operation ${JSON.stringify(op)}`)
  }
}

/**
 * Normalize one raw embedding to unit length so cosine similarity is a plain dot
 * product; the index stores only unit vectors.
 * @param values - numbers returned by the local embedding model.
 * @returns a normalized Float32Array.
 */
function unitVector(values) {
  let sum = 0
  for (const value of values) sum += value * value
  const vector = Float32Array.from(values)
  if (sum <= 0) return vector
  const inverse = 1 / Math.sqrt(sum)
  for (let index = 0; index < vector.length; index += 1) vector[index] *= inverse
  return vector
}

/**
 * Text one note is embedded as: its body plus its tags, clipped to the window
 * most local models accept.
 * @param note - note record.
 * @returns the embedder input string.
 */
function embeddingInput(note) {
  const text = note.text.length > EMBED_TEXT_LIMIT ? note.text.slice(0, EMBED_TEXT_LIMIT) : note.text
  return note.tags.length === 0 ? text : `${text}\n#${note.tags.join(' #')}`
}

/**
 * FNV-1a hash of the embedder input; detects notes whose text or tags changed.
 * @param note - note record.
 * @returns a short hex digest.
 */
function embeddingHash(note) {
  const text = embeddingInput(note)
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16)
}

/**
 * Local semantic index over the memo store, backed by an Ollama embedding model.
 *
 * The index is optional: when disabled, unreachable or empty, the panel keeps
 * working from its keyword filter. Vectors live in memory (one unit vector per
 * note) and are persisted as one binary blob next to `notes.json`, so a restart
 * does not re-embed the whole store.
 */
class SemanticIndex {
  /**
   * @param dir - memo storage directory; the index files live beside the notes.
   * @param store - the memo store the index tracks.
   */
  constructor(dir, store) {
    this.dir = dir
    this.store = store
    this.binFile = join(dir, EMBED_BIN_FILE)
    this.metaFile = join(dir, EMBED_META_FILE)
    this.meta = { version: EMBED_VERSION, model: null, dim: 0, updatedAt: null }
    this.records = new Map()
    this.vectors = new Map()
    this.loaded = false
    this.loading = null
    this.running = null
    this.dirty = false
    this.forcePending = false
    this.total = 0
    this.available = null
    this.probedAt = 0
    this.lastAttemptAt = 0
    this.state = { building: false, progress: 0, error: null }
  }

  /** @returns the current semantic preferences. */
  config() {
    return this.store.settings?.semantic ?? DEFAULT_SETTINGS.semantic
  }

  /**
   * Snapshot for the Client (progress, availability, counts).
   * @returns a JSON-safe status object.
   */
  status() {
    const config = this.config()
    return {
      enabled: config.enabled,
      model: config.model,
      available: this.available,
      indexed: this.vectors.size,
      total: this.total,
      dim: this.meta.dim,
      building: this.state.building,
      progress: this.state.progress,
      error: this.state.error,
    }
  }

  /** Load the persisted index once; a stale or broken file simply means "empty". */
  async loadIndex() {
    if (this.loaded) return
    if (this.loading !== null) return this.loading
    this.loading = (async () => {
      try {
        const meta = JSON.parse(await readFile(this.metaFile, 'utf8'))
        const model = this.config().model
        if (meta?.version !== EMBED_VERSION || meta.model !== model || !Number.isSafeInteger(meta.dim) || meta.dim <= 0 || !Array.isArray(meta.records)) return
        const buffer = await readFile(this.binFile)
        if (buffer.byteLength !== meta.records.length * meta.dim * 4) return
        const raw = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4)
        for (let index = 0; index < meta.records.length; index += 1) {
          const record = meta.records[index]
          if (record === null || typeof record !== 'object' || typeof record.id !== 'string' || typeof record.hash !== 'string') continue
          const offset = index * meta.dim
          this.records.set(record.id, record.hash)
          this.vectors.set(record.id, raw.subarray(offset, offset + meta.dim))
        }
        this.meta = { version: meta.version, model: meta.model, dim: meta.dim, updatedAt: meta.updatedAt ?? null }
      } catch (error) {
        if (error?.code !== 'ENOENT') process.stderr.write(`[memo] embedding index skipped: ${error instanceof Error ? error.message : String(error)}\n`)
        this.records.clear()
        this.vectors.clear()
        this.meta = { version: EMBED_VERSION, model: null, dim: 0, updatedAt: null }
      } finally {
        this.loaded = true
        this.loading = null
      }
    })()
    return this.loading
  }

  /** Persist the in-memory vectors atomically: blob first, then the metadata. */
  async persistIndex() {
    const dim = this.meta.dim > 0 ? this.meta.dim : [...this.vectors.values()][0]?.length ?? 0
    await mkdir(this.dir, { recursive: true })
    if (dim > 0 && this.vectors.size > 0) {
      const data = new Float32Array(this.vectors.size * dim)
      let offset = 0
      const records = []
      for (const [id, vector] of this.vectors) {
        if (vector.length !== dim) continue
        data.set(vector, offset)
        offset += dim
        records.push({ id, hash: this.records.get(id) ?? '' })
      }
      const binTemporary = `${this.binFile}.${process.pid}.${randomUUID()}.tmp`
      await writeFile(binTemporary, Buffer.from(data.buffer, data.byteOffset, data.byteLength), { mode: 0o600 })
      await rename(binTemporary, this.binFile)
      const meta = { version: EMBED_VERSION, model: this.config().model, dim, records, updatedAt: now() }
      const metaTemporary = `${this.metaFile}.${process.pid}.${randomUUID()}.tmp`
      await writeFile(metaTemporary, `${JSON.stringify(meta)}\n`, { mode: 0o600 })
      await rename(metaTemporary, this.metaFile)
      this.meta = { version: meta.version, model: meta.model, dim: meta.dim, updatedAt: meta.updatedAt }
      return
    }
    // Nothing indexable yet: drop the metadata so the next run rebuilds cleanly.
    const metaTemporary = `${this.metaFile}.${process.pid}.${randomUUID()}.tmp`
    await writeFile(metaTemporary, `${JSON.stringify({ version: EMBED_VERSION, model: this.config().model, dim: 0, records: [], updatedAt: now() })}\n`, { mode: 0o600 })
    await rename(metaTemporary, this.metaFile)
  }

  /**
   * Ask the local Ollama daemon for embeddings; every failure surfaces as a
   * thrown Error so callers can fall back to keyword matching.
   * @param texts - batch of texts to embed.
   * @param config - semantic settings to use (defaults to the saved ones).
   * @returns one unit vector per text.
   */
  async embed(texts, config = this.config()) {
    const response = await fetch(`${config.endpoint}/api/embed`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        input: texts,
        truncate: true,
        keep_alive: EMBED_KEEP_ALIVE,
        options: { num_ctx: config.numCtx },
      }),
      signal: AbortSignal.timeout(120000),
    })
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`the embedding model answered HTTP ${response.status}${detail.length === 0 ? '' : `: ${detail.slice(0, 200)}`}`)
    }
    const body = await response.json()
    const embeddings = body?.embeddings
    if (!Array.isArray(embeddings) || embeddings.length !== texts.length) throw new Error('the embedding model answered an unexpected payload')
    this.available = true
    this.probedAt = Date.now()
    this.state.error = null
    return embeddings.map((values) => {
      if (!Array.isArray(values) || values.length === 0) throw new Error('the embedding model returned an empty vector')
      return unitVector(values)
    })
  }

  /**
   * Cheap availability probe with a short TTL.
   * @param force - skip the TTL cache.
   * @returns whether the endpoint currently answers.
   */
  async probe(force = false) {
    if (!force && this.probedAt !== 0 && Date.now() - this.probedAt < PROBE_TTL_MS) return this.available === true
    const config = this.config()
    try {
      const response = await fetch(`${config.endpoint}/api/tags`, { signal: AbortSignal.timeout(1500) })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      this.available = true
      this.state.error = null
    } catch (error) {
      this.available = false
      this.state.error = `local embedding endpoint unreachable: ${error instanceof Error ? error.message : String(error)}`
    }
    this.probedAt = Date.now()
    return this.available === true
  }

  /**
   * Ask for a background pass over missing or changed notes. Safe to call on
   * every mutation: at most one pass runs at a time and later calls coalesce.
   * @param force - re-embed every note (used by "rebuild index" and model changes).
   */
  kick(force = false) {
    if (!this.config().enabled) return
    this.dirty = true
    if (force) this.forcePending = true
    if (this.running !== null) return
    this.running = this.drain().finally(() => {
      this.running = null
    })
  }

  /** Run sync passes until no kick arrived in the meantime. */
  async drain() {
    while (this.dirty) {
      this.dirty = false
      const force = this.forcePending
      this.forcePending = false
      try {
        await this.syncOnce(force)
      } catch (error) {
        this.state.error = error instanceof Error ? error.message : String(error)
        this.available = false
        this.state.building = false
      }
    }
  }

  /**
   * One indexing pass: drop stale vectors, embed missing notes in small batches.
   * @param force - ignore existing vectors and restart from scratch.
   */
  async syncOnce(force) {
    const config = this.config()
    await this.loadIndex()
    await this.store.load()
    const notes = this.store.notes.filter((note) => note.deletedAt == null)
    this.total = notes.length
    if (!config.enabled) {
      this.state.building = false
      this.state.error = null
      return
    }
    if (this.meta.model !== null && this.meta.model !== config.model) {
      this.records.clear()
      this.vectors.clear()
      this.meta = { version: EMBED_VERSION, model: null, dim: 0, updatedAt: null }
    }
    const wanted = new Map()
    for (const note of notes) wanted.set(note.id, embeddingHash(note))
    let changed = false
    for (const id of [...this.vectors.keys()]) {
      if (!wanted.has(id)) {
        this.vectors.delete(id)
        this.records.delete(id)
        changed = true
      }
    }
    const targets = force ? notes : notes.filter((note) => !this.vectors.has(note.id) || this.records.get(note.id) !== wanted.get(note.id))
    if (targets.length === 0) {
      this.state.progress = 0
      this.state.building = false
      this.state.error = null
      if (changed) await this.persistIndex()
      return
    }
    this.state.building = true
    this.state.progress = 0
    this.state.error = null
    this.lastAttemptAt = Date.now()
    try {
      for (let offset = 0; offset < targets.length; offset += EMBED_BATCH) {
        const batch = targets.slice(offset, offset + EMBED_BATCH)
        const vectors = await this.embed(batch.map(embeddingInput), config)
        if (this.meta.dim === 0) this.meta.dim = vectors[0].length
        for (let index = 0; index < batch.length; index += 1) {
          this.vectors.set(batch[index].id, vectors[index])
          this.records.set(batch[index].id, wanted.get(batch[index].id))
        }
        this.state.progress = Math.min(offset + batch.length, targets.length)
      }
      await this.persistIndex()
      this.state.error = null
    } finally {
      this.state.building = false
      this.state.progress = 0
    }
  }

  /**
   * Rank notes by meaning against one query.
   * @param query - free text from the search box.
   * @param limit - maximum number of matches to report.
   * @returns matching note ids with cosine scores plus the index status.
   */
  async search(query, limit = 20) {
    const config = this.config()
    if (!config.enabled) return { matches: [], semantic: this.status() }
    await this.loadIndex()
    await this.store.load()
    const liveIds = new Set(this.store.notes.filter((note) => note.deletedAt == null).map((note) => note.id))
    this.total = liveIds.size
    if (this.vectors.size === 0 && this.running === null) this.kick(false)
    let queryVector
    try {
      ;[queryVector] = await this.embed([query.slice(0, EMBED_TEXT_LIMIT)], config)
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : String(error)
      this.available = false
      return { matches: [], semantic: this.status() }
    }
    const scored = []
    for (const [id, vector] of this.vectors) {
      if (!liveIds.has(id)) continue
      const length = Math.min(vector.length, queryVector.length)
      let score = 0
      for (let index = 0; index < length; index += 1) score += vector[index] * queryVector[index]
      if (score >= config.minScore) scored.push({ id, score: Math.round(score * 1000) / 1000 })
    }
    scored.sort((left, right) => right.score - left.score)
    return { matches: scored.slice(0, limit), semantic: this.status() }
  }

  /**
   * Status read for the panel: refresh notes count, probe availability and
   * retry a failed indexing pass after a short delay.
   * @returns a JSON-safe status object.
   */
  async statusProbe() {
    await this.loadIndex()
    await this.store.load()
    this.total = this.store.notes.filter((note) => note.deletedAt == null).length
    const config = this.config()
    if (config.enabled) {
      await this.probe()
      if (!this.state.building && this.vectors.size < this.total && Date.now() - this.lastAttemptAt > RETRY_DELAY_MS) this.kick(false)
    }
    return this.status()
  }
}

/**
 * @param value - candidate note id.
 * @returns the id.
 */
function requireId(value) {
  if (typeof value !== 'string' || value.trim().length === 0) throw new MemoError(400, 'id must be a non-empty string')
  return value.trim()
}

/**
 * Read a partial update from a Client operation or tool arguments.
 * @param source - object carrying optional `text`, `tags`, `pinned`, `done`, `archived`.
 * @returns only the fields the caller supplied.
 */
function readPatch(source) {
  const patch = {}
  if (source.text !== undefined) patch.text = normalizeText(source.text)
  if (source.tags !== undefined) patch.tags = normalizeTags(source.tags)
  if (source.remindAt !== undefined) patch.remindAt = normalizeRemindAt(source.remindAt)
  if (source.repeat !== undefined) {
    const normalized = normalizeRepeat(source.repeat, source.repeatMinutes)
    patch.repeat = normalized.repeat
    patch.repeatMinutes = normalized.repeatMinutes
  } else if (source.repeatMinutes !== undefined) {
    throw new MemoError(400, 'repeatMinutes is only accepted together with repeat')
  }
  for (const field of ['pinned', 'done', 'archived']) {
    if (source[field] !== undefined) {
      if (typeof source[field] !== 'boolean') throw new MemoError(400, `${field} must be a boolean`)
      patch[field] = source[field]
    }
  }
  if (Object.keys(patch).length === 0) throw new MemoError(400, 'no updatable field was supplied')
  return patch
}

/**
 * Order notes for display: pinned first, then most recently updated.
 * @param notes - notes to order.
 * @returns a new ordered array.
 */
function displayOrder(notes) {
  return notes.slice().sort((left, right) => {
    if (left.pinned !== right.pinned) return left.pinned ? -1 : 1
    return right.updatedAt.localeCompare(left.updatedAt)
  })
}

/**
 * Render the live notes as a Markdown document for the "export" operation.
 * @param notes - all notes, including notes in the recycle bin.
 * @param exportedAt - ISO timestamp of the export.
 * @returns markdown content.
 */
function renderMarkdownExport(notes, exportedAt) {
  const live = notes.filter((note) => note.deletedAt == null)
  const trashed = notes.length - live.length
  const groups = [
    ['未完成', live.filter((note) => !note.archived && !note.done)],
    ['已完成', live.filter((note) => !note.archived && note.done)],
    ['归档', live.filter((note) => note.archived)],
  ]
  const repeatLabel = (note) => (note.repeat == null ? '' : note.repeat === 'interval' ? `每 ${note.repeatMinutes ?? 60} 分钟` : note.repeat === 'daily' ? '每天' : '每周')
  const lines = ['# 备忘录导出', '', `导出时间：${exportedAt}`, '', `共 ${live.length} 条笔记${trashed === 0 ? '' : `（另有 ${trashed} 条在回收站，未导出）`}`, '']
  for (const [title, group] of groups) {
    if (group.length === 0) continue
    lines.push(`## ${title}（${group.length}）`, '')
    for (const note of displayOrder(group)) {
      const marks = [note.pinned ? '📌' : '', note.done ? '[x]' : '[ ]'].filter(Boolean).join(' ')
      const body = note.text.replaceAll('\n', '\n  ')
      lines.push(`- ${marks === '' ? '' : `${marks} `}${body}`)
      const meta = []
      if (note.tags.length > 0) meta.push(note.tags.map((tag) => `#${tag}`).join(' '))
      if (note.remindAt !== null) meta.push(`提醒：${note.remindAt}${repeatLabel(note) === '' ? '' : `（${repeatLabel(note)}）`}`)
      if (note.createdAt !== null) meta.push(`创建：${note.createdAt}`)
      if (meta.length > 0) lines.push(`  ${meta.join(' · ')}`)
      lines.push('')
    }
  }
  return lines.join('\n')
}

/**
 * Render the whole store as a lossless JSON document.
 * @param notes - all notes, including notes in the recycle bin.
 * @param settings - current preferences.
 * @param exportedAt - ISO timestamp of the export.
 * @returns pretty-printed JSON.
 */
function renderJsonExport(notes, settings, exportedAt) {
  return `${JSON.stringify({ version: FORMAT_VERSION, exportedAt, settings: copySettings(settings), notes }, null, 2)}\n`
}

/**
 * Build the browser-facing route handler over one store and its semantic index.
 * @param store - the global store.
 * @param semantic - the optional local embedding index.
 * @returns a Fetch handler answering GET (list) and POST (mutation or search).
 */
function createRouteHandler(store, semantic) {
  return async (request) => {
    try {
      if (request.method === 'GET') {
        return Response.json({
          ok: true,
          notes: displayOrder(await store.list()),
          settings: await store.settingsSnapshot(),
          semantic: semantic.status(),
          backup: await store.backupStatus(),
        })
      }
      if (request.method !== 'POST') return new Response('method not allowed', { status: 405 })
      const body = await request.json().catch(() => null)
      if (body !== null && typeof body === 'object') {
        if (body.op === 'search') {
          const query = typeof body.query === 'string' ? body.query.trim() : ''
          if (query.length === 0) throw new MemoError(400, 'search needs a non-empty query')
          if (query.length > 500) throw new MemoError(400, 'search query is longer than 500 characters')
          const result = await semantic.search(query, 20)
          return Response.json({ ok: true, matches: result.matches, semantic: result.semantic })
        }
        if (body.op === 'semanticStatus') {
          return Response.json({ ok: true, semantic: await semantic.statusProbe() })
        }
        if (body.op === 'reindex') {
          semantic.kick(true)
          return Response.json({ ok: true, semantic: await semantic.statusProbe() })
        }
        if (body.op === 'testEmbedding') {
          const patch = body.semantic !== null && typeof body.semantic === 'object' ? body.semantic : {}
          const config = normalizeSemantic({ ...semantic.config(), ...patch })
          const started = Date.now()
          try {
            const [vector] = await semantic.embed(['连接测试'], config)
            return Response.json({ ok: true, test: { model: config.model, dim: vector.length, ms: Date.now() - started } })
          } catch (error) {
            throw new MemoError(503, error instanceof Error ? error.message : 'the embedding model is unavailable')
          }
        }
      }
      const result = await store.apply(body)
      if (result !== null && typeof result === 'object' && result.kind === 'export') return Response.json({ ok: true, ...result })
      if (result !== null && typeof result === 'object' && result.kind === 'backup') return Response.json({ ok: true, backup: result.backup })
      if (result !== null && typeof result === 'object' && result.kind === 'backupList') return Response.json({ ok: true, backups: result.backups, backup: result.backup })
      if (result !== null && typeof result === 'object' && result.kind === 'restore') {
        return Response.json({
          ok: true,
          restored: result.restored,
          notes: displayOrder(await store.list()),
          settings: result.settings,
          semantic: semantic.status(),
          backup: await store.backupStatus(),
        })
      }
      if (!Array.isArray(result)) return Response.json({ ok: true, notes: displayOrder(await store.list()), settings: result, semantic: semantic.status(), backup: await store.backupStatus() })
      return Response.json({ ok: true, notes: displayOrder(result), settings: await store.settingsSnapshot(), semantic: semantic.status(), backup: await store.backupStatus() })
    } catch (error) {
      if (error instanceof MemoError) {
        return Response.json({ ok: false, error: error.message }, { status: error.status })
      }
      const message = error instanceof Error ? error.message : String(error)
      process.stderr.write(`[memo] store request failed: ${message}\n`)
      return Response.json({ ok: false, error: 'the memo store failed' }, { status: 500 })
    }
  }
}

/** Raw JSON Schema for one note in the tool result. */
const NOTE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string', required: true, description: 'Stable note id.' },
    text: { type: 'string', required: true, description: 'Note content.' },
    tags: { type: 'array', required: true, items: { type: 'string' }, description: 'Tag labels.' },
    pinned: { type: 'boolean', required: true, description: 'Whether the note is pinned.' },
    done: { type: 'boolean', required: true, description: 'Whether the note is completed.' },
    archived: { type: 'boolean', required: true, description: 'Whether the note is archived.' },
    deletedAt: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true, description: 'ISO-8601 time the note moved to the recycle bin, or null.' },
    sourceSessionId: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true, description: 'Id of the conversation session that wrote the note, or null.' },
    repeat: { oneOf: [{ type: 'string', enum: ['daily', 'weekly', 'weekdays', 'interval'] }, { type: 'null' }], required: true, description: 'Repeat rule of the reminder, or null.' },
    repeatMinutes: { oneOf: [{ type: 'integer' }, { type: 'null' }], required: true, description: 'Interval length in minutes when repeat is interval.' },
    repeatAnchor: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true, description: 'ISO-8601 time the repeat rule counts from, or null when the note has no repeating reminder.' },
    remindAt: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true, description: 'ISO-8601 reminder time, or null when the note has no reminder.' },
    remindAckedAt: { oneOf: [{ type: 'string' }, { type: 'null' }], required: true, description: 'ISO-8601 time the reminder was acknowledged, or null.' },
    createdAt: { type: 'string', required: true, description: 'ISO-8601 creation time.' },
    updatedAt: { type: 'string', required: true, description: 'ISO-8601 last update time.' },
  },
}

/** Raw JSON Schema for the `memo` tool result. */
const MEMO_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    ok: { type: 'boolean', required: true, description: 'Whether the operation succeeded.' },
    action: { type: 'string', required: true, description: 'The action that ran.' },
    message: { type: 'string', required: true, description: 'One-line human-readable outcome.' },
    total: { type: 'integer', required: true, description: 'Number of notes in the whole store.' },
    notes: { type: 'array', required: true, items: NOTE_SCHEMA, description: 'Matching notes, pinned first.' },
  },
}

/**
 * Render the tool result as one text block.
 * @param _args - model arguments (unused; the output already carries the outcome).
 * @param value - tool output.
 * @returns model-facing content parts.
 */
function renderMemoResult(_args, value) {
  const lines = [value.message]
  for (const note of value.notes) {
    const marks = [note.pinned ? '[pinned]' : '', note.done ? '[x]' : '[ ]'].filter(Boolean).join(' ')
    const tags = note.tags.length === 0 ? '' : ` #${note.tags.join(' #')}`
    const repeatHint = note.repeat == null ? '' : note.repeat === 'interval' ? `, repeats every ${String(note.repeatMinutes ?? 60)} min` : note.repeat === 'weekdays' ? ', repeats weekdays' : `, repeats ${note.repeat}`
    const reminder = note.remindAt == null ? '' : ` (reminder: ${note.remindAt}${repeatHint}${note.remindAckedAt == null ? '' : ', acknowledged'})`
    lines.push(`- ${marks} ${note.text}${tags}${reminder} (id: ${note.id}, updated: ${note.updatedAt})`)
  }
  if (value.notes.length > 0) lines.push(`${value.total} note(s) stored in total.`)
  return [{ type: 'text', text: lines.join('\n') }]
}

/**
 * Select the notes the tool reports back.
 * @param notes - all notes.
 * @param query - optional case-insensitive text or tag filter.
 * @param includeArchived - whether archived notes stay visible.
 * @returns ordered, bounded notes plus the total store size.
 */
function selectNotes(notes, query, includeArchived) {
  const needle = query?.trim().toLowerCase() ?? ''
  const visible = notes.filter((note) => {
    if (note.deletedAt != null) return false
    if (!includeArchived && note.archived) return false
    if (needle.length === 0) return true
    return note.text.toLowerCase().includes(needle) || note.tags.some((tag) => tag.toLowerCase().includes(needle))
  })
  return { notes: displayOrder(visible).slice(0, MAX_VIEW_NOTES), total: notes.length }
}

/**
 * Build the `memo` tool definition over the global store.
 * @param defineTool - the shipped tool-definition helper, imported lazily.
 * @param store - the global store.
 * @param semantic - the optional local embedding index.
 * @returns a registry-ready tool definition.
 */
function createMemoTool(defineTool, store, semantic) {
  return defineTool({
    name: 'memo',
    description: [
      "Read and write the user's global memo pad (备忘录), shared across every session and workspace.",
      'Actions:',
      '- list: read notes, optionally filtered by query or tags; pinned notes come first.',
      '- add: append one note with text and optional tags.',
      '- update: change text, tags, pinned, done, archived or the reminder on one note id.',
      '- delete: move one note to the recycle bin (it can be restored for 30 days).',
      '- restore: bring one note back from the recycle bin by id.',
      'Notes may carry a one-off reminder time (remind_at); the desktop app shows a reminder toast when it is due and the user can acknowledge it there.',
      'Semantic search: pass semantic=true together with a natural-language query to match notes by meaning instead of literal text (it uses the user\'s local embedding model and silently falls back to keyword matching when unavailable).',
      'Use it when the user asks you to jot something down, recall a previous note, or be reminded about something. Note ids come from list results.',
    ].join('\n'),
    parameters: {
      action: {
        type: 'string',
        required: true,
        enum: ['list', 'add', 'update', 'delete', 'restore'],
        description: 'Operation to perform.',
      },
      text: { type: 'string', description: 'Note content for add, or replacement content for update.' },
      tags: { type: 'array', items: { type: 'string' }, description: 'Tag labels for add, or replacement tags for update.' },
      query: { type: 'string', description: 'Case-insensitive text or tag filter for list.' },
      semantic: { type: 'boolean', description: 'With list and a query, also match notes by meaning using the local embedding model.' },
      include_archived: { type: 'boolean', description: 'Include archived notes in list results.' },
      id: { type: 'string', description: 'Note id for update, delete and restore.' },
      pinned: { type: 'boolean', description: 'Pin or unpin the note (update).' },
      done: { type: 'boolean', description: 'Mark the note completed or not (update).' },
      archived: { type: 'boolean', description: 'Archive or restore the note (update).' },
      remind_at: { type: 'string', description: 'ISO-8601 reminder time for add or update, e.g. 2026-11-02T09:00:00+08:00. Pass an empty string to clear the reminder.' },
      repeat: { type: 'string', enum: ['none', 'daily', 'weekly', 'weekdays', 'interval'], description: 'Optional repeat rule for the reminder; weekdays repeats Monday-Friday; interval also needs repeat_minutes (15-10080).' },
      repeat_minutes: { type: 'integer', description: 'Interval length in minutes when repeat is interval.' },
    },
    output: {
      schema: MEMO_OUTPUT_SCHEMA,
      render: renderMemoResult,
    },
    async execute(args, exec) {
      try {
        let notes
        let message
        if (args.action === 'list') {
          const all = await store.list()
          if (args.semantic === true && typeof args.query === 'string' && args.query.trim().length > 0) {
            try {
              const { matches } = await semantic.search(args.query.trim(), MAX_VIEW_NOTES)
              const byId = new Map(all.map((note) => [note.id, note]))
              const ordered = matches
                .map((match) => byId.get(match.id))
                .filter((note) => note !== undefined && note.deletedAt == null && (args.include_archived === true || !note.archived))
              if (ordered.length > 0) {
                return { ok: true, action: 'list', message: `Found ${ordered.length} memo note(s) matching by meaning.`, total: all.length, notes: ordered.slice(0, MAX_VIEW_NOTES) }
              }
            } catch {
              // Keyword matching below is the fallback when the index is off or unreachable.
            }
          }
          const view = selectNotes(all, args.query, args.include_archived === true)
          message = view.notes.length === 0 ? 'No matching memo notes.' : `Found ${view.notes.length} matching memo note(s).`
          return { ok: true, action: 'list', message, total: view.total, notes: view.notes }
        }
        if (args.action === 'add') {
          const sourceSessionId = exec?.agent === undefined ? null : (exec.agent.session?.id ?? null)
          notes = await store.apply({ op: 'create', text: args.text, tags: args.tags, remindAt: args.remind_at === undefined ? null : args.remind_at, sourceSessionId, repeat: args.repeat, repeatMinutes: args.repeat_minutes })
          message = 'Memo note saved.'
        } else if (args.action === 'update') {
          notes = await store.apply({ op: 'update', id: args.id, text: args.text, tags: args.tags, pinned: args.pinned, done: args.done, archived: args.archived, remindAt: args.remind_at, repeat: args.repeat, repeatMinutes: args.repeat_minutes })
          message = `Memo note ${args.id} updated.`
        } else if (args.action === 'delete') {
          notes = await store.apply({ op: 'delete', id: args.id })
          message = `Memo note ${args.id} moved to the recycle bin.`
        } else if (args.action === 'restore') {
          notes = await store.apply({ op: 'restore', id: args.id })
          message = `Memo note ${args.id} restored from the recycle bin.`
        } else {
          return { ok: false, action: String(args.action), message: 'Unknown memo action.', total: (await store.list()).length, notes: [] }
        }
        const view = selectNotes(notes, undefined, args.include_archived === true)
        return { ok: true, action: args.action, message, total: view.total, notes: view.notes }
      } catch (error) {
        const message = error instanceof MemoError ? error.message : 'The memo store failed.'
        const notes = await store.list().catch(() => [])
        return { ok: false, action: String(args.action), message, total: notes.length, notes: [] }
      }
    },
  })
}

/**
 * Render the memo snapshot the assistant sees as dynamic prompt context at the
 * start of (and during) a conversation. Synchronous by contract: it reads the
 * in-memory store and the clock only.
 * @param notes - notes currently held in memory.
 * @param now - current epoch milliseconds.
 * @returns the context text, or an empty string when nothing is worth injecting.
 */
function renderMemoDigest(notes, now) {
  const trimmed = (text) => (text.length > 90 ? `${text.slice(0, 87)}...` : text)
  const live = notes.filter((note) => note.deletedAt == null && !note.archived && !note.done)
  const pinned = live.filter((note) => note.pinned).slice(0, 5)
  const due = live.filter((note) => note.remindAt != null && note.remindAckedAt == null && Date.parse(note.remindAt) <= now).slice(0, 5)
  const upcoming = live
    .filter((note) => note.remindAt != null && Date.parse(note.remindAt) > now && Date.parse(note.remindAt) - now <= 24 * 3600 * 1000)
    .slice(0, 5)
  if (pinned.length === 0 && due.length === 0 && upcoming.length === 0) return ''
  const lines = ['Memo pad (the user\'s global notes; call the memo tool to read or update them). Do not recite this list unless it is relevant.']
  if (pinned.length > 0) {
    lines.push('Pinned notes:')
    for (const note of pinned) lines.push(`- [${note.id}] ${trimmed(note.text)}${note.tags.length === 0 ? '' : ` (#${note.tags.join(' #')})`}`)
  }
  if (due.length > 0) {
    lines.push('Due reminders (not acknowledged yet):')
    for (const note of due) lines.push(`- [${note.id}] ${trimmed(note.text)} — due ${note.remindAt}${note.repeat == null ? '' : note.repeat === 'interval' ? ` (every ${String(note.repeatMinutes ?? 60)} min)` : ` (${note.repeat})`}`)
  }
  if (upcoming.length > 0) {
    lines.push('Reminders in the next 24 hours:')
    for (const note of upcoming) lines.push(`- [${note.id}] ${trimmed(note.text)} — at ${note.remindAt}${note.repeat == null ? '' : note.repeat === 'interval' ? ` (every ${String(note.repeatMinutes ?? 60)} min)` : ` (${note.repeat})`}`)
  }
  return lines.join('\n')
}

/**
 * Mount the route and the tool. Both live behind independent service seams so a
 * profile without the browser carrier or without the tool registry still loads
 * the other half.
 * @param ctx - plugin Context.
 */
export function apply(ctx) {
  const store = new MemoStore(resolveStoreDir())
  const semantic = new SemanticIndex(store.dir, store)
  // Every committed note or settings change keeps the embedding index in step.
  store.onChange(() => {
    if (store.settings.semantic.enabled) semantic.kick()
  })
  ctx.inject(['connection'], (connectionCtx) => {
    connectionCtx.connection.fetch.register({
      kind: 'exact',
      path: ROUTE_PATH,
      methods: ['GET', 'POST'],
      requestBody: 'buffered',
      fetch: createRouteHandler(store, semantic),
    })
  })
  // Keep a warm in-memory copy so the prompt-context provider can answer
  // synchronously from the first assembly, then index any missing notes.
  void store
    .load()
    .then(() => {
      if (store.settings.semantic.enabled) semantic.kick()
    })
    .catch(() => undefined)

  ctx.inject(['systemPrompt'], (promptCtx) => {
    promptCtx.systemPrompt.context({
      name: 'memo-digest',
      order: 20000,
      // Subagents work with the parent's context and should not spend tokens on it.
      text: (assembly) => {
        const header = assembly?.agent?.session?.header
        // Bare assemblies (no agent) and subagent conversations stay clean.
        if (header === undefined) return ''
        if (header.origin === 'subagent' || (typeof header.delegationDepth === 'number' && header.delegationDepth > 0)) return ''
        return renderMemoDigest(store.snapshotSync(), Date.now())
      },
    })
  })

  ctx.inject(['tools'], (toolsCtx) => {
    // The tool helper ships with DSH and is routed to the installation copy by
    // the profile resolver. It is imported lazily so a resolution problem can
    // never take the sidebar page down with it.
    void import('@deepseek-ai/dsh-tools')
      .then((module) => {
        toolsCtx.tools.register(createMemoTool(module.defineTool, store, semantic))
      })
      .catch((error) => {
        process.stderr.write(`[memo] tool registration skipped: ${error instanceof Error ? error.message : String(error)}\n`)
      })
  })
}
