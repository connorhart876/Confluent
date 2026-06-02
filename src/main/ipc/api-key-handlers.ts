import type { ApiKeyStore } from '../security/api-key-store'
import type { IpcResult, ApiKeySavePayload, ApiKeyExistsResponse } from '../../shared/ipc-types'

function ok<T>(data: T): IpcResult<T> {
  return { success: true, data }
}

function err(message: string): IpcResult<never> {
  return { success: false, error: message }
}

export function handleApiKeySave(store: ApiKeyStore, payload: ApiKeySavePayload): IpcResult<void> {
  const result = store.saveApiKey(payload.key)
  if (!result.ok) return err(result.error)
  return ok(undefined)
}

export function handleApiKeyClear(store: ApiKeyStore): IpcResult<void> {
  try {
    store.clearApiKey()
    return ok(undefined)
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Unknown error')
  }
}

export function handleApiKeyExists(store: ApiKeyStore): IpcResult<ApiKeyExistsResponse> {
  try {
    return ok({
      exists: store.apiKeyExists(),
      encryptionAvailable: store.isEncryptionAvailable()
    })
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Unknown error')
  }
}
