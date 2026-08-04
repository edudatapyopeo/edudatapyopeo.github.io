const form = document.getElementById("loginForm");
const email = document.getElementById("loginEmail");
const password = document.getElementById("loginPassword");
const submit = document.getElementById("loginSubmit");
const forgot = document.getElementById("forgotPassword");
const resend = document.getElementById("resendVerification");
const showLogin = document.getElementById("showLogin");
const showRegister = document.getElementById("showRegister");
const registerForm = document.getElementById("registerForm");
const registerEmail = document.getElementById("registerEmail");
const registerPassword = document.getElementById("registerPassword");
const registerPasswordConfirm = document.getElementById("registerPasswordConfirm");
const registerSubmit = document.getElementById("registerSubmit");
const loginActions = document.getElementById("loginActions");
const accountHeading = document.getElementById("accountHeading");
const accountDescription = document.getElementById("accountDescription");
const message = document.getElementById("loginMessage");
const setupNotice = document.getElementById("firebaseSetupNotice");
const backLink = document.getElementById("backToDashboard");
const firebaseConfig = window.PYOEDU_CONFIG?.firebase;
const configured = Boolean(firebaseConfig && ["apiKey", "authDomain", "projectId", "appId"].every(field => String(firebaseConfig[field] || "").trim()));
const authApi = configured ? await import("./auth-client.js?v=20260804-1") : null;

function safeReturnUrl() {
  const fallback = new URL("../dashboards/basic.html", window.location.href);
  const requested = new URLSearchParams(window.location.search).get("returnTo");
  if (!requested) return fallback.href;
  try {
    const target = new URL(requested, window.location.href);
    if (target.origin !== window.location.origin || /\/admin\/login\.html$/i.test(target.pathname)) return fallback.href;
    return target.href;
  } catch (_) {
    return fallback.href;
  }
}

function showMessage(text, type = "error") {
  message.hidden = false;
  message.className = `mt-6 rounded-xl border p-4 text-sm ${type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`;
  message.textContent = text;
}

function setMode(mode) {
  const registering = mode === "register";
  form.hidden = registering;
  registerForm.hidden = !registering;
  loginActions.hidden = registering;
  showLogin.setAttribute("aria-selected", String(!registering));
  showRegister.setAttribute("aria-selected", String(registering));
  showLogin.className = `focus-ring rounded-lg px-4 py-2.5 text-sm font-semibold ${registering ? "text-slate-600" : "bg-white text-pyo-700 shadow-sm"}`;
  showRegister.className = `focus-ring rounded-lg px-4 py-2.5 text-sm font-semibold ${registering ? "bg-white text-pyo-700 shadow-sm" : "text-slate-600"}`;
  accountHeading.textContent = registering ? "สมัครสมาชิกเจ้าหน้าที่" : "เข้าสู่ระบบเจ้าหน้าที่";
  accountDescription.textContent = registering
    ? "สมัครด้วยอีเมลที่ใช้งานได้ แล้วกดลิงก์ยืนยันที่ได้รับทางอีเมล"
    : "ใช้บัญชีที่ยืนยันอีเมลแล้วและได้รับอนุญาตใน Apps Script";
  message.hidden = true;
}

const returnUrl = safeReturnUrl();
backLink.href = returnUrl;

if (!configured) {
  setupNotice.hidden = false;
  submit.disabled = true;
  forgot.disabled = true;
  resend.disabled = true;
  registerSubmit.disabled = true;
} else {
  authApi.observeAuth(user => {
    if (user?.emailVerified) window.location.replace(returnUrl);
  });
}

