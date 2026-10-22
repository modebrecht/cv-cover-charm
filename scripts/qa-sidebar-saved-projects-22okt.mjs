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
const query='?docx-next-design-qa=1';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.DOCX_NEXT_CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-gpu']});
const results=[];
try {
 for(const item of [
  {id:'01-Sidebar-links-Portrait',side:'left',file:'01-left-portrait.json'},
  {id:'02-Sidebar-rechts-Foto',side:'right',file:'02-right-free-photo.json'},
  {id:'03-Sidebar-rechts-Folgeseite',side:'right',file:'03-right-continuation.json'}
 ]) {
  const folder=path.join(output,item.id);await mkdir(folder,{recursive:true});
  const input=JSON.parse(await readFile(path.join(projectDirectory,item.file),'utf8'));
  if(input.cv.data.person.foto)await writeFile(path.join(folder,'Originalfoto.png'),Buffer.from(input.cv.data.person.foto.split(',')[1],'base64'));
  const context=await browser.newContext({viewport:{width:1440,height:1200},deviceScaleFactor:1});
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
   for(let i=0;i<webCvPages;i++)await sheets.nth(i).screenshot({path:path.join(folder,'Web-CV-'+(i+1)+'.png')});
   await page.goto(base+'/'+query,{waitUntil:'networkidle'});
   const savedDownload=page.waitForEvent('download');
   await page.evaluate(async()=>{const m=await import('/src/lib/dossier-project-file.ts');m.downloadDossierProjectFromBrowser();});
   await(await savedDownload).saveAs(path.join(folder,'Projekt.json'));
   const saved=JSON.parse(await readFile(path.join(folder,'Projekt.json'),'utf8'));
   assert.equal(saved.cv.portableState.layout,'modern');assert.equal(saved.cv.portableState.infoPosition,item.side==='right'?'mirrored':'standard');
   const before=await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))));
   const generated=await page.evaluate(async()=>{
    const p=await import('/src/lib/dossier-project.ts'),documents=await import('/src/lib/dossier-pdf-document.ts');
    const {captureDossierDocxNextSnapshot}=await import('/src/lib/docx-next/snapshot.ts');
    const snapshot=captureDossierDocxNextSnapshot(documents.coverPdfDocumentFromSaved(p.readStoredDossierPart(p.COVER_STORAGE_KEY)),documents.letterPdfDocumentFromSaved(p.readStoredDossierPart(p.LETTER_STORAGE_KEY)),documents.cvPdfDocumentFromSaved(p.readStoredDossierPart(p.CV_STORAGE_KEY)));
    let guardError;try{await(await import('/src/lib/design-docx-next-export.ts')).createSavedDesignDocxNext();}catch(e){guardError=e.message;}
    if(!guardError?.includes('Standard-CV-Layout'))throw Error('Existing classic-only guard did not reject Sidebar: '+guardError);
    const {normalizedCoverLabels}=await import('/src/components/cover/presentation.ts');
    const {captureCoverTextMetrics}=await import('/src/components/cover/resolve.ts');
    const {prepareBriefFontProfile}=await import('/src/lib/docx-next/brief-fonts.browser.ts');
    const blocks=normalizedCoverLabels(snapshot.cover.blocks,snapshot.cover.data.labelKontakt);
    const fonts=await prepareBriefFontProfile(blocks.filter(b=>!b.style.hidden&&b.kind==='text'),[400,600,650,700,800]);
    try {
     const metrics=captureCoverTextMetrics(blocks,snapshot.cover.fontScale,fonts.profile);
     (await import('/src/lib/docx-next/cover-badges.browser.ts')).captureCoverBadgeAdvances(blocks,'modern',snapshot.cover.colors,metrics);
     const {buildDossierDocModel}=await import('/src/lib/docx-next/build-model.ts');
     const model=buildDossierDocModel(snapshot,{coverComposition:'authored-frames',coverTextMetrics:metrics,coverBadgePlacement:'body',cvSidebarComposition:'body-stories',chromeFirstPageIdentity:'distinct-stories'});
     if(model.issues.length)throw Error('Unrelated model gates: '+JSON.stringify(model.issues));
     let picture;
     if(snapshot.cv.data.person.foto){
      const source=snapshot.cv.data.person.foto;
      const normalized=await(await import('/src/lib/docx-next/images.ts')).normalizeBrowserImage(source);
      const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
      const pixels=async src=>{const im=new Image();im.src=src;await im.decode();const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const ctx=c.getContext('2d',{colorSpace:'srgb'});ctx.drawImage(im,0,0);return {width:c.width,height:c.height,rgbaSha256:await digest(ctx.getImageData(0,0,c.width,c.height).data)};};
      const data='data:image/png;base64,'+btoa(Array.from(normalized.bytes,c=>String.fromCharCode(c)).join(''));
      picture={source:await pixels(source),normalized:await pixels(data),normalizedFileSha256:await digest(normalized.bytes)};
     }
     const blob=await(await import('/src/lib/docx-next/renderer.ts')).renderDossierDocx(model,{allowUnacceptedModelIssues:true,onDecorationFailure:(id,error)=>{throw Error('Decoration failed '+id,{cause:error});}});
     const bytes=Array.from(new Uint8Array(await blob.arrayBuffer()));
     return {snapshot,metrics,model,picture,guardError,bytes};
    } finally {fonts.dispose();}
   });
   assert.equal(generated.snapshot.settings.cvLayout,'sidebar');assert.equal(generated.snapshot.settings.sidebarSide,item.side);
   const download=page.waitForEvent('download');
   await page.evaluate(async({bytes,name})=>{const {downloadBlob}=await import('/src/lib/download.ts');downloadBlob(new Blob([new Uint8Array(bytes)],{type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'}),name);},{bytes:generated.bytes,name:item.id+'.docx'});
   await(await download).saveAs(path.join(folder,item.id+'.docx'));
   const native=await readFile(path.join(folder,item.id+'.docx'));assert.deepEqual(native,Buffer.from(generated.bytes));
   const {bytes,...proof}=generated;await writeFile(path.join(folder,'proof.json'),JSON.stringify(proof,null,2));
   await page.getByRole('button').filter({hasText:'Gesamtdossier herunterladen'}).click();
   const dialog=page.getByRole('dialog',{name:'Dossier herunterladen'});await dialog.getByRole('radio',{name:'Fertiges Dossier (PDF)'}).click();
   const pdfButton=dialog.getByRole('button',{name:'PDF herunterladen',exact:true});
   let pdfAvailable=false;
   for(let i=0;i<30;i++){if(await pdfButton.isEnabled()){pdfAvailable=true;break;}await page.waitForTimeout(200);}
   const pdfPreflight=await dialog.textContent();await writeFile(path.join(folder,'PDF-Pruefung.txt'),pdfPreflight);
   if(pdfAvailable){const pdf=page.waitForEvent('download',{timeout:60000});await pdfButton.click();await(await pdf).saveAs(path.join(folder,'App-Referenz.pdf'));}
   const after=await page.evaluate(()=>JSON.stringify(Object.fromEntries(Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)]))));assert.equal(after,before);assert.deepEqual(errors,[]);
   const result={id:item.id,side:item.side,webCvPages,webSidebarGeometry,nativeSidebarSurface:generated.model.cv.artwork.find(x=>x.id==='cv.artwork.sidebar-surface'),appRestoredProject:true,actualProjectSave:true,primaryPdfDownloaded:pdfAvailable,pdfPreflight,nativeScope:'Explicit internal candidate from fresh saved-app capture; guarded regular export remains rejected',productGuardPreserved:true,savedStateUnchanged:true,jsErrors:errors,picture:generated.picture,pixelsPreserved:!generated.picture||JSON.stringify(generated.picture.source)===JSON.stringify(generated.picture.normalized),docxSha256:createHash('sha256').update(native).digest('hex')};
   results.push(result);console.log(JSON.stringify(result));await writeFile(path.join(output,'results.json'),JSON.stringify(results,null,2));
  } finally {await context.close();}
 }
 assert(results.every(r=>r.pixelsPreserved),'Exporter changed original picture pixels before Word');
} finally {await browser.close();}
