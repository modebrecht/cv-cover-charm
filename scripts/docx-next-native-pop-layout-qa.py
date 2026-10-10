"""Verify original PopSdt locals, frame rules and cursor fields from matching AMD64 ELF/DWARF."""
import argparse,hashlib,importlib.util,json,subprocess,tarfile,tempfile
from pathlib import Path
REPO=Path(__file__).resolve().parent.parent

def audit(writer_debug,sw_debug,writer_image):
 from elftools.elf.elffile import ELFFile
 from elftools.dwarf.dwarf_expr import DWARFExprParser
 from elftools.dwarf.callframe import FDE
 layout=json.loads((REPO/'docs/docx-next/stable-native-pop-layout.json').read_text());checks=0
 assert hashlib.sha256((REPO/'docs/docx-next/stable-native-cache-layout.json').read_bytes()).hexdigest()==layout['cacheLayoutSha256']
 for path,digest,build in ((writer_debug,layout['debugMemberSha256'],layout['buildId']),(sw_debug,layout['swDebugMemberSha256'],layout['swBuildId'])):
  assert hashlib.sha256(path.read_bytes()).hexdigest()==digest
  with path.open('rb') as f:
   e=ELFFile(f);assert e.elfclass==64 and e['e_machine']=='EM_X86_64'
   assert [n['n_desc'] for n in e.get_section_by_name('.note.gnu.build-id').iter_notes() if n['n_type']=='NT_GNU_BUILD_ID']==[build]
  checks+=2
 with writer_debug.open('rb') as f:
  d=ELFFile(f).get_dwarf_info();found=False
  for cu in d.iter_CUs():
   n=cu.get_top_DIE().attributes.get('DW_AT_name')
   if not n or not n.value.endswith(b'/DomainMapper_Impl.cxx'):continue
   for die in cu.iter_DIEs():
    if die.offset!=layout['dieOffset']:continue
    assert die.get_DIE_from_attribute('DW_AT_specification').attributes['DW_AT_name'].value==b'PopSdt'
    parser=DWARFExprParser(cu.structs);decoded=lambda expr:[{'op':x.op_name,'args':x.args} for x in parser.parse_expr(expr)]
    assert decoded(die.attributes['DW_AT_frame_base'].value)==layout['frameBase'];checks+=1
    assert [x._asdict() for x in d.range_lists().get_range_list_at_offset(die.attributes['DW_AT_ranges'].value,cu)]==layout['ranges'];checks+=1
    children={x.attributes['DW_AT_name'].value.decode():x for x in die.iter_children() if 'DW_AT_name' in x.attributes}
    for name,expr in layout['locals'].items():assert decoded(children[name].attributes['DW_AT_location'].value)==expr;checks+=1
    found=True;break
   break
  assert found
 with writer_image.open('rb') as f:
  e=ELFFile(f);manifest=json.loads((REPO/'docs/docx-next/stable-native-stack.json').read_text())['libraries']['libsw_writerfilterlo.so'];assert hashlib.sha256(writer_image.read_bytes()).hexdigest()==manifest['sha256']
  d=e.get_dwarf_info();begin,end=layout['samplingPCs']['begin'],layout['samplingPCs']['end'];rules=[]
  for item in d.EH_CFI_entries():
   if isinstance(item,FDE) and item['initial_location']<=begin<item['initial_location']+item['address_range']:
    table=item.get_decoded().table
    for i,row in enumerate(table):
     stop=table[i+1]['pc'] if i+1<len(table) else item['initial_location']+item['address_range']
     if row['pc']<end and stop>begin:
      assert row['cfa'].reg==6 and row['cfa'].offset==16 and row['cfa'].expr is None
      rules.append({'begin':max(begin,row['pc']),'end':min(end,stop),'register':'rbp','cfaOffset':16})
  assert rules and rules[0]['begin']==begin and rules[-1]['end']==end
  assert all(a['end']==b['begin'] for a,b in zip(rules,rules[1:]));checks+=len(rules)
 found=set()
 with sw_debug.open('rb') as f:
  d=ELFFile(f).get_dwarf_info()
  for cu in d.iter_CUs():
   n=cu.get_top_DIE().attributes.get('DW_AT_name')
   if not n or not any(n.value.endswith(x) for x in (b'/unoobj.cxx',b'/unocrsr.cxx',b'/swcrsr.cxx',b'/pam.cxx')):continue
   for die in cu.iter_DIEs():
    n=die.attributes.get('DW_AT_name');name=n.value.decode() if n and isinstance(n.value,bytes) else None
    if name not in layout['swTypes'] or name in found or 'DW_AT_byte_size' not in die.attributes:continue
    expected=layout['swTypes'][name];assert die.attributes['DW_AT_byte_size'].value==expected['size'];checks+=1
    children={x.attributes['DW_AT_name'].value.decode():x for x in die.iter_children() if x.tag=='DW_TAG_member' and 'DW_AT_name' in x.attributes}
    for member,offset in expected.get('members',{}).items():assert children[member].attributes['DW_AT_data_member_location'].value==offset;checks+=1
    bases=[x for x in die.iter_children() if x.tag=='DW_TAG_inheritance']
    if name=='SwUnoCursor':assert bases[0].attributes['DW_AT_data_member_location'].value==expected['virtualBaseExpression'];checks+=1
    if name=='SwCursor':assert bases[0].get_DIE_from_attribute('DW_AT_type').attributes['DW_AT_name'].value==b'SwPaM' and bases[0].attributes['DW_AT_data_member_location'].value==expected['SwPaMBase'];checks+=1
    found.add(name)
  assert found==set(layout['swTypes']),str(set(layout['swTypes'])-found)
 return {'matchingChecks':checks,'frameRules':rules,'newNativeExecutions':0,'externalAttach':False}

