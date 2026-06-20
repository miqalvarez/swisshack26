import * as XLSX from 'xlsx'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { db, isEmpty, nowIso, uuid } from './db.js'
import type {
  AssetType,
  CommentChannel,
  CommunicationStyle,
  MandateType,
  RiskProfile,
} from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA = resolve(__dirname, '../../data')
const PORTFOLIO_XLSX = resolve(DATA, 'SwissHacks Portfolio Construction.xlsx')
const CRM_XLSX = resolve(DATA, 'SwissHacks CRM.xlsx')

// ---------- helpers ----------

/** Excel serial date (days since 1899-12-30) -> ISO string. */
function excelDateToIso(serial: number | string): string {
  const n = typeof serial === 'string' ? Number(serial) : serial
  if (!Number.isFinite(n)) return nowIso()
  const ms = Math.round((n - 25569) * 86400 * 1000)
  return new Date(ms).toISOString()
}

function channelOf(medium: string): CommentChannel {
  const m = (medium || '').toLowerCase()
  if (m.includes('phone') || m.includes('call')) return 'call'
  if (m.includes('email') || m.includes('mail')) return 'email'
  if (m.includes('whatsapp')) return 'whatsapp'
  if (m.includes('meeting') || m.includes('lunch') || m.includes('physical'))
    return 'meeting'
  return 'other'
}

function assetTypeOf(assetClass: string, subAsset: string): AssetType {
  const a = (assetClass || '').toLowerCase()
  const s = (subAsset || '').toLowerCase()
  if (a.includes('equit')) return 'stock'
  if (a.includes('fixed income') || a.includes('bond')) return 'bond'
  if (a.includes('real estate')) return 'fund'
  if (a.includes('liquidity') || s.includes('cash') || s.includes('money'))
    return 'cash'
  if (a.includes('altern')) {
    if (s.includes('crypto')) return 'crypto'
    if (s.includes('private')) return 'fund'
    return 'other'
  }
  return 'other'
}

type Row = Record<string, unknown>

function sheetRows(wb: XLSX.WorkBook, name: string): Row[] {
  const ws = wb.Sheets[name]
  if (!ws) throw new Error(`Sheet not found: ${name}`)
  return XLSX.utils.sheet_to_json<Row>(ws, { defval: null })
}

function str(v: unknown): string {
  return v == null ? '' : String(v).trim()
}
function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

// ---------- static config ----------

const WM_ID = 'wm-anna-keller'

interface PersonaCfg {
  id: string
  full_name: string
  primary_contact: string
  email: string
  persona: string
  mandate: MandateType
  risk: RiskProfile
  portfolioSheet: string
  crmSheet: string
  accent: string
  communication_style: CommunicationStyle
  profile_description: string
  technical_level: number // 1 (keep it human) .. 5 (deep technical detail)
  preferred_channel: CommentChannel
}

const PERSONAS: PersonaCfg[] = [
  {
    id: 'raeber',
    full_name: 'Familie Räber',
    primary_contact: 'Eugen Räber',
    email: 'eugen.raeber@example.ch',
    persona: 'The Defensive Value Investor',
    mandate: 'defensive',
    risk: 'conservative',
    portfolioSheet: 'Sample Portfolio Defensive',
    crmSheet: 'CRM Raeber',
    accent: '#3b6ea5',
    communication_style: 'formal-data',
    profile_description:
      'Sold his precision engineering firm. Capital preservation and steady global dividends fund the family foundation. Zero appetite for US tech speculation.',
    technical_level: 5,
    preferred_channel: 'meeting',
  },
  {
    id: 'schneider',
    full_name: 'Familie Schneider',
    primary_contact: 'Marlene Schneider',
    email: 'marlene.schneider@example.ch',
    persona: 'The Personal Connection',
    mandate: 'balanced',
    risk: 'balanced',
    portfolioSheet: 'Sample Portfolio Balanced',
    crmSheet: 'CRM Schneider',
    accent: '#b0573f',
    communication_style: 'warm-personal',
    profile_description:
      'CEO of a Swiss automotive supply enterprise. Strong operational precision; balanced growth with a foundation supporting chronic-illness research.',
    technical_level: 2,
    preferred_channel: 'meeting',
  },
  {
    id: 'huber',
    full_name: 'Familie Huber',
    primary_contact: 'Anton Huber',
    email: 'anton.huber@example.ch',
    persona: 'The Purpose-Driven Investor',
    mandate: 'defensive',
    risk: 'balanced',
    portfolioSheet: 'Sample Portfolio Defensive',
    crmSheet: 'CRM Huber',
    accent: '#3f8f6b',
    communication_style: 'values-narrative',
    profile_description:
      'Sustainable agriculture exit turned into a philanthropic mission. Portfolio must reflect corporate sustainability and protect natural ecosystems.',
    technical_level: 2,
    preferred_channel: 'call',
  },
  {
    id: 'ammann',
    full_name: 'Familie Ammann',
    primary_contact: 'Niklaus Ammann',
    email: 'niklaus.ammann@example.ch',
    persona: 'The Corporate Reputation Case',
    mandate: 'growth',
    risk: 'aggressive',
    portfolioSheet: 'Sample Portfolio Growth',
    crmSheet: 'CRM Ammann',
    accent: '#9a6b2f',
    communication_style: 'executive-brief',
    profile_description:
      'Founder of a prominent Swiss retail brand. Highly analytical and reputation-sensitive. Strict governance screens on consumer discretionary holdings.',
    technical_level: 5,
    preferred_channel: 'email',
  },
]

