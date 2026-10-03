export function facetLabel(value?: string): string { return (value || '').replace(/^ +| +$/g, ''); }
export function facetKey(value?: string): string { return facetLabel(value).toLowerCase(); }
export function facetLabels(values: (string | undefined)[]): string[] {
  const labels=new Map<string,string>();
  for (const value of values) {const label=facetLabel(value), key=facetKey(value);if(key&&!labels.has(key))labels.set(key,label);}
  return [...labels.values()];
}
