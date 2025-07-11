// === NEURONA Trade AI — MONOLITH JS ===

/* === Конфиг (API endpoints) === */
const ENDPOINTS = {
  OPENAI:         '/api/openai',
  ALL:            '/api/all',
  NEWS:           '/api/news',
  CMC:            '/api/cmc',
  CRYPTOPANIC:    '/api/cryptopanic',
  COINGECKO:      '/api/coingecko',
  BINANCE:        '/api/binance',
};
const SYMBOLS_TO_WATCH = ['BTC','ETH','BNB','XRP','SOL'];
const NOTIF_PERCENT_LEVELS = [1,2,3,4,5,6,7,8,9,10];
let lastPrices = {}, lastNewsIds = [], notifInterval = null;

/* === Локализация === */
const langs = [
  {code:'ru',name:'Русский'},{code:'en',name:'English'},{code:'ua',name:'Українська'},
  {code:'es',name:'Español'},{code:'de',name:'Deutsch'},{code:'fr',name:'Français'},
  {code:'it',name:'Italiano'},{code:'pl',name:'Polski'},{code:'tr',name:'Türkçe'},{code:'zh',name:'中文'}
];
const i18n = {
  en:{ph:"Type a message...",send:"Send",notifOn:"Notifications enabled! Now you will receive signals and news.",notifOff:"Notifications disabled.",notifAllow:"Allow notifications in your browser!",notifError:"Notification permission denied.", news:"Crypto News", signals:"Trading Signals", ai:"AI Assistant", menu_profile:"My profile", menu_sub:"Subscription", menu_settings:"Settings", menu_notif:"Notifications", menu_theme:"Theme", menu_lang:"Language", save:"Save changes", popupNotifOn:"Notifications enabled! Now you will receive trading signals and news.", popupNotifOff:"Notifications disabled."},
  ru:{ph:"Напишите сообщение...",send:"Отправить",notifOn:"Уведомления включены! Теперь вы будете получать сигналы и новости.",notifOff:"Уведомления выключены.",notifAllow:"Разрешите уведомления в браузере!",notifError:"Нет доступа к уведомлениям.", news:"Крипто-Новости", signals:"Торговые сигналы", ai:"AI Ассистент", menu_profile:"Мой профиль", menu_sub:"Подписка", menu_settings:"Настройки", menu_notif:"Уведомления", menu_theme:"Тема", menu_lang:"Язык", save:"Сохранить изменения", popupNotifOn:"Уведомления включены! Вы будете получать сигналы и новости.", popupNotifOff:"Уведомления выключены."},
  ua:{ph:"Введіть повідомлення...",send:"Надіслати",notifOn:"Сповіщення увімкнено! Тепер ви будете отримувати сигнали і новини.",notifOff:"Сповіщення вимкнено.",notifAllow:"Дозвольте сповіщення в браузері!",notifError:"Немає доступу до сповіщень.", news:"Крипто-Новини", signals:"Трейдинг сигнали", ai:"AI Асистент", menu_profile:"Мій профіль", menu_sub:"Підписка", menu_settings:"Налаштування", menu_notif:"Сповіщення", menu_theme:"Тема", menu_lang:"Мова", save:"Зберегти зміни", popupNotifOn:"Сповіщення увімкнено! Ви будете отримувати сигнали і новини.", popupNotifOff:"Сповіщення вимкнено."},
};
/* === State === */
let lang = localStorage.getItem('neurona_lang') || navigator.language.slice(0,2); if(!i18n[lang]) lang='en';
let currAiVersion = "neurona1"; // "neurona1" (AI) | "tradeai"
let settingsBuffer = {
  theme: localStorage.getItem('neurona_theme') === 'dark',
  notif: localStorage.getItem('neurona_notif') === 'on',
  lang: lang
};
let lastSavedSettings = {...settingsBuffer};

/* === DOM === */
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const msgsContainer = document.getElementById('messages');
const scrollDownBtn = document.getElementById('scroll-down');
const aiVersionBtn = document.getElementById('aiVersionBtn');
const aiVersionPopup = document.getElementById('aiVersionPopup');
const aiVersionArrow = document.getElementById('aiVersionArrow');
const aiVersionSelector = document.getElementById('aiVersionSelector');
const notifPopup = document.getElementById('notifPopup');
const notifPopupMsg = document.getElementById('notifPopupMsg');

