const axios = require("axios");
const config = require("../../config/env");
const { createAlfrescoAuthHeader } = require("../../utils/authHeader");

async function validateAlfrescoLogin(username, password) {
  await axios.get(`${config.alfrescoCmis}/root`, {
    headers: createAlfrescoAuthHeader(username, password),
    params: { cmisselector: "object" },
  });
}

module.exports = {
  validateAlfrescoLogin,
};
