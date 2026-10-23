/**
 * OpenCode Go quota — Host half.
 *
 * Reads the live subscription meters of the OpenCode Go / Go Plus plan from the
 * OpenCode Console and publishes the normalized snapshot to the bundled Client
 * widget over one same-origin JSON route. The API key never leaves this process.
 */

export const inject = ['credentials', 'webServer']

const MICROCENTS_PER_DOLLAR = 100000000

const DEFAULTS = {
  apiKeyRef: 'OPENCODE_GO_API_KEY',
  endpoint: 'https://opencode.ai/console/api/go/status',
  routePath: '/plugins/opencode-go-quota/usage',
  refreshSeconds: 30,
  minimumFetchSeconds: 5,
  timeoutSeconds: 10,
}

function normalizeOptions(config) {
  const source = config && typeof config === 'object' ? config : {}
  const pick = (key) => {
    const value = source[key]
    return value === undefined || value === null || value === '' ? DEFAULTS[key] : value
  }
  const seconds = (key, low, high) => {
    const value = Number(pick(key))
    if (!Number.isFinite(value)) return DEFAULTS[key]
    return Math.min(high, Math.max(low, value))
  }
  return {
    apiKeyRef: String(pick('apiKeyRef')),
    endpoint: String(pick('endpoint')),
    routePath: String(pick('routePath')),
    refreshSeconds: seconds('refreshSeconds', 10, 3600),
    minimumFetchSeconds: seconds('minimumFetchSeconds', 2, 300),
    timeoutSeconds: seconds('timeoutSeconds', 3, 120),
  }
}

function toNumber(value) {
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function toDollars(value) {
  return toNumber(value) / MICROCENTS_PER_DOLLAR
}

function normalizeMeter(raw) {
  if (!raw || typeof raw !== 'object') return null
  const limit = Math.max(0, toDollars(raw.limitMicroCents))
  const used = Math.max(0, toDollars(raw.usedMicroCents))
  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    startsAt: typeof raw.startsAt === 'string' ? raw.startsAt : null,
    resetsAt: typeof raw.resetsAt === 'string' ? raw.resetsAt : null,
  }
}

function successSnapshot(body) {
  const access = body && typeof body.access === 'object' && body.access !== null ? body.access : {}
  const meters = access.meters && typeof access.meters === 'object' && access.meters !== null ? access.meters : {}
  return {
    ok: true,
    code: null,
    detail: null,
    product: typeof body.product === 'string' ? body.product : null,
    renewalProduct: typeof body.renewalProduct === 'string' ? body.renewalProduct : null,
    cancelAtPeriodEnd: access.cancelAtPeriodEnd === true,
    period: {
      startsAt: typeof access.startsAt === 'string' ? access.startsAt : null,
      endsAt: typeof access.endsAt === 'string' ? access.endsAt : null,
    },
    meters: {
      fiveHour: normalizeMeter(meters.fiveHour),
      week: normalizeMeter(meters.week),
      month: normalizeMeter(meters.month),
    },
    fetchedAt: new Date().toISOString(),
  }
}

function failureSnapshot(code, detail) {
  return {
    ok: false,
    code,
    detail: detail === undefined || detail === null ? null : String(detail).slice(0, 200),
    product: null,
    renewalProduct: null,
    cancelAtPeriodEnd: false,
    period: null,
    meters: null,
    fetchedAt: new Date().toISOString(),
  }
}

async function readJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export function apply(ctx, config) {
  const options = normalizeOptions(config)

  let snapshot = null
  let inflight = null
  let lastAttempt = 0

  const requestOnce = async () => {
    let secret = ''
    try {
      const resolved = await ctx.credentials.resolve(options.apiKeyRef)
      secret = resolved && typeof resolved.value === 'string' ? resolved.value.trim() : ''
    } catch (error) {
      return failureSnapshot('credential-error', error instanceof Error ? error.message : 'resolve failed')
    }
    if (!secret) return failureSnapshot('missing-credential', options.apiKeyRef)

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), options.timeoutSeconds * 1000)
    timer.unref?.()
    try {
      const response = await fetch(options.endpoint, {
        method: 'GET',
        redirect: 'error',
        signal: controller.signal,
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${secret}`,
          'user-agent': 'dsh-opencode-go-quota/1.0',
        },
      })
      if (response.status === 401 || response.status === 403) return failureSnapshot('unauthorized', String(response.status))
      if (!response.ok) return failureSnapshot('http', String(response.status))
      const body = await readJson(response)
      if (!body || typeof body !== 'object') return failureSnapshot('invalid-response')
      if (!body.access || typeof body.access !== 'object') return failureSnapshot('no-subscription')
      return successSnapshot(body)
    } catch (error) {
      const aborted = controller.signal.aborted
      return failureSnapshot(aborted ? 'timeout' : 'network', error instanceof Error ? error.name : 'fetch failed')
    } finally {
      clearTimeout(timer)
    }
  }

  const refresh = async (force) => {
    const now = Date.now()
    if (!force && snapshot && now - lastAttempt < options.minimumFetchSeconds * 1000) return snapshot
    if (inflight) return inflight
    lastAttempt = now
    const task = requestOnce()
    inflight = task
    try {
      snapshot = await task
    } finally {
      if (inflight === task) inflight = null
    }
    return snapshot
  }

  const handler = async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.statusCode = 405
      response.setHeader('allow', 'GET, HEAD')
      response.end()
      return
    }
    let force = false
    try {
      const url = new URL(request.url ?? '/', 'http://localhost')
      force = url.searchParams.get('force') === '1'
    } catch {
      force = false
    }
    let payload
    try {
      payload = await refresh(force)
    } catch (error) {
      payload = failureSnapshot('internal', error instanceof Error ? error.message : 'refresh failed')
    }
    const body = JSON.stringify(payload ?? failureSnapshot('pending'))
    response.statusCode = 200
    response.setHeader('content-type', 'application/json; charset=utf-8')
    response.setHeader('cache-control', 'no-store')
    response.setHeader('x-content-type-options', 'nosniff')
    if (request.method === 'HEAD') {
      response.end()
      return
    }
    response.end(body)
  }

  ctx.effect(() => {
    const interval = setInterval(() => {
      void refresh(false).catch(() => {})
    }, options.refreshSeconds * 1000)
    interval.unref?.()
    void refresh(false).catch(() => {})
    return () => clearInterval(interval)
  })

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: options.routePath,
    handler,
  }))
}
