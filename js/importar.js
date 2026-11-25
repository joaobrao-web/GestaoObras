/* =====================================================================
   IMPORTAR PLANILHA (Excel .xlsx ou .csv)
   ===================================================================== */
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const APELIDOS = { descricao:['historico','discriminacao','item'], data:['dt','datadolancamento','vencimento','datapagamento'],
  pago:['situacao','pago','statuspagamento'], obs:['observacao','observacoes','obs'], valor:['valorr','quantia','montante','total'],
  tipo:['tipo','entradasaida','natureza'], favorecido:['de','para','depara','recebidode','pagoa','favorecido','beneficiario','pagador','destinatario','origem','destino'], telefone:['telefone','celular','whatsapp','fone'], documento:['cpf','cnpj','cpfcnpj'] };
const camposImport = t => TABELAS[t].campos.filter(c => c.tipo!=='itens' && !c.calc);
let IMPORT = null;

function abrirImportar(t){
  const T = TABELAS[t];
  const dica = t==='financeiro' ? `<p class="hint">💡 <b>Dicas do financeiro:</b> na coluna <b>Tipo</b>, escreva "Receita" ou "Despesa". Se a planilha não tiver essa coluna, tudo entra como <b>despesa</b> (e valores negativos são convertidos para positivo).
     Na coluna <b>Situação</b>, aceita "Pago", "Sim", "A pagar", "Pendente". Os nomes da <b>Obra</b> e do <b>Cliente</b> precisam ser iguais aos cadastrados no sistema.</p>` : '';
  document.getElementById('modal').innerHTML = `<div class="modal-bg" onclick="if(event.target===this)fechar()"><div class="modal wide">
    <h3>⬆ Importar ${T.titulo.toLowerCase()} de uma planilha</h3>
    <ol class="passos">
      <li>Use a sua planilha ou clique em <b>Baixar modelo</b> para ter uma já pronta.</li>
      <li>A <b>primeira linha</b> precisa ter os títulos das colunas. Colunas aceitas:<br><span class="cols">${camposImport(t).map(c=>c.l.replace(' (R$)','')).join(' · ')}</span><br>Não precisa ter todas, e colunas com outros nomes são ignoradas.</li>
      <li>Clique em <b>Escolher arquivo</b> (Excel .xlsx ou .csv). Você vai ver uma <b>prévia</b> antes de salvar qualquer coisa.</li>
    </ol>${dica}
    <div id="impMsg"></div>
    <div class="actions"><div><button class="btn sec" onclick="baixarModelo('${t}')">⬇ Baixar modelo</button></div>
      <div><button class="btn sec" onclick="fechar()">Cancelar</button>
      <button class="btn" onclick="document.getElementById('impPlan').click()">📂 Escolher arquivo</button></div></div>
    <input type="file" id="impPlan" hidden accept=".csv,.xlsx,.xls,.txt" onchange="lerPlanilha('${t}',this)">
  </div></div>`;
}

function baixarModelo(t){
  const cs = camposImport(t);
  const ex = {financeiro:{tipo:'Despesa',data:dataBR(hoje()),descricao:'Compra de placas de drywall',favorecido:'Casa do Drywall',obra:(DB.obras[0]||{}).nome||'Nome da obra',cliente:'',categoria:'Material',valor:'1250,00',pago:'Pago',fornecedor:'',prestador:'',obs:''}}[t] || {};
  const linhas = [cs.map(c=>c.l), cs.map(c=>ex[c.k]||'')];
  baixar(`modelo-${t}.csv`, '﻿'+linhas.map(l=>l.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\r\n'), 'text/csv;charset=utf-8');
}

function carregarXLSX(){
  if (window.XLSX) return Promise.resolve();
  return new Promise((ok, erro) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = ok; s.onerror = erro; document.head.appendChild(s);
  });
}
function lerCSV(txt){
  const prim = txt.split(/\r?\n/)[0] || '';
  const sep = [';',',','\t'].map(s=>[s,prim.split(s).length]).sort((a,b)=>b[1]-a[1])[0][0];
  const linhas = []; let lin = [], cel = '', aspas = false;
  for (let i=0; i<txt.length; i++){
    const ch = txt[i];
    if (aspas){ if (ch==='"'){ if (txt[i+1]==='"'){ cel+='"'; i++; } else aspas=false; } else cel+=ch; }
    else if (ch==='"') aspas = true;
    else if (ch===sep){ lin.push(cel); cel=''; }
    else if (ch==='\n' || ch==='\r'){ if (ch==='\r' && txt[i+1]==='\n') i++; lin.push(cel); linhas.push(lin); lin=[]; cel=''; }
    else cel += ch;
  }
  if (cel!=='' || lin.length){ lin.push(cel); linhas.push(lin); }
  return linhas;
}
async function lerPlanilha(t, inp){
  const arq = inp.files[0]; inp.value=''; if (!arq) return;
  const msg = document.getElementById('impMsg');
  msg.innerHTML = '<p class="hint">Lendo arquivo...</p>';
  try {
    const buf = await arq.arrayBuffer();
    let linhas;
    if (/\.xlsx?$/i.test(arq.name)){
      try { await carregarXLSX(); }
      catch(e){ msg.innerHTML = `<p class="erro">Para ler arquivos .xlsx o computador precisa estar <b>conectado à internet</b>. Sem internet, abra a planilha no Excel e use <b>Arquivo → Salvar como → CSV</b>, depois importe o arquivo CSV.</p>`; return; }
      const wb = XLSX.read(buf, {type:'array', cellDates:true});
      linhas = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {header:1, raw:true, defval:''});
    } else {
      let txt; try { txt = new TextDecoder('utf-8',{fatal:true}).decode(buf); } catch(e){ txt = new TextDecoder('windows-1252').decode(buf); }
      linhas = lerCSV(txt.replace(/^﻿/,''));
    }
    prepararImport(t, linhas);
  } catch(e){ msg.innerHTML = `<p class="erro">Não consegui ler este arquivo (${esc(e.message)}).</p>`; }
}

