/* =====================================================================
   LISTAS (Obras, Financeiro, Clientes, Funcionários, Fornecedores)
   ===================================================================== */
function lista(t){
  const T = TABELAS[t], f = filtros[t] || (filtros[t] = {texto:'', obra:'', tipo:'', mes:''});
  let rows = DB[t].slice();
  if (f.texto){
    const q = f.texto.toLowerCase();
    rows = rows.filter(r => T.campos.some(c => c.tipo!=='itens' && String(c.tipo==='ref' ? (buscar(c.ref,r[c.k])||{}).nome||'' : (c.padrao && !r[c.k] ? c.padrao(r) : r[c.k])||'').toLowerCase().includes(q)));
  }
  if (t==='financeiro'){
    if (f.obra) rows = rows.filter(r => r.obra === f.obra);
    if (f.categoria) rows = rows.filter(r => r.categoria === f.categoria);
    if (f.tipo) rows = rows.filter(r => r.tipo === f.tipo);
    var ateMes = f.mes ? rows.filter(r => dataLanc(r).slice(0,7) <= f.mes) : null;   // tudo até o fim do mês filtrado (para o saldo acumulado)
    if (f.mes)  rows = rows.filter(r => dataLanc(r).startsWith(f.mes));
    /* pendentes (sem pagamento) sempre no topo, vencimento mais próximo primeiro; depois os realizados, mais recentes primeiro */
    rows.sort((a,b)=> realizado(a)-realizado(b) || (realizado(a) ? dataLanc(b).localeCompare(dataLanc(a)) : dataLanc(a).localeCompare(dataLanc(b))));
  } else if (t==='agenda') rows.sort((a,b)=>((b.data||'')+(b.hora||'')).localeCompare((a.data||'')+(a.hora||'')));
  else if (t==='propostas' || t==='contratos') rows.sort((a,b)=>(b.data||'').localeCompare(a.data||'') || String(b.numero).localeCompare(String(a.numero)));
  else rows.sort((a,b)=>(a.nome||'').localeCompare(b.nome||''));

  const cols = T.colunas.map(k => T.campos.find(c=>c.k===k));
  const iClip = Math.max(0, cols.findIndex(c=>c.k==='nome'));   // coluna que mostra o 📎 de anexos
  const extra = t==='agenda' ? `<button class="btn sec" onclick="AGENDA.modo='mes';render()">📅 Ver calendário</button>`
    : t==='financeiro' ? `
    <select onchange="filtros.financeiro.obra=this.value;render()"><option value="">Todas as obras</option>
      ${DB.obras.map(o=>`<option value="${o.id}" ${f.obra===o.id?'selected':''}>${esc(o.nome)}</option>`).join('')}</select>
    <select onchange="filtros.financeiro.categoria=this.value;render()"><option value="">Todas as categorias</option>
      ${CATEGORIAS.map(x=>`<option ${f.categoria===x?'selected':''}>${x}</option>`).join('')}</select>
    <select onchange="filtros.financeiro.tipo=this.value;render()"><option value="">Receitas e despesas</option>
      ${['Receita','Despesa'].map(x=>`<option ${f.tipo===x?'selected':''}>${x}</option>`).join('')}</select>
    <input type="month" value="${f.mes}" onchange="filtros.financeiro.mes=this.value;render()" title="Filtrar por mês">` : '';

  let totais = '';
  if (t==='financeiro'){
    const filtrado = f.texto||f.obra||f.categoria||f.tipo||f.mes;
    totais = f.mes ? cardsMes(totaisFin(rows), totaisFin(ateMes), f.mes) : cardsSaldo(totaisFin(rows), filtrado ? ' (filtro)' : '');
  }
  const clique = t==='obras' ? id=>`ir('obra:${id}')` : t==='propostas' ? id=>`ir('proposta:${id}')` : id=>`abrir('${t}','${id}')`;

  return `<div class="top"><h2>${T.icone} ${T.titulo}</h2>
    <div class="tools">
      <input id="busca" placeholder="🔍 Buscar..." value="${esc(f.texto)}" oninput="filtros['${t}'].texto=this.value;render();focoBusca()">
      ${extra}
      <button class="btn sec" onclick="abrirImportar('${t}')" title="Trazer vários registros de uma planilha Excel ou CSV">⬆ Importar planilha</button>
      <button class="btn sec" onclick="exportarCSV('${t}')" title="Baixar esta lista para abrir no Excel">⬇ Exportar</button>
      <button class="btn" onclick="abrir('${t}')">+ Novo ${T.singular}</button>
    </div></div>
  ${totais}
  ${t==='financeiro' ? quadrosFin(rows, !!(f.texto||f.obra||f.categoria||f.tipo||f.mes)) : `<div class="tablewrap">${rows.length ? `<table>
    <tr>${cols.map(c=>`<th class="${c.tipo==='dinheiro'?'num':''}">${c.lc || c.l.replace(' (R$)','')}</th>`).join('')}</tr>
    ${rows.map(r=>`<tr class="click" onclick="${clique(r.id)}">${cols.map((c,i)=>`<td class="${c.tipo==='dinheiro'?'num':''}">${mostrar(c, c.padrao && !r[c.k] ? c.padrao(r) : r[c.k])}${i===iClip && (r.anexos||[]).length?` <span class="clip" title="${r.anexos.length} documento(s) anexado(s)">📎${r.anexos.length}</span>`:''}</td>`).join('')}</tr>`).join('')}
  </table>` : `<div class="empty">Nada cadastrado${f.texto||f.obra||f.categoria||f.tipo||f.mes?' com esse filtro':''}. Clique em <b>+ Novo ${T.singular}</b>.</div>`}</div>`}`;
}
/* financeiro em dois quadros: realizados (esquerda) e a pagar / a receber (direita).
   Cada quadro mostra só os primeiros 50; o botão "Mostrar mais" abre os próximos. */
