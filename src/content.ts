export type StageKey = "discover" | "explore" | "assign" | "predict" | "code" | "debug" | "master";

export const STAGES: { key: StageKey; label: string; job: string; xp: number }[] = [
  { key: "discover", label: "Discover", job: "Interest", xp: 10 },
  { key: "explore", label: "Explore", job: "Depth & recall", xp: 15 },
  { key: "assign", label: "Assign", job: "Transfer", xp: 15 },
  { key: "predict", label: "Predict", job: "Commit first", xp: 15 },
  { key: "code", label: "Code", job: "Build", xp: 25 },
  { key: "debug", label: "Debug", job: "Repair", xp: 20 },
  { key: "master", label: "Master", job: "Create", xp: 25 },
];

export type CodexStage = {
  key: StageKey;
  beat: string;
  does: string;
  refuses: string;
};

export type MissionDef = {
  id: string;
  num: string;
  title: string;
  topic: string;
  minutes: number;
  playable: boolean;
  objective: string;
  interest: string;
  taste: { prompt: string; options: { id: string; label: string; nova: string }[] };
  stages: CodexStage[];
};

export const MODULE = {
  world: "The Helix Relay",
  module: "Module 03",
  subject: "APIs & LLM Integration",
  level: "Intermediate",
  city: "Codeopolis",
  outcome:
    "Call a service on purpose: name one resource, choose a verb, read the status, parse JSON, keep secrets out of the file, consume a stream, and set model parameters for the job in front of you.",
};

