import copy,importlib.util,json,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('research',Path(__file__).with_name('docx-next-native-clamp-research-qa.py'));qa=importlib.util.module_from_spec(spec);spec.loader.exec_module(qa)
evidence=json.loads((qa.DOCS/'sidebar-native-clamp-research.json').read_text())
class ResearchTests(unittest.TestCase):
 def reject(self,r):
  with self.assertRaises(AssertionError):qa.validate(r)
 def test_retained_local_checkpoint(self):self.assertIs(qa.validate(evidence)['ciAccepted'],False)
 def test_changed_clamp_node_or_live_scope(self):
  for key,value in (('endOffset',7),('endOffset',False),('isAttachmentMarkNode',False),('instructionOrReturnOffset',0x66db84),('paragraphText','Kontakt')):
   r=copy.deepcopy(evidence);r['observation']['clampObservations'][0]['clamp'][key]=value;self.reject(r)
 def test_false_ci_acceptance_or_widened_scope(self):
  for key,value in (('ciAccepted',True),('productionAcceptance','accepted'),('historicalLossIntervalsMeasured',True),('newReadonlyNativeLoads',2),('newNativeExports',1),('nativeRegistersModified',1)):
   r=copy.deepcopy(evidence);r[key]=value;self.reject(r)
 def test_changed_original_case_or_frames(self):
  for key in ('case','frames'):
   r=copy.deepcopy(evidence);o=r['observation']['originalObservation']
   if key=='case':o['measurement']['cases'][0]['finalControls']=[]
   else:o['disposalFrames'][0]['returnOffset']+=1
   self.reject(r)
 def test_invalid_dwarf_offsets_or_frame_rule(self):
  r=copy.deepcopy(evidence);r['matchingOfflineLayout']['variables']['nEnd']['rbpOffset']+=8;self.reject(r)
  r=copy.deepcopy(evidence);r['matchingOfflineLayout']['frameRules'][0]['cfaOffset']=8;self.reject(r)
 def test_changed_observer_or_engine_identity(self):
  for key in ('captureSourceSha256','workerSha256'):
   r=copy.deepcopy(evidence);r[key]='0'*64;self.reject(r)
  r=copy.deepcopy(evidence);r['libraryIdentities']['libswlo.so']['sha256']='0'*64;self.reject(r)
if __name__=='__main__':unittest.main()
