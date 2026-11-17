"""生成宣传片画面（温和版）。

11 幕，重点在「声音从哪来、谁做的」而不是推销。
所有元素由代码绘制；配色取自 bibibobo 本身（藏青/明黄/朱红）。
"""
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
OUT = HERE / "out"
FRAMES = OUT / "frames"
FRAMES.mkdir(parents=True, exist_ok=True)

W, H = 1280, 720
FPS = 30
INK = (22, 36, 74)
INK2 = (30, 46, 88)
INK3 = (40, 56, 100)
YELLOW = (255, 216, 77)
RED = (255, 77, 94)
PAPER = (255, 246, 228)
MUTED = (150, 164, 198)
MUTED2 = (120, 132, 164)
BAR_BG = (58, 74, 118)

FONT_B = "C:/Windows/Fonts/msyhbd.ttc"
FONT_R = "C:/Windows/Fonts/msyh.ttc"


def font(size, bold=True):
    return ImageFont.truetype(FONT_B if bold else FONT_R, size)


plan = json.loads((OUT / "plan.json").read_text(encoding="utf-8"))
scenes = plan["scenes"]


def ease_out(x):
    return 1 - (1 - x) ** 3


def tw(d, s, f):
    b = d.textbbox((0, 0), s, font=f)
    return b[2] - b[0], b[3] - b[1]


def saw(d, x0, x1, y, amp, cycles, color, width=3, phase=0.0):
    steps = 420
    pts = []
    for i in range(steps + 1):
        p = i / steps
        frac = ((p * cycles) + phase) % 1.0
        pts.append((x0 + (x1 - x0) * p, y - amp * (2 * frac - 1)))
    for i in range(len(pts) - 1):
        d.line([pts[i], pts[i + 1]], fill=color, width=width)


def grid(d):
    for gx in range(0, W, 48):
        d.line([(gx, 0), (gx, H)], fill=INK2, width=1)
    for gy in range(0, H, 48):
        d.line([(0, gy), (W, gy)], fill=INK2, width=1)


def header(d, scene, drift, size=44):
    f_k, f_t, f_s = font(19, False), font(size), font(22, False)
    k = scene.get("kicker", "")
    y = 48 + drift
    if k:
        kw, _ = tw(d, k, f_k)
        d.rounded_rectangle([(W - kw) / 2 - 13, y, (W + kw) / 2 + 13, y + 34], 8, fill=INK3)
        d.text(((W - kw) / 2, y + 5), k, font=f_k, fill=YELLOW)
        y += 48
    tw_, _ = tw(d, scene["title"], f_t)
    d.text(((W - tw_) / 2, y), scene["title"], font=f_t, fill=PAPER)
    y += size + 14
    sub = scene.get("subtitle", "")
    if sub:
        sw_, _ = tw(d, sub, f_s)
        d.text(((W - sw_) / 2, y), sub, font=f_s, fill=MUTED)
        y += 32
    return y + 18


def speaker(d, cx, cy, s=1.0, color=INK):
    d.polygon([(cx - 9 * s, cy - 4 * s), (cx - 2 * s, cy - 4 * s),
               (cx + 7 * s, cy - 12 * s), (cx + 7 * s, cy + 12 * s),
               (cx - 2 * s, cy + 4 * s), (cx - 9 * s, cy + 4 * s)], fill=color)
    for r in (6, 11):
        d.arc([cx + 5 * s, cy - r * s - 1, cx + 5 * s + 2 * r * s, cy + r * s - 1],
              start=-58, end=58, fill=color, width=max(2, int(2 * s)))


def card(d, top, h, lines, labels):
    bx0, bx1 = 130, W - 130
    by1 = top + h
    d.rounded_rectangle([bx0, top, bx1, by1], 18, fill=(255, 255, 255))
    fb = font(24, False)
    for i, ln in enumerate(lines):
        d.text((bx0 + 32, top + 28 + i * 44), ln, font=fb, fill=(60, 70, 96))
    rowy = by1 - 42
    bx = bx0 + 32
    for lb in labels:
        wl, _ = tw(d, lb, font(17, False))
        d.rounded_rectangle([bx, rowy - 13, bx + wl + 18, rowy + 15], 7, outline=(220, 226, 238), width=2)
        d.text((bx + 9, rowy - 9), lb, font=font(17, False), fill=(110, 122, 150))
        bx += wl + 28
    return rowy, bx + 10


