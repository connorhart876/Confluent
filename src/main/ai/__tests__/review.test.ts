import { describe, it, expect, vi } from 'vitest'
import Anthropic from '@anthropic-ai/sdk'
import { createReviewer, type IMessagesService, type TradeContext } from '../review'
import type { Trade, StrategyRules, KnowledgeBaseEntry } from '../../db/schema'

// ── helpers ────────────────────────────────────────────────────────────────

function makeMockMessages(overrides: Partial<IMessagesService> = {}): IMessagesService {
  return {
    // The reviewer only reads response.content, so we only need that field.
    create: vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Trade analysis here.' }]
    } as unknown as Anthropic.Message),
    ...overrides
  }
}

function makeTrade(overrides: Partial<Trade> = {}): Trade {
  return {
    id: 1,
    instrument: 'ES',
    direction: 'Long',
    entryPrice: 5400.0,
    exitPrice: 5410.0,
    entryTime: '2026-06-03T14:30:00Z',
    exitTime: '2026-06-03T14:45:00Z',
    session: 'NY AM',
    quantity: 1,
    setupTypeId: 1,
    outcome: 'Win',
    pnl: 500.0,
    notes: 'Waited for the FVG fill, entry was clean.',
    screenshotPath: null,
    createdAt: '2026-06-03T14:30:00Z',
    updatedAt: '2026-06-03T14:30:00Z',
    ...overrides
  }
}

function makeRules(overrides: Partial<StrategyRules> = {}): StrategyRules {
  return {
    id: 1,
    setupTypeId: 1,
    entryCriteria: 'Price sweeps into the FVG and prints an IFVG',
    htfConfirmation: 'Daily bias is clearly bullish',
    validVsPremature: 'Wait for the IFVG to fill before entering',
    sessionFilter: 'NY AM only — no Asian entries on this setup',
    freeformNotes: 'Be patient; missing the entry is better than entering early',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides
  }
}

function makeKbEntry(overrides: Partial<KnowledgeBaseEntry> = {}): KnowledgeBaseEntry {
  return {
    id: 1,
    title: 'General Discipline Rule',
    content: 'Never chase a move once the entry window has closed.',
    category: 'Hard No-Trade Rules',
    setupTypeId: null,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides
  }
}

function makeContext(overrides: Partial<TradeContext> = {}): TradeContext {
  return {
    trade: makeTrade(),
    setupName: 'FVG Sweep',
    rules: makeRules(),
    globalKbEntries: [],
    setupKbEntries: [],
    ...overrides
  }
}

// ── happy path ─────────────────────────────────────────────────────────────