const MANDATES: Record<
  MandateType,
  { description: string; universe: string; rebalancing: string; limits: string }
> = {
  defensive: {
    description: 'Capital preservation first; income-oriented multi-asset mix.',
    universe: 'Swiss & developed equities, high-grade bonds, gold, cash.',
    rebalancing: 'Quarterly, ±2.0pp sub-asset-class drift band.',
    limits: 'Max 25% equities; investment-grade fixed income only.',
  },
  balanced: {
    description: 'Balance of growth and stability across global assets.',
    universe: 'Global equities, IG/EM bonds, real estate, private markets.',
    rebalancing: 'Quarterly, ±2.0pp sub-asset-class drift band.',
    limits: 'Equities 45–55%; controlled EM and alternatives exposure.',
  },
  growth: {
    description: 'Long-horizon capital growth; higher volatility tolerated.',
    universe: 'Global & EM equities, private markets, crypto, REITs.',
    rebalancing: 'Quarterly, ±2.0pp sub-asset-class drift band.',
    limits: 'Equities up to 75%; capped crypto sleeve.',
  },
}

// ---------- seeding ----------

function reset() {
  for (const t of [
    'suggestion',
    'news',
    '"transaction"',
    'holding',
    'comment',
    'customer',
    'cio_mandate',
    'wm',
  ]) {
    db.exec(`DELETE FROM ${t};`)
  }
}

