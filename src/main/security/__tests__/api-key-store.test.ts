import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  renameSync: vi.fn(),
  unlinkSync: vi.fn()
}))

import { existsSync, readFileSync, writeFileSync, renameSync, unlinkSync } from 'fs'
import { createApiKeyStore } from '../api-key-store'
import type { SafeStorageLike } from '../api-key-store'

const FILE_PATH = '/app/api-key.enc'
const TMP_PATH = `${FILE_PATH}.tmp`

function makeSafeStorage(available = true): SafeStorageLike {
  return {
    isEncryptionAvailable: vi.fn(() => available),
    encryptString: vi.fn((s) => Buffer.from(`enc:${s}`)),
    decryptString: vi.fn((b) => b.toString().replace(/^enc:/, ''))
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createApiKeyStore', () => {
  describe('isEncryptionAvailable', () => {
    it('delegates to safeStorage', () => {
      const store = createApiKeyStore({ safeStorage: makeSafeStorage(true), filePath: FILE_PATH })
      expect(store.isEncryptionAvailable()).toBe(true)
    })

    it('returns false when unavailable', () => {
      const store = createApiKeyStore({ safeStorage: makeSafeStorage(false), filePath: FILE_PATH })
      expect(store.isEncryptionAvailable()).toBe(false)
    })
  })

  describe('saveApiKey', () => {
    it('returns error on empty string', () => {
      const store = createApiKeyStore({ safeStorage: makeSafeStorage(), filePath: FILE_PATH })
      expect(store.saveApiKey('')).toEqual({ ok: false, error: 'API key cannot be empty' })
    })

    it('returns error on whitespace-only string', () => {
      const store = createApiKeyStore({ safeStorage: makeSafeStorage(), filePath: FILE_PATH })
      expect(store.saveApiKey('   \t\n  ')).toEqual({ ok: false, error: 'API key cannot be empty' })
    })

    it('returns error when encryption unavailable', () => {
      const store = createApiKeyStore({ safeStorage: makeSafeStorage(false), filePath: FILE_PATH })
      expect(store.saveApiKey('sk-ant-test')).toEqual({
        ok: false,
        error: 'Encryption is not available on this system'
      })
    })

    it('trims whitespace before encrypting', () => {
      const ss = makeSafeStorage()
      const store = createApiKeyStore({ safeStorage: ss, filePath: FILE_PATH })
      store.saveApiKey('  sk-ant-test  \n')
      expect(ss.encryptString).toHaveBeenCalledWith('sk-ant-test')
    })

    it('writes to tmp then renames to final path', () => {
      const store = createApiKeyStore({ safeStorage: makeSafeStorage(), filePath: FILE_PATH })
      const result = store.saveApiKey('sk-ant-test')
      expect(result).toEqual({ ok: true })
      expect(writeFileSync).toHaveBeenCalledWith(TMP_PATH, expect.any(Buffer))
      expect(renameSync).toHaveBeenCalledWith(TMP_PATH, FILE_PATH)
    })

    it('returns error when writeFileSync throws', () => {
      vi.mocked(writeFileSync).mockImplementation(() => { throw new Error('disk full') })
      const store = createApiKeyStore({ safeStorage: makeSafeStorage(), filePath: FILE_PATH })
      expect(store.saveApiKey('sk-ant-test')).toEqual({ ok: false, error: 'disk full' })
    })
  })

  describe('loadApiKey', () => {
    it('returns null when file does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false)
      const store = createApiKeyStore({ safeStorage: makeSafeStorage(), filePath: FILE_PATH })
      expect(store.loadApiKey()).toBeNull()
    })

    it('returns decrypted key when file exists', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(Buffer.from('enc:sk-ant-test'))
      const store = createApiKeyStore({ safeStorage: makeSafeStorage(), filePath: FILE_PATH })
      expect(store.loadApiKey()).toBe('sk-ant-test')
    })

    it('returns null when decryptString throws', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(Buffer.from('corrupted'))
      const ss = makeSafeStorage()
      vi.mocked(ss.decryptString).mockImplementation(() => { throw new Error('decrypt failed') })
      const store = createApiKeyStore({ safeStorage: ss, filePath: FILE_PATH })
      expect(store.loadApiKey()).toBeNull()
    })
  })

  describe('clearApiKey', () => {
    it('deletes the file when it exists', () => {
      const store = createApiKeyStore({ safeStorage: makeSafeStorage(), filePath: FILE_PATH })
      store.clearApiKey()
      expect(unlinkSync).toHaveBeenCalledWith(FILE_PATH)
    })

    it('does not throw when file does not exist (ENOENT)', () => {
      vi.mocked(unlinkSync).mockImplementation(() => {
        const err = new Error('ENOENT') as NodeJS.ErrnoException
        err.code = 'ENOENT'
        throw err
      })
      const store = createApiKeyStore({ safeStorage: makeSafeStorage(), filePath: FILE_PATH })
      expect(() => store.clearApiKey()).not.toThrow()
    })
  })

  describe('apiKeyExists', () => {
    it('returns true when file exists', () => {
      vi.mocked(existsSync).mockReturnValue(true)
      const store = createApiKeyStore({ safeStorage: makeSafeStorage(), filePath: FILE_PATH })
      expect(store.apiKeyExists()).toBe(true)
    })

    it('returns false when file does not exist', () => {
      vi.mocked(existsSync).mockReturnValue(false)
      const store = createApiKeyStore({ safeStorage: makeSafeStorage(), filePath: FILE_PATH })
      expect(store.apiKeyExists()).toBe(false)
    })
  })
})
