# -*- coding: utf-8 -*-
import os
from PIL import Image
import numpy as np
from scipy import ndimage

ROOT = r"C:\Users\CarlosOmarAldabaEstr\Desktop\ruta-1-demo"
SRC = os.path.join(ROOT, "public", "Elementos visuales")
DST = os.path.join(ROOT, "public", "brand")

MAX_DIM = 640


def alpha_bbox(im, thresh=20):
    """getbbox() treats alpha>=1 as content, which picks up near-invisible
    shadow falloff and produces oversized, off-center crops. Threshold the
    alpha channel first so only visually meaningful pixels count."""
    a = np.array(im.split()[-1])
    mask = a > thresh
    if not mask.any():
        return im.getbbox()
    rows = np.where(mask.any(axis=1))[0]
    cols = np.where(mask.any(axis=0))[0]
    return int(cols[0]), int(rows[0]), int(cols[-1]) + 1, int(rows[-1]) + 1


def save_resized(im, path):
    im.thumbnail((MAX_DIM, MAX_DIM), Image.LANCZOS)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im.save(path, optimize=True)
    print("saved", path, im.size)


def copy_transparent(src_rel, dst_rel):
    im = Image.open(os.path.join(SRC, src_rel)).convert("RGBA")
    bbox = alpha_bbox(im)
    if bbox:
        pad = 24
        l, t, r, b = bbox
        l = max(0, l - pad); t = max(0, t - pad)
        r = min(im.width, r + pad); b = min(im.height, b + pad)
        im = im.crop((l, t, r, b))
    save_resized(im, os.path.join(DST, dst_rel))


def crop_caption(im, dark_thresh=120, row_min=40, min_run=50, peak_min=150):
    """Some tiles have a baked-in text caption near the bottom. Detect the
    sustained, dense dark-pixel row band that a caption produces (unlike
    icon edges/shadows, which are lower-density blips) and crop it off,
    backing up to the nearest clean gap above it so the icon graphic is
    untouched. The caption is always the bottom-most such band."""
    a = np.array(im).astype(np.int16)
    h, w, _ = a.shape
    bright = a.sum(axis=2) / 3
    dark_rowcount = (bright < dark_thresh).sum(axis=1)
    search_from = int(h * 0.55)

    runs = []
    run_start = None
    for y in range(search_from, h):
        if dark_rowcount[y] > row_min:
            if run_start is None:
                run_start = y
        else:
            if run_start is not None and y - run_start >= min_run:
                runs.append((run_start, y))
            run_start = None
    if run_start is not None and h - run_start >= min_run:
        runs.append((run_start, h))

    runs = [r for r in runs if dark_rowcount[r[0]:r[1]].max() > peak_min]
    if not runs:
        return im
    text_top = runs[-1][0]
    cut = text_top
    for y in range(text_top, search_from, -1):
        if dark_rowcount[y] == 0:
            cut = y
            break
    return im.crop((0, 0, w, cut))


def strip_and_save(src_rel, dst_rel, tol=14, feather=1.2, pad=24, has_caption=False):
    im = Image.open(os.path.join(SRC, src_rel)).convert("RGB")
    if has_caption:
        im = crop_caption(im)
    a = np.array(im).astype(np.int16)
    ring = np.concatenate([
        a[0:6, :].reshape(-1, 3),
        a[-6:, :].reshape(-1, 3),
        a[:, 0:6].reshape(-1, 3),
        a[:, -6:].reshape(-1, 3),
    ])
    ref = np.median(ring, axis=0)
    dist = np.abs(a - ref).max(axis=2)
    bglike = dist <= tol
    labels, n = ndimage.label(bglike, structure=np.ones((3, 3)))
    border_labels = set(labels[0, :]) | set(labels[-1, :]) | set(labels[:, 0]) | set(labels[:, -1])
    border_labels.discard(0)
    bg_mask = np.isin(labels, list(border_labels))
    alpha = np.where(bg_mask, 0, 255).astype(np.float32)
    alpha = ndimage.gaussian_filter(alpha, sigma=feather)
    alpha = np.clip(alpha, 0, 255).astype(np.uint8)
    rgba = np.dstack([np.array(im), alpha])
    out = Image.fromarray(rgba, mode="RGBA")
    bbox = alpha_bbox(out, thresh=10)
    if bbox:
        l, t, r, b = bbox
        l = max(0, l - pad); t = max(0, t - pad)
        r = min(out.width, r + pad); b = min(out.height, b + pad)
        out = out.crop((l, t, r, b))
    save_resized(out, os.path.join(DST, dst_rel))


# --- families (Set01) : already transparent, bare icon ---
S1 = r"Elementos visuales ecosistema digital\Set01_Iconos_RutaDidactica"
copy_transparent(rf"{S1}\RD_ICON_Set01_Planeacion.png", r"families\planeaciones.png")
copy_transparent(rf"{S1}\RD_ICON_Set01_Fichas_de_Trabajo.png", r"families\fichas.png")
copy_transparent(rf"{S1}\RD_ICON_Set01_Diapositivas.png", r"families\diapositivas.png")
copy_transparent(rf"{S1}\RD_ICON_Set01_Seguimiento_Pedagogico.png", r"families\seguimiento.png")

