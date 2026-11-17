#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { table } from './lib/format.mjs';
import { parseCsv } from './lib/csv.mjs';

export const COMMANDS = {
 help: [], services: [], changes: [], 'review-queue': [], 'release-queue': [], failures: [], actions: [], quality: [], coverage: [],
 deployments: ['from','to'], dora: ['from','to'], investment: ['from','to'], 'metric-history': ['scope','metric'], 'metric-trend': ['scope','metric'],
 compliance: [], activity: [], show: ['type','ref'], 'weekly-review': [],
 'add-service': ['code','name','owner','purpose','notice','retention-review','access-review'],
 'set-policy': ['service','purpose','notice','retention-review','access-review'],
 'add-change': ['code','service','title','author','commit','opened','additions','deletions','category','source'],
 'amend-change': ['change','title','additions','deletions','category'],
 'record-review': ['change','reviewer','at','evidence'], 'merge-change': ['change','at'],
 'add-deployment': ['code','service','version','environment','at','changes','rework','reason','evidence'],
 'link-change': ['deployment','change'], 'flag-failure': ['deployment','at','reason','evidence'],
 'recover-deployment': ['deployment','at','evidence'],
 'add-action': ['code','service','title','owner','due'], 'close-action': ['action','evidence'],
 'log-note': ['service','text'], import: ['file','map','scope','dry-run','update'], export: [],
 'draft-weekly': [], 'draft-followup': []
};
const MUTATIONS = new Set(['add-service','set-policy','add-change','amend-change','record-review','merge-change','add-deployment','link-change','flag-failure','recover-deployment','add-action','close-action','log-note','import']);
const TABLES=['services','changes','reviews','deployments','deployment_changes','actions','imports','metric_snapshots','notes','audit_log'];
const required=(o,k)=>{if(typeof o[k]!=='string'||!o[k].trim())throw Error(`--${k}= is required`);return o[k].trim();};
const code=(o,k='code')=>{const v=required(o,k).toUpperCase();if(!/^[A-Z0-9][A-Z0-9_-]*$/.test(v))throw Error('Code must contain letters, numbers, underscores or hyphens');return v;};
function date(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error(`Invalid calendar date: ${v}`);return v;}
function instant(v){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(v)||Number.isNaN(Date.parse(v)))throw Error(`Expected ISO timestamp with timezone: ${v}`);date(v.slice(0,10));return new Date(v).toISOString();}
function at(o,k='at'){return instant(required(o,k));}
function integer(v=0){if(!/^\d+$/.test(String(v))||!Number.isSafeInteger(Number(v)))throw Error('Expected a non-negative whole number');return Number(v);}
function category(v='unclassified'){if(!['feature','fix','maintenance','unclassified'].includes(v))throw Error('Unknown category');return v;}
function requirePast(v){if(Date.parse(v)>Date.now())throw Error('Recorded events cannot be in the future');return v;}
function window(o){const to=date(o.to||new Date(Date.now()+86400000).toISOString().slice(0,10));const from=date(o.from||new Date(Date.parse(to)-30*86400000).toISOString().slice(0,10));if(from>=to)throw Error('--from must precede exclusive --to');return {from,to,days:(Date.parse(to)-Date.parse(from))/86400000};}
export function parseArgs(args){
 const command=args[0]||'help';if(!(command in COMMANDS))throw Error(`Unknown command: ${command}`);
 const opts={},positionals=[];for(const a of args.slice(1)){
  if(!a.startsWith('--')){positionals.push(a);continue;}
  const p=a.indexOf('=');const key=p<0?a.slice(2):a.slice(2,p);const value=p<0?true:a.slice(p+1);
  if(Object.hasOwn(opts,key))throw Error(`Duplicate flag --${key}`);
  if(![...COMMANDS[command],'json',...(MUTATIONS.has(command)?['actor']:[])].includes(key))throw Error(`Unknown flag --${key} for ${command}`);
  if(['json','dry-run','update','rework'].includes(key)){if(value!==true)throw Error(`--${key} is a switch`);}else if(value===true)throw Error(`Use --${key}=value`);
  opts[key]=value;
 }
 if(command==='import'){if(positionals.length!==1||positionals[0]!=='linearb')throw Error('Use import linearb');}
 else if(positionals.length)throw Error('Unexpected positional argument');
 return {command,opts};
}
async function resolve(db,type,ref,lock=false){
 if(!['services','changes','deployments','actions'].includes(type))throw Error('Unknown record type');
 const name=type==='services'?'name':type==='deployments'?'version':'title';
 const exact=await db.query(`SELECT * FROM ${type} WHERE lower(code)=lower($1) OR id::text=$1${lock?' FOR UPDATE':''}`,[ref]);
 if(exact.length===1)return exact[0];
 const rows=await db.query(`SELECT * FROM ${type} WHERE id::text ILIKE $1 OR ${name} ILIKE $2 ORDER BY code${lock?' FOR UPDATE':''}`,[ref+'%','%'+ref.replace(/[\\%_]/g,'\\$&')+'%']);
 if(rows.length!==1)throw Error(`${rows.length?'Ambiguous':'No matching'} ${type}: ${ref}${rows.length?'\n'+rows.map(r=>`${r.code} | ${r[name]} | ${r.id}`).join('\n'):''}`);return rows[0];
}
const service=(db,o)=>resolve(db,'services',required(o,'service'),true);
async function link(db,dep,change){
 if(dep.service_id!==change.service_id)throw Error('Change and deployment must belong to the same service');
 if(!change.merged_at||new Date(change.merged_at)>new Date(dep.deployed_at))throw Error('Change must be merged before deployment');
 return db.query('INSERT INTO deployment_changes(deployment_id,change_id) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING *',[dep.id,change.id]);
}
async function dora(db,o){
 const w=window(o);
 const result=await db.query(`WITH cohort AS (
 SELECT * FROM deployments WHERE environment='production' AND deployed_at >= $1::date AND deployed_at < $2::date
 ), first_release AS (
 SELECT c.id,c.service_id,c.first_commit_at,min(d.deployed_at) AS first_production
 FROM changes c JOIN deployment_changes dc ON dc.change_id=c.id JOIN deployments d ON d.id=dc.deployment_id
 WHERE d.environment='production' GROUP BY c.id
 ), lead AS (
 SELECT service_id,count(*) AS lead_samples,percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM first_production-first_commit_at)/3600) AS lead_hours
 FROM first_release WHERE first_production >= $1::date AND first_production < $2::date GROUP BY service_id
 ), stats AS (
 SELECT service_id,count(*) AS deployments,count(*) FILTER(WHERE failed_at IS NOT NULL) AS failed,
 count(*) FILTER(WHERE failed_at IS NOT NULL AND recovered_at IS NULL) AS unresolved,
 count(*) FILTER(WHERE recovered_at IS NOT NULL) AS recovery_samples,
 count(*) FILTER(WHERE is_rework) AS rework,
 percentile_cont(0.5) WITHIN GROUP(ORDER BY extract(epoch FROM recovered_at-failed_at)/3600) FILTER(WHERE recovered_at IS NOT NULL) AS recovery_hours,
 count(*) FILTER(WHERE NOT EXISTS(SELECT 1 FROM deployment_changes dc WHERE dc.deployment_id=cohort.id)) AS unlinked
 FROM cohort GROUP BY service_id
 ) SELECT s.code AS service,coalesce(st.deployments,0) AS deployments,
 round((coalesce(st.deployments,0)::numeric/$3),3) AS deployments_per_day,
 round(l.lead_hours::numeric,2) AS median_change_lead_hours,coalesce(l.lead_samples,0) AS lead_samples,
 round(100.0*st.failed/nullif(st.deployments,0),2) AS change_failure_pct,
 round(st.recovery_hours::numeric,2) AS median_failed_recovery_hours,
 coalesce(st.recovery_samples,0) AS recovery_samples,coalesce(st.unresolved,0) AS unresolved,
 round(100.0*st.rework/nullif(st.deployments,0),2) AS deployment_rework_pct,
 coalesce(st.unlinked,0) AS unlinked_deployments
 FROM services s LEFT JOIN stats st ON st.service_id=s.id LEFT JOIN lead l ON l.service_id=s.id ORDER BY s.code`,[w.from,w.to,w.days]);
 return {window:{...w,end_exclusive:true,observed_at:new Date().toISOString()},services:result};
}
async function compliance(db){return db.query(`
 SELECT 'PURPOSE' AS rule,code AS record,'Collection purpose or staff notice missing' AS finding,'https://www.privacy.org.nz/privacy-principles/1/' AS source FROM services WHERE btrim(purpose)='' OR btrim(notice_ref)=''
 UNION ALL SELECT 'RETENTION',code,'Retention review missing or overdue','https://www.privacy.org.nz/privacy-principles/9/' FROM services WHERE retention_review_on IS NULL OR retention_review_on<current_date
 UNION ALL SELECT 'ACCESS',code,'Access review missing or overdue','https://www.privacy.org.nz/privacy-principles/5/' FROM services WHERE access_review_on IS NULL OR access_review_on<current_date
 UNION ALL SELECT 'INDEPENDENT_REVIEW',code,'Merged change has no current independent review','docs/compliance.md#local-policy' FROM delivery_quality WHERE merged_at IS NOT NULL AND independent_reviews=0
 UNION ALL SELECT 'UNLINKED_RELEASE',d.code,'Production release has no linked changes','https://dora.dev/guides/dora-metrics/' FROM deployments d WHERE environment='production' AND NOT EXISTS(SELECT 1 FROM deployment_changes dc WHERE dc.deployment_id=d.id)
 UNION ALL SELECT 'UNRESOLVED_FAILURE',code,'Production failure still needs recovery evidence','docs/compliance.md#local-policy' FROM failure_queue ORDER BY rule,record`);}
