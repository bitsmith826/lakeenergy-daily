/**
 * Utility UI untuk Pewarnaan ANSI dan Pembuatan Border Presisi
 */

export const colors = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  italic: "\x1b[3m",

  // Foreground
  black: "\x1b[30m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",

  // Bright Foreground
  brightRed: "\x1b[91m",
  brightGreen: "\x1b[92m",
  brightYellow: "\x1b[93m",
  brightBlue: "\x1b[94m",
  brightMagenta: "\x1b[95m",
  brightCyan: "\x1b[96m",
  brightWhite: "\x1b[97m",
};

/**
 * Menghapus ANSI escape code
 */
export function stripAnsi(str) {
  if (typeof str !== "string") str = String(str ?? "");
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");
}

/**
 * Menghitung lebar visual string
 */
export function getVisualWidth(str) {
  const clean = stripAnsi(str);
  let width = 0;
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    // Karakter CJK atau fullwidth
    if (
      (code >= 0x1100 && code <= 0x115f) ||
      (code >= 0x2e80 && code <= 0xa4cf) ||
      (code >= 0xac00 && code <= 0xd7a3) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xfe10 && code <= 0xfe19) ||
      (code >= 0xfe30 && code <= 0xfe6f) ||
      (code >= 0xff00 && code <= 0xff60) ||
      (code >= 0xffe0 && code <= 0xffe6)
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/**
 * Padding teks presisi
 */
export function pad(text, targetWidth, align = "left") {
  const visualLen = getVisualWidth(text);
  const diff = targetWidth - visualLen;
  if (diff <= 0) return text;

  if (align === "right") {
    return " ".repeat(diff) + text;
  }
  if (align === "center") {
    const leftPad = Math.floor(diff / 2);
    const rightPad = diff - leftPad;
    return " ".repeat(leftPad) + text + " ".repeat(rightPad);
  }
  return text + " ".repeat(diff);
}

// Konfigurasi Kolom Standar yang Pas di Terminal (Lebar Total: 75 karakter)
export const TABLE_COLUMNS = [
  { key: "no", label: "No", width: 4, align: "center" },
  { key: "account", label: "Akun / Username", width: 20, align: "left" },
  { key: "status", label: "Status Check-in", width: 18, align: "left" },
  { key: "reward", label: "Reward", width: 8, align: "center" },
  { key: "streak", label: "Hari/Strk", width: 11, align: "center" },
];

const TOTAL_INNER_WIDTH = 73; // 4+2 + 20+2 + 18+2 + 8+2 + 11+2 + 4 pembatas = 73

/**
 * Cetak Header Banner dengan lebar presisi 75
 */
export function printBanner(title, subtitle = "") {
  const top = `┌${"─".repeat(TOTAL_INNER_WIDTH)}┐`;
  const mid = `├${"─".repeat(TOTAL_INNER_WIDTH)}┤`;
  const btm = `└${"─".repeat(TOTAL_INNER_WIDTH)}┘`;

  console.log(`\n${colors.cyan}${top}${colors.reset}`);
  const titleText = `${colors.bold}${colors.brightWhite}${title}${colors.reset}`;
  console.log(
    `${colors.cyan}│${colors.reset}${pad(titleText, TOTAL_INNER_WIDTH, "center")}${colors.cyan}│${colors.reset}`
  );

  if (subtitle) {
    console.log(`${colors.cyan}${mid}${colors.reset}`);
    const subText = `${colors.gray}${subtitle}${colors.reset}`;
    console.log(
      `${colors.cyan}│${colors.reset}${pad(subText, TOTAL_INNER_WIDTH, "center")}${colors.cyan}│${colors.reset}`
    );
  }

  console.log(`${colors.cyan}${btm}${colors.reset}\n`);
}

/**
 * Cetak Bagian Atas Tabel (Header)
 */
export function printTableHeader() {
  const topBorder = `┌${TABLE_COLUMNS.map((c) => "─".repeat(c.width + 2)).join("┬")}┐`;
  const sepBorder = `├${TABLE_COLUMNS.map((c) => "─".repeat(c.width + 2)).join("┼")}┤`;

  console.log(`${colors.cyan}${topBorder}${colors.reset}`);
  const headerContent = TABLE_COLUMNS.map((c) => {
    const text = `${colors.bold}${colors.brightWhite}${c.label}${colors.reset}`;
    return ` ${pad(text, c.width, c.align)} `;
  }).join(`${colors.cyan}│${colors.reset}`);

  console.log(`${colors.cyan}│${colors.reset}${headerContent}${colors.cyan}│${colors.reset}`);
  console.log(`${colors.cyan}${sepBorder}${colors.reset}`);
}

/**
 * Cetak Satu Baris Tabel secara Live
 */
export function printTableRow(row) {
  const rowContent = TABLE_COLUMNS.map((c) => {
    let val = row[c.key] !== undefined ? String(row[c.key]) : "-";
    // Potong jika terlalu panjang agar border tetap presisi
    if (getVisualWidth(val) > c.width) {
      val = val.substring(0, c.width - 2) + "..";
    }
    return ` ${pad(val, c.width, c.align)} `;
  }).join(`${colors.cyan}│${colors.reset}`);

  console.log(`${colors.cyan}│${colors.reset}${rowContent}${colors.cyan}│${colors.reset}`);
}

/**
 * Cetak Garis Penutup Tabel
 */
export function printTableFooter() {
  const btmBorder = `└${TABLE_COLUMNS.map((c) => "─".repeat(c.width + 2)).join("┴")}┘`;
  console.log(`${colors.cyan}${btmBorder}${colors.reset}`);
}

/**
 * Cetak Kotak Ringkasan Statistik dengan Kolon Sejajar & Presisi Rapi
 */
export function printSummaryBox(title, stats = []) {
  const top = `┌${"─".repeat(TOTAL_INNER_WIDTH)}┐`;
  const mid = `├${"─".repeat(TOTAL_INNER_WIDTH)}┤`;
  const btm = `└${"─".repeat(TOTAL_INNER_WIDTH)}┘`;

  console.log(`\n${colors.cyan}${top}${colors.reset}`);
  const titleText = `${colors.bold}${colors.brightWhite}${title}${colors.reset}`;
  console.log(
    `${colors.cyan}│${colors.reset}   ${pad(titleText, TOTAL_INNER_WIDTH - 3, "left")}${colors.cyan}│${colors.reset}`
  );
  console.log(`${colors.cyan}${mid}${colors.reset}`);

  // Lebar kolom label tetap agar titik dua sejajar lurus
  const LABEL_WIDTH = 32;

  for (const item of stats) {
    const icon = item.icon || "•";
    const labelRaw = `${icon} ${item.label}`;
    const coloredLabel = `${item.color || colors.white}${icon} ${item.label}${colors.reset}`;
    
    // Padding label agar colon selalu di posisi yang sama
    const labelPad = Math.max(0, LABEL_WIDTH - getVisualWidth(labelRaw));
    const labelSection = `   ${coloredLabel}${" ".repeat(labelPad)} : `;

    // Nilai angka rapi
    const valRaw = `${String(item.value).padStart(2, " ")} akun`;
    const coloredVal = `${colors.bold}${String(item.value).padStart(2, " ")}${colors.reset} akun`;

    // Hitung sisa spasi sampai border kanan (TOTAL_INNER_WIDTH = 73)
    // 3 (indent) + LABEL_WIDTH (32) + 3 (" : ") + 7 (valRaw) = 45
    const usedWidth = 3 + LABEL_WIDTH + 3 + getVisualWidth(valRaw);
    const rightSpaces = Math.max(0, TOTAL_INNER_WIDTH - usedWidth);

    console.log(
      `${colors.cyan}│${colors.reset}${labelSection}${coloredVal}${" ".repeat(rightSpaces)}${colors.cyan}│${colors.reset}`
    );
  }

  console.log(`${colors.cyan}${btm}${colors.reset}\n`);
}
