import React, { useState, useRef, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";
import logoImg from "./decapus-logo.png";

const C = {
  bg: "#12161A",
  panel: "#1B2127",
  panelBorder: "#2A323A",
  text: "#E8E6E1",
  textDim: "#8B9299",
  amber: "#F2A93B",
  amberDim: "#5C4620",
  red: "#E5484D",
};

function translateAuthError(code) {
  switch (code) {
    case "auth/invalid-email":
      return "Adresse e-mail invalide.";
    case "auth/user-disabled":
      return "Ce compte a été désactivé.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "E-mail ou mot de passe incorrect.";
    case "auth/too-many-requests":
      return "Trop de tentatives. Réessaie dans quelques minutes.";
    default:
      return "Connexion impossible. Vérifie tes identifiants.";
  }
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const emailRef = useRef(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      // onAuthStateChanged dans App.jsx prend le relais automatiquement
    } catch (err) {
      setError(translateAuthError(err.code));
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-4"
      style={{ background: C.bg, fontFamily: "'Inter', sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Inter:wght@400;500;600&display=swap');
      `}</style>

      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-3">
            <div
              style={{
                width: 110,
                height: 110,
                borderRadius: 20,
                background: C.panel,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                border: `1px solid ${C.panelBorder}`,
              }}
            >
              <img
                src={logoImg}
                alt="DECAPUS"
                style={{ width: "80%", height: "80%", objectFit: "contain" }}
              />
            </div>
          </div>
          <div
            className="text-xs uppercase tracking-[0.2em] mb-2"
            style={{ color: C.amber, fontFamily: "'IBM Plex Mono', monospace" }}
          >
            Connexion
          </div>
          <h1
            className="text-4xl font-bold"
            style={{ color: C.text, fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            DECAPUS
          </h1>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-md p-6"
          style={{ background: C.panel, border: `1px solid ${C.panelBorder}` }}
        >
          <label className="block text-sm mb-1" style={{ color: C.textDim }}>
            E-mail
          </label>
          <input
            ref={emailRef}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nom@usine.local"
            autoComplete="username"
            className="w-full rounded p-2.5 text-sm mb-4 focus:outline-none"
            style={{ background: C.bg, border: `1px solid ${C.panelBorder}`, color: C.text }}
          />

          <label className="block text-sm mb-1" style={{ color: C.textDim }}>
            Mot de passe
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            className="w-full rounded p-2.5 text-sm mb-2 focus:outline-none"
            style={{ background: C.bg, border: `1px solid ${C.panelBorder}`, color: C.text }}
          />

          {error && (
            <p className="text-xs mt-2 mb-2" style={{ color: C.red }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!email.trim() || !password || loading}
            className="w-full py-2.5 rounded text-sm font-semibold mt-4"
            style={{
              background: email.trim() && password && !loading ? C.amber : C.amberDim,
              color: email.trim() && password && !loading ? "#1A1300" : C.textDim,
              cursor: email.trim() && password && !loading ? "pointer" : "not-allowed",
            }}
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <p className="text-xs text-center mt-5" style={{ color: C.textDim }}>
          Accès réservé. Pour obtenir un compte, contacte l'administrateur de ton usine.
        </p>
      </div>
    </div>
  );
}
