"use client";

import { useEffect, useState } from "react";
import { Lightbulb, Sparkles, Loader2 } from "lucide-react";
import Groq from "groq-sdk";

export interface KeyConcept {
  num: string;
  title: string;
  description: string;
}

export interface SummaryData {
  overview: string;
  keyConcepts: KeyConcept[];
  keyTakeaway: string;
}

export interface SummaryContentProps {
  pdfText?: string;
  fileName?: string;
  chapterTitle?: string;
  language?: "en" | "my";
}

export function SummaryContent({
  pdfText = "",
  fileName = "Document.pdf",
  chapterTitle = "Document Summary",
  language: initialLanguage = "en",
}: SummaryContentProps) {
  const [language, setLanguage] =
    useState<"en" | "my">(initialLanguage);

  const [summaryData, setSummaryData] =
    useState<SummaryData | null>(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] =
    useState<string | null>(null);

  // =========================================================
  // GENERATE SUMMARY
  // =========================================================

  useEffect(() => {
    if (!pdfText.trim()) {
      setSummaryData(null);
      setError(
        "No PDF text was found. Please upload the PDF again."
      );
      return;
    }

    const generateSummary = async () => {
      setLoading(true);
      setError(null);
      setSummaryData(null);

      try {
        // =====================================================
        // API KEY
        // =====================================================

        const apiKey =
          process.env.NEXT_PUBLIC_GROQ_API_KEY ||
          (
            import.meta as unknown as {
              env?: {
                VITE_GROQ_API_KEY?: string;
              };
            }
          ).env?.VITE_GROQ_API_KEY;

        if (!apiKey) {
          throw new Error(
            "Groq API Key is missing from environment variables."
          );
        }

        const groq = new Groq({
          apiKey,
          dangerouslyAllowBrowser: true,
        });

        // =====================================================
        // LANGUAGE
        // =====================================================

        const languageInstruction =
          language === "my"
            ? `
Write all generated content in natural, easy-to-read Burmese (မြန်မာဘာသာ).

Keep important technical terms in English when necessary.

Example:
Data Warehouse (ဒေတာသိုလှောင်ရုံ)
`
            : `
Write all generated content in clear, natural English.
Keep important technical terminology accurate.
`;

        // =====================================================
        // SHORTER + BETTER SUMMARY PROMPT
        // =====================================================

        const systemPrompt = `
You are an expert university lecturer who creates concise study summaries.

Your job is to turn the academic document into a summary that is:
- easy to read
- easy to remember
- useful for exam revision
- detailed enough to understand the main ideas
- NOT unnecessarily long

${languageInstruction}

IMPORTANT:

1. Use ONLY information found in the document.
2. Do not invent facts or examples.
3. Keep important definitions, formulas, classifications, processes,
   comparisons, relationships, and technical terms.
4. Explain difficult concepts simply.
5. Remove repetition and unnecessary details.
6. Prefer clear explanations over long paragraphs.

OVERVIEW:
Write ONE or TWO focused paragraphs.

The overview should explain:
- what the topic is
- the main ideas
- how the important ideas connect
- the most important information the student should know

Do NOT write a long essay.

KEY CONCEPTS:
Choose the 4 most important concepts from the document.

For each concept:
- Give it a clear title.
- Explain what it means.
- Mention why it is important or how it works.
- Include an important detail, relationship, or example if present.

Each concept should normally be about 2-3 sentences.

KEY TAKEAWAY:
Write 1-2 strong sentences explaining the most important
understanding the student should remember.

The result should feel like high-quality lecture notes,
NOT a textbook chapter.

Return ONLY valid JSON.

Use exactly this structure:

{
  "overview": "Short but meaningful overview.",
  "keyConcepts": [
    {
      "num": "01",
      "title": "Important concept",
      "description": "Clear 2-3 sentence explanation."
    },
    {
      "num": "02",
      "title": "Important concept",
      "description": "Clear 2-3 sentence explanation."
    },
    {
      "num": "03",
      "title": "Important concept",
      "description": "Clear 2-3 sentence explanation."
    },
    {
      "num": "04",
      "title": "Important concept",
      "description": "Clear 2-3 sentence explanation."
    }
  ],
  "keyTakeaway": "One or two sentences containing the main takeaway."
}
`;

        // =====================================================
        // USER PROMPT
        // =====================================================

        const userPrompt = `
Summarize the following academic document for a university student.

Focus only on:
- main ideas
- important definitions
- important concepts
- important relationships
- processes or classifications
- formulas or technical details
- exam-relevant information

Keep it concise and easy to study.

DOCUMENT:

${pdfText.slice(0, 5500)}
`;

        // =====================================================
        // GROQ REQUEST WITH RETRY
        // =====================================================

        let response;

        const maxAttempts = 3;

        for (
          let attempt = 1;
          attempt <= maxAttempts;
          attempt++
        ) {
          try {
            response =
              await groq.chat.completions.create({
                messages: [
                  {
                    role: "system",
                    content: systemPrompt,
                  },
                  {
                    role: "user",
                    content: userPrompt,
                  },
                ],

                model: "openai/gpt-oss-120b",

                temperature: 0.2,

                response_format: {
                  type: "json_object",
                },
              });

            break;
          } catch (err: unknown) {
            const message =
              err instanceof Error
                ? err.message
                : String(err);

            const isRateLimit =
              message.includes("429") ||
              message
                .toLowerCase()
                .includes("rate limit");

            if (!isRateLimit) {
              throw err;
            }

            if (attempt === maxAttempts) {
              throw new Error(
                "Groq rate limit reached. Please wait about 15 seconds and try again."
              );
            }

            const waitTime =
              attempt === 1
                ? 7000
                : 10000;

            console.log(
              `[Summary] Rate limit reached. Retrying in ${
                waitTime / 1000
              } seconds...`
            );

            await new Promise((resolve) =>
              setTimeout(resolve, waitTime)
            );
          }
        }

        // =====================================================
        // CHECK RESPONSE
        // =====================================================

        if (!response) {
          throw new Error(
            "No response returned from Groq."
          );
        }

        const content =
          response.choices[0]?.message?.content;

        if (!content) {
          throw new Error(
            "No summary content returned from Groq."
          );
        }

        // =====================================================
        // PARSE JSON
        // =====================================================

        const parsed: SummaryData =
          JSON.parse(content);

        if (
          !parsed.overview ||
          !Array.isArray(parsed.keyConcepts) ||
          parsed.keyConcepts.length === 0 ||
          !parsed.keyTakeaway
        ) {
          throw new Error(
            "Groq returned an incomplete summary. Please try again."
          );
        }

        setSummaryData(parsed);
      } catch (err: unknown) {
        console.error(
          "[Summary] Generation error:",
          err
        );

        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(
            "Failed to generate summary."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    generateSummary();
  }, [pdfText, language]);

  // =========================================================
  // EXPORT NOTES
  // =========================================================

  const handleExport = () => {
    if (!summaryData) return;

    const concepts =
      summaryData.keyConcepts
        .map(
          (concept) =>
            `${concept.num}. ${concept.title}\n${concept.description}`
        )
        .join("\n\n");

    const exportText = `${chapterTitle}

AI-GENERATED SUMMARY
====================

OVERVIEW
========

${summaryData.overview}

KEY CONCEPTS
============

${concepts}

KEY TAKEAWAY
============

${summaryData.keyTakeaway}

SOURCE
======

${fileName}

LANGUAGE
========

${language === "my" ? "Myanmar" : "English"}
`;

    const blob = new Blob(
      [exportText],
      {
        type: "text/plain;charset=utf-8",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    const safeFileName =
      chapterTitle
        .replace(/[<>:"/\\|?*]/g, "_")
        .trim();

    link.download =
      `${safeFileName || "study-summary"}-summary.txt`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-3xl bg-card p-7 shadow-sm">

        <Loader2 className="size-8 animate-spin text-primary" />

        <p className="text-sm font-medium text-muted-foreground">
          {language === "my"
            ? "အကျဉ်းချုပ် ပြုလုပ်နေပါသည်..."
            : "Creating your summary..."}
        </p>

        <p className="text-xs text-muted-foreground">
          {language === "my"
            ? "အရေးကြီးသော အချက်များကို ရွေးချယ်နေပါသည်..."
            : "Selecting the most important ideas..."}
        </p>

      </div>
    );
  }

  // =========================================================
  // ERROR
  // =========================================================

  if (error) {
    return (
      <div className="rounded-3xl border border-destructive/20 bg-destructive/10 p-7 text-destructive">

        <h3 className="font-semibold">
          Generation Error
        </h3>

        <p className="mt-1 text-sm">
          {error}
        </p>

        <button
          type="button"
          onClick={() =>
            window.location.reload()
          }
          className="mt-4 rounded-lg bg-destructive px-4 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>

      </div>
    );
  }

  // =========================================================
  // NO SUMMARY
  // =========================================================

  if (!summaryData) {
    return (
      <div className="rounded-3xl bg-card p-7 text-center text-muted-foreground shadow-sm">
        Upload a PDF on the Home page to generate the study summary.
      </div>
    );
  }

  // =========================================================
  // SUMMARY PAGE
  // =========================================================

  return (
    <div className="flex flex-col gap-6">

      {/* HEADER */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <h1 className="text-3xl font-semibold tracking-tight">
          {chapterTitle}
        </h1>

        <div className="flex items-center gap-2">

          {/* LANGUAGE */}

          <select
            value={language}
            onChange={(e) =>
              setLanguage(
                e.target.value as "en" | "my"
              )
            }
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="en">
              EN English
            </option>

            <option value="my">
              🇲🇲 မြန်မာ
            </option>
          </select>

          {/* EXPORT */}

          <button
            type="button"
            onClick={handleExport}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            {language === "my"
              ? "မှတ်စု Export"
              : "Export notes"}
          </button>

        </div>
      </div>

      {/* MAIN GRID */}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

        {/* MAIN ARTICLE */}

        <article className="rounded-3xl bg-card p-7 shadow-sm">

          {/* AI LABEL */}

          <div className="flex items-center gap-2 text-sm font-medium text-accent-foreground">

            <Sparkles className="size-4" />

            {language === "my"
              ? "AI အကျဉ်းချုပ်"
              : "AI summary"}

          </div>

          {/* OVERVIEW */}

          <h2 className="mt-6 text-xl font-semibold">

            {language === "my"
              ? "အကျဉ်းချုပ်"
              : "Overview"}

          </h2>

          <div className="mt-4 whitespace-pre-line text-[15px] leading-7 text-foreground">

            {summaryData.overview}

          </div>

          <div className="my-8 h-px bg-border" />

          {/* KEY CONCEPTS */}

          <h2 className="text-xl font-semibold">

            {language === "my"
              ? "အရေးကြီးသော အယူအဆများ"
              : "Key concepts"}

          </h2>

          <p className="mt-2 text-sm text-muted-foreground">

            {language === "my"
              ? "နားလည်ပြီး မှတ်သားသင့်သော အဓိကအချက်များ"
              : "The main ideas you should understand and remember."}

          </p>

          <div className="mt-6 flex flex-col gap-6">

            {summaryData.keyConcepts.map(
              ({
                num,
                title,
                description,
              }) => (

                <div
                  key={num}
                  className="flex gap-4"
                >

                  {/* NUMBER */}

                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-xs font-semibold text-primary">
                    {num}
                  </span>

                  {/* CONTENT */}

                  <div className="min-w-0">

                    <h3 className="text-base font-semibold">
                      {title}
                    </h3>

                    <p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-muted-foreground">
                      {description}
                    </p>

                  </div>

                </div>

              )
            )}

          </div>

        </article>

        {/* SIDEBAR */}

        <aside className="flex flex-col gap-4">

          {/* KEY TAKEAWAY */}

          <div className="rounded-3xl bg-secondary p-6">

            <Lightbulb className="size-6" />

            <h3 className="mt-5 text-lg font-semibold">

              {language === "my"
                ? "အဓိက မှတ်သားရန်"
                : "Key takeaway"}

            </h3>

            <p className="mt-3 text-[15px] leading-7 text-muted-foreground">

              {summaryData.keyTakeaway}

            </p>

          </div>

          {/* STUDY TIP */}

          <div className="rounded-3xl border border-border p-6">

            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">

              {language === "my"
                ? "လေ့လာရန် အကြံပြုချက်"
                : "Study tip"}

            </p>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">

              {language === "my"
                ? "အယူအဆတစ်ခုချင်းစီကို ကိုယ်တိုင် ပြန်ရှင်းပြကြည့်ပါ။"
                : "Try explaining each concept in your own words."}

            </p>

          </div>

          {/* SOURCE */}

          <div className="rounded-3xl border border-border p-6">

            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">

              {language === "my"
                ? "ရင်းမြစ်"
                : "Source"}

            </p>

            <p className="mt-3 break-words text-sm font-medium">
              {fileName}
            </p>

          </div>

        </aside>

      </div>

    </div>
  );
}