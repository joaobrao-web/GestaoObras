/* =====================================================================
   FORMULÁRIO (cadastrar / editar / excluir)
   ===================================================================== */
function abrir(t, id, padrao={}){
  const T = TABELAS[t], r = id ? buscar(t,id) : {tipo:'Despesa', data:hoje(), status:'Em andamento', pago:'Pago', ...(T.novo?T.novo():{}), ...padrao};
  ITENS_EDIT = JSON.parse(JSON.stringify(r.itens || [{desc:'',un:'',qtd:1,valor:''}]));
  const rid = id || novoId();                 // registro novo já ganha código, para poder anexar antes de salvar
  FORM_ANEXOS = {t, id:rid, novo:!id, lista:[], salvo:false};
  const campo = c => {
    if (c.calc) return '';
    if (c.tipo==='itens') return `<div class="full"><label>${c.l}</label><div id="itens"></div></div>`;
    const v = r[c.k] ?? '';
    let inp;
    if (c.tipo==='select') inp = `<select name="${c.k}">${c.obrig?'':'<option value=""></option>'}${c.opcoes.map(o=>`<option ${v===o?'selected':''}>${o}</option>`).join('')}</select>`;
    else if (c.tipo==='ref') inp = `<select name="${c.k}"><option value="">— nenhum —</option>${DB[c.ref].slice().sort((a,b)=>(a.nome||'').localeCompare(b.nome||'')).map(o=>`<option value="${o.id}" ${v===o.id?'selected':''}>${esc(o.nome)}</option>`).join('')}</select>`;
    else if (c.tipo==='texto') inp = `<textarea name="${c.k}">${esc(v)}</textarea>`;
    else if (c.tipo==='data') inp = `<input type="date" name="${c.k}" value="${esc(v)}">`;
    else if (c.tipo==='dinheiro') inp = `<input type="number" step="0.01" min="0" name="${c.k}" value="${esc(v)}" placeholder="0,00">`;
    else if (c.tipo==='hora') inp = `<input type="time" name="${c.k}" value="${esc(v)}">`;
    else inp = `<input name="${c.k}" value="${esc(v)}">`;
    return `<div class="${c.full?'full':''}"><label>${c.l}${c.obrig?' *':''}</label>${inp}</div>`;
  };
  document.getElementById('modal').innerHTML = `<div class="modal-bg" onclick="if(event.target===this)fechar()">
    <form class="modal ${T.campos.some(c=>c.tipo==='itens')?'wide':''}" onsubmit="event.preventDefault();gravar('${t}','${id||''}',this)" oninput="if(event.target.name==='desconto')somarItens()" onchange="if(event.target.name==='obra')clienteDaObra(this)">
      <h3>${id?'Editar':'Novo'} ${T.singular}</h3>
      <div class="grid">${T.campos.map(campo).join('')}
        <div class="full"><label>📎 Documentos anexados</label><div class="anx-box" data-anx="${t}:${rid}">${htmlAnexos(t, rid)}</div></div></div>
      <div class="actions">
        <div>${id?`<button type="button" class="btn del" onclick="excluir('${t}','${id}')">🗑 Excluir</button>`:''}
          ${t==='agenda'?`<button type="button" class="btn sec" onclick="abrirGoogle(this.form)" title="Abre o Google Agenda já preenchido, para receber lembrete no celular">📅 Google Agenda</button>`:''}</div>
        <div><button type="button" class="btn sec" onclick="fechar()">Cancelar</button><button class="btn">Salvar</button></div>
      </div>
    </form></div>`;
  desenharItens();
  const first = document.querySelector('.modal input, .modal select'); if (first) first.focus();
}

