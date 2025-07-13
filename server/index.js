require('dotenv').config();
const express = require('express');
const fetch = require('node-fetch');
const Parser = require('rss-parser');
const path = require('path');
const app = express();
const parser = new Parser();

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

async function fetchTimeout(url, options = {}, timeout = 13000) {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), timeout)
    ),
  ]);
}

// === Получить цену криптовалюты из разных источников ===
async function getPriceAll(symbol) {
  symbol = (symbol || 'BTC').toUpperCase().replace(/[^A-Z]/g, '');
  let res = {};
  // Binance
  try {
    let r = await fetchTimeout(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`);
    let js = await r.json();
    if (js.price) res.binance = parseFloat(js.price);
  } catch {}
  // CoinGecko
  try {
    let cg = await fetchTimeout(`https://api.coingecko.com/api/v3/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=usd`);
    let js = await cg.json();
    if (js && js[symbol.toLowerCase()]) res.coingecko = js[symbol.toLowerCase()].usd;
  } catch {}
  // CoinMarketCap (если есть ключ)
  try {
    if (process.env.CMC_API_KEY) {
      let r = await fetchTimeout(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbol}`, {
        headers: { 'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY }
      });
      let js = await r.json();
      if (js.data && js.data[symbol]) res.cmc = js.data[symbol].quote.USD.price;
    }
  } catch {}
  // AlphaVantage (ключ бесплатный, ограничение по запросам)
  try {
    if (process.env.ALPHA_API_KEY) {
      let r = await fetchTimeout(`https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${symbol}&to_currency=USD&apikey=${process.env.ALPHA_API_KEY}`);
      let js = await r.json();
      if (js["Realtime Currency Exchange Rate"]) res.alpha = +js["Realtime Currency Exchange Rate"]["5. Exchange Rate"];
    }
  } catch {}
  // Finnhub (для акций, но есть BTC/USD)
  try {
    if (process.env.FINNHUB_API_KEY) {
      let r = await fetchTimeout(`https://finnhub.io/api/v1/quote?symbol=BINANCE:${symbol}USDT&token=${process.env.FINNHUB_API_KEY}`);
      let js = await r.json();
      if (js.c) res.finnhub = js.c;
    }
  } catch {}
  return res;
}

app.get('/api/price', async (req, res) => {
  try {
    let symbol = (req.query.symbol || 'BTC').toUpperCase().replace(/[^A-Z]/g, '');
    let prices = await getPriceAll(symbol);
    res.json({ symbol, prices });
  } catch {
    res.json({ found: false });
  }
});

app.get('/api/orderbook', async (req, res) => {
  try {
    let symbol = (req.query.symbol || 'BTC').toUpperCase().replace(/[^A-Z]/g, '') + 'USDT';
    const r = await fetchTimeout(`https://api.binance.com/api/v3/depth?symbol=${symbol}&limit=40`);
    const js = await r.json();
    res.json(js);
  } catch (e) {
    res.json({ error: 'Orderbook unavailable' });
  }
});

// Индикаторы TradingView (snapshot)
app.get('/api/tvindicators', async (req, res) => {
  try {
    let symbol = (req.query.symbol || 'BTC').toUpperCase() + 'USD';
    // Snapshot TradingView (unofficial)
    const r = await fetchTimeout(`https://scanner.tradingview.com/crypto/scan`);
    const data = await r.json();
    res.json(data);
  } catch {
    res.json({});
  }
});

// STOCKS + ETF (Yahoo Finance + Finnhub + AlphaVantage)
app.get('/api/stock', async (req, res) => {
  let symbol = (req.query.symbol || 'AAPL').toUpperCase();
  let out = {};
  try {
    let r = await fetchTimeout(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`);
    let js = await r.json();
    if (js.quoteResponse && js.quoteResponse.result[0])
      out.yahoo = js.quoteResponse.result[0];
  } catch {}
  try {
    if (process.env.ALPHA_API_KEY) {
      let r = await fetchTimeout(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${process.env.ALPHA_API_KEY}`);
      let js = await r.json();
      if (js["Global Quote"])
        out.alpha = js["Global Quote"];
    }
  } catch {}
  try {
    if (process.env.FINNHUB_API_KEY) {
      let r = await fetchTimeout(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${process.env.FINNHUB_API_KEY}`);
      let js = await r.json();
      if (js.c)
        out.finnhub = js;
    }
  } catch {}
  res.json({ symbol, ...out });
});

// ===== КРИПТО НОВОСТИ =====
app.get('/api/news', async (req, res) => {
  let news = [];
  const seen = new Set();

  // Cryptopanic
  try {
    if (process.env.CRYPTOPANIC_API_KEY) {
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
    }
  } catch {}

  // GNews
  try {
    if (process.env.GNEWS_API_KEY) {
      const url = `https://gnews.io/api/v4/top-headlines?category=business&q=crypto&token=${process.env.GNEWS_API_KEY}&lang=en&max=10`;
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
    }
  } catch {}

  // CryptoCompare free
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

  // Stocks/ETF — Yahoo Finance News (на англ, ticker news)
  try {
    let symbol = (req.query.stock || '').toUpperCase();
    if (symbol) {
      let r = await fetchTimeout(`https://query1.finance.yahoo.com/v7/finance/news?category=${symbol}`);
      let js = await r.json();
      (js.items?.result || []).forEach(a => {
        const key = (a.title || '') + (a.link || '');
        if (!seen.has(key)) {
          seen.add(key);
          news.push({
            title: a.title,
            url: a.link,
            time: a.pubDate,
            source: 'Yahoo Finance'
          });
        }
      });
    }
  } catch {}

  // Все RSS
  const feeds = [
    { url: 'https://cointelegraph.com/rss', src: 'Cointelegraph' },
    { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', src: 'CoinDesk' },
    { url: 'https://forklog.com/feed', src: 'Forklog' },
    { url: 'https://www.theblock.co/rss', src: 'The Block' },
    { url: 'https://bitcoinmagazine.com/.rss/full/', src: 'BitcoinMagazine' },
    { url: 'https://www.investing.com/rss/news_301.rss', src: 'Investing.com' },
    { url: 'https://cryptonews.com/news/feed', src: 'CryptoNews' },
    { url: 'https://cryptoslate.com/feed', src: 'CryptoSlate' },
    { url: 'https://decrypt.co/feed', src: 'Decrypt' }
  ];
  for (let feed of feeds) {
    try {
      const f = await parser.parseURL(feed.url);
      (f.items || []).forEach(a => {
        const key = (a.title || '') + (a.link || '');
        if (!seen.has(key)) {
          seen.add(key);
          news.push({
            title: a.title,
            url: a.link,
            time: a.pubDate,
            source: feed.src
          });
        }
      });
    } catch {}
  }

  // Только свежие и уникальные
  news = news.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 18);
  res.json({ articles: news });
});

// ===== OpenAI endpoint =====
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

// ======= PWA fallback (SPA) =======
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('NEURONA AI server started!'));
