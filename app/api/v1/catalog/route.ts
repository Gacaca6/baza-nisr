import {catalogSchema,searchCatalog} from "@/lib/catalog";
import {guarded,json,readJson} from "@/lib/security";
export async function POST(request:Request){return guarded(request,async()=>{const data=catalogSchema.parse(await readJson(request));return json(await searchCatalog(data.query));});}
