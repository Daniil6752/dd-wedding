import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Supabase project settings
const SUPABASE_URL = "https://unqgcshbregtdjhjsuku.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_YKBZZeAS_FfE5BXupSorJQ_ykY2cghc";
const BUCKET = "wedding-uploads";

// Change this if you move to a paid plan and increase bucket file-size limit.
const MAX_FILE_MB = 50;
const WEDDING_FOLDER = "2026-08-25";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const form = document.querySelector("#uploadForm");
const cameraInput = document.querySelector("#cameraInput");
const fileInput = document.querySelector("#fileInput");
const guestNameInput = document.querySelector("#guestName");
const uploadButton = document.querySelector("#uploadButton");
const fileList = document.querySelector("#fileList");
const statusBox = document.querySelector("#status");

let selectedFiles = [];

cameraInput.addEventListener("change", () => addFiles(cameraInput.files));
fileInput.addEventListener("change", () => addFiles(fileInput.files));
form.addEventListener("submit", uploadSelectedFiles);

function addFiles(fileListObject) {
  const newFiles = Array.from(fileListObject || []);
  selectedFiles = [...selectedFiles, ...newFiles];
  renderFileList();
}

function renderFileList() {
  uploadButton.disabled = selectedFiles.length === 0;

  if (!selectedFiles.length) {
    fileList.classList.remove("visible");
    fileList.innerHTML = "";
    return;
  }

  fileList.classList.add("visible");
  fileList.innerHTML = selectedFiles
    .map((file, index) => {
      const size = formatBytes(file.size);
      return `
        <div class="file-item">
          <span>${escapeHtml(file.name || `Файл ${index + 1}`)}</span>
          <span>${size}</span>
        </div>
      `;
    })
    .join("");
}

async function uploadSelectedFiles(event) {
  event.preventDefault();

  if (!selectedFiles.length) return;

  uploadButton.disabled = true;
  setStatus("Готовим файлы к загрузке…");

  const guestName = guestNameInput.value.trim();
  let uploaded = 0;

  try {
    for (const file of selectedFiles) {
      validateFile(file);

      uploaded += 1;
      setStatus(`Загружаем ${uploaded} из ${selectedFiles.length}: ${file.name}`);

      const path = buildStoragePath(file, guestName);
      const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });

      if (error) {
        throw new Error(error.message || "Не удалось загрузить файл");
      }
    }

    selectedFiles = [];
    cameraInput.value = "";
    fileInput.value = "";
    renderFileList();
    setStatus("Спасибо! Файлы загружены 🤍", "success");
  } catch (error) {
    console.error(error);
    setStatus(getFriendlyError(error), "error");
    uploadButton.disabled = selectedFiles.length === 0;
  }
}

function validateFile(file) {
  const maxBytes = MAX_FILE_MB * 1024 * 1024;

  if (file.size > maxBytes) {
    throw new Error(
      `Файл «${file.name}» больше ${MAX_FILE_MB} MB. Попробуйте выбрать фото поменьше или отправить видео позже.`
    );
  }

  const allowedPrefix = file.type.startsWith("image/") || file.type.startsWith("video/");
  if (!allowedPrefix) {
    throw new Error(`Файл «${file.name}» не похож на фото или видео.`);
  }
}

function buildStoragePath(file, guestName) {
  const now = new Date();
  const datePart = formatDateForName(now);
  const guestPart = slugify(guestName || "guest");
  const randomPart = getRandomId();
  const extension = getFileExtension(file);

  return `${WEDDING_FOLDER}/${datePart}_${guestPart}_${randomPart}.${extension}`;
}

function formatDateForName(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join("-") + "_" + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("-");
}

function getFileExtension(file) {
  const fromName = (file.name || "").split(".").pop()?.toLowerCase();
  if (fromName && fromName.length <= 8 && fromName !== file.name.toLowerCase()) {
    return fromName.replace(/[^a-z0-9]/g, "") || "bin";
  }

  const mimeMap = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
  };

  return mimeMap[file.type] || "bin";
}

function slugify(value) {
  const map = {
    а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
    к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
    ф: "f", х: "h", ц: "c", ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  };

  return value
    .toLowerCase()
    .split("")
    .map((char) => map[char] ?? char)
    .join("")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "guest";
}

function getRandomId() {
  if (crypto.randomUUID) return crypto.randomUUID().slice(0, 8);
  return Math.random().toString(16).slice(2, 10);
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function setStatus(message, type = "") {
  statusBox.className = `status ${type}`.trim();
  statusBox.textContent = message;
}

function getFriendlyError(error) {
  const message = String(error?.message || error || "");

  if (message.includes("row-level security") || message.includes("Unauthorized")) {
    return "Загрузка заблокирована настройками Supabase. Проверьте policy для bucket wedding-uploads.";
  }

  if (message.includes("Payload too large") || message.includes("exceeded")) {
    return `Файл слишком большой. Сейчас лимит на странице — ${MAX_FILE_MB} MB.`;
  }

  return message || "Что-то пошло не так. Попробуйте ещё раз.";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
