// Explicit, bounded language rules keep the free evidence path reproducible.
// Corrections are deliberately limited to known statistical vocabulary.
const corrections:Record<string,string>={unemployement:"unemployment",unemploymet:"unemployment",unemplyment:"unemployment",unemploymnt:"unemployment",unemploymnet:"unemployment",povery:"poverty",proverty:"poverty",povert:"poverty",pauvretee:"pauvrete",chomge:"chomage",chommage:"chomage",ubushomer:"ubushomeri",ubuken:"ubukene",particpation:"participation"};
export function cleanQuestion(value:string){return value.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[’‘]/g,"'").replace(/\b[a-z]+\b/g,w=>corrections[w]??w).replace(/2023\s*\/\s*24\b/g,"2024");}
const sex=/\b(females?|women|males?|men|abagore|bagore|abagabo|bagabo|femmes|hommes|feminin|masculin)\b/g;
const places=/\b(rwanda|national|rurale?|urban|urbain|urbaine|cyaro|mijyi|kigali|southern|south|sud|amajyepfo|western|west|ouest|iburengerazuba|northern|north|nord|amajyaruguru|eastern|east|iburasirazuba)\b/g;
const years=/\b(19\d{2}|20\d{2})\b/g;
const intent=/\b(trend|since|over time|evolution|depuis|bwahindutse|kuva|historique|between|entre|hagati|compare|comparer|comparison|difference|gap|versus|vs|gereranya|itandukaniro|ecart)\b/g;
const definition=/\b(what|is|does|mean|define|definition|definir|bisobanura|busobanura|gisobanura|sobanura|que signifie|comment|how|measured|defined)\b/g;
export const languageRequest=/\b(english|french|kinyarwanda|ikinyarwanda|francais|anglais|igifaransa|gifaransa|icyongereza|icongereza)\b/;
export function requestedLanguage(message:string,fallback:'en'|'rw'|'fr'){
 const q=cleanQuestion(message);
 if(/(?:\bin |\ben |\bmu |translate.{0,30})(?:french|francais|igifaransa|gifaransa)\b/.test(q))return 'fr';
 if(/(?:\bin |\ben |\bmu |translate.{0,30})(?:english|anglais|icyongereza|icongereza)\b/.test(q))return 'en';
 if(/(?:\bin |\ben |\bmu |translate.{0,30})(?:kinyarwanda|ikinyarwanda)\b/.test(q))return 'rw';
 return fallback;
}

export function resolveQuestion(message:string,previous:string,hasIndicator:(s:string)=>boolean,now=new Date()):string{
 let q=cleanQuestion(message);
 if(/\b(gdp|inflation|cpi|population growth|birth|certificate|health|education|rainfall|price index)\b/.test(q))return q;
 const rephrase=languageRequest.test(q)||/brief|short|one sentence|summari|resume|make it shorter|magambo make|incamake/.test(q);
 const followup=/^(and\b|what about\b|how about\b|et\b|qu'en\b|none se\b|no\b|mu\b|in\b|and in\b)|\b(that|same|iyo|icyo|cela|meme)\b/.test(q)||(!hasIndicator(q)&&(/\b20\d{2}\b|last year|previous year|l'an dernier|umwaka ushize/.test(q)||new RegExp(sex.source).test(q)||new RegExp(places.source).test(q)));
 if(/last year|l'an dernier|umwaka ushize/.test(q))q=q.replace(/last year|l'an dernier|umwaka ushize/g,String(now.getUTCFullYear()-1));
 if(/previous year/.test(q)){const y=[...previous.matchAll(years)].at(-1);if(y)q=q.replace(/previous year/g,String(Number(y[1])-1));}
 if(!previous||(!followup&&!rephrase))return q;
 if(rephrase&&!hasIndicator(q)&&!new RegExp(years.source).test(q)&&!new RegExp(sex.source).test(q)&&!new RegExp(places.source).test(q))return previous;
 let context=previous;
 if(new RegExp(years.source).test(q))context=context.replace(years,"").replace(intent,"");
 if(new RegExp(sex.source).test(q))context=context.replace(sex,"").replace(intent,"");
 if(new RegExp(places.source).test(q))context=context.replace(places,"").replace(intent,"");
 // A dimensional follow-up requests a value, rather than repeating a definition.
 context=context.replace(definition,"").replace(/\b(find|download|report|catalogue|catalog|telecharger|rapport|raporo|shaka)\b/g,"");
 return `${context} ${q}`.trim();
}
