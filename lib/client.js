window.__ModuleLoader__.load({
  id: 'dsh-plus',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;

    var react = require('react');
    var h = react.createElement;
    var useState = react.useState;
    var useEffect = react.useEffect;

    var css = {
      panel: { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13 },
      tabs: { display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' },
      tab: { padding: '4px 12px', borderRadius: 999, border: '1px solid var(--dsw-alias-border-l2, #ddd)', background: 'none', cursor: 'pointer', fontSize: 12 },
      tabActive: { background: 'var(--dsw-alias-interactive-bg-active, #eee)' },
      row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--dsw-alias-border-l1, #eee)' },
      label: { fontSize: 13 },
      hint: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary, #999)' },
      input: { padding: '6px 10px', borderRadius: 8, border: '1px solid var(--dsw-alias-border-l2, #ddd)', fontSize: 13, background: 'var(--dsw-alias-bg-base, #fff)', color: 'var(--dsw-alias-label-primary, #222)', width: '100%' },
      btn: { padding: '6px 14px', borderRadius: 8, border: '1px solid var(--dsw-alias-border-l2, #ddd)', background: 'none', cursor: 'pointer', fontSize: 13 },
      btnPrimary: { background: 'var(--dsw-alias-interactive-bg-active, #eee)', borderColor: 'var(--dsw-alias-interactive-border, #bbb)' },
      sectionTitle: { fontSize: 12, fontWeight: 600, margin: '12px 0 2px', color: 'var(--dsw-alias-label-secondary, #555)' },
      ok: { fontSize: 12, color: 'var(--dsw-alias-state-success, #2a7)' },
      err: { fontSize: 12, color: 'var(--dsw-alias-state-error, #c33)' },
      card: { border: '1px solid var(--dsw-alias-border-l1, #eee)', borderRadius: 8, padding: '10px 12px' },
      cardTitle: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, fontSize: 14, fontWeight: 600 },
      cardContent: { fontSize: 12, color: 'var(--dsw-alias-label-secondary, #555)', marginBottom: 4 },
      badge: { fontSize: 11, color: 'var(--dsw-alias-label-tertiary, #999)' },
    };

    function Toggle(props) {
      return h('label', { style: css.row },
        h('div', null, h('div', { style: css.label }, props.label), props.hint ? h('div', { style: css.hint }, props.hint) : null),
        h('input', { type: 'checkbox', checked: !!props.checked, onChange: function (e) { props.onChange(e.target.checked); } })
      );
    }

    function Num(props) {
      return h('div', { style: css.row },
        h('div', null, h('div', { style: css.label }, props.label), props.hint ? h('div', { style: css.hint }, props.hint) : null),
        h('input', { type: 'number', value: props.value, style: Object.assign({}, css.input, { width: 110 }), onChange: function (e) { props.onChange(e.target.value); } })
      );
    }

    function Text(props) {
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 6 } },
        h('span', { style: css.label }, props.label),
        h('input', { type: props.type || 'text', value: props.value || '', placeholder: props.placeholder || '', style: css.input, onChange: function (e) { props.onChange(e.target.value); } }),
        props.hint ? h('span', { style: css.hint }, props.hint) : null
      );
    }

    function Select(props) {
      return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 6 } },
        h('span', { style: css.label }, props.label),
        h('select', { value: props.value, style: css.input, onChange: function (e) { props.onChange(e.target.value); } },
          props.options.map(function (o) { return h('option', { key: o.value, value: o.value }, o.label); })
        )
      );
    }

    // ---- 视觉（modlens）----
    function VisionTab() {
      var [provider, setProvider] = useState('openai');
      var [baseUrl, setBaseUrl] = useState('');
      var [apiKey, setApiKey] = useState('');
      var [model, setModel] = useState('');
      var [reuse, setReuse] = useState({ codex: false, opencode: false, pi: false, grok: false });
      var [msg, setMsg] = useState('');
      var [err, setErr] = useState('');

      useEffect(function () {
        fetch('/api/dsh-plus/modlens').then(function (r) { return r.json(); }).then(function (d) {
          var c = d.config || {};
          setProvider(c.provider || 'openai');
          var p = (c.providers && c.providers[c.provider]) || {};
          setBaseUrl(p.baseUrl || '');
          setApiKey(p.apiKey || '');
          setModel(p.model || '');
          setReuse(Object.assign({ codex: false, opencode: false, pi: false, grok: false }, c.reuse || {}));
        }).catch(function () {});
      }, []);

      function save() {
        var prov = {};
        prov[provider] = { baseUrl: baseUrl, apiKey: apiKey, model: model };
        var body = { provider: provider, providers: prov, reuse: reuse };
        fetch('/api/dsh-plus/modlens', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }).then(function (r) { return r.json(); }).then(function (d) {
          if (d.ok) { setMsg('已保存'); setErr(''); setTimeout(function () { setMsg(''); }, 1500); }
          else { setErr(d.error || '保存失败'); }
        }).catch(function (e) { setErr('保存失败：' + e.message); });
      }

      return h('div', { style: css.panel },
        Select({
          label: '首选视觉引擎 (provider)',
          value: provider,
          onChange: setProvider,
          options: [
            { value: 'openai', label: 'openai（OpenAI 兼容，如 qwen-vl / GLM / 自建）' },
            { value: 'anthropic', label: 'anthropic' },
            { value: 'gemini-api', label: 'gemini-api' },
            { value: 'antigravity-cli', label: 'antigravity-cli（免费无 key）' }
          ]
        }),
        provider === 'openai' ? Text({ label: 'Base URL', value: baseUrl, onChange: setBaseUrl, hint: '如 https://dashscope.aliyuncs.com/compatible-mode/v1' }) : null,
        provider !== 'antigravity-cli' ? Text({ label: 'API Key', type: 'password', value: apiKey, onChange: setApiKey, hint: '显示为掩码；留空或含 *** 表示不修改' }) : null,
        provider !== 'antigravity-cli' ? Text({ label: '模型名', value: model, onChange: setModel, hint: '如 qwen-vl-max' }) : null,
        h('div', { style: css.sectionTitle }, '复用本机其它 CLI 的登录'),
        Toggle({ label: '复用 Codex', checked: reuse.codex, onChange: function (v) { setReuse(Object.assign({}, reuse, { codex: v })); } }),
        Toggle({ label: '复用 OpenCode', checked: reuse.opencode, onChange: function (v) { setReuse(Object.assign({}, reuse, { opencode: v })); } }),
        Toggle({ label: '复用 Pi', checked: reuse.pi, onChange: function (v) { setReuse(Object.assign({}, reuse, { pi: v })); } }),
        Toggle({ label: '复用 Grok', checked: reuse.grok, onChange: function (v) { setReuse(Object.assign({}, reuse, { grok: v })); } }),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 } },
          h('button', { style: Object.assign({}, css.btn, css.btnPrimary), onClick: save }, '保存'),
          msg ? h('span', { style: css.ok }, msg) : null,
          err ? h('span', { style: css.err }, err) : null
        ),
        h('div', { style: Object.assign({}, css.hint, { marginTop: 8 }) }, '改完即时生效（下次读图时生效）。')
      );
    }

    // ---- 记忆（mneme）----
    function MemoryTab() {
      var [cfg, setCfg] = useState(null);
      var [msg, setMsg] = useState('');
      var [err, setErr] = useState('');

      useEffect(function () {
        fetch('/api/dsh-plus/mneme').then(function (r) { return r.json(); }).then(function (d) {
          setCfg(d.config || {});
        }).catch(function () {});
      }, []);

      function patch(k, v) { var n = Object.assign({}, cfg); n[k] = v; setCfg(n); }

      function save() {
        fetch('/api/dsh-plus/mneme', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cfg || {})
        }).then(function (r) { return r.json(); }).then(function (d) {
          if (d.ok) { setMsg('已保存'); setErr(''); setTimeout(function () { setMsg(''); }, 1500); }
          else { setErr(d.error || '保存失败'); }
        }).catch(function (e) { setErr('保存失败：' + e.message); });
      }

      if (!cfg) return h('div', { style: css.hint }, '加载中…');

      return h('div', { style: css.panel },
        Toggle({ label: '自动注入记忆', hint: '每轮把高优先级记忆注入到 Agent', checked: !!cfg.autoInject, onChange: function (v) { patch('autoInject', v); } }),
        Toggle({ label: '自动总结会话', hint: '会话结束时自动生成摘要', checked: !!cfg.autoSummarize, onChange: function (v) { patch('autoSummarize', v); } }),
        Num({ label: '注入条数上限', value: cfg.maxInjectedItems, onChange: function (v) { patch('maxInjectedItems', Number(v)); } }),
        Num({ label: '重要性阈值', hint: '1-5，≥ 该值的记忆才会自动注入', value: cfg.importanceThreshold, onChange: function (v) { patch('importanceThreshold', Number(v)); } }),
        h('div', { style: css.sectionTitle }, '自动做梦（dream 整理）'),
        Toggle({ label: '启用自动整理', checked: !!cfg.autoDream, onChange: function (v) { patch('autoDream', v); } }),
        Num({ label: '触发条数阈值', value: cfg.dreamThresholdCount, onChange: function (v) { patch('dreamThresholdCount', Number(v)); } }),
        Num({ label: '触发字数阈值', value: cfg.dreamThresholdChars, onChange: function (v) { patch('dreamThresholdChars', Number(v)); } }),
        Num({ label: '延迟 (ms)', value: cfg.dreamDelayMs, onChange: function (v) { patch('dreamDelayMs', Number(v)); } }),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 } },
          h('button', { style: Object.assign({}, css.btn, css.btnPrimary), onClick: save }, '保存'),
          msg ? h('span', { style: css.ok }, msg) : null,
          err ? h('span', { style: css.err }, err) : null
        ),
        h('div', { style: Object.assign({}, css.hint, { marginTop: 8 }) }, '保存写入 cordis.patch.yml；若未即时生效，请重启引擎。')
      );
    }

    // ---- 插件市场 ----
    function MarketPanel() {
      var [query, setQuery] = useState('');
      var [results, setResults] = useState([]);
      var [installed, setInstalled] = useState([]);
      var [loading, setLoading] = useState(false);
      var [err, setErr] = useState('');
      var [busy, setBusy] = useState('');

      function loadInstalled() {
        fetch('/api/dsh-plus/plugins/installed').then(function (r) { return r.json(); }).then(function (d) { setInstalled(d.items || []); }).catch(function () {});
      }
      useEffect(function () { loadInstalled(); }, []);

      function search() {
        setLoading(true); setErr('');
        fetch('/api/dsh-plus/plugins?q=' + encodeURIComponent(query.trim()) + '&limit=15')
          .then(function (r) { return r.json(); })
          .then(function (d) { setResults(d.items || []); if (d.error) setErr(d.error); })
          .catch(function (e) { setErr(e.message); })
          .then(function () { setLoading(false); });
      }

      function install(spec) {
        setBusy(spec); setErr('');
        fetch('/api/dsh-plus/plugins/install', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ spec: spec }) })
          .then(function (r) { return r.json(); })
          .then(function (d) { if (d.ok) loadInstalled(); else setErr(String(d.output || d.error || '安装失败').slice(0, 600)); })
          .catch(function (e) { setErr(e.message); })
          .then(function () { setBusy(''); });
      }

      function isInstalled(name) {
        for (var i = 0; i < installed.length; i++) if (installed[i].name === name) return true;
        return false;
      }

      return h('div', { style: css.panel },
        h('div', { style: { display: 'flex', gap: 6, marginBottom: 8 } },
          h('input', { value: query, placeholder: '搜索插件…（留空=热门）', style: Object.assign({}, css.input, { flex: 1, marginBottom: 0 }), onChange: function (e) { setQuery(e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter') search(); } }),
          h('button', { style: css.btn, onClick: search }, loading ? '…' : '搜索')
        ),
        err ? h('div', { style: Object.assign({}, css.err, { marginBottom: 8 }) }, err) : null,
        h('div', { style: css.sectionTitle }, '发现'),
        loading ? h('div', { style: css.hint }, '搜索中…')
          : results.length === 0 ? h('div', { style: css.hint }, '暂无结果（点搜索）')
          : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' } },
              results.map(function (p) {
                return h('div', { key: p.install, style: css.card },
                  h('div', { style: css.cardTitle },
                    h('span', null, p.name),
                    h('span', { style: css.badge }, '★ ' + p.stars)
                  ),
                  h('div', { style: css.cardContent }, p.description || ''),
                  h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 } },
                    h('a', { href: p.url, target: '_blank', rel: 'noopener noreferrer', style: { fontSize: 11, color: 'var(--dsw-alias-interactive, #5b7cfa)' } }, p.owner + '/' + p.name),
                    isInstalled(p.name)
                      ? h('span', { style: css.ok }, '已安装')
                      : h('button', { style: css.btn, disabled: !!busy, onClick: function () { install(p.install); } }, busy === p.install ? '安装中…' : '安装')
                  )
                );
              })
            ),
        h('div', { style: css.sectionTitle }, '已安装 (' + installed.length + ')'),
        installed.length === 0 ? h('div', { style: css.hint }, '无')
          : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 2 } },
              installed.map(function (p) {
                return h('div', { key: p.name, style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--dsw-alias-border-l1, #eee)' } },
                  h('span', null, p.name),
                  h('span', { style: css.hint }, p.version)
                );
              })
            ),
        h('div', { style: { marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' } },
          h('button', { style: Object.assign({}, css.btn, css.btnPrimary), onClick: function () { fetch('/api/dsh-plus/restart', { method: 'POST' }).catch(function () {}); } }, '重启生效'),
          h('span', { style: css.hint }, '重启引擎并刷新窗口，加载新装插件')
        ),
        h('div', { style: Object.assign({}, css.hint, { marginTop: 8 }) }, '提示：第三方代码，安装前请查看源码并建议固定 commit。')
      );
    }

    // ---- 本地模型 ----
    function LocalModelsTab() {
      var [servers, setServers] = useState([]);
      var [configured, setConfigured] = useState([]);
      var [loading, setLoading] = useState(false);
      var [msg, setMsg] = useState('');
      var [err, setErr] = useState('');

      function load() {
        setLoading(true); setErr('');
        fetch('/api/dsh-plus/local-models').then(function (r) { return r.json(); }).then(function (d) {
          setServers(d.servers || []);
          setConfigured(d.configured || []);
        }).catch(function (e) { setErr(e.message); }).then(function () { setLoading(false); });
      }
      useEffect(function () { load(); }, []);

      function addModel(server, modelId) {
        var p = { id: server.id, displayName: server.name, baseURL: server.baseURL, models: [{ id: modelId, name: modelId }] };
        fetch('/api/dsh-plus/local-models', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) })
          .then(function (r) { return r.json(); })
          .then(function (d) { if (d.ok) { setMsg('已添加，重启生效'); setErr(''); load(); } else setErr(d.error || '添加失败'); })
          .catch(function (e) { setErr(e.message); });
      }

      function removeModel(id) {
        fetch('/api/dsh-plus/local-models?id=' + encodeURIComponent(id), { method: 'DELETE' })
          .then(function (r) { return r.json(); })
          .then(function (d) { if (d.ok) { setMsg('已移除'); setErr(''); load(); } else setErr(d.error || '移除失败'); })
          .catch(function (e) { setErr(e.message); });
      }

      function isAdded(serverId, modelId) {
        for (var i = 0; i < configured.length; i++) {
          var c = configured[i];
          if (c.id === serverId) {
            for (var j = 0; j < (c.models || []).length; j++) if (c.models[j].id === modelId) return true;
          }
        }
        return false;
      }

      return h('div', { style: css.panel },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' } },
          h('button', { style: css.btn, onClick: load, disabled: loading }, loading ? '探测中…' : '重新探测'),
          msg ? h('span', { style: css.ok }, msg) : null,
          err ? h('span', { style: css.err }, err) : null
        ),
        h('div', { style: css.hint }, '自动探测本机 ollama(11434) / LM Studio(1234)；添加后重启引擎生效。'),

        loading ? h('div', { style: css.hint }, '探测中…')
          : servers.length === 0 ? h('div', { style: css.hint }, '未检测到运行中的本地服务（请先启动 ollama 或 LM Studio）')
          : servers.map(function (s) {
              return h('div', { key: s.id, style: { marginBottom: 10 } },
                h('div', { style: css.sectionTitle }, s.name + '（' + s.models.length + ' 个模型）'),
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
                  s.models.map(function (m) {
                    var added = isAdded(s.id, m);
                    return h('div', { key: m, style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, padding: '4px 8px', border: '1px solid var(--dsw-alias-border-l1, #eee)', borderRadius: 6 } },
                      h('span', { style: { fontFamily: 'monospace' } }, m),
                      added ? h('span', { style: css.ok }, '已添加') : h('button', { style: css.btn, onClick: function () { addModel(s, m); } }, '添加')
                    );
                  })
                )
              );
            }),

        h('div', { style: css.sectionTitle }, '已配置的本地模型'),
        configured.length === 0 ? h('div', { style: css.hint }, '无')
          : configured.map(function (c) {
              return h('div', { key: c.id, style: { marginBottom: 8 } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } },
                  h('span', { style: { fontSize: 13, fontWeight: 600 } }, c.displayName),
                  h('button', { style: Object.assign({}, css.btn, { color: 'var(--dsw-alias-state-error, #c33)' }), onClick: function () { removeModel(c.id); } }, '移除')
                ),
                h('div', { style: css.hint }, c.baseURL),
                (c.models || []).map(function (m) { return h('div', { key: m.id, style: { fontSize: 12, paddingLeft: 8 } }, '- ' + m.id); })
              );
            })
      );
    }

    // ---- 设置面板入口（四个 tab）----
    function SettingsPanel() {
      var [tab, setTab] = useState('vision');
      return h('div', { style: { padding: 4 } },
        h('div', { style: css.tabs },
          h('button', { style: Object.assign({}, css.tab, tab === 'vision' ? css.tabActive : {}), onClick: function () { setTab('vision'); } }, '视觉 (modlens)'),
          h('button', { style: Object.assign({}, css.tab, tab === 'memory' ? css.tabActive : {}), onClick: function () { setTab('memory'); } }, '记忆 (mneme)'),
          h('button', { style: Object.assign({}, css.tab, tab === 'market' ? css.tabActive : {}), onClick: function () { setTab('market'); } }, '插件市场'),
          h('button', { style: Object.assign({}, css.tab, tab === 'local' ? css.tabActive : {}), onClick: function () { setTab('local'); } }, '本地模型')
        ),
        tab === 'vision' ? h(VisionTab) : tab === 'memory' ? h(MemoryTab) : tab === 'market' ? h(MarketPanel) : h(LocalModelsTab)
      );
    }

    exports.apply = function (ctx) {
      ctx.effect(function () {
        return ctx.slots.register({
          name: 'settings.section',
          id: 'dsh-plus',
          label: function () { return '视觉 / 记忆 / 插件 / 本地模型'; },
          inject: function () { return {}; }
        }, function () { return h(SettingsPanel); });
      }, 'dsh-plus: settings section');
    };

    exports.inject = ['slots'];
    return module.exports;
  }
});
