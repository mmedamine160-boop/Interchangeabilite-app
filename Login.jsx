import React, { useState, useRef, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "./firebase";

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

function DecapusLogo({ size = 84 }) {
  const arms = [
    "M 65.97 39.81 C 74.79 48.34, 88.05 44.66, 96.04 50.76 C 94.04 54.22, 90.84 50.76, 94.04 47.29",
    "M 63.83 43.89 C 75.85 46.33, 80.31 59.35, 89.86 62.49 C 87.01 65.29, 84.85 61.10, 88.87 58.62",
    "M 60.67 47.23 C 63.81 59.09, 77.07 62.78, 80.76 72.14 C 77.26 74.07, 76.31 69.45, 80.84 68.14",
    "M 56.73 49.61 C 65.76 57.91, 62.85 71.37, 69.41 78.99 C 65.52 79.92, 65.84 75.21, 70.56 75.16",
    "M 52.30 50.84 C 48.86 62.62, 58.30 72.63, 56.63 82.55 C 52.63 82.39, 54.21 77.95, 58.76 79.17",
    "M 47.70 50.84 C 51.14 62.62, 41.70 72.63, 43.37 82.55 C 39.56 81.33, 42.27 77.47, 46.33 79.86",
    "M 43.27 49.61 C 34.24 57.91, 37.15 71.37, 30.59 78.99 C 27.25 76.79, 30.89 73.80, 34.17 77.20",
    "M 39.33 47.23 C 36.19 59.09, 22.93 62.78, 19.24 72.14 C 16.61 69.13, 20.92 67.22, 23.16 71.37",
    "M 36.17 43.89 C 24.15 46.33, 19.69 59.35, 10.14 62.49 C 8.41 58.88, 13.08 58.20, 14.12 62.80",
    "M 34.03 39.81 C 25.21 48.34, 11.95 44.66, 3.96 50.76 C 3.26 46.82, 7.94 47.42, 7.71 52.13",
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {arms.map((d, i) => (
        <path
          key={i}
          d={d}
          stroke={C.amber}
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.9}
        />
      ))}
      <circle cx="50" cy="34" r="18" fill={C.panel} stroke={C.amber} strokeWidth="3.2" />
      <circle cx="43.5" cy="31" r="2.6" fill={C.amber} />
      <circle cx="56.5" cy="31" r="2.6" fill={C.amber} />
    </svg>
  );
}

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
            <DecapusLogo size={84} />
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
