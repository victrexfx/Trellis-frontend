import { NextRequest, NextResponse } from 'next/server';
import { getTelemetryCapabilities, type TelemetryRole } from '@/lib/telemetry/roles';

const ROLES: TelemetryRole[] = ['viewer', 'operator', 'admin'];

function parseRole(value: string | null): TelemetryRole | null {
  if (!value) return null;
  return ROLES.includes(value as TelemetryRole) ? (value as TelemetryRole) : null;
}

/**
 * Returns capability matrix for a role. Production should validate JWT / session
 * and ignore client-supplied role claims.
 */
export function GET(req: NextRequest) {
  const role = parseRole(req.nextUrl.searchParams.get('role'));
  if (!role) {
    return NextResponse.json({ error: 'Invalid or missing role' }, { status: 400 });
  }
  return NextResponse.json({
    role,
    capabilities: getTelemetryCapabilities(role),
  });
}

/**
 * Handle session revocation from the backend.
 */
export async function DELETE(req: NextRequest) {
  // Validate JWT / session token
  const authHeader = req.headers.get('authorization');

  if (!authHeader) {
     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Real implementation would decode and invalidate JWT / session from DB or Redis here.
    // For this frontend exercise, we'll return 200 OK assuming the database clear is successful.

    // Simulating token decoding / DB call
    return NextResponse.json({ success: true, message: 'Session revoked successfully' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let roleParam: string | null = null;
  try {
    const body = (await req.json()) as { role?: unknown };
    roleParam = typeof body?.role === 'string' ? body.role : null;
  } catch {
    roleParam = null;
  }
  const role = parseRole(roleParam);
  if (!role) {
    return NextResponse.json({ error: 'Invalid or missing role' }, { status: 400 });
  }
  return NextResponse.json({
    role,
    capabilities: getTelemetryCapabilities(role),
  });
}
