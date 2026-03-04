# Efetiva — Brandbook

> Versão 1.0 · Julho 2025  
> Referência de identidade visual, tipografia, tokens de design, tom de voz e regras de aplicação.

---

## 1. Paleta de cores

### Tokens base (modo escuro — padrão)

| Token          | Hex / valor                  | Uso                                      |
|----------------|------------------------------|------------------------------------------|
| `--bg`         | `#0E0F11`                    | Fundo da página                          |
| `--bg2`        | `#151517`                    | Fundo de seções alternadas               |
| `--panel`      | `#111318`                    | Cards e painéis primários                |
| `--panel2`     | `#0B0B0C`                    | Painéis de segundo nível                 |
| `--panel-soft` | `rgba(255,255,255,.04)`      | Input, linha de tabela, row de detalhe   |
| `--panel-gold` | `rgba(228,164,20,.08)`       | Card de destaque dourado                 |
| `--panel-purple`| `rgba(106,1,187,.12)`       | Card de destaque roxo (IA, Gov)          |
| `--text`       | `#EDEDED`                    | Texto principal                          |
| `--muted`      | `#A8A8A8`                    | Texto secundário, legendas               |
| `--line`       | `rgba(255,255,255,.08)`      | Divisores, bordas                        |
| `--gold`       | `#E4A414`                    | CTA, score, destaque primário            |
| `--purple`     | `#6A01BB`                    | IA, comunidade, Gov                      |
| `--bronze`     | `#7D6445`                    | Acento terciário, selos                  |

### Tokens base (modo claro)

| Token          | Hex / valor                  |
|----------------|------------------------------|
| `--bg`         | `#F5F5F7`                    |
| `--bg2`        | `#FFFFFF`                    |
| `--panel`      | `#FFFFFF`                    |
| `--panel2`     | `#F0F0F2`                    |
| `--panel-soft` | `rgba(0,0,0,.04)`            |
| `--text`       | `#111118`                    |
| `--muted`      | `#5C5C6A`                    |
| `--line`       | `rgba(0,0,0,.08)`            |

> `--gold` e `--purple` mantêm os mesmos valores em ambos os modos.

### Hierarquia de uso

```
Ouro (#E4A414)   → botões primários, CTAs, score alto, eyebrow dots
Roxo (#6A01BB)   → tudo relacionado a IA, alertas de comunidade, plano Gov
Bronze (#7D6445) → selos, badges secundários, destaques terciários
Cinza texto      → conteúdo corrido, labels, metadados
```

---

## 2. Tipografia

**Família principal:** [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans)  
**Fallback:** `ui-sans-serif, system-ui, -apple-system, sans-serif`

### Escala

| Uso                        | Peso   | Tamanho aprox.  |
|----------------------------|--------|-----------------|
| Hero headline              | 800 (Extra Bold) | 3.5rem–4.5rem |
| Seção H2                   | 800    | 2.25rem–3rem    |
| Card título / H3           | 700    | 0.875rem        |
| Corpo / parágrafo          | 400    | 0.875rem–1rem   |
| Label / eyebrow            | 600    | 0.75rem (uppercase, letter-spacing wide) |
| Dado numérico destaque     | 800    | 1.5rem–2rem     |
| Tag / badge                | 700    | 0.6875rem        |

### Regras

- Não usar peso inferior a 400 na interface
- Eyebrow labels: sempre `uppercase`, `tracking-widest`, cor `--muted`
- Nunca usar itálico na UI (reservado para citações longas em conteúdo editorial)

---

## 3. Logo

O logo da Efetiva é composto por **4 retângulos arredondados** dispostos em padrão escada (staircase), evocando gráfico de barras ascendente.

### Estrutura SVG

```svg
<!-- Dimensões recomendadas: 28×28 para header, 40×40 para splash -->
<svg viewBox="0 0 28 28" fill="none">
  <!-- Barra 1 (esquerda, menor) — Ouro -->
  <rect x="0" y="18" width="5" height="10" rx="1.5" fill="#E4A414"/>
  <!-- Barra 2 — Bronze -->
  <rect x="7" y="12" width="5" height="16" rx="1.5" fill="#7D6445"/>
  <!-- Barra 3 — Roxo -->
  <rect x="14" y="6" width="5" height="22" rx="1.5" fill="#6A01BB"/>
  <!-- Barra 4 (direita, maior) — Ouro -->
  <rect x="21" y="0" width="5" height="28" rx="1.5" fill="#E4A414"/>
</svg>
```

### Versões

| Contexto         | Variante                        |
|------------------|---------------------------------|
| Header dark      | 4 barras coloridas + wordmark branco |
| Header light     | 4 barras coloridas + wordmark escuro |
| Favicon          | 4 barras, sem wordmark, 32×32   |
| Email/documentos | 4 barras monocromáticas ouro    |

### Regras de uso do logo

- Manter proporção original — não distorcer
- Zona de exclusão: `1× altura da barra menor` em todos os lados
- Nunca colocar sobre fundo que conflite com ouro (`#E4A414`) sem ajuste de modo
- Wordmark sempre "Efetiva" — E maiúsculo, resto minúsculo, sem espações extras

---

## 4. Tom de voz

### Princípios

