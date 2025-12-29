import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Shared user ID for all Happy CLI instances
const SHARED_USER_ID = '3caa8842-0f81-4bfd-b1ac-93c92d7e64d8';

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * GET /api/public/executions/:id - Get execution result with optional steps (no user isolation)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: executionId } = await params;
    const { searchParams } = new URL(request.url);
    const includeSteps = searchParams.get('include_steps') === 'true';

    // Get execution
    const { data: execution, error: execError } = await supabase
      .from('scout_executions')
      .select('*')
      .eq('id', executionId)
      .single();

    if (execError || !execution) {
      return NextResponse.json(
        { success: false, error: 'Execution not found' },
        { status: 404 }
      );
    }

    const result: any = {
      execution: execution
    };

    // Optionally include steps
    if (includeSteps) {
      const { data: steps, error: stepsError } = await supabase
        .from('scout_execution_steps')
        .select('*')
        .eq('execution_id', executionId)
        .order('step_number', { ascending: true });

      if (stepsError) {
        console.error('[Public API] Failed to fetch steps:', stepsError);
      } else {
        result.steps = steps || [];
      }
    }

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('[Public API] Get execution error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
