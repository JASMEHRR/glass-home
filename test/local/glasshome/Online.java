package local.glasshome;

import java.io.File;

/** Live checks of the data sources the screens use (run with build.ps1 -Online). */
final class Online {
    private Online() {}

    static void run(SelfTest.Checker c, File tmp) {
        Net net = new Net(tmp);
        Net.Result w = net.get("https://api.open-meteo.com/v1/forecast?latitude=30.34&longitude=76.39"
                + "&current=temperature_2m,weather_code,is_day&hourly=temperature_2m&daily=temperature_2m_max,"
                + "temperature_2m_min,sunrise,sunset&timezone=auto&forecast_days=3", null, 0);
        c.check("open-meteo", w.ok && w.body.contains("\"current\"") && w.body.contains("temperature_2m"));
        Net.Result air = net.get("https://air-quality-api.open-meteo.com/v1/air-quality?latitude=30.34&longitude=76.39"
                + "&current=us_aqi", null, 0);
        c.check("open-meteo air", air.ok && air.body.contains("us_aqi"));
        Net.Result f1 = net.get("https://api.jolpi.ca/ergast/f1/current/next.json", null, 0);
        c.check("jolpica next", f1.ok && f1.body.contains("MRData"));
        Net.Result st = net.get("https://api.jolpi.ca/ergast/f1/current/driverStandings.json", null, 0);
        c.check("jolpica standings", st.ok && st.body.contains("DriverStandings"));
        Net.Result an = net.get("https://graphql.anilist.co",
                "{\"query\":\"query{Page(perPage:3){airingSchedules(notYetAired:true,sort:TIME){episode airingAt media{title{romaji}}}}}\"}", 0);
        c.check("anilist", an.ok && an.body.contains("airingSchedules"));
        Net.Result cm = net.get("https://v3-cinemeta.strem.io/catalog/series/top.json", null, 0);
        c.check("cinemeta", cm.ok && cm.body.contains("\"metas\""));
        Net.Result geo = net.get("https://get.geojs.io/v1/ip/geo.json", null, 0);
        c.check("ip location", geo.ok && geo.body.contains("latitude"));
    }
}
