import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  Database,
  Download,
  FileSpreadsheet,
  Gauge,
  Grid3X3,
  History,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCcw,
  Search
} from 'lucide-react';
import './styles.css';
import grupoRbLogo from './assets/grupo-reb-logo.png';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Grid3X3 },
  { id: 'turno', label: 'Produccion', icon: ClipboardList },
  { id: 'historial', label: 'Historial', icon: History },
  { id: 'detalle', label: 'Detalle', icon: BarChart3 },
  { id: 'exportar', label: 'Exportar', icon: Download }
];

function today() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60 * 1000;

  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

async function fetchJson(path, options) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Error de comunicacion con el servidor');
  }

  return payload;
}

function formatDate(value) {
  if (!value) return '';
  const [year, month, day] = value.split('-');

  return `${day}/${month}/${year}`;
}

function downloadCsv(filename, dashboard, onlyShiftId = null) {
  const shifts = onlyShiftId
    ? dashboard.shifts.filter((shift) => shift.id === Number(onlyShiftId))
    : dashboard.shifts;
  const headers = [
    'Celda',
    'Pieza',
    'Articulo final',
    ...shifts.flatMap((shift) => [
      ...shift.hours.map((hour) => `${shift.label} ${hour.label}`),
      `Total ${shift.label}`
    ]),
    'Total Dia'
  ];
  const rows = dashboard.rows.map((row) => {
    const shiftValues = shifts.flatMap((shift) => {
      const keys = shift.hours.map((hour) => `${shift.id}:${hour.horaDesde}`);
      return [
        ...keys.map((key) => row.hours[key]?.cantidad ?? 0),
        row.totalsByShift[shift.id] || 0
      ];
    });

    return [
      row.celda,
      row.pieza,
      row.articulosFinales || '',
      ...shiftValues,
      onlyShiftId ? row.totalsByShift[onlyShiftId] || 0 : row.total
    ];
  });
  const csv = [headers, ...rows]
    .map((line) => line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    .join('\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function Sidebar({ activeView, onViewChange, lastUpdate }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <img className="brandLogo" src={grupoRbLogo} alt="Grupo RB" />
        <div className="brandText">
          <strong>FERROSIDER</strong>
          <span>PARTS</span>
        </div>
      </div>

      <nav className="nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={activeView === item.id ? 'navButton active' : 'navButton'}
              key={item.id}
              onClick={() => onViewChange(item.id)}
              title={item.label}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="sidebarFooter">
        <div className="statusDot" />
        <span>Ultima actualizacion</span>
        <strong>{lastUpdate || '-'}</strong>
      </div>
    </aside>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <section className="statCard">
      <div className="statIcon"><Icon size={22} /></div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </section>
  );
}

function Legend() {
  return (
    <div className="legend">
      <span><i className="swatch veryHigh" />Produccion muy alta</span>
      <span><i className="swatch high" />Produccion alta</span>
      <span><i className="swatch medium" />Produccion media</span>
      <span><i className="swatch low" />Produccion baja</span>
      <span><i className="swatch empty" />Sin datos</span>
    </div>
  );
}

function CellValue({ hour }) {
  return <td className={`heat ${hour?.status || 'empty'}`}>{hour?.cantidad || ''}</td>;
}

function HeaderTitle({ title, subtitle, sidebarCollapsed, onToggleSidebar }) {
  const ToggleIcon = sidebarCollapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <div className="topbarTitle">
      <button
        className="sidebarToggle headerSidebarToggle"
        onClick={onToggleSidebar}
        title={sidebarCollapsed ? 'Mostrar menu lateral' : 'Ocultar menu lateral'}
        type="button"
      >
        <ToggleIcon size={18} />
      </button>
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

function DateQueryControl({ date, onDateChange }) {
  const [draftDate, setDraftDate] = useState(date);

  useEffect(() => {
    setDraftDate(date);
  }, [date]);

  const applyDate = () => {
    if (draftDate && draftDate !== date) {
      onDateChange(draftDate);
    }
  };

  return (
    <>
      <label className="dateInput">
        <CalendarDays size={16} />
        <input type="date" value={draftDate} onChange={(event) => setDraftDate(event.target.value)} />
      </label>
      <button
        className="primaryButton secondaryButton"
        disabled={!draftDate || draftDate === date}
        onClick={applyDate}
        type="button"
      >
        <Search size={16} />
        Consultar
      </button>
    </>
  );
}

function articleLabel(row) {
  if (!row.articulosFinales) {
    return '-';
  }

  return row.cantidadArticulosFinales > 1
    ? `${row.articulosFinales} (${row.cantidadArticulosFinales})`
    : row.articulosFinales;
}

function ProductionTable({ dashboard, shiftId = null, compact = false, stickyBottomScrollbar = false }) {
  const shifts = shiftId
    ? dashboard.shifts.filter((shift) => shift.id === Number(shiftId))
    : dashboard.shifts;
  const tableWidth =
    120 +
    140 +
    132 +
    shifts.reduce((sum, shift) => sum + (shift.hours.length * 54) + 58, 0) +
    (shiftId ? 0 : 58);
  const shellRef = React.useRef(null);
  const stickyScrollbarRef = React.useRef(null);
  const stickyTrackRef = React.useRef(null);
  const syncingRef = React.useRef(false);
  const [showStickyScrollbar, setShowStickyScrollbar] = useState(false);

  useEffect(() => {
    if (!stickyBottomScrollbar) {
      setShowStickyScrollbar(false);
      return undefined;
    }

    const shell = shellRef.current;
    const stickyScrollbar = stickyScrollbarRef.current;
    const stickyTrack = stickyTrackRef.current;

    if (!shell || !stickyScrollbar || !stickyTrack) {
      return undefined;
    }

    const syncMetrics = () => {
      const shellRect = shell.getBoundingClientRect();
      stickyTrack.style.width = `${shell.scrollWidth}px`;
      stickyScrollbar.style.left = `${shellRect.left}px`;
      stickyScrollbar.style.width = `${shellRect.width}px`;
      stickyScrollbar.scrollLeft = shell.scrollLeft;
      setShowStickyScrollbar(shell.scrollWidth > shell.clientWidth + 1);
    };

    const onShellScroll = () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      stickyScrollbar.scrollLeft = shell.scrollLeft;
      syncingRef.current = false;
    };

    const onStickyScroll = () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      shell.scrollLeft = stickyScrollbar.scrollLeft;
      syncingRef.current = false;
    };

    syncMetrics();

    shell.addEventListener('scroll', onShellScroll, { passive: true });
    stickyScrollbar.addEventListener('scroll', onStickyScroll, { passive: true });

    const resizeObserver = new ResizeObserver(syncMetrics);
    resizeObserver.observe(shell);
    if (shell.firstElementChild) {
      resizeObserver.observe(shell.firstElementChild);
    }
    window.addEventListener('resize', syncMetrics);

    return () => {
      shell.removeEventListener('scroll', onShellScroll);
      stickyScrollbar.removeEventListener('scroll', onStickyScroll);
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncMetrics);
    };
  }, [dashboard, shiftId, compact, stickyBottomScrollbar]);

  return (
    <>
      <div className="tableShell" ref={shellRef}>
        <table
          className={compact ? 'productionTable compact' : 'productionTable'}
          style={{ width: `${tableWidth}px`, minWidth: `${tableWidth}px` }}
        >
          <colgroup>
            <col className="colCelda" />
            <col className="colPieza" />
            <col className="colArticulo" />
            {shifts.map((shift) => (
              <React.Fragment key={`col-${shift.id}`}>
                {shift.hours.map((hour) => (
                  <col className="colHora" key={`col-${shift.id}-${hour.horaDesde}`} />
                ))}
                <col className="colTotalTurno" key={`col-total-${shift.id}`} />
              </React.Fragment>
            ))}
            {!shiftId && <col className="colTotalDia" />}
          </colgroup>
          <thead>
            <tr>
              <th className="frozenColumn frozenColumnCelda" rowSpan="2">Celda</th>
              <th className="frozenColumn frozenColumnPieza" rowSpan="2">Pieza</th>
              <th className="frozenColumn frozenColumnArticulo" rowSpan="2">Articulo final</th>
              {shifts.map((shift) => (
                <th key={shift.id} colSpan={shift.hours.length + 1}>
                  {shift.label} ({shift.description})
                </th>
              ))}
              {!shiftId && <th rowSpan="2">Total dia</th>}
            </tr>
            <tr>
              {shifts.map((shift) => (
                <React.Fragment key={shift.id}>
                  {shift.hours.map((hour) => <th key={`${shift.id}:${hour.horaDesde}`}>{hour.label}</th>)}
                  <th>Total T{shift.id}</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {dashboard.rows.map((row) => (
              <tr key={`${row.idCelda}:${row.idPieza}`}>
                <td className="frozenColumn frozenColumnCelda">{row.celda}</td>
                <td className="frozenColumn frozenColumnPieza">{row.pieza}</td>
                <td className="frozenColumn frozenColumnArticulo articleCell" title={row.articulosFinalesDetalle || row.articulosFinales || ''}>
                  {articleLabel(row)}
                </td>
                {shifts.map((shift) => (
                  <React.Fragment key={shift.id}>
                    {shift.hours.map((hour) => (
                      <CellValue
                        key={`${shift.id}:${hour.horaDesde}`}
                        hour={row.hours[`${shift.id}:${hour.horaDesde}`]}
                      />
                    ))}
                    <td className="totalCell">{row.totalsByShift[shift.id] || 0}</td>
                  </React.Fragment>
                ))}
                {!shiftId && <td className="totalCell">{row.total}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {stickyBottomScrollbar && (
        <div
          className={showStickyScrollbar ? 'stickyHorizontalScrollbar visible' : 'stickyHorizontalScrollbar'}
          ref={stickyScrollbarRef}
          aria-hidden="true"
        >
          <div className="stickyHorizontalScrollbarTrack" ref={stickyTrackRef} />
        </div>
      )}
    </>
  );
}

function DashboardView({ dashboard, date, onDateChange, onImport, onImportArticles, importing, importingArticles, sidebarCollapsed, onToggleSidebar }) {
  return (
    <main className="content">
      <header className="topbar">
        <HeaderTitle title="Produccion - Vista del dia" subtitle="Lectura del CSV en schema aislado" sidebarCollapsed={sidebarCollapsed} onToggleSidebar={onToggleSidebar} />
        <div className="toolbar">
          <DateQueryControl date={date} onDateChange={onDateChange} />
          <button className="primaryButton" onClick={onImport} disabled={importing}>
            {importing ? <Loader2 className="spin" size={16} /> : <RefreshCcw size={16} />}
            Importar CSV
          </button>
          <button className="primaryButton secondaryButton" onClick={onImportArticles} disabled={importingArticles}>
            {importingArticles ? <Loader2 className="spin" size={16} /> : <Database size={16} />}
            Importar articulos
          </button>
        </div>
      </header>

      <section className="statsGrid">
        <StatCard icon={Grid3X3} label="Celdas" value={dashboard.summary.celdas} />
        <StatCard icon={ClipboardList} label="Piezas" value={dashboard.summary.piezas} />
        <StatCard
          icon={Gauge}
          label="Produccion total de productos finales"
          value={(dashboard.summary.totalProductosFinales || 0).toLocaleString('es-AR')}
        />
      </section>

      <ProductionTable dashboard={dashboard} compact stickyBottomScrollbar />
      <Legend />
    </main>
  );
}

function ShiftView({ dashboard, date, onDateChange, shiftId, onShiftChange, sidebarCollapsed, onToggleSidebar }) {
  const selected = dashboard.shifts.find((shift) => shift.id === Number(shiftId));

  return (
    <main className="content">
      <header className="topbar">
        <HeaderTitle title="Produccion por turno" subtitle={`${selected?.label} (${selected?.description})`} sidebarCollapsed={sidebarCollapsed} onToggleSidebar={onToggleSidebar} />
        <div className="toolbar">
          <select value={shiftId} onChange={(event) => onShiftChange(event.target.value)}>
            {dashboard.shifts.map((shift) => (
              <option key={shift.id} value={shift.id}>{shift.label} ({shift.description})</option>
            ))}
          </select>
          <DateQueryControl date={date} onDateChange={onDateChange} />
        </div>
      </header>

      <ProductionTable dashboard={dashboard} shiftId={shiftId} />
      <div className="actionRow">
        <button className="primaryButton" onClick={() => downloadCsv(`produccion_turno_${shiftId}_${date}.csv`, dashboard, shiftId)}>
          <FileSpreadsheet size={16} />
          Exportar a Excel
        </button>
      </div>
    </main>
  );
}

function HistoryView({ dashboard, date, onDateChange, sidebarCollapsed, onToggleSidebar }) {
  return (
    <main className="content narrow">
      <header className="topbar">
        <HeaderTitle title="Historial de produccion" subtitle={formatDate(date)} sidebarCollapsed={sidebarCollapsed} onToggleSidebar={onToggleSidebar} />
        <div className="toolbar">
          <DateQueryControl date={date} onDateChange={onDateChange} />
        </div>
      </header>

      <section className="statsGrid">
        <StatCard
          icon={Gauge}
          label="Produccion total de productos finales"
          value={(dashboard.summary.totalProductosFinales || 0).toLocaleString('es-AR')}
        />
        <StatCard icon={Grid3X3} label="Celdas" value={dashboard.summary.celdas} />
        <StatCard icon={ClipboardList} label="Piezas" value={dashboard.summary.piezas} />
      </section>

      <div className="accordionList">
        {dashboard.shifts.map((shift) => (
          <details className="shiftPanel" key={shift.id} open={shift.id === 1}>
            <summary>
              {shift.label} ({shift.description})
              <strong>{dashboard.summary.totalsProductosFinalesByShift?.[shift.id] || 0}</strong>
            </summary>
            <ProductionTable dashboard={dashboard} shiftId={shift.id} compact />
          </details>
        ))}
      </div>
    </main>
  );
}

function DetailView({ dashboard, date, onDateChange, sidebarCollapsed, onToggleSidebar }) {
  const [cell, setCell] = useState('');
  const [piece, setPiece] = useState('');
  const cells = [...new Set(dashboard.rows.map((row) => row.celda))];
  const pieces = [...new Set(dashboard.rows.map((row) => row.pieza))];
  const filtered = dashboard.rows.filter((row) =>
    (!cell || row.celda === cell) && (!piece || row.pieza === piece)
  );
  const selected = filtered[0] || dashboard.rows[0];
  const bars = selected
    ? dashboard.shifts.flatMap((shift) =>
        shift.hours.map((hour) => selected.hours[`${shift.id}:${hour.horaDesde}`] || { cantidad: 0, label: hour.label, idTurno: shift.id })
      )
    : [];
  const max = Math.max(...bars.map((bar) => bar.cantidad), 1);

  return (
    <main className="content narrow">
      <header className="topbar">
        <HeaderTitle title="Detalle de produccion" subtitle={selected ? `${selected.celda} - ${selected.pieza}${selected.articulosFinales ? ` - ${selected.articulosFinales}` : ''}` : 'Sin datos'} sidebarCollapsed={sidebarCollapsed} onToggleSidebar={onToggleSidebar} />
        <div className="toolbar">
          <select value={cell} onChange={(event) => setCell(event.target.value)}>
            <option value="">Todas las celdas</option>
            {cells.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={piece} onChange={(event) => setPiece(event.target.value)}>
            <option value="">Todas las piezas</option>
            {pieces.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <DateQueryControl date={date} onDateChange={onDateChange} />
        </div>
      </header>

      <section className="chartPanel">
        <div className="barChart">
          {bars.map((bar, index) => (
            <div className="barItem" key={`${bar.idTurno}:${bar.horaDesde || index}`}>
              <span>{bar.cantidad}</span>
              <i className={`bar ${bar.status || 'empty'}`} style={{ height: `${Math.max((bar.cantidad / max) * 100, 2)}%` }} />
              <small>{bar.label}</small>
            </div>
          ))}
        </div>
      </section>

      {selected && (
        <section className="summaryTable">
          <div>Total T1<strong>{selected.totalsByShift[1]}</strong></div>
          <div>Total T2<strong>{selected.totalsByShift[2]}</strong></div>
          <div>Total T3<strong>{selected.totalsByShift[3]}</strong></div>
          <div>Total dia<strong>{selected.total}</strong></div>
        </section>
      )}
    </main>
  );
}

function ExportView({ dashboard, date, sidebarCollapsed, onToggleSidebar }) {
  return (
    <main className="content narrow">
      <header className="topbar">
        <HeaderTitle title="Exportacion a Excel" subtitle="Archivo CSV separado por punto y coma" sidebarCollapsed={sidebarCollapsed} onToggleSidebar={onToggleSidebar} />
        <button className="primaryButton" onClick={() => downloadCsv(`produccion_${date}.csv`, dashboard)}>
          <FileSpreadsheet size={16} />
          Exportar grilla completa
        </button>
      </header>

      <section className="exportPreview">
        <ProductionTable dashboard={dashboard} compact />
      </section>
    </main>
  );
}

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(today());
  const [shiftId, setShiftId] = useState('2');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [importingArticles, setImportingArticles] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState('');
  const liveSyncingRef = React.useRef(false);

  async function loadDashboard(dateValue = selectedDate, options = {}) {
    if (!options.silent) {
      setLoading(true);
    }
    if (!options.keepError) {
      setError('');
    }

    try {
      const data = await fetchJson(`/api/dashboard?fecha=${dateValue}`);
      setDashboard(data);
      setLastUpdate(new Date().toLocaleString('es-AR'));
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  }

  async function syncLiveDashboard() {
    if (liveSyncingRef.current) {
      return;
    }

    liveSyncingRef.current = true;

    try {
      const result = await fetchJson('/api/live-sync', {
        method: 'POST',
        body: JSON.stringify({})
      });

      await loadDashboard(result.fecha || selectedDate, { silent: true, keepError: true });
    } catch (syncError) {
      setError(syncError.message);
    } finally {
      liveSyncingRef.current = false;
    }
  }

  async function importCurrentCsv() {
    setImporting(true);
    setError('');

    try {
      const result = await fetchJson('/api/import', {
        method: 'POST',
        body: JSON.stringify({ fecha: selectedDate })
      });

      if (result.fecha !== selectedDate) {
        setSelectedDate(result.fecha);
      } else {
        await loadDashboard(result.fecha);
      }
    } catch (importError) {
      setError(importError.message);
    } finally {
      setImporting(false);
    }
  }

  async function importArticles() {
    setImportingArticles(true);
    setError('');

    try {
      await fetchJson('/api/import-articulos', {
        method: 'POST',
        body: JSON.stringify({})
      });
      await loadDashboard(selectedDate);
    } catch (importError) {
      setError(importError.message);
    } finally {
      setImportingArticles(false);
    }
  }

  useEffect(() => {
    loadDashboard(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (activeView !== 'dashboard' || selectedDate !== today()) {
      return undefined;
    }

    syncLiveDashboard();
    const intervalId = window.setInterval(syncLiveDashboard, 10000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [activeView, selectedDate]);

  const content = useMemo(() => {
    if (loading) {
      return <main className="content"><div className="loading"><Loader2 className="spin" />Cargando datos</div></main>;
    }

    if (!dashboard) {
      return <main className="content"><div className="emptyState"><Search />Sin datos para mostrar</div></main>;
    }

    if (activeView === 'dashboard') {
      return (
        <DashboardView
          dashboard={dashboard}
          date={selectedDate}
          onDateChange={setSelectedDate}
          onImport={importCurrentCsv}
          onImportArticles={importArticles}
          importing={importing}
          importingArticles={importingArticles}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
        />
      );
    }

    if (activeView === 'turno') {
      return <ShiftView dashboard={dashboard} date={selectedDate} onDateChange={setSelectedDate} shiftId={shiftId} onShiftChange={setShiftId} sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed((value) => !value)} />;
    }

    if (activeView === 'historial') {
      return <HistoryView dashboard={dashboard} date={selectedDate} onDateChange={setSelectedDate} sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed((value) => !value)} />;
    }

    if (activeView === 'detalle') {
      return <DetailView dashboard={dashboard} date={selectedDate} onDateChange={setSelectedDate} sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed((value) => !value)} />;
    }

    if (activeView === 'exportar') {
      return <ExportView dashboard={dashboard} date={selectedDate} sidebarCollapsed={sidebarCollapsed} onToggleSidebar={() => setSidebarCollapsed((value) => !value)} />;
    }

    return <DashboardView
      dashboard={dashboard}
      date={selectedDate}
      onDateChange={setSelectedDate}
      onImport={importCurrentCsv}
      onImportArticles={importArticles}
      importing={importing}
      importingArticles={importingArticles}
      sidebarCollapsed={sidebarCollapsed}
      onToggleSidebar={() => setSidebarCollapsed((value) => !value)}
    />;
  }, [activeView, dashboard, importing, importingArticles, loading, selectedDate, shiftId]);

  return (
    <div className={sidebarCollapsed ? 'appShell sidebarCollapsed' : 'appShell'}>
      <Sidebar
        activeView={activeView}
        onViewChange={setActiveView}
        lastUpdate={lastUpdate}
      />
      <div className="mainShell">
        {error && <div className="toast">{error}</div>}
        {content}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
