// === CANVAS BACKGROUND ===
const canvas = document.getElementById('bg'), ctx = canvas.getContext('2d');
let W, H, nodes;
function resize(){ W=canvas.width=innerWidth; H=canvas.height=innerHeight; }
window.addEventListener('resize', resize);
function init(){
  nodes = Array.from({length:33}).map(_=>({
    x:Math.random()*W, y:Math.random()*H,
    vx:(Math.random()-0.5)*0.6, vy:(Math.random()-0.5)*0.6
  }));
}
function draw(){
  ctx.clearRect(0,0,W,H);
  ctx.lineCap='round'; ctx.lineJoin='round';
  nodes.forEach((a,i)=>{
    nodes.slice(i+1).forEach(b=>{
      const dx=a.x-b.x, dy=a.y-b.y, d=Math.hypot(dx,dy);
      if(d<240){
        ctx.strokeStyle=`rgba(0,0,0,${Math.min(0.46,(240-d)/170)})`;
        ctx.lineWidth=2.1;
        ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
      }
    });
  });
  nodes.forEach(n=>{
    n.x+=n.vx; n.y+=n.vy;
    if(n.x<0||n.x>W) n.vx*=-1;
    if(n.y<0||n.y>H) n.vy*=-1;
    ctx.fillStyle='rgba(0,0,0,0.95)';
    ctx.beginPath(); ctx.arc(n.x,n.y,4.4,0,Math.PI*2); ctx.fill();
  });
  requestAnimationFrame(draw);
}
resize(); init(); draw();

// === I18N & LANGS ===
const langs = [
  {code:'ru',name:'Русский'},
  {code:'en',name:'English'},
  {code:'ua',name:'Українська'},
  {code:'es',name:'Español'},
  {code:'de',name:'Deutsch'},
  {code:'fr',name:'Français'},
  {code:'it',name:'Italiano'},
  {code:'pl',name:'Polski'},
  {code:'tr',name:'Türkçe'},
  {code:'zh',name:'中文'}
];
const i18n = {
  en:{ph:"Type a message...",send:"Send",notifOn:"Notifications enabled! Now you will receive updates about latest news and top crypto prices.", notifOff:"Notifications disabled.", notifAllow:"Allow notifications in your browser!", notifError:"Notification permission denied.", newsPush:"New crypto news!", pricePush:"Crypto price changed!", internal:"Internal error, please try again later."},
  ru:{ph:"Напишите сообщение...",send:"Отправить",notifOn:"Уведомления включены! Теперь вы будете получать уведомления о последних новостях и ценах криптовалют.", notifOff:"Уведомления выключены.", notifAllow:"Разрешите уведомления в браузере!", notifError:"Нет доступа к уведомлениям.", newsPush:"Свежие крипто-новости!", pricePush:"Изменилась цена криптовалют!", internal:"Внутренняя ошибка, попробуйте позже."},
  ua:{ph:"Введіть повідомлення...",send:"Надіслати",notifOn:"Сповіщення увімкнено! Тепер ви будете отримувати сповіщення про останні новини та ціни.", notifOff:"Сповіщення вимкнено.", notifAllow:"Дозвольте сповіщення в браузері!", notifError:"Немає доступу до сповіщень.", newsPush:"Свіжі крипто-новини!", pricePush:"Зміна ціни криптовалют!", internal:"Внутрішня помилка, спробуйте пізніше."},
};
let lang = (localStorage.getItem('neurona_lang')||navigator.language.slice(0,2));
if(!i18n[lang]) lang='en';
let settingsBuffer = {
  theme: localStorage.getItem('neurona_theme') === 'dark',
  notif: localStorage.getItem('neurona_notif') === 'on',
  lang: lang
};
let lastSavedSettings = {...settingsBuffer};

