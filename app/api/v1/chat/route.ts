import {buildAnswer} from "@/lib/answer";
import {chatSchema,guarded,json,readJson} from "@/lib/security";
export async function POST(request:Request){return guarded(request,async()=>json(buildAnswer(chatSchema.parse(await readJson(request)))));}
export async function OPTIONS(request:Request){return guarded(request,async()=>new Response(null,{status:204,headers:{"Access-Control-Allow-Methods":"POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Access-Control-Max-Age":"600"}}));}
