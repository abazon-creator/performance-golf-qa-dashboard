/**
 * Team Anne — Daily Performance & QA — Auto Insights
 * Google Apps Script (templated, no LLM). Runs on a daily time trigger.
 *
 * Flow: read the filtered Team-Anne CSV from the Drive drop folder ->
 * compute metrics -> append a formatted day into the living Doc IN PLACE ->
 * insert the day into the GitHub Pages dashboard (index.html). Pages auto-deploys.
 *
 * SETUP: see automation/SETUP.md.
 * Required Script Property:  GITHUB_TOKEN  (fine-grained PAT, Contents:R/W on the repo)
 */

// ------------------------------- CONFIG -------------------------------
const CFG = {
  DROP_FOLDER_ID: '1pUFsujkybGUiFfdNT14OXoMHNQei146o',
  DOC_ID:         '1tXqKQoZFcij3xbJMS5rUw992rTsL6s6_F-z-YYxyojE',
  GH_OWNER:       'abazon-creator',
  GH_REPO:        'performance-golf-qa-dashboard',
  GH_PATH:        'index.html',
  FILE_PREFIX:    'Call Transcript - Team Anne - ',   // + MM-DD-YYYY.csv
  MARKER:         '/* __NEW_DAY__ */',
  CONV_FLOOR:     30,
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Decline sub-reason -> high-converting rebuttal (templated)
const REBUTTALS = {
  'Not interested': 'Reframe from features to the one shot that annoys them most, and lead with the risk-free guarantee.',
  'Just bought':    'Don’t stack a new offer—book a 5-minute onboarding so the club they just bought performs; the attach comes after value.',
  'Cost':           'Anchor to a single SKU and the guarantee—they only keep it if it outperforms what’s already in the bag.',
  'Time':           'Activate now so it’s ready their next round; nothing happens until they tee off.',
  'Upset/Adamant':  'Disengage cleanly and preserve the relationship; log it for a later, softer touch.',
};
function rebuttalFor(reason){ return REBUTTALS[reason] || 'Qualify the specific gap before offering; lead with the guarantee and the exact shot it fixes.'; }

// ------------------------------- ENTRY POINTS -------------------------------
function main()    { run_(false); }   // <- point the daily trigger at this

// Run manually to VALIDATE: force-processes the most recent CSV, logs metrics,
// writes NOTHING (no Doc, no GitHub, no state change). Ignores the processed list.
function testRun(){
  var cands = listNewFiles_([]);                 // empty processed -> every file counts
  if (!cands.length){ Logger.log('No "'+CFG.FILE_PREFIX+'*" CSV found in the drop folder.'); return; }
  cands.sort(function(a,b){ return a.iso < b.iso ? 1 : -1; });   // newest first
  var c = cands[0];
  var rows = Utilities.parseCsv(c.file.getBlob().getDataAsString('UTF-8'));
  var day = analyze_(c.iso, rows);
  Logger.log('FILE:    ' + c.name + '  (' + c.iso + ')');
  Logger.log('METRICS: ' + JSON.stringify(day.metrics));
  Logger.log('AGENTS:  ' + day.agentList.length + '   GLARING: ' + (day.glaringAgent ? day.glaringAgent.name + ' (' + day.glaringAgent.dials + ' dials, ' + day.glaringAgent.sold + ' sold)' : '-'));
  Logger.log('FLAGGED: ' + day.flagged.map(function(f){ return f.who + ' — ' + f.disp; }).join('  |  '));
  Logger.log('MODEL:   ' + day.model.map(function(f){ return f.who + ' — ' + f.disp; }).join('  |  '));
  Logger.log('REBUTTAL REASONS: ' + day.rebuttals.map(function(r){ return r.h; }).join(', '));
  Logger.log('--- testRun OK: nothing was written. Now run installDailyTrigger to schedule it. ---');
}

// ------------------------------- CORE -------------------------------
function run_(dryRun){
  const processed = getProcessed_();
  const cands = listNewFiles_(processed);          // [{iso, name, file}]
  if (!cands.length){ Logger.log('no new file'); return; }
  cands.sort(function(a,b){ return a.iso < b.iso ? -1 : 1; });   // oldest first
  cands.forEach(function(c){
    const text = c.file.getBlob().getDataAsString('UTF-8');
    const rows = Utilities.parseCsv(text);
    const day  = analyze_(c.iso, rows);
    if (dryRun){ Logger.log('%s -> %s', c.iso, JSON.stringify(day.metrics)); return; }
    appendDocSection_(day);
    updateDashboard_(day);
    markProcessed_(c.iso);
    Logger.log('processed %s', c.iso);
  });
}

function listNewFiles_(processed){
  const folder = DriveApp.getFolderById(CFG.DROP_FOLDER_ID);
  const it = folder.getFiles();
  const out = [];
  while (it.hasNext()){
    const f = it.next();
    const name = f.getName();
    if (name.indexOf(CFG.FILE_PREFIX) !== 0) continue;
    const m = name.match(/(\d{2})-(\d{2})-(\d{4})/);         // MM-DD-YYYY
    if (!m) continue;
    const iso = m[3] + '-' + m[1] + '-' + m[2];
    if (processed.indexOf(iso) === -1) out.push({ iso: iso, name: name, file: f });
  }
  return out;
}

// ------------------------------- ANALYSIS -------------------------------
function bucket_(d){
  if (!d || !d.trim()) return 'blank';
  if (/^A\./.test(d)) return 'unreachable';
  if (/^B\. Busy tone/.test(d)) return 'busytone';
  if (/^L\./.test(d)) return 'ghost';
  if (/^M\./.test(d)) return 'invalid';
  if (/^D\./.test(d)) return 'sold';
  if (/^F\./.test(d)) return 'declined';
  if (/^O\./.test(d)) return 'cancellation';
  if (/^Q\./.test(d)) return 'info';
  if (/^C\./.test(d)) return 'callended';
  if (/^B\./.test(d)) return 'already_b';
  if (/^G\./.test(d)) return 'dnc';
  if (/^X\./.test(d)) return 'callback_x';
  return 'other';
}
function isNotConnected_(b){ return b==='unreachable'||b==='busytone'||b==='ghost'||b==='invalid'||b==='blank'; }
function durSec_(s){ if(!s) return 0; var p=(''+s).split(':').map(Number); if(p.length===3) return p[0]*3600+p[1]*60+p[2]; if(p.length===2) return p[0]*60+p[1]; return 0; }
function pct_(n,d){ return d ? Math.round(n/d*1000)/10 : 0; }
function fmtDate_(iso){ var p=iso.split('-'); return MONTHS[Number(p[1])-1]+' '+Number(p[2])+', '+p[0]; }

function analyze_(iso, rows){
  var head = rows[0];
  var col = {}; head.forEach(function(h,i){ col[h.trim()] = i; });
  function C(r,name){ var i=col[name]; return i==null?'':(r[i]==null?'':r[i]); }

  var calls = [];
  for (var i=1;i<rows.length;i++){ var r=rows[i]; if((C(r,'Type')||'').toLowerCase()==='call') calls.push(r); }

  var team = { dials: calls.length, notConn:0, sold:0, declined:0, upsell:0,
               unreachable:0, busytone:0, ghost:0, invalid:0, blank:0,
               already_b:0, callended:0, info:0, cancellation:0, dnc:0, callback_x:0 };
  var agents = {};
  var soldRows = [], declinedRows = [];

  calls.forEach(function(r){
    var disp = C(r,'Call Disposition');
    var b = bucket_(disp);
    if (team[b] != null) team[b]++;
    if (isNotConnected_(b)) team.notConn++;
    var name = (C(r,'User Name')||'').trim() || '(unassigned)';
    var a = agents[name] || (agents[name] = {name:name, dials:0, conn:0, sold:0, dec:0});
    a.dials++;
    if (!isNotConnected_(b)) a.conn++;
    if (b==='sold'){ team.sold++; a.sold++; soldRows.push(r);
      if (/Upsell|PG1\+VIP/.test(disp)) team.upsell++; }
    if (b==='declined'){ team.declined++; a.dec++; declinedRows.push(r); }
  });

  var connected = team.dials - team.notConn;
  var metrics = {
    dials: team.dials, connected: connected, sold: team.sold, declined: team.declined,
    connect: pct_(connected, team.dials), conv: pct_(team.sold, connected),
    decline: pct_(team.declined, connected), upsell: pct_(team.upsell, team.sold),
    upNum: team.upsell, upDen: team.sold
  };

  var agentList = Object.keys(agents).map(function(k){ var a=agents[k];
    a.conv = pct_(a.sold, a.conn); a.decp = pct_(a.dec, a.conn); return a; })
    .filter(function(a){ return a.name !== '(unassigned)'; });

  // glaring: highest dials among zero-sold; else lowest conv among conn>=5
  var zeros = agentList.filter(function(a){ return a.sold===0 && a.conn>0; }).sort(function(x,y){ return y.dials-x.dials; });
  var glaringAgent = zeros.length ? zeros[0]
    : agentList.filter(function(a){ return a.conn>=5; }).sort(function(x,y){ return x.conv-y.conv; })[0];

  // flagged: longest declined calls, distinct agents (up to 3)
  var flagged = pickDistinct_(declinedRows.slice().sort(byDurDesc_(C)), C, 3).map(function(r){
    var reason = (C(r,'Call Disposition')||'').replace(/^F\.\s*Declined\s*-\s*/,'');
    return { type:'flag', who:C(r,'User Name'), disp:'Declined / '+reason+' · '+C(r,'Duration'),
      note:'Long call, no close — coach the offer-transition and disengage discipline.', url:C(r,'Communication Link') };
  });
  // model: longest sold calls, distinct agents (up to 4)
  var model = pickDistinct_(soldRows.slice().sort(byDurDesc_(C)), C, 4).map(function(r){
    return { type:'model', who:C(r,'User Name'), disp:(C(r,'Call Disposition')||'').replace(/^D\.\s*/,'Sold ')+' · '+C(r,'Duration'),
      note:'Clean close — study the discovery-to-offer transition.', url:C(r,'Communication Link') };
  });

  // decline reasons (by count) -> rebuttals, with a verbatim snippet if findable
  var reasonCount = {};
  declinedRows.forEach(function(r){ var reason=(C(r,'Call Disposition')||'').replace(/^F\.\s*Declined\s*-\s*/,'').trim()||'Other';
    reasonCount[reason]=(reasonCount[reason]||0)+1; });
  var rebuttals = Object.keys(reasonCount).sort(function(a,b){ return reasonCount[b]-reasonCount[a]; }).slice(0,4).map(function(reason){
    var ex = declinedRows.filter(function(r){ return (C(r,'Call Disposition')||'').indexOf(reason)>-1; })[0];
    var v = ex ? extractQuote_(C(ex,'Transcription Text')) : '';
    return { h: reason, v: v || '(member declined — reason: '+reason+')', r: rebuttalFor(reason) };
  });

  // ---- dashboard day object (matches index.html DATASET shape) ----
  var offerLeak = team.already_b + team.callended + team.info;
  var lead = agentList.filter(function(a){ return a.sold>0; }).sort(function(x,y){ return y.conv-x.conv; })[0];
  var belowFloor = metrics.conv < CFG.CONV_FLOOR;

  var dayObj = {
    heroTitle: belowFloor
      ? 'Conversion at <em>'+metrics.conv+'%</em> — still under the 30% floor.'
      : 'Conversion at <em>'+metrics.conv+'%</em> — at or above the floor.',
    lede: 'Team Anne ran <b>'+metrics.dials.toLocaleString()+'</b> dials, connected <b>'+metrics.connect+'%</b>, and converted <b>'+metrics.conv+'%</b> ('+metrics.sold+'/'+connected+'). '
        + offerLeak+' connected calls ended in follow-up, call-ended, or info-only — the offer-rate leak. Upsell held at <b>'+metrics.upsell+'%</b>.',
    agents: agentList.map(function(a){ return {name:a.name, dials:a.dials, conn:a.conn, sold:a.sold, dec:a.dec}; }),
    upsellNum: metrics.upNum, upsellDen: metrics.upDen,
    dispoDials: [
      {label:'Unreachable / VM', count: team.unreachable, c:'var(--orange)'},
      {label:'Connected', count: connected, c:'var(--good)'},
      {label:'Busy / Ghost / Invalid', count: team.busytone+team.ghost+team.invalid, c:'var(--warn)'},
      {label:'Blank / uncategorized', count: team.blank, c:'var(--stone)'}
    ],
    dispoConn: [
      {label:'Already comm / follow-up (B)', count: team.already_b, c:'var(--stone)'},
      {label:'Call ended – PG1 (C)', count: team.callended, c:'var(--warn)'},
      {label:'Sold (D)', count: team.sold, c:'var(--good)'},
      {label:'Info provided / resolved (Q)', count: team.info, c:'var(--warn)'},
      {label:'Cancellations (O)', count: team.cancellation, c:'var(--orange)'},
      {label:'Declined (F)', count: team.declined, c:'var(--orange)'},
      {label:'DNC / Callback / Member (G,X)', count: team.dnc+team.callback_x, c:'var(--stone)'}
    ].filter(function(x){ return x.count>0; }),
    headline: {
      k:'Where the leak is',
      h: offerLeak+' connected calls never reached a clean offer.',
      p:'Of '+connected+' connected calls only '+team.sold+' closed ('+metrics.conv+'%). '
        +team.already_b+' ended already-communicated / follow-up, '+team.callended+' call-ended (PG1), and '+team.info+' information-only — that’s where offers are skipped. Connect rate is structurally low ('+pct_(team.unreachable,team.dials)+'% Unreachable/VM): a list-quality and dial-timing issue, not a skill gap.'
    },
    glaring: glaringAgent ? {
      k: glaringAgent.name+' · '+glaringAgent.dials+' dials · '+glaringAgent.conn+' connects · '+glaringAgent.sold+' closes',
      h: glaringAgent.sold===0 ? 'High volume, zero closes — the day’s clearest coaching target.' : 'Lowest conversion on the board — prioritize for QA.',
      p: 'Review this agent’s connected calls for the offer-transition; confirm the dial queue is weighted toward sellable leads rather than low-yield follow-ups.'
    } : {k:'—',h:'—',p:'—'},
    calls: flagged.concat(model),
    rebuttals: rebuttals.length ? rebuttals : [{h:'—', v:'No declines logged today.', r:'Keep protecting the offer-transition.'}],
    actions: buildActions_(glaringAgent, metrics, lead, agentList)
  };

  return { iso: iso, metrics: metrics, agentList: agentList, dayObj: dayObj,
           team: team, connected: connected, flagged: flagged, model: model, rebuttals: rebuttals, glaringAgent: glaringAgent, lead: lead };
}

function byDurDesc_(C){ return function(a,b){ return durSec_(C(b,'Duration')) - durSec_(C(a,'Duration')); }; }
function pickDistinct_(rows, C, n){ var seen={}, out=[]; for (var i=0;i<rows.length&&out.length<n;i++){ var who=C(rows[i],'User Name'); if(seen[who]) continue; seen[who]=1; out.push(rows[i]); } return out; }
function extractQuote_(t){ if(!t) return ''; t=(''+t).replace(/\s+/g,' ');
  var m = t.match(/(?:Contact:\s*)([^.?!]*\b(?:don't|not interested|already|just bought|too much|expensive|cost|money|no time|busy|happy with|can't afford)\b[^.?!]*[.?!])/i);
  if(m){ var q=m[1].trim(); if(q.length>140) q=q.slice(0,140)+'…'; return '“'+q+'”'; } return ''; }
function buildActions_(g, m, lead, agentList){
  var acts = [];
  if (g) acts.push({pri:true, t:g.name+' (Priority)', d:'Audit lead allocation and QA the offer-transition; '+(g.sold===0?'zero closes on '+g.dials+' dials today.':'lowest conversion on the board.')});
  acts.push({t:'Whole team', d:'Conversion '+m.conv+'% vs the 30% floor — attack the offer-rate leak in connected calls that ended in follow-up / call-ended / info-only.'});
  if (lead) acts.push({t:'Study the winner', d:lead.name+' led at '+lead.conv+'% ('+lead.sold+' closes) — model the discovery-to-offer transition in the huddle.'});
  acts.push({t:'Protect the strength', d:m.upsell+'% upsell ('+m.upNum+'/'+m.upDen+') — keep the PG1+VIP and club attach momentum.'});
  var idle = agentList.filter(function(a){ return a.dials===0; });
  if (idle.length) acts.push({t:'Attendance', d:idle.map(function(a){return a.name;}).join(', ')+' logged no dials — confirm schedule.'});
  return acts;
}

// ------------------------------- DOC (in place, newest first) -------------------------------
function appendDocSection_(day){
  var body = DocumentApp.openById(CFG.DOC_ID).getBody();
  var idx = firstHeading2Index_(body);           // insert above the most recent day
  var ORANGE='#FD3300', BLACK='#1D1A1A', GRAY='#7B726C';
  var m = day.metrics, d = day.dayObj;

  var h = body.insertParagraph(idx++, fmtDate_(day.iso)).setHeading(DocumentApp.ParagraphHeading.HEADING2);
  h.editAsText().setForegroundColor(ORANGE);

  body.insertParagraph(idx++, 'SNAPSHOT  ·  '+m.dials.toLocaleString()+' dials · '+m.connect+'% connect · '
      +m.conv+'% conversion · '+m.decline+'% decline · '+m.upsell+'% upsell');

  body.insertParagraph(idx++, d.headline.h+' Of '+day.connected+' connected calls, '+m.sold+' closed ('+m.conv+'%).');

  body.insertParagraph(idx++, 'Agent Scorecard').setHeading(DocumentApp.ParagraphHeading.HEADING3).editAsText().setForegroundColor(BLACK);
  var cells = [['Agent','Dials','Conn','Sold','Conv %','Dec %']];
  d.agents.slice().sort(function(a,b){ return pct_(b.sold,b.conn)-pct_(a.sold,a.conn); }).forEach(function(a){
    cells.push([a.name, ''+a.dials, ''+a.conn, ''+a.sold, ''+pct_(a.sold,a.conn), ''+pct_(a.dec,a.conn)]);
  });
  var table = body.insertTable(idx++, cells);
  var hdr = table.getRow(0);
  for (var c=0;c<6;c++){ hdr.getCell(c).setBackgroundColor(BLACK); hdr.getCell(c).editAsText().setForegroundColor('#FFFFFF').setBold(true); }

  body.insertParagraph(idx++, 'Most Glaring Opportunity').setHeading(DocumentApp.ParagraphHeading.HEADING3).editAsText().setForegroundColor(BLACK);
  body.insertParagraph(idx++, d.glaring.k + ' — ' + d.glaring.p);

  idx = insertList_(body, idx, 'Flagged Calls for Coaching', day.flagged);
  idx = insertList_(body, idx, 'Model Calls of the Day', day.model);

  body.insertParagraph(idx++, 'Top Decline Reasons + Rebuttals').setHeading(DocumentApp.ParagraphHeading.HEADING3).editAsText().setForegroundColor(BLACK);
  day.rebuttals.forEach(function(rb){ body.insertListItem(idx++, rb.h+' — '+rb.v+' → '+rb.r).setGlyphType(DocumentApp.GlyphType.BULLET); });

  body.insertParagraph(idx++, 'Summary & Action Plan').setHeading(DocumentApp.ParagraphHeading.HEADING3).editAsText().setForegroundColor(BLACK);
  d.actions.forEach(function(ac){ body.insertListItem(idx++, ac.t+': '+ac.d).setGlyphType(DocumentApp.GlyphType.BULLET); });
}
function insertList_(body, idx, title, items){
  body.insertParagraph(idx++, title).setHeading(DocumentApp.ParagraphHeading.HEADING3).editAsText().setForegroundColor('#1D1A1A');
  items.forEach(function(it){ body.insertListItem(idx++, it.who+' — '+it.disp+': '+it.note+'  '+it.url).setGlyphType(DocumentApp.GlyphType.BULLET); });
  return idx;
}
function firstHeading2Index_(body){
  var n = body.getNumChildren();
  for (var i=0;i<n;i++){ var el=body.getChild(i);
    if (el.getType()===DocumentApp.ElementType.PARAGRAPH && el.asParagraph().getHeading()===DocumentApp.ParagraphHeading.HEADING2) return i; }
  return n; // none yet -> append at end
}

// ------------------------------- DASHBOARD (GitHub Contents API) -------------------------------
function updateDashboard_(day){
  var got = ghGet_();
  var html = Utilities.newBlob(Utilities.base64Decode(got.content)).getDataAsString('UTF-8');
  if (html.indexOf('"'+day.iso+'":') > -1){ Logger.log('dashboard already has '+day.iso); return; }
  var entry = '"'+day.iso+'": '+JSON.stringify(day.dayObj)+',\n  '+CFG.MARKER;
  var out = html.replace(CFG.MARKER, entry);
  ghPut_(out, got.sha, 'Auto: add Team Anne '+day.iso);
}
function ghHeaders_(){ var t=PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if(!t) throw new Error('Set Script Property GITHUB_TOKEN'); return {Authorization:'token '+t, Accept:'application/vnd.github+json'}; }
function ghUrl_(){ return 'https://api.github.com/repos/'+CFG.GH_OWNER+'/'+CFG.GH_REPO+'/contents/'+CFG.GH_PATH; }
function ghGet_(){ var res=UrlFetchApp.fetch(ghUrl_(),{headers:ghHeaders_(),muteHttpExceptions:true});
  if(res.getResponseCode()!==200) throw new Error('GET index.html '+res.getResponseCode()+' '+res.getContentText());
  return JSON.parse(res.getContentText()); }
function ghPut_(content, sha, msg){
  var res=UrlFetchApp.fetch(ghUrl_(),{method:'put',headers:ghHeaders_(),contentType:'application/json',muteHttpExceptions:true,
    payload:JSON.stringify({message:msg, content:Utilities.base64Encode(content, Utilities.Charset.UTF_8), sha:sha, branch:'main'})});
  if(res.getResponseCode()>=300) throw new Error('PUT index.html '+res.getResponseCode()+' '+res.getContentText());
}

// ------------------------------- STATE -------------------------------
function getProcessed_(){ var p=PropertiesService.getScriptProperties().getProperty('processedDates'); return p?p.split(','):['2026-07-01','2026-07-02']; }
function markProcessed_(iso){ var a=getProcessed_(); if(a.indexOf(iso)===-1){ a.push(iso); PropertiesService.getScriptProperties().setProperty('processedDates', a.join(',')); } }

// ------------------------------- TRIGGER INSTALLER -------------------------------
function installDailyTrigger(){        // run once
  ScriptApp.getProjectTriggers().forEach(function(t){ if(t.getHandlerFunction()==='main') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('main').timeBased().atHour(6).everyDays(1).inTimezone('America/New_York').create();
  Logger.log('Daily 6:00 AM America/New_York trigger installed.');
}
