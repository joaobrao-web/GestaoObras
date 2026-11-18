/* =====================================================================
   DETALHE DA OBRA
   ===================================================================== */
function detalheObra(id){
  const o = buscar('obras', id);
  if (!o) { tela='obras'; return lista('obras'); }
  const r = resumoObra(id);
  const cli = buscar('clientes', o.cliente);
  const lanc = DB.financeiro.filter(f=>f.obra===id).sort((a,b)=>(b.data||'').localeCompare(a.data||''));
  const equipe = DB.funcionarios.filter(f=>f.obra===id);
  const prest = DB.prestadores.filter(p=>p.obra===id);
  const pagoPrest = pid => DB.financeiro.filter(f=>f.obra===id && f.prestador===pid && f.tipo==='Despesa').reduce((s,f)=>s+Number(f.valor||0),0);
  const props = DB.propostas.filter(p=>p.obra===id).sort((a,b)=>(b.data||'').localeCompare(a.data||''));
  const porCat = {};
  lanc.filter(f=>f.tipo==='Despesa').forEach(f => porCat[f.categoria||'Outros'] = (porCat[f.categoria||'Outros']||0) + Number(f.valor||0));

  return `<div class="top"><h2>${esc(o.nome)} ${etiqueta(o.status||'')}</h2>
    <div class="tools"><button class="btn sec" onclick="ir('obras')">← Voltar</button>
    <button class="btn sec" onclick="window.print()">🖨 Imprimir</button>
    <button class="btn sec" onclick="abrir('obras','${id}')">✏️ Editar obra</button>
    <button class="btn sec" onclick="abrir('propostas',null,{obra:'${id}',cliente:'${o.cliente||''}',nome:${esc(JSON.stringify(o.nome||''))}})">+ Proposta</button>
    <button class="btn sec" onclick="abrir('agenda',null,{obra:'${id}',cliente:'${o.cliente||''}',local:${esc(JSON.stringify(o.endereco||''))}})">+ Compromisso</button>
    <button class="btn" onclick="abrir('financeiro',null,{obra:'${id}'})">+ Lançamento</button></div></div>
  <div class="cards">
    <div class="card"><div class="lbl">Valor do contrato</div><div class="val">${brl(o.valor)}</div></div>
    <div class="card"><div class="lbl">Recebido</div><div class="val pos">${brl(r.rec)}</div></div>
    <div class="card"><div class="lbl">Gasto</div><div class="val neg">${brl(r.desp)}</div></div>
    <div class="card"><div class="lbl">Resultado atual</div><div class="val ${r.saldo>=0?'pos':'neg'}">${brl(r.saldo)}</div></div>
    <div class="card"><div class="lbl">Falta receber do contrato</div><div class="val">${brl((Number(o.valor)||0)-r.rec)}</div></div>
  </div>
  <div class="box"><h3>Informações</h3>
    <p><b>Cliente:</b> ${cli?esc(cli.nome)+(cli.telefone?' — '+esc(cli.telefone):''):'—'}<br>
    <b>Endereço:</b> ${esc(o.endereco)||'—'}<br>
    <b>Responsável:</b> ${esc(o.responsavel)||'—'}<br>
    <b>Início:</b> ${dataBR(o.inicio)||'—'} &nbsp; <b>Previsão:</b> ${dataBR(o.previsao)||'—'}</p>
    ${o.obs?`<p style="white-space:pre-wrap">${esc(o.obs)}</p>`:''}
  </div>
  ${Object.keys(porCat).length?`<div class="box"><h3>Gastos por categoria</h3><div class="tablewrap"><table>
    ${Object.entries(porCat).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<tr><td>${esc(c)}</td><td style="width:50%"><div class="bar"><i style="width:${v/r.desp*100}%"></i></div></td><td class="num">${brl(v)}</td></tr>`).join('')}
  </table></div></div>`:''}
  <div class="box"><h3>Lançamentos da obra</h3>
    ${lanc.length?`<div class="tablewrap"><table><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Categoria</th><th>Situação</th><th class="num">Valor</th></tr>
    ${lanc.map(f=>`<tr class="click" onclick="abrir('financeiro','${f.id}')"><td>${dataBR(f.data)}</td><td>${etiqueta(f.tipo)}</td><td>${esc(f.descricao)}</td><td>${esc(f.categoria)}</td><td>${etiqueta(f.pago||'')}</td><td class="num">${brl(f.valor)}</td></tr>`).join('')}
    </table></div>`:`<div class="empty">Nenhum lançamento ainda.</div>`}
  </div>
  <div class="box"><h3>Agenda desta obra — próximos compromissos</h3>${tabelaCompromissos(proximos(e => e.obra===id, 50), 'Nenhum compromisso agendado para esta obra.')}</div>
  <div class="box"><h3>Propostas desta obra</h3>
    ${props.length?`<div class="tablewrap"><table><tr><th>Nº</th><th>Data</th><th>Título</th><th>Status</th><th class="num">Valor</th></tr>
    ${props.map(p=>`<tr class="click" onclick="ir('proposta:${p.id}')"><td>${esc(p.numero)}</td><td>${dataBR(p.data)}</td><td>${esc(p.nome)}</td><td>${etiqueta(p.status||'')}</td><td class="num">${brl(p.total)}</td></tr>`).join('')}
    </table></div>`:`<div class="empty">Nenhuma proposta vinculada a esta obra.</div>`}
  </div>
  <div class="box"><h3>Equipe nesta obra</h3>
    ${equipe.length?`<div class="tablewrap"><table><tr><th>Nome</th><th>Função</th><th>Telefone</th><th class="num">Diária/Salário</th></tr>
    ${equipe.map(f=>`<tr class="click" onclick="abrir('funcionarios','${f.id}')"><td>${esc(f.nome)}</td><td>${esc(f.funcao)}</td><td>${esc(f.telefone)}</td><td class="num">${brl(f.pagamento)}</td></tr>`).join('')}
    </table></div>`:`<div class="empty">Nenhum funcionário ligado a esta obra.</div>`}
  </div>
  <div class="box"><h3>Prestadores nesta obra</h3>
    ${prest.length?`<div class="tablewrap"><table><tr><th>Nome</th><th>Serviço</th><th>Telefone</th><th>Cobrança</th><th class="num">Valor combinado</th><th class="num">Já pago nesta obra</th></tr>
    ${prest.map(p=>`<tr class="click" onclick="abrir('prestadores','${p.id}')"><td>${esc(p.nome)}</td><td>${esc(p.servico)}</td><td>${esc(p.telefone)}</td><td>${esc(p.cobranca)}</td><td class="num">${brl(p.valor)}</td><td class="num">${brl(pagoPrest(p.id))}</td></tr>`).join('')}
    </table></div>`:`<div class="empty">Nenhum prestador ligado a esta obra.</div>`}
  </div>`;
}
