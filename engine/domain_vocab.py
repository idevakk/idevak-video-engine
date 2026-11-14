"""Domain vocabulary extraction, phonetic replacement rules, and Whisper priming.

Specialized for @iDevak technical video content:
- Alphanumeric model names (e.g. DeepSeek-V4.1-Flash-1017, Kimi K3.1 Pro)
- Linux kernel & C identifiers (e.g. tcp_v4_syn_recv_sock, ireq_opt, kfree_rcu())
- CVE numbers (e.g. CVE-2026-98432, CVE-2026-109618)
- Hexadecimal addresses & bytecode (e.g. 0xef0100, 0x63e8)
- Sub-2-bit quantization formats & metrics (e.g. IQ2_XXS, GGUF, QuIP#, UE8M0, bpw, tok/s)
- CLI flags & environment variables (e.g. GODEBUG=multipathtcp=0, ss -M -tlpn)
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

# Standard phonetic-to-symbol replacements for technical speech
PHONETIC_REPLACEMENTS = [
    # Function calls / brackets
    (r"\b(?:open(?:-|\s+)?paren(?:thesis)?|open-paren)\s+(?:close(?:-|\s+)?paren(?:thesis)?|close-paren)\b", "()"),
    (r"\bopen(?:-|\s+)?paren\b", "("),
    (r"\bclose(?:-|\s+)?paren\b", ")"),
    (r"\b(?:fetch|system|kfree|kfree_rcu|addBlackList)\s*\(\s*\)", r"\g<0>"),
    (r"\bfetch\s*\(\s*\)", "fetch()"),
    (r"\bsystem\s*\(\s*\)", "system()"),
    (r"\bkfree\s*\(\s*\)", "kfree()"),
    (r"\bkfree_rcu\s*\(\s*\)", "kfree_rcu()"),
    (r"\baddBlackList\s*\(\s*\)", "addBlackList()"),
    # Operators & symbols
    (r"\b(?:plus(?:-|\s+)plus|\+\s*\+)\b", "++"),
    (r"\b(?:opt\s+arrow\s+optlen|opt\s*->\s*optlen)\b", "opt->optlen"),
    (r"\barrow\b", "->"),
    (r"\bequals\b", "="),
    (r"\basterisk\b", "*"),
    (r"\btilde\b", "~"),
    (r"\bc\s*\+\s*\+\b", "C++"),
    # Deepgram / TTS specific phonetic idioms
    (r"\bQuip(?:-|\s+)?Sharp\b", "QuIP#"),
    (r"\bQuipSharp\b", "QuIP#"),
    (r"\bbits\s+per\s+weight\b", "bpw"),
    (r"\btokens?\s+per\s+second\b", "tok/s"),
    (r"\bNode(?:-|\s+)?to(?:-|\s+)?Shell\b", "Node2Shell"),
    (r"\bPHP(?:-|\s+)?to(?:-|\s+)?Shell\b", "PHP2Shell"),
    (r"\bTrader(?:-|\s+)?Traitor\b", "TraderTraitor"),
    (r"\bLatent(?:-|\s+)?MoE\b", "LatentMoE"),
    (r"\bAttn(?:-|\s+)?Res\b", "AttnRes"),
    (r"\bPre(?:-|\s+)?Norm\b", "PreNorm"),
    (r"\bOpen(?:-|\s+)?Router\b", "OpenRouter"),
    (r"\be(?:-|\s+)?Mudhra\b", "eMudhra"),
    (r"\bDeep(?:-|\s+)?Seek\b", "DeepSeek"),
    (r"\bDeepSeq\b", "DeepSeek"),
    (r"\bDeepsea\s+Carnus\b", "DeepSeek Harness"),
    (r"\bDeepsea\s+Karnus\b", "DeepSeek Harness"),
    # Spoken Number & Metric Abbreviation
    (r"\$6,360,000,000\b", "$6.36B"),
    (r"\$7,500,000,000\b", "$7.5B"),
    (r"2,780,000,000,000\b", "2.78T"),
    (r"104,000,000,000\b", "104B"),
    (r"23,600,000,000\b", "23.6B"),
    (r"25,500,000,000,000\b", "25.5T"),
    (r"23,200,000\b", "23.2M"),
    (r"1,000,000\s+context\b", "1M context"),
    (r"8,000,000,000\b", "8B"),
    (r"16,000,000,000\b", "16B"),
    (r"12\s+gigabytes\s+of\s+VRAM\b", "12GB of VRAM"),
    (r"110\s+gigabyte\b", "110GB"),
    (r"3\.5\s+megabyte\b", "3.5MB"),
    # Underscores in identifiers
    (r"(?<=[a-zA-Z0-9])\s+(?:underscore|_)\s+(?=[a-zA-Z0-9])", "_"),
    (r"\bunderscore\s+(?=[a-zA-Z0-9])", "_"),
    (r"(?<=[a-zA-Z0-9])\s+underscore\b", "_"),
    # Slashes in paths
    (r"(?<=[a-zA-Z0-9~])\s+(?:slash|/)\s+(?=[a-zA-Z0-9_.])", "/"),
    (r"~/dot\s*ssh\b", "~/.ssh"),
    (r"~\s*/\s*\.\s*ssh\b", "~/.ssh"),
    # Dots in paths and file extensions
    (r"\s+dot\s+(?=[a-zA-Z0-9])", "."),
    (r"\s+\.\s*(?=[a-zA-Z0-9])", "."),
    (r"\bNode\.\s*Js\b", "Node.js"),
    (r"\bsetup\.\s*md\b", "SETUP.md"),
    (r"\bcom\s*\.\s*apple\s*\.\s*sysmond\s*\.\s*(?:p\s*list|plist)\b", "com.apple.sysmond.plist"),
    # CLI dash flags (e.g., dash capital M -> -M, dash w -> -w)
    (r"\bdash\s+capital\s+([A-Z])\b", r"-\1"),
    (r"\bdash\s+([a-zA-Z0-9])\b", r"-\1"),
    # Hex: 'zero x' or '0 x' -> '0x'
    (r"\b(?:zero\s*x|0\s*x)\s*([0-9a-fA-F]+)\b", r"0x\1"),
    (r"\b0x\s*e\s*f\s*0\s*1\s*0\s*0\b", "0xef0100"),
    (r"\b0x\s*6\s*3\s*e\s*8\b", "0x63e8"),
    (r"\b0x\s*0\s*5\b", "0x05"),
    # Dollar variables
    (r"\bdollar\s*_?(?=[a-zA-Z0-9_])", "$"),
    # Common CVE spoken forms
    (r"CVE[- ](?:twenty\s*20\s*six|20\s*20\s*six|twenty\s*twenty\s*six|2026)[- ]*(\d+)[- ]*(\d+)", r"CVE-2026-\1\2"),
    (r"CVE[- ](?:twenty\s*20\s*six|20\s*20\s*six|twenty\s*twenty\s*six|2026)[- ]*(\d+)", r"CVE-2026-\1"),
    (r"CVE[- ]twenty\s*20\s*six[- ]*eleven[- ]*four\s*97", "CVE-2026-11497"),
    (r"CVE[- ]twenty\s*20\s*six[- ]*eleven\s*943", "CVE-2026-11943"),
    (r"CVE[- ]20\s*20\s*six[- ]*eighty\s*2[,\s]*533", "CVE-2026-82533"),
    (r"CVE[- ]2026[- ](\d+)[- ](\d+)", r"CVE-2026-\1\2"),
    (r"\bCVE\s+(\d{4})\s+(\d+)\s+(\d+)\b", r"CVE-\1-\2\3"),
    (r"\bCVE\s+(\d{4})\s+(\d+)\b", r"CVE-\1-\2"),
    (r"\bCVE(\d{4})(\d+)\b", r"CVE-\1-\2"),
]


def extract_vocabulary_from_text(text: str) -> list[str]:
    """Extract technical keywords, camelCase, identifiers, and entities from script text."""
    if not text:
        return []

    tokens: list[str] = []

    # 1. CVE numbers
    for m in re.finditer(r"\bCVE-\d{4}-\d+\b", text, re.I):
        tokens.append(m.group(0))

    # 2. Hex numbers
    for m in re.finditer(r"\b0x[0-9a-fA-F]+\b", text):
        tokens.append(m.group(0))

    # 3. Model names & version tags (e.g. DeepSeek-V4.1-Flash-1017, Bun 1.4.4)
    for m in re.finditer(r"\b[A-Z][a-zA-Z0-9]+(?:-[A-Z0-9][a-zA-Z0-9.]*)+\b", text):
        tokens.append(m.group(0))

    # 4. Code identifiers with underscores (e.g. tcp_v4_syn_recv_sock, ireq_opt)
    for m in re.finditer(r"\b_?[a-zA-Z][a-zA-Z0-9]*_[a-zA-Z0-9_]+\b", text):
        tokens.append(m.group(0))

    # 5. CamelCase / PascalCase terms (e.g. LatentMoE, TraderTraitor, AttnRes)
    for m in re.finditer(r"\b[A-Z][a-z0-9]+[A-Z][a-zA-Z0-9]*\b", text):
        tokens.append(m.group(0))

    # 6. ALL CAPS acronyms (e.g. GSQ, RCO, VRAM, GGUF, UE8M0, MPTCP)
    for m in re.finditer(r"\b[A-Z0-9]{2,}\b", text):
        tokens.append(m.group(0))

    # 7. File paths and CLI flags (e.g. ~/.ssh/authorized_keys, -M, -tlpn)
    for m in re.finditer(r"(?:~?/[a-zA-Z0-9_./-]+|\b[a-zA-Z0-9_.-]+\.(?:c|js|plist|md)\b)", text):
        tokens.append(m.group(0))

    # 8. Numeric units (e.g. 12GB, 8B, 23.6B, 2.00 bpw, 2,116 tok/s)
    for m in re.finditer(r"\b\d+(?:\.\d+)?[KMGTB](?:B)?\b", text):
        tokens.append(m.group(0))
    for m in re.finditer(r"\b\d+(?:\.\d+)?\s*(?:bpw|tok/s)\b", text):
        tokens.append(m.group(0))

    # Deduplicate preserving order
    return list(dict.fromkeys(t.strip() for t in tokens if len(t.strip()) > 1))


def extract_project_vocabulary(project_path: Path | None) -> list[str]:
    """Extract complete technical vocabulary from content/video.json scenes."""
    if not project_path or not project_path.exists():
        return []

    try:
        data = json.loads(project_path.read_text(encoding="utf-8"))
        all_text = []

        for k in ("title", "channel", "ghost"):
            v = data.get(k)
            if v and isinstance(v, str):
                all_text.append(v)

        for scene in data.get("scenes", []):
            narration = scene.get("narration") or ""
            if narration:
                all_text.append(narration)
            header = scene.get("header") or ""
            if header:
                all_text.append(header)

        combined = " ".join(all_text)
        return extract_vocabulary_from_text(combined)
    except Exception:
        return []


def build_whisper_prompt(vocab: list[str], max_chars: int = 400) -> str:
    """Build a compact, high-impact initial_prompt for Whisper priming.
    
    Whisper allows up to ~224 tokens of context. Dense comma-separated
    proper nouns and code tokens give the highest entity priming density.
    """
    if not vocab:
        return ""

    selected = []
    total_len = 0
    for term in vocab:
        term_len = len(term) + 2
        if total_len + term_len > max_chars:
            break
        selected.append(term)
        total_len += term_len

    return ", ".join(selected) + "."


def build_deepgram_params(
    vocab: list[str],
    model: str = "nova-3",
    language: str = "en",
) -> list[tuple[str, str]]:
    """Build Deepgram query parameters with keyterm boosting and replacement rules."""
    params: list[tuple[str, str]] = [
        ("model", model),
        ("smart_format", "true"),
        ("punctuate", "true"),
        ("numerals", "true"),
        ("utterances", "true"),
    ]
    if language and language != "auto":
        params.append(("language", language))

    # Deepgram keyterms (Nova-3 supports unweighted terms) or keywords (Nova-2 with intensifier)
    is_nova3 = "nova-3" in model.lower()
    for term in vocab:
        if is_nova3:
            params.append(("keyterm", term))
        else:
            params.append(("keywords", f"{term}:2.5"))

    # Phonetic replacements on Deepgram server-side
    server_replacements = [
        ("bits per weight", "bpw"),
        ("tokens per second", "tok/s"),
        ("open paren close paren", "()"),
        ("open-paren close-paren", "()"),
        ("plus plus", "++"),
        ("plus-plus", "++"),
        ("QuipSharp", "QuIP#"),
        ("Quip Sharp", "QuIP#"),
        ("Quip-Sharp", "QuIP#"),
        ("Node-to-Shell", "Node2Shell"),
        ("PHP-to-Shell", "PHP2Shell"),
        ("underscore", "_"),
    ]
    for orig, rep in server_replacements:
        params.append(("replace", f"{orig}:{rep}"))

    return params


def normalize_transcript(text: str) -> str:
    """Post-process transcript to map spoken phonetic idioms into clean code tokens."""
    t = text
    for pattern, repl in PHONETIC_REPLACEMENTS:
        t = re.sub(pattern, repl, t, flags=re.I)
    return t


def normalize_words_array(words: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Apply normalization to individual word objects while preserving timing master timestamps."""
    if not words:
        return []

    # Process joined text to find replacements, or normalize token strings directly
    out_words = []
    for w in words:
        word_text = w.get("w", "")
        # Common single-token normalizations
        if word_text.lower() in ("underscore", "_"):
            word_text = "_"
        elif word_text.lower() == "bpw" or word_text.lower() == "bits per weight":
            word_text = "bpw"
        out_words.append({
            "w": word_text,
            "s": w.get("s", 0.0),
            "e": w.get("e", 0.0),
            "p": w.get("p", 1.0),
        })
    return out_words
