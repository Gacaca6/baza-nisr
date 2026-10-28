import {NextResponse,type NextRequest} from "next/server";
import {responseHeaders} from "./lib/response-headers";
export function middleware(request:NextRequest){const response=NextResponse.next();for(const [name,value]of Object.entries(responseHeaders(request.nextUrl.pathname)))response.headers.set(name,value);return response;}
export const config={matcher:["/((?!_next/static|_next/image|favicon.svg).*)"]};
