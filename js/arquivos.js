/* =====================================================================
   ARQUIVOS (versão local) — o conteúdo dos anexos fica guardado no
   banco do próprio navegador (IndexedDB), só neste computador.
   ===================================================================== */
let _arqDB = null;
function arqBanco(){
  if (!_arqDB) _arqDB = new Promise((ok, erro) => {
    if (!window.indexedDB) return erro(new Error('este navegador não permite guardar arquivos'));
    const r = indexedDB.open('gestao_obras_arquivos', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('arquivos');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => { _arqDB = null; erro(r.error || new Error('não foi possível abrir o banco de arquivos')); };
  });
  return _arqDB;
}
function arqOp(modo, fn){
  return arqBanco().then(db => new Promise((ok, erro) => {
    const tx = db.transaction('arquivos', modo), req = fn(tx.objectStore('arquivos'));
    tx.oncomplete = () => ok(req.result);
    tx.onerror = tx.onabort = () => erro(tx.error || new Error('falha ao gravar (o disco pode estar cheio)'));
  }));
}
async function guardarArquivo(id, blob){ await arqOp('readwrite', s => s.put(blob, id)); return 1; }
async function lerArquivo(a){
  const b = await arqOp('readonly', s => s.get(a.id));
  if (!b) throw new Error('o arquivo não está guardado neste computador');
  return new Blob([b], {type: a.tipo || b.type || ''});
}
function apagarArquivo(a){ return arqOp('readwrite', s => s.delete(a.id)).catch(() => {}); }