async function weekly(db){return {review_queue:await db.query('SELECT * FROM review_queue ORDER BY waiting_hours DESC'),release_queue:await db.query('SELECT * FROM release_queue ORDER BY waiting_hours DESC'),failures:await db.query('SELECT * FROM failure_queue ORDER BY failed_at'),actions:await db.query('SELECT * FROM action_queue ORDER BY due_on')};}
function privateFile(dir,prefix,content,ext){const root=process.env.OUTPUT_DIR||REPO_ROOT;const folder=path.join(root,dir);fs.mkdirSync(folder,{recursive:true,mode:0o700});const f=path.join(folder,`${prefix}-${Date.now()}-${crypto.randomBytes(3).toString('hex')}.${ext}`);fs.writeFileSync(f,content,{flag:'wx',mode:0o600});return f;}
function digest(v){return crypto.createHash('sha256').update(v).digest('hex');}
function mapDates(row,map){
 if(map.start&&map.end)return [date(row[map.start]),date(row[map.end])];
 const v=row[map.range||'Date Range'];if(!v)throw Error('Date range column missing. Supply --map with range or start/end columns.');
 const parts=v.match(/^(\d{4}-\d{2}-\d{2})\s+(?:to|–|-)\s+(\d{4}-\d{2}-\d{2})$/);
 if(!parts)throw Error('Date range must be YYYY-MM-DD to YYYY-MM-DD. Map separate ISO start/end columns when needed.');
 return [date(parts[1]),date(parts[2])];
}
async function importLinearB(db,o){
 const content=fs.readFileSync(required(o,'file'),'utf8');const rows=parseCsv(content);if(!rows.length)throw Error('CSV contains no data rows');
 const map=JSON.parse(fs.readFileSync(required(o,'map'),'utf8'));const scope=required(o,'scope');
 if(!map.metrics||typeof map.metrics!=='object'||Array.isArray(map.metrics)||!Object.keys(map.metrics).length)throw Error('Mapping needs a metrics object with unit and aggregation for each metric column');
 for(const [column,spec] of Object.entries(map.metrics)){if(!spec||typeof spec!=='object'||Object.keys(spec).some(k=>!['metric','unit','aggregation'].includes(k))||['metric','unit','aggregation'].some(k=>typeof spec[k]!=='string'||!spec[k].trim()))throw Error(`Invalid metadata for ${column}`);}
 const fingerprint=digest(JSON.stringify({file:digest(content),map,scope}));
 if((await db.query('SELECT id FROM imports WHERE fingerprint=$1',[fingerprint])).length)return {already_imported:true,rows:0,metrics:0};
 const values=[],keys=new Set();
 for(const [i,row] of rows.entries()){
  const [start,end]=mapDates(row,map);if(start>end)throw Error(`Row ${i+2}: reversed dates`);
  for(const [column,spec] of Object.entries(map.metrics)){
   if(!Object.hasOwn(row,column))throw Error(`Column missing: ${column}`);
   if(!spec.metric||!spec.unit||!spec.aggregation)throw Error(`Mapping ${column} needs metric, unit and aggregation`);
   const raw=row[column].trim();const numeric=raw.replace(/,/g,'');
   let value=null;
   if(!['','null','n/a','-'].includes(raw.toLowerCase())){
    if(!/^-?(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?|\.\d+)$/.test(raw)||!Number.isFinite(Number(numeric)))throw Error(`Row ${i+2} ${column}: expected a numeric value or blank, received ${raw}`);
    value=Number(numeric);
   }
   const key=JSON.stringify([start,end,spec.metric,spec.unit,spec.aggregation]);if(keys.has(key))throw Error(`Duplicate metric period in CSV: ${column}`);keys.add(key);
   values.push({scope,start,end,...spec,value,raw,row});
  }
 }
 const [batch]=await db.query('INSERT INTO imports(fingerprint,file_hash,source,scope,mapping,row_count) VALUES($1,$2,$3,$4,$5,$6) RETURNING id',[fingerprint,digest(content),'linearb',scope,JSON.stringify(map),rows.length]);
 let inserted=0,unchanged=0,updated=0;
 for(const v of values){
  const params=['linearb',scope,v.start,v.end,v.metric,v.unit,v.aggregation];
  const old=(await db.query('SELECT * FROM metric_snapshots WHERE source=$1 AND scope=$2 AND period_start=$3 AND period_end=$4 AND metric=$5 AND unit=$6 AND aggregation=$7 FOR UPDATE',params))[0];
  if(old){
   if((old.value===null&&v.value===null)||(old.value!==null&&v.value!==null&&Number(old.value)===v.value)){unchanged++;continue;}
   if(!o.update)throw Error(`Changed metric ${v.metric} in ${v.start}; use --update after reviewing the difference`);
   await db.query('UPDATE metric_snapshots SET value=$1,raw_value=$2,raw_row=$3,import_id=$4 WHERE id=$5',[v.value,v.raw,JSON.stringify(v.row),batch.id,old.id]);updated++;
  }else{await db.query('INSERT INTO metric_snapshots(source,scope,period_start,period_end,metric,unit,aggregation,value,raw_value,raw_row,import_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[...params,v.value,v.raw,JSON.stringify(v.row),batch.id]);inserted++;}
 }
 return {dry_run:!!o['dry-run'],rows:rows.length,metrics:values.length,inserted,updated,unchanged,file_hash:digest(content)};
}
async function perform(db,c,o){
 switch(c){
 case 'help':return Object.entries(COMMANDS).map(([command,flags])=>({command,flags:flags.map(x=>'--'+x).join(' ')}));
 case 'services':return db.query('SELECT code,name,owner FROM services ORDER BY code');
 case 'changes':return db.query('SELECT c.code,s.code AS service,c.title,c.author,c.opened_at,c.merged_at,c.category,c.revision FROM changes c JOIN services s ON s.id=c.service_id ORDER BY c.code');
 case 'review-queue':return db.query('SELECT * FROM review_queue ORDER BY waiting_hours DESC');
 case 'release-queue':return db.query('SELECT * FROM release_queue ORDER BY waiting_hours DESC');
 case 'failures':return db.query('SELECT * FROM failure_queue ORDER BY failed_at');
 case 'actions':return db.query('SELECT * FROM action_queue ORDER BY due_on');
 case 'quality':return db.query('SELECT * FROM delivery_quality ORDER BY changed_lines DESC');
 case 'coverage':return db.query('SELECT * FROM service_coverage ORDER BY code');
 case 'compliance':return compliance(db);
 case 'weekly-review':return weekly(db);
 case 'dora':return dora(db,o);
 case 'deployments':{const w=window(o);return db.query('SELECT d.code,s.code AS service,d.version,d.environment,d.deployed_at,d.failed_at,d.recovered_at,d.is_rework FROM deployments d JOIN services s ON s.id=d.service_id WHERE d.deployed_at >= $1::date AND d.deployed_at < $2::date ORDER BY d.deployed_at',[w.from,w.to]);}
 case 'investment':{const w=window(o);return db.query('SELECT s.code AS service,c.category,count(*) AS opened_changes,sum(c.additions+c.deletions) AS changed_lines,round(100.0*count(*)/sum(count(*)) OVER(PARTITION BY s.code),2) AS share_of_changes_pct FROM changes c JOIN services s ON s.id=c.service_id WHERE c.opened_at >= $1::date AND c.opened_at < $2::date GROUP BY s.code,c.category ORDER BY s.code,c.category',[w.from,w.to]);}
 case 'activity':return db.query('SELECT entity,operation,actor,record_id,created_at,before_row,after_row FROM audit_log ORDER BY created_at DESC,id LIMIT 100');
 case 'metric-history':return db.query('SELECT scope,period_start,period_end,metric,unit,aggregation,value,raw_value FROM metric_snapshots WHERE ($1::text IS NULL OR scope=$1) AND ($2::text IS NULL OR metric=$2) ORDER BY scope,metric,period_start',[o.scope||null,o.metric||null]);
 case 'metric-trend':return db.query(`WITH history AS (SELECT scope,metric,unit,aggregation,period_start,period_end,value,lag(value) OVER (PARTITION BY scope,metric,unit,aggregation ORDER BY period_start,period_end) AS previous_value FROM metric_snapshots WHERE ($1::text IS NULL OR scope=$1) AND ($2::text IS NULL OR metric=$2)) SELECT *,value-previous_value AS change_from_previous FROM history ORDER BY scope,metric,period_start`,[o.scope||null,o.metric||null]);
 case 'show':{const type=required(o,'type');const record=await resolve(db,type,required(o,'ref'));return {record,history:await db.query('SELECT operation,actor,created_at,before_row,after_row FROM audit_log WHERE entity=$1 AND record_id=$2 ORDER BY created_at',[type,record.id])};}
 case 'add-service':return db.query('INSERT INTO services(code,name,owner,purpose,notice_ref,retention_review_on,access_review_on) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[code(o),required(o,'name'),required(o,'owner'),o.purpose||'',o.notice||'',o['retention-review']?date(o['retention-review']):null,o['access-review']?date(o['access-review']):null]);
 case 'set-policy':{const s=await service(db,o);return db.query('UPDATE services SET purpose=$1,notice_ref=$2,retention_review_on=$3,access_review_on=$4 WHERE id=$5 RETURNING *',[required(o,'purpose'),required(o,'notice'),date(required(o,'retention-review')),date(required(o,'access-review')),s.id]);}
 case 'add-change':{const s=await service(db,o);return db.query('INSERT INTO changes(code,service_id,title,author,first_commit_at,opened_at,additions,deletions,category,source_ref) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',[code(o),s.id,required(o,'title'),required(o,'author'),requirePast(at(o,'commit')),requirePast(at(o,'opened')),integer(o.additions),integer(o.deletions),category(o.category),o.source||'']);}
 case 'amend-change':{const ch=await resolve(db,'changes',required(o,'change'),true);if(ch.merged_at)throw Error('Merged changes are immutable; record a follow-up change');if(!['title','additions','deletions','category'].some(k=>k in o))throw Error('Specify a field to amend');return db.query('UPDATE changes SET title=$1,additions=$2,deletions=$3,category=$4,revision=revision+1 WHERE id=$5 RETURNING *',[o.title?required(o,'title'):ch.title,o.additions===undefined?ch.additions:integer(o.additions),o.deletions===undefined?ch.deletions:integer(o.deletions),category(o.category||ch.category),ch.id]);}
 case 'record-review':{const ch=await resolve(db,'changes',required(o,'change'),true);if(ch.merged_at)throw Error('Cannot add a review after merge');const reviewer=required(o,'reviewer'),when=requirePast(at(o));if(reviewer.toLowerCase()===ch.author.toLowerCase())throw Error('Review must be independent of the author');if(new Date(when)<new Date(ch.opened_at))throw Error('Review cannot precede opening');return db.query('INSERT INTO reviews(change_id,revision,reviewer,reviewed_at,evidence) VALUES($1,$2,$3,$4,$5) RETURNING *',[ch.id,ch.revision,reviewer,when,required(o,'evidence')]);}
 case 'merge-change':{const ch=await resolve(db,'changes',required(o,'change'),true),when=requirePast(at(o));if(ch.merged_at)throw Error('Change already merged');const reviews=await db.query('SELECT id FROM reviews WHERE change_id=$1 AND revision=$2 AND lower(reviewer)<>lower($3) AND reviewed_at <= $4',[ch.id,ch.revision,ch.author,when]);if(!reviews.length)throw Error('Merge requires a current independent review before the merge timestamp');return db.query('UPDATE changes SET merged_at=$1 WHERE id=$2 RETURNING *',[when,ch.id]);}
 case 'add-deployment':{const s=await service(db,o);const env=o.environment||'production';if(!['production','staging'].includes(env))throw Error('Environment must be production or staging');const [dep]=await db.query('INSERT INTO deployments(code,service_id,version,environment,deployed_at,is_rework,reason,evidence) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[code(o),s.id,required(o,'version'),env,requirePast(at(o)),!!o.rework,o.rework?required(o,'reason'):o.reason||'',required(o,'evidence')]);if(o.changes)for(const ref of o.changes.split(','))await link(db,dep,await resolve(db,'changes',ref.trim(),true));return [dep];}
 case 'link-change':{const dep=await resolve(db,'deployments',required(o,'deployment'),true);const ch=await resolve(db,'changes',required(o,'change'),true);return link(db,dep,ch);}
 case 'flag-failure':{const dep=await resolve(db,'deployments',required(o,'deployment'),true);if(dep.failed_at)throw Error('Failure already recorded');return db.query('UPDATE deployments SET failed_at=$1,reason=$2,evidence=$3 WHERE id=$4 RETURNING *',[requirePast(at(o)),required(o,'reason'),required(o,'evidence'),dep.id]);}
 case 'recover-deployment':{const dep=await resolve(db,'deployments',required(o,'deployment'),true);if(!dep.failed_at||dep.recovered_at)throw Error('Deployment must have an unresolved failure');return db.query('UPDATE deployments SET recovered_at=$1,evidence=evidence||$2 WHERE id=$3 RETURNING *',[requirePast(at(o)),'\nRecovery: '+required(o,'evidence'),dep.id]);}
 case 'add-action':{const s=await service(db,o);return db.query('INSERT INTO actions(code,service_id,title,owner,due_on) VALUES($1,$2,$3,$4,$5) RETURNING *',[code(o),s.id,required(o,'title'),required(o,'owner'),date(required(o,'due'))]);}
 case 'close-action':{const a=await resolve(db,'actions',required(o,'action'),true);if(a.state==='closed')throw Error('Action already closed');return db.query("UPDATE actions SET state='closed',evidence=$1 WHERE id=$2 RETURNING *",[required(o,'evidence'),a.id]);}
 case 'log-note':{const s=await service(db,o);return db.query('INSERT INTO notes(service_id,body) VALUES($1,$2) RETURNING *',[s.id,required(o,'text')]);}
 case 'import':return importLinearB(db,o);
 case 'export':{const bundle={format:'engineering-delivery/v1',exported_at:new Date().toISOString(),tables:{}};for(const t of TABLES)bundle.tables[t]=await db.query(`SELECT * FROM ${t} ORDER BY id`);const f=privateFile('exports','delivery',JSON.stringify(bundle,null,2),'json');return {file:f,counts:Object.fromEntries(Object.entries(bundle.tables).map(([t,rows])=>[t,rows.length]))};}
 case 'draft-weekly':case 'draft-followup':{const data=c==='draft-weekly'?await weekly(db):{actions:await db.query('SELECT * FROM action_queue ORDER BY due_on')};let text='# '+(c==='draft-weekly'?'Weekly delivery review':'Follow-up draft')+'\n\nDraft only. Check the records before sharing.\n\n';for(const [k,rows] of Object.entries(data))text+='## '+k.replaceAll('_',' ')+'\n\n'+format(rows)+'\n\n';return {file:privateFile('drafts',c,text,'md'),sent:false};}
 default:throw Error('Command has no handler');
 }
}
export async function execute(db,command,opts={}){
 const write=MUTATIONS.has(command);if(write)required(opts,'actor');
 await db.exec(write?'BEGIN':'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 try{if(write)await db.query("SELECT set_config('app.actor',$1,true)",[opts.actor]);const result=await perform(db,command,opts);await db.exec(opts['dry-run']?'ROLLBACK':'COMMIT');return result;}catch(e){await db.exec('ROLLBACK');throw e;}
}
export function format(value){
 if(Array.isArray(value)){if(!value.length)return '  (none)';return table(value,Object.keys(value[0]).map(k=>({key:k,label:k.replaceAll('_',' '),format:v=>v===null?'unknown':v instanceof Date?v.toISOString():typeof v==='object'?JSON.stringify(v):String(v)})));}
 if(value&&typeof value==='object')return Object.entries(value).map(([k,v])=>Array.isArray(v)?`${k.replaceAll('_',' ')}\n${format(v)}`:`${k}: ${typeof v==='object'?JSON.stringify(v):v}`).join('\n\n');
 return String(value);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{const {command,opts}=parseArgs(process.argv.slice(2));db=await getDb();const out=await execute(db,command,opts);console.log(opts.json?JSON.stringify(out,null,2):format(out));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
