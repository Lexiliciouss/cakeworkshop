import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const CATEGORIES = [
  "labor_cost",
  "productivity",
  "employee_performance",
  "product_performance",
  "operational_recommendation",
] as const;

type Category = (typeof CATEGORIES)[number];

type AiAskInput = {
  question: string;
  dateFrom: string;
  dateTo: string;
};

async function classifyQuestion(openai: OpenAI, question: string): Promise<Category> {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Classify the user's question about a tea/cake workshop into exactly ONE category. Reply with ONLY the category name, nothing else.
Categories: labor_cost, productivity, employee_performance, product_performance, operational_recommendation
- labor_cost: costs, spending, budget, wages
- productivity: efficiency, variance, time vs standard
- employee_performance: who worked well, employee comparison, staff
- product_performance: which products, product labor, items
- operational_recommendation: what to do, suggest, improve, recommend`,
      },
      { role: "user", content: question },
    ],
    max_tokens: 20,
  });
  const raw = (res.choices[0]?.message?.content ?? "").trim().toLowerCase();
  const match = CATEGORIES.find((c) => raw.includes(c));
  return match ?? "operational_recommendation";
}

async function fetchDataByCategory(
  category: Category,
  dateFrom: string,
  dateTo: string
): Promise<Record<string, unknown>[]> {
  const range = (table: string) =>
    supabase
      .from(table)
      .select("*")
      .gte("work_date", dateFrom)
      .lte("work_date", dateTo)
      .limit(200);

  switch (category) {
    case "labor_cost": {
      const [management, costs] = await Promise.all([
        range("daily_management_summary"),
        range("employee_daily_costs"),
      ]);
      const rows = [
        ...(management.data ?? []),
        ...(costs.data ?? []),
      ] as Record<string, unknown>[];
      return rows;
    }
    case "productivity": {
      const [prod, summary] = await Promise.all([
        range("employee_productivity"),
        range("work_log_summary"),
      ]);
      return [
        ...(prod.data ?? []),
        ...(summary.data ?? []),
      ] as Record<string, unknown>[];
    }
    case "employee_performance": {
      const [costs, prod, summary] = await Promise.all([
        range("employee_daily_costs"),
        range("employee_productivity"),
        range("work_log_summary"),
      ]);
      return [
        ...(costs.data ?? []),
        ...(prod.data ?? []),
        ...(summary.data ?? []),
      ] as Record<string, unknown>[];
    }
    case "product_performance": {
      const [products, summary] = await Promise.all([
        range("product_labor_summary"),
        range("work_log_summary"),
      ]);
      return [
        ...(products.data ?? []),
        ...(summary.data ?? []),
      ] as Record<string, unknown>[];
    }
    case "operational_recommendation":
    default: {
      const [management, costs, prod, products] = await Promise.all([
        range("daily_management_summary"),
        range("employee_daily_costs"),
        range("employee_productivity"),
        range("product_labor_summary"),
      ]);
      return [
        ...(management.data ?? []),
        ...(costs.data ?? []),
        ...(prod.data ?? []),
        ...(products.data ?? []),
      ] as Record<string, unknown>[];
    }
  }
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 500 }
    );
  }

  let body: AiAskInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { question, dateFrom, dateTo } = body;
  if (!question || typeof question !== "string" || !question.trim()) {
    return NextResponse.json({ error: "Question is required" }, { status: 400 });
  }

  const from = String(dateFrom ?? "").trim() || new Date().toISOString().slice(0, 10);
  const to = String(dateTo ?? "").trim() || from;
  const effectiveFrom = from <= to ? from : to;
  const effectiveTo = from <= to ? to : from;

  const openai = new OpenAI({ apiKey });

  try {
    const category = await classifyQuestion(openai, question.trim());
    const data = await fetchDataByCategory(category, effectiveFrom, effectiveTo);

    const dataStr = JSON.stringify(data.slice(0, 150), null, 0).slice(0, 12000);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an operations analyst for a tea and cake production workshop. Answer the user's question using ONLY the provided database data. Be concise (2–4 sentences) and management-friendly.

Rules:
- Use only numbers and facts from the data. Do not invent or guess.
- If the data doesn't contain enough to answer, say so clearly.
- Be direct and actionable.`,
        },
        {
          role: "user",
          content: `Date range: ${effectiveFrom} to ${effectiveTo}\n\nData (JSON):\n${dataStr}\n\nQuestion: ${question.trim()}\n\nAnswer based on the data above:`,
        },
      ],
      max_tokens: 300,
    });

    const answer = completion.choices[0]?.message?.content?.trim() ?? "No response generated.";
    return NextResponse.json({ answer });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
