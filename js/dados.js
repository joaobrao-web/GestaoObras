/* =====================================================================
   DADOS — salvos automaticamente no navegador deste computador.
   ===================================================================== */
const CHAVE = 'gestao_obras_v1';
let DB = carregar();
function carregar(){
  let d = {};
  try { d = JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch(e){}
  for (const t in TABELAS) d[t] = d[t] || [];
  return d;
}
function salvar(){ localStorage.setItem(CHAVE, JSON.stringify(DB)); }
const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const buscar = (t,id) => DB[t].find(r => r.id === id);
