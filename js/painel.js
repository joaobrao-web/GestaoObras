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
  ${graficosPainel()}
  <div class="box"><h3>Obras ativas — clique para ver detalhes</h3>
    ${obras.length ? `<div class="tablewrap"><table><tr><th>Obra</th><th>Status</th><th class="num">Contrato</th><th class="num">Recebido</th><th></th><th class="num">Gasto</th><th class="num">Resultado</th></tr>${linhasObras}</table></div>`
      : `<div class="empty">Nenhuma obra ativa. Clique em <b>+ Nova obra</b> para começar.</div>`}
  </div>
  <div class="box"><h3>Contas pendentes (a pagar / a receber)</h3>
    ${pendentes.length ? `<div class="tablewrap"><table><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Obra</th><th class="num">Valor</th></tr>${linhasPend}</table></div>`
      : `<div class="empty">Nenhuma conta pendente. 👍</div>`}
  </div>`;
}

/* =====================================================================
   GRÁFICOS DO PAINEL (desenhados em SVG, funcionam sem internet)
   ===================================================================== */
const MESES_ABREV = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const CORES_GRAF = ['#22d3ee','#f43f5e','#3b82f6','#a78bfa','#fbbf24','#94a3b8'];
const curto = v => v>=1e6 ? (v/1e6).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mi'
                 : v>=1e3 ? (v/1e3).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mil'
                 : Math.round(v).toLocaleString('pt-BR');

function graficosPainel(){
  return `<div class="charts">
    <div class="box chart"><h3>Receitas × despesas — últimos 6 meses</h3>${graficoMeses()}</div>
    <div class="box"><h3>Indicadores</h3>${indicadores()}</div>
    <div class="box"><h3>Gastos por categoria — ${new Date().getFullYear()}</h3>${roscaCategorias()}</div>
  </div>`;
}

/* barras: receitas e despesas por mês */
function graficoMeses(){
  const d = new Date(), meses = [];
  for (let i=5; i>=0; i--){ const x = new Date(d.getFullYear(), d.getMonth()-i, 1);
    meses.push({chave:`${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}`, nome:MESES_ABREV[x.getMonth()]}); }
  const soma = (tipo, m) => DB.financeiro.filter(f => f.tipo===tipo && (f.data||'').startsWith(m)).reduce((s,f)=>s+Number(f.valor||0),0);
  meses.forEach(m => { m.rec = soma('Receita', m.chave); m.desp = soma('Despesa', m.chave); });
  const max = Math.max(1, ...meses.map(m => Math.max(m.rec, m.desp)));
  const W=600, H=230, esq=56, base=200, alt=180, passo=(W-esq-10)/6, lb=Math.min(22, passo/3.2);
  const y = v => base - v/max*alt;
  const grade = [0,.25,.5,.75,1].map(p => `<line class="grade" x1="${esq}" x2="${W-6}" y1="${y(max*p)}" y2="${y(max*p)}"/>
    <text class="eixo" x="${esq-8}" y="${y(max*p)+4}" text-anchor="end">${curto(max*p)}</text>`).join('');
  const barras = meses.map((m,i) => { const cx = esq + passo*i + passo/2;
    const b = (v,x,g,tit) => `<rect x="${x}" y="${y(v)}" width="${lb}" height="${Math.max(0,base-y(v))}" rx="5" fill="url(#${g})"><title>${tit}: ${brl(v)}</title></rect>`;
    return b(m.rec, cx-lb-2, 'gRec', 'Receitas '+m.nome) + b(m.desp, cx+2, 'gDesp', 'Despesas '+m.nome)
      + `<text class="eixo" x="${cx}" y="${base+18}" text-anchor="middle">${m.nome}</text>`; }).join('');
  const vazio = meses.every(m => !m.rec && !m.desp) ? `<text class="eixo" x="${(W+esq)/2}" y="${base-alt/2}" text-anchor="middle">Sem lançamentos nos últimos 6 meses</text>` : '';
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Receitas e despesas por mês">
    <defs><linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#3b82f6"/></linearGradient>
    <linearGradient id="gDesp" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f43f5e"/><stop offset="1" stop-color="#be185d"/></linearGradient></defs>
    ${grade}${barras}${vazio}</svg>
    <div class="legenda"><span><i style="background:#22d3ee"></i>Receitas</span><span><i style="background:#f43f5e"></i>Despesas</span></div>`;
}

