package local.glasshome;

import java.io.File;
import java.nio.file.Files;
import java.util.LinkedHashMap;
import java.util.Map;

/** Pure-Java checks run by build.ps1 on the PC. "online" also calls the live data APIs. */
public final class SelfTest {
    private static int passed, failed;

    private static void check(String name, boolean ok) {
        if (ok) {
            passed++;
        } else {
            failed++;
            System.out.println("FAIL: " + name);
        }
    }

    public static void main(String[] args) throws Exception {
        // settings file
        Map<String, String> p = Prefs.parse("# c\nanilist.user = jas\n\nbad line\nscene=night\n=x\n");
        check("prefs parse", p.size() == 2 && "jas".equals(p.get("anilist.user")) && "night".equals(p.get("scene")));
        Map<String, String> m = new LinkedHashMap<>();
        m.put("a", "1");
        m.put("b", "two\nlines");
        check("prefs format round trip", Prefs.parse(Prefs.format(m)).get("b").equals("two lines"));
        File tmp = Files.createTempDirectory("gh").toFile();
        Prefs prefs = new Prefs(new File(tmp, "glass.conf"));
        prefs.set("x", "1");
        prefs.set("bad=key", "2");
        check("prefs set/get", "1".equals(prefs.get("x", "")) && prefs.all().size() == 1);
        prefs.set("x", null);
        check("prefs remove", prefs.get("x", "none").equals("none"));

        // network helpers
        check("net key stable", Net.key("https://a", null).equals(Net.key("https://a", null)));
        check("net key body", !Net.key("https://a", "1").equals(Net.key("https://a", "2")));
        check("net allows https", Net.allowed("https://api.open-meteo.com/v1/forecast"));
        check("net blocks file", !Net.allowed("file:///data/data/x") && !Net.allowed("javascript:alert(1)"));

        // phone page
        check("media pause", "pause".equals(PhoneService.mediaWord("Jarvis, pause the TV")));
        check("media play", "play".equals(PhoneService.mediaWord("resume")));
        check("media next", "next".equals(PhoneService.mediaWord("next episode")));
        check("media none", PhoneService.mediaWord("open stremio") == null);
        Map<String, String> f = PhoneService.form("pin=1234&text=open+stremio%21&x");
        check("form decode", "1234".equals(f.get("pin")) && "open stremio!".equals(f.get("text")) && f.size() == 2);

        if (args.length > 0 && "online".equals(args[0])) Online.run(SelfTest::check, tmp);

        System.out.println("self-test: " + passed + " passed, " + failed + " failed");
        if (failed > 0) System.exit(1);
    }

    interface Checker {
        void check(String name, boolean ok);
    }
}
