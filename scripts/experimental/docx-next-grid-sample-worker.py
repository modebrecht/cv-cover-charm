"""Experimental read-only sampling on one fingerprinted AMD64 build; absent target samples are inconclusive."""
import ctypes,hashlib,importlib.util,json,os,sys,threading,struct
from pathlib import Path
repo=Path(__file__).resolve().parents[2];source=repo/'scripts/docx-next-native-grid-worker.py'
engine=Path(os.environ['DOCX_NEXT_LO_ROOT']);engine_library=engine/'usr/lib/libreoffice/program/libswlo.so'
assert hashlib.sha256(engine_library.read_bytes()).hexdigest()=='ecc533cd929a8a044129026b519a87917803e0db7eb1c6bbec84f5511231397b', 'Unverified sampling layout'
lib=ctypes.CDLL(os.environ['DOCX_NEXT_GRID_SAMPLER'])
class Region(ctypes.Structure):_fields_=[('start',ctypes.c_uint64),('end',ctypes.c_uint64)]
class Cols(ctypes.Structure):_fields_=[('left',ctypes.c_int64),('right',ctypes.c_int64),('count',ctypes.c_uint32),('pad',ctypes.c_uint32),('pos',ctypes.c_int64*32)]
class Sample(ctypes.Structure):_fields_=[('pc',ctypes.c_uint64),('table',ctypes.c_uint64),('parm',ctypes.c_uint64),('nw',ctypes.c_int64),('ow',ctypes.c_int64),('kind',ctypes.c_uint32),('pad',ctypes.c_uint32),('newer',Cols),('older',Cols)]
lib.start.argtypes=[ctypes.c_uint64,ctypes.POINTER(Region),ctypes.c_size_t,ctypes.c_uint,ctypes.c_uint];lib.stop.argtypes=[ctypes.POINTER(Sample),ctypes.c_size_t,ctypes.POINTER(ctypes.c_int)];lib.stop.restype=ctypes.c_size_t;lib.sample_size.restype=ctypes.c_size_t
assert lib.sample_size()==ctypes.sizeof(Sample)
record={};active=False
def start(phase):
 global active
 assert not active
 active=True
 print("start",phase,"tid",threading.get_native_id(),file=sys.stderr,flush=True)
 sw=ctypes.CDLL(os.environ['DOCX_NEXT_LO_ROOT']+'/usr/lib/libreoffice/program/libswlo.so');assert sw
 maps=[x.split() for x in Path('/proc/self/maps').read_text().splitlines()];regions=[Region(*[int(p,16) for p in x[0].split('-')]) for x in maps if 'r' in x[1]];bases={int(x[0].split('-')[0],16) for x in maps if len(x)>5 and int(x[2],16)==0 and x[-1].endswith('/libswlo.so')};assert len(bases)==1
 code=lib.start(bases.pop(),(Region*len(regions))(*regions),len(regions),32,phase)
 print("startCode",code,file=sys.stderr,flush=True)
 assert code==0

def stop(phase):
 global active
 if not active:
  record[phase]=[]
  return
 active=False
 rows=(Sample*4096)();bad=ctypes.c_int();n=lib.stop(rows,4096,ctypes.byref(bad));assert bad.value==0
 def col(x):return {'left':x.left,'right':x.right,'positions':list(x.pos[:x.count])}
 record[phase]=[{'pc':x.pc,'table':x.table,'parm':x.parm,'newWish':x.nw,'oldWish':x.ow,'kind':x.kind,'new':col(x.newer),'old':col(x.older)} for x in rows[:n]]
 print(phase,len(record[phase]),file=sys.stderr)

def read(address,n):
 with open('/proc/self/mem','rb',buffering=0) as f:
  f.seek(address);data=f.read(n);assert len(data)==n;return data
