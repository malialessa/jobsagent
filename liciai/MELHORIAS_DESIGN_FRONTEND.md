# 🎨 Melhorias de Design Premium - Frontend LiciAI

**Status**: 📋 Sugestões  
**Objetivo**: Transformar o frontend de funcional → **premium e polido**  
**Inspiração**: Linear, Stripe Dashboard, Figma, Notion

---

## 🎯 Problemas Identificados

1. **Datas inconsistentes**: Não está dd/mm/aaaa em todos os lugares
2. **Visual "genérico"**: Falta identidade visual premium
3. **Densidade excessiva**: Muita informação sem hierarquia clara
4. **Falta de polish**: Sem micro-interações, animações suaves
5. **Limitação visual de paginação**: "Mostrando X de Y" poderia ser mais visual
6. **Cores chapadas**: Faltam gradientes, sombras, profundidade

---

## 🎨 Melhorias Visuais (Quick Wins)

### 1. **Formatação de Datas Consistente**

**Problema**: `formatDate()` usa `year: "numeric"` (2026) mas deveria ser dd/mm/aaaa

**Solução**:
```typescript
// frontend/src/pages/RadarPage.tsx (linha ~195)
function formatDate(str: string | null | undefined, withTime = false): string {
  if (!str) return "—";
  try {
    const date = new Date(str);
    
    // Formatação brasileira consistente
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    if (withTime) {
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} às ${hours}:${minutes}`;
    }
    
    return `${day}/${month}/${year}`;
  } catch { 
    return typeof str === "string" ? str.slice(0, 10) : "—"; 
  }
}

