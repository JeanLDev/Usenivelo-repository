import { useState, useEffect, useRef } from "react";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";

export default function CalendarioRangeDropdown({
  initialRange = { start: null, end: null },
  onChange,
  placeholder = "",
}) {
  // helpers
  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (d) =>
    !d ? null : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const fromISO = (s) => {
    if (!s) return null;
    if (s instanceof Date)
      return new Date(s.getFullYear(), s.getMonth(), s.getDate());
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  };

  const monthNames = [
    "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
    "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
  ];

  // state
  const [open, setOpen] = useState(false);
  const [openToLeft, setOpenToLeft] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [view, setView] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });

  const [start, setStart] = useState(fromISO(initialRange.start));
  const [end, setEnd] = useState(fromISO(initialRange.end));
  const [hoverDate, setHoverDate] = useState(null);

  const ref = useRef(null);

  // Detecta mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Fechar ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (open && ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Recalcular posição ao abrir (somente desktop)
  useEffect(() => {
    if (!open || isMobile) return;

    if (ref.current) {
      const buttonRect = ref.current.getBoundingClientRect();
      const dropdownWidth = 320;

      const espaçoDireita = window.innerWidth - buttonRect.right;

      setOpenToLeft(espaçoDireita > dropdownWidth);
    }
  }, [open, isMobile]);

  // rebuild view if external change
  useEffect(() => {
    setStart(fromISO(initialRange.start));
    setEnd(fromISO(initialRange.end));
  }, [initialRange.start, initialRange.end]);

  // calendar generator
  const buildMonthMatrix = (year, month) => {
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const matrix = [];
    let week = [];
    const startDay = first.getDay();

    for (let i = 0; i < startDay; i++) week.push(null);

    for (let d = 1; d <= last.getDate(); d++) {
      week.push(new Date(year, month, d));
      if (week.length === 7) {
        matrix.push(week);
        week = [];
      }
    }
    if (week.length) {
      while (week.length < 7) week.push(null);
      matrix.push(week);
    }
    return matrix;
  };

  const onClickDay = (date) => {
    if (!date) return;

    if (!start || (start && end)) {
      setStart(date);
      setEnd(null);
      return;
    }

    if (date >= start) {
      setEnd(date);
    } else {
      setStart(date);
      setEnd(null);
    }
  };

  const inRange = (d) => {
    if (!d) return false;
    const time = d.setHours(0, 0, 0, 0);

    if (start) {
      const s = new Date(start).setHours(0, 0, 0, 0);
      if (end) {
        const e = new Date(end).setHours(0, 0, 0, 0);
        return time >= s && time <= e;
      } else if (hoverDate) {
        const h = new Date(hoverDate).setHours(0, 0, 0, 0);
        const [min, max] = s <= h ? [s, h] : [h, s];
        return time >= min && time <= max;
      }
      return time === s;
    }
    return false;
  };

  const isStart = (d) =>
    d && start && d.getTime() === new Date(start).setHours(0, 0, 0, 0);

  const isEnd = (d) =>
    d && end && d.getTime() === new Date(end).setHours(0, 0, 0, 0);

  const apply = () => {
    onChange?.({ start: toISO(start), end: toISO(end || start) });
    setOpen(false);
  };

  const clear = () => {
    setStart(null);
    setEnd(null);
    setHoverDate(null);
    onChange?.({ start: null, end: null });
  };

  const prevMonth = () => {
    setView((v) => {
      const newDate = new Date(v.year, v.month - 1, 1);
      return { year: newDate.getFullYear(), month: newDate.getMonth() };
    });
  };

  const nextMonth = () => {
    setView((v) => {
      const newDate = new Date(v.year, v.month + 1, 1);
      return { year: newDate.getFullYear(), month: newDate.getMonth() };
    });
  };

  const monthMatrix = buildMonthMatrix(view.year, view.month);

  const displayText = start ? (
    end && end !== start ? (
      `${pad(start.getDate())}/${pad(start.getMonth() + 1)}/${start.getFullYear()} — ${pad(end.getDate())}/${pad(end.getMonth() + 1)}/${end.getFullYear()}`
    ) : (
      `${pad(start.getDate())}/${pad(start.getMonth() + 1)}/${start.getFullYear()}`
    )
  ) : (
    <Calendar />
  );

  // ---------------------------------------------------------
  //       📌 AQUI ENTRA A MÁGICA DO DROPDOWN RESPONSIVO
  // ---------------------------------------------------------

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="px-2 py-2 rounded-md border border-gray-300 bg-white text-sm flex items-center gap-2 hover:opacity-80 transition-all duration-300"
      >
        <span className="text-xs text-gray-600">{displayText}</span>
      </button>

      {open && (
        <div
          className={`
            bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-3

            ${isMobile
              ? `
                fixed left-1/2 top-24 -translate-x-1/2
                w-[90%] max-w-sm 
              `
              : `
                absolute mt-2 w-[320px]
                ${openToLeft ? "left-0" : "right-0"}
              `
            }
          `}
        >
          {/* header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100">
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <select
                  value={view.month}
                  onChange={(e) =>
                    setView((v) => ({ year: v.year, month: Number(e.target.value) }))
                  }
                  className="px-2 py-1 border rounded text-sm"
                >
                  {monthNames.map((mn, i) => (
                    <option key={mn} value={i}>
                      {mn}
                    </option>
                  ))}
                </select>

                <select
                  value={view.year}
                  onChange={(e) =>
                    setView((v) => ({ month: v.month, year: Number(e.target.value) }))
                  }
                  className="px-2 py-1 border rounded text-sm"
                >
                  {Array.from({ length: 10 }, (_, i) =>
                    new Date().getFullYear() - 5 + i
                  ).map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button onClick={clear} className="text-xs text-red-600 flex items-center gap-1">
              <X className="w-3 h-3" /> Limpar
            </button>
          </div>

          {/* labels */}
          <div className="grid grid-cols-7 gap-1 text-xs text-center text-gray-500 mb-1">
            {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {monthMatrix.map((week, wi) =>
              week.map((day, di) => {
                const disabled = !day;
                const inR = day && inRange(new Date(day));
                const startMark = isStart(day);
                const endMark = isEnd(day);

                return (
                  <div key={`${wi}-${di}`} className="h-8">
                    <button
                      onMouseEnter={() => setHoverDate(day)}
                      onMouseLeave={() => setHoverDate(null)}
                      onClick={() => onClickDay(day)}
                      disabled={disabled}
                      className={
                        "w-full h-full rounded flex items-center justify-center text-sm " +
                        (disabled
                          ? "text-gray-300"
                          : startMark
                          ? "bg-blue-600 text-white rounded-l-md"
                          : endMark
                          ? "bg-blue-600 text-white rounded-r-md"
                          : inR
                          ? "bg-blue-100 text-blue-800"
                          : "hover:bg-gray-100")
                      }
                    >
                      {day ? day.getDate() : ""}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* footer */}
          <div className="mt-3 text-xs text-gray-600">
            {start && !end && (
              <div>
                Escolha a data final — início: <strong>{toISO(start)}</strong>
              </div>
            )}
            {start && end && (
              <div>
                Período: <strong>{toISO(start)} → {toISO(end)}</strong>
              </div>
            )}

            <div className="flex items-center justify-between">
              {!start && !end && <div>Escolha a data inicial</div>}

              <button
                onClick={apply}
                className="ml-2 bg-blue-600 text-white text-sm px-3 py-1 rounded"
                disabled={!start}
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