const FIN_PASSO = 50, FIN_LIMITE = {feitos: FIN_PASSO, pend: FIN_PASSO};
function maisFin(q, n){ FIN_LIMITE[q] = n; render(); }
function quadrosFin(rows, filtrado){
  const hj = hoje(), feitos = rows.filter(realizado), pend = rows.filter(r => !realizado(r));
  const soma = (l, tp) => l.filter(r => r.tipo===tp).reduce((s,r)=>s+Number(r.valor||0),0);
  const linha = (r, dt, atras) => `<tr class="click ${atras?'atrasado':''}" onclick="abrir('financeiro','${r.id}')">
      <td>${dataBR(dt)}${atras?'<div class="atr">atrasado</div>':''}</td>
      <td><b>${esc(nomeLanc(r)) || '<span class="muted">—</span>'}</b>${r.categoria?`<div class="cat">${esc(r.categoria)}</div>`:''}</td>
      <td>${esc(r.descricao)}${(r.anexos||[]).length?` <span class="clip" title="${r.anexos.length} documento(s) anexado(s)">📎${r.anexos.length}</span>`:''}</td>
      <td class="num ${r.tipo==='Receita'?'pos':'neg'}">${r.tipo==='Receita'?'+':'−'} ${brl(r.valor)}</td></tr>`;
  const quadro = (cls, titulo, l, colData, resumo, vazio, fn) => { const lim = FIN_LIMITE[cls], resto = l.length - lim; return `<div class="box fin-q ${cls}">
      <div class="fin-q-top"><h3>${titulo} <span class="qtd">${l.length}</span></h3><div class="fin-q-res">${resumo}</div></div>
      ${l.length ? `<div class="tablewrap"><table><tr><th>${colData}</th><th>Beneficiário / Pagador</th><th>Descrição</th><th class="num">Valor</th></tr>
        ${l.slice(0, lim).map(fn).join('')}</table></div>
        <div class="fin-mais">${resto > 0 ? `<span>Mostrando ${lim} de ${l.length}</span>
          <button class="btn sec" onclick="maisFin('${cls}', ${lim + FIN_PASSO})">▼ Mostrar mais ${Math.min(FIN_PASSO, resto)}</button>
          ${resto > FIN_PASSO ? `<button class="btn sec" onclick="maisFin('${cls}', ${l.length})">Mostrar todos (${l.length})</button>` : ''}`
          : lim > FIN_PASSO ? `<button class="btn sec" onclick="maisFin('${cls}', FIN_PASSO)">▲ Mostrar menos</button>` : ''}</div>`
        : `<div class="empty">${vazio}${filtrado?' com esse filtro':''}.</div>`}</div>`; };
  const atrasados = pend.filter(r => dataLanc(r) < hj);
  return `<div class="fin-duas">
    ${quadro('feitos', '✅ Realizados', feitos, 'Pagamento',
      `<span class="pos">+ ${brl(soma(feitos,'Receita'))}</span> <span class="neg">− ${brl(soma(feitos,'Despesa'))}</span>`,
      'Nenhum lançamento pago ou recebido', r => linha(r, r.data, false))}
    ${quadro('pend', '⏳ A pagar / A receber', pend, 'Vencimento',
      `<span class="pos">+ ${brl(soma(pend,'Receita'))}</span> <span class="neg">− ${brl(soma(pend,'Despesa'))}</span>${atrasados.length?` <span class="atr-tag">${atrasados.length} atrasado(s)</span>`:''}`,
      'Nada pendente', r => linha(r, dataLanc(r), dataLanc(r) < hj))}
  </div>`;
}
/* mês filtrado: movimento do mês + saldo acumulado e previsão para o último dia do mês
   (saldo real de tudo que já foi pago/recebido até o fim do mês + o que vence até lá, inclusive atrasados) */
function cardsMes(m, acum, mes){
  const [a, n] = mes.split('-').map(Number), fim = dataBR(ymd(new Date(a, n, 0))), nome = MESES_NOME[n-1];
  const v = x => `class="val ${x>=0?'pos':'neg'}">${brl(x)}`;
  return `<div class="cards">
    <div class="card"><div class="lbl">Recebido em ${nome}</div><div class="val pos">${brl(m.rec)}</div></div>
    <div class="card"><div class="lbl">Pago em ${nome}</div><div class="val neg">${brl(m.desp)}</div></div>
    <div class="card"><div class="lbl">Resultado de ${nome}</div><div ${v(m.saldo)}</div><div class="sub">só o movimento deste mês</div></div>
  </div><div class="cards">
    <div class="card destaque"><div class="lbl">💵 Saldo real acumulado</div><div ${v(acum.saldo)}</div><div class="sub">tudo que já foi pago / recebido até ${fim}</div></div>
    <div class="card"><div class="lbl">A receber até ${fim}</div><div class="val">${brl(acum.aRec)}</div><div class="sub">inclui atrasados</div></div>
    <div class="card"><div class="lbl">A pagar até ${fim}</div><div class="val">${brl(acum.aPag)}</div><div class="sub">inclui atrasados</div></div>
    <div class="card destaque"><div class="lbl">🔮 Saldo previsto em ${fim}</div><div ${v(acum.previsto)}</div><div class="sub">saldo acumulado + a receber − a pagar</div></div>
  </div>`;
}
function focoBusca(){ const b=document.getElementById('busca'); if(b){ b.focus(); b.setSelectionRange(b.value.length,b.value.length);} }
