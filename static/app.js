const $ = s => document.querySelector(s);
let csrf = '', user = null, registering = false;
let library = {tracks: [], favorites: [], playlists: []}, shown = [], queue = [], current = null, player = null, ready = false, view = 'home', genre = 'Todos', selectedTrack = null, searchVersion = 0;
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cover = id => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
let toastTimer;
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').hidden = true, 4500); }
async function api(path, data) {
  const response = await fetch('/api/' + path, data === undefined ? {} : {method:'POST', headers:{'Content-Type':'application/json','X-CSRF-Token':csrf}, body:JSON.stringify(data)});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'No se pudo completar la operación.');
  return result;
}
async function loadLibrary() {
  library = await api('library');
  $('#favorite-count').textContent = library.favorites.length;
  $('#playlists').innerHTML = library.playlists.map(p => `<button class="playlist-nav ${view === String(p.id) ? 'active' : ''}" data-playlist="${p.id}">▤ &nbsp; ${escapeHTML(p.name)} <small>· ${p.count}</small></button>`).join('');
  $('#playlists').querySelectorAll('button').forEach(b => b.onclick = () => navigate(b.dataset.playlist));
  updateFavorite();
}
function render(tracks) {
  shown = tracks;
  $('#result-count').textContent = `${tracks.length} canciones`;
  $('#empty').hidden = tracks.length > 0;
  $('#tracks').innerHTML = tracks.map((t, i) => `<article class="track"><button class="cover" data-play="${i}" aria-label="Escuchar ${escapeHTML(t.title)}"><img src="${cover(t.id)}" alt="" loading="lazy"></button><h3 title="${escapeHTML(t.title)}">${escapeHTML(t.title)}</h3><p>${escapeHTML(t.artist)}</p><div class="track-bottom"><span class="genre-tag">${escapeHTML(t.genre)}</span><div class="track-actions"><button data-favorite="${i}" class="${library.favorites.includes(t.id) ? 'liked' : ''}" aria-label="${library.favorites.includes(t.id) ? 'Quitar de' : 'Añadir a'} favoritos">${library.favorites.includes(t.id) ? '♥' : '♡'}</button><button data-add="${i}" aria-label="Añadir a playlist">＋</button>${!['home','favorites','search'].includes(view) ? `<button data-remove="${i}" aria-label="Quitar de esta playlist">−</button>` : ''}</div></div></article>`).join('');
  $('#tracks').querySelectorAll('[data-play]').forEach(b => b.onclick = () => play(shown[+b.dataset.play], shown));
  $('#tracks').querySelectorAll('[data-favorite]').forEach(b => b.onclick = () => favorite(shown[+b.dataset.favorite]));
  $('#tracks').querySelectorAll('[data-add]').forEach(b => b.onclick = () => choosePlaylist(shown[+b.dataset.add]));
  $('#tracks').querySelectorAll('[data-remove]').forEach(b => b.onclick = async () => {
    try { await api(`playlists/${view}/tracks`, {...shown[+b.dataset.remove], remove:true}); await loadLibrary(); await navigate(view); toast('Canción eliminada de la playlist'); } catch(e) { toast(e.message); }
  });
}
async function navigate(nextView) {
  ++searchVersion;
  view = nextView;
  $('.hero').hidden = view !== 'home';
  $('#browse').hidden = view !== 'home';
  $('#api-notice').hidden = true;
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('[data-playlist]').forEach(b => b.classList.toggle('active', b.dataset.playlist === view));
  try {
    if (view === 'home') {
      $('#page-title').innerHTML = 'Dale ritmo a tu mundo<span>.</span>';
      $('#page-description').textContent = 'Descubre algo nuevo. Vuelve a lo que te encanta.';
      $('#list-title').textContent = 'Tu próxima canción favorita';
      render(library.tracks.filter(t => genre === 'Todos' || t.genre === genre));
    } else if (view === 'favorites') {
      $('#page-title').textContent = 'Tus favoritos';
      $('#page-description').textContent = 'Esas canciones a las que siempre vuelves.';
      $('#list-title').textContent = 'Tu colección';
      render(library.tracks.filter(t => library.favorites.includes(t.id)));
    } else {
      const playlist = library.playlists.find(p => String(p.id) === view);
      $('#page-title').textContent = playlist?.name || 'Playlist';
      $('#page-description').textContent = 'Una selección con tu firma. Añade canciones con el botón +.';
      $('#list-title').textContent = 'Canciones de la playlist';
      const result = await api(`playlists/${view}`);
      if (view === nextView) render(result.tracks);
    }
  } catch(e) { toast(e.message); }
}
async function favorite(t) {
  if (!requireUser()) return;
  if (!t) return toast('Elige una canción primero.');
  try {
    const result = await api('favorites', t);
    await loadLibrary();
    if (view === 'favorites') render(library.tracks.filter(t => library.favorites.includes(t.id))); else render(shown);
    toast(result.saved ? 'Guardada en tus favoritos' : 'Eliminada de tus favoritos');
  } catch(e) { toast(e.message); }
}
function updateFavorite() {
  const saved = current && library.favorites.includes(current.id);
  $('#now-favorite').textContent = saved ? '♥' : '♡';
  $('#now-favorite').classList.toggle('liked', !!saved);
}
function play(t, list = queue) {
  if (!t) return;
  current = t; queue = [...list];
  $('#playing-title').textContent = t.title;
  $('#playing-artist').textContent = t.artist;
  updateFavorite(); renderQueue();
  if (ready) { $('#player-placeholder').hidden = true; player.loadVideoById(t.id); }
  else toast('Cargando el reproductor de YouTube… Si no aparece, revisa la conexión.');
}
function renderQueue() {
  const index = queue.findIndex(t => t.id === current?.id);
  const upcoming = queue.slice(index + 1);
  $('#queue-count').textContent = `${upcoming.length} canciones`;
  $('#queue').innerHTML = upcoming.slice(0,4).map((t,i) => `<button class="queue-item" data-queue="${index + i + 1}"><img src="${cover(t.id)}" alt=""><div><strong>${escapeHTML(t.title)}</strong><small>${escapeHTML(t.artist)}</small></div></button>`).join('');
  $('#queue').querySelectorAll('button').forEach(b => b.onclick = () => play(queue[+b.dataset.queue]));
}
function skip(delta) {
  const i = queue.findIndex(t => t.id === current?.id) + delta;
  if (i < 0 || i >= queue.length) return toast('Has llegado al final de esta selección.');
  play(queue[i]);
}
window.onYouTubeIframeAPIReady = () => {
  player = new YT.Player('youtube-player', {width:'100%',height:'100%',playerVars:{playsinline:1,origin:location.origin},events:{
    onReady:() => { ready = true; if (current) { $('#player-placeholder').hidden = true; player.cueVideoById(current.id); toast('Pulsa ▶ para empezar a escuchar.'); } },
    onStateChange:e => { $('#toggle-play').textContent = e.data === 1 ? 'Ⅱ' : '▶'; if (e.data === 0) skip(1); },
    onError:() => toast('YouTube no permite reproducir este vídeo aquí o no está disponible. Prueba otra canción.')
  }});
};
const yt = document.createElement('script'); yt.src = 'https://www.youtube.com/iframe_api'; yt.onerror = () => toast('No se pudo cargar YouTube. Comprueba la conexión.'); document.head.append(yt);
$('#toggle-play').onclick = () => { if (!current) return play(library.tracks[0], library.tracks); if (!ready) return toast('El reproductor está cargando.'); player.getPlayerState() === 1 ? player.pauseVideo() : player.playVideo(); };
$('#previous').onclick = () => skip(-1); $('#next').onclick = () => skip(1);
$('#now-favorite').onclick = () => favorite(current);
$('#hero-play').onclick = () => play(library.tracks[0], library.tracks);
document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => navigate(b.dataset.view));
$('#search-nav').onclick = () => $('#search').focus();
document.querySelectorAll('[data-genre]').forEach(b => b.onclick = () => {
  genre = b.dataset.genre; document.querySelectorAll('[data-genre]').forEach(c => c.classList.toggle('selected', c === b)); navigate('home');
});
$('#search-form').onsubmit = async e => {
  e.preventDefault(); const q = $('#search').value.trim(); if (!q) return navigate('home');
  const version = ++searchVersion;
  view = 'search'; $('.hero').hidden = true; $('#browse').hidden = true;
  document.querySelectorAll('.nav,.playlist-nav').forEach(b => b.classList.remove('active')); $('#search-nav').classList.add('active');
  $('#page-title').textContent = 'Encuentra tu próximo tema'; $('#page-description').textContent = `Resultados para «${q}»`; $('#list-title').textContent = 'Buscando…'; $('#api-notice').hidden = true; render([]); $('#empty').hidden = true;
  try {
    const result = await api('search?q=' + encodeURIComponent(q)); if (version !== searchVersion) return;
    $('#list-title').textContent = 'Resultados de búsqueda';
    $('#api-notice').hidden = result.source !== 'local';
    $('#api-notice').textContent = 'Búsqueda en la selección local. Para buscar en todo YouTube, configura YOUTUBE_API_KEY en el archivo .env y reinicia el servidor.';
    render(result.tracks);
  } catch(e) { if (version === searchVersion) { $('#list-title').textContent = 'No se pudo buscar'; $('#api-notice').textContent = e.message; $('#api-notice').hidden = false; } }
};
$('#create-playlist').onclick = () => { if(requireUser()) $('#playlist-dialog').showModal(); };
$('#cancel-dialog').onclick = () => $('#playlist-dialog').close();
$('#playlist-form').onsubmit = async e => {
  e.preventDefault(); const button = e.submitter; button.disabled = true;
  try { const p = await api('playlists', {name:$('#playlist-name').value.trim()}); await loadLibrary(); $('#playlist-dialog').close(); $('#playlist-form').reset(); await navigate(String(p.id)); toast('Playlist creada'); } catch(e) { toast(e.message); } finally { button.disabled = false; }
};
function choosePlaylist(t) {
  if (!requireUser()) return;
  selectedTrack = t;
  if (!library.playlists.length) { toast('Crea primero una playlist.'); return $('#playlist-dialog').showModal(); }
  $('#playlist-options').innerHTML = library.playlists.map(p => `<button data-id="${p.id}">▤ &nbsp; ${escapeHTML(p.name)}</button>`).join('');
  $('#playlist-options').querySelectorAll('button').forEach(b => b.onclick = async () => {
    b.disabled = true;
    try { await api(`playlists/${b.dataset.id}/tracks`, selectedTrack); await loadLibrary(); $('#add-dialog').close(); toast('Canción añadida a la playlist'); } catch(e) { toast(e.message); } finally { b.disabled = false; }
  });
  $('#add-dialog').showModal();
}
$('#close-add').onclick = () => $('#add-dialog').close();
function requireUser() {
  if (user) return true;
  $('#auth-dialog').showModal(); return false;
}
const avatar = document.createElement('button'); avatar.className = 'avatar'; avatar.id='account-button'; avatar.textContent='Entrar'; avatar.setAttribute('aria-label','Abrir tu cuenta'); $('.avatar').replaceWith(avatar);
$('.sidebar-bottom small').textContent='Express + Python + MySQL';
const adminButton=document.createElement('button'); adminButton.className='playlist-nav';adminButton.textContent='⚙ Administración';adminButton.hidden=true;$('.sidebar-bottom').before(adminButton);
const mobileCreate=document.createElement('button');mobileCreate.className='mobile-create';mobileCreate.textContent='＋ Nueva playlist';$('#playlists').before(mobileCreate);mobileCreate.onclick=()=>$('#create-playlist').click();
function setSession(result) {
  csrf=result.csrf;user=result.user;
  avatar.textContent=user ? user.name.slice(0,2).toUpperCase() : 'Entrar';
  adminButton.hidden=user?.role!=='admin';
}
avatar.onclick=()=>{ if(!user) return $('#auth-dialog').showModal();$('#account-title').textContent=user.name;$('#account-email').textContent=user.email;$('#account-dialog').showModal(); };
$('#close-auth').onclick=()=>$('#auth-dialog').close();$('#close-account').onclick=()=>$('#account-dialog').close();
$('#auth-switch').onclick=()=>{registering=!registering;$('#name-label').hidden=!registering;$('#auth-name').required=registering;$('#auth-title').textContent=registering?'Tu música empieza aquí':'Bienvenido de nuevo';$('#auth-submit').textContent=registering?'Crear cuenta':'Entrar';$('#auth-switch').textContent=registering?'Ya tengo una cuenta':'¿Primera vez? Crea tu cuenta';$('#auth-password').autocomplete=registering?'new-password':'current-password';$('#auth-error').textContent='';};
$('#auth-form').onsubmit=async e=>{
 e.preventDefault();e.submitter.disabled=true;$('#auth-error').textContent='';
 try {setSession(await api(registering?'register':'login',{email:$('#auth-email').value,password:$('#auth-password').value,name:$('#auth-name').value}));await loadLibrary();await navigate('home');$('#auth-dialog').close();$('#auth-form').reset();toast(`Bienvenido, ${user.name}`);}catch(err){$('#auth-error').textContent=err.message;}finally{e.submitter.disabled=false;}
};
$('#logout').onclick=async()=>{try{setSession(await api('logout',{}));await loadLibrary();await navigate('home');$('#account-dialog').close();toast('Sesión cerrada');}catch(e){toast(e.message);}};
async function loadAdmin(){
 const result=await api('admin');$('#admin-stats').textContent=`${result.stats.users} usuarios · ${result.stats.tracks} canciones · ${result.stats.playlists} playlists`;
 $('#admin-tracks').innerHTML=result.tracks.map(t=>`<div class="admin-track"><span>${escapeHTML(t.title)}<small>${escapeHTML(t.artist)}</small></span><button data-edit="${escapeHTML(t.id)}">Editar</button><button data-visibility="${escapeHTML(t.id)}" data-visible="${t.visible?0:1}">${t.visible?'Ocultar':'Mostrar'}</button></div>`).join('');
 $('#admin-tracks').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{const t=result.tracks.find(t=>t.id===b.dataset.edit);for(const key of ['id','title','artist','genre']) $('#admin-form').elements[key].value=t[key];$('#admin-form').scrollIntoView({behavior:'smooth'});});
 $('#admin-tracks').querySelectorAll('[data-visibility]').forEach(b=>b.onclick=async()=>{b.disabled=true;try{await api('admin/visibility',{id:b.dataset.visibility,visible:b.dataset.visible==='1'});await loadAdmin();await loadLibrary();await navigate('home');}catch(e){$('#admin-error').textContent=e.message;}finally{b.disabled=false;}});
}
adminButton.onclick=async()=>{try{await loadAdmin();$('#admin-dialog').showModal();}catch(e){toast(e.message);}};
$('#close-admin').onclick=()=>$('#admin-dialog').close();
$('#admin-form').onsubmit=async e=>{e.preventDefault();e.submitter.disabled=true;$('#admin-error').textContent='';try{await api('admin/tracks',Object.fromEntries(new FormData(e.target)));e.target.reset();await loadAdmin();await loadLibrary();await navigate('home');toast('Catálogo actualizado');}catch(err){$('#admin-error').textContent=err.message;}finally{e.submitter.disabled=false;}};
api('session').then(result=>{setSession(result);return loadLibrary();}).then(() => { navigate('home'); queue = [...library.tracks]; renderQueue(); }).catch(e => { $('#empty').hidden = false; $('#empty').textContent = 'No se pudo conectar con el servidor. Revisa MySQL y la configuración de .env.'; toast(e.message); });
