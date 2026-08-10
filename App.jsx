import React, { useState, useRef, useEffect } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth } from "./firebase";
import ReportModal from "./Report";
import Login from "./Login";

const STATE_DOC = doc(db, "mezzanine", "state");

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

const DEFAULT_SOURCE_EMAIL = "medamine.1983@gmail.com"; // Adresse source par défaut : Production

const DEFAULT_SERVICES = [
  { id: "maintenance", name: "Maintenance", code: "MTN", emails: ["maintenance@usine.local"], phones: [] },
  { id: "qualite", name: "Qualité", code: "QLT", emails: ["qualite@usine.local"], phones: [] },
  { id: "logistique", name: "Logistique", code: "LOG", emails: ["logistique@usine.local"], phones: [] },
  { id: "methodes", name: "Méthodes", code: "MTH", emails: ["methodes@usine.local"], phones: [] },
  { id: "informatique", name: "Informatique", code: "INF", emails: ["informatique@usine.local"], phones: [] },
  { id: "rh", name: "Ressources Humaines", code: "RH", emails: ["rh@usine.local"], phones: [] },
];

function nowLabel() {
  const d = new Date();
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDuration(ms) {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  if (totalMinutes < 1) return "< 1 min";
  if (totalMinutes < 60) return `${totalMinutes} min`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

function buildMailtoUrl(service, comment, sourceEmail, priority = "normal") {
  const prefix = priority === "urgent" ? "🔴 URGENT · " : "";
  const subject = `${prefix}Alerte production · ${service.name}`;
  const body = `Bonjour,\n\nLa production signale un problème ${priority === "urgent" ? "URGENT " : ""}concernant : ${service.name}.\n\nCommentaire :\n${comment}\n\n— Envoyé depuis DECAPUS (${sourceEmail})`;
  const to = service.emails.join(",");
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

// WhatsApp (wa.me) ne peut cibler qu'UN SEUL numéro à la fois — on utilise
// donc toujours le premier numéro de la liste du service.
function buildWhatsappUrl(service, comment, priority = "normal", phoneOverride = null) {
  const phone = phoneOverride ?? (service.phones ?? [])[0];
  if (!phone) return null;
  const prefix = priority === "urgent" ? "🔴 *URGENT*\n" : "";
  const text = `${prefix}Alerte production — ${service.name}\n\n${comment}\n\n— DECAPUS`;
  const digitsOnly = phone.replace(/[^\d+]/g, "");
  return `https://wa.me/${digitsOnly}?text=${encodeURIComponent(text)}`;
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

function PrioritySelector({ priority, onChange }) {
  return (
    <div className="flex gap-2 mb-4">
      {[
        { value: "normal", label: "Normal" },
        { value: "urgent", label: "🔴 Urgent" },
      ].map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className="flex-1 py-2 rounded text-sm font-semibold"
          style={{
            background: priority === opt.value ? (opt.value === "urgent" ? COLORS.redDim : COLORS.tealDim) : "transparent",
            border: `1px solid ${priority === opt.value ? (opt.value === "urgent" ? COLORS.red : COLORS.teal) : COLORS.panelBorder}`,
            color: priority === opt.value ? (opt.value === "urgent" ? COLORS.red : COLORS.teal) : COLORS.textDim,
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function AlertModal({ service, sourceEmail, onClose, onSend }) {
  const [comment, setComment] = useState("");
  const [priority, setPriority] = useState("normal");
  const [waIndex, setWaIndex] = useState(0); // 0 = pas en cours, 1..n = envoi séquentiel WhatsApp
  const textareaRef = useRef(null);
  const phones = service.phones ?? [];

  useEffect(() => {
    if (waIndex === 0) textareaRef.current?.focus();
  }, [waIndex]);

  function startWhatsapp() {
    const trimmed = comment.trim();
    if (phones.length <= 1) {
      const url = buildWhatsappUrl(service, trimmed, priority);
      if (url) window.open(url, "_blank");
      onSend(trimmed, priority, "whatsapp");
    } else {
      setWaIndex(1);
    }
  }

  function openWaStep() {
    const trimmed = comment.trim();
    const url = buildWhatsappUrl(service, trimmed, priority, phones[waIndex - 1]);
    if (url) window.open(url, "_blank");
  }

  function nextWaStep() {
    if (waIndex < phones.length) {
      setWaIndex(waIndex + 1);
    } else {
      onSend(comment.trim(), priority, "whatsapp");
    }
  }

  if (waIndex > 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: "rgba(0,0,0,0.6)" }}>
        <div className="w-full max-w-md rounded p-6" style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}` }}>
          <div className="text-xs uppercase tracking-widest mb-1" style={{ color: "#25D366", fontFamily: "'IBM Plex Mono', monospace" }}>
            WhatsApp · numéro {waIndex} / {phones.length}
          </div>
          <h2 className="text-xl font-semibold mb-3" style={{ color: COLORS.text, fontFamily: "'Barlow Condensed', sans-serif" }}>
            {phones[waIndex - 1]}
          </h2>
          <p className="text-sm mb-5 break-words" style={{ color: COLORS.textDim }}>
            {comment.trim()}
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={openWaStep}
              className="w-full py-2.5 rounded text-sm font-semibold"
              style={{ background: "#25D366", color: "#08201C" }}
            >
              Ouvrir WhatsApp pour ce numéro
            </button>
            <button
              onClick={nextWaStep}
              className="w-full py-2.5 rounded text-sm"
              style={{ color: COLORS.text, border: `1px solid ${COLORS.panelBorder}` }}
            >
              {waIndex < phones.length ? "Envoyé — numéro suivant →" : "Envoyé — terminer"}
            </button>
          </div>
        </div>
      </div>
    );
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
            De : <span style={{ color: COLORS.text }}>{sourceEmail}</span>
          </div>
          <div className="mt-1">
            ✉ E-mail :{" "}
            <span style={{ color: COLORS.text }}>
              {service.emails.length ? service.emails.join(", ") : "aucun"}
            </span>
          </div>
          <div className="mt-1">
            💬 WhatsApp :{" "}
            <span style={{ color: COLORS.text }}>
              {phones.length ? `${phones.join(", ")}${phones.length > 1 ? " (envoi séquentiel)" : ""}` : "aucun"}
            </span>
          </div>
        </div>

        <label className="block text-sm mb-2" style={{ color: COLORS.textDim }}>
          Priorité
        </label>
        <PrioritySelector priority={priority} onChange={setPriority} />

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

        <label className="block text-sm mb-2" style={{ color: COLORS.textDim }}>
          Choisir le canal d'alerte
        </label>
        <div className="flex flex-col gap-2 mb-4">
          <button
            disabled={!comment.trim()}
            onClick={() => {
              const trimmed = comment.trim();
              window.open(buildMailtoUrl(service, trimmed, sourceEmail, priority), "_self");
              onSend(trimmed, priority, "email");
            }}
            className="w-full py-2.5 rounded text-sm font-semibold"
            style={{
              background: comment.trim() ? COLORS.amber : COLORS.amberDim,
              color: comment.trim() ? "#1A1300" : COLORS.textDim,
              cursor: comment.trim() ? "pointer" : "not-allowed",
            }}
          >
            📧 Alerter par e-mail
          </button>
          <button
            disabled={!comment.trim() || !phones.length}
            onClick={startWhatsapp}
            className="w-full py-2.5 rounded text-sm font-semibold"
            style={{
              background: comment.trim() && phones.length ? "#25D366" : COLORS.tealDim,
              color: comment.trim() && phones.length ? "#08201C" : COLORS.textDim,
              cursor: comment.trim() && phones.length ? "pointer" : "not-allowed",
            }}
          >
            💬 Alerter par WhatsApp{phones.length > 1 ? ` (${phones.length} numéros)` : ""}
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
              onCreate({ id: `${code.trim().toLowerCase()}-${Date.now()}`, name: name.trim(), code: code.trim(), emails: [email.trim()], phones: [] })
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

function SettingsModal({ currentEmail, onClose, onSave }) {
  const [email, setEmail] = useState(currentEmail);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
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
        <div
          className="text-xs uppercase tracking-widest mb-1"
          style={{ color: COLORS.amber, fontFamily: "'IBM Plex Mono', monospace" }}
        >
          Paramètres
        </div>
        <h2 className="text-xl font-semibold mb-4" style={{ color: COLORS.text, fontFamily: "'Barlow Condensed', sans-serif" }}>
          Adresse d'expéditeur
        </h2>

        <label className="block text-sm mb-1" style={{ color: COLORS.textDim }}>
          E-mail source (production)
        </label>
        <input
          ref={inputRef}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nom@usine.local"
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
            disabled={!email.trim()}
            onClick={() => onSave(email.trim())}
            className="px-5 py-2 rounded text-sm font-semibold"
            style={{
              background: email.trim() ? COLORS.amber : COLORS.amberDim,
              color: email.trim() ? "#1A1300" : COLORS.textDim,
              cursor: email.trim() ? "pointer" : "not-allowed",
            }}
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

function ServiceDetailModal({ service, onClose, onAddEmail, onRemoveEmail, onAddPhone, onRemovePhone }) {
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const inputRef = useRef(null);

  function submitEmail() {
    const trimmed = newEmail.trim();
    if (!trimmed) return;
    onAddEmail(service.id, trimmed);
    setNewEmail("");
    inputRef.current?.focus();
  }

  function submitPhone() {
    const trimmed = newPhone.trim();
    if (!trimmed) return;
    onAddPhone(service.id, trimmed);
    setNewPhone("");
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded p-6 max-h-[85vh] overflow-y-auto"
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

        <div className="text-xs uppercase tracking-widest mb-2" style={{ color: COLORS.amber }}>
          ✉ E-mails
        </div>
        <div className="flex flex-col gap-2 mb-3">
          {service.emails.length === 0 ? (
            <p className="text-sm" style={{ color: COLORS.textDim }}>
              Aucun e-mail configuré.
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
        <div className="flex gap-2 mb-6">
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

        <div className="text-xs uppercase tracking-widest mb-2" style={{ color: "#25D366" }}>
          💬 WhatsApp
        </div>
        {(service.phones ?? []).length > 1 && (
          <p className="text-[11px] mb-2" style={{ color: COLORS.textDim }}>
            WhatsApp ne peut cibler qu'un seul numéro à la fois — le premier de la liste sera utilisé.
          </p>
        )}
        <div className="flex flex-col gap-2 mb-3">
          {(service.phones ?? []).length === 0 ? (
            <p className="text-sm" style={{ color: COLORS.textDim }}>
              Aucun numéro configuré.
            </p>
          ) : (
            (service.phones ?? []).map((phone, i) => (
              <div
                key={phone}
                className="flex items-center justify-between rounded px-3 py-2 text-sm"
                style={{ background: COLORS.bg, border: `1px solid ${COLORS.panelBorder}`, color: COLORS.text }}
              >
                <span className="truncate">
                  {phone} {i === 0 && <span style={{ color: "#25D366" }}>· principal</span>}
                </span>
                <button
                  onClick={() => onRemovePhone(service.id, phone)}
                  className="text-xs px-2 py-1 rounded ml-2 shrink-0"
                  style={{ color: COLORS.red, border: `1px solid ${COLORS.redDim}` }}
                >
                  Supprimer
                </button>
              </div>
            ))
          )}
        </div>
        <div className="flex gap-2 mb-5">
          <input
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitPhone()}
            placeholder="+212600000000"
            className="flex-1 min-w-0 rounded p-2.5 text-sm focus:outline-none"
            style={{ background: COLORS.bg, border: `1px solid ${COLORS.panelBorder}`, color: COLORS.text }}
          />
          <button
            onClick={submitPhone}
            disabled={!newPhone.trim()}
            className="px-4 rounded text-sm font-semibold shrink-0"
            style={{
              background: newPhone.trim() ? "#25D366" : COLORS.tealDim,
              color: newPhone.trim() ? "#08201C" : COLORS.textDim,
              cursor: newPhone.trim() ? "pointer" : "not-allowed",
            }}
          >
            Ajouter
          </button>
        </div>
        <p className="text-[11px] mb-5" style={{ color: COLORS.textDim }}>
          Format international requis, ex : +212600000000 (indicatif pays + numéro, sans espaces).
        </p>

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

function buildMultiMailtoUrl(services, comment, sourceEmail, priority = "normal") {
  const names = services.map((s) => s.name).join(", ");
  const prefix = priority === "urgent" ? "🔴 URGENT · " : "";
  const subject = `${prefix}Alerte production · ${names}`;
  const body = `Bonjour,\n\nLa production signale un problème ${priority === "urgent" ? "URGENT " : ""}concernant : ${names}.\n\nCommentaire :\n${comment}\n\n— Envoyé depuis DECAPUS (${sourceEmail})`;
  const allEmails = [...new Set(services.flatMap((s) => s.emails))];
  const to = allEmails.join(",");
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function MultiAlertModal({ services, sourceEmail, onClose, onFinish }) {
  const [comment, setComment] = useState("");
  const [priority, setPriority] = useState("normal");
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const allEmails = [...new Set(services.flatMap((s) => s.emails))];

  function handleSend() {
    const trimmed = comment.trim();
    window.open(buildMultiMailtoUrl(services, trimmed, sourceEmail, priority), "_self");
    onFinish(trimmed, priority);
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
          style={{ color: COLORS.amber, fontFamily: "'IBM Plex Mono', monospace" }}
        >
          Alerte multiple · {services.length} services
        </div>
        <h2 className="text-xl font-semibold mb-3" style={{ color: COLORS.text, fontFamily: "'Barlow Condensed', sans-serif" }}>
          Alerter {services.map((s) => s.name).join(", ")}
        </h2>

        <div
          className="rounded p-3 mb-4 text-xs"
          style={{ background: COLORS.bg, border: `1px solid ${COLORS.panelBorder}`, color: COLORS.textDim, fontFamily: "'IBM Plex Mono', monospace" }}
        >
          <div>
            De : <span style={{ color: COLORS.text }}>{sourceEmail}</span>
          </div>
          <div className="mt-1">
            À :{" "}
            <span style={{ color: COLORS.text }}>
              {allEmails.length ? allEmails.join(", ") : "aucun destinataire configuré"}
            </span>
          </div>
        </div>

        <label className="block text-sm mb-2" style={{ color: COLORS.textDim }}>
          Priorité
        </label>
        <PrioritySelector priority={priority} onChange={setPriority} />

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
            disabled={!comment.trim()}
            onClick={handleSend}
            className="px-5 py-2 rounded text-sm font-semibold"
            style={{
              background: comment.trim() ? COLORS.amber : COLORS.amberDim,
              color: comment.trim() ? "#1A1300" : COLORS.textDim,
              cursor: comment.trim() ? "pointer" : "not-allowed",
            }}
          >
            Alerter tout le monde
          </button>
        </div>
      </div>
    </div>
  );
}

function ServicePanel({ service, active, alertCount, onAlert, onOpenDetail, selectMode, selected, onToggleSelect }) {
  const handleClick = () => {
    if (selectMode) onToggleSelect(service.id);
    else onOpenDetail(service);
  };

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
      className="rounded-md overflow-hidden flex flex-col cursor-pointer relative"
      style={{
        background: COLORS.panel,
        border: `1px solid ${selectMode && selected ? COLORS.amber : COLORS.panelBorder}`,
      }}
    >
      {selectMode && (
        <div
          className="absolute top-3 right-3 w-5 h-5 rounded flex items-center justify-center text-xs font-bold"
          style={{
            background: selected ? COLORS.amber : "transparent",
            border: `1px solid ${selected ? COLORS.amber : COLORS.panelBorder}`,
            color: "#1A1300",
          }}
        >
          {selected ? "✓" : ""}
        </div>
      )}
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
          {!selectMode && <StatusLed active={active} />}
        </div>

        <div className="text-sm mb-1" style={{ color: COLORS.textDim }}>
          {alertCount === 0
            ? "Aucune alerte en cours"
            : `${alertCount} alerte${alertCount > 1 ? "s" : ""} envoyée${alertCount > 1 ? "s" : ""}`}
        </div>
        <div className="text-xs mb-4" style={{ color: COLORS.textDim }}>
          {selectMode
            ? "Touchez pour sélectionner"
            : `${service.emails.length} destinataire${service.emails.length > 1 ? "s" : ""} · clic pour gérer`}
        </div>

        {!selectMode && (
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
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [authUser, setAuthUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [services, setServices] = useState(DEFAULT_SERVICES);
  const [sourceEmail, setSourceEmail] = useState(DEFAULT_SOURCE_EMAIL);
  const [log, setLog] = useState([]); // {id, serviceId, comment, time, status}
  const [loaded, setLoaded] = useState(false);
  const [modalService, setModalService] = useState(null);
  const [detailService, setDetailService] = useState(null);
  const [showAddService, setShowAddService] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [multiAlertServices, setMultiAlertServices] = useState(null);
  const [toast, setToast] = useState(null);
  const [filterService, setFilterService] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  function toggleSelect(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds([]);
  }

  // Écoute l'état de connexion Firebase (persiste entre les sessions)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthChecked(true);
    });
    return () => unsubscribe();
  }, []);

  // Écoute Firestore en temps réel : toute modification faite depuis
  // n'importe quel appareil est répercutée ici automatiquement.
  // Ne démarre qu'une fois l'utilisateur authentifié.
  useEffect(() => {
    if (!authUser) return;
    const unsubscribe = onSnapshot(
      STATE_DOC,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setServices(data.services ?? DEFAULT_SERVICES);
          setSourceEmail(data.sourceEmail ?? DEFAULT_SOURCE_EMAIL);
          setLog(data.log ?? []);
        } else {
          // Premier lancement : on initialise le document partagé
          setDoc(STATE_DOC, { services: DEFAULT_SERVICES, sourceEmail: DEFAULT_SOURCE_EMAIL, log: [] });
        }
        setLoaded(true);
      },
      (error) => {
        console.error("Erreur de synchronisation Firestore :", error);
        setToast("Connexion à la base partagée impossible");
        setLoaded(true);
      }
    );
    return () => unsubscribe();
  }, [authUser]);

  function handleLogout() {
    signOut(auth);
    setLoaded(false);
  }

  function pushState(partial) {
    setDoc(STATE_DOC, { services, sourceEmail, log, ...partial }, { merge: true });
  }

  function handleSaveSettings(newEmail) {
    pushState({ sourceEmail: newEmail });
    setShowSettings(false);
    setToast("Adresse d'expéditeur mise à jour");
    setTimeout(() => setToast(null), 3000);
  }

  function handleCreateService(newService) {
    pushState({ services: [...services, newService] });
    setShowAddService(false);
    setToast(`Service "${newService.name}" ajouté`);
    setTimeout(() => setToast(null), 3000);
  }

  function handleAddEmail(serviceId, email) {
    const updated = services.map((s) =>
      s.id === serviceId && !s.emails.includes(email) ? { ...s, emails: [...s.emails, email] } : s
    );
    pushState({ services: updated });
    setDetailService((prev) =>
      prev && prev.id === serviceId && !prev.emails.includes(email)
        ? { ...prev, emails: [...prev.emails, email] }
        : prev
    );
  }

  function handleRemoveEmail(serviceId, email) {
    const updated = services.map((s) =>
      s.id === serviceId ? { ...s, emails: s.emails.filter((e) => e !== email) } : s
    );
    pushState({ services: updated });
    setDetailService((prev) =>
      prev && prev.id === serviceId ? { ...prev, emails: prev.emails.filter((e) => e !== email) } : prev
    );
  }

  function handleAddPhone(serviceId, phone) {
    const updated = services.map((s) => {
      if (s.id !== serviceId) return s;
      const phones = s.phones ?? [];
      return phones.includes(phone) ? s : { ...s, phones: [...phones, phone] };
    });
    pushState({ services: updated });
    setDetailService((prev) => {
      if (!prev || prev.id !== serviceId) return prev;
      const phones = prev.phones ?? [];
      return phones.includes(phone) ? prev : { ...prev, phones: [...phones, phone] };
    });
  }

  function handleRemovePhone(serviceId, phone) {
    const updated = services.map((s) =>
      s.id === serviceId ? { ...s, phones: (s.phones ?? []).filter((p) => p !== phone) } : s
    );
    pushState({ services: updated });
    setDetailService((prev) =>
      prev && prev.id === serviceId ? { ...prev, phones: (prev.phones ?? []).filter((p) => p !== phone) } : prev
    );
  }

  const alertsByService = (id) => log.filter((l) => l.serviceId === id && l.status === "nouveau").length;
  const isActive = (id) => alertsByService(id) > 0;

  function handleSend(comment, priority = "normal", channel = "email") {
    const now = Date.now();
    const entry = {
      id: now,
      serviceId: modalService.id,
      serviceName: modalService.name,
      comment,
      time: nowLabel(),
      createdAt: now,
      status: "nouveau",
      priority,
      channel,
    };
    pushState({ log: [entry, ...log].slice(0, 200) });
    setToast(
      channel === "whatsapp"
        ? `WhatsApp ouvert vers ${(modalService.phones ?? [])[0] ?? ""}`
        : modalService.emails.length
        ? `Application mail ouverte vers ${modalService.emails.join(", ")}`
        : "Alerte enregistrée (aucun destinataire configuré)"
    );
    setModalService(null);
    setTimeout(() => setToast(null), 3500);
  }

  function handleMultiAlertFinish(comment, priority = "normal") {
    const now = Date.now();
    const time = nowLabel();
    const entries = multiAlertServices.map((s, i) => ({
      id: now + i,
      serviceId: s.id,
      serviceName: s.name,
      comment,
      time,
      createdAt: now + i,
      status: "nouveau",
      priority,
    }));
    pushState({ log: [...entries, ...log].slice(0, 200) });
    setToast(`Application mail ouverte vers ${multiAlertServices.length} services`);
    setTimeout(() => setToast(null), 3500);
    setMultiAlertServices(null);
    exitSelectMode();
  }

  function resolveEntry(id) {
    const now = Date.now();
    const updated = log.map((l) =>
      l.id === id ? { ...l, status: "traité", resolvedAt: now, resolvedTime: nowLabel() } : l
    );
    pushState({ log: updated });
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: COLORS.bg }}>
        <span className="text-sm" style={{ color: COLORS.textDim, fontFamily: "'IBM Plex Mono', monospace" }}>
          Vérification de la connexion…
        </span>
      </div>
    );
  }

  if (!authUser) {
    return <Login />;
  }

  if (!loaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{ background: COLORS.bg }}>
        <span className="text-sm" style={{ color: COLORS.textDim, fontFamily: "'IBM Plex Mono', monospace" }}>
          Connexion à la base partagée…
        </span>
      </div>
    );
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
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
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
              DECAPUS
            </h1>
            <p className="text-sm mt-2" style={{ color: COLORS.textDim }}>
              {selectMode
                ? `${selectedIds.length} service${selectedIds.length > 1 ? "s" : ""} sélectionné${selectedIds.length > 1 ? "s" : ""}`
                : "Sélectionnez un service pour envoyer une alerte accompagnée d'un commentaire."}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {selectMode ? (
              <button
                onClick={exitSelectMode}
                className="px-3 py-2 rounded text-xs"
                style={{ color: COLORS.textDim, border: `1px solid ${COLORS.panelBorder}`, fontFamily: "'IBM Plex Mono', monospace" }}
              >
                Annuler
              </button>
            ) : (
              <>
                <button
                  onClick={() => setSelectMode(true)}
                  className="px-3 py-2 rounded text-xs"
                  style={{ color: COLORS.amber, border: `1px solid ${COLORS.amber}`, fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  ⊞ Alerte multiple
                </button>
                <button
                  onClick={() => setShowReport(true)}
                  className="px-3 py-2 rounded text-xs"
                  style={{ color: COLORS.teal, border: `1px solid ${COLORS.teal}`, fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  📊 Rapport
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-3 py-2 rounded text-xs"
                  style={{ color: COLORS.textDim, border: `1px solid ${COLORS.panelBorder}`, fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  ⚙ Paramètres
                </button>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded text-xs"
                  style={{ color: COLORS.red, border: `1px solid ${COLORS.redDim}`, fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  ⏻ Déconnexion
                </button>
              </>
            )}
          </div>
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
              selectMode={selectMode}
              selected={selectedIds.includes(s.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
          {!selectMode && <AddServicePanel onClick={() => setShowAddService(true)} />}
        </div>

        <div>
          <h2
            className="text-sm uppercase tracking-widest mb-3"
            style={{ color: COLORS.textDim, fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Historique des alertes
          </h2>

          {log.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              <select
                value={filterService}
                onChange={(e) => setFilterService(e.target.value)}
                className="rounded px-2 py-1.5 text-xs focus:outline-none"
                style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, color: COLORS.text }}
              >
                <option value="all">Tous les services</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded px-2 py-1.5 text-xs focus:outline-none"
                style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, color: COLORS.text }}
              >
                <option value="all">Tous les statuts</option>
                <option value="nouveau">Nouveau</option>
                <option value="traité">Traité</option>
              </select>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="rounded px-2 py-1.5 text-xs focus:outline-none"
                style={{ background: COLORS.panel, border: `1px solid ${COLORS.panelBorder}`, color: COLORS.text }}
              >
                <option value="all">Toutes priorités</option>
                <option value="urgent">🔴 Urgent</option>
                <option value="normal">Normal</option>
              </select>
            </div>
          )}

          {(() => {
            const filteredLog = log.filter(
              (entry) =>
                (filterService === "all" || entry.serviceId === filterService) &&
                (filterStatus === "all" || entry.status === filterStatus) &&
                (filterPriority === "all" || (entry.priority ?? "normal") === filterPriority)
            );

            if (log.length === 0) {
              return (
                <div
                  className="rounded p-6 text-sm text-center"
                  style={{ background: COLORS.panel, border: `1px dashed ${COLORS.panelBorder}`, color: COLORS.textDim }}
                >
                  Aucune alerte envoyée pour le moment.
                </div>
              );
            }

            if (filteredLog.length === 0) {
              return (
                <div
                  className="rounded p-6 text-sm text-center"
                  style={{ background: COLORS.panel, border: `1px dashed ${COLORS.panelBorder}`, color: COLORS.textDim }}
                >
                  Aucune alerte ne correspond à ces filtres.
                </div>
              );
            }

            return (
              <div className="flex flex-col gap-2">
                {filteredLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded p-3 flex items-start gap-3"
                    style={{
                      background: COLORS.panel,
                      border: `1px solid ${entry.priority === "urgent" ? COLORS.red : COLORS.panelBorder}`,
                    }}
                  >
                    <StatusLed active={entry.status === "nouveau"} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold" style={{ color: COLORS.text }}>
                          {entry.serviceName}
                        </span>
                        {entry.priority === "urgent" && (
                          <span
                            className="text-[11px] px-2 py-0.5 rounded-full font-semibold"
                            style={{ color: COLORS.red, background: COLORS.redDim }}
                          >
                            🔴 Urgent
                          </span>
                        )}
                        <span
                          className="text-[11px]"
                          style={{ color: COLORS.textDim, fontFamily: "'IBM Plex Mono', monospace" }}
                        >
                          {entry.time}
                        </span>
                        <span
                          className="text-[11px] px-2 py-0.5 rounded-full"
                          style={{
                            color: entry.status === "nouveau" ? COLORS.amber : COLORS.teal,
                            background: entry.status === "nouveau" ? COLORS.amberDim : COLORS.tealDim,
                          }}
                        >
                          {entry.status}
                        </span>
                      </div>
                      <p className="text-sm mt-1 break-words" style={{ color: COLORS.textDim }}>
                        {entry.comment}
                      </p>
                      {entry.status === "traité" && entry.resolvedAt && entry.createdAt && (
                        <p
                          className="text-[11px] mt-1"
                          style={{ color: COLORS.teal, fontFamily: "'IBM Plex Mono', monospace" }}
                        >
                          ✓ Résolu à {entry.resolvedTime} — durée d'intervention :{" "}
                          {formatDuration(entry.resolvedAt - entry.createdAt)}
                        </p>
                      )}
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
            );
          })()}
        </div>
      </div>

      {selectMode && selectedIds.length > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-3 rounded-full flex items-center gap-3 z-40"
          style={{ background: COLORS.panel, border: `1px solid ${COLORS.amber}` }}
        >
          <span className="text-sm" style={{ color: COLORS.text }}>
            {selectedIds.length} sélectionné{selectedIds.length > 1 ? "s" : ""}
          </span>
          <button
            onClick={() => setMultiAlertServices(services.filter((s) => selectedIds.includes(s.id)))}
            className="px-4 py-1.5 rounded-full text-sm font-semibold"
            style={{ background: COLORS.amber, color: "#1A1300" }}
          >
            Alerter la sélection
          </button>
        </div>
      )}

      {modalService && (
        <AlertModal
          service={modalService}
          sourceEmail={sourceEmail}
          onClose={() => setModalService(null)}
          onSend={handleSend}
        />
      )}

      {multiAlertServices && (
        <MultiAlertModal
          services={multiAlertServices}
          sourceEmail={sourceEmail}
          onClose={() => setMultiAlertServices(null)}
          onFinish={handleMultiAlertFinish}
        />
      )}

      {showSettings && (
        <SettingsModal
          currentEmail={sourceEmail}
          onClose={() => setShowSettings(false)}
          onSave={handleSaveSettings}
        />
      )}

      {showAddService && (
        <AddServiceModal onClose={() => setShowAddService(false)} onCreate={handleCreateService} />
      )}

      {showReport && <ReportModal log={log} onClose={() => setShowReport(false)} />}

      {detailService && (
        <ServiceDetailModal
          service={detailService}
          onClose={() => setDetailService(null)}
          onAddEmail={handleAddEmail}
          onRemoveEmail={handleRemoveEmail}
          onAddPhone={handleAddPhone}
          onRemovePhone={handleRemovePhone}
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
