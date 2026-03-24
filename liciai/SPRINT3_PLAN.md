# Sprint 3 - API e UX de Uso Diário
**Status:** 🟡 Próxima  
**Duração estimada:** 1-2 semanas  
**Dependências:** Sprint 1 ✅  
**Pode executar em paralelo com:** Sprint 2 (config externa)

---

## 📋 BACKLOG DETALHADO

### EPIC 1: Paginação e Performance (3 dias)

#### Task 1.1: Adicionar paginação ao endpoint `/oportunidades`
**Arquivo:** `functions/src/index.ts`  
**Estimativa:** 2h

```typescript
// Adicionar ao endpoint GET /oportunidades
app.get('/oportunidades', userPlanMiddleware, oportunidadesQuotaMiddleware, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;
  const clienteId = req.user?.uid;
  
  // Query com LIMIT/OFFSET
  const query = `
    SELECT * FROM \`${GCP_PROJECT_ID}.core.fn_get_scored_opportunities\`(@cliente_id)
    ORDER BY score DESC
    LIMIT @limit OFFSET @offset
  `;
  
  const options = {
    query,
    params: { cliente_id: clienteId, limit, offset },
    location: BIGQUERY_LOCATION
  };
  
  const [rows] = await bq.query(options);
  
  // Count total (cache por 5 minutos)
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM \`${GCP_PROJECT_ID}.core.fn_get_scored_opportunities\`(@cliente_id)
  `;
  const [countRows] = await bq.query({
    query: countQuery,
    params: { cliente_id: clienteId },
    location: BIGQUERY_LOCATION
  });
  
  const total = countRows[0].total;
  
  res.set('X-Total-Count', total.toString());
  res.json({
    data: rows,
    pagination: {
      total,
      limit,
      offset,
      has_next: (offset + limit) < total
    }
  });
});
```

**Testes:**
- [ ] `GET /oportunidades?limit=10&offset=0` retorna 10 registros
- [ ] Header `X-Total-Count` presente
- [ ] `pagination.has_next` correto
- [ ] `limit > 200` clamped para 200

---

#### Task 1.2: Criar índice de performance
**Arquivo:** BigQuery Console  
**Estimativa:** 30min

```sql
-- Clustering em v_oportunidades_15d (se não existir)
CREATE OR REPLACE VIEW `uniquex-487718.core.v_oportunidades_15d`
PARTITION BY DATE(data_abertura_proposta)
CLUSTER BY uf, modalidade_nome
AS
SELECT * FROM `uniquex-487718.core.contratacoes`
WHERE data_abertura_proposta >= DATE_SUB(CURRENT_DATE(), INTERVAL 15 DAY);
```

---

### EPIC 2: Filtros Avançados (4 dias)

#### Task 2.1: Backend - Filtros por UF/Modalidade/Valor/Data
**Arquivo:** `functions/src/index.ts`  
**Estimativa:** 4h

```typescript
app.get('/oportunidades', userPlanMiddleware, oportunidadesQuotaMiddleware, async (req, res) => {
  const clienteId = req.user?.uid;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  const offset = parseInt(req.query.offset as string) || 0;
  
  // Parse filtros
  const filtros = {
    ufs: req.query.uf ? (req.query.uf as string).split(',') : null,
    modalidades: req.query.modalidade ? (req.query.modalidade as string).split(',') : null,
    valor_min: req.query.valor_min ? parseFloat(req.query.valor_min as string) : null,
    valor_max: req.query.valor_max ? parseFloat(req.query.valor_max as string) : null,
    prazo_minimo: req.query.prazo_minimo ? req.query.prazo_minimo as string : null,
  };
  
  // Build WHERE clause dinamicamente
  const conditions = ['TRUE']; // sempre verdadeiro
  const params: any = { cliente_id: clienteId, limit, offset };
  
  if (filtros.ufs && filtros.ufs.length > 0) {
    conditions.push('uf IN UNNEST(@ufs)');
    params.ufs = filtros.ufs;
  }
  
  if (filtros.modalidades && filtros.modalidades.length > 0) {
    conditions.push('modalidade_nome IN UNNEST(@modalidades)');
    params.modalidades = filtros.modalidades;
  }
  
  if (filtros.valor_min !== null) {
    conditions.push('valor_total_estimado >= @valor_min');
    params.valor_min = filtros.valor_min;
  }
  
  if (filtros.valor_max !== null) {
    conditions.push('valor_total_estimado <= @valor_max');
    params.valor_max = filtros.valor_max;
  }
  
  if (filtros.prazo_minimo) {
    conditions.push('data_abertura_proposta >= @prazo_minimo');
    params.prazo_minimo = filtros.prazo_minimo;
  }
  
  const whereClause = conditions.join(' AND ');
  
  const query = `
    WITH scored AS (
      SELECT * FROM \`${GCP_PROJECT_ID}.core.fn_get_scored_opportunities\`(@cliente_id)
    )
    SELECT * FROM scored
    WHERE ${whereClause}
    ORDER BY score DESC
    LIMIT @limit OFFSET @offset
  `;
  
  const [rows] = await bq.query({ query, params, location: BIGQUERY_LOCATION });
  
  // Count com filtros
  const countQuery = `
    WITH scored AS (
      SELECT * FROM \`${GCP_PROJECT_ID}.core.fn_get_scored_opportunities\`(@cliente_id)
    )
    SELECT COUNT(*) as total FROM scored WHERE ${whereClause}
  `;
  const [countRows] = await bq.query({ 
    query: countQuery, 
    params: {...params, limit: undefined, offset: undefined}, 
    location: BIGQUERY_LOCATION 
  });
  
  const total = countRows[0].total;
  
  // Log telemetria
  await bq.dataset(DATASET_LOG).table('audit_user_actions').insert([{
    event_id: randomUUID(),
    tenant_id: clienteId,
    acao: 'filtro_aplicado',
    detalhes: JSON.stringify({ filtros, total_resultados: total }),
    criado_em: new Date().toISOString(),
  }]);
  
  res.set('X-Total-Count', total.toString());
  res.json({
    data: rows,
    pagination: { total, limit, offset, has_next: (offset + limit) < total },
    filters_applied: filtros
  });
});
```

**Testes:**
- [ ] `?uf=SP,RJ` retorna apenas SP e RJ
- [ ] `?valor_min=10000&valor_max=50000` filtra corretamente
- [ ] `?prazo_minimo=2026-04-01` retorna apenas futuras
- [ ] Combinação de múltiplos filtros funciona
- [ ] Log em `audit_user_actions` criado

---

#### Task 2.2: Frontend - UI de Filtros
**Arquivo:** `public/index.html`  
**Estimativa:** 6h

```html
<!-- Adicionar antes da lista de oportunidades -->
<div id="filtros-panel" class="panel rounded-2xl p-5 mb-4">
  <h3 class="text-lg font-bold mb-4" style="color:var(--text)">Filtros</h3>
  
  <!-- UF -->
  <div class="mb-4">
    <label class="text-sm font-medium" style="color:var(--text)">Estados (UF)</label>
    <select id="filter-uf" multiple class="w-full mt-2 p-2 rounded-lg" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)">
      <option value="SP">São Paulo</option>
      <option value="RJ">Rio de Janeiro</option>
      <option value="MG">Minas Gerais</option>
      <option value="RS">Rio Grande do Sul</option>
      <option value="PR">Paraná</option>
      <!-- Adicionar outros estados -->
    </select>
  </div>
  
  <!-- Modalidade -->
  <div class="mb-4">
    <label class="text-sm font-medium" style="color:var(--text)">Modalidade</label>
    <div class="mt-2 space-y-2">
      <label class="flex items-center">
        <input type="checkbox" name="modalidade" value="pregao_eletronico" class="mr-2">
        <span class="text-sm" style="color:var(--muted)">Pregão Eletrônico</span>
      </label>
      <label class="flex items-center">
        <input type="checkbox" name="modalidade" value="concorrencia" class="mr-2">
        <span class="text-sm" style="color:var(--muted)">Concorrência</span>
      </label>
      <label class="flex items-center">
        <input type="checkbox" name="modalidade" value="dispensa" class="mr-2">
        <span class="text-sm" style="color:var(--muted)">Dispensa</span>
      </label>
    </div>
  </div>
  
  <!-- Valor -->
  <div class="mb-4">
    <label class="text-sm font-medium" style="color:var(--text)">Valor Estimado (R$)</label>
    <div class="flex gap-2 mt-2">
      <input type="number" id="filter-valor-min" placeholder="Mínimo" class="flex-1 p-2 rounded-lg" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)" min="0">
      <input type="number" id="filter-valor-max" placeholder="Máximo" class="flex-1 p-2 rounded-lg" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)" min="0">
    </div>
  </div>
  
  <!-- Data -->
  <div class="mb-4">
    <label class="text-sm font-medium" style="color:var(--text)">Abertura a partir de</label>
    <input type="date" id="filter-prazo-minimo" class="w-full mt-2 p-2 rounded-lg" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)">
  </div>
  
  <!-- Ações -->
  <div class="flex gap-2">
    <button id="btn-aplicar-filtros" class="flex-1 px-4 py-2 rounded-lg font-medium" style="background:var(--gold);color:#000">
      Aplicar Filtros
    </button>
    <button id="btn-limpar-filtros" class="px-4 py-2 rounded-lg font-medium" style="background:rgba(255,255,255,.05);color:var(--text)">
      Limpar
    </button>
  </div>
  
  <!-- Resultados -->
  <div id="filter-results" class="mt-3 text-sm" style="color:var(--muted)">
    <!-- Preenchido dinamicamente: "152 oportunidades encontradas" -->
  </div>