export const MISSIONS: MissionDef[] = [
  {
    id: "archive",
    num: "3.1",
    title: "The Endpoint Archive",
    topic: "REST APIs and JSON",
    minutes: 25,
    playable: true,
    objective:
      "Point at one resource, choose a verb that matches the intent, read a status, and return parsed JSON from Python without crashing on a missing id.",
    interest:
      "Three civic counters fail in one night. Nobody says REST. You leave with a question you wish the city could answer precisely.",
    taste: {
      prompt: "The night market is already open inside the mission.",
      options: [
        { id: "play", label: "Enter the archive", nova: "Bring the itch, not the vocabulary." },
        { id: "vague", label: "I already know GET and POST", nova: "Then the counters will feel too small. The work is judging which verb destroys a record." },
      ],
    },
    stages: [
      {
        key: "discover",
        beat: "Eavesdrop on three counters. A whole market book answers one stall. A one-line change erases an owner. A scribble cannot be read by the next desk.",
        does: "You mark what snags your interest and choose the question you would actually ask. No term is taught. Any sincere question lets you through.",
        refuses: "Definitions of REST, status-code tables, and Python.",
      },
      {
        key: "explore",
        beat: "A different object: beacons in the spire. You ask for the cabinet, then for beacon 17, fire GET twice, wipe a field with PUT, keep it with PATCH, and meet a 404.",
        does: "After the labs, the counters stay shut. Recall maps the new tools back to what you noticed, plus one idea you only practised here: a second GET does not change the beacon.",
        refuses: "Replaying the night-market dialogue or re-listing the same three failures as a lecture.",
      },
      {
        key: "assign",
        beat: "Isha moves you to the clinic. New nouns: shelves and medicine. Same discipline.",
        does: "Read med-9, create a delivery, change only the quantity.",
        refuses: "The beacon ledger and the market story.",
      },
      {
        key: "predict",
        beat: "Three short Python calls against the beacon archive. You commit the printout before the relay runs.",
        does: "You read code and forecast status, leftover fields, and a 201.",
        refuses: "Choosing verbs from a fresh menu. That was Assign.",
      },
      {
        key: "code",
        beat: "Forge read_beacon. One id, parsed JSON, RelayError when the status is not 200.",
        does: "Run shows the simulated relay. Check grades the contract.",
        refuses: "Streaming, API keys, and temperature.",
      },
      {
        key: "debug",
        beat: "The night-shift shelf function builds /shelvesmed-9, compares status to the text \"200\", and returns raw text.",
        does: "You repair fetch_shelf. Hints point. They never paste the function.",
        refuses: "The same three lines as the beacon starter.",
      },
      {
        key: "master",
        beat: "You design a contract the archive has never shown you: departures. Then you decide who should filter ten thousand rows.",
        does: "Paths, verbs, statuses, a retry judgement, and a reason that is about the wire, not about taste.",
        refuses: "A second quiz on PUT versus PATCH.",
      },
    ],
  },
  {
    id: "vault",
    num: "3.2",
    title: "The Key Vault",
    topic: "Calling APIs from Python",
    minutes: 30,
    playable: false,
    objective:
      "Call an HTTP API with requests or httpx, a timeout, a retry only when it can help, and a key that never sits in source.",
    interest:
      "A courier copies the vault key onto a poster so the night shift can get in. By morning the poster has been photographed.",
    taste: {
      prompt: "Where does your attention go?",
      options: [
        { id: "poster", label: "The key is now public", nova: "Hold that. The next floor teaches the call. This itch is about where the secret lives." },
        { id: "slow", label: "The vault is just slow", nova: "Slowness is a timeout. The photograph is a different failure. Keep them apart." },
        { id: "verb", label: "They used the wrong HTTP verb", nova: "That was the archive. Don't repeat it. The door here already knows the verb." },
      ],
    },
    stages: [
      {
        key: "discover",
        beat: "The vault opens for anyone holding the poster. Nothing about requests yet.",
        does: "You name the itch: a secret in public, a wait with no limit, or a retry that keeps asking after a refusal.",
        refuses: "Another REST lecture. Verbs stay in 3.1.",
      },
      {
        key: "explore",
        beat: "Depth: base URL, timeout, retry on 503 only, environment variable, .env excluded from the commit, 401 versus 404.",
        does: "Recall: the poster is the key in the file. You are not asked which verb reads a beacon.",
        refuses: "PUT versus PATCH, JSON shape drills, streaming.",
      },
      {
        key: "assign",
        beat: "Pick the call that reads the key from the environment and sets a timeout. Misconceptions: hardcoded key, retry on 401, timeout omitted.",
        does: "Transfer to a weather siren, not the vault door from the story.",
        refuses: "The poster scene as a second comic.",
      },
      {
        key: "predict",
        beat: "Commit what a 0.2s timeout does to a slow vault, and what os.environ raises when the key was never set.",
        does: "Forecast before the run.",
        refuses: "A status-code table.",
      },
      {
        key: "code",
        beat: "Write call_vault() that GETs with a timeout and Authorization from the environment.",
        does: "Hidden checks: no string literal that looks like a key, timeout present, non-200 raises.",
        refuses: "Parsing chat-completion JSON. That is 3.3.",
      },
      {
        key: "debug",
        beat: "Three faults: key in the source, retry loop on 401, no timeout.",
        does: "Hint ladder points at the fault class, not the patched function.",
        refuses: "The shelf-path bug from 3.1.",
      },
      {
        key: "master",
        beat: "Write the night-shift policy: what may be retried, what must never be logged, what a missing env var should do.",
        does: "A short policy card, scored against the same rules.",
        refuses: "Designing a new resource path.",
      },
    ],
  },
  {
    id: "switchyard",
    num: "3.3",
    title: "The Model Switchyard",
    topic: "LLM API calls",
    minutes: 30,
    playable: false,
    objective:
      "Send an OpenAI-compatible chat completion and read the assistant text from the response, including the empty-choices failure.",
    interest:
      "Two clerks answer one citizen. One read a binder. One is a model. The citizen cannot tell which voice they heard.",
    taste: {
      prompt: "What do you want to know before anyone shows you a payload?",
      options: [
        { id: "voice", label: "How a program asks a model at all", nova: "Good. It is still an HTTP call. The new part is the body that means 'continue'." },
        { id: "magic", label: "Which model is the smartest", nova: "The switchyard will not rank models. It will show you the shape of the ask." },
        { id: "rest", label: "Remind me what POST means", nova: "POST creates a completion. We will use that, not reteach it." },
      ],
    },
    stages: [
      {
        key: "discover",
        beat: "You hear both answers and notice only one of them can be called from code. No JSON yet.",
        does: "Interest: a model call is a request with a conversation inside it.",
        refuses: "The messages schema. That is depth, and it waits.",
      },
      {
        key: "explore",
        beat: "Depth: model, messages[{role, content}], reply at choices[0].message.content, empty choices, OpenAI-compatible POST.",
        does: "Recall uses the citizen: which role is the binder's rule, which is the citizen, which field is the voice you heard.",
        refuses: "A second tour of status codes, timeouts, or the poster key. 401 is mentioned once, as the vault's problem.",
      },
      {
        key: "assign",
        beat: "Map a clinic question onto system, user, and assistant. Wrong roles are the misconception.",
        does: "A new case, not the two clerks.",
        refuses: "Streaming tokens.",
      },
      {
        key: "predict",
        beat: "Given a completion payload, commit which string is spoken aloud, and what an empty choices list should do.",
        does: "Commit before reveal.",
        refuses: "Writing the call. That is Code.",
      },
      {
        key: "code",
        beat: "ask_switchyard(messages) -> str. Raise if choices is empty. Do not return the whole payload.",
        does: "Checks the path into the JSON, not your prose.",
        refuses: "Temperature flags. Those are 3.6.",
      },
      {
        key: "debug",
        beat: "Reads choices[0]['text'], pastes the API key into the user message, returns the raw dict.",
        does: "Three faults, hint ladder, code kept.",
        refuses: "The shelf URL bug.",
      },
      {
        key: "master",
        beat: "A case where putting the rule in the user message changes the answer. You say why the system role exists.",
        does: "Judgement, then one corrected messages list.",
        refuses: "A multi-turn window. That is 3.4.",
      },
    ],
  },
  {
    id: "loop",
    num: "3.4",
    title: "The Conversation Loop",
    topic: "Multi-turn context",
    minutes: 25,
    playable: false,
    objective:
      "Keep a bounded message list in order, resend it on each turn, and trim without dropping the instruction that still matters.",
    interest:
      "A citizen says 'the red one'. The clerk answers about a red train. They were talking about medicine.",
    taste: {
      prompt: "What failed?",
      options: [
        { id: "memory", label: "The second sentence depended on the first", nova: "Hold that. The model does not remember your process. You resend the ledger." },
        { id: "model", label: "The model is bad at colour", nova: "Colour is a distraction. The lost fact is the medicine." },
        { id: "verb", label: "The HTTP verb was wrong", nova: "The call succeeded. The history was the failure. Don't repeat 3.1." },
      ],
    },
    stages: [
      {
        key: "discover",
        beat: "You watch the misunderstanding. You do not see a messages array.",
        does: "You leave wanting to know what the clerk was holding in their head.",
        refuses: "The chat schema lecture. You already built one call in 3.3.",
      },
      {
        key: "explore",
        beat: "Depth: resend the list, order matters, the window is finite, trimming drops old turns, the model has no other memory.",
        does: "Recall: 'the red one' fails when the medicine turn is the one you trimmed. A new question: what is still in the list after a trim to 3.",
        refuses: "Re-explaining role names from scratch.",
      },
      {
        key: "assign",
        beat: "Four turns, a limit of three. Choose which to keep so the new decision survives.",
        does: "A transit case, not the medicine story.",
        refuses: "Token streaming.",
      },
      {
        key: "predict",
        beat: "Commit the answer the model gives if the system line was the one trimmed.",
        does: "Forecast from a printed history.",
        refuses: "Editing code yet.",
      },
      {
        key: "code",
        beat: "append_turn and trim(history, max_messages) that never reverses order and never copies only the latest user line.",
        does: "Tests check length, order, and roles.",
        refuses: "Parameter tuning.",
      },
      {
        key: "debug",
        beat: "Appends only the newest user line, reverses the list, stores the assistant as role user.",
        does: "Repair the loop.",
        refuses: "URL joining.",
      },
      {
        key: "master",
        beat: "The citizen changes their mind. Build the shortest history that follows the new decision and still keeps the safety rule.",
        does: "A created history, scored against those two constraints.",
        refuses: "A fresh role-definition quiz.",
      },
    ],
  },
  {
    id: "stream",
    num: "3.5",
    title: "The Frozen Stream",
    topic: "Streaming responses",
    minutes: 25,
    playable: false,
    objective:
      "Consume a server-sent stream: flush each token, skip empty deltas, read usage on the last event, and give up on a stall.",
    interest:
      "A reply reaches the city as 'The beacon is li' and never finishes. People are still waiting.",
    taste: {
      prompt: "What snags you?",
      options: [
        { id: "half", label: "I heard the first half. Why did it stop?", nova: "That is the mission. A stream can be alive and still never close." },
        { id: "rest", label: "Which REST verb is this?", nova: "The verb already worked. The new failure is between chunks. We will not reteach the archive." },
        { id: "temp", label: "Turn the creativity down", nova: "That dial is the next chamber. Here the words are frozen, not wild." },
      ],
    },
    stages: [
      {
        key: "discover",
        beat: "You stand in the hall and hear the sentence stop. You do not see SSE yet.",
        does: "Interest in a reply that arrives in pieces.",
        refuses: "flush, delta.content, and usage. Those are the depth.",
      },
      {
        key: "explore",
        beat: "Depth: event stream, delta.content, flush, empty final chunk, usage on the last event, a stall timer. A side-by-side of buffered versus streamed, labelled Simulated.",
        does: "Recall: the frozen word was a chunk, not a broken resource path. Second recall: breaking when you see usage means you never log it.",
        refuses: "GET versus POST, JSON contracts, API keys, temperature.",
      },
      {
        key: "assign",
        beat: "Isha wants tokens on screen as they arrive, and no crash on the empty chunk.",
        does: "Choose the consumer. Wrong: print without flush, buffer everything, print the word None.",
        refuses: "The beacon contract from 3.1.",
      },
      {
        key: "predict",
        beat: "A snippet does text += token when content is missing. You commit the outcome before the run.",
        does: "The committed answer is TypeError, not a status code.",
        refuses: "A REST prediction item.",
      },
      {
        key: "code",
        beat: "consume_stream flushes, guards None, logs prompt and completion tokens, returns the joined sentence.",
        does: "Checks are about the stream, not about URLs.",
        refuses: "read_beacon.",
      },
      {
        key: "debug",
        beat: "Three faults: concatenate None, print without flush, break when usage arrives.",
        does: "Hint ladder, no pasted function.",
        refuses: "The shelf path, the quoted status, the raw text return.",
      },
      {
        key: "master",
        beat: "The clerk holds a stall. You set a read timeout and a junk-delta filter. Usage may be incomplete. That is an honest log, not a crash.",
        does: "Boss defence, then the stream badge.",
        refuses: "Designing a new REST resource.",
      },
    ],
  },
  {
    id: "chamber",
    num: "3.6",
    title: "The Temperature Chamber",
    topic: "Parameter tuning",
    minutes: 25,
    playable: false,
    objective:
      "Set temperature, top_p, max_tokens, stop, and penalties for the job, and say what each one changes.",
    interest:
      "The same question goes out on three mornings. One answer is reckless, one repeats a word, one is fit to post as a civic notice.",
    taste: {
      prompt: "Which morning bothers you?",
      options: [
        { id: "wild", label: "A safety notice should not gamble", nova: "Hold that. 'More random' is not the same as 'more thoughtful'." },
        { id: "cut", label: "One notice ends mid-sentence", nova: "That is a ceiling on length, not a mood. You will separate the dials." },
        { id: "stream", label: "It should have streamed", nova: "The words all arrived. The dial was wrong. Don't repeat the frozen stream." },
      ],
    },
    stages: [
      {
        key: "discover",
        beat: "You read the three notices. No parameter names yet.",
        does: "You pick which failure is a gamble, which is a cut-off, which is a stutter.",
        refuses: "The numbers. Naming temperature here would skip the interest.",
      },
      {
        key: "explore",
        beat: "Depth: temperature, top_p, max_tokens, stop, frequency penalty. Each dial gets one civic before-and-after, not a glossary dump.",
        does: "Recall: which morning was max_tokens, which was temperature, which was repetition. The notices are not reprinted in full.",
        refuses: "SSE, message roles, REST verbs.",
      },
      {
        key: "assign",
        beat: "Choose settings for a legal notice and for a street-naming brainstorm. They are not the same settings.",
        does: "Transfer to two jobs.",
        refuses: "One 'best temperature' for every task.",
      },
      {
        key: "predict",
        beat: "Commit which of two runs repeats itself, and which stops at the stop sequence.",
        does: "Forecast before the samples are shown.",
        refuses: "Writing the client.",
      },
      {
        key: "code",
        beat: "complete(prompt, temperature, max_tokens) passes the numbers through and logs usage. It does not hide defaults that contradict the caller.",
        does: "Checks the arguments you send.",
        refuses: "A stream consumer.",
      },
      {
        key: "debug",
        beat: "Temperature passed as text, max_tokens 0, a stop sequence that eats the first word.",
        does: "Repair the call.",
        refuses: "Auth headers.",
      },
      {
        key: "master",
        beat: "Tune a notice so it stays stable, and a naming list so it varies. Justify both in one sentence each.",
        does: "Two settings, two reasons, same model.",
        refuses: "A recap quiz of the whole module.",
      },
    ],
  },
];

