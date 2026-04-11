export type Sentiment = 'bullish' | 'bearish' | 'neutral'

export type ImpactTag =
  | 'Fed Policy'
  | 'Inflation'
  | 'Earnings'
  | 'Geopolitical'
  | 'Rates'
  | 'GDP/Growth'

const BULLISH_WORDS = [
  'surge', 'rally', 'gain', 'rise', 'beat', 'record',
  'growth', 'strong', 'profit', 'boost', 'soar', 'jump',
  'upgrade', 'outperform', 'bull', 'recovery', 'expand',
]

const BEARISH_WORDS = [
  'fall', 'drop', 'decline', 'crash', 'loss', 'miss',
  'recession', 'inflation', 'slump', 'cut', 'weak',
  'downgrade', 'underperform', 'bear', 'contraction', 'shrink',
  'layoff', 'default', 'bankruptcy',
]

const IMPACT_PATTERNS: { pattern: RegExp; tag: ImpactTag }[] = [
  { pattern: /fed|federal reserve|fomc|rate hike|rate cut/i,  tag: 'Fed Policy'   },
  { pattern: /inflation|cpi|pce|consumer price/i,             tag: 'Inflation'    },
  { pattern: /earnings|revenue|profit|eps|guidance/i,         tag: 'Earnings'     },
  { pattern: /geopolit|war|sanction|tariff|conflict/i,        tag: 'Geopolitical' },
  { pattern: /treasury|bond|yield|10.year/i,                  tag: 'Rates'        },
  { pattern: /gdp|recession|growth|economic output/i,         tag: 'GDP/Growth'   },
]

export function tagSentiment(text: string): Sentiment {
  const lower = text.toLowerCase()
  const bullScore = BULLISH_WORDS.filter(w => lower.includes(w)).length
  const bearScore = BEARISH_WORDS.filter(w => lower.includes(w)).length
  if (bullScore > bearScore) return 'bullish'
  if (bearScore > bullScore) return 'bearish'
  return 'neutral'
}

export function tagImpacts(text: string): ImpactTag[] {
  return IMPACT_PATTERNS
    .filter(({ pattern }) => pattern.test(text))
    .map(({ tag }) => tag)
}
