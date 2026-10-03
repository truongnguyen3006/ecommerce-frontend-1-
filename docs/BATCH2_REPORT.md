# Batch 2 frontend execution report

Scope: `truongnguyen3006/ecommerce-frontend-1-`, branch `batch2-frontend`. Both attached files were read in full before repository work: `Pasted text.txt` governs execution; `Design.md` governs visual design.

Frontend starting commit: `2c5fff53eb7acd2c48f5176947fb53a3adb5c8bd`. Read-only backend contract reference: `project1-recovery` at `58e825aa60baaff3bebfe46636e718a1331400d6`. Validation below concerns the combined final changes, rather than claiming every intermediate commit was separately built.

## 1. Audit summary

Already good: Next App Router routes, Ant Design registry/React 19 patch, Axios/React Query/Zustand stack, SKU-based product selection, address CRUD, service-side uploads and owner/admin concepts. These frameworks, route URLs and useful operations were retained.

Broken: the default HTTP rewrite targeted historical port 8000 while Batch 1 gateway is 8080; product failures could look like an empty catalog; refresh could run concurrently, recurse through auth and replay mutations; STOMP lacked the required bearer CONNECT header; checkout cleared local cart before an asynchronous order completed; unsupported response fields and fabricated stock/new-quantity assumptions appeared in admin; image form binding and SKU identity edits were unreliable.

Outdated: browser-only cart duplicated server ownership; client filtering missed server pagination/search; registration allowed passwords below the backend minimum; order views and dashboard copy overstated payment/delivery meaning; old README advertised direct notification port 8087. Hero/fallback photography, promotional claims and disconnected account/wishlist UI also needed replacement.

Redesigned: shared navigation/footer, catalog/home/detail, authentication/account/address, cart/order and admin surfaces. Large duplicate product editor implementations were consolidated. Tests subsequently identified and fixed tablet editor overflow, mobile filter labeling and a fast shared-query hydration mismatch between Header/body Suspense boundaries.

All 59 original frontend text files were reviewed, including configuration, service/state files and package metadata. Backend controllers/DTOs/security/services/gateway were read through the GitHub connector. Binary screenshot/archive assets were preserved through the original Git tree.

## 2. Design system

| Element | Implementation |
| --- | --- |
| Palette | #111111, #ffffff, #e5e5e5, #f5f5f5, #707072, #9e9ea0; status meaning remains text, not decorative color |
| Typography | Available Inter / Helvetica Neue / Helvetica / Arial stack; regular 400 and medium 500; compact 12–20px UI, 24–32px headings, hero up to 76px |
| Spacing | 4px scale; 12/16/20/24/36/48px functional gaps; generous section separation and 1440px content maximum |
| Radius | 30px action pills, 24px search; square product media, forms, dialogs and ordinary surfaces |
| Elevation | Flat surfaces, whitespace and hairline gray borders; no decorative gradients, glass or card shadows |
| Buttons | Black/white primary and outlined secondary, explicit disabled/loading states; 44–48px major controls |
| Forms | Visible labels, validation and concise error copy; stable controlled URL/upload binding |
| Cards | Real image/name/category/colors/price, neutral local image failure placeholder, no fabricated sales badges |
| Responsive | Desktop multi-column grids/sidebar; two-column mobile catalog, stacked detail/account/checkout, drawer navigation and scrollable admin tables |

Design.md's monochrome, product-first, flat, restrained typographic direction was applied with an independent Flash Store identity. Proprietary Nike fonts, slogans, logo and hardcoded Nike fallback photos were not copied. Existing Nike CDN URLs remain supported only as real backend catalog imagery. Responsive category count follows actual catalog data rather than fabricated tiles.

## 3. API integration

The identified configuration defect was the historical 8000 default. `API_URL` now controls Next's server rewrite, then legacy `NEXT_PUBLIC_API_URL`, then verified gateway 8080. The built routes manifest was inspected and contains 8080 targets for both /api and /auth. The browser keeps same-origin HTTP requests; configurable SockJS reaches gateway /ws directly.

Product loading also needed explicit error/retry and accurate shapes: GET /api/product is Product[], while /api/product/search is a page object with zero-based page and pageSize. Server search/sort/filter/page now drive the listing. TypeScript distinguishes request basePrice from response price and moves galleries to variants. No permissive normalizer or fixture catalog masks failure.

