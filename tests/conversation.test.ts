import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAnswer} from '../lib/answer';
import {resolveQuestion} from '../lib/conversation';
import type {Language} from '../lib/domain';
const answer=(message:string,previous:string='',language:Language='en')=>buildAnswer({message,language,history:previous?[{role:'user',content:previous}]:[]});
for(const [language,q,followup]of [['en','Unemployment in 2024','And women?'],['rw','Ubushomeri muri 2024','None se abagore?'],['fr','Chômage en 2024','Et les femmes ?']] as const){
 test(`${language}: sex follow-up preserves the requested year`,()=>{const a=answer(followup,q,language);assert.equal(a.status,'supported');assert.equal(a.rows[0]?.year,2024);assert.equal(a.rows[0]?.group,'Female');assert.equal(a.rows[0]?.value,17.6);});
}
test('changing year preserves sex and does not silently return a trend',()=>{const a=answer('What about 2025?','Female unemployment in 2024');assert.equal(a.rows.length,1);assert.equal(a.rows[0].group,'Female');assert.equal(a.rows[0].value,14.2);});
test('changing place preserves poverty period',()=>{const a=answer('And in rural areas?','Poverty in 2017');assert.equal(a.status,'unavailable');assert.equal(a.rows.length,0);});
test('language-only follow-up preserves comparison and source identities',()=>{const a=answer('Compare rural and urban poverty');const b=answer('Show the same answer in French',a.resolvedQuestion,'fr');assert.equal(b.operation,'compare');assert.deepEqual(b.rows.map(r=>r.id),a.rows.map(r=>r.id));assert.equal(b.calculation?.value,a.calculation?.value);assert.equal(b.language,'fr');});
test('longer conversations can carry the resolved bounded context',()=>{let previous='Unemployment in 2024';for(const q of ['And women?','What about 2025?','Show the same answer in French','And men?']){const a=answer(q,previous);previous=a.resolvedQuestion!;}const a=answer('What about 2023?',previous);assert.equal(a.rows[0].year,2023);assert.equal(a.rows[0].group,'Male');});
test('brief follow-up returns compact answer with full evidence retained',()=>{const a=answer('Explain this briefly','How has unemployment changed since 2019?');assert.equal(a.rows.length,7);assert.ok(a.answer.length<260);assert.ok(a.calculation);});
test('definition follow-up retains indicator',()=>{const a=answer('What does that mean?','Unemployment in 2025');assert.equal(a.operation,'definition');assert.match(a.answer,/labour force/);});
test('unavailable district remains unavailable after sex follow-up',()=>{const a=answer('And women?','Unemployment in Gasabo district 2025');assert.equal(a.status,'unavailable');});
for(const q of ['unemployement in 2025','unemploymnet in 2025','unemplyment in 2025'])test(`known typo: ${q}`,()=>assert.equal(answer(q).rows[0]?.value,12.4));
test('unknown topic after an answer does not inherit a different indicator',()=>assert.equal(answer('And GDP?','Poverty in 2024').rows.length,0));
test('last year resolves by calendar, not latest collection year',()=>assert.match(resolveQuestion('What about last year?','unemployment',()=>false,new Date('2026-10-28')),/2025/));
test('new topic resets unrelated dimensions',()=>{const a=answer('What is the poverty rate?','Female unemployment in 2024');assert.equal(a.rows[0].indicator,'poverty');assert.equal(a.rows[0].group,'All');});
test('no rate is converted to a person count without evidence',()=>assert.equal(answer('How many unemployed people in 2025?').status,'unavailable'));
test('a value follow-up after a definition retains the indicator',()=>assert.equal(answer('And in 2025?','What does youth unemployment mean?').rows[0]?.value,14.7));
test('explicit French request changes response language without changing values',()=>{const a=answer('Show the same answer in French','Unemployment in 2024');assert.equal(a.language,'fr');assert.equal(a.rows[0]?.value,14.9);});
test('Kinyarwanda language request retains the evidence',()=>{const a=answer('Erekana igisubizo mu Ikinyarwanda','Poverty in 2024');assert.equal(a.language,'rw');assert.equal(a.rows[0]?.value,27.4);});
