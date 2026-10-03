export interface PendingStockOperation { id: string; quantity: number; accepted: boolean }
const key = (owner: string, sku: string) => `stock-operation:${owner}:${sku}`;
export function pendingStockOperation(owner: string, sku: string): PendingStockOperation | null {
  try {
    const value=JSON.parse(sessionStorage.getItem(key(owner,sku)) || 'null');
    return value && /^[a-f0-9-]{36}$/.test(value.id) && Number.isSafeInteger(value.quantity) && value.quantity!==0 && typeof value.accepted==='boolean' ? value : null;
  } catch {return null;}
}
export function saveStockOperation(owner: string,sku: string,value: PendingStockOperation): void {sessionStorage.setItem(key(owner,sku),JSON.stringify(value));}
export function finishStockOperation(owner: string,sku: string): void {sessionStorage.removeItem(key(owner,sku));}
