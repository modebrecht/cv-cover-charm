"""Check cache field offsets from the exact debug ELF, without running or attaching an inferior."""
import argparse, hashlib, json
from pathlib import Path

MEMBERS={'SwXTextRange':{'m_eRangePosition':('range_position',104),'m_isRangeInCell':('range_in_cell',108),'m_xParentText':('range_parent',120),'m_pMark':('range_mark',136)},
 'MarkBase':{'m_oPos1':('mark_position',8)},'SwNodeIndex':{'m_pNode':('node_index_node',24)},'SwPosition':{'nContent':('position_content',32)},
 'SwContentIndex':{'m_nIndex':('content_index_value',0)},'SwNode':{'m_nNodeType':('node_type',19),'m_pStartOfSection':('node_start',72)},
 'SwStartNode':{'m_eStartNodeType':('start_type',88)},'SwTextNode':{'m_Text':('text',344)}}

def validate_layout(layout):
    assert type(layout['pointerSize']) is int and layout['pointerSize']==8
    for row in MEMBERS.values():
        for key,value in row.values():assert type(layout['fields'][key]) is int and layout['fields'][key]==value
    assert type(layout['fields']['optional_engaged']) is int and layout['fields']['optional_engaged']==72
    assert layout['sizes']=={'SwXTextRange':192,'MarkBase':304,'SwPosition':72,'SwNodeIndex':32,'SwContentIndex':40,'SwNode':80,'SwStartNode':96,'SwTextNode':472,'optionalPosition':80}

def flatten_optional(die,base=0,depth=0):
    assert depth<15;rows=[]
    for child in die.iter_children():
        if child.tag not in ('DW_TAG_member','DW_TAG_inheritance'):continue
        offset=child.attributes.get('DW_AT_data_member_location')
        if not offset or type(offset.value) is not int:continue
        name=child.attributes.get('DW_AT_name');name=name.value.decode() if name else '<base>'
        if name=='_M_engaged':rows.append(base+offset.value)
        if name in ('_M_payload','<base>'):rows+=flatten_optional(child.get_DIE_from_attribute('DW_AT_type'),base+offset.value,depth+1)
    return rows

def audit(path,layout):
    from elftools.elf.elffile import ELFFile
    validate_layout(layout);assert hashlib.sha256(path.read_bytes()).hexdigest()==layout['debugMemberSha256']
    found=set();checks=0
    with path.open('rb') as stream:
        elf=ELFFile(stream)
        assert elf.elfclass==64 and elf['e_machine']=='EM_X86_64'
        ids=[note['n_desc'] for note in elf.get_section_by_name('.note.gnu.build-id').iter_notes() if note['n_type']=='NT_GNU_BUILD_ID']
        assert ids==[layout['buildId']]
        for cu in elf.get_dwarf_info().iter_CUs():
            name=cu.get_top_DIE().attributes.get('DW_AT_name')
            if not name or not any(x in name.value for x in (b'unoobj2.cxx',b'bookmark.cxx',b'ndtxt.cxx',b'node.cxx',b'nodes.cxx',b'ndarr.cxx',b'docbm.cxx')):continue
            for die in cu.iter_DIEs():
                name=die.attributes.get('DW_AT_name');name=name.value.decode() if name and isinstance(name.value,bytes) else None
                if die.tag not in ('DW_TAG_class_type','DW_TAG_structure_type') or name not in MEMBERS or name in found or 'DW_AT_byte_size' not in die.attributes:continue
                assert die.attributes['DW_AT_byte_size'].value==layout['sizes'][name];checks+=1
                children={x.attributes['DW_AT_name'].value.decode():x for x in die.iter_children() if x.tag=='DW_TAG_member' and 'DW_AT_name' in x.attributes}
                for member,(key,_) in MEMBERS[name].items():assert children[member].attributes['DW_AT_data_member_location'].value==layout['fields'][key];checks+=1
                if name=='MarkBase':
                    optional=children['m_oPos1'].get_DIE_from_attribute('DW_AT_type')
                    assert optional.attributes['DW_AT_byte_size'].value==layout['sizes']['optionalPosition']
                    assert flatten_optional(optional)==[layout['fields']['optional_engaged']];checks+=2
                found.add(name)
            if found==set(MEMBERS):break
    assert found==set(MEMBERS),'Incomplete matching DWARF range/mark/node layout: '+repr(set(MEMBERS)-found)
    return {'memberAndSizeChecks':checks,'matchingBuildId':layout['buildId'],'newNativeExecutions':0}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('debug',type=Path);args=p.parse_args()
    layout=json.loads((Path(__file__).resolve().parent.parent/'docs/docx-next/stable-native-cache-layout.json').read_text())
    print(json.dumps(audit(args.debug,layout)))
