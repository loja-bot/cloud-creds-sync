import React, { useMemo, useEffect, useState } from "react";

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (v: string) => void;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const pad = (n: number) => String(n).padStart(2, "0");

const BirthDateSelector: React.FC<Props> = ({ value, onChange }) => {
  const currentYear = new Date().getFullYear();
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  // Parse incoming value
  useEffect(() => {
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [y, m, d] = value.split("-");
      setYear(y); setMonth(m); setDay(d);
    }
  }, []);

  // Emit when complete
  useEffect(() => {
    if (day && month && year) {
      onChange(`${year}-${month}-${day}`);
    } else {
      onChange("");
    }
  }, [day, month, year]);

  const years = useMemo(
    () => Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i),
    [currentYear]
  );

  const daysInMonth = useMemo(() => {
    if (!month || !year) return 31;
    return new Date(Number(year), Number(month), 0).getDate();
  }, [month, year]);

  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );

  const selectClass =
    "w-full px-3 py-3 rounded-xl bg-card border border-border text-foreground text-sm focus:border-primary/50 focus:outline-none transition-colors appearance-none";

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Data de Nascimento</label>
      <div className="grid grid-cols-3 gap-2">
        <select
          className={selectClass}
          value={day}
          onChange={(e) => setDay(e.target.value)}
          aria-label="Dia"
        >
          <option value="">Dia</option>
          {days.map((d) => (
            <option key={d} value={pad(d)}>{pad(d)}</option>
          ))}
        </select>
        <select
          className={selectClass}
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          aria-label="Mês"
        >
          <option value="">Mês</option>
          {MONTHS.map((name, i) => (
            <option key={i} value={pad(i + 1)}>{name}</option>
          ))}
        </select>
        <select
          className={selectClass}
          value={year}
          onChange={(e) => setYear(e.target.value)}
          aria-label="Ano"
        >
          <option value="">Ano</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
      </div>
      <p className="text-[11px] text-muted-foreground">Selecione dia, mês e ano.</p>
    </div>
  );
};

export default BirthDateSelector;
