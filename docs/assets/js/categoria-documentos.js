let currentUser=null, cache=[], procesos=[], areas=[];
const CATEGORY = window.DOC_CATEGORY || {tipo:'Documento', key:'documentos'};
function closeForm(){modal.hidden=true;}
function fillMeta(){
  const pOpts=procesos.map(p=>`<option value="${p.id}">${esc(p.codigo)} · ${esc(p.nombre)}</option>`).join('');
  proceso_id.innerHTML='<option value="">Seleccione...</option>'+pOpts;
  const aOpts=areas.map(a=>`<option value="${a.id}">${esc(a.nombre)}</option>`).join('');
  areaFilter.innerHTML='<option value="">Todas las áreas</option>'+aOpts;
}
function openForm(doc=null){
  id.value=doc?.id||'';proceso_id.value=doc?.proceso_id||'';nombre.value=doc?.nombre||'';version.value=doc?.version||'';estado.value=doc?.estado||'Activo';fecha_actualizacion.value=doc?.fecha_actualizacion||'';enlace_doc.value=doc?.enlace_doc||'';enlace_fluj.value=doc?.enlace_fluj||'';enlace_fluj1.value=doc?.enlace_fluj1||'';enlace_fluj2.value=doc?.enlace_fluj2||'';enlace_fluj3.value=doc?.enlace_fluj3||'';formTitle.textContent=doc?`Editar ${CATEGORY.tipo.toLowerCase()}`:`Nuevo ${CATEGORY.tipo.toLowerCase()}`;modal.hidden=false;
}
async function meta(){const d=await apiGet('/api/documentos/meta');procesos=d.procesos||[];areas=d.areas||[];fillMeta();}
function safeUrl(value){if(!value)return null;let u=String(value).trim();if(/^www\./i.test(u))u=`https://${u}`;try{const p=new URL(u);return ['http:','https:'].includes(p.protocol)?p.href:null;}catch(_){return null;}}
function openLink(doc){const u=safeUrl(doc.enlace_doc);return u?`<a class="btn btn-secondary btn-sm" href="${esc(u)}" target="_blank" rel="noopener noreferrer">Abrir</a>`:'<span class="muted">Sin enlace</span>';}
async function load(){
  setLoading('rows',6,'Cargando información...');
  try{
    const p=new URLSearchParams({tipo:CATEGORY.tipo});
    if(q.value)p.set('q',q.value);
    if(areaFilter.value)p.set('area_id',areaFilter.value);
    if(estadoFilter.value)p.set('estado',estadoFilter.value);
    const d=await apiGet(`/api/documentos?${p}`);cache=d.documentos||[];
    rows.innerHTML=cache.length?cache.map(x=>`<tr>
      <td><div class="cell-title"><strong>${esc(x.nombre)}</strong></div></td>
      <td><div class="cell-title"><strong>${esc(x.proceso?.nombre||'-')}</strong><span class="cell-sub">${esc(x.proceso?.codigo||'')}</span></div></td>
      <td>${esc(x.proceso?.area?.nombre||'-')}</td>
      <td>${x.estado==='Inactivo'?'<span class="status-inactive">Inactivo</span>':'<span class="status-active">Activo</span>'}</td>
      <td>${openLink(x)}</td>
      ${currentUser.rol==='administrador'?`<td class="admin-only-column"><div class="action-row"><button class="btn btn-secondary btn-sm" onclick="openForm(cache.find(y=>y.id===${x.id}))">Editar</button><button class="btn btn-danger btn-sm" onclick="removeD(${x.id})">Eliminar</button></div></td>`:''}
    </tr>`).join(''):`<tr><td colspan="${currentUser?.rol==='administrador'?6:5}" class="empty">No hay ${esc(CATEGORY.labelPlural.toLowerCase())} para mostrar.</td></tr>`;
  }catch(e){showMsg(e.message,'error');}
}
async function removeD(did){if(!confirm(`¿Eliminar este ${CATEGORY.tipo.toLowerCase()}?`))return;try{await apiDelete(`/api/documentos/${did}`);showMsg(`${CATEGORY.tipo} eliminado`);await load();}catch(e){showMsg(e.message,'error');}}
form.addEventListener('submit',async e=>{e.preventDefault();const body={proceso_id:proceso_id.value,tipo:CATEGORY.tipo,nombre:nombre.value,version:version.value,estado:estado.value,fecha_actualizacion:fecha_actualizacion.value,enlace_doc:enlace_doc.value,enlace_fluj:enlace_fluj.value,enlace_fluj1:enlace_fluj1.value,enlace_fluj2:enlace_fluj2.value,enlace_fluj3:enlace_fluj3.value};try{id.value?await apiPut(`/api/documentos/${id.value}`,body):await apiPost('/api/documentos',body);closeForm();showMsg(`${CATEGORY.tipo} guardado`);await load();}catch(e){showMsg(e.message,'error');}});
(async()=>{currentUser=await initLayout(CATEGORY.key);if(!currentUser)return;await Promise.all([meta(),load()]);})();
