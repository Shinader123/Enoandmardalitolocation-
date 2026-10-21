import {
  login,
  logout,
  getUser,
  handleAuthCallback,
  acceptInvite,
  updateUser,
  AuthError,
  MissingIdentityError,
} from 'https://esm.sh/@netlify/identity@2.0.0';

const $ = (id) => document.getElementById(id);
const STATUT_LABEL = { en_attente: 'An atant', approuve: 'Apwouve', annule: 'Anile' };

let cars = [], busy = [], currentMonth = new Date(), selectedCar = 'all';
let adminData = { reservations: [], items: [], payments: [] };
let inviteToken = null;

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function money(n) { return '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(n) || 0); }
function toast(s) { const t = $('toast'); t.textContent = s; t.classList.remove('hidden'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add('hidden'), 4200); }
function dateISO(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function rentalDays(start, end) { return Math.max(1, Math.round((Date.parse(end) - Date.parse(start)) / 86400000)); }

async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) }, credentials: 'same-origin' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Gen yon erè. Eseye ankò.'), { status: res.status });
  return data;
}

/* ---------- Public site ---------- */

async function loadPublic() {
  try {
    [cars, busy] = await Promise.all([api('/api/items'), api('/api/availability')]);
  } catch (e) {
    $('fleet').innerHTML = '<div class="empty"><h3>Nou pa ka chaje machin yo kounye a.</h3><p>Rafrechi paj la oswa eseye pita.</p></div>';
    return;
  }
  renderCars();
  api('/api/payment-methods').then(renderPayments).catch(() => { $('payList').innerHTML = ''; });
}

function renderCars() {
  $('fleet').innerHTML = cars.length ? cars.map((c) => `<article class="carcard"><div class="carphoto"><small>Disponib</small><span>🚙</span></div><div class="carbody"><h3>${esc(c.titre)}</h3><div class="muted small">${esc(c.description || 'Kontakte nou pou plis detay')}</div><div class="carcontact">${c.adresse ? `<span>📍 ${esc(c.adresse)}</span>` : ''}${c.whatsapp ? `<a href="https://wa.me/${esc(c.whatsapp.replace(/\D/g, ''))}" target="_blank" rel="noopener">WhatsApp</a>` : ''}${c.emailContact ? `<a href="mailto:${esc(c.emailContact)}">${esc(c.emailContact)}</a>` : ''}</div><div class="specs"><span>✓ Rezèvasyon sou demann</span></div><div class="carbottom"><div class="price">${money(c.prixParJour)} <small>/ jou</small></div><button class="btn dark" data-choose="${c.id}">Rezève →</button></div></div></article>`).join('') : '<div class="empty"><h3>Pa gen machin disponib pou kounye a.</h3><p>Tanpri tounen pita.</p></div>';
  const sel = $('bcar'), old = sel.value;
  sel.innerHTML = '<option value="">Chwazi yon machin</option>' + cars.map((c) => `<option value="${c.id}">${esc(c.titre)} — ${money(c.prixParJour)} / jou</option>`).join('');
  if (cars.some((c) => String(c.id) === old)) sel.value = old;
  updateEstimate();
  renderCalendar();
}

function renderPayments(list) {
  $('payList').innerHTML = list.map((p) => `<div class="payitem"><strong>${esc(p.nomMethode)}</strong>${esc(p.instructions || '')}</div>`).join('');
  renderPayments.list = list;
}

function updateEstimate() {
  const car = cars.find((c) => String(c.id) === $('bcar').value), start = $('bstart').value, end = $('bend').value;
  if (!car || !start || !end || end < start) { $('estimate').textContent = '—'; return; }
  const days = rentalDays(start, end);
  $('estimate').textContent = `${money(days * Number(car.prixParJour))} (${days} jou × ${money(car.prixParJour)})`;
}

$('fleet').addEventListener('click', (e) => {
  const b = e.target.closest('[data-choose]');
  if (!b) return;
  $('bcar').value = b.dataset.choose;
  selectedCar = b.dataset.choose;
  updateEstimate(); renderCalendar();
  $('rezèvasyon').scrollIntoView({ behavior: 'smooth' });
});

function resetDateMins() { $('bstart').min = dateISO(new Date()); $('bend').min = dateISO(new Date()); }
resetDateMins();
$('bstart').addEventListener('change', () => { $('bend').min = $('bstart').value; if ($('bend').value && $('bend').value < $('bstart').value) $('bend').value = $('bstart').value; updateEstimate(); renderCalendar(); });
$('bend').addEventListener('change', () => { updateEstimate(); renderCalendar(); });
$('bcar').addEventListener('change', () => { selectedCar = $('bcar').value || 'all'; updateEstimate(); renderCalendar(); });

