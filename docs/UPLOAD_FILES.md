# Upload one or multiple files

## Frontend batching

The Alfresco frontend allows up to 100 selected files, sent sequentially using
the single-file endpoint with folderPath and file fields. This allows actual
per-file completion feedback. The bulk API remains available with its unchanged
20-file limit. Progress counts completed files.
Retry only confirmed failures; never resend successful or uncertain results
automatically. Inspect the destination after network/server failures before
selecting those files again. Each batch carries the same user Bearer token.

Both endpoints require `Authorization: Bearer <accessToken>`.
Select Body -> form-data in Postman. Do not manually set Content-Type: Postman
or the browser must supply the multipart boundary.

## Single file

POST `/user-api/alfresco/documents`

| Key | Type | Value |
| --- | --- | --- |
| folderPath | Text | /Sites/tg-saving/documentLibrary/การเงิน |
| file | File | Choose one file |

Success: 201 with created, fileName, path, size, document, username and ok=true.
Failure: the relevant HTTP error status.
The existing binary-body upload with query folderPath and name remains supported
with its existing 100 MiB limit and response format.

## Multiple files

POST `/user-api/alfresco/documents/bulk-upload`

| Key | Type | Value |
| --- | --- | --- |
| folderPath | Text | /Sites/tg-saving/documentLibrary/การเงิน |
| files | File | Select multiple files or repeat this key |

Multipart limits: 20 files per batch, 25 MiB per file (one file for the single
endpoint). Destination is required and applies to all files. The parser stages
files on disk; only one file at a time is loaded for the Alfresco request.
Temporary files are cleaned on completion/error. Process crashes can leave files.

201: all files uploaded. 207: one or more file operations failed, even if all failed.
Response contains folderPath, success, failed, results, username. Each result has
index (zero based), fileName, ok, status and either created/document details or error.
Inspect results even when the HTTP response is 2xx. Successful files are not rolled
back. No automatic retry or overwrite is performed; duplicate names are errors.
Network timeouts can have uncertain outcomes; inspect the folder before retrying.

400: invalid body, missing fields, unexpected field. 413: file-size/file-count limit.
401: invalid session. 403: no upload permission. Bulk non-multipart body: 415.
The current user's canCreateDocument action is checked before multipart uploads;
Alfresco enforces access again for each createDocument operation.

Audit: UPLOAD_FILE per file and BULK_UPLOAD_FILES summary (SUCCESS/PARTIAL/FAILED).

```javascript
const form = new FormData();
form.append('folderPath', '/Sites/tg-saving/documentLibrary/การเงิน');
for (const file of fileInput.files) form.append('files', file);
const response = await fetch(`${apiBase}/user-api/alfresco/documents/bulk-upload`, {
  method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: form
});
const result = await response.json();
// Check response.ok and result.results for per-file errors.
```