function seed() {
  const now = nowIso()
  const portfolio = XLSX.read(readFileSync(PORTFOLIO_XLSX), { type: 'buffer' })
  const crm = XLSX.read(readFileSync(CRM_XLSX), { type: 'buffer' })

  // WM
  db.prepare(
    `INSERT INTO wm (id, full_name, photo_url, email, phone, created_at, updated_at)
     VALUES (@id, @full_name, NULL, @email, @phone, @now, @now)`,
  ).run({
    id: WM_ID,
    full_name: 'Anna Keller',
    email: 'anna.keller@bank.example',
    phone: '+41 44 000 00 00',
    now,
  })

  // Mandates
  const mandateId: Record<MandateType, string> = {
    defensive: 'mandate-defensive',
    balanced: 'mandate-balanced',
    growth: 'mandate-growth',
  }
  const insMandate = db.prepare(
    `INSERT INTO cio_mandate (id, name, description, investment_universe, rebalancing_policy, risk_limits, is_active, created_at, updated_at)
     VALUES (@id, @name, @description, @universe, @rebalancing, @limits, 1, @now, @now)`,
  )
  for (const name of ['defensive', 'balanced', 'growth'] as MandateType[]) {
    const m = MANDATES[name]
    insMandate.run({ id: mandateId[name], name, now, ...m })
  }

  const insCustomer = db.prepare(
    `INSERT INTO customer (id, wm_id, cio_mandate_id, full_name, photo_url, email, risk_profile, base_currency, status, persona, primary_contact, accent_color, communication_style, profile_description, technical_level, preferred_channel, created_at, updated_at)
     VALUES (@id, @wm_id, @mandate_id, @full_name, NULL, @email, @risk, 'CHF', 'active', @persona, @primary_contact, @accent, @communication_style, @profile_description, @technical_level, @preferred_channel, @now, @now)`,
  )
  const insHolding = db.prepare(
    `INSERT INTO holding (id, customer_id, name, description, amount, asset_type, currency, is_active, isin, sector, sub_asset_class, region, target_amount, valor, mic, ticker, created_at, updated_at)
     VALUES (@id, @customer_id, @name, @description, @amount, @asset_type, 'CHF', 1, @isin, @sector, @sub_asset_class, @region, @target_amount, @valor, @mic, @ticker, @now, @now)`,
  )
  const insComment = db.prepare(
    `INSERT INTO comment (id, customer_id, author_wm_id, comment_date, channel, content, is_private, created_at)
     VALUES (@id, @customer_id, @author_wm_id, @comment_date, @channel, @content, 0, @now)`,
  )

  for (const p of PERSONAS) {
    insCustomer.run({
      id: p.id,
      wm_id: WM_ID,
      mandate_id: mandateId[p.mandate],
      full_name: p.full_name,
      email: p.email,
      risk: p.risk,
      persona: p.persona,
      primary_contact: p.primary_contact,
      accent: p.accent,
      communication_style: p.communication_style,
      profile_description: p.profile_description,
      technical_level: p.technical_level,
      preferred_channel: p.preferred_channel,
      now,
    })

    // Holdings from the portfolio workbook
    const rows = sheetRows(portfolio, p.portfolioSheet)
    for (const r of rows) {
      const name = str(r['Issuer / Asset'])
      if (!name) continue
      const assetClass = str(r['Asset Class'])
      const subAsset = str(r['Sub-Asset Class'])
      const region = str(r['Region'])
      const sector = str(r['Industry Group'])
      const details = str(r['Security / Details'])
      const amount = num(r['Current (CHF)']) || num(r['Target (CHF)'])
      const target = num(r['Target (CHF)'])
      insHolding.run({
        id: uuid(),
        customer_id: p.id,
        name,
        description: [details, region, sector].filter(Boolean).join(' · '),
        amount,
        asset_type: assetTypeOf(assetClass, subAsset),
        isin: str(r['ISIN']) || null,
        sector: sector || subAsset || null,
        sub_asset_class: subAsset || null,
        region: region || null,
        target_amount: target || null,
        valor: str(r['Valor']) || null,
        mic: str(r['MIC']) || null,
        ticker: str(r['Yahoo Ticker']) || null,
        now,
      })
    }

    // Comments from the CRM workbook (real relationship logs)
    const crmRows = sheetRows(crm, p.crmSheet)
    for (const r of crmRows) {
      const note = str(r['Note'])
      if (!note) continue
      insComment.run({
        id: uuid(),
        customer_id: p.id,
        author_wm_id: WM_ID,
        comment_date: excelDateToIso(r['Date'] as number),
        channel: channelOf(str(r['Medium'])),
        content: note,
        now,
      })
    }
  }

  seedSignals(now)
  console.log('Seed complete.')
}

/**
 * Seeds the trigger-event News + Suggestions for each persona. These stand in
 * for the SYSTEM use cases "Update knowledge DB news" and "Inference new
 * suggestions" (the parallel multi-agent backend) so the WM-facing apply/drop
 * flows are demonstrable end to end.
 */
