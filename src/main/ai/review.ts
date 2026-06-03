import Anthropic from '@anthropic-ai/sdk'
import type { Trade, StrategyRules, KnowledgeBaseEntry } from '../db/schema'

const REVIEW_MODEL = 'claude-sonnet-4-6'
const REVIEW_MAX_TOKENS = 2048

const SYSTEM_PROMPT = `You are a trading discipline coach reviewing a completed futures trade. Your role is to evaluate the execution against the trader's own documented strategy rules and knowledge base.

Produce a focused, in-depth written analysis covering three areas:
1. What was executed well — specific decisions that aligned with the documented rules
2. Rule violations or weaknesses — exactly which guideline was broken or bent, and how
3. Why each violation matters technically — the market logic or structural reason the rule exists, not merely that it was broken

Constraints you must follow without exception:
- Write in plain prose only. Do not include scores, grades, ratings, letter grades, numerical quality ratings, probability estimates, or any quantitative measure of trade quality. These are permanently prohibited.
- Be concise but thorough — dense, specific analysis is the goal, not padding or hedging.
- If strategy rules are listed as not defined for a given field, base the review on the knowledge base entries and what the trade data itself reveals.
- Ground every observation in the trader's documented context. Do not add generic trading advice not rooted in their specific system.`

export interface TradeContext {
  trade: Trade
  setupName: string
  rules: StrategyRules
  globalKbEntries: KnowledgeBaseEntry[]
  setupKbEntries: KnowledgeBaseEntry[]
}

export type ReviewResult = { ok: true; review: string } | { ok: false; error: string }

// Minimal interface for testability — structurally compatible with client.messages
export interface IMessagesService {
  create(
    params: Anthropic.Messages.MessageCreateParamsNonStreaming
  ): Promise<Anthropic.Message>
}

function formatKbEntry(entry: KnowledgeBaseEntry): string {
  const categoryLine = entry.category ? ` [${entry.category}]` : ''
  return `### ${entry.title}${categoryLine}\n${entry.content}`
}

function buildContextBlock(context: TradeContext): string {
  const { setupName, rules, globalKbEntries, setupKbEntries } = context
  const parts: string[] = ['=== STRATEGY KNOWLEDGE BASE ===']

  if (globalKbEntries.length > 0) {
    parts.push('\n--- General Knowledge (applies to all setups) ---')
    parts.push(globalKbEntries.map(formatKbEntry).join('\n\n'))
  }

  parts.push(`\n--- Setup Type: ${setupName} ---`)

  const rulesEmpty =
    !rules.entryCriteria &&
    !rules.htfConfirmation &&
    !rules.validVsPremature &&
    !rules.sessionFilter &&
    !rules.freeformNotes

  if (rulesEmpty) {
    parts.push('Strategy Rules: (not yet defined for this setup — base the review on knowledge base entries and trade data)')
  } else {
    parts.push('Strategy Rules:')
    parts.push(`  Entry Criteria: ${rules.entryCriteria || '(not defined)'}`)
    parts.push(`  HTF Confirmation: ${rules.htfConfirmation || '(not defined)'}`)
    parts.push(`  Valid vs Premature Entry: ${rules.validVsPremature || '(not defined)'}`)
    parts.push(`  Session Filter: ${rules.sessionFilter || '(not defined)'}`)
    if (rules.freeformNotes) {
      parts.push(`  Additional Notes: ${rules.freeformNotes}`)
    }
  }

  if (setupKbEntries.length > 0) {
    parts.push('\nSetup-Specific Knowledge Base:')
    parts.push(setupKbEntries.map(formatKbEntry).join('\n\n'))
  }

  return parts.join('\n')
}

function buildTradeMessage(context: TradeContext): string {
  const { trade, setupName } = context
  const pnlSign = trade.pnl >= 0 ? '+' : ''
  return [
    'Please review this trade:',
    '',
    `Instrument: ${trade.instrument} | Direction: ${trade.direction} | Quantity: ${trade.quantity}`,
    `Session: ${trade.session} | Setup Type: ${setupName}`,
    `Entry: ${trade.entryPrice} at ${trade.entryTime}`,
    `Exit: ${trade.exitPrice} at ${trade.exitTime}`,
    `P&L: ${pnlSign}$${trade.pnl.toFixed(2)} | Outcome: ${trade.outcome}`,
    '',
    `Trader's Notes:`,
    trade.notes ? `"${trade.notes}"` : '(no notes recorded)'
  ].join('\n')
}

function mapSdkError(e: unknown): string {
  if (e instanceof Anthropic.AuthenticationError) {
    return 'API key was rejected by Anthropic. Check your key in Settings.'
  }
  if (e instanceof Anthropic.RateLimitError) {
    return 'Anthropic rate limit reached. Wait a moment and try again.'
  }
  if (e instanceof Anthropic.APIError && e.status === 413) {
    return 'Context too large for Claude. Try removing some knowledge base entries or shortening their content.'
  }
  if (e instanceof Anthropic.InternalServerError) {
    return 'Anthropic server error. Try again in a moment.'
  }
  if (e instanceof Anthropic.APIError) {
    return `Anthropic API error (${e.status}): ${e.message}`
  }
  if (e instanceof Error) {
    return `Unexpected error: ${e.message}`
  }
  return 'Unexpected error during review'
}

export function createReviewer(messages: IMessagesService) {
  return {
    async reviewTrade(context: TradeContext): Promise<ReviewResult> {
      try {
        const response = await messages.create({
          model: REVIEW_MODEL,
          max_tokens: REVIEW_MAX_TOKENS,
          system: [
            { type: 'text', text: SYSTEM_PROMPT },
            {
              type: 'text',
              text: buildContextBlock(context),
              cache_control: { type: 'ephemeral' }
            }
          ],
          messages: [
            {
              role: 'user',
              content: buildTradeMessage(context)
            }
          ]
        })

        const textBlock = response.content.find(
          (b): b is Anthropic.Messages.TextBlock => b.type === 'text'
        )
        if (!textBlock) {
          return { ok: false, error: 'Claude returned no text in the response' }
        }
        return { ok: true, review: textBlock.text }
      } catch (e) {
        return { ok: false, error: mapSdkError(e) }
      }
    }
  }
}
