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
 * GET /api/public/scouts/:id - Get scout details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scoutId = params.id;

    const { data: scout, error } = await supabase
      .from('scouts')
      .select('*')
      .eq('id', scoutId)
      .eq('user_id', SHARED_USER_ID)
      .single();

    if (error || !scout) {
      return NextResponse.json(
        { success: false, error: 'Scout not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: scout
    });
  } catch (error: any) {
    console.error('[Public API] Get scout error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/public/scouts/:id - Update scout
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scoutId = params.id;
    const updates = await request.json();

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.user_id;
    delete updates.created_at;

    const { data: scout, error } = await supabase
      .from('scouts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', scoutId)
      .eq('user_id', SHARED_USER_ID)
      .select()
      .single();

    if (error || !scout) {
      return NextResponse.json(
        { success: false, error: error?.message || 'Scout not found' },
        { status: error ? 500 : 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: scout
    });
  } catch (error: any) {
    console.error('[Public API] Update scout error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/public/scouts/:id - Delete scout
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const scoutId = params.id;

    const { error } = await supabase
      .from('scouts')
      .delete()
      .eq('id', scoutId)
      .eq('user_id', SHARED_USER_ID);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: 'Scout deleted successfully' }
    });
  } catch (error: any) {
    console.error('[Public API] Delete scout error:', error);
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
      'Access-Control-Allow-Methods': 'GET, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