export const CAST = [
  { id: "mahesh", name: "Mahesh", role: "Archivist" },
  { id: "anika", name: "Anika", role: "Analyst" },
  { id: "rafi", name: "Rafi", role: "Engineer" },
  { id: "leela", name: "Leela", role: "Captain" },
];

export const STARTER_READ = `def read_beacon(base, beacon_id):
    url = base + "/beacons/" + beacon_id
    response = relay.get(url)
    # Return the parsed ledger when status_code is 200.
    # Otherwise raise RelayError("missing").
    return None
`;

export const BUGGY_SHELF = `def fetch_shelf(base, shelf_id):
    url = base + "/shelves" + shelf_id
    response = relay.get(url)
    if response.status_code == "200":
        return response.text
    raise RelayError("missing")
`;

export const DISCOVER_SCENES = [
  {
    id: "book",
    place: "Stall counter",
    line: "Vendor: “Is stall 17 open?” Clerk drops a forty-page market book on the counter.",
    prompt: "What snags your interest?",
    options: [
      { id: "one", label: "I want to ask for one stall, not the whole market", nova: "Hold that. Precision is the itch. Don't name a tool yet." },
      { id: "fast", label: "I want the answer to arrive faster", nova: "Speed is a later mission, on a stream. Tonight, notice what was asked." },
      { id: "pretty", label: "I want the book to look nicer", nova: "Ink is not the failure. The next desk still has to understand the reply." },
    ],
  },
  {
    id: "erase",
    place: "Ledger desk",
    line: "A runner says the lamp is off. The clerk erases the whole stall page and writes one new line. The owner's name is gone.",
    prompt: "What snags your interest?",
    options: [
      { id: "part", label: "A small change destroyed everything else", nova: "Remember the loss, not a verb. The archive will show you a stamp that does this." },
      { id: "rude", label: "The clerk was careless with paper", nova: "Careless is a mood. The page lost a fact that was not part of the change." },
      { id: "slow", label: "Rewriting the page takes too long", nova: "Time is not the wound. The owner is." },
    ],
  },
  {
    id: "scribble",
    place: "Transit board",
    line: "A reply arrives as “open yes maybe 17??”. The board cannot place it. The lamp never changes.",
    prompt: "What snags your interest?",
    options: [
      { id: "shape", label: "Nobody agreed what a reply should look like", nova: "A shared shape. We'll build one upstairs. Not here." },
      { id: "loud", label: "The clerk should have spoken louder", nova: "Volume won't help the board. It needs a shape it was promised." },
      { id: "lamp", label: "The lamp hardware is faulty", nova: "The lamp was waiting for a fact. The fact never arrived in a form it could use." },
    ],
  },
];