Auth uses exact login/register/refresh/logout contracts, a separate auth transport, one shared refresh, safe-read replay only and immediate local logout. Password validation is 8–128. Account switches do not retain the previous user's profile. Hydration restores browser state after the initial SSR render.

Cart now uses authenticated /api/cart/me and /items APIs, with server price and SKU validation. Checkout preserves shipping/payment selection through POST /api/order; /api/cart/checkout was audited but cannot carry these fields. A per-user receipt keeps a reusable idempotency key, payload fingerprint and submitted SKU quantities. 202 does not clear cart or indicate completion. Failure retains cart; explicit completed-order cleanup preserves changed and newly added lines.

Inventory adjustment recognizes queued 202 without inventing newQuantity. VNPay only starts for the owner of a VALIDATED VNPAY order with positive total. PAYMENT_FAILED can be cancelled but cannot repay under the current backend. Redirect query strings do not prove payment. See [API_CONTRACT.md](API_CONTRACT.md) for exact paths, fields, constraints and status semantics.

The frontend defects are corrected and contract-tested. Live product loading against the actual gateway could not be confirmed here: localhost:8080 had no reachable service.

## 4. Customer pages

| Page | Result |
| --- | --- |
| Home | Real catalog-backed hero link/cards/categories, independent editorial copy; separate pending/empty/error states and stable SSR snapshot |
| Products | URL-driven keyword/category/price/color/size, backend sort/page, count, sidebar/mobile filter drawer and error retry |
| Product detail | Variant images/galleries, color/size selection, actual stock, bounded quantity, server cart add and local wishlist |
| Login | Exact Keycloak contract, safe internal return path, validation/loading/error, role-aware landing |
| Register | Backend password/contact limits and actual registration result; no fake social signup |
| Profile | Editable actual profile plus address create/edit/delete/default, confirmation and server invalidation |
| Wishlist | Local product IDs with explicit browser-only scope, actual fetched product cards and retry/removal |
| Cart/checkout | Server-owned basket, quantity/removal/clear, stock recheck, saved address and COD/VNPay, idempotent asynchronous submission |
| Waiting | Authorized detail, factual status steps, bounded polling/authenticated STOMP, HTTP-authoritative payment/order status and explicit cart decision |
| Orders | Actual history/detail/total/address, supported cancellation confirmation and owner payment action |

About/help retain operational store/project information without invented policies, discounts or service guarantees. The old local anonymous basket is not silently migrated because it lacks reliable account ownership and current SKU validation.

## 5. Admin

| Area | Result |
| --- | --- |
| Layout | Consistent sidebar, active route, mobile drawer, store return/logout and guard before protected data mounts |
| Dashboard | Actual counts, errors instead of fake zero success, completed-order value for today; COD collection/delivery is not inferred |
| Products | Real paginated table, detail/edit/create navigation, delete confirmation, invalidation and loading/empty/error |
| Create/edit | Shared general/variant forms, upload/URL/gallery binding, manual or bulk sizes, zero-price preservation, initial stock entered explicitly (default zero), duplicate SKU validation |
| Inventory | Actual lookups, stable existing SKU identifiers, queued adjustment message and explicit later recheck |
| Orders | Actual list and detail dialog, backend status labels, shipping recipient rather than invented customer fields |
| Users | Actual profiles/status/available roles, confirmation for lock/unlock, current admin cannot lock self in UI |

Cloudinary single and gallery multipart upload behavior is preserved. Bulk sizes inherit their entered/uploaded variant galleries. Existing SKU codes remain unchanged during color/size edits to protect stock identity.

## 6. Responsive / accessibility

Breakpoints 1199/1023/767px were implemented and all 19 customer/admin/auth screens were checked at 360, 390, 768, 1024 and 1440px (95 route/width checks). Document overflow checks and runtime-error collection passed. Screenshots at 390/1440 were visually reviewed, including home, detail, checkout, account/orders and admin editors/tables.