// Variante compacta para tabela (ex: "24/03")
function formatDateShort(str: string | null | undefined): string {
  if (!str) return "—";
  try {
    const date = new Date(str);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}`;
  } catch { return "—"; }
}
```

---

### 2. **Glassmorphism no Header**

**Problema**: Header é chapado, sem profundidade

**Solução** (aplicar em RadarPage header):
```tsx
{/* Header principal com glassmorphism */}
<div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[var(--panel2)] to-[var(--panel)] backdrop-blur-xl">
  {/* Gradient overlay sutil */}
  <div className="absolute inset-0 bg-gradient-to-r from-[var(--gold)]/5 via-transparent to-sky-500/5 pointer-events-none" />
  
  <div className="relative flex items-center justify-between gap-4 px-6 py-5">
    {/* Conteúdo do header */}
  </div>
</div>
```

**CSS adicional** (globals.css):
```css
/* Glassmorphism premium */
.glass-panel {
  background: rgba(var(--panel-rgb), 0.6);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

/* Gradient glow nos cards premium */
.premium-card {
  position: relative;
  background: linear-gradient(135deg, var(--panel2), var(--panel));
  border: 1px solid rgba(228, 164, 20, 0.2);
  box-shadow: 
    0 0 0 1px rgba(228, 164, 20, 0.05),
    0 4px 12px rgba(228, 164, 20, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.premium-card:hover {
  transform: translateY(-2px);
  box-shadow: 
    0 0 0 1px rgba(228, 164, 20, 0.15),
    0 12px 24px rgba(228, 164, 20, 0.15);
}

.premium-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(228, 164, 20, 0.1), transparent);
  opacity: 0;
  transition: opacity 0.3s;
  pointer-events: none;
  border-radius: inherit;
}

.premium-card:hover::before {
  opacity: 1;
}
```

---

### 3. **Score Badge com Gradiente e Animação**

**Problema**: Score é texto simples, sem destaque visual

**Solução**:
```tsx
function ScoreBar({ value }: { value?: number }) {
  if (!value) return <span className="text-xs text-[var(--muted)]">—</span>;
  
  const hint = value >= 80 ? "Compatibilidade excepcional"
    : value >= 60 ? "Boa compatibilidade"
    : value >= 40 ? "Compatibilidade moderada"
    : "Baixa compatibilidade";
  
  // Gradient baseado no score
  const gradientClass = value >= 80 
    ? "from-amber-400 via-[var(--gold)] to-yellow-500"
    : value >= 60
    ? "from-sky-400 via-blue-400 to-cyan-400"
    : "from-gray-400 via-gray-500 to-gray-600";
  
  return (
    <div
      className="group flex flex-col gap-1.5 items-center cursor-help"
      title={`Score ${value}/100 — ${hint}. Baseado em: alinhamento por palavras-chave, UF, modalidade e prazo.`}
    >
      {/* Badge com gradiente e glow */}
      <div className={cn(
        "relative px-2.5 py-1 rounded-lg font-black text-sm tabular-nums",
        "bg-gradient-to-br shadow-lg transition-all duration-300",
        "group-hover:scale-110 group-hover:shadow-xl",
        gradientClass
      )}>
        <span className="relative z-10 text-white drop-shadow-sm">{value}</span>
        
        {/* Glow effect */}
        <div className={cn(
          "absolute inset-0 rounded-lg blur-md opacity-50 transition-opacity",
          "bg-gradient-to-br group-hover:opacity-75",
          gradientClass
        )} />
      </div>
      
      {/* Progress bar com animação */}
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-[var(--line)] shadow-inner">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out",
            gradientClass
          )}
          style={{ 
            width: `${Math.min(value, 100)}%`,
            animation: 'slideIn 0.7s ease-out'
          }}
        />
      </div>
    </div>
  );
}

// CSS para animação
@keyframes slideIn {
  from { width: 0%; opacity: 0; }
  to { opacity: 1; }
}
```

---

### 4. **Pills Multi-Select com Efeito Hover Premium**

**Problema**: Pills são simples, sem feedback visual rico

**Solução**:
```tsx
// Melhorar a função pill() em PremiumFilterBar
const pill = (label: string, value: string, field: keyof FilterState) => {
  const isMulti = field === "uf" || field === "modalidade";
  const selected = isMulti
    ? filters[field].split(",").map(v => v.trim()).includes(value)
    : filters[field] === value;
  
  return (
    <button
      key={value}
      onClick={() => isMulti ? toggleMulti(field, value) : onChange({ [field]: filters[field] === value ? "" : value })}
      className={cn(
        "relative overflow-hidden group",
        "rounded-xl border px-3.5 py-2 text-xs font-bold",
        "transition-all duration-300 ease-out",
        "hover:scale-105 hover:-translate-y-0.5",
        selected
          ? "border-[var(--gold)]/40 bg-gradient-to-br from-[var(--gold)]/20 to-[var(--gold)]/10 text-[var(--gold)] shadow-lg shadow-[var(--gold)]/20"
          : "border-[var(--line)] bg-[var(--panel2)] text-[var(--muted)] hover:border-[var(--gold)]/20 hover:text-[var(--text)]"
      )}
    >
      {/* Shine effect ao hover */}
      <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] duration-700" />
      
      {/* Check icon para selecionados */}
      {selected && (
        <span className="inline-block mr-1 animate-in fade-in zoom-in duration-200">
          ✓
        </span>
      )}
      
      <span className="relative z-10">{label}</span>
    </button>
  );
};
```

---

### 5. **Tabela com Row Hover Premium**

**Problema**: Hover na linha é simples mudança de cor

**Solução** (LineRow):
```tsx
<div
  onClick={onClick}
  data-opid={opId}
  className={cn(
    "group relative grid grid-cols-12 items-center gap-4 border-b border-[var(--line)]",
    "px-4 transition-all duration-300 cursor-pointer select-none",
    comfortable ? "py-4" : "py-2.5",
    active 
      ? "bg-gradient-to-r from-[var(--gold)]/10 via-[var(--panel2)] to-transparent border-l-2 border-l-[var(--gold)] shadow-lg shadow-[var(--gold)]/10" 
      : "hover:bg-gradient-to-r hover:from-[var(--panel2)] hover:to-transparent hover:border-l-2 hover:border-l-[var(--gold)]/50",
    // ... resto do className
  )}
>
  {/* Gradient overlay sutil ao hover */}
  <div className={cn(
    "absolute inset-0 bg-gradient-to-r from-[var(--gold)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
    active && "opacity-100"
  )} />
  
  {/* Conteúdo da linha (com relative z-10) */}
  <div className="relative z-10 col-span-1">
    {/* ... */}
  </div>
</div>
```

---

### 6. **Loading Skeleton Premium**

**Problema**: Skeleton é básico sem animação elaborada

**Solução**:
```tsx
function TableSkeleton() {
  return (
    <div className="divide-y divide-[var(--line)]">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="grid grid-cols-12 gap-4 px-4 py-3">
          {[1, 6, 1, 2, 1, 1].map((span, j) => (
            <div key={j} className={`col-span-${span}`}>
              <Sk 
                className={cn(
                  "h-4 rounded-lg",
                  j === 1 && "h-6", // Título maior
                  j === 5 && "h-8"  // Score maior
                )}
                style={{ 
                  animationDelay: `${i * 50 + j * 20}ms` 
                }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Melhorar Sk component
function Sk({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded bg-gradient-to-r from-[var(--line)] via-[var(--line)]/50 to-[var(--line)]",
        className
      )}
      style={{
        animation: 'shimmer 2s ease-in-out infinite',
        backgroundSize: '200% 100%',
        ...style
      }}
    />
  );
}

// CSS
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

---

### 7. **Empty State com Ilustração e Animação**

**Problema**: Empty state é texto simples

**Solução**:
```tsx
{items.length === 0 && (
  <div className="flex flex-col items-center gap-6 py-20 text-center">
    {/* Animated search icon */}
    <div className="relative">
      <div className="absolute inset-0 bg-[var(--gold)]/20 rounded-full blur-2xl animate-pulse" />
      <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[var(--gold)]/20 to-sky-500/20 flex items-center justify-center border border-[var(--gold)]/30">
        <Search className="h-10 w-10 text-[var(--gold)] animate-bounce" />
      </div>
    </div>
    
    {/* Heading */}
    <div className="space-y-2">
      <h3 className="text-lg font-black text-[var(--text)]">
        Nenhuma oportunidade encontrada
      </h3>
      <p className="text-sm text-[var(--muted)] max-w-md">
        Ajuste seus filtros para descobrir oportunidades relevantes para o seu negócio
      </p>
    </div>
    
    {/* CTA button com gradient */}
    <button
      onClick={clearFilters}
      className="group relative overflow-hidden rounded-xl border border-[var(--gold)]/30 bg-gradient-to-br from-[var(--gold)]/20 to-[var(--gold)]/10 px-6 py-3 text-sm font-bold text-[var(--gold)] shadow-lg shadow-[var(--gold)]/20 transition-all hover:scale-105 hover:shadow-xl hover:shadow-[var(--gold)]/30"
    >
      <span className="relative z-10">Limpar todos os filtros</span>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity -skew-x-12" />
    </button>
  </div>
)}
```

---

### 8. **Pagination Counter Premium**

**Problema**: "Mostrando X de Y" é texto simples

**Solução**:
```tsx
{/* Substituir o contador atual por: */}
<div className="flex items-center gap-3">
  {loading ? (
    <Sk className="h-3 w-32" />
  ) : (
    <div className="flex items-center gap-2">
      {/* Badge com gradiente */}
      <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--gold)]/30 bg-gradient-to-r from-[var(--gold)]/10 to-transparent px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-[var(--text)]">
            {items.length.toLocaleString('pt-BR')}
          </span>
          {rawItems.length > items.length && (
            <>
              <span className="text-xs text-[var(--muted)]">/</span>
              <span className="text-xs text-[var(--muted)]">
                {rawItems.length.toLocaleString('pt-BR')}
              </span>
            </>
          )}
        </div>
        <span className="text-xs text-[var(--muted)]">oportunidade{items.length !== 1 ? 's' : ''}</span>
      </div>
      
      {/* Progress bar visual (se houver filtros ativos) */}
      {rawItems.length > items.length && (
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-24 rounded-full bg-[var(--line)] overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[var(--gold)] to-sky-500 transition-all duration-500"
              style={{ width: `${(items.length / rawItems.length) * 100}%` }}
            />
          </div>
          <span className="text-xs font-mono text-[var(--muted)]">
            {Math.round((items.length / rawItems.length) * 100)}%
          </span>
        </div>
      )}
    </div>
  )}