</div>

<script>
// Aplicar filtros
document.getElementById('btn-aplicar-filtros').addEventListener('click', async () => {
  const ufs = Array.from(document.getElementById('filter-uf').selectedOptions).map(o => o.value);
  const modalidades = Array.from(document.querySelectorAll('input[name="modalidade"]:checked')).map(i => i.value);
  const valorMin = document.getElementById('filter-valor-min').value;
  const valorMax = document.getElementById('filter-valor-max').value;
  const prazoMinimo = document.getElementById('filter-prazo-minimo').value;
  
  // Build query params
  const params = new URLSearchParams();
  if (ufs.length > 0) params.set('uf', ufs.join(','));
  if (modalidades.length > 0) params.set('modalidade', modalidades.join(','));
  if (valorMin) params.set('valor_min', valorMin);
  if (valorMax) params.set('valor_max', valorMax);
  if (prazoMinimo) params.set('prazo_minimo', prazoMinimo);
  
  // Update URL (persistência)
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState({}, '', newUrl);
  
  // Fetch com filtros
  await loadOportunidades(params);
});

// Limpar filtros
document.getElementById('btn-limpar-filtros').addEventListener('click', () => {
  document.getElementById('filter-uf').selectedIndex = -1;
  document.querySelectorAll('input[name="modalidade"]').forEach(i => i.checked = false);
  document.getElementById('filter-valor-min').value = '';
  document.getElementById('filter-valor-max').value = '';
  document.getElementById('filter-prazo-minimo').value = '';
  
  window.history.pushState({}, '', window.location.pathname);
  loadOportunidades(new URLSearchParams());
});

