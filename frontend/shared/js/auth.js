function authHeaders(token = getStoredToken()) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function redirectToLogin() {
  const currentPage = `${window.location.pathname}${window.location.search}`;
  window.location.replace(`/login/?redirect=${encodeURIComponent(currentPage)}`);
}