describe('createReviewer — happy path', () => {
  it('returns ok:true with review text on success', async () => {
    const reviewer = createReviewer(makeMockMessages())
    const result = await reviewer.reviewTrade(makeContext())
    expect(result).toEqual({ ok: true, review: 'Trade analysis here.' })
  })

  it('calls messages.create with the correct model ID', async () => {
    const messages = makeMockMessages()
    const reviewer = createReviewer(messages)
    await reviewer.reviewTrade(makeContext())
    const call = vi.mocked(messages.create).mock.calls[0][0]
    expect(call.model).toBe('claude-sonnet-4-6')
  })

  it('system prompt explicitly prohibits scores, grades, ratings, and probabilities', async () => {
    const messages = makeMockMessages()
    const reviewer = createReviewer(messages)
    await reviewer.reviewTrade(makeContext())
    const call = vi.mocked(messages.create).mock.calls[0][0]
    const systemBlocks = call.system as Array<{ text: string }>
    const allSystemText = systemBlocks.map(b => b.text).join('\n').toLowerCase()
    expect(allSystemText).toContain('score')
    expect(allSystemText).toContain('grade')
    expect(allSystemText).toContain('rating')
    expect(allSystemText).toContain('probability')
  })

  it('cache_control is on the last system block (context), not the first (instructions)', async () => {
    const messages = makeMockMessages()
    const reviewer = createReviewer(messages)
    await reviewer.reviewTrade(makeContext())
    const call = vi.mocked(messages.create).mock.calls[0][0]
    const systemBlocks = call.system as Array<{ type: string; cache_control?: { type: string } }>
    expect(systemBlocks.length).toBeGreaterThanOrEqual(2)
    expect(systemBlocks[0].cache_control).toBeUndefined()
    expect(systemBlocks[systemBlocks.length - 1].cache_control).toEqual({ type: 'ephemeral' })
  })

  it('per-trade message has no cache_control', async () => {
    const messages = makeMockMessages()
    const reviewer = createReviewer(messages)
    await reviewer.reviewTrade(makeContext())
    const call = vi.mocked(messages.create).mock.calls[0][0]
    const userMessage = call.messages[0]
    expect(userMessage.role).toBe('user')
    // content is a string — no cache_control possible
    expect(typeof userMessage.content).toBe('string')
  })

  it('includes trade fields in the user message', async () => {
    const messages = makeMockMessages()
    const reviewer = createReviewer(messages)
    await reviewer.reviewTrade(makeContext())
    const call = vi.mocked(messages.create).mock.calls[0][0]
    const tradeText = call.messages[0].content as string
    expect(tradeText).toContain('ES')
    expect(tradeText).toContain('Long')
    expect(tradeText).toContain('NY AM')
    expect(tradeText).toContain('FVG Sweep')
    expect(tradeText).toContain('5400')
    expect(tradeText).toContain('5410')
  })

  it('includes global KB entries in the context block', async () => {
    const globalEntry = makeKbEntry({ title: 'Global Rule Alpha', content: 'Always check HTF first.' })
    const messages = makeMockMessages()
    const reviewer = createReviewer(messages)
    await reviewer.reviewTrade(makeContext({ globalKbEntries: [globalEntry] }))
    const call = vi.mocked(messages.create).mock.calls[0][0]
    const systemBlocks = call.system as Array<{ text: string }>
    const contextBlock = systemBlocks[systemBlocks.length - 1].text
    expect(contextBlock).toContain('Global Rule Alpha')
    expect(contextBlock).toContain('Always check HTF first.')
  })

  it('includes setup-scoped KB entries in the context block', async () => {
    const setupEntry = makeKbEntry({
      id: 2,
      title: 'Setup-Specific Tip',
      content: 'Only enter after the wick forms.',
      setupTypeId: 1
    })
    const messages = makeMockMessages()
    const reviewer = createReviewer(messages)
    await reviewer.reviewTrade(makeContext({ setupKbEntries: [setupEntry] }))
    const call = vi.mocked(messages.create).mock.calls[0][0]
    const systemBlocks = call.system as Array<{ text: string }>
    const contextBlock = systemBlocks[systemBlocks.length - 1].text
    expect(contextBlock).toContain('Setup-Specific Tip')
    expect(contextBlock).toContain('Only enter after the wick forms.')
  })

  it('includes strategy rules in the context block', async () => {
    const messages = makeMockMessages()
    const reviewer = createReviewer(messages)
    await reviewer.reviewTrade(makeContext())
    const call = vi.mocked(messages.create).mock.calls[0][0]
    const systemBlocks = call.system as Array<{ text: string }>
    const contextBlock = systemBlocks[systemBlocks.length - 1].text
    expect(contextBlock).toContain('Price sweeps into the FVG')
    expect(contextBlock).toContain('Daily bias is clearly bullish')
  })

  it('notes empty rules in the context block and still proceeds', async () => {
    const emptyRules = makeRules({
      entryCriteria: '',
      htfConfirmation: '',
      validVsPremature: '',
      sessionFilter: '',
      freeformNotes: ''
    })
    const messages = makeMockMessages()
    const reviewer = createReviewer(messages)
    const result = await reviewer.reviewTrade(makeContext({ rules: emptyRules }))
    expect(result.ok).toBe(true)
    const call = vi.mocked(messages.create).mock.calls[0][0]
    const systemBlocks = call.system as Array<{ text: string }>
    const contextBlock = systemBlocks[systemBlocks.length - 1].text
    expect(contextBlock).toContain('not yet defined')
  })

  it('returns ok:false with a message when response has no text block', async () => {
    const messages = makeMockMessages({
      create: vi.fn().mockResolvedValue({ content: [] } as unknown as Anthropic.Message)
    })
    const reviewer = createReviewer(messages)
    const result = await reviewer.reviewTrade(makeContext())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBeTruthy()
  })
})

// ── error mapping ──────────────────────────────────────────────────────────

describe('createReviewer — error mapping', () => {
  it('maps AuthenticationError (401) to a friendly API key message', async () => {
    const messages = makeMockMessages({
      create: vi.fn().mockRejectedValue(
        new Anthropic.AuthenticationError(401, {}, 'Invalid API key', new Headers())
      )
    })
    const reviewer = createReviewer(messages)
    const result = await reviewer.reviewTrade(makeContext())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/api key/i)
  })

  it('maps RateLimitError (429) to a rate limit message', async () => {
    const messages = makeMockMessages({
      create: vi.fn().mockRejectedValue(
        new Anthropic.RateLimitError(429, {}, 'Rate limited', new Headers())
      )
    })
    const reviewer = createReviewer(messages)
    const result = await reviewer.reviewTrade(makeContext())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/rate limit/i)
  })

  it('maps APIError with status 413 to a context-too-large message', async () => {
    const messages = makeMockMessages({
      create: vi.fn().mockRejectedValue(
        new Anthropic.APIError(413, {}, 'Request too large', new Headers())
      )
    })
    const reviewer = createReviewer(messages)
    const result = await reviewer.reviewTrade(makeContext())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/context too large/i)
  })

  it('maps InternalServerError (500) to a server error message', async () => {
    const messages = makeMockMessages({
      create: vi.fn().mockRejectedValue(
        new Anthropic.InternalServerError(500, {}, 'Server error', new Headers())
      )
    })
    const reviewer = createReviewer(messages)
    const result = await reviewer.reviewTrade(makeContext())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/server error/i)
  })

  it('maps generic APIError to a message including the status code', async () => {
    const messages = makeMockMessages({
      create: vi.fn().mockRejectedValue(
        new Anthropic.PermissionDeniedError(403, {}, 'Forbidden', new Headers())
      )
    })
    const reviewer = createReviewer(messages)
    const result = await reviewer.reviewTrade(makeContext())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('403')
  })

  it('maps network Error to an unexpected error message', async () => {
    const messages = makeMockMessages({
      create: vi.fn().mockRejectedValue(new Error('fetch failed'))
    })
    const reviewer = createReviewer(messages)
    const result = await reviewer.reviewTrade(makeContext())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toContain('fetch failed')
  })
})
