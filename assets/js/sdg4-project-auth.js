const uploadButton = document.getElementById("projectUploadButton");
const config = window.PYOEDU_CONFIG?.firebase;
const configured = Boolean(config && ["apiKey", "authDomain", "projectId", "appId"].every(field => String(config[field] || "").trim()));

if (uploadButton && configured) {
  const { observeAuth } = await import("./auth-client.js");
  observeAuth(user => {
    uploadButton.hidden = !(user && user.emailVerified);
  });
}