def scene_frame(scene, local):
    img = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(img)
    grid(d)
    ap = ease_out(min(1.0, local * 3.0))
    drift = 9 * (1 - ap)
    sid = scene["id"]

    # 1. hook：大字点题
    if sid == "hook":
        fk, fb = font(23, False), font(100)
        kw, _ = tw(d, scene["kicker"], fk)
        d.text(((W - kw) / 2, 148 + drift), scene["kicker"], font=fk, fill=MUTED)
        bw, bh = tw(d, scene["title"], fb)
        bx, by = (W - bw) / 2, H / 2 - bh / 2 - 18 + drift
        d.rounded_rectangle([bx - 22, by - 8, bx + bw + 22, by + bh + 14], 16, fill=YELLOW)
        d.text((bx, by), scene["title"], font=fb, fill=RED)
        f2 = font(25, False)
        sw_, _ = tw(d, scene["subtitle"], f2)
        d.text(((W - sw_) / 2, by + bh + 40), scene["subtitle"], font=f2, fill=MUTED)
        saw(d, 210, W - 210, H - 108, 42, 7, YELLOW, 3, local * 2.2)

    # 2. origin：声音出自哈基科技的配乐
    elif sid == "origin":
        top = header(d, scene, drift, 46)
        f_l, f_r = font(26, False), font(26)
        y = top + 40
        left, right = "哈基科技", "路墨小剧场"
        lw = tw(d, left, f_l)[0]
        rw = tw(d, right, f_r)[0]
        d.text((W * 0.28 - lw / 2, y), left, font=f_l, fill=MUTED)
        d.text((W * 0.72 - rw / 2, y), right, font=f_r, fill=YELLOW)
        ax0 = W * 0.28 + lw / 2 + 34
        ax1 = W * 0.72 - rw / 2 - 34
        d.line([(ax0, y + 18), (ax1, y + 18)], fill=YELLOW, width=3)
        d.polygon([(ax1, y + 18), (ax1 - 10, y + 12), (ax1 - 10, y + 24)], fill=YELLOW)

        # 关键区分：原本是「配乐脚本里的一段」，不是现成的库
        d.rounded_rectangle([190, y + 74, W - 190, y + 150], 13, fill=INK3)
        n1 = "原本只是配乐脚本里的一段声音"
        n1w, _ = tw(d, n1, font(23, False))
        d.text(((W - n1w) / 2, y + 96), n1, font=font(23, False), fill=MUTED)

        d.rounded_rectangle([190, y + 166, W - 190, y + 242], 13, fill=(255, 255, 255))
        n2 = "「这个声音，你可能听过。」"
        n2w, _ = tw(d, n2, font(23, False))
        d.text(((W - n2w) / 2, y + 188), n2, font=font(23, False), fill=INK)
        saw(d, 320, W - 320, y + 292, 30, 5, RED, 3, local * 2)

    # 3. code：谁把这段声音写成了库
    elif sid == "code":
        top = header(d, scene, drift, 46)
        f1, f2 = font(24, False), font(20, False)

        # 项目名 + 首次提交者，分两行写清楚，避免把组织当成人
        d.rounded_rectangle([230, top + 22, W - 230, top + 108], 14, fill=INK3)
        p1 = "bibibobo"
        p1w, _ = tw(d, p1, font(30))
        d.text(((W - p1w) / 2, top + 38), p1, font=font(30), fill=YELLOW)
        p2 = "MIT 协议 · 零依赖"
        p2w, _ = tw(d, p2, f2)
        d.text(((W - p2w) / 2, top + 78), p2, font=f2, fill=MUTED)

        rows = [
            ("首次提交", "soraincloud"),
            ("播放方式修复", "KanbaraDYD"),
            ("托管", "hakihakii（组织）"),
        ]
        y = top + 132
        lbl_w = max(tw(d, a, f2)[0] for a, _ in rows)
        col = W / 2 - 160
        for i, (lbl, val) in enumerate(rows):
            d.text((col - tw(d, lbl, f2)[0], y + i * 44), lbl, font=f2, fill=MUTED)
            d.text((col + 22, y + i * 44 - 3), val, font=f1,
                   fill=PAPER if i == 0 else (206, 214, 234))

    # 4. turn：我做了什么
    elif sid == "turn":
        top = header(d, scene, drift, 48)
        f1 = font(23, False)
        y = top + 50
        # 上游 → 插件
        d.rounded_rectangle([180, y, 520, y + 96], 14, fill=INK3)
        d.text((202, y + 20), "bibibobo", font=font(24), fill=PAPER)
        d.text((202, y + 56), "合成器（原样内联）", font=font(18, False), fill=MUTED)
        d.rounded_rectangle([760, y, W - 180, y + 96], 14, fill=INK3)
        d.text((782, y + 20), "dsh-bibibobo", font=font(24), fill=YELLOW)
        d.text((782, y + 56), "朗读控件（我加的）", font=font(18, False), fill=MUTED)
        d.line([(540, y + 48), (740, y + 48)], fill=YELLOW, width=3)
        d.polygon([(740, y + 48), (729, y + 42), (729, y + 54)], fill=YELLOW)
        # 分工说明
        y2 = y + 140
        for i, ln in enumerate(["声音：全部来自上游", "控件、字幕、进度条：这个插件加的"]):
            wl, _ = tw(d, ln, f1)
            d.text(((W - wl) / 2, y2 + i * 44), ln, font=f1, fill=MUTED)

    # 5. demo：操作行位置
    elif sid == "demo":
        top = header(d, scene, drift, 46)
        rowy, cx = card(d, top + 10, 230, ["控件就在每条回答下面。"],
                        ["复制", "好的回复", "有问题的回复", "在新对话中分支"])
        d.rounded_rectangle([cx - 8, rowy - 21, cx + 46, rowy + 23], 10, fill=YELLOW)
        speaker(d, cx + 19, rowy, 1.0, INK)
        ay = rowy + 56
        d.line([(cx + 19, rowy + 28), (cx + 19, ay)], fill=RED, width=3)
        d.polygon([(cx + 19, rowy + 22), (cx + 12, rowy + 36), (cx + 26, rowy + 36)], fill=RED)
        note = "和复制挨着"
        nw, _ = tw(d, note, font(20, False))
        d.text((cx + 19 - nw / 2, ay + 6), note, font=font(20, False), fill=RED)

    # 6. play：字幕 + 进度条
    elif sid == "play":
        top = header(d, scene, drift, 46)
        rowy, cx = card(d, top + 10, 210, ["念的时候，字幕跟着走。"],
                        ["复制", "好的回复", "在新对话中分支"])
        d.rounded_rectangle([cx - 8, rowy - 21, cx + 46, rowy + 23], 10, fill=YELLOW)
        speaker(d, cx + 19, rowy, 1.0, INK)
        py = top + 10 + 210 + 38
        prog = min(1.0, max(0.0, (local - 0.10) / 0.78))
        d.rounded_rectangle([130, py, W - 190, py + 7], 4, fill=BAR_BG)
        d.rounded_rectangle([130, py, 130 + (W - 320) * prog, py + 7], 4, fill=RED)
        d.text((W - 176, py - 6), f"{int(prog*100)}%", font=font(18, False), fill=MUTED)
        d.text((130, py + 24), "念到哪，一眼能看出来", font=font(22, False), fill=PAPER)

    # 7. closing：只念最后那段
    elif sid == "closing":
        top = header(d, scene, drift, 46)
        # 中间步骤：淡
        d.rounded_rectangle([130, top + 8, W - 130, top + 82], 12, fill=(38, 52, 92))
        d.text((152, top + 26), "中间：查资料、跑命令、看文件", font=font(20, False), fill=MUTED2)
        d.line([(152, top + 46), (500, top + 46)], fill=MUTED2, width=2)
        d.text((W - 250, top + 34), "跳过", font=font(17, False), fill=RED)
        # 最后一段：念
        rowy, cx = card(d, top + 104, 180, ["最后：这是结论。"], ["复制", "好的回复"])
        d.rounded_rectangle([cx - 8, rowy - 21, cx + 46, rowy + 23], 10, fill=YELLOW)
        speaker(d, cx + 19, rowy, 1.0, INK)
        d.text((W - 250, rowy - 10), "念这段", font=font(17, False), fill=YELLOW)

    # 8. how：三段波形
    elif sid == "how":
        top = header(d, scene, drift, 46)
        ys = [top + 76, top + 182, top + 288]
        for label, y, col, a in [
            ("锯齿波", ys[0], YELLOW, 40),
            ("带通 1", ys[1], RED, 28),
            ("带通 2", ys[2], PAPER, 18),
        ]:
            saw(d, 150, W - 150, y, a * ap, 3, col, 3, local * 2.6)
            d.text((40, y - 11), label, font=font(17, False), fill=MUTED)

    # 9. credit：声音不是我做的
    elif sid == "credit":
        top = header(d, scene, drift, 50)
        f_lbl, f_val = font(21, False), font(25)
        rows = [
            ("代码 · 波形 · 口型", "全部来自 bibibobo"),
            ("作者", "hakihakii"),
            ("最初出处", "B 站 哈基科技《路墨小剧场》"),
        ]
        y = top + 44
        # 左列按最长标签右对齐，右列左对齐，避免「标签 + 空格」凑出来的参差
        lbl_w = max(tw(d, a, f_lbl)[0] for a, _ in rows)
        col_x = W / 2 - 190
        for i, (lbl, val) in enumerate(rows):
            d.text((col_x - tw(d, lbl, f_lbl)[0], y + i * 52), lbl, font=f_lbl, fill=MUTED)
            d.text((col_x + 24, y + i * 52 - 2), val, font=f_val,
                   fill=PAPER if i == 0 else (210, 218, 236))
        saw(d, 330, W - 330, H - 96, 32, 5, YELLOW, 3, local * 1.8)

    # 10. thanks：按可查证事实分列，不合并身份
    elif sid == "thanks":
        f_k = font(19, False)
        d.rounded_rectangle([(W - 76) / 2, 44 + drift, (W + 76) / 2, 78 + drift], 8, fill=INK3)
        d.text(((W - tw(d, "谢谢", f_k)[0]) / 2, 49 + drift), "谢谢", font=f_k, fill=YELLOW)

        f_t = font(40)
        t = scene["title"]
        tw_, th_ = tw(d, t, f_t)
        d.text(((W - tw_) / 2, 106 + drift), t, font=f_t, fill=YELLOW)

        # 四行分工，每行「角色 → 名字」，写得像一张名单
        f_role, f_name = font(19, False), font(23)
        rows = [
            ("声音原本的形状", "哈基科技《路墨小剧场》"),
            ("写成代码", "soraincloud"),
            ("修过播放方式", "KanbaraDYD"),
            ("托管与维护", "hakihakii（组织）"),
        ]
        y = 106 + th_ + 44
        role_w = max(tw(d, a, f_role)[0] for a, _ in rows)
        col = W / 2 - 250
        for i, (role, name) in enumerate(rows):
            d.text((col - tw(d, role, f_role)[0], y + i * 46), role, font=f_role, fill=MUTED)
            d.text((col + 24, y + i * 46 - 3), name, font=f_name,
                   fill=PAPER if i == 0 else (206, 214, 234))

        f_note = font(18, False)
        note = "喜欢这个声音的话，去 B 站看看原作 · bibibobo 是 MIT"
        nw, _ = tw(d, note, f_note)
        d.text(((W - nw) / 2, y + 4 * 46 + 22), note, font=f_note, fill=MUTED2)
        saw(d, 340, W - 340, H - 52, 26, 4, YELLOW, 2, local * 1.6)

    # 11. install：怎么装
    elif sid == "install":
        top = header(d, scene, drift, 52)
        f2 = font(25, False)
        box = "设置 → 插件 → 添加插件"
        bw, _ = tw(d, box, f2)
        cy = top + 46
        d.rounded_rectangle([(W - bw) / 2 - 26, cy, (W + bw) / 2 + 26, cy + 60], 12, fill=(255, 255, 255))
        d.text(((W - bw) / 2, cy + 14), box, font=f2, fill=INK)
        f3 = font(19, False)
        for i, ln in enumerate(["dsh-bibibobo", "零依赖 · 不联网 · 不花 token"]):
            wl, _ = tw(d, ln, f3)
            d.text(((W - wl) / 2, cy + 88 + i * 36), ln, font=f3, fill=MUTED)

    return img


frame_idx = 0
for si, scene in enumerate(scenes):
    n = int(round(scene["dur"] * FPS))
    for i in range(n):
        local = i / max(1, n - 1)
        img = scene_frame(scene, local)
        fade = min(1.0, i / 4) * min(1.0, (n - 1 - i) / 4)
        if si == 0:
            fade = min(1.0, i / 12)
        if si == len(scenes) - 1:
            fade = min(fade, (n - 1 - i) / 16)
        if fade < 1.0:
            img = Image.blend(Image.new("RGB", (W, H), INK), img, max(0.0, fade))
        img.save(FRAMES / f"{frame_idx:05d}.png")
        frame_idx += 1

print(f"已渲染 {frame_idx} 帧 @ {FPS}fps → {FRAMES}")
