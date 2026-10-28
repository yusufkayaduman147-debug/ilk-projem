# -*- coding: utf-8 -*-
"""Her satır için N farklı seslendirme üretir, Whisper ile anlaşılırlığı ölçer, en iyisini seçer."""
import os, sys, json, re, time, wave, difflib
import numpy as np, soundfile as sf, scipy.signal as ss
sys.path.insert(0, os.path.dirname(__file__))
from script import SCENES
from ttsnorm import tts_text, num_words
from piper import PiperVoice, SynthesisConfig
import sherpa_onnx

W = os.environ.get("WORK", "/tmp/claude-0/work")
OUT = f"{W}/build/voice"
os.makedirs(OUT, exist_ok=True)
VOICE = PiperVoice.load(f"{W}/models/vits-piper-tr_TR-fahrettin-medium/tr_TR-fahrettin-medium.onnx")
SR = VOICE.config.sample_rate
d = f"{W}/models/sherpa-onnx-whisper-turbo"
ASR = sherpa_onnx.OfflineRecognizer.from_whisper(encoder=f"{d}/turbo-encoder.int8.onnx", decoder=f"{d}/turbo-decoder.int8.onnx",
                                                 tokens=f"{d}/turbo-tokens.txt", language="tr", task="transcribe", num_threads=4)

def norm(s):
    s = s.replace("Hz.", "hazreti")
    s = re.sub(r"\d+", lambda m: num_words(int(m.group(0))), s)
    s = s.lower().replace("â", "a").replace("î", "i").replace("û", "u").replace("i̇", "i")
    s = re.sub(r"[^a-zçğıöşü ]", "", s.replace("'", "").replace("-", " "))
    return re.sub(r"\s+", "", s)

def transcribe(a):
    x = ss.resample_poly(a, 16000, SR).astype(np.float32)
    x = np.concatenate([np.zeros(4000, np.float32), x, np.zeros(12000, np.float32)])
    st = ASR.create_stream(); st.accept_waveform(16000, x); ASR.decode_stream(st)
    return st.result.text

def synth(text, length_scale=1.08):
    cfg = SynthesisConfig(length_scale=length_scale, noise_scale=0.667, noise_w_scale=0.8)
    parts = []
    for ch in VOICE.synthesize(text, syn_config=cfg):
        a = ch.audio_float_array.astype(np.float32)
        parts.append(a)
        parts.append(np.zeros(int(0.32 * SR), np.float32))
    a = np.concatenate(parts[:-1]) if parts else np.zeros(1, np.float32)
    # trim silence
    env = np.abs(a) > 0.01
    idx = np.where(env)[0]
    if len(idx):
        a = a[max(0, idx[0] - int(0.04*SR)): idx[-1] + int(0.12*SR)]
    return a

def f0_spread(a):
    import librosa
    f0, vf, _ = librosa.pyin(a, fmin=60, fmax=260, sr=SR, frame_length=1024)
    f = f0[~np.isnan(f0)]
    return float(np.std(12*np.log2(f/np.median(f)))) if len(f) > 10 else 0.0

def main(ntakes=4, only=None):
    results = {}
    if os.path.exists(f"{OUT}/takes.json"):
        results = json.load(open(f"{OUT}/takes.json"))
    for sc in SCENES:
        for i, line in enumerate(sc["lines"]):
            key = f"{sc['id']}_{i:02d}"
            if only and key not in only: continue
            if key in results and not only: continue
            t = tts_text(line)
            ref = norm(line)
            best = None
            for k in range(ntakes):
                a = synth(t)
                hyp = transcribe(a)
                cer = 1 - difflib.SequenceMatcher(None, ref, norm(hyp)).ratio()
                sp = f0_spread(a)
                score = cer - 0.01 * sp
                if best is None or score < best[0]:
                    best = (score, cer, sp, hyp, a)
            sf.write(f"{OUT}/{key}.wav", best[4], SR, subtype="FLOAT")
            results[key] = dict(text=line, tts=t, asr=best[3], cer=round(best[1], 4), f0sd=round(best[2], 2), dur=len(best[4])/SR)
            print(f"{key} cer={best[1]:.3f} f0sd={best[2]:.2f} dur={len(best[4])/SR:.1f}s | {best[3]}", flush=True)
            json.dump(results, open(f"{OUT}/takes.json", "w"), ensure_ascii=False, indent=1)

if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 4
    only = sys.argv[2].split(",") if len(sys.argv) > 2 else None
    main(n, only)
