const guard = document.getElementById("adminGuard");
const guardTitle = document.getElementById("adminGuardTitle");
const guardMessage = document.getElementById("adminGuardMessage");
const guardAction = document.getElementById("adminGuardAction");
const email = document.getElementById("adminAccountEmail");
const verification = document.getElementById("adminAccountVerification");
const reset = document.getElementById("adminResetPassword");
const signOut = document.getElementById("adminSignOut");
const accountMessage = document.getElementById("adminAccountMessage");
const firebaseConfig = window.PYOEDU_CONFIG?.firebase;
const configured = Boolean(firebaseConfig && ["apiKey", "authDomain", "projectId", "appId"].every(field => String(firebaseConfig[field] || "").trim()));
const authApi = configured ? await import("./auth-client.js") : null;

function loginUrl() {
  const url = new URL("login.html", window.location.href);
  url.searchParams.set("returnTo", window.location.href);
  return url.href;
}

function block(title, detail) {
  guard.hidden = false;
  guardTitle.textContent = title;
  guardMessage.textContent = detail;
  guardAction.href = loginUrl();
  guardAction.classList.remove("hidden");
  guardAction.classList.add("inline-block");
}

if (!configured) {
  block("ยังไม่ได้ตั้งค่า Firebase", "กรุณากำหนด Firebase Web configuration ก่อนเปิดใช้ส่วนเจ้าหน้าที่");
} else {
  authApi.observeAuth(user => {
    if (!user) {
      window.location.replace(loginUrl());
      return;
    }
    if (!user.emailVerified) {
      block("บัญชียังไม่ได้ยืนยันอีเมล", "กรุณายืนยันอีเมลและเข้าสู่ระบบใหม่");
      return;
    }
    email.textContent = user.email || "ไม่มีข้อมูล";
    verification.textContent = "ยืนยันอีเมลแล้ว";
    verification.className = "mt-1 text-sm text-emerald-700";
    guard.hidden = true;
  });
}

reset.addEventListener("click", async () => {
  const address = email.textContent.trim();
  if (!address || address === "กำลังโหลด…") return;
  reset.disabled = true;
  try {
    await authApi.sendReset(address);
    accountMessage.textContent = "ส่งอีเมลเปลี่ยนรหัสผ่านแล้ว";
    accountMessage.className = "mt-4 text-sm text-emerald-700";
  } catch (error) {
    console.error("Password reset failed", error.code || error.message);
    accountMessage.textContent = "ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่";
    accountMessage.className = "mt-4 text-sm text-rose-700";
  } finally {
    reset.disabled = false;
  }
});

signOut.addEventListener("click", async () => {
  await authApi.signOutUser();
  window.location.replace("../dashboards/basic.html");
});
