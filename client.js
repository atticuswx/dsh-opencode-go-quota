/**
 * OpenCode Go quota — Client half.
 *
 * A Settings page (the `settings.section` list) that shows the live OpenCode
 * Go / Go Plus allowance: 5-hour, weekly and monthly remaining quota, read
 * from the Host half's same-origin JSON route.
 */

window.__ModuleLoader__.load({
  id: 'dsh-opencode-go-quota',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const ROUTE = '/plugins/opencode-go-quota/usage'
    const POLL_MS = 20000
    const NS = 'opencode-go-quota'
    const SECTION_ID = 'opencode-go-quota'

    const DICTS = {
      zh: {
        nav: 'OpenCode 额度',
        title: 'OpenCode Go 额度',
        description: 'OpenCode Go / Go Plus 套餐的实时剩余额度，数据直接读取 opencode.ai Console。',
        fiveHour: '5 小时',
        week: '本周',
        month: '本月',
        remaining: '剩余',
        used: '已用',
        limit: '上限',
        resetsIn: '距重置',
        periodEnds: '本期结束',
        plan: '套餐',
        canceling: '到期取消',
        updated: '更新于',
        refresh: '刷新',
        refreshing: '刷新中',
        loading: '读取额度…',
        unavailable: '暂无额度数据',
        missing: '未配置 OPENCODE_GO_API_KEY',
        unauthorized: 'API Key 无效或已过期',
        offline: '连接 opencode.ai 失败',
        timeout: '请求超时',
        badResponse: '响应格式异常',
        noSubscription: '该账号没有 Go 套餐',
        footnote: '每 20 秒自动刷新；API Key 只在 Host 进程内使用，浏览器只拿到金额与百分比。',
        group: 'OpenCode Go 套餐剩余额度',
        unitD: '天',
        unitH: '小时',
        unitM: '分',
      },
      en: {
        nav: 'OpenCode quota',
        title: 'OpenCode Go quota',
        description: 'Live remaining allowance of your OpenCode Go / Go Plus plan, read directly from the opencode.ai Console.',
        fiveHour: '5 hours',
        week: 'Week',
        month: 'Month',
        remaining: 'Left',
        used: 'Used',
        limit: 'Limit',
        resetsIn: 'Resets in',
        periodEnds: 'Period ends',
        plan: 'Plan',
        canceling: 'Cancels at period end',
        updated: 'Updated',
        refresh: 'Refresh',
        refreshing: 'Refreshing',
        loading: 'Reading quota…',
        unavailable: 'No quota data',
        missing: 'OPENCODE_GO_API_KEY is not configured',
        unauthorized: 'API key is invalid or expired',
        offline: 'Cannot reach opencode.ai',
        timeout: 'Request timed out',
        badResponse: 'Unexpected response',
        noSubscription: 'This account has no Go plan',
        footnote: 'Refreshes every 20 seconds; the API key stays in the host process and the browser only receives amounts and percentages.',
        group: 'OpenCode Go plan allowance',
        unitD: 'd',
        unitH: 'h',
        unitM: 'm',
      },
    }

    const CSS = `
.ogoq-page {
  display: flex; flex-direction: column; gap: 16px; width: 100%; max-width: 620px;
  padding-top: 20px; color: var(--dsw-alias-label-primary);
}
.ogoq-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
.ogoq-headText { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.ogoq-title { margin: 0; font-size: 15px; font-weight: 600; line-height: 1.35; }
.ogoq-desc { margin: 0; font-size: 12px; line-height: 1.5; color: var(--dsw-alias-label-secondary); }
.ogoq-refresh {
  flex: none; display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-l1); border-radius: 8px; background: transparent;
  color: var(--dsw-alias-label-primary); font: inherit; font-size: 12px; cursor: pointer;
}
.ogoq-refresh:hover { background: var(--dsw-alias-bg-layer-1); border-color: var(--dsw-alias-border-l2); }
.ogoq-refresh:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.ogoq-refresh:disabled { cursor: default; opacity: .6; }
.ogoq-spin { display: inline-block; animation: ogoq-spin 900ms linear infinite; }
@keyframes ogoq-spin { to { transform: rotate(360deg); } }
.ogoq-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 6px 10px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
.ogoq-pill {
  display: inline-flex; align-items: center; gap: 4px; padding: 1px 8px; border-radius: 999px;
  font-size: 11.5px; font-weight: 500; color: var(--dsw-alias-brand-primary);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);
}
.ogoq-pillMuted {
  color: var(--dsw-alias-state-warn-primary);
  background: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 12%, transparent);
}
.ogoq-dim { opacity: .8; }
.ogoq-meters { display: flex; flex-direction: column; gap: 10px; }
.ogoq-meter {
  display: flex; flex-direction: column; gap: 8px; padding: 12px 14px;
  border: 1px solid var(--dsw-alias-border-l1); border-radius: 12px; background: var(--dsw-alias-bg-layer-1);
}
.ogoq-meterHead { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.ogoq-meterLabel { font-size: 12.5px; font-weight: 500; }
.ogoq-meterPct { font-size: 17px; font-weight: 600; line-height: 1.2; font-variant-numeric: tabular-nums; }
.ogoq-track {
  height: 6px; border-radius: 999px; overflow: hidden; background: var(--dsw-alias-bg-layer-2);
  box-shadow: inset 0 0 0 1px var(--dsw-alias-border-l1);
}
.ogoq-fill { display: block; height: 100%; border-radius: 999px; transition: width 240ms ease; }
.ogoq-rows {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px 14px;
  margin: 0; font-size: 11.5px; font-variant-numeric: tabular-nums;
}
.ogoq-rows > div { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.ogoq-rows dt { margin: 0; color: var(--dsw-alias-label-secondary); }
.ogoq-rows dd { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ogoq-state {
  display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 22px 14px;
  border: 1px dashed var(--dsw-alias-border-l1); border-radius: 12px; text-align: center;
}
.ogoq-stateText { margin: 0; font-size: 12.5px; color: var(--dsw-alias-label-secondary); }
.ogoq-error { color: var(--dsw-alias-state-warn-primary); }
.ogoq-foot { margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--dsw-alias-label-secondary); opacity: .85; }
@media (max-width: 520px) { .ogoq-rows { grid-template-columns: repeat(auto-fit, minmax(96px, 1fr)); } }
@media (prefers-reduced-motion: reduce) {
  .ogoq-spin { animation: none; }
  .ogoq-fill { transition: none; }
}
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
        return new Intl.DateTimeFormat(undefined, {
          month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
        }).format(target)
      } catch {
        return new Date(target).toLocaleString()
      }
    }

    function productName(snapshot) {
      const raw = snapshot && typeof snapshot.product === 'string' ? snapshot.product : ''
      if (!raw) return '—'
      if (raw === 'go-plus') return 'Go Plus'
      if (raw === 'go') return 'Go'
      return raw.charAt(0).toUpperCase() + raw.slice(1)
    }

    function localeId(locale) {
      try {
        const snap = locale && typeof locale.getLocale === 'function' ? locale.getLocale() : null
        if (snap && typeof snap.active === 'string') return snap.active
        // Legacy snapshot shapes kept for older client-locale builds.
        if (snap && typeof snap.id === 'string') return snap.id
        if (snap && typeof snap.locale === 'string') return snap.locale
      } catch {
        /* fall through to the default */
      }
      return 'zh'
    }

    function translate(locale, key) {
      const id = localeId(locale)
      const dict = DICTS[id] || DICTS[String(id).split('-')[0]] || DICTS.zh
      return dict[key] ?? DICTS.zh[key] ?? key
    }

    function useTranslation(locale) {
      const [, bump] = React.useReducer((value) => value + 1, 0)

      React.useEffect(() => {
        if (!locale || typeof locale.subscribe !== 'function') return undefined
        return locale.subscribe(() => bump())
      }, [locale])

      return React.useCallback((key) => translate(locale, key), [locale])
    }

    function useUsage() {
      const [state, setState] = React.useState({ snapshot: null, failure: null, loading: true, busy: false })
      const trigger = React.useRef(null)

      React.useEffect(() => {
        let alive = true
        let timer = null

        const load = async (force) => {
          if (force && alive) setState((current) => ({ ...current, busy: true }))
          try {
            const response = await fetch(force ? `${ROUTE}?force=1` : ROUTE, {
              cache: 'no-store',
              headers: { accept: 'application/json' },
            })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const body = await response.json()
            if (!alive) return
            setState({ snapshot: body && typeof body === 'object' ? body : null, failure: null, loading: false, busy: false })
          } catch (error) {
            if (!alive) return
            setState((current) => ({
              snapshot: current.snapshot,
              failure: error instanceof Error ? error.message : String(error),
              loading: false,
              busy: false,
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

    function MeterCard({ label, meter, t }) {
      const pct = percentOf(meter)
      const rounded = pct === null ? null : Math.round(pct)
      const reset = meter && meter.resetsAt ? until(meter.resetsAt, t) ?? clock(meter.resetsAt) : '—'
      return h('section', { className: 'ogoq-meter' },
        h('div', { className: 'ogoq-meterHead' },
          h('span', { className: 'ogoq-meterLabel' }, label),
          h('span', { className: 'ogoq-meterPct', style: { color: tone(pct) } }, rounded === null ? '—' : `${rounded}%`)),
        h('div', {
          className: 'ogoq-track',
          role: 'progressbar',
          'aria-valuemin': 0,
          'aria-valuemax': 100,
          'aria-valuenow': rounded === null ? 0 : rounded,
          'aria-valuetext': rounded === null ? t('unavailable') : `${label} ${t('remaining')} ${rounded}%`,
        },
          h('span', {
            className: 'ogoq-fill',
            style: { width: `${rounded === null ? 0 : Math.max(2, rounded)}%`, background: tone(pct) },
          })),
        h('dl', { className: 'ogoq-rows' },
          h('div', null,
            h('dt', null, t('remaining')),
            h('dd', null, meter ? `${money(meter.remaining)} / ${money(meter.limit)}` : '—')),
          h('div', null,
            h('dt', null, t('used')),
            h('dd', null, meter ? money(meter.used) : '—')),
          h('div', null,
            h('dt', null, t('resetsIn')),
            h('dd', null, reset))))
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
      if (code === 'pending') return t('loading')
      return t('unavailable')
    }

    function RefreshButton({ busy, refresh, t }) {
      return h('button', {
        type: 'button',
        className: 'ogoq-refresh',
        onClick: refresh,
        disabled: busy,
        title: t('refresh'),
      },
        h('span', { className: busy ? 'ogoq-spin' : undefined, 'aria-hidden': true }, '↻'),
        h('span', null, busy ? t('refreshing') : t('refresh')))
    }

    function QuotaSettingsPage(props) {
      const locale = props && props.locale ? props.locale : null
      const t = useTranslation(locale)
      const [state, refresh] = useUsage()

      const snapshot = state.snapshot
      const ok = Boolean(snapshot && snapshot.ok)
      const meters = ok && snapshot.meters ? snapshot.meters : null
      const failure = ok
        ? null
        : snapshot
          ? describeFailure(snapshot, t)
          : state.failure
            ? t('offline')
            : t('loading')

      const meta = ok
        ? [
          h('span', { key: 'plan', className: 'ogoq-pill' }, `${t('plan')} ${productName(snapshot)}`),
          snapshot.cancelAtPeriodEnd
            ? h('span', { key: 'cancel', className: 'ogoq-pill ogoq-pillMuted' }, t('canceling'))
            : null,
          snapshot.period && snapshot.period.endsAt
            ? h('span', { key: 'end' }, `${t('periodEnds')} ${clock(snapshot.period.endsAt)}`)
            : null,
          h('span', { key: 'updated', className: 'ogoq-dim' }, `${t('updated')} ${clock(snapshot.fetchedAt)}`),
        ].filter(Boolean)
        : null

      return h('div', { className: 'ogoq-page' },
        h('style', null, CSS),
        h('header', { className: 'ogoq-head' },
          h('div', { className: 'ogoq-headText' },
            h('h2', { className: 'ogoq-title' }, t('title')),
            h('p', { className: 'ogoq-desc' }, t('description'))),
          h(RefreshButton, { busy: state.busy, refresh, t })),
        meta && meta.length > 0
          ? h('div', { className: 'ogoq-meta', role: 'group', 'aria-label': t('group') }, meta)
          : null,
        ok
          ? h('div', {
            className: 'ogoq-meters',
            role: 'group',
            'aria-label': t('group'),
          },
            h(MeterCard, { label: t('fiveHour'), meter: meters ? meters.fiveHour : null, t }),
            h(MeterCard, { label: t('week'), meter: meters ? meters.week : null, t }),
            h(MeterCard, { label: t('month'), meter: meters ? meters.month : null, t }))
          : h('div', { className: 'ogoq-state' },
            h('p', { className: state.failure || (snapshot && !ok) ? 'ogoq-stateText ogoq-error' : 'ogoq-stateText' }, failure),
            state.failure || (snapshot && !ok)
              ? h(RefreshButton, { busy: state.busy, refresh, t })
              : null),
        h('p', { className: 'ogoq-foot' }, t('footnote')))
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

        ctx.slots.inject('settings.section', () => ctx.slots.register({
          name: 'settings.section',
          id: SECTION_ID,
          order: 25,
          label: () => translate(locale, 'nav'),
        }, (props) => h(QuotaSettingsPage, { ...props, locale })))
      },
    }
  },
})
