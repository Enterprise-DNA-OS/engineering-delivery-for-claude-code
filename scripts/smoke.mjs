#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';
import { execute, parseArgs, COMMANDS, format } from './delivery.mjs';
import { parseCsv } from './lib/csv.mjs';
import { page, table as htmlTable, loadBrand } from './lib/render.mjs';

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'delivery-test-'));
process.env.DATA_DIR=path.join(temp,'db');process.env.OUTPUT_DIR=temp;
process.env.DATABASE_URL=process.env.TEST_DATABASE_URL||'';
const db=await getDb();const seen=new Set();let checks=0;
const ok=(value,message)=>{assert.ok(value,message);checks++;};
const eq=(a,b,message)=>{assert.deepEqual(a,b,message);checks++;};
const call=async(c,o={})=>{seen.add(c);return execute(db,c,o);};
const actor={actor:'Test operator'};
const write=(c,o={})=>call(c,{...actor,...o});
const fails=async(c,o,re)=>{await assert.rejects(()=>write(c,o),re);checks++;};
const iso=(hours)=>new Date(Date.now()+hours*3600000).toISOString();
const fixture=(name,text)=>{const f=path.join(temp,name);fs.writeFileSync(f,text);return f;};
function cli(args,expect=0){const x=spawnSync(process.execPath,args,{cwd:REPO_ROOT,env:process.env,encoding:'utf8',windowsHide:true});eq(x.status,expect,x.stderr||x.stdout);return x.stdout;}
try{
 if(db.mode==='postgres'){const existing=await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");assert.equal(existing.length,0,'TEST_DATABASE_URL must be an empty disposable database');}
 eq((await migrate(db)).ran.length,1);eq((await migrate(db)).ran.length,0);
 await seed(db);const audits=(await db.query('SELECT count(*) AS n FROM audit_log'))[0].n;
 await seed(db);eq((await db.query('SELECT count(*) AS n FROM audit_log'))[0].n,audits,'seed does not modify existing demo records');
 eq((await call('services')).length,3);eq((await call('changes')).length,6);
 const q=await call('review-queue');eq(q.length,2);ok(q.every(x=>Number(x.current_reviews)===0),'stale review excluded');
 eq((await call('release-queue')).map(x=>x.code),['PR-202'],'staging does not count as production');
 eq((await call('failures')).map(x=>x.code),['REL-201']);eq((await call('actions')).length,3);
 eq((await call('deployments')).length,4);eq((await call('quality')).find(x=>x.code==='PR-201').independent_reviews,0);
 eq((await call('coverage')).find(x=>x.code==='ARCHIVE').changes,0);
 ok((await call('compliance')).some(x=>x.rule==='PURPOSE'));ok((await call('compliance')).some(x=>x.rule==='INDEPENDENT_REVIEW'));
 eq((await call('weekly-review')).review_queue.length,2);ok((await call('investment')).some(x=>x.category==='unclassified'));
 const d=await call('dora'),portal=d.services.find(x=>x.service==='PORTAL'),billing=d.services.find(x=>x.service==='BILLING'),archive=d.services.find(x=>x.service==='ARCHIVE');
 eq(Number(portal.deployments),2);eq(Number(portal.change_failure_pct),50);eq(Number(portal.deployment_rework_pct),50);eq(Number(portal.median_change_lead_hours),72);eq(Number(portal.median_failed_recovery_hours),2);
 eq(Number(billing.unresolved),1);eq(billing.median_failed_recovery_hours,null);eq(archive.change_failure_pct,null);eq(archive.median_change_lead_hours,null);
 const old=await call('dora',{from:'2000-01-01',to:'2000-02-01'});ok(old.services.every(x=>Number(x.deployments)===0&&x.change_failure_pct===null));
 await fails('dora',{from:'2026-02-30'},/Invalid calendar/);await fails('dora',{from:'2026-02-02',to:'2026-02-01'},/precede/);
 const shown=await call('show',{type:'services',ref:'customer PORTAL'});eq(shown.record.code,'PORTAL');ok(shown.history.length>0);
 eq((await call('show',{type:'services',ref:shown.record.id.slice(0,10)}).catch(e=>({error:e.message}))).error?.startsWith('Ambiguous'),true);
 await assert.rejects(()=>call('show',{type:'services',ref:'service'}),/Ambiguous.*services:[\s\S]*ARCHIVE[\s\S]*BILLING/);checks++;
 await assert.rejects(()=>call('show',{type:'services',ref:'nobody'}),/No matching/);checks++;
 await assert.rejects(()=>call('show',{type:'audit_log',ref:'x'}),/Unknown record type/);checks++;
 await assert.rejects(()=>call('add-service',{code:'BAD'}),/actor/);checks++;
 const [s]=await write('add-service',{code:'TEST',name:'Test service <script>bad()</script>',owner:'Tester'});eq(s.code,'TEST');
 await write('set-policy',{service:'TEST',purpose:'Review delivery',notice:'policy://notice','retention-review':'2099-01-01','access-review':'2099-01-01'});
 ok(!(await call('compliance')).some(x=>x.record==='TEST'));
 await fails('add-change',{code:'BAD-1',service:'TEST',title:'Invalid order',author:'Author',commit:iso(-5),opened:iso(-6)},/check constraint/);
 await fails('add-change',{code:'BAD-2',service:'TEST',title:'Future',author:'Author',commit:iso(-5),opened:iso(1)},/future/);
 await write('add-change',{code:'PR-T',service:'TEST',title:'Test change',author:'Author',commit:iso(-10),opened:iso(-8),additions:'10',deletions:'0',category:'feature'});
 await fails('record-review',{change:'PR-T',reviewer:'author',at:iso(-7),evidence:'review://1'},/independent/);
 await fails('record-review',{change:'PR-T',reviewer:'Other',at:iso(-9),evidence:'review://1'},/precede/);
 await fails('merge-change',{change:'PR-T',at:iso(-5)},/current independent/);
 await write('record-review',{change:'PR-T',reviewer:'Reviewer',at:iso(-7),evidence:'review://1'});
 await write('amend-change',{change:'PR-T',title:'Revised change <img src=x onerror=bad()>'});
 await fails('merge-change',{change:'PR-T',at:iso(-5)},/current independent/);
 await write('record-review',{change:'PR-T',reviewer:'Reviewer',at:iso(-6),evidence:'review://2'});
 await fails('merge-change',{change:'PR-T',at:iso(-7)},/current independent/);
 await write('merge-change',{change:'PR-T',at:iso(-5)});
 await fails('amend-change',{change:'PR-T',title:'Late edit'},/immutable/);
 await fails('record-review',{change:'PR-T',reviewer:'Other',at:iso(-4),evidence:'review://3'},/after merge/);
 await fails('add-deployment',{code:'REL-BAD',service:'PORTAL',version:'x',at:iso(-4),changes:'PR-T',evidence:'release://x'},/same service/);
 eq((await db.query("SELECT count(*) AS n FROM deployments WHERE code='REL-BAD'"))[0].n,0,'partial deployment rolled back');
 await fails('add-deployment',{code:'REL-EARLY',service:'TEST',version:'x',at:iso(-6),changes:'PR-T',evidence:'release://x'},/merged before/);
 await write('add-deployment',{code:'REL-T',service:'TEST',version:'1',at:iso(-4),changes:'PR-T',evidence:'release://1'});
 await write('add-deployment',{code:'REL-T2',service:'TEST',version:'2',at:iso(-3),evidence:'release://2',rework:true,reason:'Incident correction'});
 await write('link-change',{deployment:'REL-T2',change:'PR-T'});
 eq((await write('link-change',{deployment:'REL-T2',change:'PR-T'})).length,0,'duplicate link is a no-op');
 let td=(await call('dora')).services.find(x=>x.service==='TEST');eq(Number(td.deployments),2);eq(Number(td.lead_samples),1,'redeployment does not duplicate lead observations');ok(Number(td.median_change_lead_hours)>5.99&&Number(td.median_change_lead_hours)<6.01);
 await fails('flag-failure',{deployment:'REL-T',at:iso(-5),reason:'bad time',evidence:'e'},/check constraint/);
 await write('flag-failure',{deployment:'REL-T',at:iso(-2),reason:'Service unavailable',evidence:'incident://1'});
 await fails('recover-deployment',{deployment:'REL-T',at:iso(-3),evidence:'proof'},/check constraint/);
 await fails('recover-deployment',{deployment:'REL-T',at:iso(-1)},/evidence/);
 await write('recover-deployment',{deployment:'REL-T',at:iso(-1),evidence:'monitor://recovered'});
 td=(await call('dora')).services.find(x=>x.service==='TEST');eq(Number(td.change_failure_pct),50);eq(Number(td.deployment_rework_pct),50);eq(Number(td.unresolved),0);ok(Number(td.median_failed_recovery_hours)>0.99&&Number(td.median_failed_recovery_hours)<1.01);
 await write('add-action',{code:'ACT-T',service:'TEST',title:'Write regression test',owner:'Reviewer',due:'2026-01-01'});
 await fails('close-action',{action:'ACT-T'},/evidence/);await write('close-action',{action:'ACT-T',evidence:'test://PASS'});
 ok(!(await call('actions')).some(x=>x.code==='ACT-T'));
 await write('log-note',{service:'TEST',text:'Review agreed. <script>not executable</script>'});
 const events=await call('activity');ok(events.some(x=>x.actor==='Test operator'&&x.before_row&&x.after_row));
 // Imported summaries: explicit mapping, null handling, same-file idempotency and atomic rollback.
 const map=path.join(REPO_ROOT,'fixtures/linearb-map.json'),file=path.join(REPO_ROOT,'fixtures/linearb-dashboard.csv');
 const dry=await write('import',{file,map,scope:'portal', 'dry-run':true});eq(dry.inserted,6);eq((await call('metric-history')).length,0);
 const loaded=await write('import',{file,map,scope:'portal'});eq(loaded.inserted,6);eq((await write('import',{file,map,scope:'portal'})).already_imported,true);
 const hist=await call('metric-history',{scope:'portal',metric:'failure_rate'});eq(Number(hist[0].value),0);eq(hist[1].value,null,'missing is not zero');
 const trends=await call('metric-trend',{scope:'portal',metric:'cycle_time'});eq(Number(trends[1].change_from_previous),-12);
 const source=fs.readFileSync(file,'utf8');const revised=fixture('revised.csv',source.replace(',24,18,',',20,18,'));
 await fails('import',{file:revised,map,scope:'portal'},/Changed metric/);eq(Number((await call('metric-history',{scope:'portal',metric:'cycle_time'}))[1].value),24);
 eq((await write('import',{file:revised,map,scope:'portal',update:true})).updated,1);
 eq((await db.query('SELECT count(*) AS n FROM imports'))[0].n,2,'dry runs and failed imports leave no batch');
 const duplicate=fixture('duplicate.csv',source+source.split('\n')[1]+'\n');await fails('import',{file:duplicate,map,scope:'dupe'},/Duplicate metric period/);
 const invalid=fixture('invalid.csv',source.replace(',24,18,',',nonsense,18,'));await fails('import',{file:invalid,map,scope:'invalid'},/expected a numeric/);
 eq((await call('metric-history',{scope:'invalid'})).length,0);
 const badNumber=fixture('bad-number.csv',source.replace(',24,18,',',"1,2",18,'));await fails('import',{file:badNumber,map,scope:'bad-number'},/expected a numeric/);
 const dates=fixture('dates.csv',source.replace('2026-11-02','2026-02-30'));await fails('import',{file:dates,map,scope:'bad-date'},/Invalid calendar/);
 const empty=fixture('empty.csv','Date Range,Cycle Time\n');await fails('import',{file:empty,map,scope:'empty'},/no data rows/);
 eq(parseCsv('\ufeffName,Note\r\nA,"one, two\nthree ""quoted"""\r\n')[0].Note,'one, two\nthree "quoted"');
 for(const text of ['x,X\n1,2','x,y\n1','x\n"unclosed','x\n"a"junk']){assert.throws(()=>parseCsv(text));checks++;}
 const split=fixture('split.csv','Start,End,Count\n2026-11-01,2026-11-07,0\n');
 const splitMap=fixture('split.json',JSON.stringify({start:'Start',end:'End',metrics:{Count:{metric:'changes',unit:'count',aggregation:'total'}}}));
 eq((await write('import',{file:split,map:splitMap,scope:'split'})).inserted,1);
 // Strict flag parser catches dangerous typos before opening the database.
 for(const args of [['import','linearb','--dryrun'],['dora','--from'],['services','--actor=No'],['import','linearb','--dry-run=false'],['services','--json','--json'],['not-a-command']]){assert.throws(()=>parseArgs(args));checks++;}
 eq(parseArgs(['import','linearb','--dry-run','--actor=Tester']).opts['dry-run'],true);
 const exported=await call('export');const archiveData=JSON.parse(fs.readFileSync(exported.file,'utf8'));eq(archiveData.tables.changes.length,7);ok(archiveData.tables.audit_log.length>40);ok(archiveData.tables.metric_snapshots.every(x=>x.raw_row));
 for(const c of ['draft-weekly','draft-followup']){const draft=await call(c);eq(draft.sent,false);ok(fs.readFileSync(draft.file,'utf8').includes('Draft only'));}
 const rendered=page({title:'<script>x</script>',sections:[{title:'Safe',html:htmlTable([{name:'<img src=x onerror=bad()>'}])}],brand:loadBrand()});ok(!rendered.includes('<script>'));ok(rendered.includes('&lt;img'));
 ok(format([{n:null}]).includes('unknown'));eq((await call('help')).length,Object.keys(COMMANDS).length);
 for(const c of Object.keys(COMMANDS))ok(seen.has(c),`command exercised: ${c}`);
 // Close PGlite before child processes open its files.
 await db.close();
 const cliOut=JSON.parse(cli(['scripts/delivery.mjs','services','--json']));eq(cliOut.length,4);
 cli(['scripts/delivery.mjs','show','--type=services','--ref=service'],1);
 cli(['scripts/delivery.mjs','import','linearb','--dryrun'],1);
 cli(['scripts/view.mjs']);cli(['scripts/docs.mjs']);
 const week=fs.readFileSync(path.join(temp,'views/week.html'),'utf8');ok(week.includes('Waiting for review'));ok(!week.includes('<script>'));
 const reports=fs.readdirSync(path.join(temp,'docs-out/delivery-review'));eq(reports.length,4);
 const testDoc=reports.find(x=>x.startsWith('test-'));const document=fs.readFileSync(path.join(temp,'docs-out/delivery-review',testDoc),'utf8');ok(document.includes('&lt;script&gt;'));ok(!document.includes('<script>'));
 console.log(`PASS: ${checks} checks; all ${Object.keys(COMMANDS).length} CLI commands; ${db.mode}; imports, gates, calculations, drafts and HTML`);
}finally{try{await db.close();}catch{}fs.rmSync(temp,{recursive:true,force:true});}