/* === Вспомогательные функции для UI/локализации === */
function updateI18n() {
  input.placeholder = i18n[settingsBuffer.lang].ph;
  sendBtn.textContent = i18n[settingsBuffer.lang].send;
  // Side menu
  document.querySelector('[data-menu=profile] .menu-text').textContent = i18n[settingsBuffer.lang].menu_profile;
  document.querySelector('[data-menu=subscription] .menu-text').textContent = i18n[settingsBuffer.lang].menu_sub;
  document.getElementById('settingsBtn').querySelector('.menu-text').textContent = i18n[settingsBuffer.lang].menu_settings;
  document.querySelectorAll('.side-switch-row')[0].querySelector('.menu-text').textContent = i18n[settingsBuffer.lang].menu_notif;
  document.querySelectorAll('.side-switch-row')[1].querySelector('.menu-text').textContent = i18n[settingsBuffer.lang].menu_theme;
  document.querySelectorAll('.side-switch-row')[2].querySelector('.menu-text').textContent = i18n[settingsBuffer.lang].menu_lang;
  document.getElementById('saveSettingsBtn').textContent = i18n[settingsBuffer.lang].save;
}
function updateLangName(){
  let found = langs.find(l=>l.code===settingsBuffer.lang);
  document.getElementById('currLangName').textContent = found ? found.name : settingsBuffer.lang;
  document.getElementById('currLangGray').textContent = `(${settingsBuffer.lang})`;
}
function setTheme(dark){
  document.body.classList.toggle('dark',dark);
  document.getElementById('mainLogo').style.filter = dark ? "invert(1)" : "";
}
function setNotif(on){ document.getElementById('notifSwitch').classList.toggle('on',on); }
function showNotifPopup(text, err) {
  notifPopupMsg.textContent = text;
  notifPopup.style.background = err ? "#f33" : "#0e0";
  notifPopup.classList.add('show');
  setTimeout(()=>notifPopup.classList.remove('show'), err ? 2600 : 1700);
}
function renderLangList(){
  let langList = document.getElementById('langList');
  langList.innerHTML = '';
  langs.forEach(l=>{
    const li = document.createElement('div');
    li.className = 'side-lang-item' + (l.code===settingsBuffer.lang?' active':'');
    li.textContent = l.name;
    li.onclick = ()=>{ settingsBuffer.lang = l.code; updateLangName(); updateI18n(); showSaveBtnIfChanged(); langList.classList.remove('show'); };
    langList.appendChild(li);
  });
}
function showSaveBtnIfChanged() {
  let btn = document.getElementById('saveSettingsBtn');
  if (settingsBuffer.theme !== lastSavedSettings.theme ||
      settingsBuffer.notif !== lastSavedSettings.notif ||
      settingsBuffer.lang !== lastSavedSettings.lang) {
    btn.classList.remove('hide'); btn.style.display = ''; setTimeout(()=>btn.style.opacity='1',10);
  } else { btn.style.opacity = "0"; setTimeout(()=>{btn.classList.add('hide');}, 320);}
}

/* === МЕНЮ, НАСТРОЙКИ, ЯЗЫК === */
document.getElementById('burgerBtn').onclick = ()=>{ sideMenu.classList.add('active'); sideMenuBg.classList.add('active'); }
document.getElementById('sideCloseBtn').onclick = ()=>{ sideMenu.classList.remove('active'); sideMenuBg.classList.remove('active'); }
document.getElementById('sideMenuBg').onclick = ()=>{ sideMenu.classList.remove('active'); sideMenuBg.classList.remove('active'); }
document.getElementById('settingsBtn').onclick = function() {
  settingsGroup.classList.toggle('open');
  this.querySelector('.side-arrow').style.transform = settingsGroup.classList.contains('open') ? "rotate(180deg)" : "";
  if(!settingsGroup.classList.contains('open')) { langList.classList.remove('show'); langArrow.classList.remove('open'); }
};
document.getElementById('themeSwitch').onclick = ()=>{ settingsBuffer.theme = !settingsBuffer.theme; setTheme(settingsBuffer.theme); showSaveBtnIfChanged(); }
document.getElementById('notifSwitch').onclick = ()=>{ settingsBuffer.notif = !settingsBuffer.notif; setNotif(settingsBuffer.notif); showSaveBtnIfChanged(); }
document.getElementById('langRow').onclick = (e)=>{ renderLangList(); langList.classList.toggle('show'); langArrow.classList.toggle('open', langList.classList.contains('show')); e.stopPropagation(); }
document.getElementById('saveSettingsBtn').onclick = ()=>{
  localStorage.setItem('neurona_theme', settingsBuffer.theme ? 'dark' : 'light');
  localStorage.setItem('neurona_notif', settingsBuffer.notif ? 'on' : 'off');
  localStorage.setItem('neurona_lang', settingsBuffer.lang);
  lastSavedSettings = {...settingsBuffer};
  updateI18n();
  setTheme(settingsBuffer.theme);
  showNotifPopup(settingsBuffer.notif ? i18n[settingsBuffer.lang].popupNotifOn : i18n[settingsBuffer.lang].popupNotifOff);
  if (settingsBuffer.notif) startNotifAutoPush();
  else if (notifInterval) clearInterval(notifInterval);
};

