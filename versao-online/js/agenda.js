/* =====================================================================
   AGENDA — calendário do mês, próximos compromissos e envio para o
   Google Agenda (para receber lembrete no celular).
   Na versão online a agenda é compartilhada: todos veem o mesmo.
   ===================================================================== */
const AGENDA = {modo:'mes', mes:null};      // modo: 'mes' (calendário) ou 'lista'
const DIAS_SEM = ['dom','seg','ter','qua','qui','sex','sáb'];
const MESES_NOME = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const corTipo = t => TIPOS_AGENDA[t] || TIPOS_AGENDA['Outro'];
const diaSemana = s => s ? DIAS_SEM[new Date(s+'T12:00:00').getDay()] : '';
const ordemAgenda = (a,b) => ((a.data||'')+(a.hora||'99')).localeCompare((b.data||'')+(b.hora||'99'));

function mudarMes(n){
  const [a,m] = (AGENDA.mes || hoje().slice(0,7)).split('-').map(Number);
  AGENDA.mes = ymd(new Date(a, m-1+n, 1)).slice(0,7); render();
}

function agenda(){
  if (AGENDA.modo === 'lista') return lista('agenda');
  const mes = AGENDA.mes || hoje().slice(0,7), [a,m] = mes.split('-').map(Number);
  const primeiro = new Date(a, m-1, 1), diasMes = new Date(a, m, 0).getDate();
  const semanas = Math.ceil((primeiro.getDay() + diasMes) / 7), hj = hoje();
  const porDia = {};
  DB.agenda.forEach(e => { if (e.data) (porDia[e.data] = porDia[e.data] || []).push(e); });

  let dias = '';
  for (let i = 0; i < semanas*7; i++){
    const d = new Date(a, m-1, 1 - primeiro.getDay() + i), s = ymd(d);
    const evs = (porDia[s] || []).sort(ordemAgenda);
    dias += `<div class="dia ${d.getMonth()!==m-1?'fora':''} ${s===hj?'hoje':''}" onclick="abrir('agenda',null,{data:'${s}'})" title="Clique para marcar um compromisso em ${dataBR(s)}">
      <span class="n">${d.getDate()}</span>
      ${evs.slice(0,3).map(e => `<div class="ev ${e.status==='Concluído'?'feito':''} ${e.status==='Cancelado'?'cancel':''}" style="--c:${corTipo(e.tipo)}"
          onclick="event.stopPropagation();abrir('agenda','${e.id}')" title="${esc((e.hora?e.hora+' — ':'')+e.nome+' ('+(e.tipo||'')+')')}">${e.hora?`<b>${esc(e.hora)}</b>`:''}${esc(e.nome)}</div>`).join('')}
      ${evs.length>3?`<span class="mais">+${evs.length-3} mais</span>`:''}</div>`;
  }

  return `<div class="top"><h2>📅 Agenda</h2>
    <div class="tools">
      <button class="btn sec" onclick="mudarMes(-1)" title="Mês anterior">‹</button>
      <span class="mes-atual">${MESES_NOME[m-1]} ${a}</span>
      <button class="btn sec" onclick="mudarMes(1)" title="Próximo mês">›</button>
      <button class="btn sec" onclick="AGENDA.mes=null;render()">Hoje</button>
      <button class="btn sec" onclick="AGENDA.modo='lista';render()">☰ Ver em lista</button>
      <button class="btn" onclick="abrir('agenda')">+ Novo compromisso</button>
    </div></div>
  <div class="leg-tipos">${Object.entries(TIPOS_AGENDA).map(([t,c])=>`<span><i style="background:${c}"></i>${t}</span>`).join('')}</div>
  <div class="box"><div class="cal">${DIAS_SEM.map(d=>`<div class="sem">${d}</div>`).join('')}${dias}</div></div>
  <div class="box"><h3>Próximos compromissos</h3>${tabelaCompromissos(proximos(null, 15), 'Nenhum compromisso daqui pra frente.')}</div>`;
}

/* compromissos de hoje em diante (sem os cancelados), em ordem de data e hora */
function proximos(filtro, limite=8){
  const hj = hoje();
  return DB.agenda.filter(e => (e.data||'') >= hj && e.status !== 'Cancelado' && (!filtro || filtro(e))).sort(ordemAgenda).slice(0, limite);
}
function tabelaCompromissos(lista, vazio){
  if (!lista.length) return `<div class="empty">${vazio}</div>`;
  const hj = hoje();
  return `<div class="tablewrap"><table><tr><th>Data</th><th>Hora</th><th>Compromisso</th><th>Tipo</th><th>Obra</th><th>Responsável</th><th></th></tr>
    ${lista.map(e => `<tr class="click" onclick="abrir('agenda','${e.id}')">
      <td>${e.data===hj?'<b class="pos">Hoje</b>':`${dataBR(e.data)} <span style="color:var(--muted)">${diaSemana(e.data)}</span>`}</td>
      <td>${esc(e.hora||'—')}${e.horaFim?' – '+esc(e.horaFim):''}</td>
      <td><b>${esc(e.nome)}</b></td>
      <td><span class="tag" style="background:color-mix(in srgb, ${corTipo(e.tipo)} 18%, transparent);color:${corTipo(e.tipo)}">${esc(e.tipo||'')}</span></td>
      <td>${mostrar({tipo:'ref',ref:'obras'}, e.obra)}</td><td>${esc(e.responsavel)}</td>
      <td><a class="gcal" href="${esc(linkGoogle(e))}" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Adicionar ao Google Agenda">📅 Google</a></td></tr>`).join('')}
  </table></div>`;
}

/* ---------- Google Agenda: link que abre o evento já preenchido ---------- */
function somaHora(h, min){
  const [hh,mm] = h.split(':').map(Number), t = Math.min(hh*60 + mm + min, 23*60+59);
  return String(Math.floor(t/60)).padStart(2,'0') + ':' + String(t%60).padStart(2,'0');
}
function linkGoogle(e){
  const d = (e.data||'').replace(/-/g,'');
  let datas;
  if (e.hora){
    const fim = e.horaFim && e.horaFim > e.hora ? e.horaFim : somaHora(e.hora, 60);
    datas = `${d}T${e.hora.replace(':','')}00/${d}T${fim.replace(':','')}00`;
  } else {                                   // sem hora: evento de dia inteiro
    const x = new Date(e.data+'T12:00:00'); x.setDate(x.getDate()+1);
    datas = `${d}/${ymd(x).replace(/-/g,'')}`;
  }
  const obra = buscar('obras', e.obra), cli = buscar('clientes', e.cliente);
  const detalhes = [e.tipo, obra && 'Obra: '+obra.nome, cli && 'Cliente: '+cli.nome+(cli.telefone?' — '+cli.telefone:''),
                    e.responsavel && 'Responsável: '+e.responsavel, e.obs, '— Gestão de Obras SB Tech Wall'].filter(Boolean).join('\n');
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + '&text=' + encodeURIComponent(e.nome||'') + '&dates=' + datas + '&ctz=America/Sao_Paulo'
    + '&details=' + encodeURIComponent(detalhes) + '&location=' + encodeURIComponent(e.local || (obra && obra.endereco) || '');
}
/* botão do formulário: usa o que está preenchido na tela, mesmo antes de salvar */
function abrirGoogle(form){
  const e = {};
  for (const c of TABELAS.agenda.campos) if (form.elements[c.k]) e[c.k] = form.elements[c.k].value.trim();
  if (!e.nome || !e.data){ alert('Preencha pelo menos o título e a data do compromisso.'); return; }
  window.open(linkGoogle(e), '_blank', 'noopener');
}
