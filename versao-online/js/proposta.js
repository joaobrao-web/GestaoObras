/* =====================================================================
   PROPOSTA (visualizar / imprimir / aprovar)
   ===================================================================== */
function verProposta(id){
  const p = buscar('propostas', id);
  if (!p) { tela='propostas'; return lista('propostas'); }
  const cli = buscar('clientes', p.cliente) || {}, obra = buscar('obras', p.obra);
  const logo = 'assets/logo-sb-tech-wall.png';   // logo original: a proposta é uma folha branca
  const itens = p.itens || [], bruto = totalItens(itens), desc = Number(p.desconto)||0;
  const sec = (tit, txt) => txt ? `<div class="doc-sec"><h4>${tit}</h4><p style="white-space:pre-wrap">${esc(txt)}</p></div>` : '';
  return `<div class="top noprint"><h2>Proposta Nº ${esc(p.numero)} ${etiqueta(p.status||'')}</h2>
    <div class="tools"><button class="btn sec" onclick="ir('propostas')">← Voltar</button>
    <button class="btn sec" onclick="abrir('propostas','${id}')">✏️ Editar</button>
    <button class="btn sec" onclick="window.print()">🖨 Imprimir / PDF</button>
    ${obra ? `<button class="btn" onclick="ir('obra:${obra.id}')">🏠 Ver obra</button>`
           : `<button class="btn gold" onclick="aprovarProposta('${id}')">✔ Aprovar e criar obra</button>`}
    </div></div>
  <div class="doc">
    <div class="doc-head"><img src="${logo}" alt="SB Tech Wall">
      <div><div class="doc-title">PROPOSTA COMERCIAL</div>Nº ${esc(p.numero)}<br>Data: ${dataBR(p.data)}${p.validade?'<br>Válida até: '+dataBR(p.validade):''}</div></div>
    <div class="doc-sec"><h4>Cliente</h4><p><b>${esc(cli.nome)||'—'}</b>${cli.documento?'<br>CPF/CNPJ: '+esc(cli.documento):''}${cli.endereco?'<br>'+esc(cli.endereco):''}${cli.telefone?'<br>Tel.: '+esc(cli.telefone):''}${cli.email?' &nbsp;|&nbsp; '+esc(cli.email):''}</p></div>
    <div class="doc-sec"><h4>Objeto</h4><p>${esc(p.nome)}${obra&&obra.endereco?'<br>Local da obra: '+esc(obra.endereco):''}</p></div>
    <div class="doc-sec"><h4>Itens e serviços</h4>
      <div class="tablewrap"><table><tr><th>#</th><th>Descrição</th><th>Un.</th><th class="num">Qtd.</th><th class="num">Valor unit.</th><th class="num">Subtotal</th></tr>
      ${itens.map((it,i)=>`<tr><td>${i+1}</td><td style="white-space:normal">${esc(it.desc)}</td><td>${esc(it.un)}</td><td class="num">${(Number(it.qtd)||0).toLocaleString('pt-BR')}</td><td class="num">${brl(it.valor)}</td><td class="num">${brl(subItem(it))}</td></tr>`).join('')}
      ${desc?`<tr><td colspan="5" class="num">Subtotal</td><td class="num">${brl(bruto)}</td></tr><tr><td colspan="5" class="num">Desconto</td><td class="num">- ${brl(desc)}</td></tr>`:''}
      <tr class="tot"><td colspan="5" class="num">VALOR TOTAL</td><td class="num">${brl(bruto-desc)}</td></tr>
      </table></div></div>
    ${sec('Prazo de execução', p.prazo)}
    ${sec('Condições de pagamento', p.pagamento)}
    ${sec('Observações', p.obs)}
    <div class="sign"><div>SB Tech Wall</div><div>${esc(cli.nome)||'Cliente'}<br><small>De acordo</small></div></div>
  </div>`;
}
function aprovarProposta(id){
  const p = buscar('propostas', id);
  if (!confirm('Marcar esta proposta como APROVADA e criar a obra automaticamente?')) return;
  const cli = buscar('clientes', p.cliente) || {};
  const o = {id:novoId(), criado:hoje(), nome:p.nome, cliente:p.cliente||'', status:'Em andamento',
             valor:Number(p.total)||0, inicio:hoje(), endereco:cli.endereco||'',
             obs:'Obra criada a partir da proposta Nº '+(p.numero||'')+(p.prazo?'\nPrazo: '+p.prazo:'')};
  DB.obras.push(o); p.status='Aprovada'; p.obra=o.id;
  salvar(); ir('obra:'+o.id);
}