export const QUESTIONS = [
  { id: "precise", label: "Is stall 17 open?" },
  { id: "dump", label: "Give me the whole market." },
  { id: "vague", label: "Make it different." },
];

export const RECALL = [
  {
    id: "path",
    prompt: "The market clerk answered with the whole book. Which ask would have stopped that?",
    options: [
      { id: "item", label: "A path that names one resource" },
      { id: "faster", label: "A faster archive" },
      { id: "font", label: "A clearer font" },
    ],
    correct: "item",
    why: "A path such as /beacons/17 names one thing. Speed and ink were never the failure.",
  },
  {
    id: "json",
    prompt: "The transit board could not read “open yes maybe”. What replaces that scribble?",
    options: [
      { id: "json", label: "A JSON object with agreed keys" },
      { id: "louder", label: "A louder shout" },
      { id: "200", label: "The number 200 by itself" },
    ],
    correct: "json",
    why: "200 only says the call worked. The board still needs a ledger: keys and values.",
  },
  {
    id: "safe",
    prompt: "You sent GET /beacons/17 twice on the bench. What should the second call do to the beacon?",
    options: [
      { id: "same", label: "Leave it unchanged" },
      { id: "toggle", label: "Toggle the lamp" },
      { id: "wipe", label: "Remove the keeper" },
    ],
    correct: "same",
    why: "GET is safe. You watched the lamp stay still. PUT was the stamp that removed the keeper.",
  },
];

