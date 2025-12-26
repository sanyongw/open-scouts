import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Manual Scout Trigger API
 * Use this during development to manually trigger a scout execution
 *
 * POST /api/test-scout?scoutId=<uuid>
 *
 * This will call your deployed edge function to execute the scout
 */
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scoutId = searchParams.get("scoutId");

    if (!scoutId) {
      return NextResponse.json(
        { error: "scoutId parameter required" },
        { status: 400 },
      );
    }

    // Get scout to verify it exists
    const { data: scout, error: scoutError } = await supabaseServer
      .from("scouts")
      .select("*")
      .eq("id", scoutId)
      .single();

    if (scoutError || !scout) {
      return NextResponse.json({ error: "Scout not found" }, { status: 404 });
    }

    // Check if scout is ready to run
    if (!scout.is_active) {
      return NextResponse.json(
        { error: "Scout is not active" },
        { status: 400 },
      );
    }

    // Check if scout configuration is complete
    const isComplete =
      scout.title &&
      scout.goal &&
      scout.description &&
      scout.location &&
      scout.search_queries?.length > 0 &&
      scout.frequency;

    if (!isComplete) {
      return NextResponse.json(
        { error: "Scout configuration is not complete" },
        { status: 400 },
      );
    }

    // Get Supabase URL and key from environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 },
      );
    }

    // Call the edge function with scoutId parameter
    const response = await fetch(`${supabaseUrl}/functions/v1/scout-cron?scoutId=${scoutId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "Edge function call failed", details: errorText },
        { status: 500 },
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: "Scout cron triggered successfully",
      scout: {
        id: scout.id,
        title: scout.title,
      },
      result,
    });
  } catch (error) {
    console.error("Error triggering scout:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET endpoint to check scout status
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scoutId = searchParams.get("scoutId");

    if (!scoutId) {
      // Return all active scouts
      const { data: scouts } = await supabaseServer
        .from("scouts")
        .select("id, title, is_active, frequency, last_run_at")
        .eq("is_active", true);

      return NextResponse.json({ scouts: scouts || [] });
    }

    // Get specific scout with latest execution
    const { data: scout } = await supabaseServer
      .from("scouts")
      .select("*")
      .eq("id", scoutId)
      .single();

    if (!scout) {
      return NextResponse.json({ error: "Scout not found" }, { status: 404 });
    }

    // Get latest execution
    const { data: latestExecution } = await supabaseServer
      .from("scout_executions")
      .select("*")
      .eq("scout_id", scoutId)
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    return NextResponse.json({
      scout,
      latestExecution,
    });
  } catch (error) {
    console.error("Error fetching scout:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
