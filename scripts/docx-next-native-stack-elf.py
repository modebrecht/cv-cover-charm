"""Read exact executable ranges and exported function extents from pinned AMD64 ELF files."""
import hashlib
from pathlib import Path
import struct


class Elf:
    def __init__(self, path):
        data = Path(path).read_bytes()
        assert data[:7] == b'\x7fELF\x02\x01\x01' and struct.unpack_from('<H', data, 18)[0] == 62, 'Expected AMD64 little-endian ELF64'
        self.sha256 = hashlib.sha256(data).hexdigest()
        header = struct.unpack_from('<16sHHIQQQIHHHHHH', data)
        phoff, shoff, phsize, phcount, shsize, shcount, names_index = header[5], header[6], header[9], header[10], header[11], header[12], header[13]
        assert phsize == 56 and shsize == 64 and 0 < names_index < shcount
        assert phoff + phcount * phsize <= len(data) and shoff + shcount * shsize <= len(data), 'Truncated ELF tables'
        sections = [struct.unpack_from('<IIQQQQIIQQ', data, shoff + i * shsize) for i in range(shcount)]

        def contents(section):
            offset, size = section[4:6]
            assert offset + size <= len(data), 'Truncated ELF section'
            return data[offset:offset + size]

        def string(strings, offset):
            assert 0 <= offset < len(strings)
            end = strings.find(b'\0', offset); assert end >= 0
            return strings[offset:end].decode('utf-8')

        names = contents(sections[names_index])
        named = {string(names, row[0]): row for row in sections}
        note = contents(named['.note.gnu.build-id']); cursor = 0; build_ids = []
        while cursor < len(note):
            assert cursor + 12 <= len(note)
            name_size, desc_size, kind = struct.unpack_from('<III', note, cursor); cursor += 12
            name = note[cursor:cursor + name_size]; cursor += (name_size + 3) & ~3
            desc = note[cursor:cursor + desc_size]; cursor += (desc_size + 3) & ~3
            assert cursor <= len(note)
            if name == b'GNU\0' and kind == 3: build_ids.append(desc.hex())
        assert len(build_ids) == 1 and len(build_ids[0]) == 40, 'Missing unique GNU build ID'
        self.build_id = build_ids[0]
        self.executable_ranges = []
        for i in range(phcount):
            row = struct.unpack_from('<IIQQQQQQ', data, phoff + i * phsize)
            if row[0] == 1 and row[1] & 1: self.executable_ranges.append((row[3], row[3] + row[6]))
        symbols = named['.dynsym']; assert symbols[9] == 24 and symbols[5] % 24 == 0
        strings = contents(sections[symbols[6]]); self.functions = []
        for name, info, other, index, value, size in struct.iter_unpack('<IBBHQQ', contents(symbols)):
            if info & 15 == 2 and index != 0 and size:
                self.functions.append({'name': string(strings, name), 'value': value, 'size': size})

    def resolve(self, return_offset):
        assert type(return_offset) is int and return_offset > 0
        # backtrace reports a return address; test the preceding instruction byte for containment.
        instruction = return_offset - 1
        assert any(start <= instruction < end for start, end in self.executable_ranges), 'Return address outside executable ELF segment'
        matches = [row for row in self.functions if row['value'] <= instruction < row['value'] + row['size']]
        # Keep aliases/overlaps explicitly; never label an unnamed frame with the nearest symbol.
        return sorted(matches, key=lambda row: (row['value'], row['size'], row['name']))
