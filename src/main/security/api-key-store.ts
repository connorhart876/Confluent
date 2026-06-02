import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'fs'

export interface SafeStorageLike {
  isEncryptionAvailable(): boolean
  encryptString(plainText: string): Buffer
  decryptString(encrypted: Buffer): string
}

export interface ApiKeyStore {
  isEncryptionAvailable(): boolean
  saveApiKey(raw: string): { ok: true } | { ok: false; error: string }
  loadApiKey(): string | null
  clearApiKey(): void
  apiKeyExists(): boolean
}

export function createApiKeyStore(deps: {
  safeStorage: SafeStorageLike
  filePath: string
}): ApiKeyStore {
  const { safeStorage, filePath } = deps
  const tmpPath = `${filePath}.tmp`

  return {
    isEncryptionAvailable() {
      return safeStorage.isEncryptionAvailable()
    },

    saveApiKey(raw) {
      const trimmed = raw.trim()
      if (!trimmed) return { ok: false, error: 'API key cannot be empty' }
      if (!safeStorage.isEncryptionAvailable()) {
        return { ok: false, error: 'Encryption is not available on this system' }
      }
      try {
        const encrypted = safeStorage.encryptString(trimmed)
        writeFileSync(tmpPath, encrypted)
        renameSync(tmpPath, filePath)
        return { ok: true }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : 'Failed to save API key' }
      }
    },

    loadApiKey() {
      try {
        if (!existsSync(filePath)) return null
        const encrypted = readFileSync(filePath)
        return safeStorage.decryptString(encrypted)
      } catch {
        return null
      }
    },

    clearApiKey() {
      try {
        unlinkSync(filePath)
      } catch {
        // ENOENT is expected when no key has been saved yet
      }
    },

    apiKeyExists() {
      return existsSync(filePath)
    }
  }
}

export let apiKeyStore: ApiKeyStore

export function initApiKeyStore(filePath: string): void {
  // require inside the function so the electron module is not loaded at import
  // time — tests import this file but never call initApiKeyStore.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { safeStorage } = require('electron') as { safeStorage: SafeStorageLike }
  apiKeyStore = createApiKeyStore({ safeStorage, filePath })
}
