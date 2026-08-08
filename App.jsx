import React, { useState, useRef, useEffect } from "react";

// ---- Design tokens ----
const COLORS = {
  bg: "#12161A",
  panel: "#1B2127",
  panelBorder: "#2A323A",
  text: "#E8E6E1",
  textDim: "#8B9299",
  amber: "#F2A93B",
  amberDim: "#5C4620",
  red: "#E5484D",
  redDim: "#3D1F21",
  teal: "#3FA796",
  tealDim: "#1B3934",
};

const SOURCE_EMAIL = "medamine.1983@gmail.com"; // Adresse source : Production

const DEFAULT_SERVICES = [
  { id: "maintenance", name: "Maintenance", code: "MTN", emails: ["maintenance@usine.local"] },
  { id: "qualite", name: "Qualité", code: "QLT", emails: ["qualite@usine.local"] },
  { id: "logistique", name: "Logistique", code: "LOG", emails: ["logistique@usine.local"] },
  { id: "methodes", name: "Méthodes", code: "MTH", emails: ["methodes@usine.local"] },
  { id: "informatique", name: "Informatique", code: "INF", emails: ["informatique@usine.local"] },
  { id: "rh", name: "Ressources Humaines", code: "RH", emails: ["rh@usine.local"] },
];

function nowLabel() {
  const d = new Date();
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function buildMailtoUrl(service, comment) {
  const subject = `Alerte production · ${service.name}`;
  const body = `Bonjour,\n\nLa production signale un problème concernant : ${service.name}.\n\nCommentaire :\n${comment}\n\n— Envoyé depuis le tableau d'interchangeabilité (${SOURCE_EMAIL})`;
  const to = service.emails.join(",");
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function StatusLed({ active }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: active ? COLORS.red : COLORS.teal,
        boxShadow: active ? `0 0 10px 2px ${COLORS.red}` : `0 0 6px 1px ${COLORS.teal}`,
        animation: active ? "pulse 1.4s ease-in-out infinite" : "none",
      }}
    />
  );
}

