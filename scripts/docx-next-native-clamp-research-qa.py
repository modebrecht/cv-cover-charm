"""Validate a retained local clamp research checkpoint; never execute native imports or grant acceptance."""
import hashlib,importlib.util,json
from pathlib import Path
REPO=Path(__file__).resolve().parent.parent;DOCS=REPO/'docs/docx-next'
spec=importlib.util.spec_from_file_location('pop',REPO/'scripts/docx-next-native-pop-qa.py');pop=importlib.util.module_from_spec(spec);spec.loader.exec_module(pop)

def validate(report):
 assert report['ciAccepted'] is False and report['productionAcceptance']=='blocked' and report['historicalLossIntervalsMeasured'] is False
 for key in ('newNativeExports','newPreparedSources','engineFilesModified','engineInstructionsModified','nativeRegistersModified','originalPackagesModified'):assert type(report[key]) is int and report[key]==0
 assert type(report['newReadonlyNativeLoads']) is int and report['newReadonlyNativeLoads']==1
 assert report['libraryIdentities']==json.loads((DOCS/'stable-native-stack.json').read_text())['libraries']
 observation=report['observation'];old=observation['originalObservation'];baseline=json.loads((DOCS/'sidebar-native-state-evidence.json').read_text())['stable']['observation'];pop.cache.validate_original(old,baseline,old['measurement']['cases'][0],baseline['disposalFrames'])
 sampling=observation['samplingDiagnostics'];assert {k:sampling[k] for k in ('beginProgress','endProgress','intervalMicroseconds','capacity','overflow')}=={'beginProgress':30,'endProgress':31,'intervalMicroseconds':25,'capacity':512,'overflow':False}
 rows=observation['clampObservations'];assert rows and len(rows)==sampling['candidateSamples']<=512
 for row in rows:
  assert row['tag']=='cv.section.person.heading' and row['insideCallee'] is True and row['popInstructionOffset']==0xad069f
  clamp=row['clamp'];assert set(clamp)=={'endOffset','paragraphText','isAttachmentMarkNode','instructionOrReturnOffset'}
  assert type(clamp['endOffset']) is int and clamp['endOffset']==0 and clamp['isAttachmentMarkNode'] is True
  assert clamp['paragraphText'] in ('','\x01','\x01\x01') and type(clamp['instructionOrReturnOffset']) is int and 0x66daa8<=clamp['instructionOrReturnOffset']<0x66db84
  assert row['attachPoint']=={'contentOffset':7,'paragraphText':'Kontakt','startNodeTypes':[0,0]}
  assert row['attachMark']['paragraphText']==clamp['paragraphText'] and row['attachMark']['startNodeTypes']==[0,0]
  assert type(row['attachMark']['contentOffset']) is int and 0<=row['attachMark']['contentOffset']<=len(clamp['paragraphText'])
  assert row['attachHasSelection'] is True
 layout=report['matchingOfflineLayout'];assert layout['nativeExecutions']==0 and layout['samplingRange']=={'begin':0x66daa8,'end':0x66db84}
 assert layout['variables']=={'nEnd':{'cfaOffset':-824,'rbpOffset':-808},'pNode':{'cfaOffset':-776,'rbpOffset':-760}}
 assert layout['frameRules']==[{'begin':0x66daa8,'end':0x66db84,'register':'rbp','cfaOffset':16}]
 for key,path in (('captureSourceSha256','scripts/docx-next-native-clamp-research.c'),('workerSha256','scripts/docx-next-native-clamp-research-worker.py')):assert report[key]==hashlib.sha256((REPO/path).read_bytes()).hexdigest()
 return {'status':'local research checkpoint valid','ciAccepted':False,'snapshots':len(rows)}

if __name__ == '__main__':
    report = json.loads((DOCS / 'sidebar-native-clamp-research.json').read_text())
    print(json.dumps(validate(report)))
