import React, { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const C = {
  bg: "#12161A",
  panel: "#1B2127",
  border: "#2A323A",
  text: "#E8E6E1",
  textDim: "#8B9299",
  amber: "#F2A93B",
  amberDim: "#5C4620",
  teal: "#3FA796",
  tealDim: "#1B3934",
};
const CHART_COLORS = ["#F2A93B", "#3FA796", "#E5484D", "#8B9299", "#C58B4A", "#4A90A4"];

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function startOfWeek(d) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // lundi = premier jour
  x.setDate(x.getDate() + diff);
  return startOfDay(x);
}
function endOfWeek(d) {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  return endOfDay(e);
}

function formatDate(ts) {
  return new Date(ts).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}
function formatDur(ms) {
  if (ms == null) return "—";
  const totalMinutes = Math.round(ms / 60000);
  if (totalMinutes < 1) return "< 1 min";
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export default function ReportModal({ log, onClose }) {
  const [mode, setMode] = useState("day");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const refDate = new Date(selectedDate + "T12:00:00");

  const { start, end, rangeLabel } = useMemo(() => {
    if (mode === "day") {
      return {
        start: startOfDay(refDate),
        end: endOfDay(refDate),
        rangeLabel: refDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      };
    }
    const s = startOfWeek(refDate);
    const e = endOfWeek(refDate);
    return { start: s, end: e, rangeLabel: `Semaine du ${s.toLocaleDateString("fr-FR")} au ${e.toLocaleDateString("fr-FR")}` };
  }, [mode, selectedDate]);

  const filtered = useMemo(() => {
    return log
      .filter((entry) => {
        const ts = entry.createdAt ?? entry.id;
        return ts >= start.getTime() && ts <= end.getTime();
      })
      .sort((a, b) => (b.createdAt ?? b.id) - (a.createdAt ?? a.id));
  }, [log, start, end]);

  const byService = useMemo(() => {
    const map = {};
    filtered.forEach((e) => {
      map[e.serviceName] = (map[e.serviceName] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }, [filtered]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const urgent = filtered.filter((e) => e.priority === "urgent").length;
    const resolved = filtered.filter((e) => e.status === "traité" && e.resolvedAt);
    const avgMs = resolved.length
      ? resolved.reduce((sum, e) => sum + (e.resolvedAt - (e.createdAt ?? e.id)), 0) / resolved.length
      : null;
    return { total, urgent, resolvedCount: resolved.length, avgMs };
  }, [filtered]);

  function exportExcel() {
    const rows = filtered.map((e) => ({
      Date: formatDate(e.createdAt ?? e.id),
      Service: e.serviceName,
      Priorité: e.priority === "urgent" ? "Urgent" : "Normal",
      Canal: e.channel === "whatsapp" ? "WhatsApp" : "E-mail",
      Statut: e.status,
      "Durée résolution": e.resolvedAt ? formatDur(e.resolvedAt - (e.createdAt ?? e.id)) : "—",
      Commentaire: e.comment,
    }));
    const summaryRows = byService.map((s) => ({ Service: s.name, "Nombre d'alertes": s.count }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Détail alertes");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Récap par service");
    XLSX.writeFile(wb, `rapport-mezzanine-${mode}-${selectedDate}.xlsx`);
  }

  function exportPdf() {
    const docPdf = new jsPDF();
    docPdf.setFontSize(14);
    docPdf.text("MEZZANINE UAP03 — Rapport d'alertes", 14, 16);
    docPdf.setFontSize(10);
    docPdf.text(rangeLabel, 14, 23);
    docPdf.text(
      `Total : ${stats.total}  |  Urgentes : ${stats.urgent}  |  Traitées : ${stats.resolvedCount}  |  Durée moy. : ${formatDur(stats.avgMs)}`,
      14,
      29
    );
    autoTable(docPdf, {
      startY: 35,
      head: [["Service", "Nb alertes"]],
      body: byService.map((s) => [s.name, String(s.count)]),
      styles: { fontSize: 9 },
    });
    autoTable(docPdf, {
      startY: docPdf.lastAutoTable.finalY + 8,
      head: [["Date", "Service", "Priorité", "Canal", "Statut", "Durée", "Commentaire"]],
      body: filtered.map((e) => [
        formatDate(e.createdAt ?? e.id),
        e.serviceName,
        e.priority === "urgent" ? "Urgent" : "Normal",
        e.channel === "whatsapp" ? "WhatsApp" : "E-mail",
        e.status,
        e.resolvedAt ? formatDur(e.resolvedAt - (e.createdAt ?? e.id)) : "—",
        e.comment,
      ]),
      styles: { fontSize: 8 },
      columnStyles: { 6: { cellWidth: 50 } },
    });
    docPdf.save(`rapport-mezzanine-${mode}-${selectedDate}.pdf`);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4" style={{ background: C.bg }}>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold" style={{ color: C.text, fontFamily: "'Barlow Condensed', sans-serif" }}>
            📊 Rapport d'alertes
          </h2>
          <button onClick={onClose} className="px-3 py-2 rounded text-sm" style={{ color: C.textDim, border: `1px solid ${C.border}` }}>
            Fermer
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <button
            onClick={() => setMode("day")}
            className="px-4 py-2 rounded text-sm font-semibold"
            style={{ background: mode === "day" ? C.amber : "transparent", color: mode === "day" ? "#1A1300" : C.textDim, border: `1px solid ${C.border}` }}
          >
            Jour
          </button>
          <button
            onClick={() => setMode("week")}
            className="px-4 py-2 rounded text-sm font-semibold"
            style={{ background: mode === "week" ? C.amber : "transparent", color: mode === "week" ? "#1A1300" : C.textDim, border: `1px solid ${C.border}` }}
          >
            Semaine
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded text-sm"
            style={{ background: C.panel, border: `1px solid ${C.border}`, color: C.text }}
          />
        </div>

        <p className="text-sm mb-4" style={{ color: C.textDim }}>
          {rangeLabel}
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total alertes", value: stats.total },
            { label: "Urgentes", value: stats.urgent },
            { label: "Traitées", value: stats.resolvedCount },
            { label: "Durée moy.", value: formatDur(stats.avgMs) },
          ].map((c) => (
            <div key={c.label} className="rounded p-3" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
              <div className="text-xs" style={{ color: C.textDim }}>
                {c.label}
              </div>
              <div className="text-xl font-bold" style={{ color: C.text }}>
                {c.value}
              </div>
            </div>
          ))}
        </div>

        {byService.length > 0 && (
          <div className="rounded p-3 mb-6" style={{ background: C.panel, border: `1px solid ${C.border}`, height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byService}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="name" stroke={C.textDim} fontSize={11} />
                <YAxis stroke={C.textDim} allowDecimals={false} fontSize={11} />
                <Tooltip contentStyle={{ background: C.panel, border: `1px solid ${C.border}`, color: C.text }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {byService.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <button
            onClick={exportExcel}
            disabled={!filtered.length}
            className="flex-1 py-2.5 rounded text-sm font-semibold"
            style={{ background: filtered.length ? C.teal : C.tealDim, color: filtered.length ? "#08201C" : C.textDim }}
          >
            📊 Exporter en Excel
          </button>
          <button
            onClick={exportPdf}
            disabled={!filtered.length}
            className="flex-1 py-2.5 rounded text-sm font-semibold"
            style={{ background: filtered.length ? C.amber : C.amberDim, color: filtered.length ? "#1A1300" : C.textDim }}
          >
            📄 Exporter en PDF
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded p-6 text-sm text-center" style={{ background: C.panel, border: `1px dashed ${C.border}`, color: C.textDim }}>
            Aucune alerte sur cette période.
          </div>
        ) : (
          <div className="flex flex-col gap-2 pb-6">
            {filtered.map((e) => (
              <div key={e.id} className="rounded p-3 text-sm" style={{ background: C.panel, border: `1px solid ${C.border}`, color: C.text }}>
                <div className="flex justify-between flex-wrap gap-2">
                  <span className="font-semibold">{e.serviceName}</span>
                  <span style={{ color: C.textDim, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
                    {formatDate(e.createdAt ?? e.id)}
                  </span>
                </div>
                <div style={{ color: C.textDim, fontSize: 12 }}>{e.comment}</div>
                {e.resolvedAt && (
                  <div style={{ color: C.teal, fontSize: 11, marginTop: 2 }}>
                    ✓ résolu en {formatDur(e.resolvedAt - (e.createdAt ?? e.id))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
