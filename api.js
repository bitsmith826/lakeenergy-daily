const BASE_URL = "https://v1.lakeenergy.com";

const DEFAULT_HEADERS = {
  "accept": "application/json",
  "accept-language": "en",
  "origin": "https://lakeenergy.com",
  "referer": "https://lakeenergy.com/",
  "sec-ch-ua": '"Google Chrome";v="153", "Not_A Brand";v="8", "Chromium";v="153"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36",
  "x-lang": "en",
};

/**
 * 1. Ambil Captcha
 */
export async function getCaptcha() {
  const url = `${BASE_URL}/api/captcha`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: DEFAULT_HEADERS,
    });
    const data = await res.json();
    return { httpStatus: res.status, ...data };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * 2. Login Member untuk mendapatkan Bearer Token
 */
export async function login(account, password) {
  const url = `${BASE_URL}/api/member/login`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...DEFAULT_HEADERS,
        "content-type": "application/json",
        "dnt": "1",
      },
      body: JSON.stringify({ account, password }),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = { success: false, message: res.statusText || `HTTP ${res.status}` };
    }

    return { httpStatus: res.status, ...data };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * 3. Daily Check-in menggunakan Token Bearer
 */
export async function checkIn(token) {
  const authHeader = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  const url = `${BASE_URL}/api/member/checkin`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...DEFAULT_HEADERS,
        "authorization": authHeader,
        "dnt": "1",
        "content-length": "0",
      },
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = { success: false, message: res.statusText || `HTTP ${res.status}` };
    }

    return { httpStatus: res.status, ...data };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

/**
 * 4. Register Akun Baru
 */
export async function register(userData) {
  const url = `${BASE_URL}/api/member/register`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        ...DEFAULT_HEADERS,
        "content-type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      data = { success: false, message: res.statusText || `HTTP ${res.status}` };
    }

    return { httpStatus: res.status, ...data };
  } catch (err) {
    return { success: false, message: err.message };
  }
}