// Load inicial com filtros da URL
window.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  
  // Preencher filtros da URL
  if (params.has('uf')) {
    const ufs = params.get('uf').split(',');
    const select = document.getElementById('filter-uf');
    Array.from(select.options).forEach(o => {
      if (ufs.includes(o.value)) o.selected = true;
    });
  }
  
  if (params.has('modalidade')) {
    const modalidades = params.get('modalidade').split(',');
    document.querySelectorAll('input[name="modalidade"]').forEach(i => {
      if (modalidades.includes(i.value)) i.checked = true;
    });
  }
  
  if (params.has('valor_min')) document.getElementById('filter-valor-min').value = params.get('valor_min');
  if (params.has('valor_max')) document.getElementById('filter-valor-max').value = params.get('valor_max');
  if (params.has('prazo_minimo')) document.getElementById('filter-prazo-minimo').value = params.get('prazo_minimo');
  
  loadOportunidades(params);
});

async function loadOportunidades(params) {
  const loading = document.getElementById('loading-state');
  const emptyState = document.getElementById('empty-state');
  const content = document.getElementById('oportunidades-list');
  
  loading.classList.remove('hidden');
  content.classList.add('hidden');
  emptyState.classList.add('hidden');
  
  try {
    const token = await firebase.auth().currentUser.getIdToken();
    const url = `${API_URL}/oportunidades?${params.toString()}`;
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error('Falha ao carregar');
    
    const data = await response.json();
    const total = response.headers.get('X-Total-Count') || data.pagination?.total || 0;
    
    // Update resultados
    document.getElementById('filter-results').textContent = `${total} oportunidades encontradas`;
    
    if (data.data.length === 0) {
      loading.classList.add('hidden');
      emptyState.classList.remove('hidden');
    } else {
      // Renderizar oportunidades
      renderOportunidades(data.data);
      loading.classList.add('hidden');
      content.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Erro ao carregar:', error);
    loading.classList.add('hidden');
    // Mostrar error state
  }
}
</script>
```

**Testes:**
- [ ] Filtros preenchem da URL ao carregar
- [ ] Aplicar filtros atualiza URL
- [ ] Limpar filtros reseta tudo
- [ ] Contador "X oportunidades encontradas" correto
- [ ] Loading/empty/error states funcionam

---

### EPIC 3: Estados de Interface (2 dias)

#### Task 3.1: Loading State (Skeleton)
**Estimativa:** 2h

```html
<div id="loading-state" class="hidden">
  <div class="panel rounded-2xl p-5 mb-4 animate-pulse">
    <div class="h-4 bg-gray-700 rounded w-3/4 mb-3"></div>
    <div class="h-3 bg-gray-800 rounded w-1/2 mb-2"></div>
    <div class="h-3 bg-gray-800 rounded w-2/3"></div>
  </div>
  <!-- Repetir 5x -->
</div>
```

#### Task 3.2: Empty State
**Estimativa:** 1h

```html
<div id="empty-state" class="hidden text-center py-12">
  <svg class="w-16 h-16 mx-auto mb-4" style="color:var(--muted)" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
  </svg>
  <h3 class="text-lg font-bold mb-2" style="color:var(--text)">Nenhuma oportunidade encontrada</h3>
  <p class="text-sm mb-4" style="color:var(--muted)">Tente ajustar os filtros ou expandir a busca.</p>
  <button onclick="document.getElementById('btn-limpar-filtros').click()" class="px-4 py-2 rounded-lg font-medium" style="background:var(--gold);color:#000">
    Limpar Filtros
  </button>
</div>
```

#### Task 3.3: Error State com Retry
**Estimativa:** 1h

```html
<div id="error-state" class="hidden text-center py-12">
  <svg class="w-16 h-16 mx-auto mb-4" style="color:#EF4444" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
  </svg>
  <h3 class="text-lg font-bold mb-2" style="color:var(--text)">Erro ao carregar oportunidades</h3>
  <p class="text-sm mb-4" style="color:var(--muted)" id="error-message">Tente novamente em alguns instantes.</p>
  <button onclick="location.reload()" class="px-4 py-2 rounded-lg font-medium" style="background:rgba(255,255,255,.05);color:var(--text)">
    Tentar Novamente
  </button>
</div>
```

---

### EPIC 4: Explicabilidade do Score (1 dia)

#### Task 4.1: Tooltip com fatores do score
**Estimativa:** 3h

```html
<!-- Modificar renderização do score -->
<div class="relative group">
  <div class="inline-flex items-center gap-1 px-2 py-1 rounded-lg" style="background:rgba(228,164,20,.10)">
    <span class="text-sm font-bold" style="color:var(--gold)">${oportunidade.score.toFixed(1)}</span>
    <svg class="w-3 h-3" style="color:var(--gold)" fill="currentColor" viewBox="0 0 20 20">
      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path>
    </svg>
  </div>
  
  <!-- Tooltip (oculto por padrão, aparece no hover) -->
  <div class="absolute z-10 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-opacity duration-200 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-3 rounded-lg" style="background:rgba(14,15,17,.95);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.1)">
    <div class="text-xs font-bold mb-2" style="color:var(--text)">Fatores do Score</div>
    ${oportunidade.matched_keywords && oportunidade.matched_keywords.length > 0 ? `
      <div class="mb-2">
        <div class="text-xs" style="color:var(--muted)">Palavras-chave:</div>
        <div class="flex flex-wrap gap-1 mt-1">
          ${oportunidade.matched_keywords.map(kw => `
            <span class="px-2 py-0.5 rounded text-xs" style="background:rgba(228,164,20,.15);color:var(--gold)">${kw}</span>
          `).join('')}
        </div>
      </div>
    ` : ''}
    <div class="text-xs space-y-1" style="color:var(--muted)">
      <div>Relevância de keywords: ${oportunidade.score_breakdown?.keywords || 'N/A'}</div>
      <div>Valor adequado: ${oportunidade.score_breakdown?.valor || 'N/A'}</div>
      <div>Prazo favorável: ${oportunidade.score_breakdown?.prazo || 'N/A'}</div>
    </div>
  </div>
</div>
```

**Nota:** Requer que a TVF `fn_get_scored_opportunities` retorne campo `score_breakdown` (modificação no BigQuery).

---

### EPIC 5: Telemetria (1 dia)

#### Task 5.1: Instrumentar eventos
**Arquivo:** `functions/src/index.ts`  
**Estimativa:** 3h

```typescript
// Event helper
async function logUserAction(tenantId: string, acao: string, detalhes: any) {
  try {
    await bq.dataset(DATASET_LOG).table('audit_user_actions').insert([{
      event_id: randomUUID(),
      tenant_id: tenantId,
      acao,
      detalhes: JSON.stringify(detalhes),
      criado_em: new Date().toISOString(),
    }]);
  } catch (err) {
    logger.error('Failed to log user action', { error: err });
  }
}

// No endpoint de oportunidades
await logUserAction(clienteId, 'filtro_aplicado', {
  filtros,
  total_resultados: total,
  limit,
  offset
});

// Novo endpoint: log view
app.post('/log/view', userPlanMiddleware, async (req, res) => {
  const { id_pncp, score } = req.body;
  await logUserAction(req.user.uid, 'oportunidade_visualizada', {
    id_pncp,
    score,
    timestamp: Date.now()
  });
  res.status(204).send();
});

// Novo endpoint: log share
app.post('/log/share', userPlanMiddleware, async (req, res) => {
  const { url } = req.body;
  await logUserAction(req.user.uid, 'url_compartilhada', {
    url,
    params: new URL(url).searchParams.toString()
  });
  res.status(204).send();
});
```

**Frontend:**
```javascript
// Log ao visualizar oportunidade
document.querySelectorAll('.oportunidade-card').forEach(card => {
  card.addEventListener('click', async (e) => {
    const idPncp = card.dataset.idPncp;
    const score = card.dataset.score;
    
    await fetch(`${API_URL}/log/view`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id_pncp: idPncp, score })
    });
  });
});

