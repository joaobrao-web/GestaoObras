/* =====================================================================
   PAINEL
   ===================================================================== */
function resumoObra(id){
  const l = DB.financeiro.filter(f => f.obra === id);
  const rec = l.filter(f => f.tipo==='Receita').reduce((s,f)=>s+Number(f.valor||0),0);
  const desp = l.filter(f => f.tipo==='Despesa').reduce((s,f)=>s+Number(f.valor||0),0);
  return {rec, desp, saldo: rec-desp};
}
function painel(){
  const fin = DB.financeiro;
  const soma = (fn) => fin.filter(fn).reduce((s,f)=>s+Number(f.valor||0),0);
  const mes = hoje().slice(0,7);
  const recMes = soma(f => f.tipo==='Receita' && (f.data||'').startsWith(mes));
  const despMes = soma(f => f.tipo==='Despesa' && (f.data||'').startsWith(mes));
  const aPagar = soma(f => f.tipo==='Despesa' && f.pago!=='Pago');
  const aReceber = soma(f => f.tipo==='Receita' && f.pago!=='Pago');
  const saldoGeral = soma(f=>f.tipo==='Receita' && f.pago==='Pago') - soma(f=>f.tipo==='Despesa' && f.pago==='Pago');
  const ativas = DB.obras.filter(o => o.status==='Em andamento').length;
  const enviadas = DB.propostas.filter(p => p.status==='Enviada');
  const totEnv = enviadas.reduce((s,p)=>s+Number(p.total||0),0);

  const obras = DB.obras.filter(o => o.status!=='Concluída');
  const linhasObras = obras.map(o => {
    const r = resumoObra(o.id), pct = o.valor ? Math.min(100, r.rec/o.valor*100) : 0;
    return `<tr class="click" onclick="ir('obra:${o.id}')">
      <td><b>${esc(o.nome)}</b></td><td>${etiqueta(o.status||'')}</td>
      <td class="num">${brl(o.valor)}</td><td class="num">${brl(r.rec)}</td>
      <td><div class="bar" title="${pct.toFixed(0)}% recebido"><i style="width:${pct}%"></i></div></td>
      <td class="num">${brl(r.desp)}</td><td class="num ${r.saldo>=0?'pos':'neg'}">${brl(r.saldo)}</td></tr>`;
  }).join('');

  const pendentes = fin.filter(f => f.pago!=='Pago').sort((a,b)=>(a.data||'').localeCompare(b.data||'')).slice(0,8);
  const linhasPend = pendentes.map(f => `<tr class="click" onclick="abrir('financeiro','${f.id}')">
      <td>${dataBR(f.data)}</td><td>${etiqueta(f.tipo)}</td><td>${esc(f.descricao)}</td>
      <td>${mostrar({tipo:'ref',ref:'obras'},f.obra)}</td><td class="num">${brl(f.valor)}</td></tr>`).join('');

  return `<div class="top"><h2>Painel</h2>
    <div class="tools"><button class="btn sec" onclick="abrir('financeiro')">+ Lançamento</button>
    <button class="btn gold" onclick="abrir('obras')">+ Nova obra</button></div></div>
  <div class="cards">
    <div class="card"><div class="lbl">Obras em andamento</div><div class="val">${ativas}</div></div>
    <div class="card"><div class="lbl">Saldo em caixa (pagos)</div><div class="val ${saldoGeral>=0?'pos':'neg'}">${brl(saldoGeral)}</div></div>
    <div class="card"><div class="lbl">Receitas deste mês</div><div class="val pos">${brl(recMes)}</div></div>
    <div class="card"><div class="lbl">Despesas deste mês</div><div class="val neg">${brl(despMes)}</div></div>
    <div class="card"><div class="lbl">A receber</div><div class="val">${brl(aReceber)}</div></div>
    <div class="card"><div class="lbl">A pagar</div><div class="val">${brl(aPagar)}</div></div>
    <div class="card" style="cursor:pointer" onclick="ir('propostas')"><div class="lbl">Propostas aguardando resposta (${enviadas.length})</div><div class="val">${brl(totEnv)}</div></div>
  </div>
  <div class="box"><h3>Obras ativas — clique para ver detalhes</h3>
    ${obras.length ? `<div class="tablewrap"><table><tr><th>Obra</th><th>Status</th><th class="num">Contrato</th><th class="num">Recebido</th><th></th><th class="num">Gasto</th><th class="num">Resultado</th></tr>${linhasObras}</table></div>`
      : `<div class="empty">Nenhuma obra ativa. Clique em <b>+ Nova obra</b> para começar.</div>`}
  </div>
  <div class="box"><h3>Contas pendentes (a pagar / a receber)</h3>
    ${pendentes.length ? `<div class="tablewrap"><table><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Obra</th><th class="num">Valor</th></tr>${linhasPend}</table></div>`
      : `<div class="empty">Nenhuma conta pendente. 👍</div>`}
  </div>`;
}