def u64(address):return struct.unpack('<Q',read(address,8))[0]
def core_widths(pointer):
 merged=ctypes.CDLL(os.environ['DOCX_NEXT_LO_ROOT']+'/usr/lib/libreoffice/program/libmergedlo.so')
 get=getattr(merged,'_ZNK10SfxItemSet3GetEtb');get.argtypes=[ctypes.c_void_p,ctypes.c_ushort,ctypes.c_bool];get.restype=ctypes.c_void_p
 def width(p):
  format=u64(p+24);item=get(format+136,90,True);assert struct.unpack('<H',read(item+12,2))[0]==90
  return struct.unpack('<q',read(item+16,8))[0]
 begin,end=struct.unpack('<2Q',read(pointer+32,16));assert (end-begin)%8==0 and 0<end-begin<=32*8;lines=struct.unpack('<'+str((end-begin)//8)+'Q',read(begin,end-begin));grid=[]
 for line in lines:
  begin,end=struct.unpack('<2Q',read(line+32,16));assert (end-begin)%8==0 and 0<end-begin<=32*8;boxes=struct.unpack('<'+str((end-begin)//8)+'Q',read(begin,end-begin));grid.append([width(box) for box in boxes])
 return {'tableWidthTwips':width(pointer),'rows':grid}
def getters(table):
 values=table.TableColumnSeparators;baseline=[(x.Position,x.IsVisible) for x in values];start(2)
 for i in range(1500):assert [(x.Position,x.IsVisible) for x in table.TableColumnSeparators]==baseline
 stop('getters');pointers={x['table'] for x in record['getters']};assert len(pointers)==1;record['coreWidths']=core_widths(pointers.pop())
source=repo/'scripts/docx-next-native-import-worker.py'
text=source.read_text()
needle="events.append(row)\n                        nonlocal registration";assert text.count(needle)==1
text=text.replace(needle,"events.append(row)\n                        progress_sample(event,value)\n                        nonlocal registration")
needle='doc.load((PropertyValue';assert text.count(needle)==1
text=text.replace(needle,"start(1)\n                    "+needle)
needle="controls = boundary.inventory(doc)";assert text.count(needle)==1
text=text.replace(needle,"stop('import')\n                    "+needle+"\n                    final_owner(doc,canonical)")
def progress_sample(event,value):
 if event=='value': pass
 if event=='end': print('endThread',threading.get_native_id(),file=sys.stderr,flush=True)
def final_owner(doc,canonical):
 tables={name:doc.TextTables.getByName(name) for name in doc.TextTables.ElementNames};parents={}
 for name,t in tables.items():
  for cell in t.getCellNames():
   es=t.getCellByName(cell).createEnumeration()
   while es.hasMoreElements():
    e=es.nextElement()
    if e.supportsService('com.sun.star.text.TextTable'):parents[e.Name]={'table':name,'cell':cell}
 controls=[];collection=doc.getContentControls()
 for i in range(collection.getCount()):
  c=collection.getByIndex(i);a=c.getAnchor();cur=a.getText().createTextCursorByRange(a);t,cell=cur.TextTable,cur.Cell;controls.append({'tag':c.Tag,'table':None if t is None else t.Name,'cell':None if cell is None else cell.CellName})
 owner,ancestry=ns['grid'].canonical_owner(canonical,controls,list(tables),parents);record['canonicalOwner']={'name':owner,'ancestry':ancestry};getters(tables[owner])
ns={'__file__':str(source),'__name__':'sampled_worker','start':start,'stop':stop,'progress_sample':progress_sample,'final_owner':final_owner};exec(compile(text,str(source),'exec'),ns)
request=json.loads(Path(sys.argv[1]).read_text());path=Path(request['path']);before=hashlib.sha256(path.read_bytes()).hexdigest();assert before==request['sha256'];request.update(fixture=path.stem,phase='measured');result=ns['observe']([request]);assert hashlib.sha256(path.read_bytes()).hexdigest()==before
print(json.dumps({'original':result,'samples':record}))