function seedSignals(now: string) {
  const findHolding = db.prepare(
    `SELECT id, name FROM holding WHERE customer_id = ? AND name LIKE ? LIMIT 1`,
  )
  const insNews = db.prepare(
    `INSERT INTO news (id, customer_id, title, description, source_url, published_at, sentiment_score, relevance_score, related_holding_name, created_at)
     VALUES (@id, @customer_id, @title, @description, @source_url, @published_at, @sentiment, @relevance, @related, @now)`,
  )
  const insSuggestion = db.prepare(
    `INSERT INTO suggestion (id, customer_id, transaction_id, old_holding_id, news_id, news_title, news_description, news_link, news_date, potential_impact_description, exposure, recommendation_action, recommendation_description, why_title, why_description, new_holding_name, new_holding_description, new_holding_amount, new_holding_type, client_message, recommended_channel, delivery_approach, status, created_at, expires_at)
     VALUES (@id, @customer_id, NULL, @old_holding_id, @news_id, @news_title, @news_description, @news_link, @news_date, @impact, @exposure, @action, @rec_desc, @why_title, @why_desc, @new_name, @new_desc, @new_amount, @new_type, @client_message, @rec_channel, @delivery, 'pending', @now, NULL)`,
  )

const signals = [
    {
      customer: 'schneider',
      holdingLike: '%Novartis%',
      news: {
        title: 'Pharma group shuts down its rare chronic-illness research unit',
        description:
          'A major pharmaceutical holding is closing the exact research field the Schneider family foundation supports, citing pipeline reprioritisation.',
        url: 'https://news.example.com/pharma-research-shutdown',
        sentiment: -0.6,
        relevance: 0.92,
      },
      impact:
        "Direct conflict with the family's foundation cause. Reputationally and emotionally sensitive even if financially modest.",
      exposure: 9.1,
      action: 'Swap within Health Care sleeve',
      recDesc:
        'Replace the position with a same-sector Swiss health-care name that still funds active research in the relevant field.',
      whyTitle: "Aligns the portfolio with the foundation's mission",
      whyDesc:
        "Keeps the Balanced mandate's health-care weight intact while removing a holding that contradicts the client's personal cause.",
      newName: 'Roche Holding AG',
      newDesc: 'Genussschein · Health Care · diagnostics-pharma flywheel',
      newType: 'stock' as const,
      clientMessage:
        "Dear Marlene, I've been following a development that touches us personally: Novartis has shut down research in the very area your foundation cares about most. To make sure your portfolio still reflects your values, I'd recommend swapping the Novartis position for Roche — a Swiss healthcare company that's still actively investing in that research field. I'd love to discuss this with you in person.",
      recChannel: 'meeting' as const,
      deliveryApproach:
        'Raise it in person, not over email — this is emotional for Marlene. Open with the foundation, not the portfolio: acknowledge that the research she funds is at stake. Keep numbers light; frame the swap as protecting what she cares about. Let her lead the pace of the decision.',
    },
    {
      customer: 'ammann',
      holdingLike: '%Nestl%',
      news: {
        title: 'Labour exploitation scandal hits consumer brand in portfolio',
        description:
          'Investigative report alleges supply-chain labour abuses at a consumer brand held in the Growth portfolio.',
        url: 'https://news.example.com/labour-scandal',
        sentiment: -0.7,
        relevance: 0.88,
      },
      impact:
        'For this client reputational risk equals financial risk. Association with the brand could damage their public profile.',
      exposure: 7.4,
      action: 'Reduce and replace exposure',
      recDesc:
        'Exit the implicated name and rotate into a same-sector consumer holding with a clean labour-rights record.',
      whyTitle: "Protects the client's public reputation",
      whyDesc:
        'Maintains consumer-staples exposure within the Growth mandate while removing the reputational liability.',
      newName: 'Chocoladefabriken Lindt',
      newDesc: 'Inhaberaktie · Consumer Staples · premium Swiss brand',
      newType: 'stock' as const,
      clientMessage:
        "Niklaus — labour-abuse allegations in Nestlé's supply chain pose an immediate reputational risk to your public profile. Recommendation: exit position, rotate into Lindt & Sprüngli (clean labour record, established Swiss consumer brand). Summary updated; full brief available on request.",
      recChannel: 'email' as const,
      deliveryApproach:
        'Send a concise written brief he can forward to his own advisors — he values an audit trail. Lead with the reputational exposure and the number, then the one-line recommendation. Offer the full governance analysis as an attachment; expect a fast, decisive reply. Avoid small talk.',
    },
    {
      customer: 'raeber',
      holdingLike: '%Roche%',
      news: {
        title: 'CIO suggests rotating blue chips into US AI equities',
        description:
          'The CIO recommendation list adds several US AI mega-caps as BUY, implying a rotation out of defensive Swiss blue chips.',
        url: 'https://news.example.com/cio-us-ai-rotation',
        sentiment: 0.1,
        relevance: 0.8,
      },
      impact:
        "Conflicts with the Räbers' stated aversion to US technology and their capital-preservation priority.",
      exposure: 5.2,
      action: 'Decline US tech; keep Swiss quality',
      recDesc:
        'Hold the defensive Swiss position and, if rebalancing is needed, stay within Swiss quality rather than US AI names.',
      whyTitle: "Respects the client's explicit no-US-tech preference",
      whyDesc:
        "The Defensive mandate is met without breaching the client's personal investment boundaries.",
      newName: 'Swisscom AG',
      newDesc: 'Registered Shares · Telecommunication · stable Swiss dividend',
      newType: 'stock' as const,
      clientMessage:
        "Dear Mr. Räber, in accordance with your stated capital-preservation objective and preference against US technology exposure, I recommend retaining the current Roche position. The CIO rotation proposal toward US AI equities would exceed your defined risk and preference boundaries. Should rebalancing be required, Swisscom offers a stable dividend yield within your Defensive mandate parameters. Detailed risk analysis attached.",
      recChannel: 'meeting' as const,
      deliveryApproach:
        'Book a formal review and bring the numbers. Räber is an engineer — walk him through the risk analysis, volatility figures and dividend yields, and explicitly reaffirm that you are honouring his no-US-tech boundary. Present the decision as defending his stated rules, not as a market call. Leave printed documentation.',
    },
    {
      customer: 'huber',
      holdingLike: '%Nestl%',
      news: {
        title: 'Consumer goods company announces historic palm-oil cut-off',
        description:
          "A consumer-staples holding commits to fully deforestation-free palm oil, a milestone aligned with the client's environmental values.",
        url: 'https://news.example.com/palm-oil-cutoff',
        sentiment: 0.6,
        relevance: 0.75,
      },
      impact:
        'Positive alignment with the Huber reforestation cause — an opportunity to reinforce the relationship.',
      exposure: 6.3,
      action: 'Reinforce and communicate',
      recDesc:
        'No swap required. Flag the milestone to the client as evidence the portfolio reflects their values.',
      whyTitle: 'Turns a values match into a relationship moment',
      whyDesc:
        "Strengthens trust by proactively surfacing alignment between holdings and the client's purpose.",
      newName: 'Nestlé S.A.',
      newDesc: 'Registered Shares · Consumer Staples · sustainability milestone',
      newType: 'stock' as const,
      clientMessage:
        "Dear Anton, I'm pleased to share some news that truly resonates with what you stand for: Nestlé has committed to going fully deforestation-free in its palm oil sourcing — a milestone that mirrors exactly what your reforestation initiative is all about. Your portfolio already holds this shift. No action needed from our side, but I wanted you to know: your values and your portfolio are walking hand in hand.",
      recChannel: 'call' as const,
      deliveryApproach:
        'Give him a short, warm call — no agenda, no paperwork. Tell it as a story: the company he holds just did the right thing, and it matches his mission. Make clear no action is needed; the point is to reinforce that his money reflects his values. A relationship-building moment, not a transaction.',
    },
  ]

  for (const s of signals) {
    const old = findHolding.get(s.customer, s.holdingLike) as
      | { id: string; name: string }
      | undefined
    const newsId = uuid()
    insNews.run({
      id: newsId,
      customer_id: s.customer,
      title: s.news.title,
      description: s.news.description,
      source_url: s.news.url,
      published_at: now,
      sentiment: s.news.sentiment,
      relevance: s.news.relevance,
      related: old?.name ?? null,
      now,
    })
    insSuggestion.run({
      id: uuid(),
      customer_id: s.customer,
      old_holding_id: old?.id ?? null,
      news_id: newsId,
      news_title: s.news.title,
      news_description: s.news.description,
      news_link: s.news.url,
      news_date: now,
      impact: s.impact,
      exposure: s.exposure,
      action: s.action,
      rec_desc: s.recDesc,
      why_title: s.whyTitle,
      why_desc: s.whyDesc,
      new_name: s.newName,
      new_desc: s.newDesc,
      new_amount: old ? amountOf(old.id) : 50000,
      new_type: s.newType,
      client_message: s.clientMessage,
      rec_channel: s.recChannel,
      delivery: s.deliveryApproach,
      now,
    })
  }
}

function amountOf(holdingId: string): number {
  const row = db
    .prepare('SELECT amount FROM holding WHERE id = ?')
    .get(holdingId) as { amount: number } | undefined
  return row?.amount ?? 50000
}

// ---------- entrypoint ----------

const force = process.argv.includes('--reset')

export function ensureSeeded() {
  if (isEmpty()) {
    seed()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (force) reset()
  if (isEmpty()) seed()
  else console.log('DB already seeded (use --reset to rebuild).')
}
