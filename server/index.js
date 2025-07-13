require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const Parser = require('rss-parser');
const path = require('path');
const app = express();
const parser = new Parser();
const BINANCE_PUBLIC_KEY = process.env.BINANCE_API_KEY || ''; // Можно использовать публичный (смотри ниже)

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

async function fetchTimeout(url, options = {}, timeout = 15000) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), timeout)
    ),
  ]);
}

// Получаем цену BTC с Binance (реального времени!)
app.get('/api/price', async (req, res) => {
  try {
    let symbol = (req.query.symbol || 'BTC').toUpperCase().replace(/[^A-Z]/g, '') + 'USDT';
    const r = await fetchTimeout(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`);
    const js = await r.json();
    res.json({ found: !!js.price, symbol, price: js.price || null });
  } catch (e) {
    res.json({ found: false });
  }
});

// Получаем OrderBook (стакан) с Binance
app.get('/api/orderbook', async (req, res) => {
  try {
    let symbol = (req.query.symbol || 'BTC').toUpperCase().replace(/[^A-Z]/g, '') + 'USDT';
    const r = await fetchTimeout(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=20`);
    const js = await r.json();
    res.json(js);
  } catch (e) {
    res.json({ error: 'Orderbook unavailable' });
  }
});

// Получаем индикаторы с TradingView через public snapshot (simple workaround)
app.get('/api/tvindicators', async (req, res) => {
  try {
    // Используем TradingView snapshot API, например через ru.tradingview.com/symbols/BTCUSD/technicals/
    const resp = await fetch('https://scanner.tradingview.com/crypto/scan');
    const data = await resp.json();
    res.json(data); // Просто прокси, детали реализуй в фронте
  } catch {
    res.json({});
  }
});

// Получаем максимально новости (TOP FREE news API + RSS!)
app.get('/api/news', async (req, res) => {
  let news = [];
  const seen = new Set();

  // Cryptopanic
  try {
    const url = `https://cryptopanic.com/api/v1/posts/?auth_token=${process.env.CRYPTOPANIC_API_KEY}&public=true&currencies=BTC,ETH`;
    const r = await fetchTimeout(url);
    const js = await r.json();
    (js.results || []).forEach(n => {
      const key = (n.title || '') + (n.url || '');
      if (!seen.has(key)) {
        seen.add(key);
        news.push({
          title: n.title,
          url: n.url,
          time: n.published_at,
          source: n.domain || 'cryptopanic'
        });
      }
    });
  } catch {}

  // GNews
  try {
    const url = `https://gnews.io/api/v4/top-headlines?category=business&q=crypto&token=${process.env.GNEWS_API_KEY}&lang=en&max=5`;
    const r = await fetchTimeout(url);
    const js = await r.json();
    (js.articles || []).forEach(a => {
      const key = (a.title || '') + (a.url || '');
      if (!seen.has(key)) {
        seen.add(key);
        news.push({
          title: a.title,
          url: a.url,
          time: a.publishedAt,
          source: a.source?.name || 'gnews'
        });
      }
    });
  } catch {}

  // CryptoCompare
  try {
    const url = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';
    const r = await fetchTimeout(url);
    const js = await r.json();
    (js.Data || []).forEach(a => {
      const key = (a.title || '') + (a.url || '');
      if (!seen.has(key)) {
        seen.add(key);
        news.push({
          title: a.title,
          url: a.url,
          time: a.published_on ? new Date(a.published_on * 1000).toISOString() : '',
          source: a.source || 'CryptoCompare'
        });
      }
    });
  } catch {}

  // Cointelegraph
  try {
    const feed = await parser.parseURL('https://cointelegraph.com/rss');
    (feed.items || []).forEach(a => {
      const key = (a.title || '') + (a.link || '');
      if (!seen.has(key)) {
        seen.add(key);
        news.push({
          title: a.title,
          url: a.link,
          time: a.pubDate,
          source: 'Cointelegraph'
        });
      }
    });
  } catch {}

  // CoinDesk
  try {
    const feed = await parser.parseURL('https://www.coindesk.com/arc/outboundfeeds/rss/');
    (feed.items || []).forEach(a => {
      const key = (a.title || '') + (a.link || '');
      if (!seen.has(key)) {
        seen.add(key);
        news.push({
          title: a.title,
          url: a.link,
          time: a.pubDate,
          source: 'CoinDesk'
        });
      }
    });
  } catch {}

  // Forklog
  try {
    const feed = await parser.parseURL('https://forklog.com/feed');
    (feed.items || []).forEach(a => {
      const key = (a.title || '') + (a.link || '');
      if (!seen.has(key)) {
        seen.add(key);
        news.push({
          title: a.title,
          url: a.link,
          time: a.pubDate,
          source: 'Forklog'
        });
      }
    });
  } catch {}

  // The Block
  try {
    const feed = await parser.parseURL('https://www.theblock.co/rss');
    (feed.items || []).forEach(a => {
      const key = (a.title || '') + (a.link || '');
      if (!seen.has(key)) {
        seen.add(key);
        news.push({
          title: a.title,
          url: a.link,
          time: a.pubDate,
          source: 'The Block'
        });
      }
    });
  } catch {}

  // BitcoinMagazine
  try {
    const feed = await parser.parseURL('https://bitcoinmagazine.com/.rss/full/');
    (feed.items || []).forEach(a => {
      const key = (a.title || '') + (a.link || '');
      if (!seen.has(key)) {
        seen.add(key);
        news.push({
          title: a.title,
          url: a.link,
          time: a.pubDate,
          source: 'BitcoinMagazine'
        });
      }
    });
  } catch {}

  // Investing.com (crypto section)
  try {
    const feed = await parser.parseURL('https://www.investing.com/rss/news_301.rss');
    (feed.items || []).forEach(a => {
      const key = (a.title || '') + (a.link || '');
      if (!seen.has(key)) {
        seen.add(key);
        news.push({
          title: a.title,
          url: a.link,
          time: a.pubDate,
          source: 'Investing.com'
        });
      }
    });
  } catch {}

  // CryptoNews.com
  try {
    const feed = await parser.parseURL('https://cryptonews.com/news/feed');
    (feed.items || []).forEach(a => {
      const key = (a.title || '') + (a.link || '');
      if (!seen.has(key)) {
        seen.add(key);
        news.push({
          title: a.title,
          url: a.link,
          time: a.pubDate,
          source: 'CryptoNews'
        });
      }
    });
  } catch {}

  // Только последние 5 новостей (или сколько надо)
  news = news.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);
  res.json({ articles: news });
});

// OpenAI (roles fix)
app.post('/api/openai', async (req, res) => {
  try {
    if (Array.isArray(req.body.messages)) {
      req.body.messages.forEach(m => {
        if (m.role === 'bot') m.role = 'assistant';
      });
    }
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    const js = await r.json();
    res.json(js);
  } catch {
    res.status(500).json({ error: 'OpenAI error' });
  }
});

// Фоллбэк для PWA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('NEURONA AI server started!'));
