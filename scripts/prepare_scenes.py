"""Parse the 180-beat storyboard, align it to the word-level transcript,
and emit build/scenes.json for the composition builder."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MD = ROOT / "php2shell_cve_2026_youtube_script.md"
VO = ROOT / "build/vo.json"
OUT = ROOT / "build/scenes.json"

# ------------------------------------------------------------------ parse md
rows = []
for line in MD.read_text(encoding="utf-8").splitlines():
    if not line.startswith("| **#"):
        continue
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    if len(cells) < 6:
        continue
    idx = int(re.sub(r"\D", "", cells[0]))
    ts = re.sub(r"[`*]", "", cells[1])
    layout = re.sub(r"[`*]", "", cells[2])
    headline = re.sub(r"\*\*", "", cells[3]).strip().strip('"“”')
    subline = re.sub(r"\*\*", "", cells[4]).strip()
    narration = cells[5].strip()
    rows.append(
        dict(index=idx, ts=ts, layout=layout, headline=headline, subline=subline, narration=narration)
    )

assert len(rows) == 180, f"parsed {len(rows)} beats"

# ------------------------------------------------------------------ align
vo = json.loads(VO.read_text(encoding="utf-8"))
tw = [w for seg in vo["segments"] for w in seg["words"]]
AUDIO_END = vo["duration"]


def norm(tok: str) -> str:
    t = tok.lower()
    t = t.replace("php2shell", "php2shell")
    t = re.sub(r"[^a-z0-9$]+", "", t)
    # whisper variants
    t = t.replace("percent", "%")
    return t


def norm_words(text: str) -> list[str]:
    return [norm(w) for w in re.findall(r"\S+", text) if norm(w)]


designed = []
owner = []
for b in rows:
    ws = norm_words(b["narration"])
    b["_nw"] = len(ws)
    designed.extend(ws)
    owner.extend([b["index"]] * len(ws))

trans = [norm(w["w"]) for w in tw]

# alias table so common ASR splits still match
ALIAS = {
    "php2shell": ["php2shell", "phptoshell", "php2", "shell"],
    "cvss": ["cvss"],
    "oom": ["oom"],
    "rce": ["rce"],
    "sapi": ["sapi"],
    "phpsessid": ["phpsessid"],
    "zend": ["zend"],
    "67": ["67"],
}


def sim(a: str, b: str) -> float:
    if a == b:
        return 0.0
    if not a or not b:
        return 1.2
    if a in b or b in a:
        return 0.25
    # cheap similarity: shared prefix
    k = 0
    for x, y in zip(a, b):
        if x != y:
            break
        k += 1
    if k >= 4:
        return 0.45
    return 1.15


n, m = len(designed), len(trans)
GAP = 0.85
INF = float("inf")
prev = [j * GAP for j in range(m + 1)]
bt = bytearray((n + 1) * (m + 1))
for i in range(1, n + 1):
    cur = [i * GAP] + [INF] * m
    di = designed[i - 1]
    for j in range(1, m + 1):
        c_sub = prev[j - 1] + sim(di, trans[j - 1])
        c_del = prev[j] + GAP
        c_ins = cur[j - 1] + GAP
        best = c_sub
        code = 0
        if c_del < best:
            best, code = c_del, 1
        if c_ins < best:
            best, code = c_ins, 2
        cur[j] = best
        bt[i * (m + 1) + j] = code
    prev = cur

i, j = n, m
mapping: dict[int, int] = {}
while i > 0 or j > 0:
    code = bt[i * (m + 1) + j] if i > 0 and j > 0 else (1 if i > 0 else 2)
    if i > 0 and j > 0 and code == 0:
        mapping[i - 1] = j - 1
        i -= 1
        j -= 1
    elif i > 0 and (j == 0 or code == 1):
        i -= 1
    else:
        j -= 1

# word offset per beat
offsets = []
acc = 0
for b in rows:
    offsets.append(acc)
    acc += b["_nw"]

for b, off in zip(rows, offsets):
    idxs = [mapping.get(off + k) for k in range(b["_nw"])]
    idxs = [x for x in idxs if x is not None]
    if idxs:
        b["start"] = tw[idxs[0]]["s"]
        b["end"] = tw[idxs[-1]]["e"]
    else:
        b["start"] = b["end"] = None

# fill unmatched by interpolation
for k, b in enumerate(rows):
    if b["start"] is None:
        prev_end = next((x["end"] for x in reversed(rows[:k]) if x["end"] is not None), 0.0)
        next_start = next((x["start"] for x in rows[k + 1 :] if x["start"] is not None), AUDIO_END)
        b["start"] = prev_end
        b["end"] = max(prev_end + 0.4, next_start)

# monotonic + minimum duration, then extend to fill gaps
for k, b in enumerate(rows):
    b["start"] = max(0.0, float(b["start"]))
    b["end"] = max(float(b["end"]), b["start"] + 0.35)
    if k:
        b["start"] = max(b["start"], rows[k - 1]["end"] + 0.02)

# continuous scene boundaries: give each beat a short visual lead-in
starts = []
prev = 0.0
for k, b in enumerate(rows):
    st = 0.0 if k == 0 else max(prev + 0.6, b["start"] - 0.3)
    starts.append(st)
    prev = st
for k, b in enumerate(rows):
    b["start"] = starts[k]
    b["end"] = starts[k + 1] if k + 1 < len(rows) else AUDIO_END

# ------------------------------------------------------------------ copy
ACRONYMS = {
    "PHP", "CVE", "OOM", "RCE", "ASLR", "HTTP", "WAF", "CVSS", "NVD", "API", "EOL", "LTS",
    "C", "GC", "AI", "SAPI", "OPCACHE", "DIGID", "NCSC", "UTC", "CDN", "ID", "IOC", "UAF",
    "SQL", "FPM", "CGI", "CMS", "EDR", "URL", "IS_ARRAY", "POST", "GET", "SESSION", "COOKIE",
    "AM", "PM", "XSS", "LFI", "RFI", "SLA", "OS", "VM", "CPU", "RAM", "WAF",
}
KEEP_CASE = set(
    """PHP PHP-FPM PHP-CGI mod_php php-fpm php.ini Nginx Apache WordPress WooCommerce Magento Drupal
    Joomla Symfony Laravel MediaWiki Nextcloud FrankenPHP LiteSpeed Cloudflare Datadog Wiz Calif OpenAI
    Amazon AWS MadPot Chainguard Shodan Quarkslab OSTIF CERT-EU Red Hat Ubuntu Debian RHEL AlmaLinux
    cPanel Plesk Kubernetes Docker Gemini Codex Security Zend Emalloc Ealloc zend_bailout longjmp emalloc
    _zend_array _zend_hash_str_add_or_update_i nNumUsed nNumOfElements arData pDestructor zend_string_init
    zend_hash_destroy php_request_shutdown session.upload_progress fatal_error_backtraces memory_limit
    client_max_body_size php_sapi_name systemctl apache2 bash curl auditd ausearch grep AH00052
    _exit EG PG Ryan Austin LCFR Gina Peter Banyard Amy Burnett Nextcloud DigiD Quarkslab
    WordPress Drupal Joomla Magento Laravel Symfony MediaWiki""".split()
)
SMALL = {
    "a", "an", "the", "and", "or", "but", "for", "to", "in", "on", "at", "by", "of", "with",
    "from", "as", "via", "per", "vs", "vs.",
}
PREF = {w.lower(): w for w in KEEP_CASE if " " not in w}
PREF.update({w.lower(): w for w in ACRONYMS})
PREF["vs"] = "vs."
PREF["vs."] = "vs."


def smart_case(text: str) -> str:
    """Editorial sentence case that preserves acronyms and technical identifiers."""
    text = text.strip()
    if not text:
        return text
    # do not touch code-ish strings
    if re.search(r"[{}=<>;]|->|\$[A-Za-z_]", text):
        return text
    words = text.split()
    out = []
    cap_next = True
    for i, w in enumerate(words):
        m = re.match(r"^([^A-Za-z0-9$_]*)(.*?)([^A-Za-z0-9$_]*)$", w)
        if not m:
            out.append(w)
            continue
        pre, core, post = m.groups()
        if not core:
            out.append(w)
            continue
        low = core.lower()
        if low in PREF:
            new = PREF[low]
        elif re.fullmatch(r"\d+-[A-Z]+", core):
            new = core.split("-")[0] + "-" + core.split("-")[1].lower()
        elif re.fullmatch(r"\d+[A-Z]+", core):
            new = core
        elif core.isupper() and len(core) > 1:
            new = core.lower()
        else:
            new = core
        if cap_next and new and new[0].isalpha():
            new = new[0].upper() + new[1:]
        cap_next = bool(re.search(r"[.!?:]", post)) and low not in {"vs", "e.g", "i.e", "etc"}
        out.append(pre + new + post)
    return " ".join(out)


# ------------------------------------------------------------------ design
ACT_ACCENT = {
    1: "#ff3b5c",
    2: "#f5a524",
    3: "#ff6b3d",
    4: "#22d3ee",
    5: "#a78bfa",
    6: "#5b9dff",
    7: "#f472b6",
    8: "#fb923c",
    9: "#34d399",
    10: "#2dd4bf",
}
ACT_NAME = {
    1: "COLD OPEN",
    2: "THE MENTAL MODEL",
    3: "BLAST RADIUS",
    4: "THE TIMELINE",
    5: "LONGJMP() INTERNALS",
    6: "THE FOUR LINES",
    7: "3-STAGE EXPLOIT",
    8: "CVE-2026-109619",
    9: "PATCH ANATOMY",
    10: "ACTION PLAYBOOK",
}
# act boundaries by beat index (from the storyboard)
ACT_OF = {}
for k in range(1, 181):
    if k <= 15:
        ACT_OF[k] = 1
    elif k <= 33:
        ACT_OF[k] = 2
    elif k <= 48:
        ACT_OF[k] = 3
    elif k <= 68:
        ACT_OF[k] = 4
    elif k <= 85:
        ACT_OF[k] = 5
    elif k <= 102:
        ACT_OF[k] = 6
    elif k <= 122:
        ACT_OF[k] = 7
    elif k <= 135:
        ACT_OF[k] = 8
    elif k <= 151:
        ACT_OF[k] = 9
    else:
        ACT_OF[k] = 10

# explicit scene-type overrides for the beats with the strongest visual payoff
TYPE = {}
TYPE[1] = "cold"
TYPE[2] = "stat"
TYPE[3] = "statement"
TYPE[4] = "stat"
TYPE[8] = "stat"
TYPE[10] = "statement"
TYPE[12] = "stat"
TYPE[13] = "flow"
TYPE[14] = "ledger"
for k in range(17, 25):
    TYPE[k] = "ledger"
TYPE[26] = "flow"
TYPE[27] = "compare"
TYPE[28] = "flow"
TYPE[29] = "compare"
TYPE[30] = "flow"
TYPE[32] = "terminal"
TYPE[34] = "stat"
TYPE[36] = "stat"
TYPE[37] = "stat"
TYPE[38] = "stat"
TYPE[39] = "matrix"
TYPE[41] = "compare"
TYPE[43] = "code"
TYPE[46] = "stat"
TYPE[47] = "stat"
for k in (50, 55, 57, 58, 59, 61, 62, 63, 64, 65, 67):
    TYPE[k] = "dateline"
TYPE[56] = "stat"
TYPE[60] = "statement"
TYPE[66] = "stat"
TYPE[70] = "compare"
for k in (71, 72, 74, 75):
    TYPE[k] = "code"
TYPE[76] = "quote"
TYPE[77] = "flow"
TYPE[79] = "flow"
TYPE[82] = "stat"
for k in (83, 86, 87):
    TYPE[k] = "code"
for k in range(88, 92):
    TYPE[k] = "code"
TYPE[93] = "flow"
TYPE[94] = "code"
TYPE[95] = "memory"
for k in (96, 97, 98, 99):
    TYPE[k] = "code" if k in (97, 98) else "flow"
TYPE[100] = "code"
TYPE[101] = "memory"
TYPE[104] = "stat"
TYPE[106] = "code"
for k in (107, 108, 109, 110, 111, 112):
    TYPE[k] = "memory"
TYPE[114] = "terminal"
TYPE[115] = "terminal"
TYPE[117] = "memory"
TYPE[118] = "code"
TYPE[119] = "flow"
TYPE[120] = "terminal"
TYPE[121] = "statement"
TYPE[122] = "terminal"
TYPE[124] = "flow"
for k in (126, 128, 130):
    TYPE[k] = "code"
TYPE[132] = "flow"
TYPE[135] = "stat"
TYPE[138] = "code"
TYPE[142] = "flow"
TYPE[144] = "flow"
TYPE[145] = "code"
TYPE[146] = "code"
TYPE[147] = "quote"
TYPE[150] = "compare"
TYPE[151] = "flow"
TYPE[152] = "compare"
TYPE[154] = "hero"
TYPE[158] = "code"
TYPE[159] = "statement"
TYPE[160] = "flow"
TYPE[161] = "hero"
TYPE[162] = "terminal"
for k in (165, 166, 167):
    TYPE[k] = "code"
TYPE[168] = "quote"
for k in (170, 171, 172):
    TYPE[k] = "terminal"
TYPE[173] = "statement"
TYPE[174] = "flow"
TYPE[176] = "flow"
TYPE[177] = "stat"
TYPE[178] = "statement"
TYPE[179] = "statement"
TYPE[180] = "outro"


def guess_type(b) -> str:
    k = b["index"]
    if k in TYPE:
        return TYPE[k]
    lay = b["layout"]
    h = b["headline"].upper()
    if lay == "code_spotlight":
        return "code"
    if lay == "terminal_one":
        return "terminal"
    if lay == "flow_2node":
        return "flow"
    if lay == "hero_stat":
        return "stat" if re.search(r"\d", b["headline"]) else "statement"
    if lay == "badge_alert":
        if re.search(r"\b(19|20)\d\d\b", b["headline"]):
            return "dateline"
        return "statement"
    if lay == "analogy_card":
        return "ledger"
    if "?" in h and len(h) < 46:
        return "statement"
    return "statement" if (k % 3) else "hero"


# ------------------------------------------------------------------ meta
META = {}

META[1] = dict(ghost="PHP")
META[2] = dict(value="10", suffix="/10", dec=0, sep=0, from_=0)
META[4] = dict(value="9.2", suffix="/10", dec=1, sep=0, from_=0.0)
META[5] = dict(
    file="/var/www/html/index.php",
    tag="1 line of PHP",
    lines=[{"t": '<?php echo "pong"; ?>', "k": "hot"}],
    announce="No database. No eval(). No user input.",
)

META[8] = dict(value="3.10", suffix="s", dec=2, sep=0, from_=0.0)

META[12] = dict(value="69.3", suffix="%", dec=1, sep=0, from_=0.0)

META[13] = dict(
    nodes=[
        {"k": "CVE-2026-109618", "t": "Same-request OOM", "s": "uninitialized bucket"},
        {"k": "CVE-2026-109619", "t": "Cross-request UAF", "s": "dangling worker global"},
    ]
)

META[14] = dict(
    head="REQUEST LEDGER",
    rows=[
        {"k": "Occupied rooms", "v": "2"},
        {"k": "Room #2 exists", "v": "NO"},
        {"k": "Ledger says", "v": "2", "bad": True},
    ],
    stamp="TRUSTED",
    points=["Counter advances before the room is checked"],
)

META[34] = dict(value="2012", dec=0, sep=0, from_=1990)
META[36] = dict(value="2.23", suffix="M", dec=2, sep=0, from_=0.0)
META[37] = dict(value="1.50", suffix="M", dec=2, sep=0, from_=0.0)
META[38] = dict(value="883,717", dec=0, sep=1, from_=0)
META[39] = dict(cells=160, legendOk="current", legendBad="end-of-life", count="883,717 exposed")

META[41] = dict(
    left={"k": "RULE OF THUMB", "t": "mod_php only", "pts": ["Nginx + FPM is safe", "Only Apache is exposed"]},
    right={"k": "ADVISORY", "t": "Both SAPIs", "pts": ["FPM is exploitable on both CVEs", "Enabled-by-default upload progress"]},
    vs="≠",
)
META[43] = dict(
    file="php.ini",
    tag="default",
    lines=[
        {"t": "session.upload_progress.enabled = 1", "k": "key"},
        {"t": "; active even without session_start()", "k": "comment"},
    ],
    announce="Your app never has to call it.",
)
META[46] = dict(value="9.2", suffix="/10", dec=1, sep=0, from_=0.0)

META[50] = dict(day="2024", mon="QUARKSLAB AUDIT", yr="SOVEREIGN TECH AGENCY")
META[55] = dict(day="30", mon="JULY 2026", yr="PATCH THE PLANET")
META[56] = dict(value="12", suffix="days", dec=0, sep=0, from_=0)
META[57] = dict(day="11", mon="AUGUST 2026", yr="CALIF.IO SUBMISSION")
META[58] = dict(day="24", mon="AUGUST 2026", yr="WIZ RESEARCH")
META[59] = dict(day="18", mon="SEPTEMBER 2026", yr="OPENAI · CODEX SECURITY")
META[61] = dict(day="17", mon="OCTOBER 2026", yr="MADPOT · IN THE WILD")
META[62] = dict(day="20", mon="OCTOBER 2026", yr="15:00 UTC · HACKER NEWS")
META[63] = dict(day="20", mon="OCTOBER 2026", yr="20:00 UTC · ACCIDENTAL POST")
META[64] = dict(day="21", mon="OCTOBER 2026", yr="03:02 UTC · CLOUDFLARE WAF")
META[65] = dict(day="21", mon="OCTOBER 2026", yr="07:41 UTC · CHAINGUARD")
META[66] = dict(value="2", suffix="min", dec=0, sep=0, from_=0)
META[67] = dict(day="21", mon="OCTOBER 2026", yr="14:00 UTC · OFFICIAL RELEASE")

META[70] = dict(
    left={"k": "C", "t": "No exceptions", "pts": ["longjmp() skips stack frames", "Nothing unwinds"]},
    right={"k": "C++ / RUST / GO", "t": "Structured unwind", "pts": ["Destructors run", "Invariants hold"]},
    vs="≠",
)
META[71] = dict(file="php.ini", tag="per request", lines=[{"t": "memory_limit = 128M", "k": "key"}], announce="A hard ceiling on every request.")
META[72] = dict(file="Zend/zend_alloc.c", tag="allocator", lines=[{"t": "ptr = emalloc(size);", "k": "key"}], announce="Every allocation checks the budget.")
META[73] = dict(value="NULL", prefix="", suffix="", dec=0)
META[74] = dict(file="Zend/zend_alloc.c", tag="OOM path", lines=[{"t": "zend_bailout();  /* never returns */", "k": "bad"}], announce="No NULL. No cleanup. No return.")
META[75] = dict(file="Zend/zend.c", tag="macro", lines=[{"t": "longjmp(*EG(bailout), FAILURE);", "k": "bad"}], announce="A non-local goto out of the call stack.")
META[77] = dict(
    nodes=[
        {"k": "FRAME 5", "t": "emalloc()", "s": "detects OOM"},
        {"k": "FRAME 1", "t": "php_request_shutdown()", "s": "free everything", "hot": True},
    ]
)
META[79] = dict(
    nodes=[
        {"k": "BAILOUT", "t": "zend_bailout()", "s": "no unwind"},
        {"k": "SHUTDOWN", "t": "php_request_shutdown()", "s": "walks $_POST", "hot": True},
    ]
)
META[82] = dict(value="30", suffix="+ sites", dec=0, sep=0, from_=0)

META[83] = dict(file="Zend/zend_hash.c", tag="PHP 8.5.11", lines=[{"t": "/* the file that builds $_POST */", "k": "comment"}], announce="One function. Four lines. The whole bug.")
META[84] = dict(nodes=[{"k": "$_POST", "t": "is a hash table"}, {"k": "$_GET · $_SESSION", "t": "same struct"}])
META[85] = dict(name="_zend_array", n=2, ptr="arData + 1", cells=8)

for k, code in {
    88: "idx = ht->nNumUsed++;",
    89: "ht->nNumOfElements++;",
    90: "p = ht->arData + idx;",
    91: "p->key = zend_string_init(str, len, 0);",
}.items():
    META[k] = dict(file="Zend/zend_hash.c", tag="line %02d" % (k - 87), lines=[{"t": code, "k": "key"}], announce="")

META[92] = dict(value="3.5", suffix="MB", dec=1, sep=0, from_=0)
META[93] = dict(
    nodes=[
        {"k": "LINE 4", "t": "zend_string_init()", "s": "hits memory_limit"},
        {"k": "ESCAPE", "t": "zend_bailout()", "s": "p->val never written", "hot": True},
    ]
)
META[94] = dict(
    file="Zend/zend_hash.c",
    tag="skipped",
    lines=[
        {"t": "/* never reached */", "k": "comment"},
        {"t": "ZVAL_COPY_VALUE(&p->val, pData);", "k": "bad"},
    ],
    announce="Bucket 1 keeps whatever was there before.",
)
META[95] = dict(name="$_POST", n=2, ptr="arData + 1", cells=8)

META[96] = dict(
    left={"k": "PLAIN KEY", "t": "FOO=1", "pts": ["Key allocated first", "Counter updated second", "Safe"]},
    right={"k": "NESTED KEY", "t": "FOO[x]=1", "pts": ["Counter updated first", "Key allocated second", "OOM leaves a ghost"]},
    vs="→",
)
META[97] = dict(file="Zend/zend_hash.c", tag="plain path", lines=[{"t": "zend_symtable_update(ht, key, ...);", "k": "dim"}], announce="String allocated before the counter moves.")
META[98] = dict(file="HTTP body", tag="nested key", lines=[{"t": "&ZZZZ...3.5MB...[x]=1", "k": "key"}], announce="Bracket syntax reaches the vulnerable helper.")
META[99] = dict(
    nodes=[
        {"k": "COPY 1", "t": "ext/filter", "s": "succeeds"},
        {"k": "COPY 2", "t": "$_POST insert", "s": "hits the limit", "hot": True},
    ]
)
META[100] = dict(file="Zend/zend_hash.c", tag="shutdown", lines=[{"t": "zend_hash_destroy(&$_POST);", "k": "key"}], announce="Shutdown trusts nNumUsed = 2.")
META[101] = dict(name="$_POST", n=2, ptr="arData + 1", cells=8)
META[104] = dict(value="320", suffix="bytes", dec=0, sep=0, from_=0)
META[106] = dict(
    file="POST /index.php",
    tag="3 fields",
    lines=[
        {"t": "= <276 bytes of binary>", "k": "key"},
        {"t": "&a=1", "k": "hot"},
        {"t": "&ZZZZ...[x]=1", "k": "key"},
    ],
    announce="A single request, three fields.",
)
for k in (107, 108, 109, 110, 111, 112):
    META[k] = dict(name="$_POST.arData", n=2, ptr="arData + 1", cells=8)
META[114] = dict(host="response headers", lines=[{"k": "cmd", "t": "Set-Cookie: PHPSESSID=<leaked heap bytes>"}], announce="Freed memory reflected back to the client.")
META[115] = dict(host="response headers", lines=[{"k": "out", "t": "heap address  : 0x7f3a...c040"}, {"k": "out", "t": "libc pointer  : 0x7f3a...1e80"}, {"k": "out", "t": "session secret: <leaked memory>"}], announce="ASLR defeated in one response.")
META[117] = dict(name="forged _zend_array", n=2, ptr="pDestructor", cells=8)
META[118] = dict(file="Zend/zend_hash.c", tag="function pointer", lines=[{"t": "ht->pDestructor = system;", "k": "bad"}], announce="Cleanup becomes execution.")
META[119] = dict(
    nodes=[
        {"k": "SHUTDOWN", "t": "zend_hash_destroy()", "s": "walks bucket 1"},
        {"k": "CALL", "t": "pDestructor(elem)", "s": "system(command)", "hot": True},
    ]
)
META[120] = dict(host="www-data", lines=[{"k": "cmd", "t": "id"}, {"k": "ok", "t": "uid=33(www-data) gid=33(www-data)"}, {"k": "ok", "t": "HTTP/1.1 200 OK"}], announce="Shell. HTTP 200. No crash.")
META[122] = dict(host="php-error.log", lines=[{"k": "err", "t": "PHP Fatal error: Allowed memory size exhausted"}, {"k": "out", "t": "in Unknown on line 0"}], announce="The only trace left behind.")
META[124] = dict(
    nodes=[
        {"k": "REQUEST 1", "t": "OOM bailout", "s": "worker global dangles"},
        {"k": "REQUEST 2", "t": "same worker", "s": "dereferences freed memory", "hot": True},
    ]
)
META[126] = dict(file="ext/session/rfc1867.c", tag="vector 01", lines=[{"t": "global upload_progress → request heap", "k": "key"}], announce="Upload tracking outlives the request.")
META[128] = dict(file="Zend/zend_exceptions.c", tag="vector 02", lines=[{"t": "global backtrace → request heap", "k": "key"}], announce="A shutdown diagnostic repopulates global state.")
META[130] = dict(file="ext/opcache", tag="vector 03", lines=[{"t": "shared memory type confusion", "k": "key"}], announce="Across workers, through OPcache.")
META[132] = dict(
    nodes=[
        {"k": "REQUEST A", "t": "triggers OOM", "s": "leaks cookie"},
        {"k": "REQUEST B", "t": "harvests leak", "s": "completes the chain", "hot": True},
    ]
)
META[135] = dict(value="7", suffix="rules", dec=0, sep=0, from_=0)
META[138] = dict(file="Zend/zend_hash.c", tag="8.5.12", lines=[{"t": "idx = ht->nNumUsed++;  /* still first */", "k": "bad"}], announce="The line was not reordered.")

# --- targeted content fixes ------------------------------------------------
TYPE[32] = "terminal"
META[32] = dict(
    host="php-error.log",
    lines=[
        {"k": "err", "t": "PHP Fatal error: Allowed memory size exhausted"},
        {"k": "out", "t": "in Unknown on line 0"},
    ],
    announce="",
)

TYPE[137] = "diff"
META[137] = dict(
    file="Zend/zend_alloc.c",
    ver="8.5.11 -> 8.5.12",
    lines=[
        {"k": "ctx", "t": "if (UNEXPECTED(ptr == NULL)) {"},
        {"k": "del", "t": "    zend_bailout();  /* longjmp now */"},
        {"k": "add", "t": "    zend_alloc_soft_limit();  /* defer */"},
        {"k": "ctx", "t": "}"},
    ],
    announce="OOM no longer teleports mid-instruction.",
)

META[87] = dict(
    file="Zend/zend_hash.c",
    tag="PHP 8.5.11",
    lines=[
        {"t": "idx = ht->nNumUsed++;", "k": "hot"},
        {"t": "ht->nNumOfElements++;", "k": "dim"},
        {"t": "p = ht->arData + idx;", "k": "dim"},
        {"t": "p->key = zend_string_init(str, len, 0);", "k": "key"},
    ],
    announce="Read them one at a time.",
)

META[39] = dict(cells=160, legendOk="supported", legendBad="end-of-life", count="883,717 exposed")
META[36] = dict(value="2.23", suffix="M", dec=2, sep=0, from_=0.0)

HEAD = {
    39: ("End-of-life PHP", "PHP 5.x/7.x and 8.0/8.1 - no official upstream binaries"),
    87: ("Four lines of C", "The exact function Datadog highlighted"),
    46: ("Why CVSS 9.2, not 10.0?", "Requires specific server and heap conditions"),
}

MARKS = {
    6: "$_GET", 15: "14y", 33: "auth", 42: "myth", 48: "RCE", 54: "2y",
    69: "C", 78: "jmp", 81: "++", 84: "array", 102: "crash", 123: "UAF",
    141: "OOM", 154: "user", 156: "sess", 161: "root",
}
META[142] = dict(
    nodes=[
        {"k": "SOFT LIMIT", "t": "finish the allocation", "s": "bail at a safe point", "hot": True},
        {"k": "HARD LIMIT", "t": "_exit(137)", "s": "no destructors"},
    ]
)
META[144] = dict(
    nodes=[
        {"k": "TIER 1", "t": "soft limit", "s": "deferred bailout"},
        {"k": "TIER 2", "t": "hard limit", "s": "_exit(137)", "hot": True},
    ]
)
META[145] = dict(file="Zend/zend_alloc.c", tag="hard limit", lines=[{"t": "_exit(137);  /* kill the worker */", "k": "bad"}], announce="Destructors never touch corrupt state.")
META[146] = dict(
    file="php_request_shutdown()",
    tag="state reset",
    lines=[
        {"t": "PG(upload_progress) = NULL;", "k": "key"},
        {"t": "EG(backtrace) = NULL;", "k": "key"},
    ],
    announce="Globals explicitly zeroed.",
)
META[150] = dict(
    left={"k": "AUGUST 2026", "t": "Machine speed", "pts": ["Calif · Wiz · OpenAI", "38 days, 3 independent teams"]},
    right={"k": "OCTOBER 2026", "t": "Human upkeep", "pts": ["Consensus deadlock", "One redesign that holds"]},
    vs="→",
)
META[152] = dict(
    left={"k": "GROUP 1", "t": "Users", "pts": ["Rotate sessions", "Re-login after patch"]},
    right={"k": "GROUP 2 + 3", "t": "Owners & operators", "pts": ["Verify SAPI version", "Restart worker pools", "Hunt line-0 logs"]},
    vs="+",
)
META[158] = dict(file="check.php", tag="web SAPI", lines=[{"t": "<?php echo PHP_VERSION . ' / ' . php_sapi_name(); ?>", "k": "key"}], announce="CLI php -v is not proof.")
META[162] = dict(host="root@host", lines=[{"k": "cmd", "t": "systemctl restart php8.4-fpm apache2"}, {"k": "out", "t": "workers now load the patched binary"}], announce="Upgrade on disk is not upgrade in RAM.")
META[165] = dict(file="php.ini", tag="stopgap", lines=[{"t": "session.upload_progress.enabled = 0", "k": "key"}], announce="Closes vector 01 only.")
META[166] = dict(file="php.ini", tag="stopgap", lines=[{"t": "fatal_error_backtraces = 0", "k": "key"}], announce="Closes vector 02 only.")
META[167] = dict(file="php.ini + nginx", tag="stopgap", lines=[{"t": "memory_limit = -1", "k": "key"}, {"t": "client_max_body_size 1M;", "k": "key"}], announce="Only safe with a strict proxy cap.")
for k, cmd in {
    170: 'grep -Rn "Allowed memory size" /var/log/',
    171: 'grep -Rn "AH00052.*Segmentation" /var/log/',
    172: 'ausearch -sc execve | grep -E "apache2|php-fpm"',
}.items():
    META[k] = dict(host="ioc-hunt", lines=[{"k": "cmd", "t": cmd}], announce="")
META[174] = dict(
    nodes=[
        {"k": "2012", "t": "one counter increment", "s": "looks harmless"},
        {"k": "2026", "t": "pre-auth shell", "s": "millions of servers", "hot": True},
    ]
)
META[176] = dict(
    nodes=[
        {"k": "COUNTER", "t": "increment first", "s": "state desyncs"},
        {"k": "LONGJMP", "t": "skip cleanup", "s": "corruption detonates", "hot": True},
    ]
)
META[177] = dict(value="8.5.12", suffix="", dec=0, sep=0, from_=0, nocount=True)

# ------------------------------------------------------------------ emit
OUT_SCENES = []
for b in rows:
    k = b["index"]
    typ = guess_type(b)
    accent = ACT_ACCENT[ACT_OF[k]]
    s = {
        "index": k,
        "start": round(b["start"], 3),
        "end": round(b["end"], 3),
        "type": typ,
        "accent": accent,
        "eyebrow": {
            1: "CVE-2026-109618 · CVE-2026-109619",
            3: "PRIMARY SOURCES",
            5: "ONE LINE OF PHP",
            8: "DATADOG LAB · PHP 8.5.11",
            12: "W3TECHS TELEMETRY",
            14: "THE MENTAL MODEL",
            34: "VULNERABLE SINCE 5.4.0",
            36: "SHODAN · INTERNET-FACING PHP",
            41: "SAPI RUMOR vs ADVISORY",
            50: "PHP FOUNDATION POSTMORTEM",
            55: "PATCH THE PLANET",
            66: "CHAINGUARD → FIRST ATTACK",
            70: "MEMORY MODEL",
            75: "ZEND ENGINE",
            85: "ZEND/zend_hash.c",
            88: "THE FOUR LINES",
            104: "ZEND MEMORY MANAGER",
            114: "STAGE 02 · LEAK",
            118: "STAGE 03 · HIJACK",
            120: "SINGLE-REQUEST RCE",
            135: "OCT 21 · 03:02 UTC",
            138: "PATCH DIFF",
            142: "8.5.12 MEMORY MODEL",
            150: "WHO FOUND IT",
            152: "REMEDIATION",
            158: "VERIFY, DON'T ASSUME",
            170: "INDICATORS OF COMPROMISE",
            174: "THE 14-YEAR ECHO",
        }.get(k, ACT_NAME[ACT_OF[k]]),
        "headline": smart_case(b["headline"]),
        "subline": b["subline"],
        "variant": k % 3 if typ == "statement" else 0,
    }
    if typ == "cold":
        s["ghost"] = "PHP"
        s["headline"] = "PHP2Shell"
        s["subline"] = "A rumor claimed the entire internet was about to fall over."
        s["meta"] = {"chips": ["CVE-2026-109618", "CVE-2026-109619"]}
    if k == 2:
        s["headline"] = "The severity being passed around"
        s["subline"] = "Before the advisories, the number was pure speculation"
        s["eyebrow"] = "THE RUMOR"
    if k == 3:
        s["headline"] = "Sorting real from loud"
        s["subline"] = "PHP Foundation · Datadog · Cloudflare · Wiz"
    if k == 4:
        s["headline"] = "Official CVSS v4.0 severity"
        s["subline"] = "Critical, but not the flat 10.0 people expected"
    if typ == "outro":
        s["meta"] = {"channel": "youtube.com/channel/UCEbQwm7oWRb1HjfGHMs7AzA"}
    if k in HEAD:
        s["headline"], s["subline"] = HEAD[k]
    if typ == "hero":
        s["meta"] = {"mark": MARKS.get(k, "PHP"), "rule": True}
    m = META.get(k)
    if m:
        meta = dict(m)
        if "value" in meta:
            # normalize numeric fields
            val = str(meta["value"]).replace(",", "")
            try:
                num = float(val)
            except ValueError:
                num = 0.0
            meta["stat"] = {
                "to": num,
                "dec": meta.pop("dec", 0),
                "sep": meta.pop("sep", 0),
                "from": meta.pop("from_", 0),
                "nocount": bool(meta.pop("nocount", False)),
            }
            if meta["stat"]["nocount"]:
                meta["display"] = str(meta["value"])
            else:
                d = meta["stat"]["dec"]
                txt = f"{num:,.{d}f}" if meta["stat"]["sep"] else f"{num:.{d}f}"
                meta["display"] = txt
                meta["value"] = txt
        s["meta"] = {**s.get("meta", {}), **meta}
    OUT_SCENES.append(s)

OUT.write_text(json.dumps(OUT_SCENES, indent=1, ensure_ascii=False), encoding="utf-8")
total = OUT_SCENES[-1]["end"]
print(f"scenes: {len(OUT_SCENES)}  duration: {total:.2f}s ({total/60:.2f} min)")
print("types:", {t: sum(1 for s in OUT_SCENES if s['type'] == t) for t in sorted({s['type'] for s in OUT_SCENES})})
for s in OUT_SCENES[:6]:
    print(f"  {s['index']:3d} {s['start']:7.2f}-{s['end']:7.2f} {s['type']:10s} {s['headline'][:60]}")