export const ASSIGN = [
  {
    id: "read",
    prompt: "The clinic asks: what is on shelf med-9?",
    options: [
      { id: "one", label: "GET /shelves/med-9", note: "200 and one ledger" },
      { id: "all", label: "GET /shelves", note: "200 and every shelf" },
      { id: "post", label: "POST /shelves/med-9", note: "tries to create" },
    ],
    correct: "one",
    wrong: {
      all: "That asks for every shelf. The clinic named med-9.",
      post: "POST creates. The shelf is already there. You only needed to look.",
    },
  },
  {
    id: "create",
    prompt: "A new delivery has no shelf record yet. How do you record it?",
    options: [
      { id: "post", label: "POST /shelves", note: "expect 201" },
      { id: "put", label: "PUT /shelves/med-9", note: "expect 200" },
      { id: "get", label: "GET /shelves", note: "expect 200" },
    ],
    correct: "post",
    wrong: {
      put: "PUT replaces a record you already named. A new delivery is a create: POST, and 201 says it now exists.",
      get: "GET does not write the delivery down.",
    },
  },
  {
    id: "patch",
    prompt: "Only the quantity changes. The drug name must stay.",
    options: [
      { id: "patch", label: "PATCH /shelves/med-9  {qty: 4}", note: "one field" },
      { id: "put", label: "PUT /shelves/med-9  {qty: 4}", note: "whole record" },
      { id: "post", label: "POST /shelves/med-9  {qty: 4}", note: "another create" },
    ],
    correct: "patch",
    wrong: {
      put: "PUT replaces the whole record. The name was not in the body, so the name would disappear. You already saw a keeper vanish.",
      post: "POST would try to create again. You are changing a shelf that exists.",
    },
  },
];

