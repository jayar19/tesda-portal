/* script.js - client side file manager (IndexedDB) + QR generator */

const DB_NAME = 'tesda_files_db';
const DB_STORE = 'files';
let db;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();
  initDB();
  initUI();
});

function initDB(){
  const req = indexedDB.open(DB_NAME, 1);
  req.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains(DB_STORE)){
      const store = db.createObjectStore(DB_STORE, { keyPath: 'id', autoIncrement: true });
      store.createIndex('name', 'name', { unique: false });
      store.createIndex('tags', 'tags', { unique: false, multiEntry: true });
      store.createIndex('created', 'created', { unique: false });
    }
  };
  req.onsuccess = (e) => { db = e.target.result; refreshList(); };
  req.onerror = (e) => { console.error('IndexedDB error', e); alert('Database error: ' + e.target.error); };
}

function initUI(){
  const uploadArea = document.getElementById('uploadArea');
  const fileInput = document.getElementById('fileInput');
  uploadArea.addEventListener('click', ()=> fileInput.click());
  uploadArea.addEventListener('dragover', (e)=> { e.preventDefault(); uploadArea.classList.add('drag'); });
  uploadArea.addEventListener('dragleave', ()=> uploadArea.classList.remove('drag'));
  uploadArea.addEventListener('drop', (e)=> {
    e.preventDefault(); uploadArea.classList.remove('drag');
    handleFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', (e)=> handleFiles(e.target.files));
  document.getElementById('searchInput').addEventListener('input', (e)=> refreshList(e.target.value));
  document.getElementById('clearAllBtn').addEventListener('click', clearAll);

  // QR controls
  document.getElementById('generateQrBtn').addEventListener('click', generateQR);
  document.getElementById('downloadQrBtn').addEventListener('click', downloadQR);
}

function handleFiles(fileList){
  const files = Array.from(fileList);
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target.result; // ArrayBuffer or base64
      saveFileToDB(file.name, file.type, file.size, data)
        .then(()=> refreshList())
        .catch(err => console.error(err));
    };
    // use ArrayBuffer to store binary
    reader.readAsArrayBuffer(file);
  });
}

function saveFileToDB(name, type, size, arrayBuffer){
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    const fileRecord = {
      name,
      type,
      size,
      blob: arrayBuffer, // store ArrayBuffer (indexedDB supports blobs/ArrayBuffers)
      created: new Date().toISOString(),
      tags: extractTagsFromName(name)
    };
    const req = store.add(fileRecord);
    req.onsuccess = ()=> resolve();
    req.onerror = (e)=> reject(e);
  });
}

function extractTagsFromName(name){
  const base = name.split('.')[0];
  return base.split(/[\s_-]+/).map(s=> s.toLowerCase()).filter(Boolean);
}

function refreshList(filter = ''){
  const listEl = document.getElementById('fileList');
  listEl.innerHTML = '<div class="file-sub">Loading...</div>';
  const tx = db.transaction(DB_STORE, 'readonly');
  const store = tx.objectStore(DB_STORE);
  const req = store.openCursor(null, 'prev'); // newest first
  const q = filter.trim().toLowerCase();

  const items = [];
  req.onsuccess = (e) => {
    const cursor = e.target.result;
    if (cursor) {
      const rec = cursor.value;
      if (!q || rec.name.toLowerCase().includes(q) || (rec.tags && rec.tags.join(' ').includes(q))){
        items.push(rec);
      }
      cursor.continue();
    } else {
      if (items.length === 0) {
        listEl.innerHTML = '<div class="file-sub">No files found.</div>';
        return;
      }
      listEl.innerHTML = '';
      items.forEach(rec => {
        const el = renderFileItem(rec);
        listEl.appendChild(el);
      });
    }
  };
  req.onerror = (e)=> { listEl.innerHTML = '<div class="file-sub">Error reading files.</div>'; };
}

