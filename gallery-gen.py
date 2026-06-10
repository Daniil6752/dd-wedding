from pathlib import Path

# Папки с фотографиями
GALLERIES = {
    "photographer": {
        "folder": Path("photos/photographer"),
        "title": "Фото с фотографа",
        "active": True,
    },
    "phones": {
        "folder": Path("photos/phones"),
        "title": "Фото гостей",
        "active": False,
    },
}

# Какие форматы брать
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".JPG", ".JPEG", ".PNG", ".WEBP"}

output_parts = []

for gallery_id, settings in GALLERIES.items():
    folder = settings["folder"]
    title = settings["title"]
    active_class = " active" if settings["active"] else ""

    if not folder.exists():
        print(f"Папка не найдена: {folder}")
        continue

    files = sorted(
        file for file in folder.iterdir()
        if file.is_file() and file.suffix in IMAGE_EXTENSIONS
    )

    output_parts.append(
        f'<div class="photos-grid gallery-grid{active_class}" id="gallery-{gallery_id}">'
    )

    for file in files:
        # Делаем путь для HTML через /
        src = f"{folder.as_posix()}/{file.name}"

        output_parts.append(
            f'    <img src="{src}" alt="{title}" class="gallery-photo" loading="lazy">'
        )

    output_parts.append("</div>")
    output_parts.append("")

    print(f"{gallery_id}: найдено {len(files)} фото")

result = "\n".join(output_parts)

Path("gallery-generated.html").write_text(result, encoding="utf-8")

print("Готово! Файл создан: gallery-generated.html")