export const PREDICT = [
  {
    id: "get",
    code: `status, body = relay.request("GET", "/beacons/17")
print(status)
print(body["lit"])`,
    note: "The archive holds {\"id\":\"17\",\"lit\":false,\"keeper\":\"Isha\"}.",
    options: ["200 then False", "200 then True", "404 then an error", "the whole cabinet"],
    correct: 0,
    why: "GET returns 200 and the ledger as it is. lit is false. Nothing is rewritten.",
  },
  {
    id: "patch",
    code: `status, body = relay.request(
    "PATCH", "/beacons/17", {"lit": True}
)
print(body["keeper"], body["lit"])`,
    note: "Before the call the keeper is Isha and the lamp is off.",
    options: ["Isha True", "None True", "Isha False", "an error, 404"],
    correct: 0,
    why: "PATCH changes lit and leaves keeper. None True would be the PUT habit: a body that omitted the keeper.",
  },
  {
    id: "post",
    code: `status, body = relay.request(
    "POST", "/beacons", {"name": "East"}
)
print(status)
print("id" in body)`,
    note: "The archive accepts the create and assigns an id.",
    options: ["201 then True", "200 then False", "404 then False", "500 then True"],
    correct: 0,
    why: "A create answers 201 and returns the new ledger, including the id the archive assigned.",
  },
];

