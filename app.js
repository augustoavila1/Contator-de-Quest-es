const { createClient } = supabase;
const config = window.SUPABASE_CONFIG;

if (!config?.url || !config?.anonKey || config.url.includes('SEU-PROJETO')) {
  document.body.innerHTML = `
    <main style="max-width:720px;margin:60px auto;padding:28px;font-family:system-ui">
      <h1>Configuração do Supabase</h1>
      <p>Abra o arquivo <b>config.js</b> e coloque a URL do seu projeto e a chave anon do Supabase.</p>
      <p>Depois, atualize a página.</p>
    </main>`;
  throw new Error('Supabase não configurado.');
}

const db = createClient(config.url, config.anonKey);
const areas = ["Matemática", "Natureza", "Humanas", "Linguagens"];
const form = document.querySelector("#questaoForm");
const quantidade = document.querySelector("#quantidade");
const areaInput = document.querySelector("#area");
const message = document.querySelector("#message");

const areaMateria = {
  "Matemática": ["Matemática"],
  "Natureza": ["Física", "Química", "Biologia"],
  "Humanas": ["História", "Filosofia", "Sociologia", "Geografia"],
  "Linguagens": ["Língua Portuguesa", "Inglês", "Literatura", "Artes", "Educação Física"]
};

function showMessage(text, ok = true) {
  message.style.color = ok ? "#26834a" : "#c0392b";
  message.textContent = text;
}

function syncMateria() {
  const select = document.querySelector("#materia");
  const current = select.value;
  const options = ['<option value="">Questões gerais da área</option>'];
  (areaMateria[areaInput.value] || []).forEach(m => options.push(`<option>${m}</option>`));
  options.push("<option>Outra</option>");
  select.innerHTML = options.join("");
  if ([...select.options].some(o => o.value === current)) select.value = current;
}

async function ensureUser() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    document.querySelector("#loginScreen").classList.remove("hidden");
    document.querySelector("#app").classList.add("hidden");
    return false;
  }
  document.querySelector("#loginScreen").classList.add("hidden");
  document.querySelector("#app").classList.remove("hidden");
  document.querySelector("#userEmail").textContent = session.user.email || "Conta";
  return true;
}

document.querySelector("#authForm").addEventListener("submit", async e => {
  e.preventDefault();
  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;
  const mode = document.querySelector("#authMode").value;
  const button = document.querySelector("#authSubmit");
  button.disabled = true;
  showAuthMessage("Aguarde...", true);

  const result = mode === "signup"
    ? await db.auth.signUp({ email, password })
    : await db.auth.signInWithPassword({ email, password });

  button.disabled = false;
  if (result.error) {
    showAuthMessage(result.error.message, false);
    return;
  }

  if (mode === "signup" && !result.data.session) {
    showAuthMessage("Conta criada! Se o Supabase pedir confirmação de e-mail, confirme e depois entre novamente.", true);
  } else {
    await ensureUser();
    await refresh();
  }
});

document.querySelector("#toggleAuth").onclick = () => {
  const mode = document.querySelector("#authMode");
  const signup = mode.value === "signup";
  mode.value = signup ? "login" : "signup";
  document.querySelector("#authTitle").textContent = signup ? "Entrar no contador" : "Criar sua conta";
  document.querySelector("#authSubmit").textContent = signup ? "Entrar" : "Criar conta";
  document.querySelector("#toggleAuth").textContent = signup ? "Ainda não tenho conta" : "Já tenho uma conta";
  document.querySelector("#authHint").textContent = signup ? "Use o mesmo login em celular, tablet e PC." : "Sua conta separa seus lançamentos dos demais usuários.";
  showAuthMessage("", true);
};

function showAuthMessage(text, ok) {
  const el = document.querySelector("#authMessage");
  el.style.color = ok ? "#26834a" : "#c0392b";
  el.textContent = text;
}

document.querySelector("#logoutBtn").onclick = async () => {
  await db.auth.signOut();
  location.reload();
};

document.querySelectorAll(".area-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".area-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    areaInput.value = btn.dataset.area;
    syncMateria();
  });
});

syncMateria();
document.querySelector("#minus").onclick = () => quantidade.value = Math.max(1, Number(quantidade.value) - 1);
document.querySelector("#plus").onclick = () => quantidade.value = Number(quantidade.value) + 1;
document.querySelectorAll(".quick button").forEach(btn => btn.onclick = () => quantidade.value = btn.dataset.qtd);

