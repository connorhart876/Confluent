import { readFileSync } from 'fs'
import type { BrowserWindow } from 'electron'
import { dialog } from 'electron'
import { parseTradovateCsv } from '../import/tradovate-parser'
import { handleImportEnqueue } from './import-handlers'
import type { Db } from '../db'
import type { IpcResult, ImportFromCsvResult } from '../../shared/ipc-types'

function ok<T>(data: T): IpcResult<T> {
  return { success: true, data }
}

function err(message: string): IpcResult<never> {
  return { success: false, error: message }
}

export async function handleImportFromCsv(
  db: Db,
  win: BrowserWindow | null
): Promise<IpcResult<ImportFromCsvResult>> {
  const { canceled, filePaths } = await dialog.showOpenDialog(win ?? undefined!, {
    title: 'Import Tradovate CSV',
    properties: ['openFile'],
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  })

  if (canceled || filePaths.length === 0) {
    return ok({ cancelled: true, filePath: null, enqueuedCount: 0, parseErrors: [], summary: null })
  }

  const filePath = filePaths[0]
  let csvContent: string
  try {
    csvContent = readFileSync(filePath, 'utf-8')
  } catch (e) {
    return err(`Failed to read file: ${e instanceof Error ? e.message : String(e)}`)
  }

  return processCsvContent(db, csvContent, filePath)
}

export function processCsvContent(
  db: Db,
  csvContent: string,
  filePath: string
): IpcResult<ImportFromCsvResult> {
  let parseResult
  try {
    parseResult = parseTradovateCsv(csvContent)
  } catch (e) {
    return err(`Invalid CSV: ${e instanceof Error ? e.message : String(e)}`)
  }

  const parseErrors = parseResult.errors.map((e) => ({ row: e.row, reason: e.reason }))

  if (parseResult.trades.length === 0) {
    return ok({
      cancelled: false,
      filePath,
      enqueuedCount: 0,
      parseErrors,
      summary: parseResult.summary
    })
  }

  const enqueueResult = handleImportEnqueue(db, parseResult.trades)
  if (!enqueueResult.success) {
    return enqueueResult
  }

  return ok({
    cancelled: false,
    filePath,
    enqueuedCount: enqueueResult.data.length,
    parseErrors,
    summary: parseResult.summary
  })
}
