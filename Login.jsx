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
    "M 63.78 46.09 L 67.15 47.53 L 70.40 48.96 L 73.53 50.37 L 76.51 51.76 L 79.34 53.12 L 81.99 54.45 L 84.44 55.75 L 86.69 57.01 L 88.72 58.23 L 90.51 59.40 L 92.04 60.52 L 93.32 61.58 L 94.33 62.59 L 96.04 63.20 L 96.04 63.20 L 96.55 61.31 L 95.74 59.70 L 94.63 58.06 L 93.23 56.37 L 91.58 54.66 L 89.68 52.91 L 87.57 51.13 L 85.24 49.31 L 82.73 47.48 L 80.05 45.61 L 77.20 43.73 L 74.22 41.82 L 71.11 39.91 L 67.90 37.98 Z",
    "M 62.42 50.46 L 66.03 51.47 L 69.56 52.42 L 72.99 53.28 L 76.31 54.05 L 79.51 54.73 L 82.57 55.29 L 85.48 55.74 L 88.23 56.06 L 90.80 56.24 L 93.19 56.26 L 95.37 56.12 L 97.33 55.80 L 99.05 55.29 L 100.08 53.62 L 100.08 53.62 L 98.46 52.79 L 97.04 52.75 L 95.39 52.55 L 93.52 52.20 L 91.44 51.71 L 89.16 51.07 L 86.70 50.30 L 84.07 49.40 L 81.29 48.39 L 78.36 47.27 L 75.30 46.05 L 72.13 44.74 L 68.86 43.35 L 65.50 41.90 Z",
    "M 56.95 51.90 L 58.97 54.95 L 60.91 57.94 L 62.74 60.83 L 64.48 63.63 L 66.09 66.32 L 67.57 68.89 L 68.91 71.32 L 70.09 73.61 L 71.12 75.74 L 71.97 77.70 L 72.64 79.48 L 73.12 81.07 L 73.41 82.47 L 74.50 83.92 L 74.50 83.92 L 75.96 82.62 L 76.17 80.83 L 76.15 78.84 L 75.91 76.67 L 75.47 74.33 L 74.85 71.83 L 74.06 69.17 L 73.11 66.38 L 72.02 63.47 L 70.80 60.43 L 69.46 57.30 L 68.02 54.07 L 66.48 50.76 L 64.85 47.38 Z",
    "M 53.29 54.85 L 55.75 57.68 L 58.18 60.41 L 60.57 63.02 L 62.92 65.49 L 65.22 67.81 L 67.47 69.96 L 69.66 71.94 L 71.78 73.71 L 73.83 75.27 L 75.81 76.60 L 77.71 77.68 L 79.52 78.50 L 81.24 79.01 L 83.02 78.18 L 83.02 78.18 L 82.12 76.60 L 80.96 75.79 L 79.69 74.72 L 78.32 73.40 L 76.85 71.84 L 75.30 70.05 L 73.67 68.06 L 71.97 65.86 L 70.19 63.49 L 68.36 60.94 L 66.48 58.25 L 64.55 55.41 L 62.58 52.45 L 60.57 49.39 Z",
    "M 47.84 53.13 L 47.84 56.79 L 47.82 60.35 L 47.77 63.78 L 47.67 67.07 L 47.54 70.20 L 47.37 73.16 L 47.15 75.93 L 46.88 78.49 L 46.57 80.84 L 46.20 82.94 L 45.78 84.80 L 45.31 86.39 L 44.78 87.71 L 44.90 89.53 L 44.90 89.53 L 46.84 89.24 L 47.99 87.87 L 49.06 86.19 L 50.06 84.25 L 50.98 82.05 L 51.83 79.62 L 52.63 76.97 L 53.38 74.11 L 54.07 71.08 L 54.72 67.88 L 55.32 64.52 L 55.89 61.03 L 56.42 57.42 L 56.92 53.70 Z",
    "M 43.08 53.70 L 43.58 57.42 L 44.11 61.03 L 44.68 64.52 L 45.28 67.88 L 45.93 71.08 L 46.62 74.11 L 47.37 76.97 L 48.17 79.62 L 49.02 82.05 L 49.94 84.25 L 50.94 86.19 L 52.01 87.87 L 53.16 89.24 L 55.10 89.53 L 55.10 89.53 L 55.22 87.71 L 54.69 86.39 L 54.22 84.80 L 53.80 82.94 L 53.43 80.84 L 53.12 78.49 L 52.85 75.93 L 52.63 73.16 L 52.46 70.20 L 52.33 67.07 L 52.23 63.78 L 52.18 60.35 L 52.16 56.79 L 52.16 53.13 Z",
    "M 39.43 49.39 L 37.42 52.45 L 35.45 55.41 L 33.52 58.25 L 31.64 60.94 L 29.81 63.49 L 28.03 65.86 L 26.33 68.06 L 24.70 70.05 L 23.15 71.84 L 21.68 73.40 L 20.31 74.72 L 19.04 75.79 L 17.88 76.60 L 16.98 78.18 L 16.98 78.18 L 18.76 79.01 L 20.48 78.50 L 22.29 77.68 L 24.19 76.60 L 26.17 75.27 L 28.22 73.71 L 30.34 71.94 L 32.53 69.96 L 34.78 67.81 L 37.08 65.49 L 39.43 63.02 L 41.82 60.41 L 44.25 57.68 L 46.71 54.85 Z",
    "M 35.15 47.38 L 33.52 50.76 L 31.98 54.07 L 30.54 57.30 L 29.20 60.43 L 27.98 63.47 L 26.89 66.38 L 25.94 69.17 L 25.15 71.83 L 24.53 74.33 L 24.09 76.67 L 23.85 78.84 L 23.83 80.83 L 24.04 82.62 L 25.50 83.92 L 25.50 83.92 L 26.59 82.47 L 26.88 81.07 L 27.36 79.48 L 28.03 77.70 L 28.88 75.74 L 29.91 73.61 L 31.09 71.32 L 32.43 68.89 L 33.91 66.32 L 35.52 63.63 L 37.26 60.83 L 39.09 57.94 L 41.03 54.95 L 43.05 51.90 Z",
    "M 34.50 41.90 L 31.14 43.35 L 27.87 44.74 L 24.70 46.05 L 21.64 47.27 L 18.71 48.39 L 15.93 49.40 L 13.30 50.30 L 10.84 51.07 L 8.56 51.71 L 6.48 52.20 L 4.61 52.55 L 2.96 52.75 L 1.54 52.79 L -0.08 53.62 L -0.08 53.62 L 0.95 55.29 L 2.67 55.80 L 4.63 56.12 L 6.81 56.26 L 9.20 56.24 L 11.77 56.06 L 14.52 55.74 L 17.43 55.29 L 20.49 54.73 L 23.69 54.05 L 27.01 53.28 L 30.44 52.42 L 33.97 51.47 L 37.58 50.46 Z",
    "M 32.10 37.98 L 28.89 39.91 L 25.78 41.82 L 22.80 43.73 L 19.95 45.61 L 17.27 47.48 L 14.76 49.31 L 12.43 51.13 L 10.32 52.91 L 8.42 54.66 L 6.77 56.37 L 5.37 58.06 L 4.26 59.70 L 3.45 61.31 L 3.96 63.20 L 3.96 63.20 L 5.67 62.59 L 6.68 61.58 L 7.96 60.52 L 9.49 59.40 L 11.28 58.23 L 13.31 57.01 L 15.56 55.75 L 18.01 54.45 L 20.66 53.12 L 23.49 51.76 L 26.47 50.37 L 29.60 48.96 L 32.85 47.53 L 36.22 46.09 Z",
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      {arms.map((d, i) => (
        <path key={i} d={d} fill={C.amber} />
      ))}
      <ellipse cx="50" cy="32" rx="20" ry="19" fill={C.panel} stroke={C.amber} strokeWidth="3" />
      <circle cx="42.5" cy="29" r="2.8" fill={C.amber} />
      <circle cx="57.5" cy="29" r="2.8" fill={C.amber} />
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