showLogin.addEventListener("click", () => setMode("login"));
showRegister.addEventListener("click", () => setMode("register"));

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!configured) return;
  submit.disabled = true;
  submit.textContent = "กำลังเข้าสู่ระบบ…";
  message.hidden = true;
  try {
    const credential = await authApi.signIn(email.value.trim(), password.value);
    if (!credential.user.emailVerified) {
      await authApi.signOutUser();
      showMessage("บัญชีนี้ยังไม่ได้ยืนยันอีเมล กรุณากด “ส่งอีเมลยืนยันอีกครั้ง” แล้วตรวจ Inbox และ Spam");
      return;
    }
    window.location.replace(returnUrl);
  } catch (error) {
    console.error("Sign-in failed", error.code || error.message);
    showMessage("ไม่สามารถเข้าสู่ระบบได้ กรุณาตรวจสอบอีเมล รหัสผ่าน และสิทธิ์ของบัญชี");
  } finally {
    submit.disabled = false;
    submit.textContent = "เข้าสู่ระบบ";
  }
});

registerForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!configured) return;
  if (registerPassword.value !== registerPasswordConfirm.value) {
    showMessage("รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน");
    registerPasswordConfirm.focus();
    return;
  }
  registerSubmit.disabled = true;
  registerSubmit.textContent = "กำลังสมัคร…";
  message.hidden = true;
  try {
    await authApi.register(registerEmail.value.trim(), registerPassword.value);
    await authApi.signOutUser();
    email.value = registerEmail.value.trim();
    registerForm.reset();
    setMode("login");
    showMessage("สมัครสำเร็จ ระบบส่งอีเมลยืนยันแล้ว กรุณาตรวจ Inbox และ Spam ก่อนเข้าสู่ระบบ", "success");
  } catch (error) {
    console.error("Registration failed", error.code || error.message);
    await authApi.signOutUser();
    if (error.code === "auth/email-already-in-use") {
      showMessage("อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบหรือส่งอีเมลยืนยันอีกครั้ง");
    } else if (error.code === "auth/weak-password") {
      showMessage("รหัสผ่านไม่เป็นไปตามข้อกำหนดความปลอดภัยของระบบ");
    } else {
      showMessage("ไม่สามารถสมัครสมาชิกได้ กรุณาตรวจสอบข้อมูลหรือลองใหม่ภายหลัง");
    }
  } finally {
    registerSubmit.disabled = false;
    registerSubmit.textContent = "สมัครสมาชิก";
  }
});

resend.addEventListener("click", async () => {
  const address = email.value.trim();
  if (!address || !password.value) {
    showMessage("กรุณากรอกอีเมลและรหัสผ่านของบัญชีก่อนส่งอีเมลยืนยัน");
    (address ? password : email).focus();
    return;
  }
  resend.disabled = true;
  try {
    const credential = await authApi.signIn(address, password.value);
    if (credential.user.emailVerified) {
      window.location.replace(returnUrl);
      return;
    }
    await authApi.sendVerification();
    await authApi.signOutUser();
    showMessage("ส่งอีเมลยืนยันแล้ว กรุณาตรวจ Inbox และ Spam", "success");
  } catch (error) {
    console.error("Email verification resend failed", error.code || error.message);
    await authApi.signOutUser();
    if (error.code === "auth/invalid-credential") {
      showMessage("อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบแล้วลองอีกครั้ง");
    } else if (error.code === "auth/too-many-requests") {
      showMessage("มีการส่งคำขอบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่");
    } else {
      showMessage("ไม่สามารถส่งอีเมลยืนยันได้ในขณะนี้ กรุณาลองใหม่ภายหลัง");
    }
  } finally {
    resend.disabled = false;
  }
});

forgot.addEventListener("click", async () => {
  const address = email.value.trim();
  if (!address) {
    showMessage("กรุณากรอกอีเมลก่อนขอเปลี่ยนรหัสผ่าน");
    email.focus();
    return;
  }
  forgot.disabled = true;
  try {
    await authApi.sendReset(address);
    showMessage("หากอีเมลนี้อยู่ในระบบ ระบบจะส่งลิงก์เปลี่ยนรหัสผ่านให้", "success");
  } catch (error) {
    console.error("Password reset failed", error.code || error.message);
    showMessage("ไม่สามารถส่งคำขอได้ในขณะนี้ กรุณาลองใหม่ภายหลัง");
  } finally {
    forgot.disabled = false;
  }
});
