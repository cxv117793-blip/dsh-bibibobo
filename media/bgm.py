"""生成宣传片 BGM。

同样的合成思路（锯齿波 + 滤波），但刻意做得比旁白更暗、更慢：
- 用低八度的柔和三角波铺底，避免与中高频的旁白抢位置
- 简单的四和弦循环，每幕换一次，转场处有轻微上扬
- 侧链压缩：旁白出现时自动把 BGM 压低，保证语音清晰
"""
import json
import wave
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
OUT = HERE / "out"
SR = 44100

plan = json.loads((OUT / "plan.json").read_text(encoding="utf-8"))
total = plan["total"]
n = int(round(total * SR))
t = np.arange(n) / SR

# ── 和弦进行：Am - F - C - G（A 小调，平缓）
# 每个和弦用 MIDI 音高表示，低八度铺底
CHORDS = [
    [45, 52, 57],   # Am
    [41, 48, 53],   # F
    [48, 55, 60],   # C
    [43, 50, 55],   # G
]


def midi_to_hz(m):
    return 440.0 * (2.0 ** ((m - 69) / 12.0))


def soft_saw(freq, length, phase=0.0):
    """低通后的锯齿：谐波快速衰减，听感接近三角波，不刺耳。"""
    ph = (phase + np.arange(length) * freq / SR) % 1.0
    out = np.zeros(length)
    for k in range(1, 9):
        out += (1.0 / (k * k)) * np.sin(2 * np.pi * k * ph)
    return out


# ── 铺底：每 4 秒换一个和弦，交叉淡化
bar = 4.0
pad = np.zeros(n)
for start in np.arange(0, total, bar):
    idx = int(start * SR)
    end = min(n, int((start + bar + 1.5) * SR))
    length = end - idx
    if length <= 0:
        continue
    chord = CHORDS[int(start // bar) % len(CHORDS)]
    voice = np.zeros(length)
    for j, m in enumerate(chord):
        voice += soft_saw(midi_to_hz(m), length, phase=j * 0.17)
    # 包络：慢起，长尾，交叉进下一个和弦
    env = np.minimum(1.0, np.arange(length) / (0.9 * SR))
    env *= np.minimum(1.0, (length - np.arange(length)) / (1.2 * SR))
    pad[idx:end] += voice * env

pad /= max(1e-9, np.max(np.abs(pad)))

# ── 心跳般的低音脉冲，每拍一次（80 BPM ≈ 0.75s）
beat = 60.0 / 80.0
pulse = np.zeros(n)
for start in np.arange(0, total, beat):
    idx = int(start * SR)
    length = min(int(0.28 * SR), n - idx)
    if length <= 0:
        continue
    env = np.exp(-np.arange(length) / (0.06 * SR))
    root = CHORDS[int(start // bar) % len(CHORDS)][0] - 12
    pulse[idx:idx + length] += np.sin(2 * np.pi * midi_to_hz(root) * np.arange(length) / SR) * env
pulse /= max(1e-9, np.max(np.abs(pulse)))

# ── 轻高频铺陈，制造空气感
air = np.zeros(n)
rng = np.random.default_rng(7)
noise = rng.standard_normal(n)
# 一阶低通模拟
alpha = 0.0025
for i in range(1, n):
    air[i] = air[i - 1] + alpha * (noise[i] - air[i - 1])
air -= np.convolve(air, np.ones(2048) / 2048, mode="same")
air /= max(1e-9, np.max(np.abs(air)))

# ── 侧链：旁白出现时压低 BGM
duck = np.ones(n)
for scene_start, scene in zip(np.cumsum([0] + [s["dur"] for s in plan["scenes"][:-1]]), plan["scenes"]):
    idx = int((scene_start + plan["lead"]) * SR)
    length = int((scene["speechSec"] + 0.35) * SR)
    end = min(n, idx + length)
    if end <= idx:
        continue
    seg = 0.34 + 0.66 * np.minimum(1.0, np.arange(end - idx) / (0.03 * SR))
    seg *= np.minimum(1.0, (end - idx - np.arange(end - idx)) / (0.05 * SR))
    duck[idx:end] = np.minimum(duck[idx:end], seg)

mix = (0.46 * pad + 0.20 * pulse + 0.07 * air) * duck

# 首尾淡入淡出
fade = int(0.8 * SR)
mix[:fade] *= np.linspace(0, 1, fade)
mix[-fade:] *= np.linspace(1, 0, fade)

# 峰值归一，留足余量给旁白
mix *= 0.72 / max(1e-9, np.max(np.abs(mix)))
pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)

with wave.open(str(OUT / "bgm.wav"), "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())

print(f"BGM 已生成 {total:.2f}s  峰值 {np.max(np.abs(mix)):.3f}  RMS {np.sqrt(np.mean(mix**2)):.3f}")