$('bookingForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const start = $('bstart').value, end = $('bend').value, car = $('bcar').value;
  if (!car) { toast('Tanpri chwazi yon machin.'); return; }
  if (end < start) { toast('Dat remèt la dwe menm jou oswa apre dat ou pran machin nan.'); return; }
  const btn = $('bookBtn'); btn.disabled = true; btn.textContent = 'Ap voye…';
  try {
    const r = await api('/api/reservations', { method: 'POST', body: JSON.stringify({ item_id: Number(car), prenom: $('bprenom').value, nom: $('bnom').value, email: $('bemail').value, telephone: $('bphone').value, date_debut: start, date_fin: end }) });
    e.target.reset(); resetDateMins(); selectedCar = 'all'; updateEstimate(); renderCalendar();
    const pays = (renderPayments.list || []).map((p) => `<li><strong>${esc(p.nomMethode)}:</strong> ${esc(p.instructions || '')}</li>`).join('');
    $('bookingResult').innerHTML = `<div class="success"><strong>✓ Demann ou an resevwa! Nimewo rezèvasyon: #${esc(r.id)}</strong><br>${esc(r.titre)} · ${esc(r.dateDebut)} → ${esc(r.dateFin)} · ${r.jours} jou · Total estime: <strong>${money(r.prixTotal)}</strong><br>Eno Location ap kontakte w pou konfime. Apre konfimasyon, ou ka peye avèk youn nan opsyon sa yo:${pays ? `<ul class="small">${pays}</ul>` : ''}</div>`;
    toast('Demann lan voye. N ap kontakte w byento.');
  } catch (err) {
    toast(err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Voye demann rezèvasyon →';
  }
});

function renderCalendar() {
  const y = currentMonth.getFullYear(), m = currentMonth.getMonth();
  $('monthLabel').textContent = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(currentMonth);
  let html = ['Dim', 'Lun', 'Mar', 'Mèk', 'Jedi', 'Vand', 'Sam'].map((x) => `<div class="dayname">${x}</div>`).join('');
  const offset = new Date(y, m, 1).getDay();
  for (let i = 0; i < offset; i++) html += '<div></div>';
  const days = new Date(y, m + 1, 0).getDate(), today = dateISO(new Date());
  for (let d = 1; d <= days; d++) {
    const ds = dateISO(new Date(y, m, d));
    const isBusy = busy.some((b) => (selectedCar === 'all' || String(b.itemId) === selectedCar) && ds >= b.dateDebut && ds <= b.dateFin);
    html += `<div class="day ${isBusy ? 'busy' : ''} ${ds < today ? 'past' : ''} ${ds === today ? 'today' : ''}" title="${isBusy ? 'Deja rezève' : ''}">${d}</div>`;
  }
  $('calendarDays').innerHTML = html;
}
$('prevMonth').onclick = () => { currentMonth.setMonth(currentMonth.getMonth() - 1); renderCalendar(); };
$('nextMonth').onclick = () => { currentMonth.setMonth(currentMonth.getMonth() + 1); renderCalendar(); };

/* ---------- Admin (Netlify Identity) ---------- */

function showAdmin(view) {
  $('adminLogin').classList.toggle('hidden', view !== 'login');
  $('setPassword').classList.toggle('hidden', view !== 'password');
  $('adminPanel').classList.toggle('hidden', view !== 'panel');
}

async function enterAdmin(user) {
  if (!user) { showAdmin('login'); return; }
  if (!user.roles?.includes('admin')) {
    showAdmin('login');
    toast('Kont sa a pa gen dwa administratè.');
    return;
  }
  showAdmin('panel');
  await loadAdmin();
}

async function loadAdmin() {
  try {
    const [reservations, items, payments] = await Promise.all([api('/api/admin/reservations'), api('/api/admin/items'), api('/api/admin/payment-methods')]);
    adminData = { reservations, items, payments };
    renderAdmin();
  } catch (err) {
    if (err.status === 401 || err.status === 403) { showAdmin('login'); }
    toast(err.message);
  }
}

function renderAdmin() {
  const { reservations, items, payments } = adminData;
  $('bookingAdmin').innerHTML = reservations.length ? reservations.map((r) => `<div class="adminitem"><div><strong>#${r.id} · ${esc(r.prenom)} ${esc(r.nom)} · ${esc(r.titre || 'Machin retire')}</strong><span class="small muted">${esc(r.email)}${r.telephone ? ' · ' + esc(r.telephone) : ''} · ${esc(r.dateDebut)} → ${esc(r.dateFin)} · ${money(r.prixTotal)}</span><div class="small" style="margin-top:4px"><span class="badge ${esc(r.statut)}">${esc(STATUT_LABEL[r.statut] || r.statut)}</span></div></div><div><button class="pill" data-res="${r.id}" data-statut="approuve">Apwouve</button> <button class="pill" data-res="${r.id}" data-statut="en_attente">An atant</button> <button class="pill danger" data-res="${r.id}" data-statut="annule">Anile</button></div></div>`).join('') : '<div class="empty">Pa gen rezèvasyon pou kounye a.</div>';
  $('carAdmin').innerHTML = items.map((c) => `<div class="adminitem"><div><strong>${esc(c.titre)}</strong><span class="small muted">${money(c.prixParJour)} / jou · ${c.disponible ? 'Disponib' : 'Kache'}</span></div><div><button class="pill" data-car="${c.id}" data-act="toggle">${c.disponible ? 'Kache' : 'Aktive'}</button> <button class="pill" data-car="${c.id}" data-act="price">Chanje pri</button></div></div>`).join('');
  $('payAdmin').innerHTML = payments.map((p) => `<div class="adminitem"><div><strong>${esc(p.nomMethode)}</strong><span class="small muted">${esc(p.instructions || '')} · ${p.estActif ? 'Aktif' : 'Dezaktive'}</span></div><div><button class="pill" data-pay="${p.id}" data-act="toggle">${p.estActif ? 'Dezaktive' : 'Aktive'}</button> <button class="pill" data-pay="${p.id}" data-act="edit">Chanje enstriksyon</button></div></div>`).join('');
}

