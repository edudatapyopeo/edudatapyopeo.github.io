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
    const account = document.createElement("p");
    account.className = "truncate px-2 text-xs text-slate-400";
    account.textContent = user.email || "เจ้าหน้าที่";
    const actions = document.createElement("div");
    actions.className = "mt-3 grid grid-cols-2 gap-2";
    const adminLink = document.createElement("a");
    adminLink.href = "../admin/index.html";
    adminLink.className = "focus-ring rounded-lg bg-pyo-700 px-3 py-2 text-center text-xs font-semibold text-white";
    adminLink.textContent = "จัดการข้อมูล";
    const signOut = document.createElement("button");
    signOut.type = "button";
    signOut.className = "focus-ring rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold";
    signOut.textContent = "ออกจากระบบ";
    signOut.addEventListener("click", async () => {
      await signOutUser();
      window.location.reload();
    });
    actions.append(adminLink, signOut);
    footer.append(account, actions);
  });
}
