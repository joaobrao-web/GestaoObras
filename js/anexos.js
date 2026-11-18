/* =====================================================================
   ANEXOS — documentos, fotos e PDFs ligados a qualquer registro
   (obra, cliente, contrato, proposta, lançamento, compromisso...).
   A lista de anexos (nome, tamanho, data) fica no próprio registro,
   no campo "anexos". O conteúdo do arquivo fica guardado à parte:
   veja arquivos.js (navegador na versão local, nuvem na versão online).
   ===================================================================== */
const ANEXO_MAX = 15 * 1024 * 1024;          // 15 MB por arquivo
let FORM_ANEXOS = null;                       // formulário aberto: {t, id, novo, lista, salvo}

/* lista de anexos do registro (ou do registro novo que ainda está no formulário) */
function listaAnexos(t, id, criar){
  const r = buscar(t, id);
  if (r) return r.anexos || (criar ? (r.anexos = []) : []);
  if (FORM_ANEXOS && FORM_ANEXOS.t === t && FORM_ANEXOS.id === id) return FORM_ANEXOS.lista;
  return [];
}
const tamanhoArq = b => b < 1024*1024 ? Math.max(1, Math.round(b/1024)) + ' KB' : (b/1024/1024).toFixed(1).replace('.', ',') + ' MB';
function iconeArq(a){
  const n = (a.nome||'').toLowerCase(), tp = a.tipo || '';
  if (tp.startsWith('image/')) return '🖼';
  if (tp === 'application/pdf' || n.endsWith('.pdf')) return '📕';
  if (/\.(xlsx?|csv|ods)$/.test(n)) return '📊';
  if (/\.(docx?|odt|rtf|txt)$/.test(n)) return '📝';
  if (/\.(dwg|dxf|skp)$/.test(n)) return '📐';
  if (/\.(zip|rar|7z)$/.test(n)) return '🗜';
  return '📄';
}

function htmlAnexos(t, id){
  const l = listaAnexos(t, id);
  return `${l.length ? `<ul class="anx">${l.map(a => `<li>
      <span class="anx-ic">${iconeArq(a)}</span>
      <a href="#" class="anx-nome" onclick="event.preventDefault();verAnexo('${t}','${id}','${a.id}')" title="Abrir">${esc(a.nome)}</a>
      <span class="anx-info">${tamanhoArq(a.tam||0)} · ${dataBR(a.data)}${a.por ? ' · ' + esc(a.por) : ''}</span>
      <button type="button" class="anx-bt" onclick="baixarAnexo('${t}','${id}','${a.id}')" title="Baixar">⬇</button>
      <button type="button" class="anx-bt del" onclick="removerAnexo('${t}','${id}','${a.id}')" title="Remover anexo">✕</button></li>`).join('')}</ul>`
    : `<p class="anx-vazio">Nenhum documento anexado.</p>`}
    <label class="btn sec anx-add">📎 Anexar arquivos<input type="file" multiple hidden onchange="anexar('${t}','${id}',this)"></label>
    <span class="anx-msg"></span>`;
}
function atualizarAnexos(t, id, msg){
  document.querySelectorAll(`[data-anx="${t}:${id}"]`).forEach(el => {
    el.innerHTML = htmlAnexos(t, id);
    if (msg) el.querySelector('.anx-msg').textContent = msg;
  });
}

/* fotos grandes do celular são reduzidas (máx. 2000 px) para ocupar menos espaço */
function reduzirFoto(f){
  if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size < 1024*1024) return Promise.resolve(f);
  return new Promise(ok => {
    const img = new Image(), url = URL.createObjectURL(f);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const k = Math.min(1, 2000 / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width*k); c.height = Math.round(img.height*k);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0,0,c.width,c.height); g.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob(b => ok(b && b.size < f.size ? b : f), 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); ok(f); };
    img.src = url;
  });
}

async function anexar(t, id, input){
  const arquivos = [...input.files]; input.value = '';
  for (const f of arquivos){
    if (f.size > ANEXO_MAX){ alert(`"${f.name}" tem ${tamanhoArq(f.size)}. O limite é ${tamanhoArq(ANEXO_MAX)} por arquivo.`); continue; }
    atualizarAnexos(t, id, `Enviando ${f.name}...`);
    try {
      const b = await reduzirFoto(f);
      const nome = b !== f ? f.name.replace(/\.[^.]+$/, '') + '.jpg' : f.name;
      const a = {id: novoId(), nome, tipo: b.type || '', tam: b.size, data: hoje(),
                 por: typeof USUARIO !== 'undefined' && USUARIO ? (USUARIO.displayName || USUARIO.email) : ''};
      a.partes = await guardarArquivo(a.id, b);
      listaAnexos(t, id, true).push(a);
      if (buscar(t, id)) salvar();
    } catch(e){
      alert(`Não foi possível anexar "${f.name}": ${e.message}`);
    }
  }
  atualizarAnexos(t, id);
  if (!document.querySelector('#modal .modal')) render();
}

async function removerAnexo(t, id, aid){
  const l = listaAnexos(t, id), i = l.findIndex(a => a.id === aid);
  if (i < 0 || !confirm(`Remover o anexo "${l[i].nome}"? O arquivo será apagado.`)) return;
  const [a] = l.splice(i, 1);
  if (buscar(t, id)) salvar();
  apagarArquivo(a);
  atualizarAnexos(t, id);
  if (!document.querySelector('#modal .modal')) render();
}

async function conteudoAnexo(t, id, aid){
  const a = listaAnexos(t, id).find(x => x.id === aid);
  if (!a) throw new Error('anexo não encontrado');
  atualizarAnexos(t, id, `Abrindo ${a.nome}...`);
  try { return {a, b: await lerArquivo(a)}; }
  finally { atualizarAnexos(t, id); }
}
async function baixarAnexo(t, id, aid){
  try {
    const {a, b} = await conteudoAnexo(t, id, aid), url = URL.createObjectURL(b);
    const l = document.createElement('a'); l.href = url; l.download = a.nome;
    document.body.appendChild(l); l.click(); l.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch(e){ alert('Não foi possível baixar: ' + e.message); }
}
/* imagens e PDFs abrem numa janela dentro do sistema; os outros tipos são baixados */
async function verAnexo(t, id, aid){
  let r;
  try { r = await conteudoAnexo(t, id, aid); } catch(e){ alert('Não foi possível abrir: ' + e.message); return; }
  const {a, b} = r, tp = a.tipo || '';
  if (!tp.startsWith('image/') && tp !== 'application/pdf') return baixarAnexo(t, id, aid);
  const url = URL.createObjectURL(b), v = document.createElement('div');
  v.className = 'visor';
  v.innerHTML = `<div class="visor-top"><b>${iconeArq(a)} ${esc(a.nome)}</b>
      <span><a class="btn sec" href="${url}" download="${esc(a.nome)}">⬇ Baixar</a>
      <button class="btn" onclick="fecharVisor()">✕ Fechar</button></span></div>
    <div class="visor-corpo">${tp.startsWith('image/') ? `<img src="${url}" alt="">` : `<iframe src="${url}" title="${esc(a.nome)}"></iframe>`}</div>`;
  v.dataset.url = url;
  v.onclick = e => { if (e.target === v || e.target.classList.contains('visor-corpo')) fecharVisor(); };
  document.body.appendChild(v);
}
function fecharVisor(){
  document.querySelectorAll('.visor').forEach(v => { URL.revokeObjectURL(v.dataset.url); v.remove(); });
}
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.querySelector('.visor')){ e.stopImmediatePropagation(); fecharVisor(); } }, true);
