# System info

```http
GET /user-api/system/info
Authorization: Bearer <accessToken>
```

No query parameters or request body. Uses the same in-memory user session and
shared per-IP API rate limiter as /user-api/alfresco. Missing, invalid, expired
or revoked tokens return 401; rate limiting returns 429.

HTTP 200 with `Cache-Control: no-store`:

```json
{
  "serverName": "ALFRESCO-PROD",
  "serverTime": "2026-10-19T14:35:00+07:00",
  "timezone": "Asia/Bangkok"
}
```

Set `SERVER_LABEL=ALFRESCO-PROD` in the API's environment and restart the process.
The default is UserAlfresco-api. PM2 environment changes require an environment
refresh when restarting. The name identifies this gateway, not the Alfresco host.

Time uses the API host clock in ISO 8601 with +07:00, independent of the host's
configured timezone. No Alfresco request is made. Keep the server clock synced.

Frontend consumers should call after login/on page entry and resync every 15-30
minutes. Advance the displayed clock locally between requests, clear the timer
on logout, and handle 401 with the existing session-expiry flow. This endpoint
does not itself install a frontend polling timer.
