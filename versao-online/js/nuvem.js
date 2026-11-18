/* =====================================================================
   NUVEM — login com Google (só e-mails da empresa) e sincronização
   em tempo real com o Firestore. Cada tabela vira uma coleção e cada
   registro um documento (id do registro = id do documento).
   ===================================================================== */
firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const fs = firebase.firestore();
fs.enablePersistence({synchronizeTabs:true}).catch(()=>{});   // funciona offline e sincroniza depois

let USUARIO = null, CARREGADO = false, RENDER_PENDENTE = false;
const ENVIADO = {};          // última versão conhecida na nuvem: ENVIADO[tabela][id] = JSON
const OUVINTES = [];
for (const t in TABELAS) ENVIADO[t] = {};

/* JSON com chaves em ordem fixa, para comparar versões sem falsos 'alterado' */
const canon = v => Array.isArray(v) ? '['+v.map(canon).join(',')+']'
  : v && typeof v === 'object' ? '{'+Object.keys(v).sort().filter(k=>v[k]!==undefined).map(k=>JSON.stringify(k)+':'+canon(v[k])).join(',')+'}'
  : JSON.stringify(v ?? null);

const emailOk = u => u && u.emailVerified && String(u.email||'').toLowerCase().endsWith('@'+DOMINIO_PERMITIDO.toLowerCase());

/* ---------- tela de login ---------- */
function telaLogin(msg){
  document.getElementById('login').innerHTML = `<div class="login-bg"><div class="login-card">
    <img src="assets/logo-escuro.png" alt="SB Tech Wall">
    <div class="login-sub">Gestão de Obras</div>
    ${msg ? `<p class="login-msg">${msg}</p>` : `<p>Entre com o seu e-mail <b>@${esc(DOMINIO_PERMITIDO)}</b>.</p>`}
    <button class="btn google" onclick="entrar()"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg> Entrar com Google</button>
  </div></div>`;
}
function entrar(){
  const p = new firebase.auth.GoogleAuthProvider();
  p.setCustomParameters({hd: DOMINIO_PERMITIDO, prompt:'select_account'});
  auth.signInWithPopup(p).catch(e => {
    if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request')
      telaLogin('Não foi possível entrar: ' + esc(e.message));
  });
}
function sair(){ if (confirm('Sair do sistema?')) auth.signOut(); }

auth.onAuthStateChanged(async u => {
  OUVINTES.splice(0).forEach(f => f());
  if (!u){ USUARIO = null; CARREGADO = false; document.body.classList.remove('logado'); telaLogin(); return; }
  if (!emailOk(u)){
    await auth.signOut();
    telaLogin(`A conta <b>${esc(u.email)}</b> não tem acesso.<br>Use o seu e-mail <b>@${esc(DOMINIO_PERMITIDO)}</b>.`);
    return;
  }
  USUARIO = u;
  document.getElementById('login').innerHTML = '<div class="login-bg"><div class="login-card"><p>Carregando dados...</p></div></div>';
  document.getElementById('usuario').innerHTML = `<span title="${esc(u.email)}">👤 ${esc(u.displayName || u.email)}</span><button onclick="sair()">Sair</button>`;
  ouvir();
});

