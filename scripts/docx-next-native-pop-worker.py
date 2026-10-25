"""Observe the original PopSdt start/end and selection without changing engine code or XML."""
import contextlib,hashlib,io,json,os
from pathlib import Path
repo=Path(__file__).resolve().parent.parent;state_path=repo/'scripts/docx-next-native-state-worker.py';source=state_path.read_text()
assert hashlib.sha256(source.encode()).hexdigest()==json.loads((repo/'docs/docx-next/sidebar-native-state-evidence.json').read_text())['stable']['workerSha256']
addition=r'''
class Region(ctypes.Structure):_fields_=[('start',ctypes.c_uint64),('end',ctypes.c_uint64)]
class Range(ctypes.Structure):_fields_=[('vtable',ctypes.c_uint64),('parent_vtable',ctypes.c_uint64),('node',ctypes.c_uint64),('offset',ctypes.c_uint32),('ancestor_count',ctypes.c_uint32),('start_types',ctypes.c_uint32*16),('length',ctypes.c_uint32),('text',ctypes.c_uint16*200)]
class Sample(ctypes.Structure):_fields_=[('pc',ctypes.c_uint64),('ip',ctypes.c_uint64),('in_callee',ctypes.c_uint32),('before_pool',ctypes.c_uint32),('is_start',ctypes.c_uint32),('cursor_valid',ctypes.c_uint32),('has_selection',ctypes.c_uint32),('tag_length',ctypes.c_uint32),('tag',ctypes.c_uint16*200),*[(name,Range) for name in ('start','end','point','mark')]]
sampler=ctypes.CDLL(os.environ['DOCX_NEXT_NATIVE_POP_HELPER'])
sampler.start.argtypes=[ctypes.c_uint64,ctypes.c_uint64,ctypes.c_uint64,ctypes.POINTER(Region),ctypes.c_size_t,ctypes.c_uint];sampler.start.restype=ctypes.c_int
sampler.stop.argtypes=[ctypes.POINTER(Sample),ctypes.c_size_t,ctypes.POINTER(ctypes.c_int)];sampler.stop.restype=ctypes.c_size_t
sampler.range_size.restype=ctypes.c_size_t;sampler.sample_size.restype=ctypes.c_size_t
assert sampler.range_size()==ctypes.sizeof(Range)==504 and sampler.sample_size()==ctypes.sizeof(Sample)==2456
samples=[]
pre_goto_samples=0
verified_vtables=set()
def typename(vtable):
 identity=DlInfo();assert libc.dladdr(vtable,ctypes.byref(identity));assert Path(identity.filename.decode()).name=='libswlo.so'
 if vtable not in verified_vtables:
  assert hashlib.sha256(Path(identity.filename.decode()).read_bytes()).hexdigest()==manifest['libraries']['libswlo.so']['sha256'];verified_vtables.add(vtable)
 return read(u64(u64(vtable-8)+8),100).split(b'\0',1)[0].decode()
def normalized(value):
 return {'dynamicType':typename(value.vtable),'parentDynamicType':typename(value.parent_vtable),'nodeType':8,'contentOffset':value.offset,'startNodeTypes':list(value.start_types[:value.ancestor_count]),'paragraphText':bytes(value.text)[:value.length*2].decode('utf-16le')}
def sample_after_progress(value):
 global pre_goto_samples
 if value==30:
  maps=[x.split() for x in Path('/proc/self/maps').read_text().splitlines()];regions=[Region(*[int(p,16) for p in x[0].split('-')]) for x in maps if 'r' in x[1]]
  bases={int(x[0].split('-')[0],16) for x in maps if len(x)>5 and int(x[2],16)==0 and x[-1].endswith('/libsw_writerfilterlo.so')};assert len(bases)==1
  sw_bases={int(x[0].split('-')[0],16) for x in maps if len(x)>5 and int(x[2],16)==0 and x[-1].endswith('/libswlo.so')};assert len(sw_bases)==1
  assert sampler.start(progress[-1]['impl'],bases.pop(),sw_bases.pop(),(Region*len(regions))(*regions),len(regions),15)==0
 if value==31:
  rows=(Sample*512)();overflow=ctypes.c_int();count=sampler.stop(rows,512,ctypes.byref(overflow));assert not overflow.value
  for x in rows[:count]:
   if x.pc<0x148a89 or (x.pc==0x148a89 and x.in_callee):pre_goto_samples+=1;continue
   if not x.cursor_valid:continue
   row={'popInstructionOffset':x.pc,'insideCallee':bool(x.in_callee),'observationPhase':'attach-pool-insert-active' if x.before_pool==2 else ('attach-before-pool-insert' if x.before_pool else 'pop-after-gotoRange'),'isStartOfText':bool(x.is_start),'tag':bytes(x.tag)[:x.tag_length*2].decode('utf-16le'),'start':normalized(x.start),'end':normalized(x.end),'sameStartEndNode':x.start.node==x.end.node,'cursor':None}
   if x.cursor_valid:row['cursor']={'point':normalized(x.point),'mark':normalized(x.mark),'hasSelection':bool(x.has_selection),'pointIsEndNode':x.point.node==x.end.node,'markIsStartNode':x.mark.node==x.start.node,'pointIsStartNode':x.point.node==x.start.node,'markIsEndNode':x.mark.node==x.end.node}
   samples.append(row)
'''
marker='assert hashlib.sha256(source).hexdigest()';assert source.count(marker)==1;source=source.replace(marker,"    sample_after_progress(value) if event == 'value' else None\n"+addition+'\n'+marker)
namespace={'__file__':str(state_path),'__name__':'__main__'};output=io.StringIO()
with contextlib.redirect_stdout(output):exec(compile(source,str(state_path),'exec'),namespace)
print(json.dumps({'originalObservation':json.loads(output.getvalue()),'popRanges':namespace['samples'],'samplingDiagnostics':{'beginProgress':30,'endProgress':31,'intervalMicroseconds':15,'capacity':512,'overflow':False,'candidateSamples':len(namespace['samples']),'preGotoSamples':namespace['pre_goto_samples']},'samplerSha256':hashlib.sha256(Path(os.environ['DOCX_NEXT_NATIVE_POP_HELPER']).read_bytes()).hexdigest()}))
