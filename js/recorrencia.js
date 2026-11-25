/* =====================================================================
   LANÇAMENTOS RECORRENTES (financeiro) — cria vários lançamentos de uma vez:
   - todos os dias, de uma data até outra (pode pular sábado e domingo)
   - todo mês, até um mês final (compras parceladas: 1/10, 2/10...)
   Os lançamentos criados ficam ligados pela mesma "serie", para poder
   excluir todos juntos depois.
   ===================================================================== */
const MAX_REPETICOES = 400;

function htmlRepeticao(){
  return `<div class="full rep">
    <label>🔁 Repetir lançamento</label>
    <div class="rep-linha">
      <select name="rep_modo">
        <option value="">Não repetir (só este lançamento)</option>
        <option value="dia">Todos os dias</option>
        <option value="mes">Todo mês (parcelas)</option>
      </select>
      <span class="rep-op rep-dia">até <input type="date" name="rep_ate_dia">
        <label class="chk"><input type="checkbox" name="rep_uteis" checked> só dias úteis (seg a sex)</label></span>
      <span class="rep-op rep-mes">até <input type="month" name="rep_ate_mes">
        <label class="chk"><input type="checkbox" name="rep_num" checked> numerar parcelas na descrição (1/10, 2/10...)</label></span>
    </div>
    <p class="rep-resumo"></p>
  </div>`;
}

/* datas de cada repetição, a partir do vencimento (ou da data do pagamento, se não houver vencimento) */
function datasRepeticao(form){
  const e = form.elements, modo = e.rep_modo ? e.rep_modo.value : '';
  const base = e.vencimento.value || e.data.value;
  if (!modo || !base) return {datas: base ? [base] : []};
  const out = [];
  if (modo === 'dia'){
    const ate = e.rep_ate_dia.value;
    if (!ate) return {erro: 'Escolha até que dia repetir.'};
    if (ate < base) return {erro: 'A data final da repetição é antes da data do lançamento.'};
    const d = new Date(base + 'T12:00:00');
    while (ymd(d) <= ate && out.length <= MAX_REPETICOES){
      const w = d.getDay();
      if (!e.rep_uteis.checked || (w > 0 && w < 6)) out.push(ymd(d));
      d.setDate(d.getDate() + 1);
    }
  } else {
    const ate = e.rep_ate_mes.value;
    if (!ate) return {erro: 'Escolha até que mês repetir.'};
    if (ate < base.slice(0,7)) return {erro: 'O mês final da repetição é antes do mês do lançamento.'};
    const [a, m, dia] = base.split('-').map(Number);
    for (let i = 0; out.length <= MAX_REPETICOES; i++){
      const ult = new Date(a, m + i, 0).getDate();                   // último dia do mês (dia 31 vira 30, 28...)
      const s = ymd(new Date(a, m - 1 + i, Math.min(dia, ult)));
      if (s.slice(0,7) > ate) break;
      out.push(s);
    }
  }
  if (!out.length) return {erro: 'Nenhum dia útil nesse período.'};
  if (out.length > MAX_REPETICOES) return {erro: `São mais de ${MAX_REPETICOES} lançamentos. Diminua o período.`};
  return {datas: out, modo};
}

/* mostra/esconde as opções e escreve o resumo ("Serão criados 10 lançamentos...") */
function atualizarRepeticao(form){
  const e = form.elements; if (!e.rep_modo) return;
  const modo = e.rep_modo.value;
  form.querySelector('.rep-dia').style.display = modo === 'dia' ? '' : 'none';
  form.querySelector('.rep-mes').style.display = modo === 'mes' ? '' : 'none';
  const el = form.querySelector('.rep-resumo');
  if (!modo){ el.textContent = ''; return; }
  const r = datasRepeticao(form), v = Number(e.valor.value) || 0;
  if (r.erro){ el.innerHTML = `<span class="neg">${esc(r.erro)}</span>`; return; }
  const n = r.datas.length, pago = !!e.data.value, hj = hoje();
  const futuros = pago ? r.datas.filter(d => d > hj).length : n;
  el.innerHTML = `Serão criados <b>${n} lançamento(s)</b> de <b>${brl(v)}</b> (total <b>${brl(v*n)}</b>),
    de ${dataBR(r.datas[0])} a ${dataBR(r.datas[n-1])}.`
    + (pago && futuros ? ` Os ${futuros} com data futura entram como <b>a pagar / a receber</b>.` : '')
    + (!pago ? ` Todos entram como <b>a pagar / a receber</b>, com o vencimento em cada data.` : '');
}

/* cria os lançamentos da série. Retorna false se algo impediu (mensagem já mostrada) */
function gravarSerie(dados, form, F){
  const r = datasRepeticao(form);
  if (r.erro){ alert(r.erro); return false; }
  const n = r.datas.length, serie = novoId(), pago = !!dados.data, hj = hoje();
  if (n > 1 && !confirm(`Criar ${n} lançamentos de ${brl(dados.valor)} (total ${brl(dados.valor*n)})?`)) return false;
  r.datas.forEach((dt, i) => {
    const x = {...dados, id: i === 0 && F ? F.id : novoId(), criado: hoje()};
    if (n > 1){
      x.serie = serie; x.parcela = `${i+1}/${n}`;
      if (pago && dt <= hj){ x.data = dt; x.vencimento = dados.vencimento ? dt : ''; x.pago = 'Pago'; }
      else { x.data = ''; x.vencimento = dt; x.pago = 'A pagar / A receber'; }
      if (r.modo === 'mes' && form.elements.rep_num.checked) x.descricao = `${dados.descricao} (${i+1}/${n})`;
    }
    if (i === 0 && F && F.lista.length) x.anexos = F.lista;      // documentos ficam no primeiro
    DB.financeiro.push(x);
  });
  return true;
}

/* ao excluir um lançamento de uma série, oferece excluir os outros também */
function outrosDaSerie(r){
  return r && r.serie ? DB.financeiro.filter(f => f.serie === r.serie && f.id !== r.id) : [];
}