/* anéis de porcentagem */
function anel(pct, cor, titulo, sub){
  const r = 46, c = 2*Math.PI*r, p = pct===null ? 0 : Math.max(0, Math.min(100, pct));
  return `<div class="anel"><svg viewBox="0 0 120 120">
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="10"/>
      <circle cx="60" cy="60" r="${r}" fill="none" stroke="${cor}" stroke-width="10" stroke-linecap="round"
        stroke-dasharray="${c*p/100} ${c}" transform="rotate(-90 60 60)" style="filter:drop-shadow(0 0 6px ${cor})"/>
      <text x="60" y="67" text-anchor="middle" fill="currentColor" font-size="22" font-weight="700">${pct===null?'—':Math.round(p)+'%'}</text>
    </svg><div class="txt"><b>${titulo}</b>${sub}</div></div>`;
}
function indicadores(){
  const ativas = DB.obras.filter(o => o.status==='Em andamento');
  const contrato = ativas.reduce((s,o)=>s+Number(o.valor||0),0);
  const recebido = ativas.reduce((s,o)=>s+resumoObra(o.id).rec,0);
  const aprov = DB.propostas.filter(p=>p.status==='Aprovada').length;
  const decididas = aprov + DB.propostas.filter(p=>p.status==='Recusada').length;
  return `<div class="aneis">
    ${anel(contrato ? recebido/contrato*100 : null, '#22d3ee', 'Recebido das obras', `${brl(recebido)} de ${brl(contrato)}`)}
    ${anel(decididas ? aprov/decididas*100 : null, '#f43f5e', 'Propostas aprovadas', `${aprov} de ${decididas} respondidas`)}
  </div>`;
}

/* rosca: despesas por categoria no ano */
function roscaCategorias(){
  const ano = String(new Date().getFullYear()), cat = {};
  DB.financeiro.filter(f => f.tipo==='Despesa' && (f.data||'').startsWith(ano))
    .forEach(f => cat[f.categoria||'Outros'] = (cat[f.categoria||'Outros']||0) + Number(f.valor||0));
  let itens = Object.entries(cat).sort((a,b)=>b[1]-a[1]);
  if (itens.length > 5) itens = [...itens.slice(0,5), ['Demais', itens.slice(5).reduce((s,x)=>s+x[1],0)]];
  const total = itens.reduce((s,x)=>s+x[1],0);
  if (!total) return `<div class="empty">Nenhuma despesa lançada neste ano.</div>`;
  const r = 48, c = 2*Math.PI*r; let acc = 0;
  const fatias = itens.map(([n,v],i) => { const l = v/total*c;
    const s = `<circle cx="65" cy="65" r="${r}" fill="none" stroke="${CORES_GRAF[i]}" stroke-width="16"
      stroke-dasharray="${Math.max(0,l-2)} ${c}" stroke-dashoffset="${-acc}" transform="rotate(-90 65 65)"><title>${esc(n)}: ${brl(v)}</title></circle>`;
    acc += l; return s; }).join('');
  return `<div class="rosca"><svg viewBox="0 0 130 130">${fatias}
      <text x="65" y="62" text-anchor="middle" fill="var(--muted)" font-size="10">total</text>
      <text x="65" y="78" text-anchor="middle" fill="currentColor" font-size="13" font-weight="700">${curto(total)}</text></svg>
    <ul>${itens.map(([n,v],i)=>`<li><i style="background:${CORES_GRAF[i]}"></i>${esc(n)}<b>${Math.round(v/total*100)}%</b></li>`).join('')}</ul></div>`;
}
