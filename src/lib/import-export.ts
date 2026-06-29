"use client";

import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { Opportunity } from "@/lib/domain";

export type ImportPreview = {
  rows: Record<string, string>[];
  errors: string[];
};

const exportColumns = [
  "ticker",
  "pair",
  "setup",
  "bias",
  "primaryContext",
  "session",
  "status",
  "confirmations",
  "grade",
  "riskReward",
  "quality",
  "time",
  "notes",
];

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportOpportunitiesCsv(opportunities: Opportunity[]) {
  const csv = Papa.unparse(
    opportunities.map((opportunity) =>
      Object.fromEntries(
        exportColumns.map((column) => [
          column,
          String(opportunity[column as keyof Opportunity] ?? ""),
        ]),
      ),
    ),
  );
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), "opportunities.csv");
}

export function exportOpportunitiesXlsx(opportunities: Opportunity[]) {
  const worksheet = XLSX.utils.json_to_sheet(
    opportunities.map((opportunity) => ({
      Ticker: opportunity.ticker,
      Pair: opportunity.pair,
      Setup: opportunity.setup,
      Bias: opportunity.bias,
      "Primary Context": opportunity.primaryContext,
      Session: opportunity.session,
      Status: opportunity.status,
      Confirmations: opportunity.confirmations,
      Grade: opportunity.grade,
      "R:R": opportunity.riskReward,
      Quality: opportunity.quality,
      Time: opportunity.time,
      Notes: opportunity.notes,
    })),
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Opportunities");
  XLSX.writeFile(workbook, "opportunities.xlsx");
}

export async function parseImportFile(file: File): Promise<ImportPreview> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    return new Promise((resolve) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          resolve({
            rows: result.data,
            errors: result.errors.map((error) => error.message),
          });
        },
      });
    });
  }

  if (extension === "xlsx" || extension === "xls") {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return {
      rows: XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" }),
      errors: [],
    };
  }

  return {
    rows: [],
    errors: ["Unsupported file type. Upload CSV, XLSX, or XLS."],
  };
}
