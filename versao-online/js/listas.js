/* =====================================================================
   LISTAS (Obras, Financeiro, Clientes, Funcionários, Fornecedores)
   ===================================================================== */
function lista(t){
  const T = TABELAS[t], f = filtros[t] || (filtros[t] = {texto:'', obra:'', tipo:'', mes:''});
  let rows = DB[t].slice();
  if (f.texto){
    const q = f.texto.toLowerCase();
    rows = rows.filter(r => T.campos.some(c => c.tipo!=='itens' && String(c.tipo==='ref' ? (buscar(c.ref,r[c.k])||{}).nome||'' : r[c.k]||'').toLowerCase().includes(q)));
  }
  if (t==='financeiro'){
    if (f.obra) rows = rows.filter(r => r.obra === f.obra);
    if (f.cliente) rows = rows.filter(r => clienteLanc(r) === f.cliente);
    if (f.tipo) rows = rows.filter(r => r.tipo === f.tipo);
    if (f.mes)  rows = rows.filter(r => (r.data||'').startsWith(f.mes));
    rows.sort((a,b)=>(b.data||'').localeCompare(a.data||''));
  } else if (t==='agenda') rows.sort((a,b)=>((b.data||'')+(b.hora||'')).localeCompare((a.data||'')+(a.hora||'')));
  else if (t==='propostas' || t==='contratos') rows.sort((a,b)=>(b.data||'').localeCompare(a.data||'') || String(b.numero).localeCompare(String(a.numero)));
  else rows.sort((a,b)=>(a.nome||'').localeCompare(b.nome||''));

  const cols = T.colunas.map(k => T.campos.find(c=>c.k===k));
  const iClip = Math.max(0, cols.findIndex(c=>c.k==='nome'));   // coluna que mostra o 📎 de anexos
  const extra = t==='agenda' ? `<button class="btn sec" onclick="AGENDA.modo='mes';render()">📅 Ver calendário</button>`
    : t==='financeiro' ? `
    <select onchange="filtros.financeiro.obra=this.value;render()"><option value="">Todas as obras</option>
      ${DB.obras.map(o=>`<option value="${o.id}" ${f.obra===o.id?'selected':''}>${esc(o.nome)}</option>`).join('')}</select>
    <select onchange="filtros.financeiro.cliente=this.value;render()"><option value="">Todos os clientes</option>
      ${DB.clientes.slice().sort((a,b)=>(a.nome||'').localeCompare(b.nome||'')).map(c=>`<option value="${c.id}" ${f.cliente===c.id?'selected':''}>${esc(c.nome)}</option>`).join('')}</select>
    <select onchange="filtros.financeiro.tipo=this.value;render()"><option value="">Receitas e despesas</option>
      ${['Receita','Despesa'].map(x=>`<option ${f.tipo===x?'selected':''}>${x}</option>`).join('')}</select>
    <input type="month" value="${f.mes}" onchange="filtros.financeiro.mes=this.value;render()" title="Filtrar por mês">` : '';

  let totais = '';
  if (t==='financeiro'){
    const rec = rows.filter(r=>r.tipo==='Receita').reduce((s,r)=>s+Number(r.valor||0),0);
    const desp = rows.filter(r=>r.tipo==='Despesa').reduce((s,r)=>s+Number(r.valor||0),0);
    totais = `<div class="cards"><div class="card"><div class="lbl">Receitas (filtro)</div><div class="val pos">${brl(rec)}</div></div>
      <div class="card"><div class="lbl">Despesas (filtro)</div><div class="val neg">${brl(desp)}</div></div>
      <div class="card"><div class="lbl">Saldo (filtro)</div><div class="val ${rec-desp>=0?'pos':'neg'}">${brl(rec-desp)}</div></div></div>`;
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
  <div class="tablewrap">${rows.length ? `<table>
    <tr>${cols.map(c=>`<th class="${c.tipo==='dinheiro'?'num':''}">${c.l.replace(' (R$)','')}</th>`).join('')}</tr>
    ${rows.map(r=>`<tr class="click" onclick="${clique(r.id)}">${cols.map((c,i)=>`<td class="${c.tipo==='dinheiro'?'num':''}">${mostrar(c, t==='financeiro' && c.k==='cliente' ? clienteLanc(r) : r[c.k])}${i===iClip && (r.anexos||[]).length?` <span class="clip" title="${r.anexos.length} documento(s) anexado(s)">📎${r.anexos.length}</span>`:''}</td>`).join('')}</tr>`).join('')}
  </table>` : `<div class="empty">Nada cadastrado${f.texto||f.obra||f.cliente||f.tipo||f.mes?' com esse filtro':''}. Clique em <b>+ Novo ${T.singular}</b>.</div>`}</div>`;
}
/* cliente do lançamento; se não foi escolhido, vale o cliente da obra */
const clienteLanc = r => r.cliente || (buscar('obras', r.obra) || {}).cliente || '';
function focoBusca(){ const b=document.getElementById('busca'); if(b){ b.focus(); b.setSelectionRange(b.value.length,b.value.length);} }