/* ---------- receber dados (tempo real) ---------- */
function ouvir(){
  const faltam = new Set(Object.keys(TABELAS));
  for (const t in TABELAS){
    OUVINTES.push(fs.collection(t).onSnapshot(snap => {
      snap.docChanges().forEach(ch => {
        const id = ch.doc.id;
        if (ch.type === 'removed'){
          DB[t] = DB[t].filter(r => r.id !== id); delete ENVIADO[t][id]; return;
        }
        const r = {...ch.doc.data(), id};
        ENVIADO[t][id] = canon(r);
        const i = DB[t].findIndex(x => x.id === id);
        if (i >= 0) DB[t][i] = r; else DB[t].push(r);
      });
      if (faltam.size){ faltam.delete(t); if (!faltam.size) iniciar(); }
      else redesenhar();
    }, e => {
      telaLogin('Sem permissão para ler os dados. Confira as regras do Firestore e o domínio configurado.<br><small>'+esc(e.message)+'</small>');
      document.body.classList.remove('logado');
    }));
  }
}
function iniciar(){
  CARREGADO = true;
  document.getElementById('login').innerHTML = '';
  document.body.classList.add('logado');
  render();
  oferecerMigracao();
  lembreteBackup();
}
/* não redesenha com um formulário aberto, para não apagar o que está sendo digitado */
function redesenhar(){
  if (document.querySelector('#modal .modal')) { RENDER_PENDENTE = true; return; }
  render();
}
const _fecharOriginal = fechar;
fechar = function(){ _fecharOriginal(); if (RENDER_PENDENTE){ RENDER_PENDENTE = false; render(); } };

/* ---------- enviar alterações ---------- */
async function sincronizar(){
  if (!CARREGADO) return;
  const ops = [];
  for (const t in TABELAS){
    const vistos = new Set();
    for (const r of DB[t]){
      if (!r.id) r.id = novoId();
      vistos.add(r.id);
      const j = canon(r);
      if (ENVIADO[t][r.id] !== j){ ops.push(['set', t, r.id, JSON.parse(JSON.stringify(r))]); ENVIADO[t][r.id] = j; }
    }
    for (const id in ENVIADO[t]) if (!vistos.has(id)){ ops.push(['del', t, id]); delete ENVIADO[t][id]; }
  }
  if (!ops.length) return;
  status('Salvando...');
  try {
    for (let i = 0; i < ops.length; i += 400){
      const b = fs.batch();
      ops.slice(i, i+400).forEach(([op,t,id,d]) => {
        const ref = fs.collection(t).doc(id);
        if (op === 'set'){ delete d.id; b.set(ref, d); } else b.delete(ref);
      });
      await b.commit();
    }
    status('Salvo ✓', 2000);
  } catch(e){
    status('');
    alert('Erro ao salvar na nuvem: ' + e.message + '\nRecarregue a página e tente de novo.');
  }
}
let _stT;
function status(txt, some){
  const el = document.getElementById('salvando'); if (!el) return;
  el.textContent = txt; clearTimeout(_stT);
  if (some) _stT = setTimeout(()=>el.textContent='', some);
}

/* ---------- trazer dados antigos que estavam só neste navegador ---------- */
function oferecerMigracao(){
  let antigo; try { antigo = JSON.parse(localStorage.getItem(CHAVE)); } catch(e){}
  if (!antigo || localStorage.getItem(CHAVE+'_migrado')) return;
  const qtd = Object.keys(TABELAS).reduce((s,t)=>s+((antigo[t]||[]).length),0);
  if (!qtd) return;
  const nuvemVazia = Object.keys(TABELAS).every(t => !DB[t].length);
  const txt = nuvemVazia
    ? `Encontrei ${qtd} registro(s) salvos só neste computador.\n\nDeseja enviá-los para a nuvem para que toda a equipe tenha acesso?`
    : `Encontrei ${qtd} registro(s) salvos só neste computador.\n\nA nuvem já tem dados. Deseja JUNTAR os dados deste computador com os da nuvem? (registros com o mesmo código são atualizados com a versão deste computador)`;
  if (!confirm(txt)) { if (confirm('Não perguntar mais neste computador?')) localStorage.setItem(CHAVE+'_migrado', hoje()); return; }
  for (const t in TABELAS) for (const r of (antigo[t]||[])){
    const i = DB[t].findIndex(x => x.id === r.id);
    if (i >= 0) DB[t][i] = r; else DB[t].push(r);
  }
  localStorage.setItem(CHAVE+'_migrado', hoje());
  salvar(); render();
  alert('Dados enviados para a nuvem!');
}
