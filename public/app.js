const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
async function api(url, options={}) {
  const r = await fetch(url,{credentials:"same-origin",headers:{"Content-Type":"application/json",...(options.headers||{})},...options});
  const data = await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(data.error || "Não foi possível concluir.");
  return data;
}
function notice(msg){$("#notice").textContent=msg;$("#notice").classList.remove("hidden");}
async function load(){
  $("#year-now").textContent=new Date().getFullYear();
  const me=await api("/api/me");
  if(!me.user){$("#catalog").innerHTML='<div class="empty">Entre com Google ou Discord para solicitar acesso ao catálogo.</div>';return;}
  $("#account").innerHTML=`<span class="muted">${esc(me.user.display_name)}</span> <button class="login" id="logout">Sair</button>`;
  $("#logout").onclick=async()=>{await fetch("/auth/logout",{method:"POST"});location.reload();};
  if(me.user.status==="pending"){notice("Sua conta foi criada. Aguarde o administrador liberar seu acesso.");return;}
  if(me.user.status==="blocked"){notice("Esta conta está bloqueada. Procure o administrador.");return;}
  const titles=await api("/api/titles");
  $("#count").textContent=`${titles.length} títulos`;
  $("#catalog").innerHTML=titles.length?titles.map(t=>`<article class="tile" data-id="${t.id}"><img src="${esc(t.poster_url||"https://placehold.co/400x600/10243a/ffffff?text=MUKA+FLIX")}" alt=""><div class="tile-info"><h3>${esc(t.title)}</h3><p>${esc(t.category)} · ${esc(t.year||"")}</p></div></article>`).join(""):'<div class="empty">O catálogo ainda está vazio. O administrador poderá adicionar conteúdos pelo painel.</div>';
  document.querySelectorAll(".tile").forEach(el=>el.onclick=()=>play(el.dataset.id));
  if(me.user.role==="admin"){ $("#admin").classList.remove("hidden"); loadUsers(); }
}
async function play(id){
  const t=await api(`/api/titles/${id}`);
  $("#player-title").textContent=t.title;
  $("#video").src=t.playback_url;
  $("#player").classList.remove("hidden");
}
$("#close-player").onclick=()=>{$("#video").src="";$("#player").classList.add("hidden");};
async function loadUsers(){
  const users=await api("/api/admin/users");
  $("#users").innerHTML=users.map(u=>`<div class="user-row"><span>${esc(u.display_name)}<br><small class="muted">${esc(u.email||u.provider)} · ${esc(u.status)}</small></span><span>${u.status==="pending"?`<button data-approve="${u.id}">Liberar</button>`:""} ${u.status!=="blocked"?`<button data-block="${u.id}">Bloquear</button>`:`<button data-unblock="${u.id}">Desbloquear</button>`}</span></div>`).join("")||"Nenhuma conta cadastrada.";
  document.querySelectorAll("[data-approve]").forEach(b=>b.onclick=async()=>{await api(`/api/admin/users/${b.dataset.approve}`,{method:"PATCH",body:JSON.stringify({status:"approved"})});loadUsers();});
  document.querySelectorAll("[data-block]").forEach(b=>b.onclick=async()=>{await api(`/api/admin/users/${b.dataset.block}`,{method:"PATCH",body:JSON.stringify({status:"blocked"})});loadUsers();});
  document.querySelectorAll("[data-unblock]").forEach(b=>b.onclick=async()=>{await api(`/api/admin/users/${b.dataset.unblock}`,{method:"PATCH",body:JSON.stringify({status:"approved"})});loadUsers();});
}
$("#title-form").onsubmit=async e=>{
  e.preventDefault();const f=new FormData(e.currentTarget);const body=Object.fromEntries(f.entries());body.featured=f.has("featured");body.year=body.year?Number(body.year):null;
  try{await api("/api/admin/titles",{method:"POST",body:JSON.stringify(body)});e.currentTarget.reset();notice("Título adicionado ao catálogo.");load();}
  catch(err){notice(err.message);}
};
load().catch(err=>notice(err.message));