// Botão de compartilhar
document.getElementById('btn-share').addEventListener('click', async () => {
  const url = window.location.href;
  await navigator.clipboard.writeText(url);
  
  await fetch(`${API_URL}/log/share`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${await getToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ url })
  });
  
  // Toast: "Link copiado!"
});
```

---

## 📊 CRITÉRIOS DE ACEITE DA SPRINT 3

- [ ] Paginação funciona (limit/offset)
- [ ] Filtros aplicam corretamente (UF, modalidade, valor, data)
- [ ] URL reflete estado dos filtros (compartilhável)
- [ ] Loading state mostra skeleton
- [ ] Empty state aparece quando sem resultados
- [ ] Error state com retry funciona
- [ ] Tooltip de score mostra fatores
- [ ] Telemetria registra: filtro_aplicado, oportunidade_visualizada, url_compartilhada
- [ ] Performance: p95 de /oportunidades < 2s
- [ ] Frontend responsivo mobile

---

## 📈 MÉTRICAS DE SUCESSO

**Engajamento:**
- Tempo médio de sessão aumenta > 30%
- Usuários aplicam filtros em > 70% das sessões
- Taxa de compartilhamento de URL > 5%

**Técnicas:**
- p95 latência /oportunidades < 2s
- Taxa de erro < 1%
- 100% de eventos telemetrados

**Produto:**
- NPS aumenta (indicar facilidade de uso)
- Redução de churn no trial de 40% → 25%
- Aumento de ativação D7 (usar 7 dos 7 dias de trial)

---

## 🔄 DEPENDÊNCIAS E RISCOS

**Dependências:**
- ✅ Sprint 1 completa (planos/quotas)
- ✅ View v_oportunidades_15d funcional
- ✅ TVF fn_get_scored_opportunities operacional

**Riscos:**
- ⚠️ Performance de queries com múltiplos filtros (mitigação: clustering + cache)
- ⚠️ UX de filtros pode precisar iteração (mitigação: teste com 3 usuários)
- ⚠️ Telemetria pode aumentar custo BigQuery (mitigação: sampling 10%)

---

## 🚀 PRÓXIMOS PASSOS

1. **Aprovar escopo da Sprint 3** (este documento)
2. **Criar branch:** `git checkout -b sprint3-api-ux`
3. **Iniciar por EPIC 1** (paginação - menor risco, base para o resto)
4. **Deploy incremental** (uma task por vez, testar em staging)
5. **Review intermediária** (após EPIC 2, validar filtros com stakeholder)

---

**Última atualização:** 24/03/2026  
**Próxima revisão:** Ao completar 50% da sprint  
**Owner:** Equipe LiciAI Dev
