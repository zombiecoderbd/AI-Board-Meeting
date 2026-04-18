import { NextRequest, NextResponse } from 'next/server';
import { getAllSessions, getSession, createSession, updateSessionModelConfig } from '@/server/db/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');
    
    if (sessionId) {
      const session = getSession(sessionId);
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      return NextResponse.json({ session });
    }
    
    const sessions = getAllSessions();
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, modelConfig, title } = body;
    
    const session = createSession(id, modelConfig, title);
    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, modelConfig } = body;
    
    if (!id || !modelConfig) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    updateSessionModelConfig(id, modelConfig);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }
    
    // Note: We're not actually deleting from DB to preserve history
    // Just marking as archived
    const { updateSessionStatus } = await import('@/server/db/database');
    updateSessionStatus(id, 'archived');
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