Navigation/filter drawers, stacked forms/cart, two-column mobile catalog and table-local horizontal scrolling are deliberate. Semantic navigation/main/footer, skip link, visible keyboard focus, labels, fieldsets, pressed states, accessible action labels, live updates and reduced-motion CSS are included. This is not a full WCAG audit; real catalog image rendering and device-specific behavior remain local checks.

## 7. State management

React Query owns catalog, stock, cart, addresses, profile, orders, payment and admin data. User-scoped keys and cache clearing on identity/logout reduce cross-account stale data; mutations invalidate their related reads. Transient reads retry at most once; mutations never auto-retry.

Zustand keeps authentication, local wishlist IDs and a session-scoped checkout receipt, not duplicate server cart/product state. Browser persistence is restored after hydration. The homepage maintains an explicit SSR snapshot so a fast Header catalog request cannot change initial body markup.

Axios has a single API transport plus an isolated auth transport, 15s timeouts, bearer attachment and one in-flight refresh. Tests cover concurrent 401s, no mutation replay, logout race, failed/missing refresh and account profile separation.

STOMP CONNECT carries Authorization; an authorized detail read precedes the exact order topic subscription. Notifications invalidate HTTP instead of fabricating state. Polling is foreground-only, 8s, capped at 40 reads/5min; unauthorized/forbidden/final states stop it. WebSocket closes are capped at three reconnect failures. Unmount deactivates the client. Full five-minute live timing was code-reviewed, not exercised end to end.

## 8. Files changed

