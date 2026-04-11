import { describe, it, expect } from 'vitest'
import { tagSentiment, tagImpacts } from '@/lib/sentiment'

describe('tagSentiment', () => {
  it('returns bullish for positive headlines', () => {
    expect(tagSentiment('Markets surge after strong jobs report')).toBe('bullish')
    expect(tagSentiment('S&P 500 rallies to record high')).toBe('bullish')
    expect(tagSentiment('Apple beats earnings expectations with strong profit growth')).toBe('bullish')
  })

  it('returns bearish for negative headlines', () => {
    expect(tagSentiment('Stocks fall as recession fears mount')).toBe('bearish')
    expect(tagSentiment('Markets crash on inflation concerns')).toBe('bearish')
    expect(tagSentiment('Tech layoffs continue as revenue misses guidance')).toBe('bearish')
  })

  it('returns neutral when no clear signal', () => {
    expect(tagSentiment('Fed holds rates steady at FOMC meeting')).toBe('neutral')
    expect(tagSentiment('Company announces quarterly earnings report')).toBe('neutral')
  })

  it('is case-insensitive', () => {
    expect(tagSentiment('MARKETS SURGE ON STRONG DATA')).toBe('bullish')
    expect(tagSentiment('stocks DECLINE amid uncertainty')).toBe('bearish')
  })

  it('returns bearish when bear score exceeds bull score', () => {
    expect(tagSentiment('Rally followed by crash and loss and decline and slump')).toBe('bearish')
  })
})

describe('tagImpacts', () => {
  it('tags Fed Policy for FOMC headlines', () => {
    expect(tagImpacts('Fed raises rates at FOMC meeting')).toContain('Fed Policy')
    expect(tagImpacts('Federal Reserve signals rate cut')).toContain('Fed Policy')
  })

  it('tags Inflation for CPI headlines', () => {
    expect(tagImpacts('CPI rises 3.2% in March')).toContain('Inflation')
    expect(tagImpacts('Consumer price index falls below expectations')).toContain('Inflation')
  })

  it('tags Earnings for revenue/profit headlines', () => {
    expect(tagImpacts('Apple reports record revenue and profit')).toContain('Earnings')
    expect(tagImpacts('EPS beats guidance by wide margin')).toContain('Earnings')
  })

  it('tags Geopolitical for conflict/tariff headlines', () => {
    expect(tagImpacts('New tariffs imposed on imported goods')).toContain('Geopolitical')
    expect(tagImpacts('Geopolitical tensions rise in eastern Europe')).toContain('Geopolitical')
  })

  it('tags Rates for treasury/yield headlines', () => {
    expect(tagImpacts('10-year treasury yield hits 4.5%')).toContain('Rates')
    expect(tagImpacts('Bond yields surge on strong jobs data')).toContain('Rates')
  })

  it('tags GDP/Growth for economic output headlines', () => {
    expect(tagImpacts('GDP growth slows to 1.2% in Q4')).toContain('GDP/Growth')
    expect(tagImpacts('Recession fears grow as output contracts')).toContain('GDP/Growth')
  })

  it('returns multiple tags for complex headlines', () => {
    const tags = tagImpacts('Fed raises rates amid rising inflation and GDP slowdown concerns')
    expect(tags).toContain('Fed Policy')
    expect(tags).toContain('Inflation')
    expect(tags).toContain('GDP/Growth')
  })

  it('returns empty array for unrelated headlines', () => {
    expect(tagImpacts('Local sports team wins championship')).toHaveLength(0)
  })
})
