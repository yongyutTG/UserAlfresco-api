function getBearerToken(req) {
  const authorization = req.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");
  return scheme === "Bearer" ? token : null;
}

module.exports = {
  getBearerToken,
};
