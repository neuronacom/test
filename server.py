import os
import requests
from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import openai
import feedparser
from datetime import datetime, timedelta
import pytz

app = Flask(__name__, static_folder="static", static_url_path="/")
CORS(app)

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
openai.api_key = OPENAI_API_KEY

# Новости: самые оперативные, по крипте
NEWS_FEEDS = [
    "https://www.coindesk.com/arc/outboundfeeds/rss/",
    "https://cointelegraph.com/rss",
    "https://cryptonews.com/news/feed",
    "https://www.newsbtc.com/feed/",
    "https://cryptoslate.com/feed/",
    "https://news.bitcoin.com/feed/",
    "https://feeds.finance.yahoo.com/rss/2.0/headline?s=BTC-USD&region=US&lang=en-US",
    "https://bitcoinmagazine.com/.rss/full/",
    "https://www.investing.com/rss/news_25.rss",
    "https://www.cryptoglobe.com/latest/feed/",
    "https://ambcrypto.com/feed/"
]

TOP5_BINANCE = {
    "BTCUSDT": "bitcoin",
    "ETHUSDT": "ethereum",
    "BNBUSDT": "bnb",
    "SOLUSDT": "solana",
    "DOGEUSDT": "dogecoin"
}

def parse_rss(url):
    feed = feedparser.parse(url)
    news = []
    for entry in feed.entries:
        # Время в UTC+3 (Киев)
        if hasattr(entry, "published_parsed"):
            dt = datetime.utcfromtimestamp(feedparser.mktime_tz(entry.published_parsed)).replace(tzinfo=pytz.utc).astimezone(pytz.timezone('Europe/Kyiv'))
            published = dt.strftime('%Y-%m-%d %H:%M')
        else:
            published = ""
        news.append({
            "title": entry.title,
            "link": entry.link,
            "published": published
        })
    return news

@app.route("/api/news")
def api_news():
    # Собираем все ленты, только уникальные, свежие внизу, до 40 новостей
    all_news = []
    for url in NEWS_FEEDS:
        try:
            all_news.extend(parse_rss(url))
        except: pass
    seen = set()
    news_sorted = []
    # Лента — свежие внизу!
    for n in sorted(all_news, key=lambda x: x.get("published","")):
        k = n["title"]+n["link"]
        if k not in seen and n["published"]:
            seen.add(k)
            news_sorted.append(n)
        if len(news_sorted) >= 40: break
    return jsonify(news_sorted)

@app.route("/api/market")
def api_market():
    # LIVE-цены с Binance + CoinGecko для проверки изменений
    res = {}
    try:
        # Binance live ticker по топ-5
        prices = {}
        changes = {}
        for symbol in TOP5_BINANCE.keys():
            r = requests.get(f"https://api.binance.com/api/v3/ticker/24hr?symbol={symbol}").json()
            prices[symbol] = float(r['lastPrice'])
            changes[symbol] = float(r['priceChangePercent'])
        res['binance'] = prices
        res['change'] = changes
        # CoinGecko на всякий случай (можно для доп. информации)
        ids = ','.join(TOP5_BINANCE.values())
        res['coingecko'] = requests.get(
            f"https://api.coingecko.com/api/v3/simple/price?ids={ids}&vs_currencies=usd&include_24hr_change=true"
        ).json()
    except Exception as e:
        res['error'] = str(e)
    return jsonify(res)

@app.route("/api/ai_comment", methods=["POST"])
def ai_comment():
    data = request.json
    prompt = data.get("prompt", "")
    try:
        # Время по Киеву
        now_kyiv = datetime.utcnow() + timedelta(hours=3)
        now_str = now_kyiv.strftime('%Y-%m-%d %H:%M')
        resp = openai.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content":
                    "Ты опытный трейдер. На основе только предоставленных цен и изменений за сутки по данным Binance и CoinGecko сделай подробный, но лаконичный анализ. Приводи только точные цифры и свежие сигналы по BTC, ETH, BNB, SOL, DOGE. "
                    "Сначала покажи таблицу с ценой и изменением. Потом пиши рекомендации, уровни, если есть сигнал (LONG/SHORT), укажи точку входа, TP, SL и причину. Обязательно укажи таймфрейм для сделки. "
                    "Пиши строго только по этим данным, не выдумывай значения! Если сигналов нет, напиши кратко, что ожидать."
                },
                {"role": "user", "content": prompt}
            ]
        )
        ans = resp.choices[0].message.content
        return jsonify({"ok": True, "msg": ans, "time": now_str})
    except Exception as e:
        now_kyiv = datetime.utcnow() + timedelta(hours=3)
        now_str = now_kyiv.strftime('%Y-%m-%d %H:%M')
        return jsonify({"ok": False, "msg": str(e), "time": now_str})

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
