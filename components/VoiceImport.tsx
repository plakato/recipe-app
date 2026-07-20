"use client";

import { useEffect, useRef, useState } from "react";
import RecipeForm from "@/components/RecipeForm";
import { createRecipe, importRecipeFromText } from "@/app/actions";
import type { RecipeDraft } from "@/lib/recipes";

// The Web Speech API isn't in the standard TypeScript DOM types, so we use a
// loose type here. It runs entirely in the browser (free, no API key).
/* eslint-disable @typescript-eslint/no-explicit-any */
type Recognition = any;

function getRecognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  return (
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition ||
    null
  );
}

const LANGS = [
  { code: "cs-CZ", label: "Čeština" },
  { code: "en-US", label: "English" },
];

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";

export default function VoiceImport() {
  const [supported, setSupported] = useState(true);
  const [recording, setRecording] = useState(false);
  const [lang, setLang] = useState("cs-CZ");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const recRef = useRef<Recognition | null>(null);

  useEffect(() => {
    if (!getRecognitionCtor()) setSupported(false);
    // Stop recognition if the component unmounts mid-recording.
    return () => recRef.current?.stop?.();
  }, []);

  function startRecording() {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setSupported(false);
      return;
    }
    setError(null);
    const rec: Recognition = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event: any) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalChunk += res[0].transcript;
        else interimChunk += res[0].transcript;
      }
      if (finalChunk) {
        setTranscript((prev) => (prev ? prev + " " : "") + finalChunk.trim());
      }
      setInterim(interimChunk);
    };
    rec.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        setError("Microphone access was blocked. Allow it and try again.");
      } else if (event.error !== "aborted" && event.error !== "no-speech") {
        setError(`Speech recognition error: ${event.error}`);
      }
    };
    rec.onend = () => {
      setRecording(false);
      setInterim("");
    };

    recRef.current = rec;
    rec.start();
    setRecording(true);
  }

  function stopRecording() {
    recRef.current?.stop?.();
    setRecording(false);
  }

  async function handleExtract() {
    setLoading(true);
    setError(null);
    const result = await importRecipeFromText(transcript);
    setLoading(false);
    if (result.ok) setDraft(result.draft);
    else setError(result.error);
  }

  // After extraction, review in the normal form.
  if (draft) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          Built from what you said. <strong>Check everything below</strong> —
          speech recognition mishears things — then save.
        </div>
        <RecipeForm
          action={createRecipe}
          initial={draft}
          sourceType="voice"
          submitLabel="Save recipe"
        />
        <button
          type="button"
          onClick={() => {
            setDraft(null);
            setError(null);
          }}
          className="text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
        >
          ← Start over
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {supported ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            className={
              recording
                ? "rounded-lg bg-red-600 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-red-700"
                : "rounded-lg bg-amber-600 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-amber-700"
            }
          >
            {recording ? "■ Stop recording" : "● Start recording"}
          </button>
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            disabled={recording}
            className={`${inputClass} w-auto`}
            aria-label="Spoken language"
          >
            {LANGS.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          {recording && (
            <span className="flex items-center gap-2 text-sm text-red-600">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
              Listening…
            </span>
          )}
        </div>
      ) : (
        <p className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400">
          Your browser doesn&rsquo;t support voice recording (try Chrome or
          Safari). You can still type or paste the recipe below and import it.
        </p>
      )}

      <div className="space-y-1">
        <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Transcript{" "}
          <span className="text-stone-400">(you can edit before importing)</span>
        </label>
        <textarea
          value={transcript + (interim ? " " + interim : "")}
          onChange={(e) => setTranscript(e.target.value)}
          rows={8}
          placeholder="Speak the recipe, or type/paste it here: title, ingredients, and steps…"
          className={inputClass}
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleExtract}
          disabled={loading || !transcript.trim() || recording}
          className="rounded-lg bg-amber-600 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-60"
        >
          {loading ? "Extracting…" : "Make recipe from this"}
        </button>
        {transcript && !loading && (
          <button
            type="button"
            onClick={() => setTranscript("")}
            className="text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
          >
            Clear
          </button>
        )}
      </div>

      {loading && (
        <p className="text-sm text-stone-500">
          Asking the AI to organise it into a recipe. Free models can take a few
          seconds.
        </p>
      )}
    </div>
  );
}
