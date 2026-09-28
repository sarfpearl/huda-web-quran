"""Synthesises the UI sound bed from out/cues.json (written by render.mjs).

No music: HuDa is a Quran app, so the 120 BPM grid is carried by UI sounds only.
Every sound is placed by its *measured* peak, not its first sample, so a whoosh
swells into the beat and a click lands exactly on it. Tails that run past T wrap
to the start, so the audio loops as cleanly as the picture.
"""
import json
import wave
from pathlib import Path

import numpy as np

SR = 48_000
OUT = Path(__file__).parent / "out"
rng = np.random.default_rng(7)


def env(n, attack, decay):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-6), 0, 1)
    return a * np.exp(-np.maximum(t - attack, 0) / decay)


def lowpass(x, cutoff):
    """One-pole low-pass; cutoff may be an array (per-sample sweep)."""
    cutoff = np.broadcast_to(cutoff, x.shape)
    k = 1 - np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, (xi, ki) in enumerate(zip(x, k)):
        acc += ki * (xi - acc)
        y[i] = acc
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def sine(freq, n, phase=0.0):
    return np.sin(2 * np.pi * np.cumsum(np.broadcast_to(freq, (n,))) / SR + phase)


def click():
    n = int(0.06 * SR)
    body = sine(1650, n) * env(n, 0.0008, 0.018)
    snap = highpass(rng.standard_normal(n), 2500) * env(n, 0.0003, 0.004)
    return 0.55 * body + 0.35 * snap


def tick():
    n = int(0.04 * SR)
    return 0.4 * sine(3100, n) * env(n, 0.0005, 0.009)


def type_key():
    n = int(0.05 * SR)
    f = 1100 + rng.uniform(-80, 80)
    body = sine(f, n) * env(n, 0.0005, 0.010)
    snap = highpass(rng.standard_normal(n), 3000) * env(n, 0.0002, 0.003)
    return 0.35 * body + 0.3 * snap


def bar(gain):
    n = int(0.06 * SR)
    return 0.3 * sine(700 + 900 * gain, n) * env(n, 0.001, 0.02)


def whoosh():
    n = int(0.30 * SR)
    t = np.arange(n) / n
    shape = np.sin(np.pi * t ** 0.8) ** 2                 # swells, then falls
    sweep = 400 + 3200 * np.sin(np.pi * t) ** 2           # filter opens with the swell
    return 0.5 * lowpass(rng.standard_normal(n), sweep) * shape


def confirm():
    n = int(0.42 * SR)
    a = sine(660, n) * env(n, 0.002, 0.12)
    b = np.zeros(n)
    d = int(0.07 * SR)
    b[d:] = sine(990, n - d) * env(n - d, 0.002, 0.16)
    return 0.22 * (a + b)


def peak_offset(x):
    """Index of the loudest point of a 2 ms RMS envelope."""
    w = max(1, int(0.002 * SR))
    e = np.sqrt(np.convolve(x * x, np.ones(w) / w, mode="same"))
    return int(np.argmax(e))


def main():
    data = json.loads((OUT / "cues.json").read_text())
    T, cues = data["T"], data["cues"]
    n = int(round(T * SR))
    mix = np.zeros(n)
    makers = {"click": click, "tick": tick, "type": type_key, "whoosh": whoosh, "confirm": confirm}
    for t, kind, gain in cues:
        s = bar(gain) if kind == "bar" else makers[kind]()
        s = s * (1.0 if kind == "bar" else gain)
        start = int(round(t * SR)) - peak_offset(s)
        idx = (start + np.arange(len(s))) % n              # wrap tails across the loop point
        np.add.at(mix, idx, s)
    mix *= 10 ** (-1 / 20) / np.max(np.abs(mix))           # peak at -1 dBFS
    pcm = (np.stack([mix, mix], axis=1) * 32767).astype("<i2")
    with wave.open(str(OUT / "sfx.wav"), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f"wrote out/sfx.wav ({len(cues)} cues, {T}s)")


if __name__ == "__main__":
    main()
