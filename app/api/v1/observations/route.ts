import {observations,indicators,VERSION} from "@/lib/evidence";
import {json} from "@/lib/security";
export function GET(request:Request){const p=new URL(request.url).searchParams;const indicator=p.get("indicator");if(indicator&&!indicators.some(i=>i.id===indicator))return json({error:{code:"UNKNOWN_INDICATOR",message:"Choose an indicator from the catalogue."}},400);return json({version:VERSION,indicators,observations:observations.filter(o=>!indicator||o.indicator===indicator)},200,{"Cache-Control":"public, max-age=300"});}
