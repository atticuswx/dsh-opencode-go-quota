/**
 * OpenCode Go quota — Client half.
 *
 * Ambient strip below the composer: 5-hour, weekly and monthly remaining
 * allowance of the OpenCode Go plan, refreshed from the Host half.
 */

window.__ModuleLoader__.load({
  id: 'dsh-opencode-go-quota',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const ROUTE = '/plugins/opencode-go-quota/usage'
    const POLL_MS = 20000
    const NS = 'opencode-go-quota'

    const DICTS = {
      zh: {
        brand: 'OpenCode Go',
        fiveHour: '5 小时',
        week: '本周',
        month: '本月',
        remaining: '剩余',
        used: '已用',
        limit: '上限',
        details: '明细',
        hide: '收起',
        refresh: '刷新',
        loading: '读取额度…',
        unavailable: '暂无额度数据',
        missing: '未配置 OPENCODE_GO_API_KEY',
        unauthorized: 'API Key 无效或已过期',
        offline: '连接 opencode.ai 失败',
        timeout: '请求超时',
        badResponse: '响应格式异常',
        noSubscription: '该账号没有 Go 套餐',
        resetsIn: '距重置',
        periodEnds: '本期结束',
        canceling: '到期取消',
        updated: '更新于',
        plan: '套餐',
        group: 'OpenCode Go 套餐剩余额度',
        unitD: '天',
        unitH: '小时',
        unitM: '分',
      },
      en: {
        brand: 'OpenCode Go',
        fiveHour: '5 hours',
        week: 'Week',
        month: 'Month',
        remaining: 'left',
        used: 'used',
        limit: 'limit',
        details: 'Details',
        hide: 'Hide',
        refresh: 'Refresh',
        loading: 'Reading quota…',
        unavailable: 'No quota data',
        missing: 'OPENCODE_GO_API_KEY is not configured',
        unauthorized: 'API key is invalid or expired',
        offline: 'Cannot reach opencode.ai',
        timeout: 'Request timed out',
        badResponse: 'Unexpected response',
        noSubscription: 'This account has no Go plan',
        resetsIn: 'Resets in',
        periodEnds: 'Period ends',
        canceling: 'Cancels at period end',
        updated: 'Updated',
        plan: 'Plan',
        group: 'OpenCode Go plan allowance',
        unitD: 'd',
        unitH: 'h',
        unitM: 'm',
      },
    }

    const CSS = `
.ogoq-root { display: flex; flex-direction: column; align-items: center; gap: 6px; width: 100%; }
.ogoq-row {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap; justify-content: center;
  font-size: 11.5px; line-height: 1.4; color: var(--dsw-alias-label-secondary);
  font-variant-numeric: tabular-nums;
}
.ogoq-brand { display: inline-flex; align-items: center; gap: 6px; color: var(--dsw-alias-label-primary); font-weight: 500; }
.ogoq-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--dsw-alias-brand-primary); flex: none; }
.ogoq-meter { display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.ogoq-track {
  width: 48px; height: 4px; border-radius: 999px; overflow: hidden;
  background: var(--dsw-alias-bg-layer-2); box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l1);
}
.ogoq-fill { display: block; height: 100%; border-radius: 999px; transition: width 240ms ease; }
.ogoq-value { color: var(--dsw-alias-label-primary); font-weight: 500; min-width: 30px; text-align: right; }
.ogoq-muted { color: var(--dsw-alias-label-secondary); opacity: .78; }
.ogoq-error { color: var(--dsw-alias-state-warn-primary); }
.ogoq-btn {
  appearance: none; border: 0; background: transparent; color: var(--dsw-alias-label-secondary);
  font: inherit; padding: 1px 5px; border-radius: 6px; cursor: pointer; line-height: 1.4;
}
.ogoq-btn:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.ogoq-btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.ogoq-panel {
  display: grid; grid-template-columns: repeat(3, minmax(150px, 1fr)); gap: 8px 22px;
  padding: 10px 14px; border-radius: 10px; text-align: left; max-width: 620px;
  background: var(--dsw-alias-bg-layer-1); border: 1px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-secondary); font-size: 11.5px; font-variant-numeric: tabular-nums;
}
.ogoq-panel h4 { margin: 0 0 3px; font-size: 11.5px; font-weight: 600; color: var(--dsw-alias-label-primary); }
.ogoq-panel dl { margin: 0; display: grid; grid-template-columns: auto 1fr; gap: 1px 8px; }
.ogoq-panel dt { opacity: .78; }
.ogoq-panel dd { margin: 0; color: var(--dsw-alias-label-primary); }
.ogoq-foot { grid-column: 1 / -1; display: flex; justify-content: space-between; gap: 12px; opacity: .78; }
@media (max-width: 720px) { .ogoq-panel { grid-template-columns: 1fr; } }
`

    const nf = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    function money(value) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
      return `$${nf.format(value)}`
    }

    function percentOf(meter) {
      if (!meter || !(meter.limit > 0)) return null
      const pct = (meter.used / meter.limit) * 100
      return Math.max(0, Math.min(100, 100 - pct))
    }

    function tone(pct) {
      if (pct === null) return 'var(--dsw-alias-state-idle-primary)'
      if (pct <= 10) return 'var(--dsw-alias-state-error-primary)'
      if (pct <= 25) return 'var(--dsw-alias-state-warn-primary)'
      return 'var(--dsw-alias-state-success-primary)'
    }

    function until(iso, t) {
      if (!iso) return null
      const target = Date.parse(iso)
      if (!Number.isFinite(target)) return null
      const delta = target - Date.now()
      if (delta <= 0) return null
      const minutes = Math.round(delta / 60000)
      if (minutes < 60) return `${minutes}${t('unitM')}`
      const hours = Math.floor(minutes / 60)
      const rest = minutes % 60
      if (hours < 24) return rest ? `${hours}${t('unitH')} ${rest}${t('unitM')}` : `${hours}${t('unitH')}`
      const days = Math.floor(hours / 24)
      return hours % 24 ? `${days}${t('unitD')} ${hours % 24}${t('unitH')}` : `${days}${t('unitD')}`
    }

    function clock(iso) {
      if (!iso) return '—'
      const target = Date.parse(iso)
      if (!Number.isFinite(target)) return '—'
      try {
        return new Intl.DateTimeFormat(undefined, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(target)
      } catch {
        return new Date(target).toLocaleString()
      }
    }

    function Meter({ label, meter, t }) {
      const pct = percentOf(meter)
      const remaining = pct === null ? null : Math.round(pct)
      const tip = meter
        ? `${label} · ${t('remaining')} ${money(meter.remaining)} / ${money(meter.limit)} · ${t('used')} ${money(meter.used)}${meter.resetsAt ? ` · ${t('resetsIn')} ${until(meter.resetsAt, t) ?? clock(meter.resetsAt)}` : ''}`
        : `${label} · ${t('unavailable')}`
      return h('span', { className: 'ogoq-meter', title: tip },
        h('span', { className: 'ogoq-muted' }, label),
        h('span', { className: 'ogoq-track', role: 'presentation' },
          h('span', {
            className: 'ogoq-fill',
            style: { width: `${pct === null ? 0 : Math.max(2, pct)}%`, background: tone(pct) },
          })),
        h('span', { className: 'ogoq-value' }, remaining === null ? '—' : `${remaining}%`),
      )
    }

    function Panel({ snapshot, t }) {
      if (!snapshot || !snapshot.ok) return null
      const rows = [
        ['fiveHour', t('fiveHour')],
        ['week', t('week')],
        ['month', t('month')],
      ]
      const product = snapshot.product === 'go-plus' ? 'Go Plus' : 'Go'
      return h('div', { className: 'ogoq-panel', role: 'region', 'aria-label': t('group') },
        rows.map(([key, label]) => {
          const meter = snapshot.meters ? snapshot.meters[key] : null
          return h('div', { key },
            h('h4', null, label),
            h('dl', null,
              h('dt', null, t('remaining')),
              h('dd', null, meter ? money(meter.remaining) : '—'),
              h('dt', null, t('used')),
              h('dd', null, meter ? `${money(meter.used)} / ${money(meter.limit)}` : '—'),
              h('dt', null, t('resetsIn')),
              h('dd', null, meter && meter.resetsAt ? until(meter.resetsAt, t) ?? clock(meter.resetsAt) : '—'),
            ))
        }),
        h('div', { className: 'ogoq-foot' },
          h('span', null, `${t('plan')} ${product}${snapshot.cancelAtPeriodEnd ? ` · ${t('canceling')}` : ''}`),
          h('span', null, `${t('updated')} ${clock(snapshot.fetchedAt)}`)),
      )
    }

    function describeFailure(snapshot, t) {
      const code = snapshot && snapshot.code
      if (code === 'missing-credential') return t('missing')
      if (code === 'unauthorized') return t('unauthorized')
      if (code === 'timeout') return t('timeout')
      if (code === 'network') return t('offline')
      if (code === 'no-subscription') return t('noSubscription')
      if (code === 'http') return `HTTP ${snapshot.detail ?? ''}`.trim()
      if (code === 'invalid-response' || code === 'credential-error' || code === 'internal') return t('badResponse')
      return t('unavailable')
    }

    function useUsage() {
      const [state, setState] = React.useState({ snapshot: null, failure: null, loading: true })
      const trigger = React.useRef(null)

      React.useEffect(() => {
        let alive = true
        let timer = null

        const load = async (force) => {
          try {
            const response = await fetch(force ? `${ROUTE}?force=1` : ROUTE, {
              cache: 'no-store',
              headers: { accept: 'application/json' },
            })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const body = await response.json()
            if (!alive) return
            setState({ snapshot: body && typeof body === 'object' ? body : null, failure: null, loading: false })
          } catch (error) {
            if (!alive) return
            setState((current) => ({
              snapshot: current.snapshot,
              failure: error instanceof Error ? error.message : String(error),
              loading: false,
            }))
          }
        }

        trigger.current = () => { void load(true) }
        void load(false)
        timer = setInterval(() => { void load(false) }, POLL_MS)

        const onVisible = () => {
          if (document.visibilityState === 'visible') void load(true)
        }
        document.addEventListener('visibilitychange', onVisible)
        window.addEventListener('focus', onVisible)

        return () => {
          alive = false
          if (timer) clearInterval(timer)
          trigger.current = null
          document.removeEventListener('visibilitychange', onVisible)
          window.removeEventListener('focus', onVisible)
        }
      }, [])

      const refresh = React.useCallback(() => {
        if (trigger.current) trigger.current()
      }, [])

      return [state, refresh]
    }

    function useTranslation(locale) {
      const [, bump] = React.useReducer((value) => value + 1, 0)

      React.useEffect(() => {
        if (!locale || typeof locale.subscribe !== 'function') return undefined
        return locale.subscribe(() => bump())
      }, [locale])

      return React.useCallback((key) => {
        let id = 'zh'
        try {
          const snap = locale && typeof locale.getLocale === 'function' ? locale.getLocale() : null
          if (snap && typeof snap.id === 'string') id = snap.id
          else if (snap && typeof snap.locale === 'string') id = snap.locale
        } catch {
          id = 'zh'
        }
        const dict = DICTS[id] || DICTS[String(id).split('-')[0]] || DICTS.zh
        return dict[key] ?? DICTS.zh[key] ?? key
      }, [locale])
    }

    function QuotaStrip(props) {
      const locale = props && props.locale ? props.locale : null
      const t = useTranslation(locale)
      const [state, refresh] = useUsage()
      const [expanded, setExpanded] = React.useState(false)

      React.useEffect(() => {
        if (!expanded) return undefined
        const onKey = (event) => {
          if (event.key === 'Escape') setExpanded(false)
        }
        document.addEventListener('keydown', onKey)
        return () => document.removeEventListener('keydown', onKey)
      }, [expanded])

      const snapshot = state.snapshot
      const ok = Boolean(snapshot && snapshot.ok)
      const meters = ok ? snapshot.meters : null
      const status = ok
        ? null
        : snapshot
          ? describeFailure(snapshot, t)
          : state.failure
            ? t('offline')
            : t('loading')

      return h('div', { className: 'ogoq-root' },
        h('style', null, CSS),
        h('div', { className: 'ogoq-row', role: 'group', 'aria-label': t('group') },
          h('span', { className: 'ogoq-brand' },
            h('span', { className: 'ogoq-dot' }),
            t('brand')),
          ok
            ? [
              h(Meter, { key: 'five', label: t('fiveHour'), meter: meters ? meters.fiveHour : null, t }),
              h(Meter, { key: 'week', label: t('week'), meter: meters ? meters.week : null, t }),
              h(Meter, { key: 'month', label: t('month'), meter: meters ? meters.month : null, t }),
            ]
            : h('span', { className: snapshot && !ok ? 'ogoq-error' : 'ogoq-muted' }, status),
          h('button', {
            type: 'button',
            className: 'ogoq-btn',
            'aria-expanded': expanded,
            title: expanded ? t('hide') : t('details'),
            onClick: () => setExpanded((value) => !value),
          }, expanded ? t('hide') : t('details')),
          h('button', {
            type: 'button',
            className: 'ogoq-btn',
            title: t('refresh'),
            'aria-label': t('refresh'),
            onClick: refresh,
          }, '↻'),
        ),
        expanded ? h(Panel, { snapshot, t }) : null,
      )
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        const locale = ctx.get('locale')
        if (locale && typeof locale.register === 'function') {
          for (const [id, dict] of Object.entries(DICTS)) {
            try {
              ctx.effect(() => locale.register(NS, id, dict))
            } catch (error) {
              console.error('opencode-go-quota: locale registration failed', error)
            }
          }
        }

        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock',
          id: 'opencode-go-quota',
          order: 2,
        }, (props) => h(QuotaStrip, { ...props, locale })))
      },
    }
  },
})
