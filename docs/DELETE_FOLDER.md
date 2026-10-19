# Delete folder

`DELETE /user-api/alfresco/folders/:id` with `Authorization: Bearer <accessToken>`.
The default deletes only empty folders; non-empty folders return HTTP 409.

To explicitly delete all descendants and all document versions:

```http
DELETE /user-api/alfresco/folders/FOLDER_ID?recursive=true
Authorization: Bearer <accessToken>
Content-Type: application/json

{ "confirmName": "Finance" }
```

`confirmName` must exactly match the current Alfresco folder name. A mismatch or
invalid recursive flag returns 400. Missing permission returns 403. Repository,
site and documentLibrary roots are protected. Permission checks use the current
user's CMIS actions: canDeleteObject for empty folders, canDeleteTree for trees.
Alfresco checks permissions for descendants during deletion.

Backend calls CMIS Browser Binding POST /root with objectId and cmisaction=delete
or deleteTree. deleteTree uses allVersions=true, unfileObjects=delete and
continueOnFailure=true. This can affect documents filed in multiple folders.
Deletion is not atomic and does not roll back completed deletions.

HTTP 200: { id, name, folderPath, recursive, deleted: true, partial: false, failedToDelete: [] }.
HTTP 207: deleted=false, partial=true, failedToDelete lists IDs that remain.
Partial means not fully completed; it does not guarantee any object was deleted.
On network error or unexpected response, the outcome is uncertain: refresh before
retrying. No automatic retry is performed. Recovery depends on repository behavior;
this API does not promise undo or trash restoration.

Audit actions: DELETE_FOLDER / DELETE_FOLDER_TREE with SUCCESS, PARTIAL or FAILED.
Successful/partial events include the original folder path and failed IDs when present.

Frontend Alfresco: select a folder, open the toolbar's ellipsis menu, choose delete.
Recursive deletion requires the checkbox and exact typed folder name. Controls are
disabled while pending, and the folder list refreshes on success, partial or error.

Reference: https://docs.oasis-open.org/cmis/CMIS/v1.1/errata01/os/CMIS-v1.1-errata01-os-complete.html
