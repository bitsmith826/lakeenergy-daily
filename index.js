import fs from "node:fs/promises";
import { login, checkIn } from "./api.js";
import {
  colors,
  printBanner,
  printTableHeader,
  printTableRow,
  printTableFooter,
  printSummaryBox,
} from "./ui.js";

const ACCOUNTS_FILE = "./accounts.json";

// Utility jeda
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadAccounts() {
  try {
    const raw = await fs.readFile(ACCOUNTS_FILE, "utf-8");
    const list = JSON.parse(raw);
    if (Array.isArray(list)) return list;
  } catch (err) {}
  return [];
}

async function saveAccounts(accounts) {
  try {
    await fs.writeFile(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
  } catch (err) {
    // Gagal menyimpan tidak menghentikan proses
  }
}

/**
 * Cek apakah respon merupakan rate limit dari server
 */
function isRateLimited(res) {
  if (!res) return false;
  if (res.httpStatus === 429) return true;
  const msg = String(res.message || "").toLowerCase();
  return msg.includes("too many") || msg.includes("throttle") || msg.includes("rate limit");
}

async function processAccount(account, index, accounts) {
  const username = account.username || account.email || "Unknown";
  const num = String(index + 1).padStart(2, "0");

  // Jika akun belum terdaftar
  if (account.registered === false) {
    return {
      no: num,
      account: username,
      statusRaw: "UNREGISTERED",
      status: `${colors.yellow}Belum Terdaftar${colors.reset}`,
      reward: "-",
      streak: "-",
    };
  }

  let token = account.token;
  let maxAttempts = 2; // Maksimal 2 kali percobaan jika terkena rate limit

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // 1. Dapatkan Token (Gunakan token tersimpan, jika belum ada baru login)
    if (!token) {
      const loginRes = await login(username, account.password);

      if (isRateLimited(loginRes)) {
        if (attempt < maxAttempts) {
          // Tunggu cooldown rate limit 15 detik
          await sleep(15000);
          continue;
        }
        return {
          no: num,
          account: username,
          statusRaw: "RATE_LIMIT",
          status: `${colors.yellow}Rate Limited (429)${colors.reset}`,
          reward: "-",
          streak: "-",
        };
      }

      if (!loginRes?.success) {
        const errMsg = loginRes?.message || "Login Gagal";
        const shortErr = errMsg.length > 16 ? errMsg.substring(0, 14) + ".." : errMsg;
        return {
          no: num,
          account: username,
          statusRaw: "LOGIN_FAILED",
          status: `${colors.red}${shortErr}${colors.reset}`,
          reward: "-",
          streak: "-",
        };
      }

      token = loginRes?.data?.token;
      // Simpan token ke file agar request berikutnya tidak perlu login ulang
      if (token) {
        account.token = token;
        await saveAccounts(accounts);
      }
    }

    // 2. Lakukan Daily Check-in
    const checkinRes = await checkIn(token);

    // Jika token lama ternyata sudah expired / unauthorized, hapus token dan ulangi dengan login
    if (checkinRes?.httpStatus === 401 || String(checkinRes?.message).toLowerCase().includes("unauthenticated")) {
      account.token = null;
      token = null;
      await saveAccounts(accounts);
      continue;
    }

    // Jika terkena rate limit pada endpoint check-in
    if (isRateLimited(checkinRes)) {
      if (attempt < maxAttempts) {
        await sleep(15000);
        continue;
      }
      return {
        no: num,
        account: username,
        statusRaw: "RATE_LIMIT",
        status: `${colors.yellow}Rate Limited (429)${colors.reset}`,
        reward: "-",
        streak: "-",
      };
    }

    // Berhasil Check-in
    if (checkinRes?.success) {
      const reward = `+${checkinRes.data?.reward ?? "0.5"}`;
      const totalDays = checkinRes.data?.total_days ?? "-";
      const streak = checkinRes.data?.consecutive ?? "-";

      return {
        no: num,
        account: username,
        statusRaw: "SUCCESS",
        status: `${colors.brightGreen}Sukses${colors.reset}`,
        reward: `${colors.brightGreen}${reward}${colors.reset}`,
        streak: `${totalDays}d / ${streak}s`,
      };
    } else {
      const msg = checkinRes?.message || "Gagal";
      const isAlready = msg.toLowerCase().includes("already");
      const statusText = isAlready
        ? `${colors.brightCyan}Sudah Check-in${colors.reset}`
        : `${colors.yellow}${msg.length > 16 ? msg.substring(0, 14) + ".." : msg}${colors.reset}`;

      return {
        no: num,
        account: username,
        statusRaw: isAlready ? "ALREADY" : "FAILED",
        status: statusText,
        reward: "-",
        streak: "-",
      };
    }
  }

  return {
    no: num,
    account: username,
    statusRaw: "ERROR",
    status: `${colors.red}Gagal Diproses${colors.reset}`,
    reward: "-",
    streak: "-",
  };
}

async function main() {
  console.clear();

  const accounts = await loadAccounts();
  const registeredCount = accounts.filter((a) => a.registered).length;
  const pendingCount = accounts.length - registeredCount;

  printBanner(
    "LAKEENERGY MULTI-ACCOUNT CHECK-IN",
    `Total Akun: ${accounts.length}   •   Terdaftar: ${registeredCount}   •   Antrean Baru: ${pendingCount}`
  );

  if (accounts.length === 0) {
    console.log(`${colors.red}❌ Tidak ada data akun di 'accounts.json'.${colors.reset}\n`);
    process.exit(1);
  }

  // Cetak Header Tabel
  printTableHeader();

  const results = [];

  for (let i = 0; i < accounts.length; i++) {
    const acc = accounts[i];
    const res = await processAccount(acc, i, accounts);
    results.push(res);

    // Cetak baris data langsung ke tabel secara live
    printTableRow(res);

    // Jeda aman antar akun (3.5 detik untuk menghindari rate limit)
    const nextAcc = accounts[i + 1];
    if (acc.registered && nextAcc && nextAcc.registered) {
      await sleep(3500);
    }
  }

  // Cetak Penutup Tabel
  printTableFooter();

  // Statistik Akhir
  const successCount = results.filter((r) => r.statusRaw === "SUCCESS").length;
  const alreadyCount = results.filter((r) => r.statusRaw === "ALREADY").length;
  const unregCount = results.filter((r) => r.statusRaw === "UNREGISTERED").length;
  const rateLimitCount = results.filter((r) => r.statusRaw === "RATE_LIMIT").length;
  const failCount = results.filter((r) => ["LOGIN_FAILED", "FAILED", "ERROR"].includes(r.statusRaw)).length;

  printSummaryBox("STATISTIK EKSEKUSI", [
    { label: "Check-in Sukses Hari Ini", value: successCount, color: colors.brightGreen, icon: "[+]" },
    { label: "Sudah Check-in Sebelumnya", value: alreadyCount, color: colors.brightCyan, icon: "[i]" },
    { label: "Belum Terdaftar (Antrean)", value: unregCount, color: colors.yellow, icon: "[!]" },
    { label: "Terkena Limit (Rate Limit)", value: rateLimitCount, color: colors.yellow, icon: "[~]" },
    { label: "Gagal / Error", value: failCount, color: colors.red, icon: "[-]" },
  ]);
}

main();