form.addEventListener("submit", async e => {
  e.preventDefault();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return;

  const body = {
    user_id: user.id,
    area: areaInput.value,
    quantidade: Number(quantidade.value),
    descricao: document.querySelector("#descricao").value.trim(),
    materia: document.querySelector("#materia").value || null
  };

  if (!Number.isInteger(body.quantidade) || body.quantidade < 1 || !body.descricao) {
    showMessage("Informe uma quantidade válida e onde as questões foram feitas.", false);
    return;
  }

  const { error } = await db.from("lancamentos").insert(body);
  if (error) {
    showMessage("Não foi possível adicionar: " + error.message, false);
    return;
  }

  showMessage(`+${body.quantidade} questões adicionadas!`);
  document.querySelector("#descricao").value = "";
  document.querySelector("#materia").value = "";
  await refresh();
});

async function loadSummary() {
  const { data: rows, error } = await db
    .from("lancamentos")
    .select("area, materia, quantidade")
    .order("area")
    .order("materia");

  if (error) throw error;

  const resumo = Object.fromEntries(areas.map(area => [area, { total: 0, materias: [], geral: 0 }]));
  for (const row of rows || []) {
    const quantidade = Number(row.quantidade);
    resumo[row.area].total += quantidade;
    if (row.materia) {
      const existing = resumo[row.area].materias.find(x => x.materia === row.materia);
      if (existing) existing.quantidade += quantidade;
      else resumo[row.area].materias.push({ materia: row.materia, quantidade });
    } else {
      resumo[row.area].geral += quantidade;
    }
  }

  const total = areas.reduce((sum, area) => sum + resumo[area].total, 0);
  document.querySelector("#totalQuestoes").textContent = total.toLocaleString("pt-BR");
  const max = Math.max(1, ...areas.map(a => resumo[a].total));
  const grid = document.querySelector("#areasGrid");
  grid.innerHTML = "";

  for (const area of areas) {
    const info = resumo[area];
    const node = document.querySelector("#areaTemplate").content.cloneNode(true);
    node.querySelector(".area-name").textContent = area;
    node.querySelector(".area-number").textContent = info.total.toLocaleString("pt-BR");
    node.querySelector(".progress-bar").style.width = `${(info.total / max) * 100}%`;
    const details = node.querySelector(".details");
    const content = node.querySelector(".details-content");

    details.onclick = () => {
      details.classList.toggle("open");
      content.classList.toggle("open");
      if (content.classList.contains("open")) {
        const rows = [];
        info.materias.forEach(m => rows.push(`<div class="detail-row"><span>${escapeHtml(m.materia)}</span><strong>${m.quantidade}</strong></div>`));
        if (info.geral) rows.push(`<div class="detail-row"><span>Questões gerais</span><strong>${info.geral}</strong></div>`);
        content.innerHTML = rows.length ? rows.join("") : `<div class="detail-row"><span>Nenhum lançamento ainda.</span><strong>0</strong></div>`;
      }
    };
    grid.appendChild(node);
  }
}

async function loadHistory() {
  const { data: rows, error } = await db
    .from("lancamentos")
    .select("id, area, quantidade, descricao, materia, criado_em")
    .order("criado_em", { ascending: false })
    .limit(100);

  if (error) throw error;
  const list = document.querySelector("#historyList");
  list.innerHTML = rows?.length ? rows.map(x => `
    <div class="history-item">
      <div><strong>${x.quantidade} — ${escapeHtml(x.area)}${x.materia ? " · " + escapeHtml(x.materia) : ""}</strong><br>
      <small>${escapeHtml(x.descricao)} · ${formatDate(x.criado_em)}</small></div>
      <button class="delete" data-id="${x.id}">Excluir</button>
    </div>`).join("") : "<p>Nenhum lançamento ainda.</p>";

  list.querySelectorAll(".delete").forEach(btn => btn.onclick = async () => {
    if (!confirm("Excluir este lançamento?")) return;
    const { error } = await db.from("lancamentos").delete().eq("id", btn.dataset.id);
    if (error) {
      alert("Não foi possível excluir: " + error.message);
      return;
    }
    await refresh();
    await loadHistory();
  });
}

function formatDate(s) {
  const d = new Date(s);
  return d.toLocaleString("pt-BR");
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
}

async function refresh() {
  try {
    await loadSummary();
    if (!document.querySelector("#history").classList.contains("hidden")) await loadHistory();
  } catch (error) {
    console.error(error);
    showMessage("Erro ao carregar os dados. Confira a configuração do Supabase.", false);
  }
}

document.querySelector("#historyBtn").onclick = async () => {
  document.querySelector("#history").classList.remove("hidden");
  await loadHistory();
};
document.querySelector("#closeHistory").onclick = () => document.querySelector("#history").classList.add("hidden");

(async () => {
  const ok = await ensureUser();
  if (ok) await refresh();
})();