async function adminAction(fn, msg) {
  try { await fn(); await loadAdmin(); await loadPublic(); if (msg) toast(msg); } catch (err) { toast(err.message); }
}

$('adminPanel').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.res) {
    adminAction(() => api(`/api/admin/reservations/${b.dataset.res}`, { method: 'PATCH', body: JSON.stringify({ statut: b.dataset.statut }) }), 'Estati rezèvasyon an chanje.');
  } else if (b.dataset.car) {
    const c = adminData.items.find((x) => String(x.id) === b.dataset.car);
    if (!c) return;
    if (b.dataset.act === 'toggle') {
      adminAction(() => api(`/api/admin/items/${c.id}`, { method: 'PATCH', body: JSON.stringify({ disponible: !c.disponible }) }));
    } else {
      const p = prompt('Nouvo pri pa jou ($):', c.prixParJour);
      if (p === null) return;
      adminAction(() => api(`/api/admin/items/${c.id}`, { method: 'PATCH', body: JSON.stringify({ prixParJour: p }) }), 'Pri a chanje.');
    }
  } else if (b.dataset.pay) {
    const p = adminData.payments.find((x) => String(x.id) === b.dataset.pay);
    if (!p) return;
    if (b.dataset.act === 'toggle') {
      adminAction(() => api(`/api/admin/payment-methods/${p.id}`, { method: 'PATCH', body: JSON.stringify({ estActif: !p.estActif }) }));
    } else {
      const ins = prompt(`Enstriksyon pou ${p.nomMethode}:`, p.instructions || '');
      if (ins === null) return;
      adminAction(() => api(`/api/admin/payment-methods/${p.id}`, { method: 'PATCH', body: JSON.stringify({ instructions: ins }) }), 'Enstriksyon yo chanje.');
    }
  }
});

$('addCarBtn').onclick = () => {
  const titre = prompt('Non oswa modèl machin nan:');
  if (!titre || !titre.trim()) return;
  const prix = prompt('Pri pou chak jou ($):', '80');
  if (prix === null) return;
  const description = prompt('Ti deskripsyon:', '') || '';
  const first = adminData.items[0] || {};
  adminAction(() => api('/api/admin/items', { method: 'POST', body: JSON.stringify({ titre, prixParJour: prix, description, whatsapp: first.whatsapp, emailContact: first.emailContact, adresse: first.adresse }) }), 'Machin ajoute.');
};

$('exportBtn').onclick = () => {
  const rows = [['ID', 'Prenon', 'Non', 'Imèl', 'Telefòn', 'Machin', 'Dat kòmanse', 'Dat fini', 'Total', 'Estati', 'Kreye'], ...adminData.reservations.map((r) => [r.id, r.prenom, r.nom, r.email, r.telephone, r.titre, r.dateDebut, r.dateFin, r.prixTotal, STATUT_LABEL[r.statut] || r.statut, r.createdAt])];
  const csv = rows.map((r) => r.map((x) => '"' + String(x ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }));
  a.download = 'eno-location-rezèvasyon.csv';
  a.click();
  URL.revokeObjectURL(a.href);
};

function authMessage(err) {
  if (err instanceof MissingIdentityError) return 'Sèvis koneksyon an pa disponib kounye a.';
  if (err instanceof AuthError) return err.status === 401 ? 'Imèl oswa modpas la pa kòrèk.' : err.message;
  return 'Gen yon erè. Eseye ankò.';
}

$('adminLogin').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const user = await login($('adminEmail').value.trim(), $('adminPass').value);
    $('adminPass').value = '';
    await enterAdmin(user);
  } catch (err) { toast(authMessage(err)); }
});

$('setPassword').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    const password = $('newPass').value;
    const user = inviteToken ? await acceptInvite(inviteToken, password) : await updateUser({ password });
    inviteToken = null; $('newPass').value = '';
    toast('Modpas la anrejistre.');
    await enterAdmin(user);
  } catch (err) { toast(authMessage(err)); }
});

$('logoutBtn').onclick = async () => {
  try { await logout(); } catch {}
  adminData = { reservations: [], items: [], payments: [] };
  showAdmin('login');
};

async function initAuth() {
  try {
    const result = await handleAuthCallback();
    if (result?.type === 'invite') { inviteToken = result.token; showAdmin('password'); $('admin').scrollIntoView(); return; }
    if (result?.type === 'recovery') { showAdmin('password'); $('admin').scrollIntoView(); return; }
  } catch (err) { toast(authMessage(err)); }
  const user = await getUser();
  if (user) await enterAdmin(user);
}

loadPublic();
initAuth();
