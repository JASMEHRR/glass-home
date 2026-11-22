// node tests for the page's pure parts: Jarvis's brain and the data parsers. Run by build.ps1.
'use strict';
const path = require('path');
const Brain = require(path.join(__dirname, '..', 'assets', 'ui', 'brain.js'));
const Data = require(path.join(__dirname, '..', 'assets', 'ui', 'data.js'));
let passed = 0, failed = 0;
function check(name, ok) { if (ok) passed++; else { failed++; console.log('FAIL: ' + name); } }

const apps = [{ id: 'local.sendtotv', label: 'Send to TV' }, { id: 'org.smarttube.stable', label: 'SmartTube' },
  { id: 'com.stremio.one', label: 'Stremio' }, { id: 'com.amazon.firebat', label: 'Prime Video' }, { id: 'com.amazon.venezia', label: 'Appstore' }];
const p = (t) => Brain.parse(t, { apps });

check('open stremio', p('Jarvis, open Stremio please').act.id === 'com.stremio.one');
check('open youtube alias', p('open youtube').act.id === 'org.smarttube.stable');
check('open prime', p('launch prime video').act.id === 'com.amazon.firebat');
check('open by label', p('open appstore').act.id === 'com.amazon.venezia');
check('missing app', p('open netflix').act.type === 'ask' || p('open fancode').act.type === 'none');
check('pause', p('pause').act.action === 'pause');
check('resume', p('resume').act.action === 'play');
check('sleep now', p('turn off the tv').act.type === 'sleep');
check('sleep timer', p('sleep in 30 minutes').act.minutes === 30);
check('sleep timer hours', p('turn off after 2 hours').act.minutes === 120);
check('cancel timer', p('cancel the sleep timer').act.minutes === 0);
check('weather', p("what's the weather like").act.topic === 'weather');
check('f1', p('when is the next race').act.topic === 'f1');
check('anime', p('when is the next episode of my anime').act.topic === 'anime');
check('deadlines', p('what deadlines do I have').act.topic === 'deadlines');
check('for you screen', p('what should I watch tonight').act.name === 'foryou');
check('command center', p('open the command center').act.name === 'command');
check('home', p('go home').act.name === 'home');
check('memory', p('free up memory').act.type === 'memory');
check('speed', p('run a speed test').act.type === 'speed');
check('ask fallback', p('add my MST dates to my calendar').act.type === 'ask');
check('empty', p('').act.type === 'none');

// time helpers
check('countdown', Data.countdown((6 * 86400 + 19 * 3600 + 26 * 60 + 41) * 1000) === '6d 19:26:41');
check('countdown short', Data.countdown(65 * 1000) === '00:01:05');
check('clock 12h', Data.clock(new Date(2026, 10, 23, 0, 4), false) === '12:04');
check('clock 24h', Data.clock(new Date(2026, 10, 23, 13, 4), true) === '13:04');
check('greeting', Data.greeting(new Date(2026, 10, 23, 9)) === 'Good morning');

// weather
const now = new Date(2026, 10, 23, 1, 30);
const hourly = { time: [], temperature_2m: [] };
for (let h = 0; h < 12; h++) { hourly.time.push('2026-11-23T' + String(h).padStart(2, '0') + ':00'); hourly.temperature_2m.push(20 - h); }
const w = Data.parseWeather({ current: { temperature_2m: 15.4, apparent_temperature: 13.6, weather_code: 0, is_day: 0 }, hourly,
  daily: { time: ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26'], temperature_2m_max: [24, 25, 23, 24], temperature_2m_min: [14, 15, 13, 12],
    sunrise: ['2026-11-23T06:52'], sunset: ['2026-11-23T17:21'] } }, { current: { us_aqi: 189 } }, now);
check('weather temp', w.temp === 15 && w.text === 'Clear night' && w.aqi === 189);
check('weather hours start after now', w.hours.length === 6 && w.hours[0].label === '2 AM' && w.hours[0].t === 18);
check('weather days', w.days.length === 3 && w.days[0].max === 25);
check('weather sun', w.sunrise === '6:52 AM' && w.sunset === '5:21 PM');

// F1
const race = Data.parseNextRace({ MRData: { RaceTable: { Races: [{ season: '2026', round: '23', raceName: 'Qatar Grand Prix', Circuit: { circuitName: 'Lusail' },
  date: '2026-11-29', time: '16:00:00Z', Qualifying: { date: '2026-11-28', time: '18:00:00Z' }, Sprint: { date: '2026-11-28', time: '14:00:00Z' } }] } } }, 24);
check('race parsed', race && race.name === 'Qatar Grand Prix' && race.round === 23 && race.total === 24);
check('race sessions ordered', race.sessions.map(s => s.name).join(',') === 'Sprint,Qualifying,Race');
check('race start utc', race.start === Date.UTC(2026, 10, 29, 16));
check('no race', Data.parseNextRace({ MRData: { RaceTable: { Races: [] } } }) === null);

// AniList
const an = Data.parseAniList({ data: { MediaListCollection: { lists: [{ entries: [
  { media: { title: { english: null, romaji: 'B Show' }, coverImage: { medium: 'b' }, nextAiringEpisode: { episode: 5, airingAt: 2000 } } },
  { media: { title: { english: 'A Show', romaji: 'a' }, coverImage: { medium: 'a' }, nextAiringEpisode: { episode: 9, airingAt: 1000 } } },
  { media: { title: { english: 'Finished', romaji: 'f' }, coverImage: null, nextAiringEpisode: null } }] }, { entries: [
  { media: { title: { english: 'A Show', romaji: 'a' }, coverImage: { medium: 'a' }, nextAiringEpisode: { episode: 9, airingAt: 1000 } } }] }] } } });
check('anilist sorted and deduped', an.length === 2 && an[0].title === 'A Show' && an[0].at === 1000000 && an[1].title === 'B Show');

// Cinemeta
const cm = Data.parseCinemeta({ metas: [{ id: 'tt1', type: 'series', name: 'X', poster: 'p', releaseInfo: '2022-', imdbRating: '6.8', genres: ['Action'] }, { id: 'tt2', name: 'no poster' }] });
check('cinemeta', cm.length === 1 && cm[0].year === '2022-' && cm[0].genres[0] === 'Action');

// Stremio library (continue watching)
const lib = Data.parseLibrary([
  { _id: 'tt1', type: 'series', name: 'Show', poster: 'p', _mtime: '2026-11-20T10:00:00Z', state: { timeOffset: 600000, duration: 2400000, video_id: 'tt1:2:4' } },
  { _id: 'tt2', type: 'movie', name: 'Film', _mtime: '2026-11-22T10:00:00Z', state: { timeOffset: 1000, duration: 6000000, video_id: '' } },
  { _id: 'tt3', type: 'movie', name: 'Removed', removed: true, _mtime: '2026-11-23T10:00:00Z', state: { timeOffset: 5000, duration: 1 } },
  { _id: 'tt4', type: 'tv', name: 'Live', _mtime: '2026-11-23T10:00:00Z', state: { timeOffset: 5000 } },
  { _id: 'tt5', type: 'movie', name: 'Unstarted', _mtime: '2026-11-23T10:00:00Z', state: { timeOffset: 0 } }]);
check('library filter and order', lib.length === 2 && lib[0].id === 'tt2' && lib[1].id === 'tt1');
check('library up next', lib[0].upNext === true && lib[0].position === 0);
check('library episode', lib[1].season === 2 && lib[1].episode === 4 && lib[1].position === 600000);

console.log('ui tests: ' + passed + ' passed, ' + failed + ' failed');
if (failed) process.exit(1);
