# Object permissions

```http
GET /user-api/alfresco/permissions?id=OBJECT_ID
Authorization: Bearer <accessToken>
```

`id` is required: the CMIS object ID of a document or folder. For a versioned ID,
use Postman Params or URLSearchParams, e.g. `id=uuid%3B1.0`. No request body.
The existing Bearer session middleware and shared API rate limiter apply.

HTTP 200 (Cache-Control: no-store), example:

```json
{
  "id": "folder-id",
  "name": "Finance",
  "type": "cmis:folder",
  "permissions": {
    "canCreateFolder": true,
    "canUpload": true,
    "canDownload": false,
    "canView": false,
    "canRename": true,
    "canMove": true,
    "canEditProperties": false,
    "canDelete": false,
    "canDeleteTree": false,
    "canUpdateContent": false
  }
}
```

Permissions reuse the same mapper as list/search. canCreateFolder is derived from
CMIS canCreateFolder; canUpload from canCreateDocument, both for folders only.
The existing canView flag indicates a returned document, not folder visibility.
canEditProperties currently applies to documents; folder rename uses canRename.
Missing allowable actions default to false, not an affirmative permission grant.

Internally: GET CMIS /root?cmisselector=object&objectId=...&includeAllowableActions=true
with the logged-in user's Basic credentials from the backend session. No permission
cache is used. This endpoint reads permissions; it does not change permissions.

Missing/invalid id: 400. Missing/expired token: 401. Alfresco errors preserve their
HTTP status (e.g. 403 or 404); forbidden or missing objects are not converted into
a successful response with all permissions false. Some repositories hide forbidden
objects behind 404. Other upstream failures use the standard API error handler.

Use flags to show/disable frontend actions. They describe Alfresco allowable
actions, not a guarantee an operation will succeed: destination permissions,
name conflicts, protected API roots and subsequent permission changes still apply.
Mutation endpoints must continue validating operations independently.
