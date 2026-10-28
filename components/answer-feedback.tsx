"use client";
import {useState} from 'react';
import {ThumbsUp,ThumbsDown,Check} from 'lucide-react';
import type {Language} from '@/lib/domain';
import {experience} from '@/lib/experience';
export function AnswerFeedback({lang}:{lang:Language}){
 const t=experience[lang], [vote,setVote]=useState<'yes'|'no'|null>(null),[reason,setReason]=useState('');
 return <div className="answer-feedback"><span>{t.feedback}</span><button aria-pressed={vote==='yes'} onClick={()=>{setVote('yes');setReason('');}}><ThumbsUp size={15}/>{t.helpful}</button><button aria-pressed={vote==='no'} onClick={()=>setVote('no')}><ThumbsDown size={15}/>{t.notHelpful}</button>{vote==='no'&&<label>{t.reason}<select value={reason} onChange={e=>setReason(e.target.value)}><option value="">—</option>{(['incorrect','unclear','language','missing'] as const).map(k=><option key={k} value={k}>{t[k]}</option>)}</select></label>}{vote&&<small role="status"><Check size={13}/>{t.recorded}</small>}</div>;
}
