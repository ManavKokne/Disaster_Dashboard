import { NextResponse } from "next/server";
import { fetchTweetsForCsvExport } from "@/lib/data-fetcher";

function parseUrgencyLabels(rawValue) {
  if (!rawValue) return [];

  return String(rawValue)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function csvEscape(value) {
  const raw = value == null ? "" : String(value);
  const escaped = raw.replace(/"/g, '""');
  return `"${escaped}"`;
}

function rowsToCsv(rows) {
  const columns = [
    "id",
    "tweet",
    "location",
    "request_type",
    "urgency_label",
    "urgency_score",
    "is_resolved",
    "is_closed",
    "is_acknowledged",
    "latitude",
    "longitude",
    "created_at",
    "updated_at",
    "resolved_at",
    "closed_at",
  ];

  const header = columns.join(",");
  const lines = rows.map((row) =>
    columns.map((column) => csvEscape(row[column])).join(",")
  );

  return [header, ...lines].join("\n");
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      location: searchParams.get("location") || "",
      markerState: searchParams.get("markerState") || "all",
      requestType: searchParams.get("requestType") || "",
      acknowledgement: searchParams.get("acknowledgement") || "all",
      timeWindow: searchParams.get("timeWindow") || "all",
      urgencyLabels: parseUrgencyLabels(searchParams.get("urgencyLabels")),
      includeClosed: searchParams.get("includeClosed") === "1",
    };

    const exportResult = await fetchTweetsForCsvExport(filters);
    if (!exportResult.success) {
      return NextResponse.json(
        { error: exportResult.message || "CSV export failed" },
        { status: 500 }
      );
    }

    const csv = rowsToCsv(exportResult.rows || []);
    const fileName = `alerts-filtered-${Date.now()}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${fileName}\"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error exporting tweets CSV:", error);
    return NextResponse.json({ error: "Failed to export CSV" }, { status: 500 });
  }
}