function renderFileItem(rec){
  const wrapper = document.createElement('div');
  wrapper.className = 'file-item';

  const meta = document.createElement('div'); meta.className='file-meta';
  const name = document.createElement('div'); name.className='file-name'; name.textContent = rec.name;
  const sub = document.createElement('div'); sub.className='file-sub'; sub.textContent = `${rec.type || 'file'} • ${formatBytes(rec.size)} • ${new Date(rec.created).toLocaleString()}`;
  meta.appendChild(name); meta.appendChild(sub);

  const actions = document.createElement('div'); actions.className='file-actions';
  const previewBtn = document.createElement('button'); previewBtn.textContent='Preview';
  const downloadBtn = document.createElement('button'); downloadBtn.textContent='Download';
  const linkQrBtn = document.createElement('button'); linkQrBtn.textContent='QR (copy link)';
  const deleteBtn = document.createElement('button'); deleteBtn.textContent='Delete'; deleteBtn.style.background='#ef4444';

  previewBtn.addEventListener('click', ()=> previewFile(rec));
  downloadBtn.addEventListener('click', ()=> downloadFile(rec));
  deleteBtn.addEventListener('click', ()=> deleteFile(rec.id));
  linkQrBtn.addEventListener('click', ()=> {
    // Can't make a remote link from IndexedDB. Show instructions and optionally generate a data-URL QR (works but big).
    const promptMsg = `IndexedDB files are local to your browser and cannot be linked publicly.\n\nTo share via URL: upload the file to a public host (GitHub repo raw file, file hosting) and paste that URL into the QR generator.\n\nWould you like to generate a QR for the file as a data-URI (works locally only)?`;
    if (confirm(promptMsg)) {
      generateQRForRecordData(rec);
    }
  });

  actions.appendChild(previewBtn);
  actions.appendChild(downloadBtn);
  actions.appendChild(linkQrBtn);
  actions.appendChild(deleteBtn);

  wrapper.appendChild(meta);
  wrapper.appendChild(actions);
  return wrapper;
}

function previewFile(rec){
  // create blob and open in new tab if supported
  const blob = new Blob([rec.blob], { type: rec.type || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  // attempt to open
  window.open(url, '_blank');
  // release after short delay
  setTimeout(()=> URL.revokeObjectURL(url), 20000);
}

function downloadFile(rec){
  const blob = new Blob([rec.blob], { type: rec.type || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = rec.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=> URL.revokeObjectURL(url), 20000);
}

function deleteFile(id){
  if (!confirm('Delete this file?')) return;
  const tx = db.transaction(DB_STORE, 'readwrite');
  const store = tx.objectStore(DB_STORE);
  const req = store.delete(id);
  req.onsuccess = ()=> refreshList();
  req.onerror = (e)=> console.error(e);
}

function clearAll(){
  if (!confirm('Delete ALL files from local DB? This cannot be undone.')) return;
  const req = indexedDB.deleteDatabase(DB_NAME);
  req.onsuccess = ()=> { alert('All files removed. Reloading...'); setTimeout(()=> location.reload(), 300); };
  req.onerror = (e)=> alert('Failed to clear DB: ' + e.target.error);
}

function formatBytes(bytes){
  if (bytes === 0) return '0 B';
  const k = 1024, sizes = ['B','KB','MB','GB','TB'], i = Math.floor(Math.log(bytes)/Math.log(k));
  return parseFloat((bytes / Math.pow(k,i)).toFixed(2)) + ' ' + sizes[i];
}

/* QR functions */
let qrInstance;
function generateQR(){
  const text = document.getElementById('qrText').value.trim();
  const preview = document.getElementById('qrPreview');
  preview.innerHTML = '';
  document.getElementById('downloadQrBtn').disabled = true;
  if (!text) { preview.innerHTML = '<div class="file-sub">Enter text or URL to generate QR.</div>'; return; }
  qrInstance = new QRCode(preview, {
    text,
    width: 200,
    height: 200,
    correctLevel: QRCode.CorrectLevel.H
  });
  // add small note
  document.getElementById('downloadQrBtn').disabled = false;
}

function downloadQR(){
  // find image inside qrPreview (canvas or img)
  const preview = document.getElementById('qrPreview');
  const img = preview.querySelector('img') || preview.querySelector('canvas');
  if (!img) return;
  let dataUrl;
  if (img.tagName.toLowerCase() === 'img') dataUrl = img.src;
  else {
    dataUrl = img.toDataURL('image/png');
  }
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = 'qr.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* Generate QR for a record's data (local only, data-URI) */
function generateQRForRecordData(rec){
  // create blob URL then convert to data URL (if small)
  const blob = new Blob([rec.blob], { type: rec.type || 'application/octet-stream' });
  // convert blob to data URI (may be large; user warned)
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUri = e.target.result;
    document.getElementById('qrText').value = dataUri;
    generateQR();
    alert('Generated QR for local data URI. Reminder: this QR works only on the device/browser where file data exists or when scanned on the same device to read the data URI; it is not a public URL.');
  };
  reader.readAsDataURL(blob);
}
