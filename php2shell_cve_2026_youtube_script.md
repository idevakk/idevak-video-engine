# PHP2Shell (CVE-2026-109618 & CVE-2026-109619): Voiceover-Ready Script & 180-Beat (4-Second) HyperFrames Storyboard

**Reference Style & Pacing:** Modeled on [*4 Security Failures in One Week. Which One Hits You?* (`yZuOxQ_hKOI`)](https://www.youtube.com/watch?v=yZuOxQ_hKOI) — conversational, evidence-first investigative narration paired with **180 minimal, single-focus visual scenes that change every 4.0 seconds** (`720.0s` / `12:00` total runtime).

---

## How Our Voiceover-to-HyperFrames Sync Workflow Works
1. **Step 1 (Right Now — Record or Generate Your Voiceover):** Copy the clean narration script in **Part 1** below into ElevenLabs (or your recording studio) to generate your `.mp3` / `.wav` voiceover file.
2. **Step 2 (Send Me the Audio File OR Drop It Into the Studio App):**
   - **In Chat:** Upload/send your generated audio file here in chat. I will run a word-by-word timestamp transcription across the audio file and lock every single word and 3–5 second visual cut in `/hyperframes` to your exact vocal cadence.
   - **Instant Preview in Canvas:** You can also click **"🎙️ Upload Voiceover Audio (.mp3/.wav)"** in the top bar of the interactive HyperFrames Studio app (`php2shell_hyperframes_video.html`) to test your audio file immediately with live word-by-word karaoke highlighting and auto-scaled scene timing.

---

## Part 1: Clean Copy-Paste Voiceover Script (Plain Spoken Text Only — Zero Stage Directions)

> **Voiceover Tip:** This block contains **only** the spoken words (~1,920 words across 180 short sentences) so you can paste it directly into ElevenLabs or a teleprompter without stripping out brackets or visual cues.

### ACT 01 · COLD OPEN

Every few months, a rumor explodes across security feeds claiming the entire internet is about to fall over.

This week, that rumor had a name: PHP2Shell.

At first, I figured it was hype stacked on hype, so I pulled the primary write-ups from the PHP Foundation, Datadog, and Cloudflare.

Here is what is actually real: the official severity landed at 9.2 out of 10—not a 10, but still critical.

To see why, look at this one-line PHP file that only prints the word pong.

It doesn't touch a database, it doesn't read user input, and it doesn't even start a session.

Yet an attacker can send one unauthenticated web request to that server and hijack it before line one of your code ever runs.

In Datadog's lab test on PHP 8.5.11, a single POST request spawned a shell in 3.10 seconds and still returned HTTP 200 OK.

The threat was serious enough that on October 21st, the Dutch government took its DigiD login portal and overheid.nl offline as a precaution.

They reported no sign of a break-in, but pulling the plug is the one emergency patch that always applies cleanly.

Hours earlier, at 3:02 AM UTC, Cloudflare switched on seven emergency firewall rules across every customer plan, including Free.

Because PHP still powers 69.3 percent of all websites whose server-side language is known, this hits the backbone of the web.

Under the hood, PHP2Shell isn't one bug—it is a pair of twin flaws inside PHP's core C runtime.

One is a bookkeeping mistake when PHP runs out of memory; the other is a leftover pointer that poisons the next visitor.

Let's strip away the noise, look at the exact four lines of C code that broke, and see how to lock down your servers.

### ACT 02 · THE MENTAL MODEL

Let's start with the first bug, CVE-2026-109618, without touching a single line of C code yet.

Picture a hotel clerk standing at a front desk with a paper ledger.

Before checking whether a room is actually available, the clerk writes 'Occupied Rooms: 2' in the ledger.

Then the clerk looks up, realizes the hotel is completely full, and walks away from the desk.

Because the clerk bailed out mid-task, the ledger still insists there are two occupied rooms.

Now, in the real world, a missing hotel room is just empty air—but in computer memory, it is much worse.

An uninitialized slot in memory still holds whatever raw bytes were left behind by an earlier operation.

When PHP finishes the failed request and cleans up the room list, it trusts the ledger counter.

If an attacker planted their own bytes in that memory spot moments earlier, PHP treats those bytes as a real instruction.

Now compare that with the second bug, CVE-2026-109619.

To stay fast, a PHP web server doesn't start a brand-new process for every visitor; one worker handles thousands of requests in a row.

Think of the worker as having a permanent wall whiteboard for global state, and a paper scratchpad that gets shredded after each request.

During Request Number One, PHP jots an arrow on the permanent whiteboard pointing to a page on the temporary scratchpad.

Then a fatal error hits. PHP shreds the scratchpad, but skips the step that erases the arrow on the permanent whiteboard.

When Request Number Two lands on that same worker a millisecond later, PHP follows the old arrow into freed memory.

So both CVEs are really two sides of the same architectural flaw: PHP aborting a request without cleaning up its state.

And because both bugs can be triggered while PHP is still unpacking the incoming HTTP request, your app code never gets a vote.

Login checks, CSRF tokens, and application-level firewalls sitting inside PHP are bypassed completely.

### ACT 03 · BLAST RADIUS

How wide is the blast radius? The vulnerable code path has been sitting in PHP since version 5.4.0, shipped in 2012.

Every single release from PHP 5.4 through PHP 8.5.11 inherited the exact same assumption.

Shodan telemetry tracks roughly 2.23 million internet-facing servers openly advertising a PHP header.

About 1.5 million of those servers reveal their exact PHP version number in public HTTP responses.

And here is the scariest number in the dataset: 883,717 of those servers—nearly 59 percent—run End-of-Life PHP versions.

That is almost 700,000 servers on PHP 5 and 7, plus another 186,000 on PHP 8.0 and 8.1, which get no official upstream binary updates.

Because the flaw lives in the engine, researchers confirmed pre-auth exploitation against default installs of WordPress, Drupal, Magento, and Laravel.

Early rumors claimed only Apache mod_php was vulnerable, while Nginx with PHP-FPM was safe.

The advisories proved that rumor wrong: while mod_php is the easiest target, PHP-FPM is also vulnerable across both CVEs.

Why? Because PHP's session upload progress handler is enabled by default in php.ini—even if your app never calls session_start().

Simply sending a multipart form upload with a session cookie activates that C code path before your script begins.

FrankenPHP, LiteSpeed, and traditional PHP-CGI are all in scope as well.

So why did the PHP Foundation score it 9.2 instead of a flat 10.0? Because turning the crash into RCE depends on allocator and SAPI layout.

Under the older CVSS v3.1 formula used by NVD and Red Hat, it still clocks in at 9.8 Critical.

Whether you call it a 9.2 or a 9.8, an unauthenticated shell in three seconds is a drop-everything emergency.

### ACT 04 · THE TIMELINE

Which raises a bigger question: how did a bug like this hide for 14 years, and then leak in the middle of the night?

On October 21st, the PHP Foundation published a remarkably honest postmortem: the first clue actually surfaced two years ago, in 2024.

While fixing a finding from the 2024 Quarkslab audit, a PHP core developer noticed that running out of memory left data structures half-built.

Back in 2024, an exploit was theorized, but nobody had demonstrated a working remote code execution chain.

And fixing it was a nightmare: every proposed patch either slowed down PHP, broke backward compatibility, or crashed third-party extensions.

Because PHP's security group operated by strict consensus, the discussion deadlocked, stalling and restarting for nearly two years.

Then came the summer of 2026. On July 30th, security firm Calif began auditing PHP under the Patch the Planet initiative.

It took Calif researcher Ryan Austin—known as LCFR—just twelve days to turn that 2024 hazard into a full pre-auth RCE.

On August 11th, 2026, Calif submitted their working exploit to the PHP security team.

Thirteen days later, on August 24th, Wiz Research independently reported the exact same bug class using Google's Gemini 4 Argon model.

And on September 18th, OpenAI's security team reported the same root cause plus brand-new exploit paths using Codex Security.

Think about that: a bug that sat dormant for 14 years was independently weaponized by three AI-assisted teams in 38 days.

Coordinated release was set for October 22nd—but on October 17th, Amazon's MadPot honeypots caught attackers testing PHP2Shell in the wild.

On October 20th at 15:00 UTC, someone leaked the CVE numbers on Hacker News, sparking global panic.

PHP moved the patch forward by 24 hours; that evening, Calif accidentally published—and quickly deleted—their exploit demo video.

At 03:02 UTC on October 21st, Cloudflare rolled out seven emergency WAF rules using full-transaction inspection.

Then at 07:41 UTC—six hours before the embargo lifted—Chainguard pushed patched PHP images to a public registry.

Two minutes later, at 07:43 UTC, Cloudflare recorded the first exploitation attempt against its network.

At 14:00 UTC, PHP officially shipped versions 8.5.12, 8.4.27, 8.3.36, and 8.2.35.

The lesson from that timeline is brutal: once a patch hits a public container registry, attackers diff the binary in minutes.

### ACT 05 · LONGJMP() INTERNALS

Now let's look under the hood of the Zend Engine. Why does running out of memory cause code execution instead of a clean error?

PHP's interpreter is written in standard C—a language without native try-catch exceptions or automatic stack unwinding.

Yet every PHP web request runs inside a strict memory budget defined by memory_limit in php.ini.

Whenever PHP needs memory for an array or string, it calls its custom allocator, emalloc(), which checks that budget.

In a normal C program, if an allocation fails, malloc returns NULL and the caller cleans up its variables.

PHP doesn't do that. When emalloc() crosses memory_limit, it never returns NULL to the function that called it.

Instead, PHP calls zend_bailout(), a macro that fires the C library function longjmp().

Think of longjmp() as an emergency ejection seat for the CPU instruction pointer.

It teleports execution from deep inside the memory allocator straight back to the top-level recovery loop.

Every intermediate C function on the call stack is abandoned mid-sentence, with zero chance to undo its work.

And where does that ejection seat land? Right inside php_request_shutdown(), which immediately starts freeing request arrays.

Here is the fatal flaw: the shutdown routine assumes every array and hash table in memory is in a consistent, finished state.

If any C function updated a counter on line one, and called emalloc() on line four, an OOM bailout leaves the structure lying.

When researchers audited the codebase, they didn't find just one place doing this—they found dozens across the engine.

And the most dangerous one of all sat right inside Zend/zend_hash.c—the file that builds $_POST.

Remember, in PHP, every array—including $_POST, $_GET, and $_SESSION—is stored as a C struct called _zend_array.

Each _zend_array has a header counter called nNumUsed, and a contiguous array of Bucket slots called arData.

### ACT 06 · THE 4 LINES OF C

Let's zoom in on the exact C function that inserts a string key into a PHP array: _zend_hash_str_add_or_update_i().

There are four consecutive lines of C here that Datadog Security Labs highlighted in their reproduction.

Line one: idx equals ht arrow nNumUsed plus-plus. PHP increments the count of used buckets from one to two.

Line two: ht arrow nNumOfElements plus-plus. Now PHP increments the active element count to two as well.

Line three: p equals ht arrow arData plus idx. PHP aims pointer p at the second bucket slot in memory.

And only now, on line four, does PHP call zend_string_init() to allocate heap memory for the form field's key name.

Pause right on line four. What happens if that form field name is 3.5 megabytes long and pushes PHP over memory_limit?

zend_string_init() runs out of memory and fires longjmp(), teleporting out of the function before p arrow val is ever touched.

The lines that were supposed to write the value and type tag into Bucket number two are never reached.

Look at the state of $_POST now: its header swears it has two valid buckets, but Bucket number two is completely uninitialized.

Now, there is a subtle detail here: if you just send a giant plain variable like ZZZ equals 1, this bug doesn't trigger.

Why? Because for a plain top-level variable, PHP allocates the key string before it updates the hash table counters.

To reach the vulnerable four lines, the attacker appends bracket x—turning the field into a nested array key.

Even cleverer: PHP's input filter copies the key once, which succeeds—and the second copy into $_POST hits the ceiling and bails out.

Moments later, php_request_shutdown() calls zend_hash_destroy() on $_POST, looping over both buckets.

Bucket zero is cleaned up normally, and then PHP's destructor walks straight into the ghost bytes sitting in Bucket one.

If Bucket one holds random garbage, PHP just segfaults. So how does the attacker plant exact exploit bytes inside Bucket one?

### ACT 07 · 3-STAGE EXPLOIT

This is where the exploit turns into surgical heap choreography across three distinct stages.

Stage One is all about a single number in PHP's memory manager: the 320-byte slab bin.

PHP's memory manager groups small allocations into fixed size bins—and when a 320-byte chunk is freed, the very next 320-byte request gets it back.

Look at the three fields in the attacker's POST body: first, an empty field name, equals 276 bytes of raw binary data.

Once PHP wraps those 276 bytes in a zend_string header, the allocation lands squarely inside the 320-byte bin.

Then PHP sees the variable name before the equals sign is empty, so it drops the variable and frees that 320-byte chunk—without zeroing the bytes!

Immediately, PHP parses the second field: ampersand a equals 1.

To store $_POST, PHP asks the allocator for a 320-byte chunk—and gets back the exact chunk holding the attacker's binary payload!

Writing 'a equals 1' overwrites Bucket zero, leaving the attacker's forged zval sitting untouched in Bucket one.

Then Field Three arrives with the 3.5-megabyte nested key, bumping nNumUsed to two and firing longjmp().

Now for Stage Two: modern servers randomize memory addresses using ASLR. How does the attacker know where to point Bucket one?

Calif and Wiz chained a second OOM primitive in session upload progress that tricks PHP into reflecting freed heap memory inside the PHPSESSID cookie!

That cookie hands the attacker live heap addresses and libc pointers—and can even leak sensitive data from earlier requests on that worker.

With the exact memory addresses in hand, Stage Three hijacks PHP's garbage collector.

The planted bytes in Bucket one mark its type as IS_ARRAY, pointing right into a forged _zend_array structure.

Every PHP HashTable has a function pointer called pDestructor that PHP calls on each element when destroying the array.

The attacker sets pDestructor to the address of the C library function system(), and puts their shell command in the first element.

When zend_hash_destroy() cleans up the fake array, PHP dutifully calls system() on the attacker's command and returns HTTP 200 OK.

Because the forged structures are carefully balanced, the worker process doesn't even crash—it stays alive and serves HTTP 200.

The only clue left behind in the PHP error log is a single line: Allowed memory size exhausted in Unknown on line 0.

### ACT 08 · CVE-2026-109619

Now let's look at the twin vulnerability, CVE-2026-109619, which breaks the wall between separate HTTP requests.

Instead of exploiting the request that ran out of memory, CVE-2026-109619 booby-traps the worker for the next request.

The PHP Foundation and Wiz Research confirmed three distinct code paths where global state survives a fatal bailout.

Vector One is RFC 1867 file upload tracking: a mid-upload OOM leaves global upload-progress pointers aimed at freed request memory.

When the next file upload lands on that worker, PHP dereferences the dangling pointer before request initialization resets it.

Vector Two hits PHP 8.5's fatal error backtrace feature: a late shutdown diagnostic can populate global backtrace state after cleanup.

If the very next request emits an early startup warning, PHP reads that freed backtrace pointer and corrupts memory.

And Vector Three, demonstrated by Wiz Research, abuses shared-memory state in OPcache to trigger type confusion across workers.

Cross-request bugs are especially nasty because a firewall looking at one request at a time only sees half of the attack.

That is why Cloudflare had to use full-transaction detection—correlating the incoming request with the outgoing response cookie.

And even Cloudflare was blunt in their advisory: treat firewall rules as a temporary shield, never a replacement for patching PHP.

Because PHP unpacks encodings, multipart boundaries, and nested keys internally, network filters cannot catch every variant forever.

Those seven rules bought the internet eleven critical hours of breathing room on October 21st—but the binary patch is mandatory.

Which brings us to the patch itself. How did PHP fix a flaw woven into thirty years of C code?

When Datadog diffed PHP 8.5.12 against 8.5.11, they found a surprise that every security engineer should know about.

Inside _zend_hash_str_add_or_update_i(), PHP 8.5.12 still increments nNumUsed++ before allocating the key!

### ACT 09 · PATCH ANATOMY

Wait a second—why didn't the PHP team just move the counter increment below the memory allocation?

Because playing whack-a-mole with every counter-first C function across a million-line engine would miss edge cases and break extensions.

Instead of rewriting every data structure, the PHP Foundation redesigned how out-of-memory errors interrupt the engine.

First, they introduced a Soft Memory Limit: when an allocation crosses memory_limit, PHP no longer fires longjmp() mid-instruction.

It lets the in-progress allocation finish so the hash table bucket is completely initialized, and only bails out at the next safe checkpoint.

Second, if an allocation is so massive that it crosses a Hard Limit where memory genuinely cannot be granted, PHP doesn't run shutdown destructors at all.

It immediately terminates the worker process with _exit(137), guaranteeing that pDestructor is never called on corrupted memory.

Third, to close CVE-2026-109619, PHP now explicitly zeroes out upload-progress, error, exception, and serialization globals during shutdown.

As Datadog noted, this is a smart defense-in-depth fix for OOM—though any future non-OOM bailout path will still need careful auditing.

The PHP Foundation also announced major governance reforms so critical architectural fixes can never stall in committee for two years again.

They are appointing a dedicated Security Team Lead, tightening embargo rules after the Chainguard leak, and expanding fuzzing.

It is a fascinating moment in software history: frontier AI models found the exploit chains, while human maintainers re-engineered the runtime.

When offensive bug discovery moves at machine speed, open-source maintainers need the funding and authority to ship structural fixes fast.

Now let's get practical. Following the exact breakdown from our reference briefing, let's split your action plan into three groups.

Here is what ordinary users, website owners, and server administrators each need to do right now.

### ACT 10 · ACTION PLAYBOOK

Group One: if you are an ordinary user, you don't run PHP on your laptop, so there is nothing for you to patch locally.

However, because CVE-2026-109618 can leak session tokens and secrets from server memory, any PHP site you log into could be exposed.

If you use smaller forums, self-hosted Nextcloud instances, or regional portals that went offline this week, log out and log back in once patched.

Group Two: if you own a WordPress, WooCommerce, Magento, or Drupal site on managed hosting, do not assume your host patched it.

Check the PHP version running your web SAPI—not just php dash v on the command line, which often points to a different binary.

You want to see PHP 8.5.12, 8.4.27, 8.3.36, or 8.2.35.

If your site sits behind Cloudflare, keep their managed PHP rules enabled, and make sure attackers cannot bypass the proxy to hit your origin IP.

Group Three: if you manage the servers or containers yourself, here is your step-by-step engineering checklist.

Step One: after updating your PHP packages or container base images, restart every php-fpm pool and Apache worker process.

On Linux, updating a package on disk does not replace the binary already running inside persistent worker memory.

Step Two: if a legacy app locks you onto PHP 7.4, 8.0, or 8.1, apply the minimal source backports or distro LTS packages immediately.

Step Three: if you need a temporary stopgap for a few hours while testing the upgrade, disable session.upload_progress in php.ini.

On PHP 8.5, also set fatal_error_backtraces to off.

Some teams also set memory_limit to minus one paired with a strict Nginx client_max_body_size cap so attackers cannot trigger a soft OOM bailout.

But remember PHP core maintainer Gina Peter Banyard's warning: no ini setting fixes the underlying C bug. Only the binary update does.

Step Four: audit your logs going back to at least October 17th, when Amazon MadPot caught the first live zero-day probes.

Search your PHP error logs for 'Allowed memory size exhausted in Unknown on line 0'—that tells you an OOM happened before script execution.

Second, check your Apache or FPM logs for bursts of segmentation faults, which happen when an attacker's pointer guess misses.

Third, check EDR or auditd telemetry for any apache2 or php-fpm worker spawning sh, bash, or curl—even on requests that returned HTTP 200.

If you see line-zero OOM errors followed by worker segfaults or child shells, assume the worker was compromised and rotate every secret on the box.

Stepping back, PHP2Shell is a textbook case of how a tiny ordering shortcut in C can echo across fourteen years of the web.

Incrementing a counter one line before allocating a string looked harmless in 2012.

Combined with longjmp() teleporting over stack frames, that single line became a pre-authentication shell across millions of servers.

Upgrade to 8.5.12, 8.4.27, 8.3.36, or 8.2.35, restart your worker pools, and check your line-zero logs back to October 17th.

Let me know in the comments if you're running PHP-FPM, mod_php, or stuck maintaining a legacy PHP 7.4 fleet.

If you want clear, zero-hype breakdowns of real-world vulnerabilities without the filler, hit subscribe.

Stay patched, keep your workers clean, and I'll see you in the next deep dive.

---

## Part 2: Complete 180-Beat Micro-Scene Storyboard (Changes Every 4.0 Seconds · Single Visual Focus)

Every 4.0 seconds (`120 frames @ 30fps`), the HyperFrames stage transitions to a **single, uncluttered visual focal point** (a giant metric, the hotel clerk ledger analogy, a 1-line C spotlight, a 2-node pointer diagram, or a single terminal log line):

| Beat | Timestamp | Visual Layout Type | On-Screen Focal Element (1 Thing at a Time) | Sub-Caption / Context | Spoken Narration Cue |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **#001** | `00:00 – 00:04` | `statement_kinetic` | **RUMOR: 10 / 10** | A 'perfect' PHP bug leaked online | Every few months, a rumor explodes across security feeds claiming the entire internet is about to fall over. |
| **#002** | `00:04 – 00:08` | `badge_alert` | **PHP2Shell** | CVE-2026-109618 & CVE-2026-109619 | This week, that rumor had a name: PHP2Shell. |
| **#003** | `00:08 – 00:12` | `statement_kinetic` | **SORTING REAL FROM LOUD** | PHP Foundation · Datadog · Cloudflare · Wiz | At first, I figured it was hype stacked on hype, so I pulled the primary write-ups from the PHP Foundation, Datadog, and Cloudflare. |
| **#004** | `00:12 – 00:16` | `hero_stat` | **9.2 / 10** | OFFICIAL CVSS v4.0 SEVERITY | Here is what is actually real: the official severity landed at 9.2 out of 10—not a 10, but still critical. |
| **#005** | `00:16 – 00:20` | `code_spotlight` | **<?php echo "pong"; ?>** | /var/www/html/index.php — 1 Line of Code | To see why, look at this one-line PHP file that only prints the word pong. |
| **#006** | `00:20 – 00:24` | `statement_kinetic` | **ZERO USER INPUT** | No database · No eval() · No sessions | It doesn't touch a database, it doesn't read user input, and it doesn't even start a session. |
| **#007** | `00:24 – 00:28` | `flow_2node` | **HTTP POST → PHP ENGINE** | Hijacked BEFORE index.php loads | Yet an attacker can send one unauthenticated web request to that server and hijack it before line one of your code ever runs. |
| **#008** | `00:28 – 00:32` | `hero_stat` | **3.10 sec** | SINGLE-REQUEST RCE → HTTP 200 OK | In Datadog's lab test on PHP 8.5.11, a single POST request spawned a shell in 3.10 seconds and still returned HTTP 200 OK. |
| **#009** | `00:32 – 00:36` | `badge_alert` | **NETHERLANDS OFFLINE** | DigiD · overheid.nl · NCSC · Tweakers | The threat was serious enough that on October 21st, the Dutch government took its DigiD login portal and overheid.nl offline as a precaution. |
| **#010** | `00:36 – 00:40` | `statement_kinetic` | **"PULLING THE PLUG"** | Crude—but the one patch that always applies cleanly | They reported no sign of a break-in, but pulling the plug is the one emergency patch that always applies cleanly. |
| **#011** | `00:40 – 00:44` | `badge_alert` | **03:02 AM UTC · OCT 21** | Cloudflare deploys 7 emergency WAF rules | Hours earlier, at 3:02 AM UTC, Cloudflare switched on seven emergency firewall rules across every customer plan, including Free. |
| **#012** | `00:44 – 00:48` | `hero_stat` | **69.3%** | OF KNOWN SERVER-SIDE WEBSITES RUN PHP | Because PHP still powers 69.3 percent of all websites whose server-side language is known, this hits the backbone of the web. |
| **#013** | `00:48 – 00:52` | `flow_2node` | **CVE-2026-109618 + CVE-2026-109619** | Two Twin Flaws in the Zend Engine | Under the hood, PHP2Shell isn't one bug—it is a pair of twin flaws inside PHP's core C runtime. |
| **#014** | `00:52 – 00:56` | `analogy_card` | **THE HOTEL CLERK LEDGER** | Writing 'Room Booked' before checking if a room exists | One is a bookkeeping mistake when PHP runs out of memory; the other is a leftover pointer that poisons the next visitor. |
| **#015** | `00:56 – 01:00` | `statement_kinetic` | **THE 14-YEAR AUTOPSY** | From PHP 5.4 (2012) to PHP 8.5.12 (2026) | Let's strip away the noise, look at the exact four lines of C code that broke, and see how to lock down your servers. |
| **#016** | `01:00 – 01:04` | `statement_kinetic` | **BUG #1: CVE-2026-109618** | Out-of-Memory Bookkeeping Corruption | Let's start with the first bug, CVE-2026-109618, without touching a single line of C code yet. |
| **#017** | `01:04 – 01:08` | `analogy_card` | **STEP 1: THE HOTEL DESK** | A guest walks up to book Room #2 | Picture a hotel clerk standing at a front desk with a paper ledger. |
| **#018** | `01:08 – 01:12` | `analogy_card` | **STEP 2: LEDGER UPDATED FIRST** | Clerk writes: 'Total Occupied Rooms = 2' | Before checking whether a room is actually available, the clerk writes 'Occupied Rooms: 2' in the ledger. |
| **#019** | `01:12 – 01:16` | `analogy_card` | **STEP 3: HOTEL IS FULL!** | Out of Rooms (Out of Memory) | Then the clerk looks up, realizes the hotel is completely full, and walks away from the desk. |
| **#020** | `01:16 – 01:20` | `analogy_card` | **STEP 4: THE GHOST ENTRY** | Ledger still says '2 Rooms' — Slot #2 is blank | Because the clerk bailed out mid-task, the ledger still insists there are two occupied rooms. |
| **#021** | `01:20 – 01:24` | `statement_kinetic` | **MISSING ROOM ≠ EMPTY MEMORY** | In C, uninitialized memory holds old bytes | Now, in the real world, a missing hotel room is just empty air—but in computer memory, it is much worse. |
| **#022** | `01:24 – 01:28` | `analogy_card` | **STALE HEAP BYTES** | Slot #2 still contains bytes from the previous guest | An uninitialized slot in memory still holds whatever raw bytes were left behind by an earlier operation. |
| **#023** | `01:28 – 01:32` | `flow_2node` | **REQUEST SHUTDOWN → READS SLOT #2** | Cleanup trusts the ledger counter (2) | When PHP finishes the failed request and cleans up the room list, it trusts the ledger counter. |
| **#024** | `01:32 – 01:36` | `statement_kinetic` | **FAKE DATA → REAL COMMAND** | Attacker plants bytes that look like a cleanup function | If an attacker planted their own bytes in that memory spot moments earlier, PHP treats those bytes as a real instruction. |
| **#025** | `01:36 – 01:40` | `statement_kinetic` | **BUG #2: CVE-2026-109619** | Stale Global State Across Requests | Now compare that with the second bug, CVE-2026-109619. |
| **#026** | `01:40 – 01:44` | `flow_2node` | **1 WORKER PROCESS → 1,000s OF REQUESTS** | Apache mod_php & PHP-FPM reuse workers | To stay fast, a PHP web server doesn't start a brand-new process for every visitor; one worker handles thousands of requests in a row. |
| **#027** | `01:44 – 01:48` | `analogy_card` | **WHITEBOARD vs. SCRATCHPAD** | Worker Globals (Persistent) vs. Request Memory (Wiped) | Think of the worker as having a permanent wall whiteboard for global state, and a paper scratchpad that gets shredded after each request. |
| **#028** | `01:48 – 01:52` | `flow_2node` | **WHITEBOARD NOTE → POINTS TO SCRATCHPAD** | Global pointer references Request #1 memory | During Request Number One, PHP jots an arrow on the permanent whiteboard pointing to a page on the temporary scratchpad. |
| **#029** | `01:52 – 01:56` | `badge_alert` | **FATAL ERROR MID-REQUEST** | Scratchpad shredded — Whiteboard arrow NOT erased! | Then a fatal error hits. PHP shreds the scratchpad, but skips the step that erases the arrow on the permanent whiteboard. |
| **#030** | `01:56 – 02:00` | `flow_2node` | **REQUEST #2 ARRIVES → FOLLOWS OLD ARROW** | Use-After-Free across request boundaries | When Request Number Two lands on that same worker a millisecond later, PHP follows the old arrow into freed memory. |
| **#031** | `02:00 – 02:04` | `statement_kinetic` | **TWO SIDES OF ONE COIN** | Broken cleanup after a sudden fatal abort | So both CVEs are really two sides of the same architectural flaw: PHP aborting a request without cleaning up its state. |
| **#032** | `02:04 – 02:08` | `hero_stat` | **LINE 0** | TRIGGERS DURING HTTP PARSING | And because both bugs can be triggered while PHP is still unpacking the incoming HTTP request, your app code never gets a vote. |
| **#033** | `02:08 – 02:12` | `statement_kinetic` | **NO LOGIN REQUIRED** | Pre-Authentication · Network Exploitable | Login checks, CSRF tokens, and application-level firewalls sitting inside PHP are bypassed completely. |
| **#034** | `02:12 – 02:16` | `hero_stat` | **2012** | VULNERABLE SINCE PHP 5.4.0 | How wide is the blast radius? The vulnerable code path has been sitting in PHP since version 5.4.0, shipped in 2012. |
| **#035** | `02:16 – 02:20` | `statement_kinetic` | **14 YEARS OF CODE** | PHP 5.4 · 5.5 · 5.6 · 7.x · 8.0 · 8.1 · 8.2 · 8.3 · 8.4 · 8.5 | Every single release from PHP 5.4 through PHP 8.5.11 inherited the exact same assumption. |
| **#036** | `02:20 – 02:24` | `hero_stat` | **2.23M** | INTERNET-FACING PHP SERVERS ON SHODAN | Shodan telemetry tracks roughly 2.23 million internet-facing servers openly advertising a PHP header. |
| **#037** | `02:24 – 02:28` | `hero_stat` | **1.50M** | DISCLOSE EXACT VERSION NUMBERS | About 1.5 million of those servers reveal their exact PHP version number in public HTTP responses. |
| **#038** | `02:28 – 02:32` | `hero_stat` | **883,717** | SERVERS ON END-OF-LIFE PHP (59%) | And here is the scariest number in the dataset: 883,717 of those servers—nearly 59 percent—run End-of-Life PHP versions. |
| **#039** | `02:32 – 02:36` | `flow_2node` | **PHP 5.x & 7.x (698K) + PHP 8.0/8.1 (186K)** | No official upstream binary releases | That is almost 700,000 servers on PHP 5 and 7, plus another 186,000 on PHP 8.0 and 8.1, which get no official upstream binary updates. |
| **#040** | `02:36 – 02:40` | `badge_alert` | **EVERY MAJOR CMS IN SCOPE** | WordPress · Drupal · Magento · Laravel · Symfony · Nextcloud | Because the flaw lives in the engine, researchers confirmed pre-auth exploitation against default installs of WordPress, Drupal, Magento, and Laravel. |
| **#041** | `02:40 – 02:44` | `flow_2node` | **APACHE mod_php vs. PHP-FPM** | Both SAPIs confirmed exploitable | Early rumors claimed only Apache mod_php was vulnerable, while Nginx with PHP-FPM was safe. |
| **#042** | `02:44 – 02:48` | `statement_kinetic` | **THAT RUMOR WAS WRONG** | Both mod_php and PHP-FPM are vulnerable | The advisories proved that rumor wrong: while mod_php is the easiest target, PHP-FPM is also vulnerable across both CVEs. |
| **#043** | `02:48 – 02:52` | `code_spotlight` | **session.upload_progress.enabled = 1** | Enabled by default in standard php.ini! | Why? Because PHP's session upload progress handler is enabled by default in php.ini—even if your app never calls session_start(). |
| **#044** | `02:52 – 02:56` | `flow_2node` | **MULTIPART UPLOAD → SESSION HOOK** | Runs during request startup in mod_php & FPM | Simply sending a multipart form upload with a session cookie activates that C code path before your script begins. |
| **#045** | `02:56 – 03:00` | `badge_alert` | **FRANKENPHP · LITESPEED · PHP-CGI** | All persistent & CGI web SAPIs affected | FrankenPHP, LiteSpeed, and traditional PHP-CGI are all in scope as well. |
| **#046** | `03:00 – 03:04` | `statement_kinetic` | **WHY CVSS 9.2 INSTEAD OF 10.0?** | Requires specific server/heap conditions (`AT:P`) | So why did the PHP Foundation score it 9.2 instead of a flat 10.0? Because turning the crash into RCE depends on allocator and SAPI layout. |
| **#047** | `03:04 – 03:08` | `hero_stat` | **9.8 / 10** | NVD CVSS v3.1 BASE SCORE | Under the older CVSS v3.1 formula used by NVD and Red Hat, it still clocks in at 9.8 Critical. |
| **#048** | `03:08 – 03:12` | `statement_kinetic` | **SEMANTICS DON'T BLOCK SHELLS** | 9.2 vs 9.8 vs 10.0 — An unpatched server is owned | Whether you call it a 9.2 or a 9.8, an unauthenticated shell in three seconds is a drop-everything emergency. |
| **#049** | `03:12 – 03:16` | `statement_kinetic` | **HOW DID THIS SURVIVE 14 YEARS?** | And why did the disclosure turn into chaos? | Which raises a bigger question: how did a bug like this hide for 14 years, and then leak in the middle of the night? |
| **#050** | `03:16 – 03:20` | `badge_alert` | **2024 · SOVEREIGN TECH AGENCY** | Funds Quarkslab / OSTIF security audit of PHP | On October 21st, the PHP Foundation published a remarkably honest postmortem: the first clue actually surfaced two years ago, in 2024. |
| **#051** | `03:20 – 03:24` | `flow_2node` | **QUARKSLAB AUDIT → CORE DEV SPOTS BUG** | Out-of-memory bailout hazard identified in 2024 | While fixing a finding from the 2024 Quarkslab audit, a PHP core developer noticed that running out of memory left data structures half-built. |
| **#052** | `03:24 – 03:28` | `statement_kinetic` | **THEORIZED IN 2024 — NO RCE KNOWN** | No working exploit existed yet | Back in 2024, an exploit was theorized, but nobody had demonstrated a working remote code execution chain. |
| **#053** | `03:28 – 03:32` | `analogy_card` | **THE MAINTAINER DILEMMA** | Every proposed fix broke C extensions or hurt speed | And fixing it was a nightmare: every proposed patch either slowed down PHP, broke backward compatibility, or crashed third-party extensions. |
| **#054** | `03:32 – 03:36` | `statement_kinetic` | **CONSENSUS DEADLOCK** | Work stalled and restarted for 2 years | Because PHP's security group operated by strict consensus, the discussion deadlocked, stalling and restarting for nearly two years. |
| **#055** | `03:36 – 03:40` | `badge_alert` | **JULY 30, 2026 · PATCH THE PLANET** | Calif.io begins AI-assisted audit of PHP | Then came the summer of 2026. On July 30th, security firm Calif began auditing PHP under the Patch the Planet initiative. |
| **#056** | `03:40 – 03:44` | `hero_stat` | **12 DAYS** | FROM AUDIT START TO PRE-AUTH RCE | It took Calif researcher Ryan Austin—known as LCFR—just twelve days to turn that 2024 hazard into a full pre-auth RCE. |
| **#057** | `03:44 – 03:48` | `badge_alert` | **AUGUST 11, 2026** | Ryan Austin (Calif.io) submits RCE PoC to PHP | On August 11th, 2026, Calif submitted their working exploit to the PHP security team. |
| **#058** | `03:48 – 03:52` | `badge_alert` | **AUGUST 24, 2026 · WIZ RESEARCH** | Independently reports the bugs using Gemini 4 Argon | Thirteen days later, on August 24th, Wiz Research independently reported the exact same bug class using Google's Gemini 4 Argon model. |
| **#059** | `03:52 – 03:56` | `badge_alert` | **SEPTEMBER 18, 2026 · OPENAI** | Codex Security (Amy Burnett) finds new vectors | And on September 18th, OpenAI's security team reported the same root cause plus brand-new exploit paths using Codex Security. |
| **#060** | `03:56 – 04:00` | `statement_kinetic` | **THREE AI TEAMS IN 38 DAYS** | A 14-year bug suddenly had 3 independent PoCs | Think about that: a bug that sat dormant for 14 years was independently weaponized by three AI-assisted teams in 38 days. |
| **#061** | `04:00 – 04:04` | `badge_alert` | **OCTOBER 17, 2026 · 0-DAY IN THE WILD** | AWS MadPot honeypots catch live PHP2Shell probes | Coordinated release was set for October 22nd—but on October 17th, Amazon's MadPot honeypots caught attackers testing PHP2Shell in the wild. |
| **#062** | `04:04 – 04:08` | `badge_alert` | **OCT 20 · 15:00 UTC · HACKER NEWS LEAK** | CVE IDs & 'CVSS 10.0' rumor posted publicly | On October 20th at 15:00 UTC, someone leaked the CVE numbers on Hacker News, sparking global panic. |
| **#063** | `04:08 – 04:12` | `badge_alert` | **OCT 20 · 20:00 UTC · ACCIDENTAL VIDEO** | Calif.io PoC video goes public briefly, then deleted | PHP moved the patch forward by 24 hours; that evening, Calif accidentally published—and quickly deleted—their exploit demo video. |
| **#064** | `04:12 – 04:16` | `badge_alert` | **OCT 21 · 03:02 UTC · CLOUDFLARE WAF** | 7 emergency rules deployed 11h before patch | At 03:02 UTC on October 21st, Cloudflare rolled out seven emergency WAF rules using full-transaction inspection. |
| **#065** | `04:16 – 04:20` | `badge_alert` | **OCT 21 · 07:41 UTC · CHAINGUARD LEAK** | Patched container images pushed 6 hours early! | Then at 07:41 UTC—six hours before the embargo lifted—Chainguard pushed patched PHP images to a public registry. |
| **#066** | `04:20 – 04:24` | `hero_stat` | **2 MIN** | 07:41 UTC PUSH → 07:43 UTC FIRST ATTACK | Two minutes later, at 07:43 UTC, Cloudflare recorded the first exploitation attempt against its network. |
| **#067** | `04:24 – 04:28` | `badge_alert` | **OCT 21 · 14:00 UTC · OFFICIAL RELEASE** | PHP 8.5.12 · 8.4.27 · 8.3.36 · 8.2.35 ship | At 14:00 UTC, PHP officially shipped versions 8.5.12, 8.4.27, 8.3.36, and 8.2.35. |
| **#068** | `04:28 – 04:32` | `statement_kinetic` | **THE EMBARGO ERA IS BREAKING** | Binary diffs are weaponized in minutes | The lesson from that timeline is brutal: once a patch hits a public container registry, attackers diff the binary in minutes. |
| **#069** | `04:32 – 04:36` | `statement_kinetic` | **NOW LET'S OPEN THE C CODE** | Why does running out of memory hijack PHP? | Now let's look under the hood of the Zend Engine. Why does running out of memory cause code execution instead of a clean error? |
| **#070** | `04:36 – 04:40` | `flow_2node` | **C LANGUAGE ≠ C++ / RUST** | No try/catch exceptions · No automatic destructors | PHP's interpreter is written in standard C—a language without native try-catch exceptions or automatic stack unwinding. |
| **#071** | `04:40 – 04:44` | `code_spotlight` | **memory_limit = 128M** | Per-request heap ceiling in php.ini | Yet every PHP web request runs inside a strict memory budget defined by memory_limit in php.ini. |
| **#072** | `04:44 – 04:48` | `code_spotlight` | **ptr = emalloc(size);** | Zend Memory Manager checks memory_limit on every alloc | Whenever PHP needs memory for an array or string, it calls its custom allocator, emalloc(), which checks that budget. |
| **#073** | `04:48 – 04:52` | `statement_kinetic` | **WHAT IF emalloc() FAILS?** | In normal C, malloc() returns NULL | In a normal C program, if an allocation fails, malloc returns NULL and the caller cleans up its variables. |
| **#074** | `04:52 – 04:56` | `code_spotlight` | **zend_bailout(); /* Never returns! */** | emalloc() does NOT return NULL on OOM | PHP doesn't do that. When emalloc() crosses memory_limit, it never returns NULL to the function that called it. |
| **#075** | `04:56 – 05:00` | `code_spotlight` | **longjmp(*EG(bailout), FAILURE);** | Zend/zend.c — Non-Local Stack Teleport | Instead, PHP calls zend_bailout(), a macro that fires the C library function longjmp(). |
| **#076** | `05:00 – 05:04` | `analogy_card` | **THE EJECTION SEAT** | longjmp() teleports the CPU straight to shutdown | Think of longjmp() as an emergency ejection seat for the CPU instruction pointer. |
| **#077** | `05:04 – 05:08` | `flow_2node` | **FRAME 5 (emalloc) ➔ FRAME 1 (shutdown)** | Frames 2, 3, and 4 are completely skipped! | It teleports execution from deep inside the memory allocator straight back to the top-level recovery loop. |
| **#078** | `05:08 – 05:12` | `statement_kinetic` | **NO LOCAL ROLLBACK** | Intermediate C functions freeze mid-sentence | Every intermediate C function on the call stack is abandoned mid-sentence, with zero chance to undo its work. |
| **#079** | `05:12 – 05:16` | `flow_2node` | **zend_bailout() → php_request_shutdown()** | Shutdown walks $_POST, $_SESSION, and Globals | And where does that ejection seat land? Right inside php_request_shutdown(), which immediately starts freeing request arrays. |
| **#080** | `05:16 – 05:20` | `analogy_card` | **THE FATAL FLAW** | Shutdown assumes every array counter is 100% honest | Here is the fatal flaw: the shutdown routine assumes every array and hash table in memory is in a consistent, finished state. |
| **#081** | `05:20 – 05:24` | `statement_kinetic` | **INCREMENT FIRST, ALLOCATE SECOND** | If longjmp() fires in between, the struct lies | If any C function updated a counter on line one, and called emalloc() on line four, an OOM bailout leaves the structure lying. |
| **#082** | `05:24 – 05:28` | `hero_stat` | **30+ SITES** | ACROSS THE ZEND ENGINE HAD THIS PATTERN | When researchers audited the codebase, they didn't find just one place doing this—they found dozens across the engine. |
| **#083** | `05:28 – 05:32` | `code_spotlight` | **Zend/zend_hash.c** | Home of PHP's core HashTable (_zend_array) | And the most dangerous one of all sat right inside Zend/zend_hash.c—the file that builds $_POST. |
| **#084** | `05:32 – 05:36` | `statement_kinetic` | **EVERY PHP ARRAY IS A HASHTABLE** | $_POST · $_GET · $_COOKIE · $_SESSION | Remember, in PHP, every array—including $_POST, $_GET, and $_SESSION—is stored as a C struct called _zend_array. |
| **#085** | `05:36 – 05:40` | `flow_2node` | **Header (nNumUsed) → Bucket Array (arData)** | How _zend_array tracks its elements | Each _zend_array has a header counter called nNumUsed, and a contiguous array of Bucket slots called arData. |
| **#086** | `05:40 – 05:44` | `code_spotlight` | **_zend_hash_str_add_or_update_i()** | Zend/zend_hash.c (PHP 8.5.11) | Let's zoom in on the exact C function that inserts a string key into a PHP array: _zend_hash_str_add_or_update_i(). |
| **#087** | `05:44 – 05:48` | `statement_kinetic` | **FOUR LINES OF C CODE** | Let's read them one line at a time | There are four consecutive lines of C here that Datadog Security Labs highlighted in their reproduction. |
| **#088** | `05:48 – 05:52` | `code_spotlight` | **1:  idx = ht->nNumUsed++;** | Increments used bucket counter (1 → 2) FIRST! | Line one: idx equals ht arrow nNumUsed plus-plus. PHP increments the count of used buckets from one to two. |
| **#089** | `05:52 – 05:56` | `code_spotlight` | **2:  ht->nNumOfElements++;** | Increments active element counter (1 → 2) | Line two: ht arrow nNumOfElements plus-plus. Now PHP increments the active element count to two as well. |
| **#090** | `05:56 – 06:00` | `code_spotlight` | **3:  p = ht->arData + idx;** | Points 'p' at the second slot: Bucket[1] | Line three: p equals ht arrow arData plus idx. PHP aims pointer p at the second bucket slot in memory. |
| **#091** | `06:00 – 06:04` | `code_spotlight` | **4:  p->key = zend_string_init(str, len, ...);** | Allocates heap memory for the key string LAST! | And only now, on line four, does PHP call zend_string_init() to allocate heap memory for the form field's key name. |
| **#092** | `06:04 – 06:08` | `badge_alert` | **THE TRAP SPRINGS ON LINE 4** | 3.5MB key crosses memory_limit → longjmp()! | Pause right on line four. What happens if that form field name is 3.5 megabytes long and pushes PHP over memory_limit? |
| **#093** | `06:08 – 06:12` | `flow_2node` | **zend_string_init() → zend_bailout()** | Teleports out before p->val is ever written! | zend_string_init() runs out of memory and fires longjmp(), teleporting out of the function before p arrow val is ever touched. |
| **#094** | `06:12 – 06:16` | `code_spotlight` | **/* NEVER REACHED: */ ZVAL_COPY_VALUE(&p->val, pData);** | Line 787 of Zend/zend_hash.c is skipped! | The lines that were supposed to write the value and type tag into Bucket number two are never reached. |
| **#095** | `06:16 – 06:20` | `analogy_card` | **THE CORRUPTED $_POST HEADER** | ht->nNumUsed = 2  \|  ht->arData[1] = UNINITIALIZED | Look at the state of $_POST now: its header swears it has two valid buckets, but Bucket number two is completely uninitialized. |
| **#096** | `06:20 – 06:24` | `statement_kinetic` | **WHY NESTED ARRAY SYNTAX?** | Plain 'FOO=1' vs. 'FOO[x]=1' | Now, there is a subtle detail here: if you just send a giant plain variable like ZZZ equals 1, this bug doesn't trigger. |
| **#097** | `06:24 – 06:28` | `flow_2node` | **Plain Key: zend_symtable_update()** | Allocates string BEFORE touching HashTable | Why? Because for a plain top-level variable, PHP allocates the key string before it updates the hash table counters. |
| **#098** | `06:28 – 06:32` | `code_spotlight` | **&ZZZZZZ...[3.5MB]...[x]=1** | Bracket syntax [x] forces _zend_hash_str_add_or_update_i() | To reach the vulnerable four lines, the attacker appends bracket x—turning the field into a nested array key. |
| **#099** | `06:32 – 06:36` | `flow_2node` | **1st Copy (ext/filter): OK → 2nd Copy ($_POST): OOM!** | Precise memory_limit window | Even cleverer: PHP's input filter copies the key once, which succeeds—and the second copy into $_POST hits the ceiling and bails out. |
| **#100** | `06:36 – 06:40` | `code_spotlight` | **zend_hash_destroy($_POST);** | php_request_shutdown() iterates nNumUsed (2) buckets | Moments later, php_request_shutdown() calls zend_hash_destroy() on $_POST, looping over both buckets. |
| **#101** | `06:40 – 06:44` | `flow_2node` | **Bucket[0]: Valid ('a'=1) → Bucket[1]: Ghost Bytes** | Destructor executes on attacker-controlled bytes | Bucket zero is cleaned up normally, and then PHP's destructor walks straight into the ghost bytes sitting in Bucket one. |
| **#102** | `06:44 – 06:48` | `statement_kinetic` | **CRASH vs. SHELL** | How do you control the bytes inside Bucket[1]? | If Bucket one holds random garbage, PHP just segfaults. So how does the attacker plant exact exploit bytes inside Bucket one? |
| **#103** | `06:48 – 06:52` | `statement_kinetic` | **THE 3-STAGE EXPLOIT CHAIN** | Stage 1: Groom · Stage 2: Leak · Stage 3: Hijack | This is where the exploit turns into surgical heap choreography across three distinct stages. |
| **#104** | `06:52 – 06:56` | `hero_stat` | **320 Bytes** | THE MAGIC ZEND ALLOCATOR SLAB SIZE | Stage One is all about a single number in PHP's memory manager: the 320-byte slab bin. |
| **#105** | `06:56 – 07:00` | `analogy_card` | **HOW ZENDMM RECYCLES MEMORY** | Freed 320B chunks go to the top of the 320B freelist | PHP's memory manager groups small allocations into fixed size bins—and when a 320-byte chunk is freed, the very next 320-byte request gets it back. |
| **#106** | `07:00 – 07:04` | `code_spotlight` | **=<276-byte binary payload>&a=1&ZZZ...[x]=1** | The 3-Field HTTP POST Body | Look at the three fields in the attacker's POST body: first, an empty field name, equals 276 bytes of raw binary data. |
| **#107** | `07:04 – 07:08` | `flow_2node` | **276B Payload + zend_string Header = 320B Chunk** | Allocated by urlencoded parser | Once PHP wraps those 276 bytes in a zend_string header, the allocation lands squarely inside the 320-byte bin. |
| **#108** | `07:08 – 07:12` | `flow_2node` | **Empty Variable Name ("") → Immediately Freed!** | Planted bytes remain intact inside the freed 320B chunk | Then PHP sees the variable name before the equals sign is empty, so it drops the variable and frees that 320-byte chunk—without zeroing the bytes! |
| **#109** | `07:12 – 07:16` | `code_spotlight` | **Field #2:  &a=1** | Forces PHP to allocate backing storage for $_POST | Immediately, PHP parses the second field: ampersand a equals 1. |
| **#110** | `07:16 – 07:20` | `flow_2node` | **$_POST Backing Array Needs 320B → Grabs Freed Chunk!** | Bucket[0] = 'a':1  \|  Bucket[1..7] = Attacker Bytes! | To store $_POST, PHP asks the allocator for a 320-byte chunk—and gets back the exact chunk holding the attacker's binary payload! |
| **#111** | `07:20 – 07:24` | `analogy_card` | **THE TRAP IS BAITED** | Bucket[0] overwritten with 'a=1' · Bucket[1] holds forged zval | Writing 'a equals 1' overwrites Bucket zero, leaving the attacker's forged zval sitting untouched in Bucket one. |
| **#112** | `07:24 – 07:28` | `code_spotlight` | **Field #3:  &ZZZZZZ...[3.5MB]...[x]=1** | Increments nNumUsed to 2, then triggers OOM longjmp() | Then Field Three arrives with the 3.5-megabyte nested key, bumping nNumUsed to two and firing longjmp(). |
| **#113** | `07:28 – 07:32` | `statement_kinetic` | **STAGE 2: DEFEATING ASLR** | How does the attacker know where memory lives? | Now for Stage Two: modern servers randomize memory addresses using ASLR. How does the attacker know where to point Bucket one? |
| **#114** | `07:32 – 07:36` | `code_spotlight` | **Set-Cookie: PHPSESSID=<leaked_heap_bytes>** | OOM Use-After-Free in session.upload_progress | Calif and Wiz chained a second OOM primitive in session upload progress that tricks PHP into reflecting freed heap memory inside the PHPSESSID cookie! |
| **#115** | `07:36 – 07:40` | `badge_alert` | **FULL MEMORY DISCLOSURE** | Leaks heap addresses, libc pointers & app secrets | That cookie hands the attacker live heap addresses and libc pointers—and can even leak sensitive data from earlier requests on that worker. |
| **#116** | `07:40 – 07:44` | `statement_kinetic` | **STAGE 3: HIJACKING pDestructor** | Turning array cleanup into system() | With the exact memory addresses in hand, Stage Three hijacks PHP's garbage collector. |
| **#117** | `07:44 – 07:48` | `flow_2node` | **Bucket[1].val (IS_ARRAY) → Forged _zend_array** | Planted inside the same 320-byte chunk | The planted bytes in Bucket one mark its type as IS_ARRAY, pointing right into a forged _zend_array structure. |
| **#118** | `07:48 – 07:52` | `code_spotlight` | **ht->pDestructor = &system;** | Every PHP HashTable has a destructor function pointer! | Every PHP HashTable has a function pointer called pDestructor that PHP calls on each element when destroying the array. |
| **#119** | `07:52 – 07:56` | `flow_2node` | **zend_hash_destroy() → calls ht->pDestructor(elem)** | Calls system("sh -c '...'")! | The attacker sets pDestructor to the address of the C library function system(), and puts their shell command in the first element. |
| **#120** | `07:56 – 08:00` | `terminal_one` | **uid=33(www-data) gid=33(www-data) — HTTP/1.1 200 OK** | Shell executes and worker survives cleanly | When zend_hash_destroy() cleans up the fake array, PHP dutifully calls system() on the attacker's command and returns HTTP 200 OK. |
| **#121** | `08:00 – 08:04` | `statement_kinetic` | **NO CRASH. NO 500 ERROR.** | The Apache worker stays alive for the next request | Because the forged structures are carefully balanced, the worker process doesn't even crash—it stays alive and serves HTTP 200. |
| **#122** | `08:04 – 08:08` | `terminal_one` | **PHP Fatal error: Allowed memory size exhausted in Unknown on line 0** | The ONLY trace left in the PHP error log | The only clue left behind in the PHP error log is a single line: Allowed memory size exhausted in Unknown on line 0. |
| **#123** | `08:08 – 08:12` | `statement_kinetic` | **INSIDE CVE-2026-109619** | Cross-Request Use-After-Free (CVSS 9.2) | Now let's look at the twin vulnerability, CVE-2026-109619, which breaks the wall between separate HTTP requests. |
| **#124** | `08:12 – 08:16` | `flow_2node` | **Request #1 (Fails) ➔ Worker PID 4102 ➔ Request #2 (Hijacked)** | Persistent worker state carries the poison | Instead of exploiting the request that ran out of memory, CVE-2026-109619 booby-traps the worker for the next request. |
| **#125** | `08:16 – 08:20` | `statement_kinetic` | **THREE CONFIRMED VECTORS** | Upload Progress · Fatal Backtraces · OPcache | The PHP Foundation and Wiz Research confirmed three distinct code paths where global state survives a fatal bailout. |
| **#126** | `08:20 – 08:24` | `code_spotlight` | **Vector 1: session.upload_progress (rfc1867.c)** | Global upload tracking retains freed request pointers | Vector One is RFC 1867 file upload tracking: a mid-upload OOM leaves global upload-progress pointers aimed at freed request memory. |
| **#127** | `08:24 – 08:28` | `flow_2node` | **Next Upload on Same Worker → Dereferences Freed Struct** | Use-After-Free before script init | When the next file upload lands on that worker, PHP dereferences the dangling pointer before request initialization resets it. |
| **#128** | `08:28 – 08:32` | `code_spotlight` | **Vector 2: fatal_error_backtraces (PHP 8.5)** | Shutdown diagnostic recreates global backtrace state | Vector Two hits PHP 8.5's fatal error backtrace feature: a late shutdown diagnostic can populate global backtrace state after cleanup. |
| **#129** | `08:32 – 08:36` | `flow_2node` | **Request #2 Startup Warning → Reads Dangling Backtrace** | Triggers UAF before Request #2 clears globals | If the very next request emits an early startup warning, PHP reads that freed backtrace pointer and corrupts memory. |
| **#130** | `08:36 – 08:40` | `code_spotlight` | **Vector 3: OPcache Shared Memory Type Confusion** | Demonstrated by Wiz Research across workers | And Vector Three, demonstrated by Wiz Research, abuses shared-memory state in OPcache to trigger type confusion across workers. |
| **#131** | `08:40 – 08:44` | `analogy_card` | **WHY MULTI-REQUEST BUGS ARE NASTY** | WAFs inspecting single requests miss split payloads | Cross-request bugs are especially nasty because a firewall looking at one request at a time only sees half of the attack. |
| **#132** | `08:44 – 08:48` | `flow_2node` | **Request A: Triggers OOM → Request B: Harvests Leaked Cookie** | Cloudflare needed Full-Transaction Detection | That is why Cloudflare had to use full-transaction detection—correlating the incoming request with the outgoing response cookie. |
| **#133** | `08:48 – 08:52` | `badge_alert` | **CLOUDFLARE'S OWN WARNING** | "Treat WAF rules as a temporary layer, not a replacement" | And even Cloudflare was blunt in their advisory: treat firewall rules as a temporary shield, never a replacement for patching PHP. |
| **#134** | `08:52 – 08:56` | `statement_kinetic` | **WHY? PAYLOAD COMPRESSION & CHUNKING** | HTTP encodings can blind network-layer signatures | Because PHP unpacks encodings, multipart boundaries, and nested keys internally, network filters cannot catch every variant forever. |
| **#135** | `08:56 – 09:00` | `hero_stat` | **7 RULES** | DEPLOYED AT 03:02 UTC OCT 21 ACROSS ALL PLANS | Those seven rules bought the internet eleven critical hours of breathing room on October 21st—but the binary patch is mandatory. |
| **#136** | `09:00 – 09:04` | `statement_kinetic` | **HOW DID PHP PATCH THIS?** | And what did Datadog find in the 8.5.12 diff? | Which brings us to the patch itself. How did PHP fix a flaw woven into thirty years of C code? |
| **#137** | `09:04 – 09:08` | `code_spotlight` | **git diff php-8.5.11 php-8.5.12** | Inspecting the official security commits | When Datadog diffed PHP 8.5.12 against 8.5.11, they found a surprise that every security engineer should know about. |
| **#138** | `09:08 – 09:12` | `code_spotlight` | **idx = ht->nNumUsed++; /* STILL FIRST IN 8.5.12! */** | Zend/zend_hash.c was NOT reordered! | Inside _zend_hash_str_add_or_update_i(), PHP 8.5.12 still increments nNumUsed++ before allocating the key! |
| **#139** | `09:12 – 09:16` | `statement_kinetic` | **WAIT—WHY DIDN'T THEY SWAP THE LINES?** | Why leave ht->nNumUsed++ before the allocation? | Wait a second—why didn't the PHP team just move the counter increment below the memory allocation? |
| **#140** | `09:16 – 09:20` | `analogy_card` | **WHACK-A-MOLE ACROSS 1,000,000 LINES** | Fixing one function leaves dozens of other bailout traps | Because playing whack-a-mole with every counter-first C function across a million-line engine would miss edge cases and break extensions. |
| **#141** | `09:20 – 09:24` | `statement_kinetic` | **INSTEAD, PHP CHANGED HOW OOM WORKS** | Two-Tier Memory Exhaustion: Soft Limit + Hard Limit | Instead of rewriting every data structure, the PHP Foundation redesigned how out-of-memory errors interrupt the engine. |
| **#142** | `09:24 – 09:28` | `flow_2node` | **TIER 1: SOFT MEMORY LIMIT** | Allocation finishes cleanly → Error deferred to safe point! | First, they introduced a Soft Memory Limit: when an allocation crosses memory_limit, PHP no longer fires longjmp() mid-instruction. |
| **#143** | `09:28 – 09:32` | `analogy_card` | **FINISH THE LEDGER LINE FIRST** | Bucket[1] is fully initialized before PHP aborts | It lets the in-progress allocation finish so the hash table bucket is completely initialized, and only bails out at the next safe checkpoint. |
| **#144** | `09:32 – 09:36` | `flow_2node` | **TIER 2: HARD MEMORY LIMIT** | Immediate _exit(137) — Zero destructor cleanup! | Second, if an allocation is so massive that it crosses a Hard Limit where memory genuinely cannot be granted, PHP doesn't run shutdown destructors at all. |
| **#145** | `09:36 – 09:40` | `code_spotlight` | **_exit(137); /* Kill worker immediately */** | No zend_hash_destroy() on half-built structures! | It immediately terminates the worker process with _exit(137), guaranteeing that pDestructor is never called on corrupted memory. |
| **#146** | `09:40 – 09:44` | `code_spotlight` | **PG(upload_progress) = NULL; EG(backtrace) = NULL;** | Explicit global state zeroing for CVE-2026-109619 | Third, to close CVE-2026-109619, PHP now explicitly zeroes out upload-progress, error, exception, and serialization globals during shutdown. |
| **#147** | `09:44 – 09:48` | `badge_alert` | **DATADOG'S ARCHITECTURAL NOTE** | Non-OOM bailouts remain a future research surface | As Datadog noted, this is a smart defense-in-depth fix for OOM—though any future non-OOM bailout path will still need careful auditing. |
| **#148** | `09:48 – 09:52` | `statement_kinetic` | **GOVERNANCE REFORM AT PHP** | Moving away from deadlock-prone strict consensus | The PHP Foundation also announced major governance reforms so critical architectural fixes can never stall in committee for two years again. |
| **#149** | `09:52 – 09:56` | `badge_alert` | **NEW: DEDICATED SECURITY TEAM LEAD** | Faster triage · Shorter embargoes · Private distro sync | They are appointing a dedicated Security Team Lead, tightening embargo rules after the Chainguard leak, and expanding fuzzing. |
| **#150** | `09:56 – 10:00` | `statement_kinetic` | **AI FOUND IT. HUMANS FIXED IT.** | Calif · Wiz · OpenAI vs. Core Maintainers | It is a fascinating moment in software history: frontier AI models found the exploit chains, while human maintainers re-engineered the runtime. |
| **#151** | `10:00 – 10:04` | `flow_2node` | **MACHINE-SPEED OFFENSE ➔ HUMAN-SPEED DEFENSE** | Why open-source infrastructure funding matters | When offensive bug discovery moves at machine speed, open-source maintainers need the funding and authority to ship structural fixes fast. |
| **#152** | `10:04 – 10:08` | `statement_kinetic` | **NOW: WHAT SHOULD YOU DO TODAY?** | The 3-Group Action Playbook | Now let's get practical. Following the exact breakdown from our reference briefing, let's split your action plan into three groups. |
| **#153** | `10:08 – 10:12` | `flow_2node` | **1. Ordinary Users · 2. Site Owners · 3. Developers & SecOps** | Clear steps for each role | Here is what ordinary users, website owners, and server administrators each need to do right now. |
| **#154** | `10:12 – 10:16` | `badge_alert` | **GROUP 1: ORDINARY INTERNET USERS** | You don't run PHP on your laptop—but your accounts live on it | Group One: if you are an ordinary user, you don't run PHP on your laptop, so there is nothing for you to patch locally. |
| **#155** | `10:16 – 10:20` | `analogy_card` | **THE PHPSESSID SESSION LEAK RISK** | Unpatched sites can leak session tokens from worker memory | However, because CVE-2026-109618 can leak session tokens and secrets from server memory, any PHP site you log into could be exposed. |
| **#156** | `10:20 – 10:24` | `statement_kinetic` | **LOG OUT & ROTATE SESSIONS** | Re-authenticate on critical portals after they patch | If you use smaller forums, self-hosted Nextcloud instances, or regional portals that went offline this week, log out and log back in once patched. |
| **#157** | `10:24 – 10:28` | `badge_alert` | **GROUP 2: WEBSITE & STORE OWNERS** | WordPress · WooCommerce · Magento · Drupal · Joomla | Group Two: if you own a WordPress, WooCommerce, Magento, or Drupal site on managed hosting, do not assume your host patched it. |
| **#158** | `10:28 – 10:32` | `code_spotlight` | **<?php echo PHP_VERSION . ' / ' . php_sapi_name(); ?>** | Check the WEB SAPI version—not just 'php -v' on CLI! | Check the PHP version running your web SAPI—not just php dash v on the command line, which often points to a different binary. |
| **#159** | `10:32 – 10:36` | `statement_kinetic` | **PATCHED VERSION CHECKLIST** | 8.5.12 · 8.4.27 · 8.3.36 · 8.2.35 | You want to see PHP 8.5.12, 8.4.27, 8.3.36, or 8.2.35. |
| **#160** | `10:36 – 10:40` | `flow_2node` | **ENABLE CLOUDFLARE / WAF → PATCH ORIGIN** | Use the 7 managed rules while upgrading | If your site sits behind Cloudflare, keep their managed PHP rules enabled, and make sure attackers cannot bypass the proxy to hit your origin IP. |
| **#161** | `10:40 – 10:44` | `badge_alert` | **GROUP 3: DEVELOPERS & SYSADMINS** | Bare Metal · Docker · Kubernetes · cPanel · Plesk | Group Three: if you manage the servers or containers yourself, here is your step-by-step engineering checklist. |
| **#162** | `10:44 – 10:48` | `terminal_one` | **systemctl restart php8.4-fpm apache2** | CRITICAL: Upgrading packages without restarting workers leaves old RAM live! | Step One: after updating your PHP packages or container base images, restart every php-fpm pool and Apache worker process. |
| **#163** | `10:48 – 10:52` | `analogy_card` | **WHY RESTARTING MATTERS** | Linux keeps the old vulnerable binary in RAM until workers restart | On Linux, updating a package on disk does not replace the binary already running inside persistent worker memory. |
| **#164** | `10:52 – 10:56` | `badge_alert` | **STUCK ON EOL PHP 7.4, 8.0, OR 8.1?** | Use vendor LTS backports (Ubuntu/Debian deb.sury.org, RHEL, AlmaLinux) | Step Two: if a legacy app locks you onto PHP 7.4, 8.0, or 8.1, apply the minimal source backports or distro LTS packages immediately. |
| **#165** | `10:56 – 11:00` | `code_spotlight` | **php_admin_flag[session.upload_progress.enabled] = off** | Partial stopgap #1: Closes upload-progress UAF vector | Step Three: if you need a temporary stopgap for a few hours while testing the upgrade, disable session.upload_progress in php.ini. |
| **#166** | `11:00 – 11:04` | `code_spotlight` | **php_admin_flag[fatal_error_backtraces] = off** | Partial stopgap #2: Closes PHP 8.5 backtrace UAF vector | On PHP 8.5, also set fatal_error_backtraces to off. |
| **#167** | `11:04 – 11:08` | `code_spotlight` | **memory_limit = -1  +  client_max_body_size 1M;** | Partial stopgap #3: Removes soft OOM bailout (Requires strict proxy cap!) | Some teams also set memory_limit to minus one paired with a strict Nginx client_max_body_size cap so attackers cannot trigger a soft OOM bailout. |
| **#168** | `11:08 – 11:12` | `statement_kinetic` | **STOPGAPS ≠ PATCHING** | Core maintainer Gina Peter Banyard: 'No ini flag fixes the root cause' | But remember PHP core maintainer Gina Peter Banyard's warning: no ini setting fixes the underlying C bug. Only the binary update does. |
| **#169** | `11:12 – 11:16` | `badge_alert` | **STEP 4: HUNT YOUR LOGS BACK TO OCT 17** | AWS MadPot saw in-the-wild exploitation 4 days before disclosure | Step Four: audit your logs going back to at least October 17th, when Amazon MadPot caught the first live zero-day probes. |
| **#170** | `11:16 – 11:20` | `terminal_one` | **grep -Rn "Allowed memory size.*Unknown on line 0" /var/log/** | IOC #1: Pre-script OOM fatal errors | Search your PHP error logs for 'Allowed memory size exhausted in Unknown on line 0'—that tells you an OOM happened before script execution. |
| **#171** | `11:20 – 11:24` | `terminal_one` | **grep -Rn "AH00052.*exit signal Segmentation fault (11)" /var/log/** | IOC #2: Worker segfault bursts from ASLR probing | Second, check your Apache or FPM logs for bursts of segmentation faults, which happen when an attacker's pointer guess misses. |
| **#172** | `11:24 – 11:28` | `terminal_one` | **ausearch -sc execve \| grep -E "apache2\|php-fpm"** | IOC #3: Web workers spawning sh, bash, curl, or python | Third, check EDR or auditd telemetry for any apache2 or php-fpm worker spawning sh, bash, or curl—even on requests that returned HTTP 200. |
| **#173** | `11:28 – 11:32` | `statement_kinetic` | **ASSUME COMPROMISE IF ALL 3 ALIGN** | Rotate DB credentials, API keys, and session secrets | If you see line-zero OOM errors followed by worker segfaults or child shells, assume the worker was compromised and rotate every secret on the box. |
| **#174** | `11:32 – 11:36` | `flow_2node` | **2012 C MACRO ➔ 2026 AI EXPLOIT** | Fourteen years of technical debt paid in 48 hours | Stepping back, PHP2Shell is a textbook case of how a tiny ordering shortcut in C can echo across fourteen years of the web. |
| **#175** | `11:36 – 11:40` | `code_spotlight` | **idx = ht->nNumUsed++; /* One line too early */** | The 2012 line that broke 69% of the web | Incrementing a counter one line before allocating a string looked harmless in 2012. |
| **#176** | `11:40 – 11:44` | `statement_kinetic` | **LONGJMP() MADE IT LETHAL** | Teleporting over cleanup turned a counter into RCE | Combined with longjmp() teleporting over stack frames, that single line became a pre-authentication shell across millions of servers. |
| **#177** | `11:44 – 11:48` | `hero_stat` | **8.5.12** | PATCH NOW · RESTART WORKERS · AUDIT LINE 0 | Upgrade to 8.5.12, 8.4.27, 8.3.36, or 8.2.35, restart your worker pools, and check your line-zero logs back to October 17th. |
| **#178** | `11:48 – 11:52` | `statement_kinetic` | **DROP YOUR STACK IN THE COMMENTS** | Running PHP-FPM, FrankenPHP, or stuck on 7.4? | Let me know in the comments if you're running PHP-FPM, mod_php, or stuck maintaining a legacy PHP 7.4 fleet. |
| **#179** | `11:52 – 11:56` | `badge_alert` | **SUBSCRIBE · ZERO-DAY AUTOPSY** | youtube.com/channel/UCEbQwm7oWRb1HjfGHMs7AzA | If you want clear, zero-hype breakdowns of real-world vulnerabilities without the filler, hit subscribe. |
| **#180** | `11:56 – 12:00` | `statement_kinetic` | **STAY PATCHED. SEE YOU NEXT TIME.** | PHP2Shell (CVE-2026-109618 & CVE-2026-109619) | Stay patched, keep your workers clean, and I'll see you in the next deep dive. |

---

## Part 3: Grounded Technical Sources Cited
- **The PHP Foundation** (Oct 21, 2026): [*Today's PHP Security Release and How We're Strengthening PHP Security*](https://thephp.foundation/blog/2026/10/21/todays-php-security-release-and-how-were-strengthening-php-security/)
- **Datadog Security Labs** (Oct 21–22, 2026): [*PHP2Shell: Critical Vulnerabilities in PHP (CVE-2026-109618, CVE-2026-109619)*](https://securitylabs.datadoghq.com/articles/php2shell-critical-vulnerabilities-in-php/)
- **watchTowr Labs** (Oct 21, 2026): [*PHP CVE-2026-109618 & CVE-2026-109619 FAQ*](https://watchtowr.com/intelligence/php-cve-2026-109618-faq/)
- **Tenable** (Oct 21, 2026): [*PHP2Shell Frequently Asked Questions*](https://www.tenable.com/blog/php2shell-cve-2026-109618-cve-2026-109619-frequently-asked-questions-about-critical-php-remote)
- **Sansec Research** (Oct 21, 2026): [*PHP2Shell Pre-Auth RCE Analysis*](https://sansec.io/research/php2shell)
- **Phoenix Security** (Oct 22, 2026): [*PHP Core RCE Exposure & Shodan EOL Telemetry*](https://phoenix.security/php-core-rce-cve-2026-109618-109619-critical-remote-code-execution/)
- **Red Hat Security** (Oct 21, 2026): [*CVE-2026-109618 Advisory*](https://access.redhat.com/security/cve/cve-2026-109618)
- **CERT-EU** (Oct 21, 2026): [*Security Advisory 2026-018: Critical Vulnerabilities in PHP*](https://cert.europa.eu/publications/security-advisories/2026-018)
- **Cloud Codes Reference Video**: [*4 Security Failures in One Week. Which One Hits You?* (`yZuOxQ_hKOI`)](https://www.youtube.com/watch?v=yZuOxQ_hKOI)
