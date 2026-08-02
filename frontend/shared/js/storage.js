const tokenKey = "alfrescoUserApiToken";
const usernameKey = "alfrescoUserApiUsername";

function getStoredToken() {
  return sessionStorage.getItem(tokenKey) || "";
}

function getStoredUsername() {
  return sessionStorage.getItem(usernameKey) || "";
}

function saveSession(token, username) {
  sessionStorage.setItem(tokenKey, token);
  sessionStorage.setItem(usernameKey, username);
}

function clearStoredSession() {
  sessionStorage.removeItem(tokenKey);
  sessionStorage.removeItem(usernameKey);
}
