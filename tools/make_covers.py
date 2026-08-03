"""Generate simplified Eagle marketplace covers (1560x1040)."""
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1]
LOGO = OUT / "logo.png"
OLD = OUT / "featured-tagia.png"
W, H = 1560, 1040


def load_font(paths: list[str], size: int) -> ImageFont.ImageFont:
    for p in paths:
        try:
            return ImageFont.truetype(p, size, index=0)
        except Exception:
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def font_en(size: int, bold: bool = False) -> ImageFont.ImageFont:
    return load_font(
        [
            r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
            r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        ],
        size,
    )


def font_cjk(size: int, bold: bool = False) -> ImageFont.ImageFont:
    """Japanese-first CJK stack (Yu Gothic / Meiryo)."""
    return load_font(
        [
            r"C:\Windows\Fonts\YuGothB.ttc" if bold else r"C:\Windows\Fonts\YuGothM.ttc",
            r"C:\Windows\Fonts\meiryob.ttc" if bold else r"C:\Windows\Fonts\meiryo.ttc",
            r"C:\Windows\Fonts\msyhbd.ttc" if bold else r"C:\Windows\Fonts\msyh.ttc",
            r"C:\Windows\Fonts\msjhbd.ttc" if bold else r"C:\Windows\Fonts\msjh.ttc",
        ],
        size,
    )


def font_sc(size: int, bold: bool = False) -> ImageFont.ImageFont:
    """Simplified Chinese — Microsoft YaHei / SimSun (must cover 标签 etc.)."""
    return load_font(
        [
            r"C:\Windows\Fonts\msyhbd.ttc" if bold else r"C:\Windows\Fonts\msyh.ttc",
            r"C:\Windows\Fonts\simsun.ttc",
            r"C:\Windows\Fonts\simhei.ttf",
            r"C:\Windows\Fonts\msjhbd.ttc" if bold else r"C:\Windows\Fonts\msjh.ttc",
        ],
        size,
    )


def font_tc(size: int, bold: bool = False) -> ImageFont.ImageFont:
    """Traditional Chinese — Microsoft JhengHei."""
    return load_font(
        [
            r"C:\Windows\Fonts\msjhbd.ttc" if bold else r"C:\Windows\Fonts\msjh.ttc",
            r"C:\Windows\Fonts\msyhbd.ttc" if bold else r"C:\Windows\Fonts\msyh.ttc",
            r"C:\Windows\Fonts\simsun.ttc",
        ],
        size,
    )


def main() -> None:
    ui_crop = None
    if OLD.exists():
        old = Image.open(OLD).convert("RGBA")
        # Prefer right-side UI region from previous cover
        ui_crop = old.crop((820, 80, 1500, 960)).resize((620, 800), Image.Resampling.LANCZOS)

    logo = Image.open(LOGO).convert("RGBA").resize((140, 140), Image.Resampling.LANCZOS)

    locales = {
        "featured-tagia.png": {
            "title": "Tagia",
            "tagline": "Local AI batch tagging",
            "chips": ["Local", "Batch", "GPU ready"],
            "f_title": font_en(96, True),
            "f_tag": font_en(42, False),
            "f_chip": font_en(28, True),
        },
        "featured-tagia-ja.png": {
            "title": "Tagia",
            "tagline": "ローカルAIで一括タグ付け",
            "chips": ["ローカル", "一括", "GPU対応"],
            "f_title": font_cjk(96, True),
            "f_tag": font_cjk(40, False),
            "f_chip": font_cjk(26, True),
        },
        "featured-tagia-zh-cn.png": {
            "title": "Tagia",
            "tagline": "本地 AI 批量打标签",
            "chips": ["本地", "批量", "GPU"],
            "f_title": font_sc(96, True),
            "f_tag": font_sc(42, False),
            "f_chip": font_sc(28, True),
        },
        "featured-tagia-zh-tw.png": {
            "title": "Tagia",
            "tagline": "本機 AI 批次標籤",
            "chips": ["本機", "批次", "GPU"],
            "f_title": font_tc(96, True),
            "f_tag": font_tc(42, False),
            "f_chip": font_tc(28, True),
        },
    }

    for name, L in locales.items():
        img = Image.new("RGBA", (W, H), (18, 20, 26, 255))
        d = ImageDraw.Draw(img)

        for x in range(0, 780):
            t = x / 780
            r = int(18 + 12 * t)
            g = int(22 + 18 * t)
            b = int(32 + 28 * t)
            d.line([(x, 0), (x, H)], fill=(r, g, b, 255))

        d.rectangle([0, 0, 12, H], fill=(99, 140, 255, 255))

        img.paste(logo, (80, 220), logo)
        d.text((250, 240), L["title"], font=L["f_title"], fill=(245, 247, 252, 255))
        d.text((80, 400), L["tagline"], font=L["f_tag"], fill=(180, 190, 210, 255))

        x = 80
        y = 520
        for chip in L["chips"][:3]:
            bbox = d.textbbox((0, 0), chip, font=L["f_chip"])
            tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
            pad_x, pad_y = 28, 16
            rw, rh = tw + pad_x * 2, th + pad_y * 2
            d.rounded_rectangle(
                [x, y, x + rw, y + rh],
                radius=22,
                fill=(40, 48, 68, 255),
                outline=(99, 140, 255, 180),
                width=2,
            )
            d.text((x + pad_x, y + pad_y - 2), chip, font=L["f_chip"], fill=(220, 230, 250, 255))
            x += rw + 18

        card = Image.new("RGBA", (680, 880), (28, 32, 44, 255))
        cd = ImageDraw.Draw(card)
        cd.rounded_rectangle(
            [0, 0, 679, 879],
            radius=28,
            fill=(28, 32, 44, 255),
            outline=(70, 80, 110, 255),
            width=3,
        )
        if ui_crop is not None:
            ux = (680 - ui_crop.width) // 2
            uy = (880 - ui_crop.height) // 2
            card.paste(ui_crop, (ux, uy), ui_crop)
        else:
            cd.rounded_rectangle([40, 40, 640, 120], radius=16, fill=(40, 48, 68, 255))
            cd.text((60, 60), "Tagia", font=font_en(36, True), fill=(245, 247, 252, 255))

        img.paste(card, (820, 80), card)

        out_path = OUT / name
        img.convert("RGB").save(out_path, "PNG", optimize=True)
        print("wrote", out_path, out_path.stat().st_size)


if __name__ == "__main__":
    main()
