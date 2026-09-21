import { NextResponse } from 'next/server';
export function jsonError(message: string, status=400){return NextResponse.json({error:message},{status});}
export function isJson(request: Request){return request.headers.get('content-type')?.includes('application/json') ?? false;}
