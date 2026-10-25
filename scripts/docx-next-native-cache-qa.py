"""Measure the first original carrier cache without changing native instructions or original XML."""
import argparse, copy, hashlib, importlib.util, json, os, subprocess, sys, tempfile
from pathlib import Path

def module(name):
    spec=importlib.util.spec_from_file_location(name,Path(__file__).with_name('docx-next-'+name+'-qa.py'))
    m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
state=module('native-state')
EXPECTED={'isStartOfText':False,'tag':'cv.section.person.heading','rangeDynamicType':'12SwXTextRange',
          'rangePosition':0,'rangeInCell':False,'rangeParentDynamicType':'11SwXBodyText','nodeType':8,
          'contentOffset':9,'startNodeTypes':[0,0],'paragraphText':'\x01Zeugnis\x01','cachedStartCount':1}

def validate_original(actual,expected,original,frames):
    state.validate_observation(actual,original,frames)
    a,b=copy.deepcopy(actual),copy.deepcopy(expected)
    a.pop('helperSha256',None)
    for row in (a,b):row['measurement']['cases'][0].pop('inputSha256',None)
    assert a==b,'Changed complete original carrier observation or prior state contract'

def validate_cached(value):
    assert isinstance(value,dict) and set(value)==set(EXPECTED),'Missing or unscoped first canonical cached start'
    for key,expected in EXPECTED.items():
        assert type(value[key]) is type(expected) and value[key]==expected,'Changed first cached start: '+key
    assert all(type(x) is int for x in value['startNodeTypes'])

def contract(report):
    validate_cached(report['firstCachedStart'])
    assert len(report['attempts'])==report['originalCasesVerified']
    baseline=json.loads((Path(__file__).resolve().parent.parent/'docs/docx-next/sidebar-native-state-evidence.json').read_text())['stable']['observation']
    matched=[]
    for attempt in report['attempts']:
        actual=attempt['originalObservation'];original=actual['measurement']['cases'][0]
        validate_original(actual,baseline,original,baseline['disposalFrames'])
        sampling=attempt['samplingDiagnostics']
        assert {k:sampling[k] for k in ('beginProgress','endProgress','intervalMicroseconds','capacity','overflow')}=={'beginProgress':30,'endProgress':31,'intervalMicroseconds':10,'capacity':2048,'overflow':False}
        assert type(sampling['candidateSamples']) is int and 0<=sampling['candidateSamples']<=2048
        if attempt['firstCachedStart'] is not None:
            validate_cached(attempt['firstCachedStart']);matched.append(attempt['firstCachedStart'])
            assert sampling['candidateSamples']>0
        else:assert sampling['candidateSamples']==0
    assert matched and all(x==report['firstCachedStart'] for x in matched),'Claimed cache without a matching original sample'
    for key in ('newReadonlyNativeLoads','originalCasesVerified'):
        assert type(report[key]) is int and 1<=report[key]<=3
    assert report['newReadonlyNativeLoads']==report['originalCasesVerified']
    for key in ('newPreparedSources','newNativeExports','engineFilesModified','engineInstructionsModified','nativeRegistersModified','originalPackagesModified'):
        assert type(report[key]) is int and report[key]==0,'Changed read-only original cache scope'
    assert report['exactPopEntryMeasured'] is False and report['historicalLossIntervalsMeasured'] is False
    assert report['productionAcceptance']=='blocked' and report['nativeGeometryAcceptance']=='unchanged fail'
    assert report['samplingWindow']=={'beginProgress':30,'endProgress':31,'maximumAttempts':3,'intervalMicroseconds':10,'capacity':2048}
    return {key:report[key] for key in ('firstCachedStart','samplingWindow','layoutSha256','captureSourceSha256','workerSha256','originalStateWorkerSha256','originalImportWorkerSha256','libraryIdentities','exactPopEntryMeasured','historicalLossIntervalsMeasured','productionAcceptance','nativeGeometryAcceptance')}

def compare_baseline(expected,report):
    assert contract(report)==expected,'Changed independently pinned first cached canonical range'
    return {'status':'pass','changedCachedStarts':0}

