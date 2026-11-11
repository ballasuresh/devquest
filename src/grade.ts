export type Check = { id: string; name: string; pass: boolean; detail: string };

function stripped(code: string) {
  return code
    .replace(/#[^\n]*/g, "")
    .replace(/'''[\s\S]*?'''/g, "")
    .replace(/"""[\s\S]*?"""/g, "");
}

function hasItemPath(src: string, resource: string, idName: string) {
  const fstring = new RegExp(`/${resource}/\\{\\s*${idName}\\s*\\}`);
  const slashLiteral = new RegExp(`["']/${resource}/["']`);
  const splitSlash = new RegExp(`["']/${resource}["']\\s*\\+\\s*["']/["']`);
  return fstring.test(src) || slashLiteral.test(src) || splitSlash.test(src);
}

function hasBadJoin(src: string, resource: string) {
  return new RegExp(`["']/${resource}["']\\s*\\+(?!\\s*["']/)`).test(src);
}

export function gradeReadBeacon(code: string): Check[] {
  const src = stripped(code);
  const hasFn = /def\s+read_beacon\s*\(/.test(src);
  const usesGet = /\.get\s*\(/.test(src);
  const pathOk = hasItemPath(src, "beacons", "beacon_id");
  const badJoin = hasBadJoin(src, "beacons") && !pathOk;
  const parses = /\.json\s*\(\s*\)/.test(src) || /json\.loads\s*\(/.test(src);
  const returnsText = /return\s+\w+\.text\b/.test(src);
  const returnsNone = /return\s+None\b/.test(src);
  const raises = /raise\s+RelayError\s*\(/.test(src);
  const checksStatus = /status_code\s*(!=|>=|>)\s*200/.test(src) || /status_code\s*>=\s*300/.test(src);
  const stringStatus = /status_code\s*(==|!=)\s*["']200["']/.test(src);

  return [
    {
      id: "fn",
      name: "Defines read_beacon",
      pass: hasFn,
      detail: hasFn ? "Function is present." : "Define read_beacon(base, beacon_id).",
    },
    {
      id: "get",
      name: "Reads with GET",
      pass: hasFn && usesGet && !/POST|PUT|PATCH|DELETE/.test(src),
      detail: usesGet ? "The call reads. It does not create or replace." : "A read uses GET, via relay.get(...).",
    },
    {
      id: "path",
      name: "Asks for one beacon",
      pass: pathOk && !badJoin,
      detail: pathOk
        ? "The path has /beacons/ and the id."
        : "Join base, /beacons/, and beacon_id. /beacons17 is a different door.",
    },
    {
      id: "json",
      name: "Returns the parsed ledger",
      pass: parses && !returnsText && !returnsNone,
      detail: parses && !returnsText && !returnsNone ? "The caller receives a dict." : "Replace return None with response.json().",
    },
    {
      id: "status",
      name: "Non-200 raises RelayError",
      pass: raises && checksStatus && !stringStatus,
      detail:
        raises && checksStatus && !stringStatus
          ? "A missing beacon fails loudly, and 200 is a number."
          : stringStatus
            ? "status_code is the number 200, not the text \"200\"."
            : "Check status_code and raise RelayError when it is not 200.",
    },
  ];
}

export function gradeFetchShelf(code: string): Check[] {
  const src = stripped(code);
  const hasFn = /def\s+fetch_shelf\s*\(/.test(src);
  const usesGet = /\.get\s*\(/.test(src);
  const pathOk = hasItemPath(src, "shelves", "shelf_id");
  const badJoin = hasBadJoin(src, "shelves") && !pathOk;
  const parses = /\.json\s*\(\s*\)/.test(src) || /json\.loads\s*\(/.test(src);
  const returnsText = /return\s+\w+\.text\b/.test(src);
  const raises = /raise\s+RelayError\s*\(/.test(src);
  const stringStatus = /status_code\s*(==|!=)\s*["']\d+["']/.test(src);
  const checksStatus = /status_code/.test(src);

  return [
    {
      id: "fn",
      name: "Defines fetch_shelf",
      pass: hasFn,
      detail: hasFn ? "Function is present." : "Keep the name fetch_shelf.",
    },
    {
      id: "path",
      name: "Slash before the shelf id",
      pass: hasFn && usesGet && pathOk && !badJoin,
      detail: pathOk && !badJoin ? "med-9 stays in its own segment." : "base + \"/shelves\" + shelf_id becomes /shelvesmed-9.",
    },
    {
      id: "status",
      name: "Compares status as a number",
      pass: checksStatus && !stringStatus,
      detail: !stringStatus && checksStatus ? "200 is an int." : "Drop the quotes around the status code.",
    },
    {
      id: "json",
      name: "Returns a dict, raises otherwise",
      pass: parses && !returnsText && raises,
      detail: parses && !returnsText && raises ? "Success is a ledger. Failure raises." : "Return response.json() on success and raise RelayError otherwise.",
    },
  ];
}

export function passed(checks: Check[]) {
  return checks.every((c) => c.pass);
}

export function simulateRead(code: string) {
  const checks = gradeReadBeacon(code);
  const path = checks.find((c) => c.id === "path")?.pass;
  const json = checks.find((c) => c.id === "json")?.pass;
  const status = checks.find((c) => c.id === "status")?.pass;
  const get = checks.find((c) => c.id === "get")?.pass;
  if (!get) {
    return "Simulated relay\nNo GET found.\nThe archive was never asked.";
  }
  if (!path) {
    return "Simulated relay\nGET https://relay.city/beacons17\n404\nThat door is not /beacons/17.";
  }
  if (!status) {
    return 'Simulated relay\nGET https://relay.city/beacons/17\nstatus_code == 200  (number)\nYour comparison missed it.\nRaised RelayError on a live beacon.';
  }
  if (!json) {
    return 'Simulated relay\nGET https://relay.city/beacons/17\n200\n"{\\"id\\":\\"17\\",\\"lit\\":true}"\n→ str\nThe test wanted a dict.';
  }
  return 'Simulated relay\nGET https://relay.city/beacons/17\n200\n{"id":"17","lit":true,"keeper":"Isha"}\n→ dict\n\nGET https://relay.city/beacons/missing\n404\nRelayError: missing';
}

export function simulateShelf(code: string) {
  const checks = gradeFetchShelf(code);
  if (!passed(checks)) {
    const bad = checks.filter((c) => !c.pass).map((c) => c.detail);
    return `Simulated relay · night-shift drop\nExpected dict {"id":"med-9","name":"serum","qty":4}\nActual: the call still fails.\n${bad.join("\n")}`;
  }
  return 'Simulated relay · night-shift drop\nGET https://relay.city/shelves/med-9\n200\n{"id":"med-9","name":"serum","qty":4}\n→ dict\n\nGET https://relay.city/shelves/nope\n404\nRelayError: missing';
}
