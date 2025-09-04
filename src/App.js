import React, { useState } from "react";
import "./App.css";

function App() {
  const [city, setCity] = useState("");
  const [current, setCurrent] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // CRA için: REACT_APP_ ile başlamalı ve dev server yeniden başlatılmalı
  const API_KEY = process.env.REACT_APP_WEATHER_KEY;

  // Teşhis: key geldi mi?
  if (typeof window !== "undefined") {
    // Sayfayı her render’da doldurmasın diye bir kere logla
    if (!window.__KEY_LOGGED__) {
      console.log(
        "ENV API KEY:",
        API_KEY ? API_KEY.slice(0, 6) + "..." : "(undefined)"
      );
      window.__KEY_LOGGED__ = true;
    }
  }

  function pickDaily(list) {
    const byDay = {};
    list.forEach((item) => {
      const [d] = item.dt_txt.split(" ");
      (byDay[d] ??= []).push(item);
    });
    return Object.keys(byDay)
      .sort()
      .slice(0, 5)
      .map((d) => {
        const items = byDay[d];
        const noon = items.find((x) => x.dt_txt.includes("12:00:00")) || items[0];
        return {
          date: d,
          temp: noon.main.temp,
          icon: noon.weather[0].icon,
          desc: noon.weather[0].description,
          min: Math.min(...items.map((x) => x.main.temp_min)),
          max: Math.max(...items.map((x) => x.main.temp_max)),
        };
      });
  }

  const fetchAll = async () => {
    setErrMsg("");
    setCurrent(null);
    setForecast([]);

    const q = city.trim();
    if (!q) return setErrMsg("Please enter a city.");

    // Eğer env okunmazsa 401 alırsın; burada erken uyarı verelim
    if (!API_KEY) {
      setErrMsg(
        "Missing API key. Put REACT_APP_WEATHER_KEY=YOUR_KEY in .env (project root) and restart `npm start`."
      );
      return;
    }

    setLoading(true);
    try {
      // 1) Current
      const curRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
          q
        )}&units=metric&appid=${API_KEY}&lang=tr`
      );
      const cur = await curRes.json();
      console.log("CURRENT RESP:", cur);

      if (cur.cod != 200) {
        // 401 ise key ya boş ya da geçersiz
        setErrMsg(cur?.message ? `Hata: ${cur.message}` : "City not found.");
        setLoading(false);
        return;
      }
      setCurrent(cur);

      // 2) Forecast
      const fcRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(
          q
        )}&units=metric&appid=${API_KEY}&lang=tr`
      );
      const fc = await fcRes.json();
      console.log("FORECAST RESP:", fc);

      if (fc.cod == 200) setForecast(pickDaily(fc.list));
      else setForecast([]);
    } catch (e) {
      console.error("Fetch error:", e);
      setErrMsg("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => e.key === "Enter" && fetchAll();

  return (
    <div className="app">
      <h1>🌤 Hava Durumu</h1>

      <div className="search">
        <input
          type="text"
          placeholder="Şehir gir..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button onClick={fetchAll} disabled={loading}>
          {loading ? "Yükleniyor..." : "Ara"}
        </button>
      </div>

      {errMsg && <p style={{ color: "crimson" }}>{errMsg}</p>}

      {current && (
        <div className="weather-card">
          <h2>
            {current.name}, {current.sys.country}
          </h2>
          <div className="now">
            <img
              alt="icon"
              src={`https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png`}
            />
            <div>
              <div className="temp">{Math.round(current.main.temp)}°C</div>
              <div className="desc" style={{ textTransform: "capitalize" }}>
                {current.weather[0].description}
              </div>
            </div>
          </div>
        </div>
      )}

      {forecast.length > 0 && (
        <div className="forecast">
          {forecast.map((d) => (
            <div key={d.date} className="day">
              <div className="date">
                {new Date(d.date).toLocaleDateString("tr-TR", {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                })}
              </div>
              <img
                alt={d.desc}
                title={d.desc}
                src={`https://openweathermap.org/img/wn/${d.icon}.png`}
              />
              <div className="range">
                <span className="max">{Math.round(d.max)}°</span>
                <span className="min" style={{ opacity: 0.7 }}>
                  {Math.round(d.min)}°
                </span>
              </div>
              <div className="small" style={{ textTransform: "capitalize" }}>
                {d.desc}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
