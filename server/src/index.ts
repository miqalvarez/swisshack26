import express from 'express'
import cors from 'cors'
import { z } from 'zod'
import { db } from './db.js'
import { ensureSeeded } from './seed.js'
import {
  applySuggestion,
  computeDrift,
  createTask,
  customerSummaries,
  customerValue,
  dropSuggestion,
  lastInteraction,
  listTasks,
  pendingSuggestionCount,
  setTaskStatus,
  wealthSeries,
} from './repo.js'

ensureSeeded()

const app = express()
app.use(cors())
app.use(express.json())

const WM = () => db.prepare(`SELECT * FROM wm LIMIT 1`).get()

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

// UC: Get dashboard data (+ TLDR news lives here, not on the client view)
app.get('/api/dashboard', (_req, res) => {
  const customers = customerSummaries()
  const news = db
    .prepare(
      `SELECT n.*, c.full_name AS customer_name, c.accent_color
       FROM news n JOIN customer c ON c.id = n.customer_id
       ORDER BY n.relevance_score DESC, n.published_at DESC`,
    )
    .all()
  const suggestions = db
    .prepare(
      `SELECT s.*, c.full_name AS customer_name, c.accent_color, oh.name AS old_holding_name
       FROM suggestion s
       JOIN customer c ON c.id = s.customer_id
       LEFT JOIN holding oh ON oh.id = s.old_holding_id
       WHERE s.status = 'pending'
       ORDER BY s.exposure DESC`,
    )
    .all()

  const tasks = listTasks({ status: 'open' })

  res.json({
    wm: WM(),
    stats: {
      clients: customers.length,
      pending_suggestions: suggestions.length,
      assets_under_advice: customers.reduce((s, c) => s + c.total_value, 0),
      open_tasks: tasks.length,
    },
    customers,
    news,
    suggestions,
    tasks,
  })
})

// UC: Get client (includes holdings, historic, suggestions — NOT news)
app.get('/api/customers', (_req, res) => {
  res.json(customerSummaries())
})

app.get('/api/customers/:id', (req, res) => {
  const { id } = req.params
  const customer = db
    .prepare(
      `SELECT c.*, m.name AS mandate, m.description AS mandate_description,
              m.investment_universe, m.rebalancing_policy, m.risk_limits
       FROM customer c JOIN cio_mandate m ON m.id = c.cio_mandate_id
       WHERE c.id = ?`,
    )
    .get(id)
  if (!customer) return res.status(404).json({ error: 'customer_not_found' })

  const holdings = db
    .prepare(
      `SELECT * FROM holding WHERE customer_id = ? AND is_active = 1
       ORDER BY amount DESC`,
    )
    .all(id)
  const transactions = db
    .prepare(
      `SELECT * FROM "transaction" WHERE customer_id = ? ORDER BY executed_at DESC`,
    )
    .all(id)
  const suggestions = db
    .prepare(
      `SELECT s.*, oh.name AS old_holding_name
       FROM suggestion s
       LEFT JOIN holding oh ON oh.id = s.old_holding_id
       WHERE s.customer_id = ?
       ORDER BY (s.status = 'pending') DESC, s.exposure DESC, s.created_at DESC`,
    )
    .all(id)
  const comments = db
    .prepare(
      `SELECT * FROM comment WHERE customer_id = ? ORDER BY comment_date DESC`,
    )
    .all(id)

  const value = customerValue(id)
  res.json({
    customer,
    drift: computeDrift(id),
    total_value: value,
    pending_suggestions: pendingSuggestionCount(id),
    wealth: wealthSeries(
      id,
      value,
      (customer as { risk_profile: string }).risk_profile,
    ),
    last_interaction: lastInteraction(id),
    holdings,
    transactions,
    suggestions,
    comments,
    tasks: listTasks({ customerId: id }),
  })
})

// UC: Add client data (a relationship comment / interaction log)
const commentSchema = z.object({
  channel: z.enum(['call', 'email', 'meeting', 'whatsapp', 'other']),
  content: z.string().min(1),
  comment_date: z.string().datetime().optional(),
  is_private: z.boolean().optional(),
})

app.post('/api/customers/:id/comments', (req, res) => {
  const { id } = req.params
  const exists = db.prepare(`SELECT 1 FROM customer WHERE id = ?`).get(id)
  if (!exists) return res.status(404).json({ error: 'customer_not_found' })

  const parsed = commentSchema.safeParse(req.body)
  if (!parsed.success)
    return res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() })

  const now = new Date().toISOString()
  const commentId = globalThis.crypto.randomUUID()
  const data = parsed.data
  db.prepare(
    `INSERT INTO comment (id, customer_id, author_wm_id, comment_date, channel, content, is_private, created_at)
     VALUES (@id, @customer_id, @author, @comment_date, @channel, @content, @is_private, @now)`,
  ).run({
    id: commentId,
    customer_id: id,
    author: (WM() as { id: string }).id,
    comment_date: data.comment_date ?? now,
    channel: data.channel,
    content: data.content,
    is_private: data.is_private ? 1 : 0,
    now,
  })
  res.status(201).json(db.prepare(`SELECT * FROM comment WHERE id = ?`).get(commentId))
})

// UC: Apply suggestion
app.post('/api/suggestions/:id/apply', (req, res) => {
  try {
    const result = applySuggestion(req.params.id)
    res.json({ ok: true, ...result })
  } catch (err) {
    const msg = (err as Error).message
    const code = msg === 'not_found' ? 404 : 409
    res.status(code).json({ error: msg })
  }
})

// UC: Drop suggestion
app.post('/api/suggestions/:id/drop', (req, res) => {
  try {
    dropSuggestion(req.params.id)
    res.json({ ok: true })
  } catch (err) {
    res.status(409).json({ error: (err as Error).message })
  }
})

// --- Tasks / follow-ups ---
app.get('/api/tasks', (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined
  const customerId =
    typeof req.query.customer_id === 'string' ? req.query.customer_id : undefined
  res.json(listTasks({ status, customerId }))
})

const taskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  customer_id: z.string().optional(),
  suggestion_id: z.string().optional(),
  channel: z.enum(['call', 'email', 'meeting', 'whatsapp', 'other']).optional(),
  due_date: z.string().min(4),
  priority: z.enum(['low', 'medium', 'high']).optional(),
})

app.post('/api/tasks', (req, res) => {
  const parsed = taskSchema.safeParse(req.body)
  if (!parsed.success)
    return res.status(400).json({ error: 'invalid_body', details: parsed.error.flatten() })
  res.status(201).json(createTask(parsed.data))
})

app.post('/api/tasks/:id/complete', (req, res) => {
  try {
    setTaskStatus(req.params.id, 'done')
    res.json({ ok: true })
  } catch (err) {
    res.status(404).json({ error: (err as Error).message })
  }
})

app.post('/api/tasks/:id/reopen', (req, res) => {
  try {
    setTaskStatus(req.params.id, 'open')
    res.json({ ok: true })
  } catch (err) {
    res.status(404).json({ error: (err as Error).message })
  }
})

const PORT = Number(process.env.PORT ?? 4000)
app.listen(PORT, () => {
  console.log(`Wealth Advisory API listening on http://localhost:${PORT}`)
})
