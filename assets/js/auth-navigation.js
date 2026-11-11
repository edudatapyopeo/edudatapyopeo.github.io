const config = window.PYOEDU_CONFIG?.firebase;
const footer = document.querySelector("#siteSidebar > div:last-child");
const loginLink = footer?.querySelector('a[href*="admin/login"]');

if (loginLink) {
  const target = new URL("../admin/login.html", window.location.href);
  target.searchParams.set("returnTo", window.location.href);
  loginLink.href = target.href;
}

if (config && footer) {
  const { observeAuth, signOutUser } = await import("./auth-client.js");
  observeAuth(user => {
    if (!user?.emailVerified) return;
    footer.replaceChildren();
    footer.classList.add("auth-account-panel");
    const identity = document.createElement("div");
    identity.className = "auth-account-identity";
    const avatar = document.createElement("span");
    avatar.className = "auth-account-avatar";
    avatar.textContent = String(user.email || "ผู้").trim().charAt(0).toUpperCase();
    const accountCopy = document.createElement("div");
    accountCopy.className = "min-w-0";
    const status = document.createElement("p");
    status.className = "auth-account-status";
    status.textContent = "ลงชื่อเข้าใช้แล้ว";
    const account = document.createElement("p");
    account.className = "auth-account-email";
    account.textContent = user.email || "เจ้าหน้าที่";
    accountCopy.append(status, account);
    identity.append(avatar, accountCopy);
    const actions = document.createElement("div");
    actions.className = "auth-account-actions";
    const adminLink = document.createElement("a");
    adminLink.href = "../admin/index.html";
    adminLink.className = "focus-ring auth-account-manage";
    adminLink.textContent = "จัดการข้อมูล";
    const signOut = document.createElement("button");
    signOut.type = "button";
    signOut.className = "focus-ring auth-account-signout";
    signOut.textContent = "ออกจากระบบ";
    signOut.addEventListener("click", async () => {
      await signOutUser();
      window.location.reload();
    });
    actions.append(adminLink, signOut);
    footer.append(identity, actions);
  });
}
