/* =====================================================================
   DADOS — ficam na nuvem (Firestore) e são compartilhados pela equipe.
   O resto do sistema continua usando DB e salvar() como antes;
   o arquivo nuvem.js cuida de enviar e receber as alterações.
   ===================================================================== */
const CHAVE = 'gestao_obras_v1';           // chave antiga (dados só deste navegador)
let DB = {};
for (const t in TABELAS) DB[t] = [];
function salvar(){ sincronizar(); }
const novoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,6);
const buscar = (t,id) => DB[t].find(r => r.id === id);
