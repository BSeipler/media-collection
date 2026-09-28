import { readFileSync } from "node:fs";
import { connect } from "@tursodatabase/serverless";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);
const key = env.TMDB_API_KEY;
const apply = process.argv.includes("--apply");
const db = connect({
  url: env.TURSO_DATABASE_URL,
  authToken: env.TURSO_AUTH_TOKEN,
});

const SKIP =
  /\b(lot of|boxed set|box set|\d\s*lot|sheet music|folio|serials|volume\s+\d+|collection|national parks)\b/i;

function norm(s) {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|a|an)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function yearOf(date) {
  if (!date || date.length < 4) return null;
  const y = Number.parseInt(date.slice(0, 4), 10);
  return Number.isFinite(y) ? y : null;
}

const DROP = new Set(
  `sealed watermark watermarks vcr video tape tapes movie movies used new factory brand buy get free shipping good rare oop starring staring directed by vintage tested pre owned warner bros paramount pictures lions gate walt disney action thriller horror western drama comedy sci fi martial arts adventure cult rated color colour set lot john wayne clint eastwood sylvester stallone arnold schwarzenegger jackie chan elvis presley harrison ford mel gibson nicolas cage tom berenger chevy chase kevin bacon brad pitt vhs dvd ntsc mint excellent condition previously viewed clamshell igs ready oop bonus footage universal cbs fox home entertainment pictures studio studios tape with stamp wrapper very hosted small classic classics ultimate hits release tested`.split(
    /\s+/,
  ),
);

