/** App-backed diagnostic only. The guarded product export remains closed for Sidebar. */
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const output=path.resolve(process.argv[2]);
const base=process.env.DOCX_NEXT_APP_URL;
const projectDirectory=path.resolve(process.env.DOCX_NEXT_SIDEBAR_PROJECTS??'tests/fixtures/docx-next/sidebar-saved-app-22okt');
// Diagnostic packets must use the repository's synthetic asset. Never pull a
// person's photo from another project or from Library for visual QA.
const safePhotos=new Set(await Promise.all(['05-left-clear-portrait.json','06-right-clear-photo.json'].map(async file=>JSON.parse(await readFile(path.join('tests/fixtures/docx-next/sidebar-saved-app-22okt',file),'utf8')).cv.data.person.foto)));
const composition=process.env.DOCX_NEXT_SIDEBAR_COMPOSITION??'shared-body-stories';
assert(['body-stories','shared-body-stories'].includes(composition));
const query='?docx-next-design-qa=1';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.DOCX_NEXT_CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-gpu']});
const results=[];
try {
 for(const item of [
  {id:'01-Sidebar-links-Portrait',side:'left',file:'01-left-portrait.json'},
  {id:'02-Sidebar-rechts-Foto',side:'right',file:'02-right-free-photo.json'},
  {id:'03-Sidebar-rechts-Folgeseite',side:'right',file:'03-right-continuation.json'},
  {id:'04-Sidebar-rechts-Foto-x25',side:'right',file:'04-right-photo-x25.json'},
  {id:'05-Sidebar-links-Foto-frei',side:'left',file:'05-left-clear-portrait.json'},
  {id:'06-Sidebar-rechts-Foto-frei',side:'right',file:'06-right-clear-photo.json'},
  {id:'07-Sidebar-rechts-Eigene-Typografie',side:'right',file:'07-right-user-typography.json'},
  {id:'08-Sidebar-links-Foto-automatisch',side:'left',file:'08-left-automatic-photo.json'},
  {id:'09-Sidebar-rechts-Foto-automatisch',side:'right',file:'09-right-automatic-photo.json'}
 ].filter(item=>!process.env.DOCX_NEXT_SIDEBAR_CASE||process.env.DOCX_NEXT_SIDEBAR_CASE.split(',').some(prefix=>item.id.startsWith(prefix)))) {
  const folder=path.join(output,item.id);await mkdir(folder,{recursive:true});
  const input=JSON.parse(await readFile(path.join(projectDirectory,item.file),'utf8'));
  assert(!input.cover.data.foto&&(!input.cv.data.person.foto||safePhotos.has(input.cv.data.person.foto)),'QA accepts only checked synthetic photos; private project images are forbidden');
  if(input.cv.data.person.foto)await writeFile(path.join(folder,'Originalfoto.png'),Buffer.from(input.cv.data.person.foto.split(',')[1],'base64'));
  const context=await browser.newContext({viewport:{width:Number(process.env.DOCX_NEXT_VIEWPORT_WIDTH??1440),height:1200},deviceScaleFactor:Number(process.env.DOCX_NEXT_DEVICE_SCALE_FACTOR??1)});
  try {
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>void d.accept());
   await page.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
   await page.goto(base+'/'+query,{waitUntil:'networkidle'});
   await Promise.all([page.waitForEvent('load'),page.locator('input[type="file"][accept="application/json,.json"]').setInputFiles({name:'source.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(input))})]);
   for(const route of ['/titelblatt','/anschreiben']){await page.goto(base+route+query,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);}
   await page.goto(base+'/lebenslauf'+query,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
   const cv=page.locator('main [data-dossier-document="cv"]').first(),sheets=cv.locator('[data-cv-page]');
   const webCvPages=await sheets.count();assert(webCvPages>0);
   const webSidebarGeometry=await sheets.first().evaluate(sheet=>{const page=sheet.getBoundingClientRect(),side=sheet.querySelector('[data-cv-sidebar]').getBoundingClientRect();return {leftMm:210*(side.x-page.x)/page.width,widthMm:210*side.width/page.width};});
   const webFlowBaselines=await sheets.first().evaluate(sheet=>{
    const page=sheet.getBoundingClientRect(),factor=210/page.width,result={};
    for(const el of sheet.querySelectorAll('[data-cv-main] [data-cv-doc-title], [data-cv-main] [data-cv-name], [data-cv-main] [data-cv-section-title]')){
     const css=getComputedStyle(el),zoom=Array.from((function*(e){for(let n=e;n&&n!==sheet;n=n.parentElement)yield n;})(el)).reduce((v,n)=>v*(getComputedStyle(n).zoom==='normal'?1:Number(getComputedStyle(n).zoom)),1);
     if(el.getBoundingClientRect().height>parseFloat(css.lineHeight)*zoom*1.1)continue;
     const text=el.textContent,id=el.dataset.dossierFieldId??'cv.person.name';
     const mark=document.createElement('span');mark.style.cssText='display:inline-block;width:0;height:0;vertical-align:baseline;padding:0;margin:0';el.append(mark);
     result[id]={text,page:1,xMm:(el.getBoundingClientRect().left-page.left)*factor,baselineMm:(mark.getBoundingClientRect().top-page.top)*factor};mark.remove();
    }return result;
   });
   for(let i=0;i<webCvPages;i++)await sheets.nth(i).screenshot({path:path.join(folder,'Web-CV-'+(i+1)+'.png')});
   await page.goto(base+'/'+query,{waitUntil:'networkidle'});
   const savedDownload=page.waitForEvent('download');
   await page.evaluate(async()=>{const m=await import('/src/lib/dossier-project-file.ts');m.downloadDossierProjectFromBrowser();});
   await(await savedDownload).saveAs(path.join(folder,'Projekt.json'));
   const saved=JSON.parse(await readFile(path.join(folder,'Projekt.json'),'utf8'));
   assert.equal(saved.cv.portableState.layout,'modern');assert.equal(saved.cv.portableState.infoPosition,item.side==='right'?'mirrored':'standard');
   assert.deepEqual(saved.cv.portableState.photoPlacement,input.cv.portableState.photoPlacement,'Opening the editor changed saved picture placement');
   if(process.env.DOCX_NEXT_OUTER_ZOOM)await page.evaluate(zoom=>{document.body.style.zoom=zoom;},process.env.DOCX_NEXT_OUTER_ZOOM);
   const before=await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))));
   const generated=await page.evaluate(async({composition,photo})=>{
    const {captureSharedSidebarQaCandidate}=await import('/scripts/qa-sidebar-candidate.browser.ts');
    return captureSharedSidebarQaCandidate(composition,photo);
   },{composition,photo:input.cv.data.person.foto??null});
   assert.equal(generated.snapshot.settings.cvLayout,'sidebar');assert.equal(generated.snapshot.settings.sidebarSide,item.side);
   const download=page.waitForEvent('download');
   await page.evaluate(async({bytes,name})=>{const {downloadBlob}=await import('/src/lib/download.ts');downloadBlob(new Blob([new Uint8Array(bytes)],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),name);},{bytes:generated.bytes,name:item.id+'.docx'});
   await(await download).saveAs(path.join(folder,item.id+'.docx'));
   const native=await readFile(path.join(folder,item.id+'.docx'));assert.deepEqual(native,Buffer.from(generated.bytes));
   const {bytes,...proof}=generated;proof.webFlowBaselines=webFlowBaselines;await writeFile(path.join(folder,'proof.json'),JSON.stringify(proof,null,2));
   await page.getByRole('button').filter({hasText:'Gesamtdossier herunterladen'}).click();
   const dialog=page.getByRole('dialog',{name:'Dossier herunterladen'});await dialog.getByRole('radio',{name:'Fertiges Dossier (PDF)'}).click();
   const pdfButton=dialog.getByRole('button',{name:'PDF herunterladen',exact:true});
   let pdfAvailable=false;
   for(let i=0;i<30;i++){if(await pdfButton.isEnabled()){pdfAvailable=true;break;}await page.waitForTimeout(200);}
   const pdfPreflight=await dialog.textContent();await writeFile(path.join(folder,'PDF-Pruefung.txt'),pdfPreflight);
   if(pdfAvailable){const pdf=page.waitForEvent('download',{timeout:60000});await pdfButton.click();await(await pdf).saveAs(path.join(folder,'App-Referenz.pdf'));}
   const after=await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))));assert.equal(after,before);assert.deepEqual(errors,[]);
   if(composition==='shared-body-stories'){const surface=generated.model.cv.artwork.find(x=>x.id==='cv.artwork.sidebar-surface');assert(Math.abs(surface.widthMm-webSidebarGeometry.widthMm)<0.05,'App/native rail width differs');assert(Math.abs(surface.xMm-webSidebarGeometry.leftMm)<0.05,'App/native rail position differs');}
   const result={id:item.id,composition,side:item.side,webCvPages,webSidebarGeometry,nativeSidebarSurface:generated.model.cv.artwork.find(x=>x.id==='cv.artwork.sidebar-surface'),appRestoredProject:true,actualProjectSave:true,primaryPdfDownloaded:pdfAvailable,pdfPreflight,freshSidebarStyles:!!generated.sidebarMetrics,adjacentPartsUnchanged:generated.adjacentPartsUnchanged,nativeScope:'Explicit internal candidate from fresh saved-app capture; guarded regular export remains rejected',productGuardPreserved:true,savedStateUnchanged:true,jsErrors:errors,picture:generated.picture,pixelsPreserved:!generated.picture||JSON.stringify(generated.picture.source)===JSON.stringify(generated.picture.normalized),docxSha256:createHash('sha256').update(native).digest('hex')};
   results.push(result);console.log(JSON.stringify(result));await writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2));
  } finally {await context.close();}
 }
 assert(results.every(r=>r.pixelsPreserved),'Exporter changed original picture pixels before Word');
} finally {await browser.close();}
