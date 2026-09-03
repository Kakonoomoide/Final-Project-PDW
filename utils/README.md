# utils/

- `response.js` — `sendResponse(res, { code, success, message, data })`,
  dipakai **semua** controller biar bentuk response API konsisten.

Bentuk response-nya selalu:

```json
{ "code": 200, "success": true, "message": "", "data": null }
```

Karena `success` selalu ada, kode di browser bisa seragam:

```js
const result = await res.json();
if (!result.success) throw new Error(result.message);
```

`message` diisi kalimat yang **langsung bisa ditampilkan ke user** —
bukan pesan teknis. Kalau error aslinya teknis, terjemahkan dulu di
controller.