</div>
```

---

### 9. **Chips Removíveis com Micro-Animação**

**Problema**: Chips são estáticos

**Solução**:
```tsx
{chips.map(({ key, display }, idx) => (
  <button
    key={`${key}-${idx}`}
    onClick={() => {/* ... */}}
    className="group relative flex items-center gap-1.5 overflow-hidden rounded-lg border border-[var(--gold)]/40 bg-gradient-to-br from-[var(--gold)]/20 to-[var(--gold)]/10 px-3 py-1.5 text-xs font-bold text-[var(--gold)] shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 animate-in fade-in slide-in-from-top-2"
    style={{ animationDelay: `${idx * 50}ms` }}
  >
    {/* Background pulse ao hover */}
    <span className="absolute inset-0 bg-[var(--gold)]/10 scale-0 group-hover:scale-100 transition-transform duration-300 rounded-lg" />
    
    <span className="relative z-10">{display}</span>
    
    {/* X icon com rotate ao hover */}
    <X className="relative z-10 h-3 w-3 transition-transform group-hover:rotate-90 duration-200" />
  </button>
))}
```

---

## 🎨 Melhorias de Tema (globals.css)

### Adicionar variáveis CSS premium:

```css
:root {
  /* Gradients */
  --gradient-gold: linear-gradient(135deg, #e4a414 0%, #f5c84c 100%);
  --gradient-premium: linear-gradient(135deg, rgba(228, 164, 20, 0.1) 0%, rgba(14, 165, 233, 0.1) 100%);
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15), 0 10px 10px rgba(0, 0, 0, 0.04);
  --shadow-gold: 0 8px 16px rgba(228, 164, 20, 0.2);
  
  /* Blur */
  --blur-sm: blur(4px);
  --blur-md: blur(12px);
  --blur-lg: blur(24px);
  
  /* Transitions */
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-bounce: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* Utility classes premium */
.animate-shimmer {
  animation: shimmer 2s ease-in-out infinite;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.05) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  background-size: 200% 100%;
}