def audit_package(package,writer_image):
 spec=importlib.util.spec_from_file_location('symbols',REPO/'scripts/docx-next-native-symbol-qa.py');symbols=importlib.util.module_from_spec(spec);spec.loader.exec_module(symbols)
 pin=json.loads((REPO/'docs/docx-next/stable-native-debug-package.json').read_text());symbols.verify_pinned_package(package,pin)
 expected={'usr/lib/debug/.build-id/'+row['buildId'][:2]+'/'+row['buildId'][2:]+'.debug':name for name,row in pin['libraries'].items()}
 with tempfile.TemporaryDirectory(prefix='docx-next-pop-layout-') as directory:
  folder=Path(directory);found={};process=subprocess.Popen(['dpkg-deb','--fsys-tarfile',str(package)],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
  try:
   with tarfile.open(fileobj=process.stdout,mode='r|') as archive:
    for member in archive:
     path=member.name.removeprefix('./')
     if path not in expected:continue
     name=expected[path];assert name not in found and member.isfile() and member.size==pin['libraries'][name]['memberSize']
     source=archive.extractfile(member);assert source;target=folder/(name+'.debug')
     with target.open('wb') as stream:
      while chunk:=source.read(1048576):stream.write(chunk)
     assert target.stat().st_size==member.size;found[name]=target
   _,error=process.communicate(timeout=20);assert process.returncode==0,error
   assert set(found)==set(pin['libraries'])
   return audit(found['libsw_writerfilterlo.so'],found['libswlo.so'],writer_image)
  finally:
   if process.poll() is None:process.kill();process.communicate()

if __name__=='__main__':
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('writer_debug',type=Path,nargs='?');p.add_argument('sw_debug',type=Path,nargs='?');p.add_argument('writer_image',type=Path,nargs='?');p.add_argument('--package',type=Path);p.add_argument('--writer-image',type=Path,dest='image');p.add_argument('--output',type=Path);a=p.parse_args()
 if a.package:
  assert a.image and not any((a.writer_debug,a.sw_debug,a.writer_image));report=audit_package(a.package,a.image)
 else:
  assert all((a.writer_debug,a.sw_debug,a.writer_image));report=audit(a.writer_debug,a.sw_debug,a.writer_image)
 if a.output:a.output.write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps(report))