function AlertModal({ service, onClose, onSend }) {
  const [comment, setComment] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded p-6"
        style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}` }}
      >
        <div className="flex items-center gap-2 mb-1">
          <StatusLed active={true} />
          <span
            className="text-xs uppercase tracking-widest"
            style={{ color: COLORS.amber, fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Alerte · {service.code}
          </span>
        </div>
        <h2 className="text-xl font-semibold mb-3" style={{ color: COLORS.text, fontFamily: "'Barlow Condensed', sans-serif" }}>
          Alerter {service.name}
        </h2>

        <div
          className="rounded p-3 mb-4 text-xs"
          style={{ background: COLORS.bg, border: `1px solid ${COLORS.panelBorder}`, color: COLORS.textDim, fontFamily: "'IBM Plex Mono', monospace" }}
        >
          <div>
            De : <span style={{ color: COLORS.text }}>{SOURCE_EMAIL}</span>
            <span style={{ color: COLORS.textDim }}> (compte par défaut de l'appli mail)</span>
          </div>
          <div className="mt-1">
            À :{" "}
            <span style={{ color: COLORS.text }}>
              {service.emails.length ? service.emails.join(", ") : "aucun destinataire configuré"}
            </span>
          </div>
        </div>

        <label className="block text-sm mb-2" style={{ color: COLORS.textDim }}>
          Décrivez le problème rencontré en production
        </label>
        <textarea
          ref={textareaRef}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={5}
          placeholder="Ex : arrêt du poste 4, capteur ESD hors service…"
          className="w-full rounded p-3 text-sm mb-4 resize-none focus:outline-none"
          style={{
            background: COLORS.bg,
            border: `1px solid ${COLORS.panelBorder}`,
            color: COLORS.text,
          }}
        />
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-sm"
            style={{ color: COLORS.textDim, background: "transparent", border: `1px solid ${COLORS.panelBorder}` }}
          >
            Annuler
          </button>
          <button
            disabled={!comment.trim()}
            onClick={() => {
              const trimmed = comment.trim();
              window.open(buildMailtoUrl(service, trimmed), "_self");
              onSend(trimmed);
            }}
            className="px-5 py-2 rounded text-sm font-semibold"
            style={{
              background: comment.trim() ? COLORS.amber : COLORS.amberDim,
              color: comment.trim() ? "#1A1300" : COLORS.textDim,
              cursor: comment.trim() ? "pointer" : "not-allowed",
            }}
          >
            Alerter
          </button>
        </div>
      </div>
    </div>
  );
}

function AddServiceModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const nameRef = useRef(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const canCreate = name.trim() && code.trim() && email.trim();

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded p-6"
        style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}` }}
      >
        <div
          className="text-xs uppercase tracking-widest mb-1"
          style={{ color: COLORS.teal, fontFamily: "'IBM Plex Mono', monospace" }}
        >
          Nouveau service
        </div>
        <h2 className="text-xl font-semibold mb-4" style={{ color: COLORS.text, fontFamily: "'Barlow Condensed', sans-serif" }}>
          Ajouter un service support
        </h2>

        <label className="block text-sm mb-1" style={{ color: COLORS.textDim }}>
          Nom du service
        </label>
        <input
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex : Sécurité"
          className="w-full rounded p-2.5 text-sm mb-3 focus:outline-none"
          style={{ background: COLORS.bg, border: `1px solid ${COLORS.panelBorder}`, color: COLORS.text }}
        />

        <label className="block text-sm mb-1" style={{ color: COLORS.textDim }}>
          Code (3 lettres)
        </label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
          placeholder="Ex : SEC"
          className="w-full rounded p-2.5 text-sm mb-3 focus:outline-none"
          style={{ background: COLORS.bg, border: `1px solid ${COLORS.panelBorder}`, color: COLORS.text }}
        />

        <label className="block text-sm mb-1" style={{ color: COLORS.textDim }}>
          E-mail de contact
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Ex : securite@usine.local"
          className="w-full rounded p-2.5 text-sm mb-5 focus:outline-none"
          style={{ background: COLORS.bg, border: `1px solid ${COLORS.panelBorder}`, color: COLORS.text }}
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-sm"
            style={{ color: COLORS.textDim, background: "transparent", border: `1px solid ${COLORS.panelBorder}` }}
          >
            Annuler
          </button>
          <button
            disabled={!canCreate}
            onClick={() =>
              onCreate({ id: `${code.trim().toLowerCase()}-${Date.now()}`, name: name.trim(), code: code.trim(), emails: [email.trim()] })
            }
            className="px-5 py-2 rounded text-sm font-semibold"
            style={{
              background: canCreate ? COLORS.teal : COLORS.tealDim,
              color: canCreate ? "#08201C" : COLORS.textDim,
              cursor: canCreate ? "pointer" : "not-allowed",
            }}
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}

function AddServicePanel({ onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md flex flex-col items-center justify-center gap-2 min-h-[168px] transition-colors"
      style={{ background: "transparent", border: `1px dashed ${COLORS.panelBorder}`, color: COLORS.textDim }}
    >
      <span className="text-3xl leading-none" style={{ color: COLORS.teal }}>
        +
      </span>
      <span className="text-sm">Ajouter un service</span>
    </button>
  );
}