export const CONTRACT = [
  { id: "collection", label: "Collection", correct: "/departures", options: ["/departures", "/departure", "/getDepartures"] },
  { id: "item", label: "One departure", correct: "/departures/{id}", options: ["/departures/{id}", "/departures", "/departure?id="] },
  { id: "read", label: "Read one", correct: "GET → 200", options: ["GET → 200", "POST → 200", "GET → 201"] },
  { id: "create", label: "Create", correct: "POST → 201", options: ["POST → 201", "PUT → 200", "GET → 201"] },
  { id: "partial", label: "Change only the platform", correct: "PATCH", options: ["PATCH", "PUT", "POST"] },
  { id: "missing", label: "No such departure", correct: "404", options: ["404", "200", "500"] },
];

export const MASTER_Q = [
  {
    id: "retry",
    prompt: "The board retries a request after a blink. Which retry can create a second departure?",
    options: [
      { id: "post", label: "POST" },
      { id: "get", label: "GET" },
      { id: "put", label: "PUT of the same body" },
    ],
    correct: "post",
    why: "POST is not a promise that a second call is harmless. GET reads. PUT of the same body replaces the same record.",
  },
  {
    id: "created",
    prompt: "Why answer 201 instead of 200?",
    options: [
      { id: "new", label: "A new resource exists that did not before" },
      { id: "faster", label: "201 is the faster success" },
      { id: "json", label: "201 means the body is JSON" },
    ],
    correct: "new",
    why: "Both can carry JSON. 201 tells the caller that a create happened.",
  },
  {
    id: "fault",
    prompt: "A 500 comes back and the request was well formed. Who repairs it?",
    options: [
      { id: "archive", label: "The archive" },
      { id: "caller", label: "The caller, by changing the verb" },
      { id: "board", label: "The transit board's font" },
    ],
    correct: "archive",
    why: "5xx is the service failing. A bad path or a bad body would have been 4xx.",
  },
];

export const CODE_HINTS = [
  "One beacon, not the cabinet. The path needs a slash and the id.",
  "The body on the wire is text until you parse it. status_code is a number.",
  "Look at the path you build, the status check, and the value you return. Do not copy a finished function from anywhere — the three lines are already in your editor.",
];

export const DEBUG_HINTS = [
  "Write the path for shelf med-9 by hand. Compare it with the string this function builds.",
  "Success is the number 200. The ledger is not response.text.",
  "The faults sit on the url line, the status comparison, and the return. The hint stops there.",
];

export const REVIEW: Record<StageKey, string> = {
  discover: "Interest only. Vocabulary is withheld on purpose. Leaving does not require a correct answer.",
  explore: "Depth uses beacons, a new object. Recall asks you to map that depth onto memory. The counter dialogue is not replayed.",
  assign: "Transfer to shelves. Feedback names the misconception. The market scene does not return.",
  predict: "Commit the output before the simulated run. Items test reading, not verb menus.",
  code: "Build read_beacon. Simulated relay, labelled. Hints never paste the solution.",
  debug: "A different function, three different faults. Code is kept on failure.",
  master: "Create a departures contract the mission has not taught as an example, then judge a filter.",
};