function searchable(title) {
  const words = title
    .replace(/[*_!?'.]+/g, " ")
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .replace(/\b(19|20)\d{2}\b/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !DROP.has(w.toLowerCase()));
  return words
    .filter((w) => !/^g\d+$/i.test(w))
    .slice(0, 3)
    .join(" ");
}

const FORCE = {
  1: { title: "City of Angels", year: 1998, tmdb: null },
  7: { title: "Judgment Night", year: 1993, tmdb: null },
  8: { title: "Frosty the Snowman", year: 1969, tmdb: null },
  9: { title: "The Peacemaker", year: 1997, tmdb: null },
  11: { title: "Terminator 3: Rise of the Machines", year: 2003, tmdb: null },
  14: { title: "Air Force One", year: 1997, tmdb: null },
  21: { title: "Starship Troopers", year: 1997, tmdb: null },
  22: { title: "Hollow Man", year: 2000, tmdb: null },
  23: { title: "National Lampoon's European Vacation", year: 1985, tmdb: null },
  24: { title: "Small Soldiers", year: 1998, tmdb: null },
  41: { title: "Anaconda", year: 1997, tmdb: null },
  44: { title: "Men in Black II", year: 2002, tmdb: null },
  47: { title: "Komodo", year: 1999, tmdb: null },
  48: { title: "The Road Warrior", year: 1981, tmdb: null },
  49: { title: "The Time Machine", year: 2002, tmdb: null },
  60: { title: "Mr. Nice Guy", year: 1997, tmdb: null },
  62: { title: "Enter the Dragon", year: 1973, tmdb: null },
  82: { title: "Ghost Ship", year: 2002, tmdb: null },
  87: { title: "The Matrix Revolutions", year: 2003, tmdb: null },
  98: { title: "Red Heat", year: 1988, tmdb: null },
  105: { title: "Red River", year: 1948, tmdb: null },
  106: { title: "3 Ninjas", year: 1992, tmdb: null },
  113: { title: "3 Ninjas", year: 1992, tmdb: null },
  117: { title: "El Condor", year: 1970, tmdb: null },
  128: { title: "First Strike", year: 1996, tmdb: null },
  130: { title: "Bad Girls", year: 1994, tmdb: null },
  145: { title: "It", year: 1990, tmdb: null },
  148: { title: "Tombstone", year: 1993, tmdb: null },
  153: { title: "Lionheart", year: 1990, tmdb: null },
  158: { title: "Bulletproof", year: 1996, tmdb: null },
  159: { title: "Old Gringo", year: 1989, tmdb: null },
  160: { title: "Passenger 57", year: 1992, tmdb: null },
  185: { title: "Marked for Death", year: 1990, tmdb: null },
  186: { title: "American Graffiti", year: 1973, tmdb: null },
  189: { title: "Resident Evil", year: 2002, tmdb: null },
  197: { title: "Shanghai Noon", year: 2001, tmdb: null },
  200: { title: "Fire Down Below", year: 1997, tmdb: null },
  201: { title: "Species", year: 1995, tmdb: null },
  205: { title: "Collateral Damage", year: 2002, tmdb: null },
  212: { title: "Joe Kidd", year: 1972, tmdb: null },
  218: { title: "Predator", year: 1987, tmdb: null },
  219: { title: "Aliens", year: 1986, tmdb: null },
  220: { title: "Clambake", year: 1967, tmdb: null },
  222: { title: "Freejack", year: 1992, tmdb: null },
  227: { title: "Black Dog", year: 1998, tmdb: null },
  232: { title: "Marked for Death", year: 1990, tmdb: null },
  234: { title: "Stagecoach", year: 1939, tmdb: null },
  246: { title: "Shenandoah", year: 1965, tmdb: null },
  258: { title: "The Score", year: 2001, tmdb: null },
  265: { title: "Hondo", year: 1953, tmdb: null },
  266: { title: "Flying Leathernecks", year: 1951, tmdb: null },
  284: { title: "Hatari", year: 1962, tmdb: null },
  294: { title: "The Comancheros", year: 1961, tmdb: null },
  295: { title: "Flying Tigers", year: 1942, tmdb: null },
  300: { title: "Hondo", year: 1953, tmdb: null },
  303: { title: "Top Dog", year: 1995, tmdb: null },
  305: { title: "Double Impact", year: 1991, tmdb: null },
  306: { title: "Bloodsport", year: 1988, tmdb: null },
  309: { title: "Cahill U.S. Marshal", year: 1973, tmdb: null },
  310: { title: "Midway", year: 1976, tmdb: null },
  312: { title: "In Harm's Way", year: 1965, tmdb: null },
  313: { title: "Anzio", year: 1968, tmdb: null },
  316: { title: "Rooster Cogburn", year: 1975, tmdb: null },
  112: { title: "Double Dragon", year: 1994, tmdb: null },
  118: { title: "Home in Oklahoma", year: 1946, tmdb: null },
  120: { title: "Boot Hill", year: 1969, tmdb: null },
  122: { title: "Wild Orchid", year: 1989, tmdb: null },
  129: { title: "Chuka", year: 1967, tmdb: null },
  132: { title: "Immortal Combat", year: 1994, tmdb: null },
  152: { title: "A Cry in the Wilderness", year: 1974, tmdb: null },
  169: { title: "Skin Deep", year: 1989, tmdb: null },
  215: { title: "Dinosaurus!", year: 1960, tmdb: null },
  268: { title: "Comanche Moon", year: 2008, tmdb: null },
  96: { title: "R.P.M.", year: 1970, tmdb: null },
  231: null,
};

function score(listing, candidate) {
  const listingN = norm(listing);
  const titleN = norm(candidate.title || candidate.name || "");
  if (!titleN || titleN.length < 3) return 0;
  const tokens = titleN.split(" ").filter((t) => t.length > 1);
  if (!tokens.length) return 0;
  if (listingN === titleN) return 100;
  if (listingN.startsWith(`${titleN} `) || listingN.startsWith(titleN)) return 92;
  const whole = tokens.every((t) => new RegExp(`\\b${t}\\b`).test(listingN));
  if (!whole) return 0;
  if (tokens.length === 1) {
    return new RegExp(`^${tokens[0]}\\b`).test(listingN) ? 84 : 0;
  }
  return 78 + Math.min(tokens.length, 6);
}

async function tmdb(path) {
  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set("api_key", key);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const items = await db.all(
  "SELECT id, title, year, format, tmdb_id, poster_path FROM items ORDER BY id",
);

const changes = [];
const skipped = [];

for (const item of items) {
  if (Object.prototype.hasOwnProperty.call(FORCE, item.id)) {
    const forced = FORCE[item.id];
    if (!forced) {
      skipped.push(`${item.id}\tSKIP forced\t${item.title}`);
      continue;
    }
    changes.push({
      id: item.id,
      from: item.title,
      to: forced.title,
      year: forced.year,
      tmdb: forced.tmdb,
      poster: item.poster_path ? null : null,
    });
    continue;
  }

  const messy =
    /sealed|watermark|vcr|video tape|buy 2|free shipping|clamshell|igs |previously viewed|factory|brand new|starring|staring|directed by|tape set|pre-?owned|oop\b|watermarks/i.test(
      item.title,
    );
  if (item.year != null && !messy) continue;

  if (SKIP.test(item.title)) {
    skipped.push(`${item.id}\tSKIP set/lot\t${item.title}`);
    continue;
  }

  const q = searchable(item.title);
  if (q.length < 3) {
    skipped.push(`${item.id}\tSKIP short\t${item.title}`);
    continue;
  }

  await sleep(80);
  const data = await tmdb(
    `/search/movie?query=${encodeURIComponent(q)}&include_adult=false`,
  );
  let results = (data.results ?? []).slice(0, 6).map((m) => ({
    ...m,
    y: yearOf(m.release_date),
    s: score(item.title, m),
  }));
  if (item.format === "vhs") {
    results = results.filter((m) => m.y == null || m.y <= 2007);
  }
  results.sort((a, b) => b.s - a.s || (b.popularity ?? 0) - (a.popularity ?? 0));
  const best = results[0];
  const second = results[1];
  if (!best || best.s < 78) {
    skipped.push(`${item.id}\tNO MATCH (${q})\t${item.title}`);
    continue;
  }
  if (second && second.s >= best.s - 8 && second.id !== best.id && second.y !== best.y) {
    skipped.push(
      `${item.id}\tAMBIG ${best.title} (${best.y}) vs ${second.title} (${second.y})\t${item.title}`,
    );
    continue;
  }

  const nextTitle = best.title;
  const nextYear = best.y;
  if (nextTitle === item.title && nextYear === item.year) continue;

  changes.push({
    id: item.id,
    from: item.title,
    to: nextTitle,
    year: nextYear,
    tmdb: best.id,
    poster: item.poster_path ? null : best.poster_path,
  });
}

console.log(`CHANGES ${changes.length}`);
for (const c of changes) {
  console.log(`${c.id}\t${c.year}\t${c.to}\t<=\t${c.from}`);
}
console.log(`\nSKIPPED ${skipped.length}`);
for (const line of skipped) console.log(line);

if (apply) {
  for (const c of changes) {
    if (c.poster) {
      await db.run(
        "UPDATE items SET title = ?, year = ?, tmdb_id = ?, poster_path = COALESCE(poster_path, ?), updated_at = datetime('now') WHERE id = ?",
        c.to,
        c.year,
        c.tmdb,
        c.poster,
        c.id,
      );
    } else {
      await db.run(
        "UPDATE items SET title = ?, year = ?, tmdb_id = COALESCE(tmdb_id, ?), updated_at = datetime('now') WHERE id = ?",
        c.to,
        c.year,
        c.tmdb,
        c.id,
      );
    }
  }
  console.log(`APPLIED ${changes.length}`);
}
