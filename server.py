import os
import requests
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import openai

app = Flask(__name__, static_folder="static", static_url_path="/")
CORS(app)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
openai.api_key = OPENAI_API_KEY

# Новости - RSS агрегатор (много лент)
NEWS_FEEDS = [
    "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "https://cointelegraph.com/rss",
    "https://news.google.com/rss/search?q=bitcoin",
    "https://www.investing.com/rss/news_25.rss",
    "https://feeds.finance.yahoo.com/rss/2.0/headline?s=BTC-USD&region=US&lang=en-US",
    "https://bitcoinmagazine.com/.rss/full/",
    "https://min-api.cryptocompare.com/data/v2/news/?lang=EN",
    "https://cryptoslate.com/feed/",
    "https://www.newsbtc.com/feed/",
    "https://news.bitcoin.com/feed/",
    "https://cryptonews.com/news/feed",
    "https://decrypt.co/feed",
    "https://www.cryptoglobe.com/latest/feed/",
    "https://ambcrypto.com/feed/",
    "https://www.investing.com/rss/news_301.rss",
    "https://nitter.net/whale_alert/rss"
]

def parse_rss(url):
    import feedparser
    feed = feedparser.parse(url)
    news = []
    for entry in feed.entries:
        news.append({
            "title": entry.title,
            "link": entry.link,
            "published": entry.published if "published" in entry else ""
        })
    return news

@app.route("/api/news")
def api_news():
    result = []
    for url in NEWS_FEEDS:
        try:
            for n in parse_rss(url):
                result.append(n)
        except Exception:
            continue
    # Уникализируем по title+link, сортируем по времени, лимит 20
    seen = set()
    news_sorted = []
    for n in sorted(result, key=lambda x: x.get("published",""), reverse=True):
        k = n["title"]+n["link"]
        if k not in seen:
            seen.add(k)
            news_sorted.append(n)
        if len(news_sorted) >= 20:
            break
    return jsonify(news_sorted)

# BTC / Crypto данные - API endpoints
@app.route("/api/market")
def api_market():
    res = {}
    try:
        res["coingecko"] = requests.get("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true").json()
        res["binance"] = requests.get("https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT").json()
        res["binance_24hr"] = requests.get("https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT").json()
        res["kucoin"] = requests.get("https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=BTC-USDT").json()
        res["kucoin_candles"] = requests.get("https://api.kucoin.com/api/v1/market/candles?type=1hour&symbol=BTC-USDT").json()
        res["fng"] = requests.get("https://api.alternative.me/fng/").json()
        res["coingecko_markets"] = requests.get("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum&order=market_cap_desc&per_page=10&page=1&sparkline=false").json()
    except Exception as e:
        res["error"] = str(e)
    return jsonify(res)

# AI-комментарий и сигнал (по запросу фронта)
@app.route("/api/ai_comment", methods=["POST"])
def ai_comment():
    data = request.json
    prompt = data.get("prompt", "")
    try:
        resp = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "Ты эксперт по крипте и рынкам, пиши лаконично, строго по делу, обязательно давай точный сигнал (LONG/SHORT), указывай стоп-лосс, тейк-профит, точку входа, причину, таймфрейм. Пиши на русском."},
                {"role": "user", "content": prompt}
            ]
        )
        ans = resp.choices[0].message.content
        return jsonify({"ok": True, "msg": ans})
    except Exception as e:
        return jsonify({"ok": False, "msg": str(e)})

# КОРНЕВОЙ РОУТ: отдаём index.html из /static
@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

# PWA файлы для корректной работы
@app.route("/manifest.json")
def manifest():
    return send_from_directory(app.static_folder, "manifest.json")

@app.route("/sw.js")
def sw():
    return send_from_directory(app.static_folder, "sw.js")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
