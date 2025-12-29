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
 * GET /api/public/scouts - List all scouts (no user isolation)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const isActive = searchParams.get('is_active');
    const orderBy = searchParams.get('order_by') || 'created_at';
    const orderDirection = searchParams.get('order_direction') || 'desc';

    let query = supabase
      .from('scouts')
      .select('*', { count: 'exact' })
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(offset, offset + limit - 1);

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    const { data: scouts, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        scouts: scouts || [],
        total: count || 0,
        limit,
        offset
      }
    });
  } catch (error: any) {
    console.error('[Public API] List scouts error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/public/scouts - Create a new scout for shared user
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      goal,
      search_queries,
      location,
      frequency,
      is_active = false
    } = body;

    const { data: scout, error } = await supabase
      .from('scouts')
      .insert({
        user_id: SHARED_USER_ID,
        title,
        description,
        goal,
        search_queries,
        location,
        frequency,
        is_active,
        consecutive_failures: 0
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        scout_id: scout.id,
        scout
      }
    });
  } catch (error: any) {
    console.error('[Public API] Create scout error:', error);
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