| Princípio       | Significa na prática                                           |
|-----------------|----------------------------------------------------------------|
| **Direto**      | Frases curtas. Verbo no início. Sem rodeios.                   |
| **Confiante**   | Affirmativo, não condicional. "Você vai" > "Você pode"          |
| **Orientado a ação** | Cada mensagem tem uma próxima ação clara               |
| **Sem jargão técnico** | Para o usuário final: nunca "BigQuery", "OIDC", "Cloud Functions" — use "nossa infraestrutura", "acesso seguro" |
| **Humano, não corporativo** | Sem vírgulas em excesso, sem "prezados clientes" |

### Exemplos de voz

| ❌ Evitar                                         | ✅ Preferir                                      |
|---------------------------------------------------|-------------------------------------------------|
| "Utilizando algoritmos de machine learning..."    | "A IA ranqueia por chance real de ganhar."      |
| "Nosso sistema provê funcionalidades avançadas"   | "Você vê o que importa. Menos ruído, mais foco."|
| "Contate o suporte para maiores informações"      | "Fale com a gente — respondemos hoje."          |
| "Plataforma SaaS B2B para licitações públicas"    | "Pare de caçar edital. Comece a escolher batalhas." |

### Por superfície

- **Hero / landing:** Emoção + proposta de valor em ≤2 frases. CTA único e claro.
- **Cards informativos:** Benefício (not feature). "O quê isso faz por você" > "O que é isso".
- **Modais e onboarding:** Passo a passo numerado. Tom paciente, sem pressa.
- **Alertas / notificações:** Urgência sem alarme. "2 licitações encerram em 72h" > "ATENÇÃO: PRAZO!".
- **Emails transacionais:** Linha de assunto = ação esperada. Corpo em ≤3 parágrafos. CTA no fim.
- **Erros e estados vazios:** Explica o que aconteceu + o que fazer. Jamais culpa o usuário.

---

## 5. Aplicação por superfície

### Landing page (`index.html`)
- Tema dark por padrão, com toggle light
- Header: `backdrop-blur` + `.header-bg` (dark: `rgba(14,15,17,.88)`, light: `rgba(245,245,247,.94)`)
- Grid de features: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
- Cards: `.feat-card panel rounded-2xl p-5` com hover `translateY(-2px)` e borda ouro
- CTA primário: `background: var(--gold)`, texto `text-black font-bold`
- CTA secundário: `border: var(--line)`, texto `var(--text) font-semibold`

### Login (`login.html`) e Cadastro (`cadastro.html`)
- Somente modo escuro (sem toggle)
- Fundo: `--bg` (`#0E0F11`)
- Card central: `panel rounded-2xl p-8 max-w-md`
- Firebase Auth: email+senha + Google OAuth
- Mensagens de erro: inline, cor vermelho `#EF4444`, tamanho `text-sm`

### App (futuro)
- Sidebar esquerda colapsável (ícone + label em modo expandido)
- Topbar reusa `.header-bg` com mesmo blur do landing
- Tabelas: `.panel-soft` para rows alternadas, cabeçalho `text-xs uppercase tracking-wider --muted`
- Score bars: `height: 4px`, fundo `--panel-soft`, fill `var(--gold)`

### Emails
- Fundo `#0E0F11`, texto `#EDEDED`
- Logo version monocromática ouro
- CTA button: `background: #E4A414`, border-radius `8px`, padding `12px 24px`
- Tipografia web-safe fallback: `Arial, Helvetica, sans-serif` (Plus Jakarta Sans não disponível em clientes email)

---

## 6. Componentes chave

### `.feat-card`
```css
.feat-card {
  transition: transform .18s ease, box-shadow .18s ease;
}
.feat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 0 1px var(--gold), 0 8px 32px rgba(228,164,20,.10);
}
```

### `.tag`
```css
.tag {
  background: rgba(228,164,20,.12);
  color: var(--gold);
  border: 1px solid rgba(228,164,20,.25);
  border-radius: 9999px;
  padding: 2px 10px;
  font-size: 0.6875rem;
  font-weight: 700;
}
```

### `.score-bar`
```css
.score-bar {
  flex: 1;
  height: 4px;
  background: var(--panel-soft);
  border-radius: 9999px;
  overflow: hidden;
}
.score-bar-fill {
  height: 100%;
  background: var(--gold);
  border-radius: 9999px;
}
```

### `.brand-text`
```css
.brand-text {
  background: linear-gradient(90deg, var(--gold), var(--purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

---

## 7. Acessibilidade

- Contraste mínimo texto/fundo: **4.5:1** (WCAG AA)
- `--gold` sobre `--bg` (`#0E0F11`): ratio ≈ 7.1:1 ✅
- `--muted` sobre `--bg`: ratio ≈ 4.6:1 ✅
- `--muted` sobre `--panel`: ratio ≈ 4.5:1 ✅
- Todos os botões interativos têm `focus-visible` outline
- Imagens e ícones decorativos: `aria-hidden="true"`
- Inputs: sempre com `<label>` associado ou `aria-label`

---

## 8. Checklist de lançamento de nova tela

- [ ] Usa tokens CSS (`--bg`, `--text`, etc.) — sem cores hardcoded
- [ ] Funciona em dark e light (ou só dark se for app interno)
- [ ] Plus Jakarta Sans carregado via Google Fonts
- [ ] CTAs primários em gold, secundários em borda neutra
- [ ] Tom de voz: direto, sem jargão técnico ao usuário final
- [ ] Logo com zona de exclusão respeitada
- [ ] Versão mobile revisada (breakpoint `sm: 640px`, `lg: 1024px`)
- [ ] Sem `console.log` em produção
