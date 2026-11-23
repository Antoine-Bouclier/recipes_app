"""Traitement des photos envoyées (cahier des charges §7 : « images redimensionnées »).

Chaque photo est :
- redressée selon son orientation EXIF (photos de téléphone) ;
- débarrassée de ses métadonnées (position GPS, appareil…) : RGPD ;
- réduite à PHOTO_MAX_SIZE px de côté maximum, en JPEG ;
- accompagnée d'une miniature (THUMB_MAX_SIZE px) pour la liste (NF-03).
"""
import uuid
from io import BytesIO

from django.core.files.base import ContentFile
from PIL import Image, ImageOps, UnidentifiedImageError

PHOTO_MAX_SIZE = 1600
THUMB_MAX_SIZE = 600
MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 Mo avant traitement
JPEG_QUALITY = 85


class InvalidImage(ValueError):
    pass


def _to_jpeg(image, max_size):
    copy = image.copy()
    copy.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
    buffer = BytesIO()
    copy.save(buffer, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
    return buffer.getvalue()


def process_photo(uploaded):
    """Renvoie (photo, miniature) en ContentFile JPEG, ou lève InvalidImage."""
    if uploaded.size > MAX_UPLOAD_BYTES:
        raise InvalidImage(f"Photo trop lourde (maximum {MAX_UPLOAD_BYTES // (1024 * 1024)} Mo).")
    try:
        image = Image.open(uploaded)
        image = ImageOps.exif_transpose(image)  # applique l'orientation puis l'oublie
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise InvalidImage("Fichier image invalide.") from exc

    # Transparence (PNG, WebP) : fond blanc, puis RGB sans aucune métadonnée.
    if image.mode in ("RGBA", "LA", "P"):
        image = image.convert("RGBA")
        background = Image.new("RGB", image.size, "white")
        background.paste(image, mask=image.getchannel("A"))
        image = background
    else:
        image = image.convert("RGB")
    clean = Image.new("RGB", image.size)
    clean.paste(image)

    name = uuid.uuid4().hex
    return (
        ContentFile(_to_jpeg(clean, PHOTO_MAX_SIZE), name=f"{name}.jpg"),
        ContentFile(_to_jpeg(clean, THUMB_MAX_SIZE), name=f"{name}-mini.jpg"),
    )
