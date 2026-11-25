/* ---------- formatação ---------- */
const brl = v => (Number(v)||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const dataBR = s => s ? s.split('-').reverse().join('/') : '';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const hoje = () => ymd(new Date());   // data local (não usar toISOString: é horário de Londres)

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
  const cor = {'Rascunho':'c','Enviada':'','Aprovada':'g','Recusada':'r','Em andamento':'y','Concluída':'g','Pausada':'r','Orçamento':'','Receita':'g','Despesa':'r','Pago':'c','A pagar / A receber':'y','Em elaboração':'c','Aguardando assinatura':'y','Em vigor':'g','Encerrado':'c','Cancelado':'r','Agendado':'','Concluído':'g'}[v];
  return cor === undefined ? esc(v) : `<span class="tag ${cor}">${esc(v)}</span>`;
}

/* ---------- lançamentos do financeiro ---------- */
/* data que conta para os relatórios: a do pagamento; se ainda não foi pago, o vencimento */
const dataLanc = f => f.data || f.vencimento || '';
/* nome do beneficiário/pagador; lançamentos antigos usavam fornecedor, prestador ou cliente cadastrado */
const nomeLanc = f => f.favorecido || ['fornecedor:fornecedores','prestador:prestadores','cliente:clientes']
  .map(x => x.split(':')).map(([k,t]) => f[k] && (buscar(t, f[k]) || {}).nome).find(Boolean) || '';
