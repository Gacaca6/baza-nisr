import {sources,VERSION} from "@/lib/evidence";
import {json} from "@/lib/security";
export function GET(){return json({version:VERSION,sources,scope:"Two approved publications; no household microdata."},200,{"Cache-Control":"public, max-age=300"});}
