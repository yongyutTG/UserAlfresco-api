const axios = require("axios");
const config = require("../../config/env");
const { createAlfrescoAuthHeader } = require("../../utils/authHeader");

//ฟังชันตรวจสอบการล็อกอินของผู้ใช้ใน Alfresco โดยส่งคำขอ GET ไปยัง Alfresco CMIS API ด้วยข้อมูลผู้ใช้และรหัสผ่านที่ให้มา
async function validateAlfrescoLogin(username, password) {
  //ส่งคำขอ GET ไปยัง Alfresco CMIS API เพื่อดึงข้อมูล root folder ของผู้ใช้ โดยใช้ header การตรวจสอบสิทธิ์ที่สร้างจาก username และ password
  await axios.get(`${config.alfrescoCmis}/root`, {
    headers: createAlfrescoAuthHeader(username, password),
    params: { cmisselector: "object" },
  });
}

function pickListEntries(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.list?.entries)) return payload.list.entries.map((item) => item.entry || item);
  if (Array.isArray(payload?.entries)) return payload.entries.map((item) => item.entry || item);
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.groups)) return payload.groups;
  return [];
}

function normalizeGroup(group) {
  const source = group.entry || group;
  return {
    id: source.id || source.shortName || source.fullName || source.displayName || null,
    displayName: source.displayName || source.fullName || source.shortName || source.id || null,
    isRoot: source.isRoot ?? null,
    raw: source,
  };
}

async function getCurrentUserPermissions(username, authHeaders) {
  const encodedUsername = encodeURIComponent(username);
  const restBaseUrl = `${config.alfrescoHost}/alfresco/api/-default-/public/alfresco/versions/1`;
  const result = {
    username,
    person: null,
    groups: [],
    authorities: [],
    capabilities: {
      canLogin: true,
      canBrowseByUserPermission: true,
    },
    source: {
      person: null,
      groups: null,
    },
  };

  try {
    const personResponse = await axios.get(`${restBaseUrl}/people/${encodedUsername}`, {
      headers: authHeaders,
      timeout: config.alfrescoRequestTimeoutMs,
    });
    result.person = personResponse.data?.entry || personResponse.data || null;
    result.source.person = "alfresco-rest-people";
  } catch (error) {
    result.source.person = "unavailable";
  }

  const groupEndpoints = [
    `${restBaseUrl}/people/${encodedUsername}/groups`,
    `${restBaseUrl}/people/${encodedUsername}/groups?include=parentIds`,
  ];

  for (const endpoint of groupEndpoints) {
    try {
      const groupResponse = await axios.get(endpoint, {
        headers: authHeaders,
        timeout: config.alfrescoRequestTimeoutMs,
      });
      const groups = pickListEntries(groupResponse.data).map(normalizeGroup);
      result.groups = groups;
      result.authorities = groups.map((group) => group.id).filter(Boolean);
      result.source.groups = "alfresco-rest-people-groups";
      break;
    } catch (error) {
      result.source.groups = "unavailable";
    }
  }

  return result;
}

module.exports = {
  getCurrentUserPermissions,
  validateAlfrescoLogin,
};

