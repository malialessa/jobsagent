<!doctype html>
<html lang="pt-br" data-theme="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Efetiva LiciAI — Documentos</title>

  <script src="https://cdn.tailwindcss.com"></script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;600;700;800&display=swap" rel="stylesheet">

  <script src="https://unpkg.com/lucide@latest"></script>

  <style>
    :root[data-theme="dark"]{
      --bg:#0E0F11; --bg2:#151517; --panel:#111318; --panel2:#0B0B0C;
      --text:#EDEDED; --muted:#9CA3AF; --line:rgba(255,255,255,.08);
      --gold:#E4A414; --gold-border:rgba(228,164,20,.40); --gold-bg:rgba(228,164,20,.10);
      --purple:#8B5CF6; --purple-bg:rgba(139,92,246,.15);
      --danger:#EF4444; --success:#10B981; --warning:#F59E0B;
      --nav-bg:rgba(14,15,17,.92); --pill-bg:rgba(255,255,255,.03); --hover-bg:rgba(255,255,255,.05);
      --shadow: 0 14px 40px rgba(0,0,0,.35);
    }
    :root[data-theme="light"]{
      --bg:#F8FAFC; --bg2:#F1F5F9; --panel:#FFFFFF; --panel2:#F8FAFC;
      --text:#0F172A; --muted:#64748B; --line:rgba(0,0,0,.08);
      --gold:#D99A0B; --gold-border:rgba(217,154,11,.40); --gold-bg:rgba(217,154,11,.10);
      --purple:#6A01BB; --purple-bg:rgba(106,1,187,.08);
      --danger:#EF4444; --success:#10B981; --warning:#F59E0B;
      --nav-bg:rgba(255,255,255,.92); --pill-bg:rgba(0,0,0,.03); --hover-bg:rgba(0,0,0,.03);
      --shadow: 0 14px 40px rgba(2,6,23,.12);
    }

    *{ font-family:"Quicksand", system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
    .bg-app{ background:var(--bg); } .bg-panel{ background:var(--panel); } .bg-panel2{ background:var(--panel2); }
    .text-app{ color:var(--text); } .text-muted{ color:var(--muted); }
    .border-app{ border-color:var(--line); } .shadow-soft{ box-shadow:var(--shadow); }
    .pill{ background:var(--pill-bg); border:1px solid var(--line); }
    .hover-surface:hover{ background:var(--hover-bg)!important; }
    .ring-gold{ box-shadow:0 0 0 1px var(--gold-border) inset; }
    .chip-gold{ background:var(--gold-bg); border:1px solid var(--gold-border); color:var(--gold); }
    .chip-purple{ background:var(--purple-bg); border:1px solid rgba(139,92,246,.28); color:var(--purple); }
    .btn{ border-radius:14px; font-weight:800; }
    .btn-outline{ border:1px solid var(--line); background:transparent; color:var(--text); }
    .btn-outline:hover{ background:var(--hover-bg); }
    .btn-gold{ background:var(--gold); color:#111; }
    .btn-gold:hover{ opacity:.92; }

    .modal-backdrop{ background: rgba(0,0,0,.55); }
    :root[data-theme="light"] .modal-backdrop{ background: rgba(2,6,23,.45); }
  </style>
</head>

<body class="bg-app">
  <div class="min-h-screen flex">

    <!-- Sidebar -->
    <aside id="sidebar"
      class="fixed md:static inset-y-0 left-0 z-50 w-72 border-r border-app bg-panel transform -translate-x-full md:translate-x-0 transition-transform duration-300 ease-out">
      <div class="h-16 px-6 border-b border-app flex items-center gap-3">
        <div class="h-10 w-10 rounded-xl ring-gold flex items-center justify-center"
             style="background:linear-gradient(135deg, var(--gold-bg), transparent);">
          <i data-lucide="building-2" class="w-5 h-5" style="color:var(--gold)"></i>
        </div>
        <div class="flex-1">
          <div class="text-app font-extrabold leading-tight">Efetiva LiciAI</div>
          <div class="text-muted text-xs font-semibold">Conformidade e evidências</div>
        </div>
        <button id="closeSidebar" class="md:hidden p-2 rounded-xl hover-surface text-app" aria-label="Fechar menu">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>

      <div class="px-4 py-5">
        <div class="text-muted text-[10px] font-extrabold uppercase tracking-widest px-3 mb-3">Menu</div>
        <nav class="space-y-1">
          <a href="./app.html" data-nav="dashboard"
             class="nav-item flex items-center gap-3 px-4 py-3 rounded-2xl hover-surface">
            <i data-lucide="layout-dashboard" class="w-5 h-5"></i>
            <span class="font-extrabold text-sm">Dashboard</span>
          </a>
          <a href="./documentos.html" data-nav="documentos"
             class="nav-item flex items-center gap-3 px-4 py-3 rounded-2xl hover-surface">
            <i data-lucide="file-text" class="w-5 h-5"></i>
            <span class="font-extrabold text-sm">Documentos (IA)</span>
          </a>
          <a href="./perfil.html" data-nav="perfil"
             class="nav-item flex items-center gap-3 px-4 py-3 rounded-2xl hover-surface">
            <i data-lucide="settings" class="w-5 h-5"></i>
            <span class="font-extrabold text-sm">Perfil & Radar</span>
          </a>
        </nav>

        <div class="mt-6 px-3">
          <div class="pill rounded-2xl p-4">
            <div class="flex items-center justify-between">
              <div class="text-app font-extrabold">Matriz ativa</div>
              <span class="chip-gold text-xs font-extrabold px-2.5 py-1 rounded-full">Pregão 045/2026</span>
            </div>
            <div class="text-muted text-xs font-semibold mt-2">
              Status: <span class="font-extrabold" style="color:var(--warning)">1 falha crítica</span> • 2 atendidos • 3 pendentes
            </div>
            <button id="btnGoMatrix" class="btn btn-outline w-full mt-3 py-2 text-sm">Ir para matriz</button>
          </div>
        </div>
      </div>

      <div class="mt-auto p-4 border-t border-app">
        <div class="flex items-center gap-3 px-2">
          <div class="w-10 h-10 rounded-full flex items-center justify-center text-white font-extrabold text-sm"
               style="background:linear-gradient(135deg, #4f46e5, #a855f7);">TS</div>
          <div class="min-w-0 flex-1">
            <div class="text-app font-extrabold text-sm truncate">Tech Solutions Ltda</div>
            <div class="text-muted text-xs font-semibold truncate">Plano Pro</div>
          </div>
          <button class="p-2 rounded-xl hover-surface text-muted" aria-label="Mais opções">
            <i data-lucide="more-vertical" class="w-5 h-5"></i>
          </button>
        </div>
      </div>
    </aside>

    <div id="overlay" class="hidden fixed inset-0 z-40 modal-backdrop backdrop-blur-sm"></div>

    <!-- Main -->
    <main class="flex-1 min-w-0">
      <!-- Topbar -->
      <header class="sticky top-0 z-30 h-16 border-b border-app flex items-center justify-between px-4 sm:px-6"
              style="background:var(--nav-bg); backdrop-filter: blur(10px);">
        <div class="flex items-center gap-3">
          <button id="openSidebar" class="md:hidden p-2 rounded-xl hover-surface text-app" aria-label="Abrir menu">
            <i data-lucide="menu" class="w-6 h-6"></i>
          </button>
          <div class="hidden sm:flex items-center gap-2 text-sm font-extrabold">
            <span class="text-muted">Plataforma</span>
            <i data-lucide="chevron-right" class="w-4 h-4 text-muted"></i>
            <span class="text-app">Documentos</span>
          </div>
        </div>

        <div class="flex items-center gap-2 sm:gap-3">
          <button id="themeToggle" class="p-2.5 rounded-xl hover-surface text-app" aria-label="Trocar tema">
            <i data-lucide="sun" class="w-5 h-5" id="iconSun"></i>
            <i data-lucide="moon" class="w-5 h-5 hidden" id="iconMoon"></i>
          </button>

          <button id="btnUpload" class="btn btn-gold inline-flex items-center gap-2 px-4 py-2 text-sm">
            <i data-lucide="upload" class="w-4 h-4"></i>
            Novo documento
          </button>
        </div>
      </header>

      <section class="p-4 sm:p-6 lg:p-8">
        <div class="max-w-6xl mx-auto space-y-6">

          <!-- Title -->
          <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <div>
              <div class="inline-flex items-center gap-2 pill rounded-full px-3 py-1.5">
                <i data-lucide="shield-check" class="w-4 h-4" style="color:var(--gold)"></i>
                <span class="text-muted text-xs font-extrabold uppercase tracking-widest">Conformidade</span>
              </div>
              <h1 class="text-app text-2xl sm:text-3xl font-extrabold mt-3 tracking-tight">
                Evidência organizada. Inabilitação evitada.
              </h1>
              <p class="text-muted text-sm font-semibold mt-2">
                Seu repositório alimenta a Matriz de Conformidade e acelera a preparação.
              </p>
            </div>

            <div class="bg-panel border border-app rounded-2xl p-4 w-full lg:w-[520px]">
              <div class="flex items-center justify-between">
                <div class="text-app font-extrabold">Busca & filtros</div>
                <span class="chip-purple text-xs font-extrabold px-2.5 py-1 rounded-full">IA pronta</span>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div class="sm:col-span-2">
                  <label class="text-muted text-[10px] font-extrabold uppercase tracking-widest">Buscar</label>
                  <div class="mt-1 flex items-center gap-2 pill rounded-xl px-3 h-10">
                    <i data-lucide="search" class="w-4 h-4 text-muted"></i>
                    <input id="searchDoc" class="bg-transparent outline-none w-full text-app font-bold text-sm"
                           placeholder="Ex: CNDT, atestado, balanço..." />
                  </div>
                </div>
                <div>
                  <label class="text-muted text-[10px] font-extrabold uppercase tracking-widest">Status</label>
                  <select id="filterStatus" class="w-full mt-1 h-10 rounded-xl px-3 bg-transparent border border-app text-app font-bold focus:outline-none">
                    <option value="ALL">Todos</option>
                    <option value="VALIDO">Válido</option>
                    <option value="ALERTA">Vence em 60d</option>
                    <option value="VENCIDO">Vencido</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- Tabs -->
          <div class="bg-panel border border-app rounded-2xl p-1 flex gap-1">
            <button id="tabDocs" class="tab btn btn-outline flex-1 py-2 text-sm ring-gold" style="background:var(--gold-bg); color:var(--gold)">Meus documentos</button>
            <button id="tabModelos" class="tab btn btn-outline flex-1 py-2 text-sm">Modelos & declarações</button>
            <button id="tabMatriz" class="tab btn btn-outline flex-1 py-2 text-sm">Matriz de conformidade</button>
          </div>

          <!-- Content panels -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">

            <!-- Left: list -->
            <div class="lg:col-span-2 space-y-4" id="panelDocs">
              <div class="bg-panel border border-app rounded-2xl overflow-hidden">
                <div class="px-5 py-4 bg-panel2 border-b border-app flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <i data-lucide="folder-open" class="w-5 h-5" style="color:var(--gold)"></i>
                    <div class="text-app font-extrabold">Repositório</div>
                  </div>
                  <span class="chip-gold text-xs font-extrabold px-2.5 py-1 rounded-full" id="quotaLabel">5 / 10 (Pro)</span>
                </div>

                <div id="docList"></div>
              </div>

              <div class="bg-panel border border-app rounded-2xl p-5">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-app font-extrabold">Boas práticas</div>
                    <div class="text-muted text-sm font-semibold mt-1">Reduz ruído, aumenta previsibilidade.</div>
                  </div>
                  <span class="chip-purple text-xs font-extrabold px-2.5 py-1 rounded-full">Governança</span>
                </div>
                <ul class="mt-4 space-y-2 text-sm font-semibold text-muted">
                  <li class="flex gap-2"><span style="color:var(--gold)">•</span> Nomeie com padrão: <span class="text-app font-extrabold">TIPO — DETALHE — ANO.pdf</span></li>
                  <li class="flex gap-2"><span style="color:var(--gold)">•</span> Use validade como dado, não como texto solto no PDF.</li>
                  <li class="flex gap-2"><span style="color:var(--gold)">•</span> Atestado: associe “escopo + quantitativo + órgão emissor”.</li>
                </ul>
              </div>
            </div>

            <!-- Right: matrix widget / detail -->
            <div class="space-y-4" id="panelRight">
              <div class="bg-panel border border-app rounded-2xl overflow-hidden ring-gold">
                <div class="px-5 py-4 bg-panel2 border-b border-app">
                  <div class="flex items-center gap-2">
                    <i data-lucide="shield-check" class="w-5 h-5" style="color:var(--gold)"></i>
                    <div class="text-app font-extrabold">Matriz — Pregão 045/2026</div>
                  </div>
                  <div class="text-muted text-xs font-semibold mt-2">
                    Extraída do edital + cruzada com seu repositório.
                  </div>
                </div>
                <div class="p-5 space-y-4" id="matrixMini"></div>
                <div class="p-4 border-t border-app bg-panel2">
                  <button id="btnOpenMatrixFull" class="btn btn-gold w-full py-2.5 text-sm">Abrir matriz completa</button>
                </div>
              </div>

              <div class="bg-panel border border-app rounded-2xl overflow-hidden">
                <div class="px-5 py-4 bg-panel2 border-b border-app flex items-center justify-between">
                  <div class="text-app font-extrabold">Detalhe do documento</div>
                  <span class="chip-purple text-xs font-extrabold px-2.5 py-1 rounded-full">Preview</span>
                </div>
                <div class="p-5" id="docPreview">
                  <div class="text-muted text-sm font-semibold">Selecione um documento para ver metadados e ações.</div>
                </div>
              </div>
            </div>

          </div>

          <!-- Modelos panel -->
          <div class="hidden bg-panel border border-app rounded-2xl p-5" id="panelModelos">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-app font-extrabold text-lg">Modelos & declarações</div>
                <div class="text-muted text-sm font-semibold mt-1">Gerações padronizadas (mock).</div>
              </div>
              <button class="btn btn-gold px-4 py-2 text-sm inline-flex items-center gap-2">
                <i data-lucide="sparkles" class="w-4 h-4"></i> Gerar modelo
              </button>
            </div>
            <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="pill rounded-2xl p-4">
                <div class="text-app font-extrabold">Declaração de inexistência de fato impeditivo</div>
                <div class="text-muted text-sm font-semibold mt-2">Pronta para preencher com CNPJ e responsável legal.</div>
                <button class="btn btn-outline w-full mt-3 py-2 text-sm">Abrir</button>
              </div>
              <div class="pill rounded-2xl p-4">
                <div class="text-app font-extrabold">Declaração de cumprimento ao art. 7º</div>
                <div class="text-muted text-sm font-semibold mt-2">Modelo para anexar na habilitação.</div>
                <button class="btn btn-outline w-full mt-3 py-2 text-sm">Abrir</button>
              </div>
            </div>
          </div>

          <!-- Matriz panel (full) -->
          <div class="hidden bg-panel border border-app rounded-2xl overflow-hidden" id="panelMatriz">
            <div class="px-5 py-4 bg-panel2 border-b border-app flex items-center justify-between">
              <div class="flex items-center gap-2">
                <i data-lucide="list-checks" class="w-5 h-5" style="color:var(--gold)"></i>
                <div class="text-app font-extrabold text-lg">Matriz de conformidade — completa</div>
              </div>
              <button class="btn btn-outline px-4 py-2 text-sm" id="btnBackToDocs">Voltar</button>
            </div>
            <div class="p-5 space-y-4" id="matrixFull"></div>
          </div>

        </div>
      </section>
    </main>
  </div>

  <!-- Upload modal (mock) -->
  <div id="uploadModal" class="hidden fixed inset-0 z-[60]">
    <div class="absolute inset-0 modal-backdrop backdrop-blur-sm"></div>
    <div class="relative min-h-screen flex items-end sm:items-center justify-center p-4">
      <div class="bg-panel border border-app rounded-2xl shadow-soft w-full max-w-xl overflow-hidden">
        <div class="px-5 py-4 bg-panel2 border-b border-app flex items-center justify-between">
          <div class="flex items-center gap-2">
            <i data-lucide="upload" class="w-5 h-5" style="color:var(--gold)"></i>
            <div class="text-app font-extrabold">Enviar documento</div>
          </div>
          <button id="uploadClose" class="p-2 rounded-xl hover-surface text-app" aria-label="Fechar">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>
        <div class="p-5 space-y-4">
          <div class="pill rounded-2xl p-5 text-center">
            <i data-lucide="file-up" class="w-10 h-10 mx-auto" style="color:var(--purple)"></i>
            <div class="text-app font-extrabold mt-3">Arraste e solte aqui</div>
            <div class="text-muted text-sm font-semibold mt-1">ou selecione um arquivo (PDF).</div>
            <button class="btn btn-outline mt-4 px-4 py-2 text-sm">Selecionar arquivo</button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="text-muted text-[10px] font-extrabold uppercase tracking-widest">Tipo</label>
              <select class="w-full mt-1 h-10 rounded-xl px-3 bg-transparent border border-app text-app font-bold focus:outline-none">
                <option>Regularidade Fiscal</option>
                <option>Regularidade Trabalhista</option>
                <option>Qualificação Técnica</option>
                <option>Qualificação Econômica</option>
                <option>Habilitação Jurídica</option>
              </select>
            </div>
            <div>
              <label class="text-muted text-[10px] font-extrabold uppercase tracking-widest">Validade</label>
              <input class="w-full mt-1 h-10 rounded-xl px-3 bg-transparent border border-app text-app font-bold focus:outline-none"
                     placeholder="dd/mm/aaaa ou Indeterminado" />
            </div>
          </div>
          <button class="btn btn-gold w-full py-2.5 text-sm">Salvar (mock)</button>
          <div class="text-muted text-xs font-semibold">*No produto real: OCR + extração de metadados + embedding.</div>
        </div>
      </div>
    </div>
  </div>

  <script>
    lucide.createIcons();

    // Theme
    const root = document.documentElement;
    const savedTheme = localStorage.getItem("efetiva_theme");
    if (savedTheme) root.setAttribute("data-theme", savedTheme);

    const iconSun = document.getElementById("iconSun");
    const iconMoon = document.getElementById("iconMoon");

    function syncThemeIcons(){
      const t = root.getAttribute("data-theme");
      if(t === "dark"){
        iconSun.classList.remove("hidden");
        iconMoon.classList.add("hidden");
      } else {
        iconSun.classList.add("hidden");
        iconMoon.classList.remove("hidden");
      }
      lucide.createIcons();
    }
    syncThemeIcons();

    document.getElementById("themeToggle").addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      localStorage.setItem("efetiva_theme", next);
      syncThemeIcons();
    });

    // Sidebar mobile
    const sidebar = document.getElementById("sidebar");
    const overlay = document.getElementById("overlay");
    const openSidebar = () => { sidebar.classList.remove("-translate-x-full"); overlay.classList.remove("hidden"); };
    const closeSidebar = () => { sidebar.classList.add("-translate-x-full"); overlay.classList.add("hidden"); };
    document.getElementById("openSidebar").addEventListener("click", openSidebar);
    document.getElementById("closeSidebar").addEventListener("click", closeSidebar);
    overlay.addEventListener("click", closeSidebar);

    // Active nav
    document.querySelectorAll("[data-nav]").forEach(a => {
      if(a.getAttribute("data-nav")==="documentos"){
        a.classList.add("ring-gold");
        a.style.background = "var(--gold-bg)";
        a.style.color = "var(--gold)";
      } else {
        a.style.color = "var(--muted)";
      }
    });

    // Tabs logic
    const tabDocs = document.getElementById("tabDocs");
    const tabModelos = document.getElementById("tabModelos");
    const tabMatriz = document.getElementById("tabMatriz");
    const panelDocs = document.getElementById("panelDocs");
    const panelModelos = document.getElementById("panelModelos");
    const panelMatriz = document.getElementById("panelMatriz");

    function setTab(which){
      [tabDocs, tabModelos, tabMatriz].forEach(b=>{
        b.classList.remove("ring-gold");
        b.style.background = "transparent";
        b.style.color = "var(--text)";
      });

      panelDocs.classList.add("hidden");
      panelModelos.classList.add("hidden");
      panelMatriz.classList.add("hidden");

      const activeBtn = (which==="docs"?tabDocs:(which==="modelos"?tabModelos:tabMatriz));
      activeBtn.classList.add("ring-gold");
      activeBtn.style.background = "var(--gold-bg)";
      activeBtn.style.color = "var(--gold)";

      if(which==="docs") panelDocs.classList.remove("hidden");
      if(which==="modelos") panelModelos.classList.remove("hidden");
      if(which==="matriz") panelMatriz.classList.remove("hidden");
      lucide.createIcons();
    }

    tabDocs.addEventListener("click", ()=>setTab("docs"));
    tabModelos.addEventListener("click", ()=>setTab("modelos"));
    tabMatriz.addEventListener("click", ()=>setTab("matriz"));

    document.getElementById("btnGoMatrix").addEventListener("click", ()=>setTab("matriz"));
    document.getElementById("btnOpenMatrixFull").addEventListener("click", ()=>setTab("matriz"));
    document.getElementById("btnBackToDocs").addEventListener("click", ()=>setTab("docs"));

    // Upload modal
    const uploadModal = document.getElementById("uploadModal");
    const openUpload = ()=> uploadModal.classList.remove("hidden");
    const closeUpload = ()=> uploadModal.classList.add("hidden");
    document.getElementById("btnUpload").addEventListener("click", openUpload);
    document.getElementById("uploadClose").addEventListener("click", closeUpload);
    uploadModal.addEventListener("click", (e)=>{ if(e.target === uploadModal.firstElementChild) closeUpload(); });

    // Data (mock docs)
    const docs = [
      { id:"d1", nome:"Contrato Social — Atualizado.pdf", tipo:"Habilitação Jurídica", validade:"Indeterminado" },
      { id:"d2", nome:"CND Tributos Federais.pdf", tipo:"Regularidade Fiscal", validade:"15/04/2026" },
      { id:"d3", nome:"CNDT — Certidão Negativa Trabalhista.pdf", tipo:"Regularidade Trabalhista", validade:"28/02/2026" },
      { id:"d4", nome:"Atestado Capacidade Técnica — Redes.pdf", tipo:"Qualificação Técnica", validade:"Indeterminado" },
      { id:"d5", nome:"Balanço Patrimonial 2024.pdf", tipo:"Qualificação Econômica", validade:"30/04/2026" },
    ];

    function parseBRDate(s){
      const [dd,mm,yyyy] = s.split("/").map(x=>parseInt(x,10));
      if(!dd || !mm || !yyyy) return null;
      return new Date(yyyy, mm-1, dd, 23, 59, 59);
    }

    function statusFromValidity(validade){
      if(validade.toLowerCase().includes("indet")) return { key:"VALIDO", label:"Válido", color:"var(--success)", bg:"rgba(16,185,129,.12)", border:"rgba(16,185,129,.25)" };
      const d = parseBRDate(validade);
      if(!d) return { key:"ALERTA", label:"Revisar", color:"var(--warning)", bg:"rgba(245,158,11,.12)", border:"rgba(245,158,11,.25)" };

      const now = new Date();
      const diffDays = Math.ceil((d - now) / (1000*60*60*24));
      if(diffDays < 0) return { key:"VENCIDO", label:"Vencido", color:"var(--danger)", bg:"rgba(239,68,68,.12)", border:"rgba(239,68,68,.25)" };
      if(diffDays <= 60) return { key:"ALERTA", label:`Vence em ${diffDays}d`, color:"var(--warning)", bg:"rgba(245,158,11,.12)", border:"rgba(245,158,11,.25)" };
      return { key:"VALIDO", label:"Válido", color:"var(--success)", bg:"rgba(16,185,129,.12)", border:"rgba(16,185,129,.25)" };
    }

    function renderDocs(list){
      const wrap = document.getElementById("docList");
      wrap.innerHTML = list.map(d=>{
        const st = statusFromValidity(d.validade);
        return `
          <button class="w-full text-left px-5 py-4 border-b border-app hover-surface" data-doc="${d.id}">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-3">
                <div class="p-2.5 rounded-xl" style="background:var(--pill-bg);">
                  <i data-lucide="file-text" class="w-5 h-5" style="color:var(--purple)"></i>
                </div>
                <div>
                  <div class="text-app font-extrabold text-sm">${d.nome}</div>
                  <div class="text-muted text-xs font-semibold mt-1">${d.tipo}</div>
                  <div class="text-muted text-xs font-semibold mt-2">Validade: <span class="text-app font-extrabold">${d.validade}</span></div>
                </div>
              </div>
              <div class="shrink-0 flex items-center gap-2">
                <span class="text-xs font-extrabold px-2.5 py-1 rounded-full"
                  style="color:${st.color}; background:${st.bg}; border:1px solid ${st.border}">
                  ${st.label}
                </span>
                <span class="p-2 rounded-xl hover-surface text-muted" aria-label="Opções">
                  <i data-lucide="more-vertical" class="w-5 h-5"></i>
                </span>
              </div>
            </div>
          </button>
        `;
      }).join("");
      lucide.createIcons();
    }

    // Search + filter
    const search = document.getElementById("searchDoc");
    const filterStatus = document.getElementById("filterStatus");

    function applyFilters(){
      const q = (search.value || "").toLowerCase().trim();
      const st = filterStatus.value;

      const out = docs.filter(d=>{
        const matchesQ = !q || (d.nome.toLowerCase().includes(q) || d.tipo.toLowerCase().includes(q));
        if(!matchesQ) return false;

        if(st === "ALL") return true;
        const s = statusFromValidity(d.validade).key;
        return s === st;
      });

      renderDocs(out);
    }

    search.addEventListener("input", applyFilters);
    filterStatus.addEventListener("change", applyFilters);

    // Preview panel
    const preview = document.getElementById("docPreview");
    document.getElementById("docList").addEventListener("click", (e)=>{
      const btn = e.target.closest("[data-doc]");
      if(!btn) return;
      const id = btn.getAttribute("data-doc");
      const d = docs.find(x=>x.id===id);
      const st = statusFromValidity(d.validade);

      preview.innerHTML = `
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-app font-extrabold">${d.nome}</div>
            <div class="text-muted text-sm font-semibold mt-1">${d.tipo}</div>
          </div>
          <span class="text-xs font-extrabold px-2.5 py-1 rounded-full"
            style="color:${st.color}; background:${st.bg}; border:1px solid ${st.border}">
            ${st.label}
          </span>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-3">
          <div class="pill rounded-2xl p-4">
            <div class="text-muted text-[10px] font-extrabold uppercase tracking-widest">Validade</div>
            <div class="text-app font-extrabold mt-1">${d.validade}</div>
          </div>
          <div class="pill rounded-2xl p-4">
            <div class="text-muted text-[10px] font-extrabold uppercase tracking-widest">Extração (mock)</div>
            <div class="text-app font-extrabold mt-1">Metadados OK</div>
          </div>
        </div>

        <div class="mt-4 space-y-2">
          <button class="btn btn-outline w-full py-2 text-sm inline-flex items-center justify-center gap-2">
            <i data-lucide="eye" class="w-4 h-4"></i> Visualizar
          </button>
          <button class="btn btn-outline w-full py-2 text-sm inline-flex items-center justify-center gap-2">
            <i data-lucide="sparkles" class="w-4 h-4"></i> Reprocessar com IA
          </button>
          <button class="btn btn-outline w-full py-2 text-sm inline-flex items-center justify-center gap-2">
            <i data-lucide="link" class="w-4 h-4"></i> Copiar link (GCS)
          </button>
        </div>

        <div class="text-muted text-xs font-semibold mt-4">
          *Produto real: texto extraído + embedding + vínculo com requisitos do edital.
        </div>
      `;
      lucide.createIcons();
    });

    // Matriz (mock)
    const matrix = [
      { area:"Habilitação Jurídica", status:"OK", msg:"Contrato social validado.", icon:"check-circle-2" },
      { area:"Regularidade Fiscal", status:"OK", msg:"CND Federal válida.", icon:"check-circle-2" },
      { area:"Regularidade Trabalhista", status:"FALHA", msg:"CNDT vencida — bloqueia habilitação.", icon:"x-circle" },
      { area:"Qualificação Técnica", status:"PENDENTE", msg:"Atestado deve evidenciar quantitativo mínimo.", icon:"clock-3" },
      { area:"Qualificação Econômica", status:"PENDENTE", msg:"Balanço: confirmar índices exigidos.", icon:"clock-3" },
      { area:"Declarações", status:"PENDENTE", msg:"Modelos do edital ainda não anexados.", icon:"clock-3" },
    ];

    function badgeStatus(s){
      if(s==="OK") return {label:"Atende", color:"var(--success)", bg:"rgba(16,185,129,.12)", border:"rgba(16,185,129,.25)"};
      if(s==="FALHA") return {label:"Falha", color:"var(--danger)", bg:"rgba(239,68,68,.12)", border:"rgba(239,68,68,.25)"};
      return {label:"Pendente", color:"var(--warning)", bg:"rgba(245,158,11,.12)", border:"rgba(245,158,11,.25)"};
    }

    function renderMatrixMini(){
      const host = document.getElementById("matrixMini");
      host.innerHTML = matrix.slice(0,4).map(m=>{
        const b = badgeStatus(m.status);
        return `
          <div class="pill rounded-2xl p-4">
            <div class="flex items-start gap-3">
              <div class="p-2 rounded-xl" style="background:${b.bg}">
                <i data-lucide="${m.icon}" class="w-5 h-5" style="color:${b.color}"></i>
              </div>
              <div class="flex-1">
                <div class="flex items-center justify-between gap-3">
                  <div class="text-app font-extrabold text-sm">${m.area}</div>
                  <span class="text-[11px] font-extrabold px-2.5 py-1 rounded-full"
                    style="color:${b.color}; background:${b.bg}; border:1px solid ${b.border}">
                    ${b.label}
                  </span>
                </div>
                <div class="text-muted text-xs font-semibold mt-1">${m.msg}</div>
              </div>
            </div>
          </div>
        `;
      }).join("");
      lucide.createIcons();
    }

    function renderMatrixFull(){
      const host = document.getElementById("matrixFull");
      host.innerHTML = matrix.map((m, idx)=>{
        const b = badgeStatus(m.status);
        return `
          <div class="pill rounded-2xl p-5">
            <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div class="flex items-start gap-3">
                <div class="p-2.5 rounded-xl" style="background:${b.bg}">
                  <i data-lucide="${m.icon}" class="w-5 h-5" style="color:${b.color}"></i>
                </div>
                <div>
                  <div class="text-app font-extrabold">${idx+1}. ${m.area}</div>
                  <div class="text-muted text-sm font-semibold mt-1">${m.msg}</div>
                  <div class="text-muted text-xs font-semibold mt-3">
                    Evidência sugerida: <span class="text-app font-extrabold">documento do repositório</span> ou <span class="text-app font-extrabold">modelo do edital</span>.
                  </div>
                </div>
              </div>
              <div class="shrink-0 flex flex-col gap-2 min-w-[220px]">
                <span class="text-[11px] font-extrabold px-2.5 py-1 rounded-full text-center"
                  style="color:${b.color}; background:${b.bg}; border:1px solid ${b.border}">
                  ${b.label}
                </span>
                <button class="btn btn-outline py-2 text-sm">Vincular evidência</button>
                <button class="btn btn-outline py-2 text-sm">Abrir requisito</button>
              </div>
            </div>
          </div>
        `;
      }).join("");
      lucide.createIcons();
    }

    // Wire buttons
    document.getElementById("btnOpenMatrixFull").addEventListener("click", ()=>setTab("matriz"));

    // Init
    renderDocs(docs);
    renderMatrixMini();
    renderMatrixFull();
    setTab("docs");
  </script>
</body>
</html>