/* === Переключатель версий (AI/TRADE) === */
function switchUiMode(ver){
  currAiVersion = ver;
  // AI режим (чат)
  if (currAiVersion === 'neurona1') {
    document.querySelector('.chat-container').style.display = '';
    document.getElementById('tradeSignalsView')?.remove();
    document.getElementById('mainTitle').textContent = "NEURONA";
  }
  // Trade режим (сигналы+новости)
  if (currAiVersion === 'tradeai') {
    document.querySelector('.chat-container').style.display = 'none';
    if (!document.getElementById('tradeSignalsView')) {
      let view = document.createElement('div');
      view.id = 'tradeSignalsView';
      view.style = "width:100%;max-width:360px;margin:0 auto;";
      view.innerHTML = `
      <div style="background:rgba(255,255,255,0.96);border-radius:14px;border:1.6px solid #d1d1d1;box-shadow:0 7px 36px 0 rgba(30,40,80,0.19),0 2.5px 10px 0 rgba(50,50,90,0.14);padding:15px 0 7px 0;margin-bottom:12px;">
        <div style="font-size:1.19em;font-weight:bold;text-align:center;margin-bottom:7px">${i18n[settingsBuffer.lang].signals}</div>
        <div id="signalsBox" style="padding:7px 12px 14px 12px;min-height:57px;"></div>
        <div style="font-size:1.12em;font-weight:bold;text-align:center;margin:17px 0 7px 0;">${i18n[settingsBuffer.lang].news}</div>
        <div id="newsBox" style="padding:7px 12px 17px 12px;min-height:57px;max-height:210px;overflow-y:auto;"></div>
        <button id="refreshTradeView" style="margin:0 auto 0 auto;display:block;background:#444;color:#fff;padding:8px 16px;border-radius:7px;border:none;cursor:pointer;font-weight:bold;">⟳ ${i18n[settingsBuffer.lang].save}</button>
      </div>
      `;
      document.getElementById('app').appendChild(view);
      document.getElementById('refreshTradeView').onclick = updateTradeView;
    }
    document.getElementById('mainTitle').textContent = "TRADE AI";
    updateTradeView();
  }
}
aiVersionBtn.onclick = function(e) {
  e.stopPropagation();
  aiVersionPopup.classList.toggle('show');
  aiVersionArrow.style.transform = aiVersionPopup.classList.contains('show') ? "rotate(180deg)" : "";
};
aiVersionPopup.querySelectorAll('.ai-version-item').forEach(item => {
  item.onclick = function() {
    aiVersionPopup.querySelectorAll('.ai-version-item').forEach(i=>i.classList.remove('active'));
    item.classList.add('active');
    switchUiMode(item.getAttribute('data-value'));
    aiVersionPopup.classList.remove('show');
    aiVersionArrow.style.transform = "";
  };
});
document.body.addEventListener('click', function(e) {
  if (!aiVersionSelector.contains(e.target)) aiVersionPopup.classList.remove('show');
  aiVersionArrow.style.transform = "";
});

