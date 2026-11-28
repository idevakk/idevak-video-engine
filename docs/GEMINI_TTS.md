# Optional Gemini TTS voiceover workflow

Gemini TTS voiceover generation is opt-in for each video in this repository.
When the user supplies a voiceover recording (`voiceover.wav` or a custom
`audio` path in `video.json`), or does not opt into TTS generation, keep the
default workflow unchanged: the supplied voiceover is the timing master, and
the rest of the pipeline (`validate -> transcribe -> align -> build -> sfx -> check`)
stays as it is.

Only use this workflow when no voiceover recording is provided and the user
explicitly opts into generating the voiceover via Gemini AI Studio TTS
(`scripts/generate_tts.py`).

## Agent setup & private API key handling

The host needs Python 3.10+ and the `google-genai` package:

```bash
python -m pip install google-genai
```

Use the host's private secret input (`request_secret`) when `GEMINI_API_KEY`
is missing from the environment. Never ask for `GEMINI_API_KEY` in ordinary
chat, and never write it into `.env` files, source code, `notes/`, or logs.
Obtain a Gemini API key from Google AI Studio: https://aistudio.google.com/apikey.

## Input scenarios (how to prepare the TTS script)

Always apply the **Generative G2P Phonetic Framework** in
`prompts/subagents/researcher-tts-writer.md` (Stage 3) so technical jargon,
syscalls, CLI flags, CVEs, hex pointers, IP subnets, and numbers sound natural
and accurate, while keeping the matching Whisper-canonical `narration` in
`workspaces/<slug>/video.json` (Stage 4) so `engine/align.py` achieves 98%+
word match.

1. **User supplies a voiceover audio file**:
   - Do NOT use Gemini TTS. Keep the supplied audio as the immutable timing
     master and run the standard pipeline.
2. **No voiceover, and the user provides a raw Phonetic TTS Script**:
   - Use that **raw phonetic TTS script** directly without rewriting or
     altering its phonetic respellings or cadence markers.
   - Save it (if not already a file) to
     `workspaces/<slug>/notes/phonetic_tts_script.txt` and synthesize
     `workspaces/<slug>/voiceover.wav` with `scripts/generate_tts.py`.
3. **No voiceover, and the user provides a normal voiceover / TTS script**:
   - Convert the normal script into a **Phonetic TTS Script** using the G2P
     Phonetic Framework (Stage 3 of `researcher-tts-writer.md`) so the
     synthesized speech sounds natural and accurate.
   - Save the phonetic version to
     `workspaces/<slug>/notes/phonetic_tts_script.txt` (and keep the clean
     canonical `narration` in `workspaces/<slug>/video.json`), then synthesize
     `workspaces/<slug>/voiceover.wav` with `scripts/generate_tts.py`.
4. **No voiceover and no script (topic, brief, or URL only)**:
   - Conduct full primary-source research, author the complete storyboard and
     canonical `workspaces/<slug>/video.json`, and generate an accurate
     **Phonetic TTS Script** using the G2P Phonetic Framework.
   - Save the phonetic script to
     `workspaces/<slug>/notes/phonetic_tts_script.txt`, then synthesize
     `workspaces/<slug>/voiceover.wav` with `scripts/generate_tts.py`.

## Commands

```bash
# Synthesize workspaces/<slug>/voiceover.wav from notes/phonetic_tts_script.txt
python scripts/generate_tts.py --project <slug>
# Or via npm script with an explicit script path:
npm run tts -- --project <slug> --script notes/phonetic_tts_script.txt
# Optional voice/model overrides (defaults: gemini-3.8-flash-tts, Sadaltager):
python scripts/generate_tts.py --project <slug> --voice Sadaltager --model gemini-3.8-flash-tts
# Dry run (validates paths and script without calling the API):
python scripts/generate_tts.py --project <slug> --dry-run
```

Once `workspaces/<slug>/voiceover.wav` is generated, continue with the standard
pipeline unchanged:

```bash
npm run pipeline -- --project <slug>
npm run sfx -- --project <slug>
npm run lint -- --project <slug>
npm run check -- --project <slug>
```

Preview-server launch (`npm run preview`) and video encoding (`npm run render`,
`npm run render:hq`) still require explicit user permission (unless the user
also explicitly enabled the optional Daytona workflow for that video).