def audit(root,binding_directory):
    repo=Path(__file__).resolve().parent.parent;docs=repo/'docs/docx-next'
    original_report=json.loads((root/'native-import-report.json').read_text())
    state.stack.imports.compare_baseline(json.loads((docs/'sidebar-native-import-evidence.json').read_text())['stable'],original_report)
    stack_report=json.loads((root/'native-stack-report.json').read_text())
    manifest=json.loads((docs/'stable-native-stack.json').read_text());state.stack.validate_report(stack_report,manifest)
    original=next(x for x in original_report['measurement']['cases'] if x['fixture']=='carrier-story-left-left' and x['phase']=='saved')
    frames=stack_report['stacks'][0]['stack']['nativeFrames']
    path=root/'carrier-story/carrier-story-left-left-saved.docx';before=hashlib.sha256(path.read_bytes()).hexdigest();assert before==original['inputSha256']
    request={k:original[k] for k in ('fixture','phase','canonicalOwnerFieldIds')};request.update(path=str(path.resolve()),sha256=before)
    engine=Path(os.environ.get('DOCX_NEXT_LO_ROOT',root/'setup/runtime')).resolve();binding=(binding_directory/'binding').resolve();program=engine/'usr/lib/libreoffice/program'
    images={}
    for name,expected in manifest['libraries'].items():
        p=(engine if expected['scope']=='engine' else binding)/'usr/lib/libreoffice/program'/name
        image=state.stack.elf.Elf(p);assert image.sha256==expected['sha256'] and image.build_id==expected['buildId'];images[p]=image.sha256
    layout_path=docs/'stable-native-cache-layout.json';layout=json.loads(layout_path.read_text())
    assert layout['buildId']==manifest['libraries']['libswlo.so']['buildId'] and layout['pointerSize']==8
    assert layout['originalStateLayoutSha256']==hashlib.sha256((docs/'stable-native-state-layout.json').read_bytes()).hexdigest()
    assert layout['packageSha256']==json.loads((docs/'stable-native-debug-package.json').read_text())['sha256']
    env=os.environ.copy();env.update(LD_LIBRARY_PATH=':'.join((str(program),str(engine/'usr/lib/x86_64-linux-gnu'),str(Path(sys.executable).resolve().parent.parent/'lib'))),
        PYTHONPATH=':'.join((str(binding/'usr/lib/libreoffice/program'),str(binding/'usr/lib/python3/dist-packages'))),DOCX_NEXT_LO_ROOT=str(engine),DOCX_NEXT_UNO_BINDING=str(binding),SAL_USE_VCLPLUGIN='svp',LOK_ALLOWLIST_LANGUAGES='de-DE en-US')
    capture=repo/'scripts/docx-next-native-cache-capture.c';worker=repo/'scripts/docx-next-native-cache-worker.py'
    attempts=[];candidate=None
    baseline=json.loads((docs/'sidebar-native-state-evidence.json').read_text())['stable']
    with tempfile.TemporaryDirectory(prefix='docx-next-native-cache-') as temporary:
        temporary=Path(temporary);helper=temporary/'capture.so';sampler=temporary/'cache.so';request_path=temporary/'request.json';request_path.write_text(json.dumps([request]))
        for source,target,extra in ((repo/'scripts/docx-next-native-state-capture.c',helper,[]),(capture,sampler,['-lrt'])):
            subprocess.run(['gcc','-shared','-fPIC','-O2','-Wall','-Wextra','-Werror','-o',str(target),str(source),*extra],check=True,timeout=20)
        env['DOCX_NEXT_NATIVE_CACHE_HELPER']=str(sampler)
        for _ in range(3):
            process=subprocess.run([sys.executable,str(worker),str(request_path),'--helper',str(helper)],env=env,capture_output=True,text=True,timeout=45)
            assert process.returncode==0,'Original cache observation failed: '+process.stderr
            assert process.stderr.strip() in ('','Allowlisted languages: de-DE en-US')
            row=json.loads(process.stdout);assert row['samplerSha256']==hashlib.sha256(sampler.read_bytes()).hexdigest()
            assert row['originalObservation']['helperSha256']==hashlib.sha256(helper.read_bytes()).hexdigest()
            validate_original(row['originalObservation'],baseline['observation'],original,frames)
            assert row['samplingDiagnostics']['overflow'] is False
            assert hashlib.sha256(path.read_bytes()).hexdigest()==before
            attempts.append(row)
            if row['firstCachedStart'] is not None:
                validate_cached(row['firstCachedStart']);candidate=row['firstCachedStart'];break
    assert candidate is not None,'First cached canonical range unavailable after three bounded unchanged original imports'
    for p,digest in images.items():assert hashlib.sha256(p.read_bytes()).hexdigest()==digest,'Changed actual native image'
    report={'scope':'First canonical cached range, sampled in the original importer thread between unchanged progress callbacks 30 and 31',
        'firstCachedStart':candidate,'attempts':attempts,'originalCasesVerified':len(attempts),'newReadonlyNativeLoads':len(attempts),
        'samplingWindow':{'beginProgress':30,'endProgress':31,'maximumAttempts':3,'intervalMicroseconds':10,'capacity':2048},
        'layoutSha256':hashlib.sha256(layout_path.read_bytes()).hexdigest(),'captureSourceSha256':hashlib.sha256(capture.read_bytes()).hexdigest(),'workerSha256':hashlib.sha256(worker.read_bytes()).hexdigest(),
        'originalStateWorkerSha256':baseline['workerSha256'],'originalImportWorkerSha256':manifest['originalWorkerSha256'],'libraryIdentities':manifest['libraries'],
        'newPreparedSources':0,'newNativeExports':0,'engineFilesModified':0,'engineInstructionsModified':0,'nativeRegistersModified':0,'originalPackagesModified':0,
        'exactPopEntryMeasured':False,'historicalLossIntervalsMeasured':False,'productionAcceptance':'blocked','nativeGeometryAcceptance':'unchanged fail'}
    contract(report);return report

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('root',type=Path);parser.add_argument('--binding',type=Path,required=True);parser.add_argument('--baseline',type=Path)
    args=parser.parse_args();report=audit(args.root,args.binding)
    if args.baseline:report['stableComparison']=compare_baseline(json.loads(args.baseline.read_text())['stable'],report)
    (args.root/'native-cache-report.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'firstCachedStart':report['firstCachedStart'],'originalCasesVerified':report['originalCasesVerified'],'productionAcceptance':'blocked'}))
