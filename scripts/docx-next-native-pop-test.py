"""Reject fabricated end ranges, unfinished gotoRange samples and widened native scope."""
import copy,importlib.util,json,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('pop',Path(__file__).with_name('docx-next-native-pop-qa.py'));qa=importlib.util.module_from_spec(spec);spec.loader.exec_module(qa)
evidence=json.loads((qa.DOCS/'sidebar-native-pop-evidence.json').read_text())
class PopTests(unittest.TestCase):
 def report(self):return copy.deepcopy(evidence['local'])
 def reject(self,r):
  with self.assertRaises(AssertionError):qa.contract(r)
 def test_actual_original_selection(self):
  r=self.report();self.assertEqual(qa.contract(r),evidence['localContract']);qa.compare_baseline(evidence['localContract'],r)
 def test_changed_start_end_or_selection(self):
  for span in ('start','end'):
   for key,value in (('paragraphText','other'),('contentOffset',0),('parentDynamicType','SwXCell'),('startNodeTypes',[1,0])):
    r=self.report();r['attempts'][0]['popRanges'][0][span][key]=value;self.reject(r)
  for key,value in (('hasSelection',False),('pointIsEndNode',False),('markIsStartNode',True)):
   r=self.report();r['attempts'][0]['popRanges'][0]['cursor'][key]=value;self.reject(r)
  r=self.report();r['postGotoSelection']['cursor']['mark']['paragraphText']='Kontakt';self.reject(r)
 def test_wrong_types_missing_fields_and_addresses(self):
  for key,value in (('isStartOfText',0),('sameStartEndNode',0),('popInstructionOffset',False),('insideCallee',1)):
   r=self.report();r['attempts'][0]['popRanges'][0][key]=value;self.reject(r)
  for key in qa.EXPECTED:
   r=self.report();r['attempts'][0]['popRanges'][0].pop(key);self.reject(r)
  r=self.report();r['attempts'][0]['popRanges'][0]['cursor']['rawAddress']=12345;self.reject(r)
 def test_unfinished_goto_range_is_not_a_completed_selection(self):
  for pc,callee in ((0x148a6d,False),(0x148a89,True),(0x149378,True)):
   r=self.report();r['attempts'][0]['popRanges'][0].update(popInstructionOffset=pc,insideCallee=callee);self.reject(r)
 def test_missing_fabricated_or_overflowed_samples(self):
  for target in ('empty','missing','count','overflow','capacity','pre'):
   r=self.report();a=r['attempts'][0]
   if target=='empty':r['attempts']=[]
   elif target=='missing':a['popRanges']=[];a['samplingDiagnostics']['candidateSamples']=0
   elif target=='count':a['samplingDiagnostics']['candidateSamples']+=1
   elif target=='overflow':a['samplingDiagnostics']['overflow']=True
   elif target=='capacity':a['samplingDiagnostics']['capacity']+=1
   else:a['samplingDiagnostics']['preGotoSamples']=513
   self.reject(r)
 def test_original_case_states_and_frames_remain_exact(self):
  for target in ('case','state','frame'):
   r=self.report();o=r['attempts'][0]['originalObservation']
   if target=='case':o['measurement']['cases'][0]['finalControls']=[]
   elif target=='state':o['progressStates'][0]['dummyFlag']=True
   else:o['disposalFrames'][0]['returnOffset']+=1
   self.reject(r)
 def test_scope_and_entry_history_acceptance_claims(self):
  for key in ('newPreparedSources','newNativeExports','engineFilesModified','engineInstructionsModified','nativeRegistersModified','originalPackagesModified'):
   r=self.report();r[key]=1;self.reject(r)
  for key in ('exactPopEntryMeasured','goRightEntryExitMeasured','attachmentEntryMeasured','historicalLossIntervalsMeasured'):
   r=self.report();r[key]=True;self.reject(r)
  for key,value in (('newReadonlyNativeLoads',4),('originalCasesVerified',0),('productionAcceptance','accepted'),('nativeGeometryAcceptance','pass')):
   r=self.report();r[key]=value;self.reject(r)
 def test_pinned_sources_layout_cache_and_engine(self):
  for key in ('layoutSha256','captureSourceSha256','workerSha256','firstCacheContractSha256','originalStateWorkerSha256','originalImportWorkerSha256'):
   r=self.report();r[key]='0'*64
   with self.assertRaises(AssertionError):qa.compare_baseline(evidence['localContract'],r)
  r=self.report();r['libraryIdentities']['libswlo.so']['sha256']='0'*64
  with self.assertRaises(AssertionError):qa.compare_baseline(evidence['localContract'],r)
if __name__=='__main__':unittest.main()
