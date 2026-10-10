"""Read the first original canonical cached range in one unchanged saved carrier import."""
import contextlib, hashlib, io, json, os
from pathlib import Path
repo=Path(__file__).resolve().parent.parent
state_path=repo/'scripts/docx-next-native-state-worker.py'
source=state_path.read_text()
expected=json.loads((repo/'docs/docx-next/sidebar-native-state-evidence.json').read_text())['stable']['workerSha256']
assert hashlib.sha256(source.encode()).hexdigest()==expected, 'Changed exact original state observer'
cache_layout=json.loads((repo/'docs/docx-next/stable-native-cache-layout.json').read_text())
assert cache_layout['pointerSize']==8
assert list(cache_layout['fields'])==['sdt','helper','tag','range_position','range_in_cell','range_parent','range_mark','mark_position','optional_engaged','node_index_node','position_content','content_index_value','node_type','node_start','start_type','text']
addition=r"""
class Region(ctypes.Structure):
    _fields_=[('start',ctypes.c_uint64),('end',ctypes.c_uint64)]
class Sample(ctypes.Structure):
    _fields_=[('ip',ctypes.c_uint64),('stack',ctypes.c_uint64*10),('bookmark',ctypes.c_uint64*3),('vtable',ctypes.c_uint64),('parent_vtable',ctypes.c_uint64),('range_position',ctypes.c_uint32),('range_in_cell',ctypes.c_uint32),('node_type',ctypes.c_uint32),('content_offset',ctypes.c_uint32),('ancestor_count',ctypes.c_uint32),('start_types',ctypes.c_uint32*16),('paragraph_length',ctypes.c_uint32),('paragraph',ctypes.c_uint16*200),('tag_length',ctypes.c_uint32),('tag',ctypes.c_uint16*200)]
sampler=ctypes.CDLL(os.environ['DOCX_NEXT_NATIVE_CACHE_HELPER'])
class CacheLayout(ctypes.Structure):
    _fields_=[(key,ctypes.c_uint32) for key in cache_layout['fields']]
cache_fields=CacheLayout(**cache_layout['fields'])
sampler.start.argtypes=[ctypes.c_uint64,ctypes.POINTER(Region),ctypes.c_size_t,ctypes.c_uint,ctypes.POINTER(CacheLayout)]
sampler.start.restype=ctypes.c_int
sampler.stop.argtypes=[ctypes.POINTER(Sample),ctypes.c_size_t,ctypes.POINTER(ctypes.c_int)]
sampler.stop.restype=ctypes.c_size_t
cached_samples=[]
def sample_after_progress(value):
    if value==30:
        maps=[x.split() for x in Path('/proc/self/maps').read_text().splitlines()]
        regions=[Region(*[int(p,16) for p in x[0].split('-')]) for x in maps if 'r' in x[1]]
        region_array=(Region*len(regions))(*regions)
        assert sampler.start(progress[-1]['impl'],region_array,len(regions),10,ctypes.byref(cache_fields))==0
    if value==31:
        samples=(Sample*2048)();overflow=ctypes.c_int()
        count=sampler.stop(samples,2048,ctypes.byref(overflow))
        assert not overflow.value
        for x in samples[:count]:
            tag=bytes(x.tag)[:x.tag_length*2].decode('utf-16le')
            info=DlInfo();assert libc.dladdr(x.ip,ctypes.byref(info))
            dynamic_type=u64(x.vtable-8);name_pointer=u64(dynamic_type+8)
            name=read(name_pointer,100).split(b'\0',1)[0].decode()
            parent_type=u64(x.parent_vtable-8);parent_name=read(u64(parent_type+8),100).split(b'\0',1)[0].decode()
            for vtable in (x.vtable,x.parent_vtable):
                identity=DlInfo();assert libc.dladdr(vtable,ctypes.byref(identity))
                assert Path(identity.filename.decode()).name=='libswlo.so'
                assert hashlib.sha256(Path(identity.filename.decode()).read_bytes()).hexdigest()==manifest['libraries']['libswlo.so']['sha256']
            cached_samples.append({'isStartOfText':bool(x.bookmark[0]&255),'tag':tag,'rangeDynamicType':name,'rangePosition':x.range_position,'rangeInCell':bool(x.range_in_cell),'rangeParentDynamicType':parent_name,'nodeType':x.node_type,'contentOffset':x.content_offset,'startNodeTypes':list(x.start_types[:x.ancestor_count]),'paragraphText':bytes(x.paragraph)[:x.paragraph_length*2].decode('utf-16le'),'instructionLibrary':Path(info.filename.decode()).name,'instructionOffset':x.ip-info.base,'rawRangeIdentity':x.bookmark[2]})
"""

marker='assert hashlib.sha256(source).hexdigest()'
assert source.count(marker)==1
source=source.replace(marker,"    sample_after_progress(value) if event == 'value' else None\n"+addition+'\n'+marker)
namespace={'__file__':str(state_path),'__name__':'__main__','cache_layout':cache_layout}
output=io.StringIO()
with contextlib.redirect_stdout(output):exec(compile(source,str(state_path),'exec'),namespace)
original=json.loads(output.getvalue())
canonical=original['measurement']['cases'][0]['canonicalOwnerFieldIds'][0]
rows=namespace['cached_samples']
candidates=[{k:v for k,v in row.items() if k not in ('rawRangeIdentity','instructionLibrary','instructionOffset')} for row in rows if row['tag']==canonical]
assert not candidates or all(row==candidates[0] for row in candidates), 'Changed canonical cached range during bounded sample'
print(json.dumps({'originalObservation':original,'firstCachedStart':dict(candidates[0],cachedStartCount=1) if candidates else None,'samplingDiagnostics':{'beginProgress':30,'endProgress':31,'intervalMicroseconds':10,'capacity':2048,'overflow':False,'candidateSamples':len(candidates),'sampledInstructionSites':[{k:row[k] for k in ('instructionLibrary','instructionOffset')} for row in rows if row['tag']==canonical]},'samplerSha256':hashlib.sha256(Path(os.environ['DOCX_NEXT_NATIVE_CACHE_HELPER']).read_bytes()).hexdigest()}))
