# -*- coding: utf-8 -*-
"""Son miksin anlaşılırlık testi: her cümleyi Whisper ile yazıya döker, karakter hata oranını raporlar."""
import os, sys, json, difflib
import numpy as np, soundfile as sf, scipy.signal as ss
import sherpa_onnx
sys.path.insert(0, os.path.dirname(__file__))
from tts import norm

WORK = os.environ.get("WORK", "/tmp/claude-0/work")
d = f"{WORK}/models/sherpa-onnx-whisper-turbo"
rec = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=f"{d}/turbo-encoder.int8.onnx", decoder=f"{d}/turbo-decoder.int8.onnx",
                                                 tokens=f"{d}/turbo-tokens.txt", language="tr", task="transcribe", num_threads=4)
path = sys.argv[1] if len(sys.argv) > 1 else f"{WORK}/build/mix.wav"
x, sr = sf.read(path, dtype="float32")
x = x.mean(1) if x.ndim > 1 else x
tl = json.load(open(f"{WORK}/build/timeline.json"))
cers = []
for s in tl["scenes"]:
    for i, l in enumerate(s["lines"]):
        a = x[int((l["start"] - 0.25) * sr): int((l["end"] + 0.35) * sr)]
        a = ss.resample_poly(a, 1, sr // 16000).astype(np.float32)
        a = np.concatenate([np.zeros(4000, np.float32), a, np.zeros(12000, np.float32)])
        st = rec.create_stream(); st.accept_waveform(16000, a); rec.decode_stream(st)
        hyp = st.result.text
        cer = 1 - difflib.SequenceMatcher(None, norm(l["text"]), norm(hyp)).ratio()
        cers.append(cer)
        flag = "  <<<" if cer > 0.08 else ""
        print(f"{s['id']}_{i:02d} cer={cer:.3f}{flag} | {hyp}", flush=True)
print("mean CER", round(float(np.mean(cers)), 4), "max", round(float(np.max(cers)), 3))