function ServiceDetailModal({ service, onClose, onAddEmail, onRemoveEmail }) {
  const [newEmail, setNewEmail] = useState("");
  const inputRef = useRef(null);

  function submitEmail() {
    const trimmed = newEmail.trim();
    if (!trimmed) return;
    onAddEmail(service.id, trimmed);
    setNewEmail("");
    inputRef.current?.focus();
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded p-6"
        style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}` }}
      >
        <div
          className="text-xs uppercase tracking-widest mb-1"
          style={{ color: COLORS.textDim, fontFamily: "'IBM Plex Mono', monospace" }}
        >
          {service.code}
        </div>
        <h2 className="text-xl font-semibold mb-4" style={{ color: COLORS.text, fontFamily: "'Barlow Condensed', sans-serif" }}>
          {service.name} — destinataires
        </h2>

        <div className="flex flex-col gap-2 mb-4">
          {service.emails.length === 0 ? (
            <p className="text-sm" style={{ color: COLORS.textDim }}>
              Aucun destinataire configuré.
            </p>
          ) : (
            service.emails.map((email) => (
              <div
                key={email}
                className="flex items-center justify-between rounded px-3 py-2 text-sm"
                style={{ background: COLORS.bg, border: `1px solid ${COLORS.panelBorder}`, color: COLORS.text }}
              >
                <span className="truncate">{email}</span>
                <button
                  onClick={() => onRemoveEmail(service.id, email)}
                  className="text-xs px-2 py-1 rounded ml-2 shrink-0"
                  style={{ color: COLORS.red, border: `1px solid ${COLORS.redDim}` }}
                >
                  Supprimer
                </button>
              </div>
            ))
          )}
        </div>

        <label className="block text-sm mb-1" style={{ color: COLORS.textDim }}>
          Ajouter un destinataire
        </label>
        <div className="flex gap-2 mb-5">
          <input
            ref={inputRef}
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitEmail()}
            placeholder="nom@usine.local"
            className="flex-1 min-w-0 rounded p-2.5 text-sm focus:outline-none"
            style={{ background: COLORS.bg, border: `1px solid ${COLORS.panelBorder}`, color: COLORS.text }}
          />
          <button
            onClick={submitEmail}
            disabled={!newEmail.trim()}
            className="px-4 rounded text-sm font-semibold shrink-0"
            style={{
              background: newEmail.trim() ? COLORS.teal : COLORS.tealDim,
              color: newEmail.trim() ? "#08201C" : COLORS.textDim,
              cursor: newEmail.trim() ? "pointer" : "not-allowed",
            }}
          >
            Ajouter
          </button>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-sm"
            style={{ color: COLORS.textDim, background: "transparent", border: `1px solid ${COLORS.panelBorder}` }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}

function ServicePanel({ service, active, alertCount, onAlert, onOpenDetail }) {
  return (
    <div
      onClick={() => onOpenDetail(service)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpenDetail(service)}
      className="rounded-md overflow-hidden flex flex-col cursor-pointer"
      style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}` }}
    >
      <div
        style={{
          height: 4,
          background: active ? COLORS.red : COLORS.teal,
          boxShadow: active ? `0 0 8px ${COLORS.red}` : "none",
        }}
      />
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div
              className="text-[11px] uppercase tracking-widest mb-1"
              style={{ color: COLORS.textDim, fontFamily: "'IBM Plex Mono', monospace" }}
            >
              {service.code}
            </div>
            <div className="text-lg font-semibold leading-tight" style={{ color: COLORS.text, fontFamily: "'Barlow Condensed', sans-serif" }}>
              {service.name}
            </div>
          </div>
          <StatusLed active={active} />
        </div>

        <div className="text-sm mb-1" style={{ color: COLORS.textDim }}>
          {alertCount === 0
            ? "Aucune alerte en cours"
            : `${alertCount} alerte${alertCount > 1 ? "s" : ""} envoyée${alertCount > 1 ? "s" : ""}`}
        </div>
        <div className="text-xs mb-4" style={{ color: COLORS.textDim }}>
          {service.emails.length} destinataire{service.emails.length > 1 ? "s" : ""} · clic pour gérer
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAlert(service);
          }}
          className="mt-auto w-full py-2 rounded text-sm font-semibold transition-opacity"
          style={{
            background: active ? COLORS.redDim : "transparent",
            border: `1px solid ${active ? COLORS.red : COLORS.amber}`,
            color: active ? COLORS.red : COLORS.amber,
          }}
        >
          Alerter
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [services, setServices] = useState(DEFAULT_SERVICES);
  const [modalService, setModalService] = useState(null);
  const [detailService, setDetailService] = useState(null);
  const [showAddService, setShowAddService] = useState(false);
  const [log, setLog] = useState([]); // {id, serviceId, comment, time, status}
  const [toast, setToast] = useState(null);

  function handleCreateService(newService) {
    setServices((prev) => [...prev, newService]);
    setShowAddService(false);
    setToast(`Service "${newService.name}" ajouté`);
    setTimeout(() => setToast(null), 3000);
  }

  function handleAddEmail(serviceId, email) {
    setServices((prev) =>
      prev.map((s) =>
        s.id === serviceId && !s.emails.includes(email) ? { ...s, emails: [...s.emails, email] } : s
      )
    );
    setDetailService((prev) =>
      prev && prev.id === serviceId && !prev.emails.includes(email)
        ? { ...prev, emails: [...prev.emails, email] }
        : prev
    );
  }

  function handleRemoveEmail(serviceId, email) {
    setServices((prev) =>
      prev.map((s) => (s.id === serviceId ? { ...s, emails: s.emails.filter((e) => e !== email) } : s))
    );
    setDetailService((prev) =>
      prev && prev.id === serviceId ? { ...prev, emails: prev.emails.filter((e) => e !== email) } : prev
    );
  }

  const alertsByService = (id) => log.filter((l) => l.serviceId === id && l.status === "nouveau").length;
  const isActive = (id) => alertsByService(id) > 0;

  function handleSend(comment) {
    const entry = {
      id: Date.now(),
      serviceId: modalService.id,
      serviceName: modalService.name,
      comment,
      time: nowLabel(),
      status: "nouveau",
    };
    setLog((prev) => [entry, ...prev]);
    setToast(
      modalService.emails.length
        ? `Application mail ouverte vers ${modalService.emails.join(", ")}`
        : "Alerte enregistrée (aucun destinataire configuré)"
    );
    setModalService(null);
    setTimeout(() => setToast(null), 3500);
  }

  function resolveEntry(id) {
    setLog((prev) => prev.map((l) => (l.id === id ? { ...l, status: "traité" } : l)));
  }

  return (
    <div className="min-h-screen w-full" style={{ background: COLORS.bg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
      `}</style>

      <div className="max-w-5xl mx-auto px-5 py-8" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div className="mb-8">
          <div
            className="text-xs uppercase tracking-[0.2em] mb-2"
            style={{ color: COLORS.amber, fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Tableau d'interchangeabilité
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold"
            style={{ color: COLORS.text, fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            Production ↔ Services support
          </h1>
          <p className="text-sm mt-2" style={{ color: COLORS.textDim }}>
            Sélectionnez un service pour envoyer une alerte accompagnée d'un commentaire.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {services.map((s) => (
            <ServicePanel
              key={s.id}
              service={s}
              active={isActive(s.id)}
              alertCount={alertsByService(s.id)}
              onAlert={setModalService}
              onOpenDetail={setDetailService}
            />
          ))}
          <AddServicePanel onClick={() => setShowAddService(true)} />
        </div>

        <div>
          <h2
            className="text-sm uppercase tracking-widest mb-3"
            style={{ color: COLORS.textDim, fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Historique des alertes
          </h2>
          {log.length === 0 ? (
            <div
              className="rounded p-6 text-sm text-center"
              style={{ background: COLORS.panel, border: `1px dashed ${COLORS.panelBorder}`, color: COLORS.textDim }}
            >
              Aucune alerte envoyée pour le moment.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {log.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded p-3 flex items-start gap-3"
                  style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}` }}
                >
                  <StatusLed active={entry.status === "nouveau"} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold" style={{ color: COLORS.text }}>
                        {entry.serviceName}
                      </span>
                      <span
                        className="text-[11px]"
                        style={{ color: COLORS.textDim, fontFamily: "'IBM Plex Mono', monospace" }}
                      >
                        {entry.time}
                      </span>
                      <span
                        className="text-[11px] px-2 py-0.5 rounded-full"
                        style={{
                          color: entry.status === "nouveau" ? COLORS.red : COLORS.teal,
                          background: entry.status === "nouveau" ? COLORS.redDim : COLORS.tealDim,
                        }}
                      >
                        {entry.status}
                      </span>
                    </div>
                    <p className="text-sm mt-1 break-words" style={{ color: COLORS.textDim }}>
                      {entry.comment}
                    </p>
                  </div>
                  {entry.status === "nouveau" && (
                    <button
                      onClick={() => resolveEntry(entry.id)}
                      className="text-xs px-3 py-1.5 rounded self-center"
                      style={{ border: `1px solid ${COLORS.panelBorder}`, color: COLORS.textDim }}
                    >
                      Marquer traité
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {modalService && (
        <AlertModal service={modalService} onClose={() => setModalService(null)} onSend={handleSend} />
      )}

      {showAddService && (
        <AddServiceModal onClose={() => setShowAddService(false)} onCreate={handleCreateService} />
      )}

      {detailService && (
        <ServiceDetailModal
          service={detailService}
          onClose={() => setDetailService(null)}
          onAddEmail={handleAddEmail}
          onRemoveEmail={handleRemoveEmail}
        />
      )}

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded text-sm font-medium z-50"
          style={{ background: COLORS.teal, color: "#08201C" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
