# Rename / move folder

PATCH `/user-api/alfresco/folders/:id`

Headers: `Authorization: Bearer <token>`, `Content-Type: application/json`.

Rename:
```json
{ "name": "New folder name" }
```

Move:
```json
{ "targetFolderPath": "/Sites/tg-saving/documentLibrary/Archive" }
```

Send exactly one operation per request. Response 200 contains `id`, `action`,
`previousPath` and updated `folder`. Alfresco remains responsible for final
permission checks and name collisions. Source CMIS actions must allow
canUpdateProperties (rename) or canMoveObject (move). Moving to self, descendants,
or the current parent is rejected. Site/library roots are protected.

Implementation reuses CMIS cmisaction=update (cmis:name) or cmisaction=move.
Audit actions RENAME_FOLDER and MOVE_FOLDER record source path and result.
If a network error occurs, refresh before retrying: the mutation may have completed.

Frontend: select a folder and open its three-dot toolbar menu. Only actions
allowed by the returned permissions are visible. Move destinations come from
the currently loaded folder tree. Refresh folders to load updated destinations.
