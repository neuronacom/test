import os
import requests
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import openai
import feedparser
from datetime import datetime

app = Flask(__name__, static_folder="static", static_url_path="/")
CORS(app)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
openai.api_key = OPENAI_API_KEY

NEWS_FEEDS = [
    "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "https://cointelegraph.com/rss",
    "https://news.google.com/rss/search?q=bitcoin",
    "https://www.investing.com/rss/news_25.rss",
    "https://feeds.finance.yahoo.com/rss/2.0/headline?s=BTC-USD&region=US&lang=en-US",
    "https://bitcoinmagazine.com/.rss/full/",
    "https://cryptoslate.com/feed/",
    "https://www.newsbtc.com/feed/",
    "https://news.bitcoin.com/feed/",
    "https://cryptonews.com/news/feed",
    "https://decrypt.co/feed",
    "https://www.cryptoglobe.com/latest/feed/",
    "https://ambcrypto.com/feed/"
]

TOP5 = "bitcoin,ethereum,bnb,solana,dogecoin"

def parse_rss(url):
    feed = feedparser.parse(url)
    news = []
    for entry in feed.entries:
        news.append({
            "title": entry.title,
            "link": entry.link,
            "published": entry.get("published", "")
        })
    return news

@app.route("/api/news")
def api_news():
    # Берём только свежие и не дублируем!
    all_news = []
    for url in NEWS_FEEDS:
        try:
            all_news.extend(parse_rss(url))
        except: pass
    seen = set()
    news_sorted = []
    # Лента - свежие внизу
    for n in sorted(all_news, key=lambda x: x.get("published","")):
        k = n["title"]+n["link"]
        if k not in seen:
            seen.add(k)
            news_sorted.append(n)
        if len(news_sorted) >= 30: break
    return jsonify(news_sorted)

@app.route("/api/market")
def api_market():
    res = {}
    try:
        # Только самые свежие цены топ-5 с CoinGecko и Binance
        res["coingecko"] = requests.get(
            f"https://api.coingecko.com/api/v3/simple/price?ids={TOP5}&vs_currencies=usd,usdt&include_24hr_change=true"
        ).json()
        res["binance"] = {}
        for symbol in ["BTCUSDT","ETHUSDT","BNBUSDT","SOLUSDT","DOGEUSDT"]:
            try:
                r = requests.get(f"https://api.binance.com/api/v3/ticker/price?symbol={symbol}").json()
                res["binance"][symbol] = r
            except: pass
    except Exception as e:
        res["error"] = str(e)
    return jsonify(res)

@app.route("/api/ai_comment", methods=["POST"])
def ai_comment():
    data = request.json
    prompt = data.get("prompt", "")
    try:
        resp = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": (
                    "Ты топовый трейдер по крипторынку и фондовому рынку, каждый твой анализ — профессиональный, подробный, но лаконичный, с максимальной пользой для трейдера. "
                    "Делай глубокий анализ BTC, ETH, BNB, SOL, DOGE (по данным с Binance и CoinGecko). Покажи текущие цены, изменения за сутки. "
                    "Если есть сильный вход, дай сигнал (LONG/SHORT), точку входа, тейк-профит, стоп-лосс, причину и таймфрейм. "
                    "Если нет, просто дай свежий обзор и рекомендации. Пиши на русском. "
                    "Делай текст структурированным, важные значения выделяй, делай красиво. Не придумывай цены — только по присланным данным."
                )},
                {"role": "user", "content": prompt}
            ]
        )
        ans = resp.choices[0].message.content
        now = datetime.now().strftime('%H:%M:%S')
        return jsonify({"ok": True, "msg": ans, "time": now})
    except Exception as e:
        return jsonify({"ok": False, "msg": str(e), "time": datetime.now().strftime('%H:%M:%S')})

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

@app.route("/manifest.json")
def manifest():
    return send_from_directory(app.static_folder, "manifest.json")

@app.route("/sw.js")
def sw():
    return send_from_directory(app.static_folder, "sw.js")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