| Group | Paths |
| --- | --- |
| App pages | src/app/page.tsx, products, product/[id], login, register, profile, wishlist, checkout, checkout/waiting/[orderNumber], orders, about, help; all existing admin pages/layout |
| Components | Header, Footer, ProductCard, RouteAccessGuard; new AccountNav, AddressBook, OrderActions, OrderSummary; PageState/ProductImage; QuantityStepper; CloudinaryUploadButton, ImageUrlField, shared ProductEditor |
| Services | productApi, authApi, addressApi, inventoryApi, orderApi, paymentApi, userManagementApi; new cartApi |
| State/lib | useAuthStore; new useCheckoutStore/useWishlistStore; removed obsolete useCartStore; axiosClient/providers/order-status; API errors, query hooks, URL/filter/editor/catalog/format helpers, order tracking |
| Styles/assets | globals.css, app/layout.tsx; local flash-mark.svg and product-placeholder.svg |
| Tests/config/docs | next.config.ts, .env.example, .gitignore, package.json/lock; playwright.config.ts, tests/*.ts; README, API_CONTRACT.md, this report |

Original unrelated binaries, archive, framework/tooling files and backend files were not changed. No environment secrets, build output, dependencies, browser executable, traces or generated QA screenshots are included in the commits.

## 9. Tests executed

Final validation ran from the frontend checkout, with Node 24.19.0 / npm 11.9.0:

```bash
npm ci
npm run lint
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/workspace/scratch/3db45bce219c/batch2-browser/runtime/chromium LD_LIBRARY_PATH=/workspace/scratch/3db45bce219c/batch2-browser/runtime npm test
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/workspace/scratch/3db45bce219c/batch2-browser/runtime/chromium LD_LIBRARY_PATH=/workspace/scratch/3db45bce219c/batch2-browser/runtime npm run test:responsive
git diff --check
curl --connect-timeout 2 --max-time 4 --silent --show-error http://localhost:8080/api/product
```

| Check | Observed result |
| --- | --- |
| npm ci | Passed; 467 packages installed, final clean install 11s |
| ESLint | Passed, zero errors/warnings |
| Next build | Passed compilation, TypeScript and generation of all existing routes |
| Full Playwright | 57 passed, 58.2s: 12 Node contract/interceptor tests, 20 flows each on desktop/mobile, five responsive tests |
| Expanded responsive | Five passed, 45.6s; 19 screens at each of five widths, no document overflow or page errors |
| git diff --check | Passed |
| Live gateway curl | Failed with connection refused (exit7), confirming live backend was unavailable here |

Flow coverage includes API-error retry vs empty, search/sort/page/invalid ranges, private/admin boundaries, login return, registration limits, stock/quantity/cart, local wishlist, address/profile CRUD/default, 202 retention/failure, repeated-key manual retry, selective cleanup, payment spoof rejection, cancellation, user status confirmation, variant zero price/stable SKU, queued stock, multipart bulk gallery and authenticated STOMP invalidation.

Early failures were used to fix product-editor overflow and hydration; test harness issues included Ant Design's pagination listitem/localized drawer names and a freshly regenerated fixture token timestamp. The final reported runs passed. No trace or screenshot is committed.

## 10. Build result

Install, lint, build and executable Chromium tests passed. Package lock retains existing dependency versions; the only new top-level dependency is development-only @playwright/test 1.62.1. Existing framework/UI/state technologies are unchanged.

Non-blocking output: the existing baseline-browser-mapping package warns that its compatibility metadata is old; this did not cause compilation/type/lint failure. The environment also emits npm http-proxy and NO_COLOR/FORCE_COLOR warnings. No production upgrade claim is made.

Normal Playwright Chromium CDN installation failed in this environment because the downloaded archive was invalid. Chromium 153.0.8010.0 was provisioned outside the repository using a tooling-only npm browser package/extraction and selected through the documented executable override. Neither that package nor its browser binary enters frontend dependencies or commits.

## 11. Unverified items

The actual gateway, Docker services, Keycloak, Kafka/Redis/MySQL, notification service, Cloudinary credentials and VNPay sandbox were not running here. Thus real login/token rotation/revocation, catalog pictures through the live proxy, real stock/order convergence, backend ownership enforcement, signed payment callback and Cloudinary network upload remain unverified.

Playwright uses explicitly isolated contract fixtures, not a live backend. Real delivery/COD collection, concurrency benchmarking, deployment and real mobile devices were not validated. Cart cleanup is an explicit best-effort compare/read/delete; the backend API has no conditional/versioned delete for atomic cross-device cleanup. Wishlist has no backend sync.

## 12. Local verification checklist

```bash
git clone --branch batch2-frontend https://github.com/truongnguyen3006/ecommerce-frontend-1-.git
cd ecommerce-frontend-1-
npm ci
cp .env.example .env.local
# Set API_URL=http://localhost:8080
# Set NEXT_PUBLIC_WS_URL=http://localhost:8080/ws
npm run dev
```

1. Run the existing Batch 1 backend using its documented procedure and confirm GET http://localhost:8080/api/product returns Product[]. Frontend is http://localhost:3001.
2. Open home/products and verify real data plus keyword/category/color/size/price, sort and pagination requests.
3. Register with an 8–128 character password, sign in USER, edit profile, and exercise address create/edit/default/delete.
4. Open a real product detail, choose a SKU with stock, verify quantity limits and add; confirm GET /api/cart/me.
5. Open checkout, update/remove items, choose a saved address and COD/VNPay; submit once and confirm HTTP202 preserves cart.
6. Observe waiting status via authorized HTTP/STOMP; simulate unavailable notification and retry. For VNPay use only the configured sandbox after VALIDATED and verify backend payment status after return.
7. Review orders/detail/cancellation; after COMPLETED verify matching purchased lines can be removed while changed/new lines remain.
8. Sign in ADMIN; check dashboard, list/detail, product create/edit/delete, manual/bulk variants/gallery uploads, queued inventory/recheck, orders and user lock/unlock.
9. Verify USER cannot mount admin and another owner cannot fetch order/cart data through the backend.
10. Check 360/390/768/1024/1440px, keyboard/focus, drawers and table scrolling. Verify error/retry behavior when real services are stopped.
11. Run npm run lint, npm run build, npx playwright install chromium, npm test for repeatable fixture tests. For production local: npm run start (or add -- --hostname 127.0.0.1 if network-interface discovery is blocked).

## 13. Commits

Four logical commits follow the specification's preferred grouping. Their verified full SHAs are listed in the final delivery message; the final commit also includes this report. The authoritative list is [batch2-frontend history](https://github.com/truongnguyen3006/ecommerce-frontend-1-/commits/batch2-frontend).

- Align frontend with Batch 1 backend APIs
- Implement storefront design system and customer experience
- Redesign checkout account and order flows
- Polish admin UI responsive states and tests

Only batch2-frontend is updated, through the GitHub connector with a non-forced fast-forward. Frontend main and both audited backend refs retain their starting SHAs.
