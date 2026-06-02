import { describe, it, expect, vi } from 'vitest'
import { handleApiKeySave, handleApiKeyClear, handleApiKeyExists } from '../api-key-handlers'
import type { ApiKeyStore } from '../../security/api-key-store'

function makeStore(overrides: Partial<ApiKeyStore> = {}): ApiKeyStore {
  return {
    isEncryptionAvailable: vi.fn(() => true),
    saveApiKey: vi.fn(() => ({ ok: true as const })),
    loadApiKey: vi.fn(() => null),
    clearApiKey: vi.fn(),
    apiKeyExists: vi.fn(() => false),
    ...overrides
  }
}

describe('handleApiKeySave', () => {
  it('returns ok when store.saveApiKey succeeds', () => {
    const store = makeStore({ saveApiKey: vi.fn(() => ({ ok: true as const })) })
    const result = handleApiKeySave(store, { key: 'sk-ant-test' })
    expect(result).toEqual({ success: true, data: undefined })
    expect(store.saveApiKey).toHaveBeenCalledWith('sk-ant-test')
  })

  it('returns error when store.saveApiKey fails', () => {
    const store = makeStore({
      saveApiKey: vi.fn(() => ({ ok: false as const, error: 'API key cannot be empty' }))
    })
    const result = handleApiKeySave(store, { key: '' })
    expect(result).toEqual({ success: false, error: 'API key cannot be empty' })
  })

  it('propagates encryption-unavailable error', () => {
    const store = makeStore({
      saveApiKey: vi.fn(() => ({
        ok: false as const,
        error: 'Encryption is not available on this system'
      }))
    })
    const result = handleApiKeySave(store, { key: 'sk-ant-test' })
    expect(result).toEqual({ success: false, error: 'Encryption is not available on this system' })
  })
})

describe('handleApiKeyClear', () => {
  it('returns ok when clearApiKey succeeds', () => {
    const store = makeStore({ clearApiKey: vi.fn() })
    expect(handleApiKeyClear(store)).toEqual({ success: true, data: undefined })
    expect(store.clearApiKey).toHaveBeenCalled()
  })

  it('returns error when clearApiKey throws', () => {
    const store = makeStore({
      clearApiKey: vi.fn(() => { throw new Error('permission denied') })
    })
    expect(handleApiKeyClear(store)).toEqual({ success: false, error: 'permission denied' })
  })
})

describe('handleApiKeyExists', () => {
  it('returns exists: false and encryptionAvailable: true by default', () => {
    const store = makeStore({
      apiKeyExists: vi.fn(() => false),
      isEncryptionAvailable: vi.fn(() => true)
    })
    expect(handleApiKeyExists(store)).toEqual({
      success: true,
      data: { exists: false, encryptionAvailable: true }
    })
  })

  it('returns exists: true when key file is present', () => {
    const store = makeStore({
      apiKeyExists: vi.fn(() => true),
      isEncryptionAvailable: vi.fn(() => true)
    })
    const result = handleApiKeyExists(store)
    expect(result).toEqual({ success: true, data: { exists: true, encryptionAvailable: true } })
  })

  it('returns encryptionAvailable: false when system does not support it', () => {
    const store = makeStore({
      apiKeyExists: vi.fn(() => false),
      isEncryptionAvailable: vi.fn(() => false)
    })
    const result = handleApiKeyExists(store)
    expect(result).toEqual({ success: true, data: { exists: false, encryptionAvailable: false } })
  })

  it('returns error when apiKeyExists throws', () => {
    const store = makeStore({
      apiKeyExists: vi.fn(() => { throw new Error('fs error') })
    })
    expect(handleApiKeyExists(store)).toEqual({ success: false, error: 'fs error' })
  })
})
