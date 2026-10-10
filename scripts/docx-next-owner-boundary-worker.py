"""Track the same live canonical control across native paragraph-to-table conversion."""
import hashlib
import json
from pathlib import Path

repository = Path(__file__).resolve().parent.parent
worker = repository / 'scripts/docx-next-native-import-worker.py'
source = worker.read_text()
manifest = json.loads((repository / 'docs/docx-next/stable-native-stack.json').read_text())
assert hashlib.sha256(source.encode()).hexdigest() == manifest['originalWorkerSha256']

def replace(needle, replacement):
    global source
    assert source.count(needle) == 1
    source = source.replace(needle, replacement)

replace('events = []; listeners = []; registration = None; loading = True',
        'events = []; listeners = []; registration = None; loading = True\n'
        '                tracked_control = None; tracked_listener = None; control_lifetime = []')
replace('                class DisposalObserver', '''                class ControlObserver(unohelper.Base, XEventListener):
                    def disposing(self, event):
                        nonlocal tracked_control, tracked_listener
                        if loading:
                            control_lifetime.append({'event': 'control-disposing',
                                                     'sameRegisteredInterface': event.Source == tracked_control})
                        tracked_control = None
                        tracked_listener = None

                class DisposalObserver''')
replace('                        nonlocal registration',
        '''                        nonlocal registration, tracked_control, tracked_listener
                        if tracked_control is not None:
                            control_lifetime.append({'event': 'live-control', 'value': value,
                                                     'sameRegisteredInterface': len(first) == 1 and first[0] == tracked_control})''')
replace('                            listeners.append((paragraph, listener))',
        '''                            listeners.append((paragraph, listener))
                            tracked_control = first[0]
                            tracked_listener = ControlObserver()
                            tracked_control.addEventListener(tracked_listener)
                            control_lifetime.append({'event': 'registered', 'canonicalTag': canonical[0]})''')
replace('                    controls = boundary.inventory(doc)',
        '''                    controls = boundary.inventory(doc)
                    supplier = doc.getContentControls()
                    final_first = [supplier.getByIndex(i) for i in range(supplier.getCount())
                                   if supplier.getByIndex(i).Tag == canonical[0]]
                    control_lifetime.append({'event': 'final-control',
                                             'sameRegisteredInterface': tracked_control is not None and
                                                 len(final_first) == 1 and final_first[0] == tracked_control})''')
replace("'paragraphDisposalRegistration': registration,",
        "'paragraphDisposalRegistration': registration, 'controlLifetime': control_lifetime,")
exec(compile(source, str(worker), 'exec'), {'__file__': str(worker), '__name__': '__main__'})