/* === Trade Signals/News (tradeai view) === */
async function updateTradeView(){
  // Получаем сигналы
  let signalsBox = document.getElementById('signalsBox');
  let newsBox = document.getElementById('newsBox');
  signalsBox.innerHTML = "<span style='color:#666'>Загрузка...</span>";
  newsBox.innerHTML = "<span style='color:#666'>Загрузка...</span>";
  try {
    let all = await fetch(ENDPOINTS.ALL + "?t=" + Date.now()).then(r=>r.json());
    let sig = all.signals || [];
    let sigHtml = sig.length
      ? "<ol style='margin-left:17px'>" + sig.map(s=>`<li style="margin-bottom:8px"><b>${s.type} ${s.symbol}</b> ${s.price ? ('<b>@'+s.price+'</b>') : ''}<br><i>${s.reason||''}</i>${s.time?('<span style="color:#888;font-size:.91em;margin-left:9px;">('+s.time+')</span>'):''}</li>`).join('') + "</ol>"
      : "<span style='color:#888'>Нет сигналов</span>";
    signalsBox.innerHTML = sigHtml;
    // Новости
    let news = all.news || [];
    let newsHtml = news.length
      ? "<ol style='margin-left:17px'>" + news.map(n=>`<li style="margin-bottom:7px"><b>${n.title||''}</b> ${n.url?`<a href="${n.url}" target="_blank" style="color:#277be4;font-size:.97em">[Источник]</a>`:""}${n.time?('<span style="color:#888;font-size:.91em;margin-left:9px;">('+n.time+')</span>'):''}<br><i>${n.impact||''}</i></li>`).join('') + "</ol>"
      : "<span style='color:#888'>Нет новостей</span>";
    newsBox.innerHTML = newsHtml;
  } catch(e){
    signalsBox.innerHTML = "<span style='color:#f33'>Ошибка загрузки сигналов!</span>";
    newsBox.innerHTML = "<span style='color:#f33'>Ошибка загрузки новостей!</span>";
  }
}

/* === ЧАТ AI — основное окно === */
let messages = [], botIsTyping = false;
function saveHistory(){ localStorage.setItem('neurona_history', JSON.stringify(messages)); }
function loadHistory(){
  const h = JSON.parse(localStorage.getItem('neurona_history')||'[]');
  if(h.length){
    messages=h; msgsContainer.innerHTML = '';
    h.forEach(m=> addMessage(m.content,m.role,m.time));
    scrollChatToBottom(true);
  }
}
function addMessage(text, who, time){
  if (!time) time = new Date().toLocaleTimeString().slice(0,5);
  const msg = document.createElement('div');
  msg.className = `message ${who}`;
  const content = document.createElement('div');
  content.className = 'msg-content';
  content.innerHTML = who === "bot" ? formatBotMessage(text) : text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>');
  msg.appendChild(content);
  const timeEl = document.createElement('span');
  timeEl.className = 'msg-time'; timeEl.textContent = time;
  msg.appendChild(timeEl);
  msgsContainer.appendChild(msg);
  setTimeout(()=>{timeEl.style.display='inline'}, 80);
  scrollChatToBottom(true);
}
function formatBotMessage(text){
  text = text.replace(/\n/g, '<br>').replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  return text;
}
function addTyping(){
  const d = document.createElement('div');
  d.className = 'message bot typing';
  d.innerHTML = `<span class="typing-dots"><span class="tdot tdot1"></span><span class="tdot tdot2"></span><span class="tdot tdot3"></span></span>`;
  msgsContainer.appendChild(d); scrollChatToBottom(true, true); return d;
}
function scrollChatToBottom(smooth){ msgsContainer.scrollTo({top: msgsContainer.scrollHeight, behavior: smooth?'smooth':'auto'});}
sendBtn.onclick = async ()=>{
  const txt = input.value.trim();
  if(!txt) return;
  const nowTime = new Date().toLocaleTimeString().slice(0,5);
  addMessage(txt,'user',nowTime);
  input.value=''; messages.push({ role:'user', content:txt, time: nowTime });
  const typing = addTyping(); botIsTyping = true;
  // Генерация ответа через AI
  let safeMessages = messages; if (safeMessages.length > 14) safeMessages = safeMessages.slice(-14);
  const payload = { model:'gpt-4o', messages:[{role:'system',content:'Ты — NEURONA, персональный AI.'},...safeMessages], temperature:1.11, user:"neurona-user" };
  try {
    const resp = await fetch(ENDPOINTS.OPENAI, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload) });
    const data = await resp.json();
    typing.remove(); botIsTyping = false;
    let reply = data.choices?.[0]?.message?.content || (data.error ? ('[OpenAI Error]: ' + data.error) : i18n[settingsBuffer.lang].internal);
    addMessage(reply,'bot', new Date().toLocaleTimeString().slice(0,5));
    messages.push({ role:'assistant', content:reply, time: new Date().toLocaleTimeString().slice(0,5) }); saveHistory();
    scrollChatToBottom(true, true);
  } catch {
    typing.remove(); botIsTyping = false;
    addMessage(i18n[settingsBuffer.lang].internal,'bot', new Date().toLocaleTimeString().slice(0,5));
    scrollChatToBottom(true, true);
  }
};
input.addEventListener('keydown', function(e){
  if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendBtn.click(); }
});