function lerValor(v){
  if (typeof v==='number') return v;
  let s = String(v||'').trim(); if (!s) return '';
  const neg = /^\(.*\)$/.test(s) || /-/.test(s);
  s = s.replace(/[^\d.,]/g,'');
  if (s.includes(',')) s = s.replace(/\./g,'').replace(',','.');
  else if ((s.match(/\./g)||[]).length>1) s = s.replace(/\./g,'');
  const n = Number(s); if (isNaN(n) || s==='') return NaN;
  return neg ? -n : n;
}
function lerData(v){
  if (v instanceof Date && !isNaN(v)) return new Date(v.getTime()-v.getTimezoneOffset()*6e4).toISOString().slice(0,10);
  if (typeof v==='number' && v>20000 && v<80000) return new Date(Math.round((v-25569)*864e5)).toISOString().slice(0,10);
  const s = String(v||'').trim(); let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  if ((m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/))){ const a = m[3].length===2 ? '20'+m[3] : m[3]; return `${a}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`; }
  return s ? null : '';
}
function lerOpcao(t, c, v){
  const n = norm(v); if (!n) return '';
  if (t==='financeiro' && c.k==='tipo'){
    if (/^(r|receita|entrada|credito|recebimento|c)$/.test(n)) return 'Receita';
    if (/^(d|despesa|saida|debito|pagamento|gasto)$/.test(n)) return 'Despesa';
  }
  if (c.k==='pago'){
    if (/^(pago|sim|s|ok|quitado|recebido|pg)$/.test(n)) return 'Pago';
    if (/^(nao|n|apagar|areceber|pendente|aberto|emaberto|apagarareceber)$/.test(n)) return 'A pagar / A receber';
  }
  return c.opcoes.find(o => norm(o)===n) || c.opcoes.find(o => norm(o).startsWith(n) || n.startsWith(norm(o))) || String(v).trim();
}

function prepararImport(t, linhas){
  const msg = document.getElementById('impMsg');
  linhas = linhas.filter(l => l.some(x => String(x).trim()!==''));
  if (linhas.length < 2){ msg.innerHTML = '<p class="erro">A planilha está vazia ou só tem a linha de títulos.</p>'; return; }
  const cab = linhas[0], cs = camposImport(t), mapa = {}, ignoradas = [];
  cab.forEach((h,i) => {
    const n = norm(h);
    const c = cs.find(c => norm(c.k)===n || norm(c.l)===n || norm(c.l.replace(' (R$)',''))===n)
           || cs.find(c => (APELIDOS[c.k]||[]).includes(n))
           || cs.find(c => n && (norm(c.l).startsWith(n) || n.startsWith(norm(c.l.replace(' (R$)','')))));
    if (c && !Object.values(mapa).includes(c)) mapa[i] = c; else if (String(h).trim()) ignoradas.push(h);
  });
  const usados = Object.values(mapa);
  if (!usados.length){ msg.innerHTML = `<p class="erro">Não reconheci nenhuma coluna. Confira se a primeira linha tem os títulos (ex.: ${cs.slice(0,4).map(c=>c.l).join(', ')}).</p>`; return; }

  const chave = r => usados.filter(c=>c.k!=='obs').map(c => norm(r[c.k])).join('|');
  const existentes = new Set(DB[t].map(chave));
  const regs = linhas.slice(1).map((lin, n) => {
    const r = {}, erros = [], avisos = [];
    for (const [i, c] of Object.entries(mapa)){
      const bruto = lin[i]; let v = bruto ?? '';
      if (c.tipo==='dinheiro'){ v = lerValor(bruto); if (Number.isNaN(v)){ erros.push(`valor "${bruto}" inválido`); v=''; } }
      else if (c.tipo==='data'){ v = lerData(bruto); if (v===null){ erros.push(`data "${bruto}" inválida`); v=''; } }
      else if (c.tipo==='select') v = lerOpcao(t, c, bruto);
      else if (c.tipo==='ref'){
        const nome = String(bruto||'').trim();
        if (nome){ const achou = DB[c.ref].find(x => norm(x.nome)===norm(nome)); v = achou ? achou.id : ''; if (!achou) avisos.push(`${c.l.toLowerCase()} "${nome}" não cadastrado(a), ficará em branco`); }
        else v = '';
      }
      else v = String(v).trim();
      r[c.k] = v;
    }
    if (t==='financeiro'){
      if (typeof r.valor==='number' && r.valor<0){ if (!r.tipo) r.tipo='Despesa'; r.valor = Math.abs(r.valor); }
      if (!r.tipo) r.tipo = r.categoria==='Recebimento de cliente' ? 'Receita' : 'Despesa';
      if (!r.pago) r.pago = 'Pago';
    }
    for (const c of TABELAS[t].campos) if (c.obrig && (r[c.k]===undefined || r[c.k]==='')) erros.push(`falta ${c.l.replace(' (R$)','').toLowerCase()}`);
    return {r, erros, avisos, repetido: existentes.has(chave(r)), linha: n+2};
  });
  IMPORT = {t, regs};
  desenharPrevia(ignoradas);
}

