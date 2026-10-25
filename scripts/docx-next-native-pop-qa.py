"""Bounded read-only observation of the original first canonical PopSdt selection."""
import argparse,copy,hashlib,importlib.util,json,os,subprocess,sys,tempfile
from pathlib import Path

def module(name):
 spec=importlib.util.spec_from_file_location(name,Path(__file__).with_name('docx-next-'+name+'-qa.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
cache=module('native-cache');REPO=Path(__file__).resolve().parent.parent;DOCS=REPO/'docs/docx-next'

def span(kind,text,offset):return {'dynamicType':kind,'parentDynamicType':'11SwXBodyText','nodeType':8,'contentOffset':offset,'startNodeTypes':[0,0],'paragraphText':text}
EXPECTED={'isStartOfText':False,'tag':'cv.section.person.heading','start':span('12SwXTextRange','\x01Zeugnis\x01',9),'end':span('13SwXTextCursor','Kontakt',7),'sameStartEndNode':False,
 'cursor':{'point':span('13SwXTextCursor','Kontakt',7),'mark':span('13SwXTextCursor','',0),'hasSelection':True,'pointIsEndNode':True,'markIsStartNode':False,'pointIsStartNode':False,'markIsEndNode':False}}

def validate_value(actual,expected):
 assert type(actual) is type(expected),'Wrong observation type'
 if isinstance(expected,dict):
  assert set(actual)==set(expected),'Missing or unscoped observation fields'
  for key in expected:validate_value(actual[key],expected[key])
 elif isinstance(expected,list):
  assert len(actual)==len(expected)
  for a,b in zip(actual,expected):validate_value(a,b)
 else:assert actual==expected,'Changed original range/selection value'

def validate_row(row):
 assert set(row)==set(EXPECTED)|{'popInstructionOffset','insideCallee','observationPhase'}
 pc=row['popInstructionOffset'];assert type(pc) is int and type(row['insideCallee']) is bool
 if row['observationPhase']=='pop-after-gotoRange':assert 0x148a89<=pc<0x149378 and (pc>0x148a89 or row['insideCallee'] is False),'gotoRange has not returned'
 else:assert row['observationPhase'] in ('attach-before-pool-insert','attach-pool-insert-active') and pc==0x1494e8 and row['insideCallee'] is True,'Outside original attachment phase'
 expected=copy.deepcopy(EXPECTED)
 if row['observationPhase']=='attach-pool-insert-active':
  mark=row['cursor']['mark'];assert mark['paragraphText'] in ('','\x01','\x01\x01') and type(mark['contentOffset']) is int and 0<=mark['contentOffset']<=len(mark['paragraphText'])
  expected['cursor']['mark']['paragraphText']=mark['paragraphText'];expected['cursor']['mark']['contentOffset']=mark['contentOffset']
 validate_value({k:row[k] for k in EXPECTED},expected)

def full_selection(row):return {k:row[k] for k in EXPECTED}==EXPECTED

def contract(report):
 validate_value(report['postGotoSelection'],EXPECTED)
 baseline=json.loads((DOCS/'sidebar-native-state-evidence.json').read_text())['stable']['observation'];matched=[]
 assert type(report['attempts']) is list and len(report['attempts'])==report['originalCasesVerified']
 for attempt in report['attempts']:
  actual=attempt['originalObservation'];cache.validate_original(actual,baseline,actual['measurement']['cases'][0],baseline['disposalFrames'])
  rows=attempt['popRanges'];assert type(rows) is list and len(rows)<=512
  sampling=attempt['samplingDiagnostics'];validate_value({k:sampling[k] for k in ('beginProgress','endProgress','intervalMicroseconds','capacity','overflow')},{'beginProgress':30,'endProgress':31,'intervalMicroseconds':15,'capacity':512,'overflow':False})
  for key in ('candidateSamples','preGotoSamples'):assert type(sampling[key]) is int and 0<=sampling[key]<=512
  assert sampling['candidateSamples']==len(rows) and sampling['candidateSamples']+sampling['preGotoSamples']<=512
  for row in rows:
   validate_row(row)
   if full_selection(row):matched.append(row)
 assert matched,'Claimed selection without an original completed-gotoRange sample'
 for key in ('newReadonlyNativeLoads','originalCasesVerified'):assert type(report[key]) is int and 1<=report[key]<=3
 assert report['newReadonlyNativeLoads']==report['originalCasesVerified']
 for key in ('newPreparedSources','newNativeExports','engineFilesModified','engineInstructionsModified','nativeRegistersModified','originalPackagesModified'):assert type(report[key]) is int and report[key]==0
 for key in ('exactPopEntryMeasured','goRightEntryExitMeasured','attachmentEntryMeasured','historicalLossIntervalsMeasured'):assert report[key] is False
 validate_value(report['samplingWindow'],{'beginProgress':30,'endProgress':31,'maximumAttempts':3,'intervalMicroseconds':15,'capacity':512})
 assert report['productionAcceptance']=='blocked' and report['nativeGeometryAcceptance']=='unchanged fail'
 return {k:report[k] for k in ('postGotoSelection','samplingWindow','layoutSha256','captureSourceSha256','workerSha256','originalStateWorkerSha256','originalImportWorkerSha256','libraryIdentities','firstCacheContractSha256','exactPopEntryMeasured','goRightEntryExitMeasured','attachmentEntryMeasured','historicalLossIntervalsMeasured','productionAcceptance','nativeGeometryAcceptance')}

def compare_baseline(expected,report):
 assert contract(report)==expected,'Changed independently pinned original PopSdt selection'
 return {'status':'pass','changedPostGotoSelections':0}

def audit(root,binding_directory):
 original_report=json.loads((root/'native-import-report.json').read_text());cache.state.stack.imports.compare_baseline(json.loads((DOCS/'sidebar-native-import-evidence.json').read_text())['stable'],original_report)
 stack_report=json.loads((root/'native-stack-report.json').read_text());manifest=json.loads((DOCS/'stable-native-stack.json').read_text());cache.state.stack.validate_report(stack_report,manifest)
 first_cache=json.loads((DOCS/'sidebar-native-cache-evidence.json').read_text())['stable'];cache.compare_baseline(first_cache,json.loads((root/'native-cache-report.json').read_text()))
 original=next(x for x in original_report['measurement']['cases'] if x['fixture']=='carrier-story-left-left' and x['phase']=='saved');frames=stack_report['stacks'][0]['stack']['nativeFrames']
 path=root/'carrier-story/carrier-story-left-left-saved.docx';before=hashlib.sha256(path.read_bytes()).hexdigest();assert before==original['inputSha256']
 request={k:original[k] for k in ('fixture','phase','canonicalOwnerFieldIds')};request.update(path=str(path.resolve()),sha256=before)
 engine=Path(os.environ.get('DOCX_NEXT_LO_ROOT',root/'setup/runtime')).resolve();binding=(binding_directory/'binding').resolve();program=engine/'usr/lib/libreoffice/program';images={}
 for name,expected in manifest['libraries'].items():
  p=(engine if expected['scope']=='engine' else binding)/'usr/lib/libreoffice/program'/name;image=cache.state.stack.elf.Elf(p);assert image.sha256==expected['sha256'] and image.build_id==expected['buildId'];images[p]=image.sha256
 layout_path=DOCS/'stable-native-pop-layout.json';layout=json.loads(layout_path.read_text());assert layout['buildId']==manifest['libraries']['libsw_writerfilterlo.so']['buildId'] and layout['swBuildId']==manifest['libraries']['libswlo.so']['buildId']
 assert layout['cacheLayoutSha256']==hashlib.sha256((DOCS/'stable-native-cache-layout.json').read_bytes()).hexdigest()
 env=os.environ.copy();env.update(LD_LIBRARY_PATH=':'.join((str(program),str(engine/'usr/lib/x86_64-linux-gnu'),str(Path(sys.executable).resolve().parent.parent/'lib'))),PYTHONPATH=':'.join((str(binding/'usr/lib/libreoffice/program'),str(binding/'usr/lib/python3/dist-packages'))),DOCX_NEXT_LO_ROOT=str(engine),DOCX_NEXT_UNO_BINDING=str(binding),SAL_USE_VCLPLUGIN='svp',LOK_ALLOWLIST_LANGUAGES='de-DE en-US')
 capture=REPO/'scripts/docx-next-native-pop-capture.c';worker=REPO/'scripts/docx-next-native-pop-worker.py';attempts=[];baseline=json.loads((DOCS/'sidebar-native-state-evidence.json').read_text())['stable']
 with tempfile.TemporaryDirectory(prefix='docx-next-native-pop-') as directory:
  temporary=Path(directory);helper=temporary/'capture.so';sampler=temporary/'pop.so';request_path=temporary/'request.json';request_path.write_text(json.dumps([request]))
  for source,target,extra in ((REPO/'scripts/docx-next-native-state-capture.c',helper,[]),(capture,sampler,['-lrt'])):subprocess.run(['gcc','-shared','-fPIC','-O2','-Wall','-Wextra','-Werror','-o',str(target),str(source),*extra],check=True,timeout=20)
  env['DOCX_NEXT_NATIVE_POP_HELPER']=str(sampler)
  for _ in range(3):
   p=subprocess.run([sys.executable,str(worker),str(request_path),'--helper',str(helper)],env=env,capture_output=True,text=True,timeout=45);assert p.returncode==0,'Original PopSdt observation failed: '+p.stderr
   assert p.stderr.strip() in ('','Allowlisted languages: de-DE en-US');row=json.loads(p.stdout);assert row['samplerSha256']==hashlib.sha256(sampler.read_bytes()).hexdigest() and row['originalObservation']['helperSha256']==hashlib.sha256(helper.read_bytes()).hexdigest()
   cache.validate_original(row['originalObservation'],baseline['observation'],original,frames);assert hashlib.sha256(path.read_bytes()).hexdigest()==before
   for sample in row['popRanges']:validate_row(sample)
   attempts.append(row)
   if any(full_selection(x) for x in row['popRanges']):break
 diagnostics={'scope':'Bounded original PopSdt attempts; missing post-goto samples are not accepted','attempts':attempts,'originalCasesVerified':len(attempts),'postGotoSamples':sum(len(x['popRanges']) for x in attempts),'accepted':any(full_selection(x) for a in attempts for x in a['popRanges'])}
 (root/'native-pop-diagnostics.json').write_text(json.dumps(diagnostics,indent=2)+'\n')
 assert diagnostics['accepted'],'Completed original gotoRange selection unavailable after three bounded imports'
 for p,digest in images.items():assert hashlib.sha256(p.read_bytes()).hexdigest()==digest
 report={'scope':'First canonical original PopSdt start/end and cursor selection after gotoRange returns; read-only original thread sampling','postGotoSelection':{k:next(x for a in attempts for x in a['popRanges'] if full_selection(x))[k] for k in EXPECTED},'attempts':attempts,'originalCasesVerified':len(attempts),'newReadonlyNativeLoads':len(attempts),'samplingWindow':{'beginProgress':30,'endProgress':31,'maximumAttempts':3,'intervalMicroseconds':15,'capacity':512},'layoutSha256':hashlib.sha256(layout_path.read_bytes()).hexdigest(),'captureSourceSha256':hashlib.sha256(capture.read_bytes()).hexdigest(),'workerSha256':hashlib.sha256(worker.read_bytes()).hexdigest(),'originalStateWorkerSha256':baseline['workerSha256'],'originalImportWorkerSha256':manifest['originalWorkerSha256'],'libraryIdentities':manifest['libraries'],'firstCacheContractSha256':hashlib.sha256(json.dumps(first_cache,sort_keys=True,separators=(',',':')).encode()).hexdigest(),'newPreparedSources':0,'newNativeExports':0,'engineFilesModified':0,'engineInstructionsModified':0,'nativeRegistersModified':0,'originalPackagesModified':0,'exactPopEntryMeasured':False,'goRightEntryExitMeasured':False,'attachmentEntryMeasured':False,'historicalLossIntervalsMeasured':False,'productionAcceptance':'blocked','nativeGeometryAcceptance':'unchanged fail'}
 contract(report);return report

if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('root',type=Path);p.add_argument('--binding',type=Path,required=True);p.add_argument('--baseline',type=Path);a=p.parse_args();report=audit(a.root,a.binding)
 if a.baseline:report['stableComparison']=compare_baseline(json.loads(a.baseline.read_text())['stable'],report)
 (a.root/'native-pop-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'postGotoSelection':report['postGotoSelection'],'originalCasesVerified':report['originalCasesVerified'],'productionAcceptance':'blocked'}))