/* === Push-уведомления (автомат) === */
async function askNotifPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  let result = await Notification.requestPermission();
  return result === 'granted';
}
function sendLocalNotif(title, body, url) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  navigator.serviceWorker.getRegistration().then(reg => {
    if (reg) reg.showNotification(title, { body: body, icon: 'https://i.ibb.co/XfKRzvcy/27.png', badge: 'https://i.ibb.co/XfKRzvcy/27.png', data: { url: url || '/' } });
    else new Notification(title, { body: body, icon: 'https://i.ibb.co/XfKRzvcy/27.png' });
  });
}
function startNotifAutoPush() {
  if (notifInterval) clearInterval(notifInterval);
  notifInterval = setInterval(() => { checkPricePush(); checkNewsPush(); }, 121000);
  checkPricePush(); checkNewsPush();
}
async function checkPricePush() {
  try {
    let cmcRes = await fetch(ENDPOINTS.CMC); let cmcJson = await cmcRes.json();
    let arr = cmcJson?.data || [], watchArr = arr.filter(c => SYMBOLS_TO_WATCH.includes((c.symbol||"").toUpperCase()));
    for (let c of watchArr) {
      let symbol = c.symbol; let now = c.quote?.USD?.price || 0;
      let old = lastPrices[symbol]?.price || now;
      let percent = ((now-old)/old)*100; let absPercent = Math.abs(percent);
      if (!lastPrices[symbol]) lastPrices[symbol] = { price: now, lastNotifPercents: [] };
      let notifPercents = lastPrices[symbol].lastNotifPercents || [];
      let rounded = Math.round(absPercent);
      if (NOTIF_PERCENT_LEVELS.includes(rounded) && !notifPercents.includes(rounded) && absPercent >= 0.95) {
        let sign = percent > 0 ? '+' : '-';
        let msg = `Цена ${symbol} изменилась на ${sign}${rounded}% (NEURONA)`;
        sendLocalNotif(msg, `Текущая цена: $${now.toLocaleString(undefined, {maximumFractionDigits:5})}`, null);
        notifPercents.push(rounded);
        if (notifPercents.length > 10) notifPercents = notifPercents.slice(-10);
      }
      if (absPercent < 0.95) lastPrices[symbol].lastNotifPercents = [];
      else lastPrices[symbol].lastNotifPercents = notifPercents;
      lastPrices[symbol].price = now;
    }
  } catch(e){}
}
async function checkNewsPush() {
  try {
    let panicRes = await fetch(ENDPOINTS.CRYPTOPANIC); let newsRes = await fetch(ENDPOINTS.NEWS);
    let panicJson = await panicRes.json(); let newsJson = await newsRes.json();
    let allNews = []; if (panicJson.articles) allNews = allNews.concat(panicJson.articles); if (newsJson.articles) allNews = allNews.concat(newsJson.articles);
    allNews.sort((a,b)=>new Date(b.time||b.published_at||0)-new Date(a.time||a.published_at||0));
    let fresh = allNews.filter(n => n.id && !lastNewsIds.includes(n.id)).slice(0,2);
    for (let n of fresh) {
      sendLocalNotif(n.title ? `${n.title} (NEURONA)` : "Свежая крипто-новость (NEURONA)", (n.summary || n.title || '').slice(0,160) + (n.url ? '\n' + n.url : ''), n.url || '/');
      lastNewsIds.push(n.id); if (lastNewsIds.length > 12) lastNewsIds = lastNewsIds.slice(-12);
    }
  } catch(e){}
}
/* === Service worker (обязателен для пушей) === */
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');

/* === Инициализация === */
function appInit() {
  updateI18n(); updateLangName(); renderLangList(); setTheme(settingsBuffer.theme);
  if(settingsBuffer.notif) startNotifAutoPush();
  loadHistory(); // для AI-режима
}
window.addEventListener('DOMContentLoaded', appInit);

// Переключение режима при старте
switchUiMode(currAiVersion);
