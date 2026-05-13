import React, { useEffect, useState } from "react";

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (v: string) => void;
}

const pad = (n: string | number) => String(n).padStart(2, "0");

const BirthDateSelector: React.FC<Props> = ({ value, onChange }) => {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-");
      setYear(y); setMonth(m); setDay(d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (
      day.length >= 1 && month.length >= 1 && year.length === 4 &&
      d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= new Date().getFullYear()
    ) {
      onChange(`${y}-${pad(m)}-${pad(d)}`);
    } else {
      onChange("");
    }
  }, [day, month, year]);

  const inputClass =
    "w-full px-3 py-3 rounded-xl bg-card border border-border text-foreground text-sm text-center focus:border-primary/50 focus:outline-none transition-colors tabular-nums";

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Data de Nascimento</label>
      <div className="grid grid-cols-3 gap-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          placeholder="DD"
          value={day}
          onChange={(e) => setDay(e.target.value.replace(/\D/g, "").slice(0, 2))}
          className={inputClass}
          aria-label="Dia"
        />
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={2}
          placeholder="MM"
          value={month}
          onChange={(e) => setMonth(e.target.value.replace(/\D/g, "").slice(0, 2))}
          className={inputClass}
          aria-label="Mês"
        />
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={4}
          placeholder="AAAA"
          value={year}
          onChange={(e) => setYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
          className={inputClass}
          aria-label="Ano"
        />
      </div>
      <p className="text-[11px] text-muted-foreground">Digite dia, mês e ano (ex: 15 / 06 / 2000).</p>
    </div>
  );
};

export default BirthDateSelector;
