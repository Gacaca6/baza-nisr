import {json} from "@/lib/security";
import {VERSION,sources,observations} from "@/lib/evidence";
export function GET(){return json({status:"ok",version:VERSION,mode:"verified-evidence",sources:sources.length,observations:observations.length,paidServicesRequired:false,localModel:"optional"});}
