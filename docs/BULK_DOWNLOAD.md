# Bulk download

POST `/user-api/alfresco/documents/bulk-download`

Headers: `Authorization: Bearer <accessToken>` and `Content-Type: application/json`.

```json
{
  "documents": [
    { "id": "document-id-1;1.0", "name": "document-1.pdf" },
    { "id": "document-id-2;1.0", "name": "document-2.pdf" }
  ]
}
```

`id` is required; `name` is optional and defaults to the name in Alfresco.
Use real CMIS object IDs. Each array entry becomes one ZIP entry, including repeated IDs.
Names are sanitized and duplicate names receive a numbered suffix.

Success: HTTP 200, `Content-Type: application/zip`,
`Content-Disposition: attachment; filename="documents_20261016_143000.zip"`.
The timestamp uses Asia/Bangkok. A single requested file also returns ZIP.
In Postman use Save Response to File to save the binary response.

Limits: 1-100 documents, maximum total uncompressed content 500 MiB.
Invalid body returns 400; size limit returns 413. Permission denial returns 403;
Alfresco authentication/not-found errors preserve their HTTP status.

The API fetches every object's CMIS allowable actions using the current user's
credentials and requires `canGetContentStream`. It then downloads content with
the same credentials, so Alfresco checks access again. All files and the ZIP
are staged in a temporary directory before response headers are sent. Any failure
rejects the entire request, with no partial ZIP. Temporary files are removed after
success, failure or client disconnect; a process crash can leave temporary files.

Frontend list/search responses include `permissions.canDownload`. Disable the
download button unless every selected document has `canDownload === true`.
Send the JSON body with Bearer authentication, check response.ok, then save the
response Blob. Frontend checks do not replace backend authorization.

Audit: `BULK_DOWNLOAD_FILES` and per-file `DOWNLOAD_FILE` on successful response
completion; failed requests use `BULK_DOWNLOAD_FILES` with FAILED. Completion means
the server sent the response, not proof the user saved it to disk.
