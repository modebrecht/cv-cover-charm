"""Track a canonical control and its owner by live UNO identity, without pointer reuse guesses."""
import contextlib
import hashlib
import io
import json
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
state_path = REPO / 'scripts/docx-next-native-state-worker.py'
source = state_path.read_text()
expected = json.loads((REPO / 'docs/docx-next/sidebar-native-state-evidence.json').read_text())['stable']['workerSha256']
assert hashlib.sha256(source.encode()).hexdigest() == expected

addition = r'''
owner = None
control = None
owner_events = []
owner_disposed = False
control_disposed = False
control_listener = None

def register_owner(first, paragraph):
    global owner, control, control_listener
    assert owner is None and control is None
    owner = paragraph
    control = first
    import unohelper
    from com.sun.star.lang import XEventListener
    class ControlObserver(unohelper.Base, XEventListener):
        def disposing(self, event):
            global control, control_listener, control_disposed
            assert control is not None and not control_disposed
            same = event.Source == control
            owner_events.append({'event': 'control-disposing', 'sameRegisteredInterface': same,
                                 'nativeFrames': [{k: row[k] for k in ('library', 'returnOffset')} for row in capture_frames()]})
            assert same
            control_disposed = True
            control = None
            control_listener = None
    control_listener = ControlObserver()
    first.addEventListener(control_listener)
    owner_events.append({'event': 'registered', 'canonicalTag': first.Tag,
                         'ownerImplementation': paragraph.getImplementationName(),
                         'controlImplementation': first.getImplementationName()})

def observe_owner(first, doc, event, value):
    if owner is None or owner_disposed or event != 'value':
        return
    assert len(first) == 1
    anchor = first[0].getAnchor()
    cursor = anchor.getText().createTextCursorByRange(anchor)
    cursor.gotoStartOfParagraph(False)
    same_start = anchor.getText().compareRegionStarts(cursor, owner.getStart()) == 0
    owner_events.append({'event': 'live-owner', 'value': value,
                         'sameControlInterface': first[0] == control,
                         'sameOwnerParagraphStart': same_start})
    assert same_start and first[0] == control

def dispose_owner(event):
    global owner, control, owner_disposed
    assert owner is not None and not owner_disposed
    # Interface equality only: never invoke a method/property on the dying broadcaster.
    same = event.Source == owner
    owner_events.append({'event': 'owner-disposing', 'sameRegisteredInterface': same})
    assert same
    owner_disposed = True
    owner = None
    control = None
'''
marker = 'assert hashlib.sha256(source).hexdigest()'
assert source.count(marker) == 1
source = source.replace(marker, addition + '\n' + marker)
# Extend the pinned worker's in-memory callback composition; neither original source file changes.
marker = "namespace = {'__file__':"
hooks = r'''
needle = 'listeners.clear()'
assert text.count(needle) == 1
text = text.replace(needle, 'dispose_owner(event) if loading else None\n                        ' + needle)
needle = 'nonlocal registration'
assert text.count(needle) == 1
text = text.replace(needle, 'observe_owner(first, doc, event, value) if "error" not in row else None\n                        ' + needle)
needle = 'listeners.append((paragraph, listener))'
assert text.count(needle) == 1
text = text.replace(needle, needle + '\n                            register_owner(first[0], paragraph)')
'''
assert source.count(marker) == 1
source = source.replace(marker, hooks + '\n' + marker)
source = source.replace("'capture_progress': capture_progress}", "'capture_progress': capture_progress, 'register_owner': register_owner, 'observe_owner': observe_owner, 'dispose_owner': dispose_owner}")
namespace = {'__file__': str(state_path), '__name__': '__main__'}
output = io.StringIO()
with contextlib.redirect_stdout(output):
    exec(compile(source, str(state_path), 'exec'), namespace)
assert namespace['control_disposed'] and namespace['owner_disposed'] and namespace['owner'] is None and namespace['control'] is None
print(json.dumps({'originalObservation': json.loads(output.getvalue()),
                  'ownerLifetime': namespace['owner_events'],
                  'identityMethod': 'Strong live UNO control/paragraph references; native range comparison at every progress; disposal broadcaster interface equality',
                  'rawPointersUsedForCrossCallbackIdentity': False,
                  'dyingBroadcasterMethodsInvoked': 0}))