/* ---------- itens da proposta ---------- */
let ITENS_EDIT = [];
const subItem = it => (Number(it.qtd)||0) * (Number(it.valor)||0);
const totalItens = l => (l||[]).reduce((s,it)=>s+subItem(it),0);
function desenharItens(){
  const el = document.getElementById('itens'); if (!el) return;
  el.innerHTML = `<div class="tablewrap"><table class="itens">
    <tr><th>Descrição</th><th>Un.</th><th class="num">Qtd.</th><th class="num">Valor unit. (R$)</th><th class="num">Subtotal</th><th></th></tr>
    ${ITENS_EDIT.map((it,i)=>`<tr>
      <td><input value="${esc(it.desc)}" oninput="ITENS_EDIT[${i}].desc=this.value" placeholder="Ex.: Parede de drywall" style="min-width:220px"></td>
      <td><input value="${esc(it.un)}" oninput="ITENS_EDIT[${i}].un=this.value" placeholder="m²" style="width:70px"></td>
      <td><input type="number" step="0.01" min="0" value="${esc(it.qtd)}" oninput="ITENS_EDIT[${i}].qtd=this.value;somarItens()" style="width:90px"></td>
      <td><input type="number" step="0.01" min="0" value="${esc(it.valor)}" oninput="ITENS_EDIT[${i}].valor=this.value;somarItens()" style="width:120px" placeholder="0,00"></td>
      <td class="num" id="sub${i}"></td>
      <td><button type="button" class="btn del" title="Remover item" onclick="ITENS_EDIT.splice(${i},1);desenharItens()">✕</button></td></tr>`).join('')}
  </table></div>
  <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px">
    <button type="button" class="btn sec" onclick="ITENS_EDIT.push({desc:'',un:'',qtd:1,valor:''});desenharItens()">+ Adicionar item</button>
    <b id="totItens" style="font-size:17px;color:var(--brand)"></b></div>`;
  somarItens();
}
function somarItens(){
  ITENS_EDIT.forEach((it,i)=>{ const c=document.getElementById('sub'+i); if(c) c.textContent=brl(subItem(it)); });
  const d = Number((document.querySelector('.modal [name=desconto]')||{}).value)||0;
  const t = document.getElementById('totItens'); if (t) t.textContent = 'Total: '+brl(totalItens(ITENS_EDIT)-d);
}
/* ao escolher a obra, preenche o cliente dela (se o campo cliente estiver vazio) */
function clienteDaObra(form){
  const o = buscar('obras', form.elements.obra.value), c = form.elements.cliente;
  if (o && o.cliente && c && !c.value) c.value = o.cliente;
}
function fechar(){
  /* cadastro novo cancelado: apaga os arquivos que já tinham sido anexados */
  if (FORM_ANEXOS && FORM_ANEXOS.novo && !FORM_ANEXOS.salvo && !buscar(FORM_ANEXOS.t, FORM_ANEXOS.id)) FORM_ANEXOS.lista.forEach(apagarArquivo);
  FORM_ANEXOS = null;
  document.getElementById('modal').innerHTML='';
}
function gravar(t, id, form){
  const T = TABELAS[t], dados = {};
  for (const c of T.campos){
    if (c.calc) continue;
    if (c.tipo==='itens'){ dados[c.k] = ITENS_EDIT.filter(i => (i.desc||'').trim() || Number(i.valor)); continue; }
    let v = form.elements[c.k].value.trim();
    if (c.tipo==='dinheiro' && v!=='') v = Number(v);
    if (c.obrig && v===''){ alert('Preencha o campo: '+c.l); form.elements[c.k].focus(); return; }
    dados[c.k] = v;
  }
  if (t==='propostas') dados.total = totalItens(dados.itens) - (Number(dados.desconto)||0);
  if (id) Object.assign(buscar(t,id), dados);
  else {
    const F = FORM_ANEXOS && FORM_ANEXOS.t===t ? FORM_ANEXOS : null;
    DB[t].push({id:(F && F.id) || novoId(), criado:hoje(), ...dados, ...(F && F.lista.length ? {anexos:F.lista} : {})});
    if (F) F.salvo = true;
  }
  salvar(); fechar(); render();
}
function excluir(t, id){
  const r = buscar(t, id), n = ((r && r.anexos) || []).length;
  if (!confirm('Tem certeza que deseja excluir?' + (n ? ` Os ${n} documento(s) anexado(s) também serão apagados.` : '') + ' Isso não pode ser desfeito.')) return;
  ((r && r.anexos) || []).forEach(apagarArquivo);
  DB[t] = DB[t].filter(r => r.id !== id);
  salvar(); fechar();
  if (tela === 'obra:'+id) tela = 'obras';
  render();
}
document.addEventListener('keydown', e => { if (e.key==='Escape') fechar(); });