// === DOM ===
const input = document.getElementById('input');
const sendBtn = document.getElementById('send');
const msgsContainer = document.getElementById('messages');
const scrollDownBtn = document.getElementById('scroll-down');
const inputArea = document.querySelector('.input-area');
const sideMenu = document.getElementById('sideMenu');
const sideMenuBg = document.getElementById('sideMenuBg');
const burger = document.getElementById('burgerBtn');
const closeBtn = document.getElementById('sideCloseBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsGroup = document.getElementById('settingsGroup');
const themeSwitch = document.getElementById('themeSwitch');
const notifSwitch = document.getElementById('notifSwitch');
const langRow = document.getElementById('langRow');
const langList = document.getElementById('langList');
const currLangName = document.getElementById('currLangName');
const currLangGray = document.getElementById('currLangGray');
const langArrow = document.getElementById('langArrow');
const mainLogo = document.getElementById('mainLogo');
const loaderLogo = document.getElementById('loaderLogo');
const mainTitle = document.getElementById('mainTitle');
const loaderTitle = document.getElementById('loaderTitle');
const loaderSubtitle = document.getElementById('loaderSubtitle');
const sideMenuList = document.getElementById('sideMenuList');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const notifPopup = document.getElementById('notifPopup');
const notifPopupMsg = document.getElementById('notifPopupMsg');

// === I18N INIT ===
input.placeholder = i18n[settingsBuffer.lang].ph;
sendBtn.textContent = i18n[settingsBuffer.lang].send;
function updateMenuI18n() {
  let menuMap = {
    profile: {ru:"Мой профиль",en:"My profile",ua:"Мій профіль"},
    subscription: {ru:"Подписка",en:"Subscription",ua:"Підписка"},
    settings: {ru:"Настройки",en:"Settings",ua:"Налаштування"},
    notifications: {ru:"Уведомления",en:"Notifications",ua:"Сповіщення"},
    theme: {ru:"Тема",en:"Theme",ua:"Тема"},
    language: {ru:"Язык интерфейса",en:"Language",ua:"Мова"},
    save: {ru:"Сохранить изменения",en:"Save changes",ua:"Зберегти зміни"},
  };
  let curr = settingsBuffer.lang || 'ru';
  sideMenuList.querySelectorAll('[data-menu=profile] .menu-text').forEach(el=>el.textContent=menuMap.profile[curr]||menuMap.profile['ru']);
  sideMenuList.querySelectorAll('[data-menu=subscription] .menu-text').forEach(el=>el.textContent=menuMap.subscription[curr]||menuMap.subscription['ru']);
  settingsBtn.querySelector('.menu-text').textContent = menuMap.settings[curr]||menuMap.settings['ru'];
  settingsGroup.querySelectorAll('.side-switch-row')[0].querySelector('.menu-text').textContent = menuMap.notifications[curr]||menuMap.notifications['ru'];
  settingsGroup.querySelectorAll('.side-switch-row')[1].querySelector('.menu-text').textContent = menuMap.theme[curr]||menuMap.theme['ru'];
  settingsGroup.querySelectorAll('.side-switch-row')[2].querySelector('.menu-text').textContent = menuMap.language[curr]||menuMap.language['ru'];
  saveSettingsBtn.textContent = menuMap.save[curr]||menuMap.save['ru'];
}
function updateLangName(){
  let found = langs.find(l=>l.code===settingsBuffer.lang);
  currLangName.textContent = found ? found.name : settingsBuffer.lang;
  currLangGray.textContent = `(${settingsBuffer.lang})`;
}
updateLangName();

// === THEME, SETTINGS, LANG ===
function setTheme(dark, fast){
  document.body.classList.toggle('dark',dark);
  mainLogo.style.filter = dark ? "invert(1)" : "";
  loaderLogo.style.filter = dark ? "invert(1)" : "";
  mainTitle.style.color = dark ? "#fff" : "#000";
  loaderTitle.style.color = dark ? "#fff" : "#000";
  loaderSubtitle.style.color = dark ? "#fff" : "#222";
  Array.from(burger.children).forEach(span=>span.style.background=dark?'#fff':'#000');
  themeSwitch.classList.toggle('on',dark);
  if(fast){
    document.body.style.transition = "none";
    mainLogo.style.transition = "none";
    loaderLogo.style.transition = "none";
    mainTitle.style.transition = "none";
    loaderTitle.style.transition = "none";
    loaderSubtitle.style.transition = "none";
  } else {
    document.body.style.transition = "";
    mainLogo.style.transition = "";
    loaderLogo.style.transition = "";
    mainTitle.style.transition = "";
    loaderTitle.style.transition = "";
    loaderSubtitle.style.transition = "";
  }
}
function setNotif(on){
  notifSwitch.classList.toggle('on',on);
}
function showSaveBtnIfChanged() {
  if (settingsBuffer.theme !== lastSavedSettings.theme ||
      settingsBuffer.notif !== lastSavedSettings.notif ||
      settingsBuffer.lang !== lastSavedSettings.lang) {
    saveSettingsBtn.classList.remove('hide');
    saveSettingsBtn.style.display = '';
    setTimeout(()=>saveSettingsBtn.style.opacity='1',10);
  } else {
    saveSettingsBtn.style.opacity = "0";
    setTimeout(()=>{saveSettingsBtn.classList.add('hide');}, 320);
  }
}
burger.onclick = ()=>{ sideMenu.classList.add('active'); sideMenuBg.classList.add('active'); }
closeBtn.onclick = ()=>{ sideMenu.classList.remove('active'); sideMenuBg.classList.remove('active'); }
sideMenuBg.onclick = ()=>{ sideMenu.classList.remove('active'); sideMenuBg.classList.remove('active'); }
document.addEventListener('keydown', e=>{
  if(e.key==='Escape' && sideMenu.classList.contains('active')) {
    sideMenu.classList.remove('active'); sideMenuBg.classList.remove('active');
  }
});
let settingsOpen = false;
settingsBtn.onclick = function() {
  settingsOpen = !settingsOpen;
  settingsGroup.classList.toggle('open',settingsOpen);
  settingsBtn.querySelector('.side-arrow').style.transform = settingsOpen ? "rotate(180deg)" : "rotate(0deg)";
  if(!settingsOpen) {
    langList.classList.remove('show');
    langArrow.classList.remove('open');
  }
};
themeSwitch.onclick = ()=>{
  settingsBuffer.theme = !settingsBuffer.theme;
  setTheme(settingsBuffer.theme, true);
  showSaveBtnIfChanged();
};
notifSwitch.onclick = ()=>{
  settingsBuffer.notif = !settingsBuffer.notif;
  setNotif(settingsBuffer.notif);
  showSaveBtnIfChanged();
  if (settingsBuffer.notif) {
    if (window.Notification && Notification.permission !== "granted") {
      Notification.requestPermission().then(res=>{
        if (res === "granted") {
          showNotifPopup(i18n[settingsBuffer.lang].notifOn);
        } else {
          settingsBuffer.notif = false;
          setNotif(false);
          showNotifPopup(i18n[settingsBuffer.lang].notifError, true);
        }
      });
    } else if (window.Notification && Notification.permission === "granted") {
      showNotifPopup(i18n[settingsBuffer.lang].notifOn);
    } else {
      showNotifPopup(i18n[settingsBuffer.lang].notifAllow, true);
    }
  } else {
    showNotifPopup(i18n[settingsBuffer.lang].notifOff, true);
  }
};
function renderLangList(){
  langList.innerHTML = '';
  langs.forEach(l=>{
    const li = document.createElement('div');
    li.className = 'side-lang-item' + (l.code===settingsBuffer.lang?' active':'');
    li.textContent = l.name;
    li.onclick = ()=>{
      settingsBuffer.lang = l.code;
      updateLangName();
      input.placeholder = i18n[settingsBuffer.lang].ph;
      sendBtn.textContent = i18n[settingsBuffer.lang].send;
      updateMenuI18n();
      langList.classList.remove('show');
      langArrow.classList.remove('open');
      showSaveBtnIfChanged();
    };
    langList.appendChild(li);
  });
}
renderLangList();
langRow.onclick = (e)=>{
  renderLangList();
  langList.classList.toggle('show');
  langArrow.classList.toggle('open', langList.classList.contains('show'));
  e.stopPropagation();
};
document.body.addEventListener('click', ()=>{ langList.classList.remove('show'); langArrow.classList.remove('open'); });
saveSettingsBtn.onclick = ()=>{
  localStorage.setItem('neurona_theme', settingsBuffer.theme ? 'dark' : 'light');
  localStorage.setItem('neurona_notif', settingsBuffer.notif ? 'on' : 'off');
  localStorage.setItem('neurona_lang', settingsBuffer.lang);
  lastSavedSettings = {...settingsBuffer};
  saveSettingsBtn.style.opacity = "0";
  setTimeout(()=>saveSettingsBtn.classList.add('hide'), 320);
  updateMenuI18n();
  input.placeholder = i18n[settingsBuffer.lang].ph;
  sendBtn.textContent = i18n[settingsBuffer.lang].send;
};
function loadSettings(){
  setTheme(settingsBuffer.theme, true);
  setNotif(settingsBuffer.notif);
  updateLangName();
  renderLangList();
  updateMenuI18n();
  input.placeholder = i18n[settingsBuffer.lang].ph;
  sendBtn.textContent = i18n[settingsBuffer.lang].send;
}
loadSettings();
(function applyThemeOnLoad(){
  let dark = settingsBuffer.theme;
  setTheme(dark, true);
})();

// === LOADER ===
window.addEventListener('DOMContentLoaded', function() {
  const loader = document.getElementById('loader');
  const topBar = document.getElementById('top-bar');
  topBar.classList.add('hide');
  setTimeout(function() {
    loader.classList.add('hide');
    setTimeout(function() {
      document.body.classList.add('shown');
      loader.style.display = 'none';
      topBar.classList.remove('hide');
      loadHistory();
      setTimeout(function() { scrollChatToBottom(true); }, 300);
    }, 1000);
  }, 4000);
});

// === CHAT LOGIC ===
let messages = [], typingProcess = null, botIsTyping = false;
function saveHistory(){ localStorage.setItem('neurona_history', JSON.stringify(messages)); }
function loadHistory(){
  const h = JSON.parse(localStorage.getItem('neurona_history')||'[]');
  if(h.length){
    messages=h;
    msgsContainer.innerHTML = '';
    h.forEach(m=> addMessage(m.content,m.role,m.time));
    scrollChatToBottom(true);
  }
}
function formatBotMessage(text) {
  text = text.replace(/[\u{FE00}-\u{FE0F}]/gu, "");
  text = text.replace(/\uFFFD/g, "");
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g, function(_, name, url) {
    let dark = document.body.classList.contains('dark');
    return `<a href="${url}" target="_blank" style="color:${dark ? '#68a6ff' : '#286be6'};font-size:.98em;"><b>${name}</b></a>`;
  });
  text = text.replace(/\*\*([^\*]+)\*\*/g, '<b>$1</b>');
  text = text.replace(/(^|\n)((?:\d+\.\s.*\n?)+)/gm, (m, p1, block) => {
    const items = block.trim().split(/\n/).filter(Boolean);
    let out = '<ol>';
    for(let i=0; i<items.length; ++i){
      out += `<li>${items[i].replace(/^\d+\.\s?/, '')}</li>`;
    }
    out += '</ol>';
    return p1 + out;
  });
  text = text.replace(/(^|\n)((?:^[-•]\s.+\n?)+)/gm, (m, p1, block) => {
    const items = block.trim().split(/\n/).filter(Boolean);
    let out = '<ul>';
    for(let i=0; i<items.length; ++i){
      out += '<li>' + items[i].replace(/^[-•]\s?/, '').trim() + '</li>';
    }
    out += '</ul>';
    return p1 + out;
  });
  text = text.replace(/\n{2,}/g, '</p><p>');
  text = text.replace(/\n/g, '<br>');
  if (!/^<p>/.test(text)) text = '<p>' + text;
  text = text.replace(/(<ol>|<ul>)/g, '</p>$1<p>');
  text = text.replace(/<\/ol>|<\/ul>/g, '$&<p>');
  text = text.replace(/<p><\/p>/g, '');
  return text;
}
function addMessage(text, who, time){
  if (!time) time = new Date().toLocaleTimeString().slice(0,5);
  const msg = document.createElement('div');
  msg.className = `message ${who}`;
  const content = document.createElement('div');
  content.className = 'msg-content';
  if (who === "bot") {
    content.innerHTML = formatBotMessage(text);
  } else if (who === "user") {
    content.innerHTML = text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank">$1</a>');
  } else {
    content.textContent = text;
  }
  msg.appendChild(content);
  const timeEl = document.createElement('span');
  timeEl.className = 'msg-time';
  timeEl.textContent = time;
  msg.appendChild(timeEl);
  const copyBtn = document.createElement('button');
  copyBtn.className = 'copy-btn';
  copyBtn.innerHTML = '<svg width="18" height="18"><use href="#copy-ico"/></svg>';
  copyBtn.onclick = ()=>{
    navigator.clipboard.writeText(content.textContent||content.innerText);
    showNotifPopup("Скопировано!",false);
  };
  msg.appendChild(copyBtn);
  msgsContainer.appendChild(msg);
  messages.push({content:text,role:who,time});
  saveHistory();
  scrollChatToBottom();
}

