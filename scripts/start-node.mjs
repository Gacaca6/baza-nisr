import {cpSync,existsSync,mkdirSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

const root=join(dirname(fileURLToPath(import.meta.url)),'..');
const standalone=join(root,'.next','standalone');
if(!existsSync(join(standalone,'server.js')))throw new Error('Run npm run build:node before npm run start:node.');
// Next standalone excludes public assets; package them with the generated server.
mkdirSync(join(standalone,'.next'),{recursive:true});
cpSync(join(root,'public'),join(standalone,'public'),{recursive:true});
cpSync(join(root,'.next','static'),join(standalone,'.next','static'),{recursive:true});
const child=spawn(process.execPath,[join(standalone,'server.js')],{cwd:standalone,stdio:'inherit',env:{...process.env,HOSTNAME:process.env.HOSTNAME??'127.0.0.1'}});
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
child.on('error',error=>{console.error(error.message);process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