.animate-float {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.gradient-text {
  background: var(--gradient-gold);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.glow-gold {
  box-shadow: 0 0 20px rgba(228, 164, 20, 0.3);
}

.glow-gold-lg {
  box-shadow: 0 0 40px rgba(228, 164, 20, 0.4);
}
```

---

## 🚀 Melhorias de UX (Além do Visual)

### 10. **Infinite Scroll Suave**

Substituir "Carregar mais" por infinite scroll com Intersection Observer:

```tsx
// Hook customizado
function useInfiniteScroll(callback: () => void, hasMore: boolean) {
  const observerRef = useRef<IntersectionObserver>();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!hasMore) return;
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callback();
        }
      },
      { threshold: 0.5 }
    );
    
    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }
    
    return () => observerRef.current?.disconnect();
  }, [callback, hasMore]);
  
  return loadMoreRef;
}

// No componente:
const loadMoreRef = useInfiniteScroll(loadMore, hasMore && !loading && !planLimited);

// Renderizar:
{hasMore && !planLimited && (
  <div ref={loadMoreRef} className="py-8 flex justify-center">
    {loading && (
      <div className="flex items-center gap-2 text-[var(--muted)]">
        <div className="w-4 h-4 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-medium">Carregando mais...</span>
      </div>
    )}
  </div>
)}
```

---

### 11. **Quick Preview ao Hover (Tooltip Rico)**

Mostrar preview card ao passar mouse sobre a linha:

```tsx
// Usar Radix UI Tooltip ou implementar custom
import * as Tooltip from '@radix-ui/react-tooltip';

<Tooltip.Provider>
  <Tooltip.Root delayDuration={500}>
    <Tooltip.Trigger asChild>
      <div {...lineRowProps}>
        {/* conteúdo da linha */}
      </div>
    </Tooltip.Trigger>
    
    <Tooltip.Portal>
      <Tooltip.Content
        side="right"
        className="z-50 max-w-md rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-left-2 duration-200"
      >
        <div className="space-y-3">
          <p className="text-xs font-bold text-[var(--text)] line-clamp-2">
            {op.objeto_compra}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[var(--muted)]">Órgão:</span>
              <span className="ml-1 font-semibold text-[var(--text)]">
                {op.razao_social_orgao}
              </span>
            </div>
            <div>
              <span className="text-[var(--muted)]">Valor:</span>
              <span className="ml-1 font-semibold text-[var(--gold)]">
                {formatCurrency(op.valor_total_estimado)}
              </span>
            </div>
          </div>
        </div>
        <Tooltip.Arrow className="fill-[var(--panel)]" />
      </Tooltip.Content>
    </Tooltip.Portal>
  </Tooltip.Root>
</Tooltip.Provider>
```

---

### 12. **Keyboard Shortcuts Visíveis**

Adicionar hint de atalhos no canto da tela:

```tsx
{/* Floating shortcuts hint */}
<div className="fixed bottom-4 right-4 z-40 animate-in fade-in slide-in-from-bottom-4 duration-500">
  <div className="rounded-xl border border-[var(--line)] bg-[var(--panel)]/80 backdrop-blur-xl px-4 py-3 shadow-2xl">
    <div className="flex items-center gap-4 text-xs">
      <div className="flex items-center gap-1.5">
        <kbd className="px-2 py-1 rounded bg-[var(--panel2)] border border-[var(--line)] font-mono font-bold">J</kbd>
        <kbd className="px-2 py-1 rounded bg-[var(--panel2)] border border-[var(--line)] font-mono font-bold">K</kbd>
        <span className="text-[var(--muted)]">navegar</span>
      </div>
      <div className="flex items-center gap-1.5">
        <kbd className="px-2 py-1 rounded bg-[var(--panel2)] border border-[var(--line)] font-mono font-bold">ESC</kbd>
        <span className="text-[var(--muted)]">fechar</span>
      </div>
    </div>
  </div>
