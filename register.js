import fs from "node:fs/promises";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { getCaptcha, register, login, checkIn } from "./api.js";
import { colors, printBanner } from "./ui.js";

const ACCOUNTS_FILE = "./accounts.json";

/**
 * Menyimpan base64 image captcha ke captcha.png
 */
async function saveCaptchaImage(base64Data) {
  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");
  await fs.writeFile("captcha.png", Buffer.from(base64Image, "base64"));
}

async function main() {
  console.clear();
  const rl = readline.createInterface({ input, output });

  let accounts = [];
  try {
    const raw = await fs.readFile(ACCOUNTS_FILE, "utf-8");
    accounts = JSON.parse(raw);
  } catch (err) {
    accounts = [];
  }

  // Cari akun yang belum terdaftar (registered: false)
  const pendingAccounts = accounts.filter((acc) => !acc.registered);

  printBanner(
    "LAKEENERGY REGISTRATION WIZARD",
    `Total Akun: ${accounts.length}   •   Antrean Registrasi: ${pendingAccounts.length}`
  );

  if (pendingAccounts.length === 0) {
    console.log(`${colors.green}✔ Semua akun di accounts.json sudah terdaftar.${colors.reset}\n`);
    const answer = await rl.question("Apakah ingin mendaftarkan email baru secara manual? (y/n): ");
    if (answer.toLowerCase() !== "y") {
      rl.close();
      return;
    }

    const email = await rl.question(`${colors.cyan}Masukkan Email: ${colors.reset}`);
    const defaultUsername = email.split("@")[0];
    const usernameInput = await rl.question(
      `${colors.cyan}Masukkan Username [default: ${defaultUsername}]: ${colors.reset}`
    );
    const username = usernameInput.trim() || defaultUsername;
    const password = await rl.question(`${colors.cyan}Masukkan Password: ${colors.reset}`);
    const inviteCodeInput = await rl.question(
      `${colors.cyan}Masukkan Invite Code: ${colors.reset}`
    );
    const invite_code = inviteCodeInput.trim();

    const newAcc = {
      email,
      username,
      password,
      fund_password: password,
      invite_code,
      registered: false,
    };
    pendingAccounts.push(newAcc);
    accounts.push(newAcc);
    await fs.writeFile(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));
  }

  for (let i = 0; i < pendingAccounts.length; i++) {
    const acc = pendingAccounts[i];
    const username = acc.username || acc.email.split("@")[0];
    const num = String(i + 1).padStart(2, "0");
    const tot = String(pendingAccounts.length).padStart(2, "0");

    console.log(
      `\n${colors.cyan}┌── ${colors.bold}${colors.brightWhite}[${num}/${tot}] PROSES AKUN: ${acc.email} (${username})${colors.reset} ${colors.cyan}${"─".repeat(20)}┐${colors.reset}`
    );

    let registeredSuccessfully = false;
    let attempt = 0;

    while (!registeredSuccessfully && attempt < 3) {
      attempt++;
      process.stdout.write(`  ${colors.gray}• Mengambil captcha dari server...${colors.reset} `);
      const captchaRes = await getCaptcha();

      if (!captchaRes?.success) {
        console.log(`\n  ${colors.red}✗ Gagal mengambil captcha: ${captchaRes?.message}${colors.reset}`);
        break;
      }

      await saveCaptchaImage(captchaRes.data.img);
      console.log(`${colors.green}OK!${colors.reset}`);
      console.log(
        `  ${colors.yellow}👉 Silakan buka file '${colors.bold}captcha.png${colors.reset}${colors.yellow}' untuk melihat 4 huruf captcha.${colors.reset}`
      );

      const captchaCode = await rl.question(`  ${colors.brightCyan}⌨  Ketik 4 karakter captcha: ${colors.reset}`);

      const regPayload = {
        email: acc.email,
        username,
        password: acc.password,
        fund_password: acc.fund_password || acc.password,
        invite_code: acc.invite_code || "",
        captcha: captchaCode.trim(),
        captcha_key: captchaRes.data.key,
      };

      process.stdout.write(`  ${colors.gray}• Mengirim data pendaftaran...${colors.reset} `);
      const regRes = await register(regPayload);

      if (regRes?.success) {
        console.log(`${colors.brightGreen}BERHASIL!${colors.reset}`);
        acc.registered = true;
        registeredSuccessfully = true;

        // Simpan status ke accounts.json
        await fs.writeFile(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2));

        // Auto login & check-in pertama
        process.stdout.write(`  ${colors.gray}• Melakukan auto check-in perdana...${colors.reset} `);
        try {
          const loginRes = await login(username, acc.password);
          const token = loginRes?.data?.token;
          if (token) {
            const checkinRes = await checkIn(token);
            if (checkinRes?.success) {
              console.log(`${colors.brightGreen}Check-in Sukses! (+${checkinRes.data?.reward ?? "-"} reward)${colors.reset}`);
            } else {
              console.log(`${colors.yellow}${checkinRes?.message || "Selesai"}${colors.reset}`);
            }
          } else {
            console.log(`${colors.yellow}Gagal ambil token login.${colors.reset}`);
          }
        } catch (e) {
          console.log(`${colors.red}Error: ${e.message}${colors.reset}`);
        }
      } else {
        console.log(`${colors.red}GAGAL!${colors.reset}`);
        console.log(`  ${colors.red}✗ Pesan: ${regRes?.message || "Captcha salah atau data invalid"}${colors.reset}`);

        if (attempt < 3) {
          const retry = await rl.question(`  ${colors.gray}Coba lagi untuk akun ini? (y/n) [default: y]: ${colors.reset}`);
          if (retry.toLowerCase() === "n") break;
        }
      }
    }

    console.log(`${colors.cyan}└${"─".repeat(60)}┘${colors.reset}`);
  }

  rl.close();
  console.log(`\n${colors.brightGreen}✔ Selesai proses registrasi.${colors.reset}\n`);
}

main();