# --- attributes (Set02 Version 1) : already transparent ---
S2 = "Elementos visuales ecosistema digital\\Set02_Atributos_Digitales_RutaDidactica\\Versión 1"
copy_transparent(rf"{S2}\RD_ICON_Set02_Actualizado.png", r"attributes\actualizado.png")
copy_transparent(rf"{S2}\RD_ICON_Set02_Descargable.png", r"attributes\descargable.png")
copy_transparent(rf"{S2}\RD_ICON_Set02_Editable.png", r"attributes\editable.png")
copy_transparent(rf"{S2}\RD_ICON_Set02_Incluye_Recortables.png", r"attributes\recortables.png")

# --- routes (Set03) : already transparent ---
S3 = r"Elementos visuales ecosistema digital\Set03_Modalidades_Comerciales_RutaDidactica"
copy_transparent(rf"{S3}\RD_ICON_Set03_Ruta_Base.png", r"routes\base.png")
copy_transparent(rf"{S3}\RD_ICON_Set03_Ruta_Visual.png", r"routes\visual.png")
copy_transparent(rf"{S3}\RD_ICON_Set03_Ruta_Seguimiento.png", r"routes\seguimiento.png")
copy_transparent(rf"{S3}\RD_ICON_Set03_Ruta_Integral.png", r"routes\integral.png")

# --- grades (Set04A) : opaque tile, strip outer canvas ---
S4G = r"Elementos visuales ecosistema digital\Set04_Grados_y_Cobertura_RutaDidactica\Set04A_Grados"
grade_files = {
    1: "01_Primer_grado.png",
    2: "02_Segundo_grado.png",
    3: "03_Tercer_grado.png",
    4: "04_Cuarto_grado.png",
    5: "05_Quinto_grado.png",
    6: "06_Sexto_grado.png",
}
for n, fn in grade_files.items():
    strip_and_save(rf"{S4G}\{fn}", rf"grades\{n}.png")

# --- coverage (cobertura_temporal_png) : opaque tile, strip outer canvas ---
S4C = r"Elementos visuales ecosistema digital\Set04_Grados_y_Cobertura_RutaDidactica\cobertura_temporal_png"
strip_and_save(rf"{S4C}\04_Quincena.png", r"coverage\quincena.png", has_caption=True)
strip_and_save(rf"{S4C}\03_Mes.png", r"coverage\mes.png", has_caption=True)
strip_and_save(rf"{S4C}\01_Trimestre.png", r"coverage\trimestre.png", has_caption=True)
strip_and_save(rf"{S4C}\02_Ciclo_completo.png", r"coverage\ciclo.png", has_caption=True)

# --- campos formativos : opaque tile, strip outer canvas (new) ---
SC = "Elementos visuales campos formativos"
strip_and_save(rf"{SC}\02_Lenguajes.png", r"campos\lenguajes.png")
strip_and_save(rf"{SC}\03_Saberes_y_pensamiento_cientifico.png", r"campos\ciencia.png")
strip_and_save(rf"{SC}\04_Etica_naturaleza_y_sociedades.png", r"campos\etica.png")
strip_and_save(rf"{SC}\05_De_lo_humano_y_lo_comunitario.png", r"campos\humano.png")
strip_and_save(rf"{SC}\01_Valoracion_de_logros.png", r"campos\valoracion.png")

# --- logo : already transparent, tight crop ---
logo = Image.open(os.path.join(SRC, "Logo ruta didáctica.png")).convert("RGBA")
bbox = alpha_bbox(logo)
pad = 20
l, t, r, b = bbox
l = max(0, l - pad); t = max(0, t - pad)
r = min(logo.width, r + pad); b = min(logo.height, b + pad)
logo = logo.crop((l, t, r, b))
os.makedirs(DST, exist_ok=True)
logo_out = logo.copy()
logo_out.thumbnail((1400, 1400), Image.LANCZOS)
logo_out.save(os.path.join(DST, "logo.png"), optimize=True)
print("saved logo", logo_out.size)

# --- favicon : crop just the map-pin/book mark, pad to square ---
mark = logo.crop((0, 0, min(logo.width, int(logo.height * 1.8)), logo.height))
mbbox = alpha_bbox(mark)
mark = mark.crop(mbbox)
side = max(mark.width, mark.height) + 60
canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
canvas.paste(mark, ((side - mark.width) // 2, (side - mark.height) // 2), mark)
sizes = [16, 32, 48, 64, 128, 256]
imgs = [canvas.resize((s, s), Image.LANCZOS) for s in sizes]
favicon_path = os.path.join(ROOT, "src", "app", "favicon.ico")
imgs[-1].save(favicon_path, format="ICO", sizes=[(s, s) for s in sizes])
print("saved favicon", favicon_path)

print("DONE")
