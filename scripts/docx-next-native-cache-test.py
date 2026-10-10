"""Reject fabricated cache locations, changed original observations and widened acceptance."""
import copy, importlib.util, json, unittest
from pathlib import Path
def module(name):
    s=importlib.util.spec_from_file_location(name,Path(__file__).with_name('docx-next-'+name+'-qa.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
qa=module('native-cache');layout=module('native-cache-layout')
docs=Path(__file__).resolve().parent.parent/'docs/docx-next'
evidence=json.loads((docs/'sidebar-native-cache-evidence.json').read_text())
class CacheTests(unittest.TestCase):
    def report(self):return copy.deepcopy(evidence['local'])
    def test_actual_original_measurement(self):
        r=self.report();self.assertEqual(qa.contract(r),evidence['localContract']);qa.compare_baseline(evidence['localContract'],r)
    def test_changed_or_missing_range(self):
        for key,value in (('isStartOfText',True),('tag','other'),('rangeInCell',True),('rangeParentDynamicType','SwXCell'),('contentOffset',8),('paragraphText','Zeugnis'),('startNodeTypes',[1,0]),('cachedStartCount',2),('nodeType',2)):
            with self.subTest(key=key):
                r=self.report();r['firstCachedStart'][key]=value
                with self.assertRaises(AssertionError):qa.contract(r)
        for key in qa.EXPECTED:
            r=self.report();r['firstCachedStart'].pop(key)
            with self.assertRaises(AssertionError):qa.contract(r)
    def test_wrong_types_and_addresses(self):
        for key,value in (('rangeInCell',0),('rangePosition',False),('cachedStartCount',True),('startNodeTypes',[False,False])):
            r=self.report();r['firstCachedStart'][key]=value
            with self.assertRaises(AssertionError):qa.contract(r)
        r=self.report();r['firstCachedStart']['rawRangeIdentity']=12345
        with self.assertRaises(AssertionError):qa.contract(r)
    def test_original_case_states_and_frames_stay_exact(self):
        for target in ('case','state','frame'):
            r=self.report();o=r['attempts'][0]['originalObservation']
            if target=='case':o['measurement']['cases'][0]['finalControls']=[]
            elif target=='state':o['progressStates'][0]['dummyFlag']=True
            else:o['disposalFrames'][0]['returnOffset']+=1
            with self.assertRaises(AssertionError):qa.contract(r)
    def test_missing_sample_or_false_sampling_scope(self):
        for target in ('missing','empty','overflow','capacity','count'):
            r=self.report();a=r['attempts'][0]
            if target=='missing':a['firstCachedStart']=None;a['samplingDiagnostics']['candidateSamples']=0
            elif target=='empty':r['attempts']=[]
            elif target=='overflow':a['samplingDiagnostics']['overflow']=True
            elif target=='capacity':a['samplingDiagnostics']['capacity']+=1
            else:r['originalCasesVerified']+=1
            with self.assertRaises(AssertionError):qa.contract(r)
    def test_scope_and_unsupported_causal_acceptance(self):
        for key in ('newPreparedSources','newNativeExports','engineFilesModified','engineInstructionsModified','nativeRegistersModified','originalPackagesModified'):
            r=self.report();r[key]=1
            with self.assertRaises(AssertionError):qa.contract(r)
        for key,value in (('newReadonlyNativeLoads',4),('exactPopEntryMeasured',True),('historicalLossIntervalsMeasured',True),('productionAcceptance','accepted'),('nativeGeometryAcceptance','pass')):
            r=self.report();r[key]=value
            with self.assertRaises(AssertionError):qa.contract(r)
    def test_source_layout_and_engine_contract(self):
        for key in ('layoutSha256','workerSha256','captureSourceSha256','originalStateWorkerSha256','originalImportWorkerSha256'):
            r=self.report();r[key]='0'*64
            with self.assertRaises(AssertionError):qa.compare_baseline(evidence['localContract'],r)
        r=self.report();r['libraryIdentities']['libswlo.so']['sha256']='0'*64
        with self.assertRaises(AssertionError):qa.compare_baseline(evidence['localContract'],r)
    def test_offline_layout_rejects_changed_or_wrong_typed_offsets(self):
        pin=json.loads((docs/'stable-native-cache-layout.json').read_text());layout.validate_layout(pin)
        for key in ('range_mark','mark_position','optional_engaged','text','node_type'):
            for value in (pin['fields'][key]+1,False,1.0):
                p=copy.deepcopy(pin);p['fields'][key]=value
                with self.assertRaises(AssertionError):layout.validate_layout(p)
if __name__=='__main__':unittest.main()
