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
/* realizado = já foi pago/recebido (tem data do pagamento). Sem data, só vencimento = previsto */
const realizado = f => !!f.data && f.pago !== 'A pagar / A receber';
/* totais: real (só realizados) e previsto (realizados + pendentes) */
function totaisFin(lista){
  const s = fn => lista.filter(fn).reduce((t,f)=>t+Number(f.valor||0),0);
  const rec = s(f => f.tipo==='Receita' && realizado(f)), desp = s(f => f.tipo==='Despesa' && realizado(f));
  const aRec = s(f => f.tipo==='Receita' && !realizado(f)), aPag = s(f => f.tipo==='Despesa' && !realizado(f));
  return {rec, desp, saldo: rec-desp, aRec, aPag, previsto: rec+aRec-desp-aPag};
}
const cardsSaldo = (x, sufixo='') => `<div class="cards">
    <div class="card"><div class="lbl">Recebido${sufixo}</div><div class="val pos">${brl(x.rec)}</div></div>
    <div class="card"><div class="lbl">Pago${sufixo}</div><div class="val neg">${brl(x.desp)}</div></div>
    <div class="card destaque"><div class="lbl">💵 Saldo real${sufixo}</div><div class="val ${x.saldo>=0?'pos':'neg'}">${brl(x.saldo)}</div><div class="sub">só o que já foi pago / recebido</div></div>
  </div><div class="cards">
    <div class="card"><div class="lbl">A receber${sufixo}</div><div class="val">${brl(x.aRec)}</div></div>
    <div class="card"><div class="lbl">A pagar${sufixo}</div><div class="val">${brl(x.aPag)}</div></div>
    <div class="card destaque"><div class="lbl">🔮 Saldo previsto${sufixo}</div><div class="val ${x.previsto>=0?'pos':'neg'}">${brl(x.previsto)}</div><div class="sub">saldo real + a receber − a pagar</div></div>
  </div>`;
