# Batch 2 API contract reference

Read-only backend baseline: `truongnguyen3006/ecommerce-backend-1-`, `project1-recovery`, commit `58e825aa60baaff3bebfe46636e718a1331400d6`. This reference comes from controllers, DTOs, security, services and gateway configuration, rather than the historical frontend README.

## Transport and authentication

Next rewrites same-origin `/api/*` and `/auth/*` to `API_URL`, default `http://localhost:8080`. Legacy `NEXT_PUBLIC_API_URL` is a fallback; `API_URL` wins. SockJS reaches `NEXT_PUBLIC_WS_URL`, default `http://localhost:8080/ws`, directly. Gateway CORS allows local frontend 3001 by default.

| Operation | Request | Result / constraint |
| --- | --- | --- |
| Login | POST /auth/login, username/password | Keycloak access_token, refresh_token, expires_in |
| Register | POST /auth/register, username/email/password/fullName/phoneNumber/address | Password 8–128; contact fields max 255 |
| Refresh | POST /auth/refresh, {refreshToken} | Rotated Keycloak tokens |
| Logout | POST /auth/logout, refresh_token form parameter | Local logout occurs immediately; revocation best effort |
| Profile | GET /api/user/me; PATCH same path, editable fields | Current user only |
| Addresses | GET/POST /api/user/addresses | label max64; recipientName max128; phone max32; addressLine max512 |
| Address edit/delete/default | PUT/DELETE /api/user/addresses/{id}; PATCH /{id}/default | Current user only |
| Admin users/status | GET /api/user; PATCH /api/user/admin/{id}/status, {enabled} | ADMIN only; status is boolean |

Axios attaches bearer tokens only to the API client. Auth endpoints use a separate transport and cannot recursively refresh. Concurrent authenticated 401 reads share one refresh; safe reads are replayed at most once. Mutations are never automatically replayed. Mutations and STOMP refresh an expiring token first. Late refresh cannot restore a logged-out or switched account. React Query has no mutation retry and clears cached server data when account identity changes.

## Catalog and inventory

| Operation | Request | Result / constraint |
| --- | --- | --- |
| Catalog | GET /api/product | Product[] |
| Search | GET /api/product/search | {content,page,size,totalElements,totalPages} |
| Product detail | GET /api/product/{id} | Product |
| SKU detail | GET /api/product/sku/{skuCode} | skuCode/name/price/imageUrl/color/size/isActive; inactive SKU 404 |
| Create/update/delete | POST /api/product; PUT/DELETE /api/product/{id} | ADMIN; request basePrice, response price |
| Stock | GET /api/inventory/{skuCode} | {skuCode,quantity} |
| Adjust stock | POST /api/inventory/adjust, {skuCode,adjustmentQuantity,reason} | ADMIN; HTTP202 {status:"queued",skuCode}, no newQuantity |
| Image/gallery upload | POST /api/product/uploads/image or /gallery | Multipart file or files[]; secureUrl/publicId |

Search parameters: keyword, category, minPrice, maxPrice, color, size, zero-based page, pageSize (1–100), sort. Sort whitelist: id, name, price (basePrice alias), createdAt; asc/desc. UI page numbers are one-based and translated to API pages. Search data is never fabricated or filtered as a replacement for the server query.

Product response uses `price` and variant galleries. Parent `basePrice`/parent galleryImages are not response fields. Create/update requests use `basePrice` and `variants`; each variant can have galleryImages, maximum 30 URLs of 255 characters. Product description is max255. Variant price zero is valid and preserved. Existing SKU codes remain stable when color/size changes to retain their inventory identity.

Uploads keep the backend multipart fields and accept image/*; frontend checks per-file 10MB and aggregate below 50MB, matching backend multipart configuration with room for the envelope. Credentials remain server-side. Invalid image URLs or network failures produce the local neutral placeholder; they never replace API product data.

## Cart, orders and payment

| Operation | Request | Result / constraint |
| --- | --- | --- |
| Read/clear own cart | GET/DELETE /api/cart/me | {userId,items:[{skuCode,quantity,productName,imageUrl,price}]} / clear |
| Add | POST /api/cart/items, {skuCode,quantity} | Increment SKU quantity; validation is server-owned |
| Update | PUT /api/cart/items/{sku}, {skuCode,quantity} | Set quantity |
| Remove | DELETE /api/cart/items/{sku} | Remove own line |
| Cart checkout (audited) | POST /api/cart/checkout | COD-only order; current contract does not carry address/payment selection |
| Place order (used) | POST /api/order, Idempotency-Key header | items[{skuCode,quantity}], paymentMethod, shippingAddressLabel, shippingRecipientName, shippingRecipientPhone, shippingAddressLine |
| Placement result | HTTP202 | {orderNumber,message}; acknowledgment, not completion |
| Orders/detail | GET /api/order/me; GET /api/order/{number} | Owner or ADMIN detail; actual persisted fields |
| Admin orders | GET /api/order/admin | ADMIN only |
| Cancel | POST /api/order/{number}/cancel | VALIDATED or PAYMENT_FAILED only |
| Create VNPay link | POST /api/payment/vnpay/create, {orderNumber} | Owner only, VNPAY + VALIDATED and positive total; HTTPS paymentUrl |
| Payment status | GET /api/payment/order/{number} | NOT_CREATED, PENDING, SUCCESS, FAILED |

Checkout uses the existing order endpoint because cart checkout cannot represent the selected shipping address or VNPay. Backend recalculates SKU prices and validates inventory. A SHA-256 fingerprint of the request ties a per-user session receipt to a reusable idempotency key; raw address/contact data is not copied into the receipt. Manual retry after an ambiguous response reuses the key if the payload is unchanged.

202 never clears the cart. Accepted orders block duplicate checkout from the same receipt until a final state or explicit decision. Failed/cancelled orders release the receipt while retaining cart lines. On COMPLETED, explicit cleanup deletes only submitted SKUs whose quantities still match the current cart; changed/new lines remain. This API cannot make compare-and-delete atomic across devices: no version/conditional-delete contract exists, so cleanup is best effort and requires an explicit user action.

Backend order states are PENDING, VALIDATED, COMPLETED, FAILED, PAYMENT_FAILED, CANCELLED. They are processing/payment states, not delivery milestones. PAYMENT_FAILED can be cancelled but cannot create another VNPay link under this contract. A payment query-string redirect alone never proves success; HTTP order/payment responses are authoritative. Browser redirects only to a credential-free HTTPS URL returned by the payment service.

## Order tracking

STOMP CONNECT carries native `Authorization: Bearer <access token>`. The client subscribes only to `/topic/order/{orderNumber}`, after an authorized HTTP detail response. Backend checks JWT and ownership; no client SEND, wildcard subscriptions or direct unauthenticated notification access are introduced.

A notification invalidates the HTTP detail query; it cannot set a fabricated completed state. Active orders poll every 8s in the foreground, bounded to 40 reads or 5 minutes. Final states, unauthorized/forbidden responses and unrelated 404s stop polling. WebSocket reconnect stops after three close failures or a STOMP error. Manual refresh restarts the bounded HTTP observation window. These limits are code-reviewed; the complete five-minute duration has not been exercised against live infrastructure.

## Error behavior

The backend standardized error object is treated as unknown input. UI messages map HTTP status to concise Vietnamese text, preserve retry where appropriate and avoid exposing infrastructure payloads. Loading, empty, missing, permission, network and stock-conflict states are distinct. No production fixture catalog, fake stock or success response is present.