function addTyping(){
  if (document.getElementById('typing-msg')) return;
  const msg = document.createElement('div');
  msg.className = 'message bot';
  msg.id = 'typing-msg';
  msg.innerHTML = `<div class="typing-dots">
    <span></span><span></span><span></span>
  </div>`;
  msgsContainer.appendChild(msg);
  scrollChatToBottom();
}
function removeTyping(){
  const el = document.getElementById('typing-msg');
  if(el) el.remove();
}
function scrollChatToBottom(force){
  if(force){ msgsContainer.scrollTop = msgsContainer.scrollHeight; return; }
  const max = msgsContainer.scrollHeight-msgsContainer.clientHeight;
  if (msgsContainer.scrollTop >= max-80) {
    msgsContainer.scrollTop = msgsContainer.scrollHeight;
  } else {
    scrollDownBtn.style.display = '';
    setTimeout(()=>scrollDownBtn.style.opacity='1',30);
  }
}
scrollDownBtn.onclick = function() {
  msgsContainer.scrollTop = msgsContainer.scrollHeight;
  scrollDownBtn.style.opacity = '0';
  setTimeout(()=>scrollDownBtn.style.display='none',220);
};
msgsContainer.addEventListener('scroll', function() {
  const max = msgsContainer.scrollHeight-msgsContainer.clientHeight;
  if (msgsContainer.scrollTop >= max-30) {
    scrollDownBtn.style.opacity = '0';
    setTimeout(()=>scrollDownBtn.style.display='none',220);
  }
});

