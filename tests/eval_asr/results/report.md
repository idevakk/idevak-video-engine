# ASR Evaluation & Optimization Report: Deepgram & Local Whisper

Benchmarking 10 ultra-dense phonetic TTS stress-test scripts designed for `@iDevak` domain vocabulary:
- Alphanumeric model architectures & versions (`DeepSeek-V4.1-Flash-1017`, `Kimi K3.1 Pro`)
- Linux kernel C symbols & function calls (`CVE-2026-98432`, `tcp_v4_syn_recv_sock`, `ireq_opt`, `opt->optlen`, `kfree_rcu()`, `SOCK_RCU_FREE`)
- Hexadecimal addresses & bytecode delegation (`0xef0100`, `0x63e8`, `0x05`, `EIP-7702`)
- PHP Zend Engine heap grooming & bailouts (`CVE-2026-109618`, `_zend_hash_str_add_or_update_i`, `nNumUsed++`, `$_POST`, `pDestructor`, `system()`)
- Sub-2-bit quantization formats & metrics (`IQ2_XXS`, `GGUF`, `QuIP#`, `E8P`, `UE8M0`, `bpw`, `tok/s`, `MI355X`)
- IDE supply-chain exploits & CLI flags (`CVE-2026-11497`, `extension.js`, `ssh -N -R *:0:localhost:22 -o StrictHostKeyChecking=no`)
- Hybrid linear attention mechanisms (`LatentMoE`, `SiTU-GLU`, `tanh`, `KDA`, `MLA`, `NoPE`, `RoPE`, `AttnRes`, `PreNorm`)
- Cryptographic HSM key wrapping & abliteration (`eMudhra`, `P-384`, `ECC`, `Utimaco HSM`, `CVE-2026-11943`, `attn_wo`, `KL divergence`)
- Multi-agent orchestration & AI gateway economics (`dsh-superagent-router`, `ReAct`, `BYOM`, `SETUP.md`, `CVE-2026-82533`, `OpenRouter`, `Privy`, `Metronome`)

---

## Benchmark Summary

| Engine Configuration | Avg WER | Avg CER | Exact Entity Recall | Fuzzy Entity Recall |
| :--- | :---: | :---: | :---: | :---: |
| **Deepgram Baseline** (Nova-2 unguided) | 80.8% | 34.2% | 17.3% | 38.7% |
| **Deepgram Optimized** (Nova-3 + Keyterms + Replace + Normalizer) | **34.1%** | **6.4%** | **67.4%** | **82.2%** |
| **Local Whisper Baseline** (`small.en`, unguided, beam 1) | 46.6% | 18.8% | 33.1% | 63.2% |
| **Local Whisper Optimized** (`small.en` + Prompt Priming + Normalizer) | **23.0%** | **5.9%** | **66.7%** | **85.1%** |

### Key Improvements
1. **Deepgram Word Error Rate cut by 58%**: Dropped from `80.8%` to `34.1%`.
2. **Deepgram Character Error Rate dropped by 81%**: Dropped from `34.2%` to `6.4%`.
3. **Deepgram Exact Entity Recall increased 3.9x**: Jumped from `17.3%` to `67.4%` (100% on Script 1, 91% on Script 7).
4. **Local Whisper WER halved to 23.0%**: CER dropped to `5.9%`, with `85.1%` Fuzzy Entity Recall.

---

## Per-Test Case Breakdown (Deepgram: Baseline vs. Optimized)

| ID | Topic | Baseline WER | Opt. WER | Baseline Exact TER | Opt. Exact TER |
|---|---|:---:|:---:|:---:|:---:|
| 1 | Sub-2-Bit LLM Quantization | 83.6% | **29.8%** | 22.2% | **100.0%** |
| 2 | Linux Kernel UAF & MPTCP | 137.9% | **48.3%** | 0.0% | **57.1%** |
| 3 | Ethereum EIP-7702 Forensics | 39.1% | **15.6%** | 12.5% | **62.5%** |
| 4 | PHP Zend Heap & Bailout | 118.3% | **43.3%** | 0.0% | **37.5%** |
| 5 | Causal Enc-Dec & NVMe Offload | 56.5% | **29.3%** | 11.1% | **66.7%** |
| 6 | IDE Extension Backdoor | 139.1% | **75.0%** | 14.3% | **42.9%** |
| 7 | Kimi K3.1 Pro Latent MoE | 51.2% | **23.3%** | 18.2% | **90.9%** |
| 8 | Vendored C Runtime Exploits | 76.6% | **23.4%** | 12.5% | **75.0%** |
| 9 | HSM Key-Wrapping & Abliteration | 44.2% | **22.1%** | 37.5% | **75.0%** |
| 10 | Multi-Agent OS & Gateway | 61.7% | **30.9%** | 44.4% | **66.7%** |

---

## Architectural Enhancements

### 1. `engine/domain_vocab.py`
A centralized technical domain extraction and normalization engine:
- **`extract_project_vocabulary(project_path)`**: Automatically extracts camelCase terms, CVE numbers (`CVE-\d{4}-\d+`), hex codes (`0x...`), C identifiers (`tcp_v4_...`), uppercase acronyms, CLI flags, and numeric units across all scenes in `content/video.json`.
- **`build_deepgram_params(...)`**: Dynamically constructs query parameters for Nova-3 / Nova-2 with `keyterm` boosting and server-side phonetic replacement rules (`replace=...`).
- **`build_whisper_prompt(...)`**: Generates a compact ~224-token prompt packed with high-value technical vocabulary to prime Whisper's decoder before audio inference begins.
- **`normalize_transcript(text)`**: Maps spoken acoustic phonetic constructs (`open-paren close-paren` -> `()`, `opt arrow optlen` -> `opt->optlen`, `underscore` -> `_`, `dot c` -> `.c`, `slash` -> `/`, `bits per weight` -> `bpw`, `zero-x...` -> `0x...`, spoken CVEs -> `CVE-2026-...`) into canonical code syntax.

### 2. `engine/transcribe.py`
- Upgraded default model to `nova-3` with automatic fallback to `nova-2` if unsupported.
- Integrated `extract_project_vocabulary` so every video's custom technical vocabulary is boosted automatically.
- Automatic key detection: checks environment variable `DEEPGRAM_API_KEY` or secure secret store.
- Integrated transcript normalization for both Deepgram and Local Whisper, preserving exact word timestamp arrays (`w`, `s`, `e`, `p`) for downstream monotonic audio alignment.

### 3. Evaluation Suite (`tests/eval_asr/`)
- `tests/eval_asr/dataset.json`: Canonical dataset containing all 10 audio files, expected ground truths, target technical edge cases, and phonetic TTS inputs.
- `tests/eval_asr/evaluate.py`: Standard dynamic-programming Levenshtein distance calculator computing Word Error Rate (WER), Character Error Rate (CER), and Technical Entity Recall (TER).
- `tests/eval_asr/run_benchmark.py`: Complete test runner comparing baseline vs. optimized models.

---

## Commands

Run the full benchmark suite:
```bash
npm run eval:asr
```

Run Deepgram optimization benchmark only:
```bash
npm run eval:asr:deepgram
```

Run Local Whisper optimization benchmark only:
```bash
npm run eval:asr:local
```
