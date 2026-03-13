import { NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

type EmployeeBreakdownItem = {
  name: string;
  laborCost: number;
  hours: number;
  avgVarianceMinutes: number;
};

type AISummaryInput = {
  date: string;
  totalLaborCost: number;
  totalHours: number;
  activeEmployees: number;
  totalWorkSessions: number;
  topVarianceProduct: string;
  biggestCostDriver: string;
  productivityRanking: string[];
  employeeBreakdown?: EmployeeBreakdownItem[];
};

type AISummaryOutput = {
  dailySummary: string;
  biggestCostDriver: string;
  efficiencyWarning: string;
  suggestedAction: string;
  employeeInsights: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  let body: AISummaryInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    date,
    totalLaborCost,
    totalHours,
    activeEmployees,
    totalWorkSessions,
    topVarianceProduct,
    biggestCostDriver,
    productivityRanking,
    employeeBreakdown = [],
  } = body;

  const openai = new OpenAI({ apiKey });

  const systemPrompt = `You are an operations analyst for a tea and cake production workshop. Your role is to help management understand labor costs, efficiency, and variance.

Rules:
- Use ONLY the metrics provided. Do not invent or assume any numbers.
- Be concise: each output should be 1–2 sentences max.
- Be actionable: suggestions must be specific and implementable.
- Be direct: state findings clearly, avoid filler or hedging language.
- Focus on: cost drivers, variance from standard times, and practical next steps.`;

  const employeeTable =
    employeeBreakdown.length > 0
      ? employeeBreakdown
          .map(
            (e) =>
              `- ${e.name}: $${e.laborCost.toFixed(2)} labor, ${e.hours.toFixed(1)}h, avg variance ${e.avgVarianceMinutes.toFixed(0)} min`
          )
          .join("\n")
      : "—";

  const userPrompt = `Report metrics for ${date}:

| Metric | Value |
|--------|-------|
| Total labor cost | $${totalLaborCost.toFixed(2)} |
| Total hours worked | ${totalHours.toFixed(1)}h |
| Active employees | ${activeEmployees} |
| Work sessions | ${totalWorkSessions} |
| Top variance product (most deviation from standard) | ${topVarianceProduct || "—"} |
| Biggest cost driver | ${biggestCostDriver || "—"} |
| Productivity ranking (most efficient first) | ${productivityRanking?.length ? productivityRanking.join(", ") : "—"} |

Employee breakdown (cost, hours, avg variance):
${employeeTable}

Return a JSON object with exactly these 5 keys. No markdown, no code fences, raw JSON only:

{
  "dailySummary": "One paragraph: summarize overall labor use, cost, and standout point for this period.",
  "biggestCostDriver": "One sentence: which employee or product drove the most labor cost and why it matters.",
  "efficiencyWarning": "One sentence: call out the main variance or efficiency issue, or state if all sessions were on target.",
  "suggestedAction": "One sentence: a concrete next step management should take.",
  "employeeInsights": "2–3 sentences: analyze employee performance—who is most efficient, who has the highest variance, and any staff-specific recommendations."
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "No response from OpenAI" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(content) as AISummaryOutput;

    if (
      typeof parsed.dailySummary !== "string" ||
      typeof parsed.biggestCostDriver !== "string" ||
      typeof parsed.efficiencyWarning !== "string" ||
      typeof parsed.suggestedAction !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid response format from OpenAI" },
        { status: 500 }
      );
    }

    parsed.employeeInsights =
      typeof parsed.employeeInsights === "string"
        ? parsed.employeeInsights
        : "No employee data available for analysis.";

    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "OpenAI request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