// === INPUT HANDLING ===
function clearInput(){ input.value = ''; input.style.height = '44px'; }
input.oninput = function() {
  input.style.height = "44px";
  input.style.height = (input.scrollHeight) + "px";
};
input.addEventListener('keydown', function(e){
  if(e.key === "Enter" && !e.shiftKey){
    e.preventDefault();
    sendBtn.click();
  }
});

// === SENDING / AI ===
async function sendMessage(){
  const val = input.value.trim();
  if(!val) return;
  addMessage(val,"user");
  clearInput();
  addTyping();
  botIsTyping = true;
  try {
    // Твой запрос к AI (замени url/headers/тело под свой backend!)
    const resp = await fetch("/api/message",{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({q:val,lang:settingsBuffer.lang})
    });
    const data = await resp.json();
    removeTyping();
    if(data && data.a){
      addMessage(data.a,"bot");
    } else {
      addMessage(i18n[settingsBuffer.lang].internal,"bot");
    }
  } catch(e){
    removeTyping();
    addMessage(i18n[settingsBuffer.lang].internal,"bot");
  }
  botIsTyping = false;
}
sendBtn.onclick = sendMessage;

// === PUSH NOTIFICATIONS ===
function showNotifPopup(msg, error){
  notifPopupMsg.textContent = msg;
  notifPopup.classList.remove('hide','error');
  notifPopup.classList.toggle('error',!!error);
  notifPopup.style.opacity = "1";
  notifPopup.style.display = '';
  setTimeout(()=>notifPopup.style.opacity='0',2000);
  setTimeout(()=>notifPopup.classList.add('hide'),2200);
}
// Пример: Показывать пуш при новых новостях
function notifyNews(msg){
  if (!settingsBuffer.notif) return;
  if (window.Notification && Notification.permission === "granted") {
    new Notification("NEURONA AI", {body:msg, icon:"/neurona-icon-192.png"});
  }
  showNotifPopup(msg,false);
}
// === News auto-update ===
async function updateNewsAndPrices(){
  try {
    const res = await fetch('/api/all');
    const data = await res.json();
    if(data.news && Array.isArray(data.news)){
      // Очистить старые, добавить только новые
      const last = messages.filter(m=>m.role==='news');
      if(!last.length || (last[last.length-1].content!==data.news[data.news.length-1])){
        data.news.forEach((n,i)=>{
          if(i>=last.length) addMessage("📰 " + n,"news");
        });
        notifyNews(i18n[settingsBuffer.lang].newsPush);
      }
    }
    // Можно добавить auto-обновление цен и т.п.
  } catch(e){}
}
setInterval(updateNewsAndPrices, 15000);

// === INIT ALL ===
window.onload = function(){
  loadSettings();
  setTheme(settingsBuffer.theme, true);
  updateMenuI18n();
  input.placeholder = i18n[settingsBuffer.lang].ph;
  sendBtn.textContent = i18n[settingsBuffer.lang].send;
};