function desenharPrevia(ignoradas){
  const {t, regs} = IMPORT, cs = camposImport(t).filter(c => regs.some(x => x.r[c.k]!==undefined));
  const pular = document.getElementById('pularRep') ? document.getElementById('pularRep').checked : true;
  const valido = x => !x.erros.length && !(pular && x.repetido);
  const nOk = regs.filter(valido).length, nErr = regs.filter(x=>x.erros.length).length, nRep = regs.filter(x=>x.repetido && !x.erros.length).length;
  const nAv = regs.filter(x=>x.avisos.length && !x.erros.length).length;
  document.getElementById('impMsg').innerHTML = `
    <div class="cards" style="margin:12px 0">
      <div class="card"><div class="lbl">Linhas na planilha</div><div class="val">${regs.length}</div></div>
      <div class="card"><div class="lbl">Serão importadas</div><div class="val pos">${nOk}</div></div>
      <div class="card"><div class="lbl">Com erro (puladas)</div><div class="val ${nErr?'neg':''}">${nErr}</div></div>
      <div class="card"><div class="lbl">Já existem no sistema</div><div class="val">${nRep}</div></div>
    </div>
    ${nAv?`<p class="hint">⚠ ${nAv} linha(s) com aviso: veja a coluna "Conferência". Elas serão importadas assim mesmo.</p>`:''}
    ${ignoradas && ignoradas.length?`<p class="hint">Colunas ignoradas (nome não reconhecido): ${ignoradas.map(esc).join(', ')}</p>`:''}
    ${nRep?`<label class="chk"><input type="checkbox" id="pularRep" ${pular?'checked':''} onchange="desenharPrevia()"> Pular linhas que já existem no sistema (evita lançar duas vezes)</label>`:''}
    <div class="tablewrap" style="max-height:340px;overflow:auto;margin-top:8px"><table>
      <tr><th>Linha</th>${cs.map(c=>`<th>${c.l.replace(' (R$)','')}</th>`).join('')}<th>Conferência</th></tr>
      ${regs.slice(0,300).map(x=>`<tr style="${valido(x)?'':'opacity:.55'}"><td>${x.linha}</td>${cs.map(c=>`<td class="${c.tipo==='dinheiro'?'num':''}">${mostrar(c,x.r[c.k])}</td>`).join('')}
        <td style="white-space:normal;min-width:200px">${x.erros.length?`<span class="neg">✖ ${esc(x.erros.join('; '))}</span>`: x.repetido?(pular?'↺ já existe, pulada':'↺ já existe, será importada de novo'):x.avisos.length?`⚠ ${esc(x.avisos.join('; '))}`:'<span class="pos">✔ ok</span>'}</td></tr>`).join('')}
    </table></div>
    ${regs.length>300?`<p class="hint">Mostrando as primeiras 300 linhas da prévia.</p>`:''}
    <div class="actions"><div></div><div><button class="btn" ${nOk?'':'disabled'} onclick="confirmarImport()">✔ Importar ${nOk} registro(s)</button></div></div>`;
}
function confirmarImport(){
  const pular = document.getElementById('pularRep') ? document.getElementById('pularRep').checked : true;
  const {t, regs} = IMPORT;
  const novos = regs.filter(x => !x.erros.length && !(pular && x.repetido)).map(x => ({id:novoId(), criado:hoje(), importado:true, ...x.r}));
  DB[t].push(...novos); salvar(); IMPORT = null; fechar(); render();
  alert(`${novos.length} registro(s) importado(s) com sucesso!`);
}
