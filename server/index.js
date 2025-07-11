require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const RSSParser = require('rss-parser');
const parser = new RSSParser();
const app = express();

const NEWS_APIS = [
  // Публичные крипто и трейдинг новости (RSS и API)
  {name:"CryptoPanic",url:"https://cryptopanic.com/api/v1/posts/?auth_token=demo&public=true",type:"json"},
  {name:"CoinDesk",url:"https://feeds.coinfeed.com/rss/coindesk",type:"rss"},
  {name:"Binance Blog",url:"https://www.binance.com/en/blog/rss",type:"rss"},
  {name:"NewsAPI",url:"https://newsapi.org/v2/top-headlines?sources=crypto-coins-news&apiKey="+(process.env.NEWSAPI_KEY||"demo"),type:"json"},
  {name:"Cointelegraph",url:"https://cointelegraph.com/rss",type:"rss"},
  {name:"CryptoCompare",url:"https://min-api.cryptocompare.com/data/v2/news/?lang=EN",type:"json"},
  {name:"Yahoo Crypto",url:"https://finance.yahoo.com/news/rss/cryptocurrencies",type:"rss"},
  // Дополнительные
  {name:"Investing.com",url:"https://www.investing.com/rss/news_285.rss",type:"rss"},
  {name:"Ambcrypto",url:"https://ambcrypto.com/feed/",type:"rss"},
  {name:"Bitcoin Magazine",url:"https://bitcoinmagazine.com/.rss/full/",type:"rss"}
];

const BINANCE_API_KEY = process.env.BINANCE_API_KEY || "SSsOLsTYiALZWxd8pruKEB6orIlWuhtnBpBzktKg69w65SLZBcp3mlE3KUDY9RCU";
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET || "LkJE5S0NgGZaeuOkA56zFOaLhWQmFJBbOVJc3r5YsnnircDkZ2d3FOtSrTMe30o2";

app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/news', async (req, res) => {
  try {
    let results = [];
    for (const feed of NEWS_APIS) {
      try {
        if (feed.type === "rss") {
          const resp = await fetch(feed.url);
          const xml = await resp.text();
          const parsed = await parser.parseString(xml);
          if (parsed.items) {
            results = results.concat(parsed.items.map(item => ({
              title: item.title,
              link: item.link,
              source: feed.name,
              date: item.pubDate || item.isoDate || ""
            })));
          }
        } else if (feed.type === "json") {
          const resp = await fetch(feed.url);
          const data = await resp.json();
          if (feed.name === "CryptoPanic" && data.results) {
            results = results.concat(
              data.results.map(item => ({
                title: item.title,
                link: item.url,
                source: feed.name,
                date: item.created_at
              }))
            );
          } else if (feed.name === "CryptoCompare" && data.Data) {
            results = results.concat(
              data.Data.map(item => ({
                title: item.title,
                link: item.url,
                source: feed.name,
                date: item.published_on ? new Date(item.published_on * 1000).toISOString() : ""
              }))
            );
          } else if (feed.name === "NewsAPI" && data.articles) {
            results = results.concat(
              data.articles.map(item => ({
                title: item.title,
                link: item.url,
                source: feed.name,
                date: item.publishedAt || ""
              }))
            );
          }
        }
      } catch (e) {}
    }
    results = results.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 25);
    res.json({news: results});
  } catch (err) {
    res.status(500).json({error: "News fetch error"});
  }
});

app.get('/api/binance/book', async (req, res) => {
  // Стакан и последние сделки по BTCUSDT
  try {
    const depth = await fetch('https://api.binance.com/api/v3/depth?symbol=BTCUSDT&limit=10');
    const depthData = await depth.json();
    const trades = await fetch('https://api.binance.com/api/v3/trades?symbol=BTCUSDT&limit=10');
    const tradesData = await trades.json();
    res.json({bids: depthData.bids, asks: depthData.asks, trades: tradesData});
  } catch (err) {
    res.status(500).json({error: "Binance fetch error"});
  }
});

app.get('/api/binance/price', async (req, res) => {
  try {
    const p = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
    const data = await p.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({error: "Binance price error"});
  }
});

// Прокси для Google Translate
app.get('/api/translate', async (req, res) => {
  const text = req.query.text || '';
  const to = req.query.to || 'en';
  if (!text) return res.json({text});
  try {
    const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${to}&dt=t&q=${encodeURIComponent(text)}`);
    const d = await r.json();
    res.json({text: d[0].map(x=>x[0]).join('')});
  } catch (e) {
    res.json({text});
  }
});

// WebPush notifications mock endpoint (будет работать при интеграции service-worker)
app.post('/api/push', express.json(), (req, res) => {
  // Здесь можно реализовать сохранение подписки для реальных push (web-push npm)
  res.json({ok:true});
});

// PWA service-worker поддержка
app.get('/sw.js', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/sw.js'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('NEURONA server started on port', PORT));
