'use client';
export default function QuantityStepper({ value, min = 1, max, onChange, disabled = false }: {
  value: number; min?: number; max?: number; onChange: (value: number) => void; disabled?: boolean;
}) {
  return <div className="quantity-stepper" aria-label="Số lượng">
    <button type="button" aria-label="Giảm số lượng" onClick={() => onChange(Math.max(min, Math.min(max ?? Number.MAX_SAFE_INTEGER, value - 1)))} disabled={disabled || value <= min}>−</button>
    <output aria-live="polite" aria-label="Số lượng hiện tại">{value}</output>
    <button type="button" aria-label="Tăng số lượng" onClick={() => onChange(Math.min(max ?? Number.MAX_SAFE_INTEGER, value + 1))} disabled={disabled || (max !== undefined && value >= max)}>+</button>
  </div>;
}
