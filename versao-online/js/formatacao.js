/* ---------- formatação ---------- */
const brl = v => (Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dataBR = s => s ? s.split('-').reverse().join('/') : '';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const hoje = () => new Date().toISOString().slice(0,10);

function mostrar(campo, valor){
  if (valor === undefined || valor === '') return '';
  switch(campo.tipo){
    case 'dinheiro': return brl(valor);
    case 'data': return dataBR(valor);
    case 'ref': { const r = buscar(campo.ref, valor); return r ? esc(r.nome) : ''; }
    case 'select': return etiqueta(valor);
    default: return esc(valor);
  }
}
function etiqueta(v){
  const cor = {'Rascunho':'c','Enviada':'','Aprovada':'g','Recusada':'r','Em andamento':'y','Concluída':'g','Pausada':'r','Orçamento':'','Receita':'g','Despesa':'r','Pago':'c','A pagar / A receber':'y','Em elaboração':'c','Aguardando assinatura':'y','Em vigor':'g','Encerrado':'c','Cancelado':'r'}[v];
  return cor === undefined ? esc(v) : `<span class="tag ${cor}">${esc(v)}</span>`;
}