</div>
```

---

## 📐 Melhorias de Layout

### 13. **Densidade Adaptativa**

Adicionar mais opções de densidade:

```tsx
const DENSITIES = [
  { value: "compact", label: "Compacto", icon: AlignJustify, rows: 12 },
  { value: "comfortable", label: "Confortável", icon: Layers, rows: 8 },
  { value: "spacious", label: "Espaçoso", icon: Expand, rows: 6 },
] as const;

// Toggle density
<div className="flex items-center gap-1 rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-1">
  {DENSITIES.map((d) => (
    <button
      key={d.value}
      onClick={() => setDensity(d.value)}
      className={cn(
        "flex items-center gap-1.5 rounded px-2 py-1 text-xs font-bold transition-all",
        density === d.value
          ? "bg-[var(--gold)] text-white shadow-sm"
          : "text-[var(--muted)] hover:text-[var(--text)]"
      )}
      title={d.label}
    >
      <d.icon className="h-3 w-3" />
      <span className="hidden sm:inline">{d.label}</span>
    </button>
  ))}
</div>
```

---

## 🎬 Animações de Entrada/Saída

### 14. **Stagger Animation nas Linhas**

```tsx
// Aplicar delay progressivo nas linhas
{items.map((op, i) => (
  <LineRow
    key={opId}
    op={op}
    style={{
      animation: 'slideInUp 0.3s ease-out',
      animationDelay: `${i * 30}ms`,
      animationFillMode: 'backwards'
    }}
    // ...
  />
))}

// CSS
@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## 🎯 Checklist de Implementação

### Fase 1: Quick Wins (2-3 horas)
- [ ] Corrigir formatação de datas (dd/mm/aaaa)
- [ ] Adicionar variáveis CSS premium (gradients, shadows)
- [ ] Melhorar ScoreBar com gradiente
- [ ] Pills com hover effect
- [ ] Tabela row hover premium

### Fase 2: Polish (4-5 horas)
- [ ] Glassmorphism no header
- [ ] Empty state animado
- [ ] Loading skeleton premium
- [ ] Chips removíveis com animação
- [ ] Pagination counter visual

### Fase 3: Advanced (6-8 horas)
- [ ] Infinite scroll
- [ ] Quick preview tooltips
- [ ] Keyboard shortcuts hint
- [ ] Densidade adaptativa
- [ ] Stagger animations

---

## 🎨 Referências de Design

**Inspiração visual**:
- [Linear](https://linear.app) - Transições suaves, micro-interações
- [Stripe Dashboard](https://dashboard.stripe.com) - Hierarquia, densidade
- [Notion](https://notion.so) - Empty states, feedback visual
- [Clerk Dashboard](https://dashboard.clerk.com) - Gradientes sutis
- [Vercel Dashboard](https://vercel.com) - Glassmorphism, shadows

**Cores premium** (sugestão para paletaexpandir):
```css
:root {
  /* Gold variations */
  --gold-50: #fef9e7;
  --gold-100: #fdf3cd;
  --gold-200: #fbe79b;
  --gold-300: #f9db69;
  --gold-400: #f7cf37; /* current */
  --gold-500: #e4a414; /* darker */
  --gold-600: #b17f10;
  --gold-700: #7e5a0c;
  
  /* Accent blue (para contraste) */
  --accent-blue: #0ea5e9;
  --accent-blue-dark: #0284c7;
}
```

---

## 💎 Resultado Esperado

**Antes**:
- ❌ Visual "genérico", sem identidade
- ❌ Datas inconsistentes
- ❌ Falta profundidade (flat)
- ❌ Sem micro-interações

**Depois**:
- ✅ Visual **premium** e **polido**
- ✅ Formatação consistente (dd/mm/aaaa)
- ✅ Gradientes, sombras, glassmorphism
- ✅ Micro-animações fluidas
- ✅ Feedback visual rico
- ✅ Hierarquia clara

---

**Qual fase você quer implementar primeiro?** Eu recomendo começar pela **Fase 1** (quick wins) para ver resultados rápidos! 🚀
