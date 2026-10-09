#include <unwind.h>
#include <stdint.h>
#include <stddef.h>
struct frame { uintptr_t ip, cfa, rbx, rbp, r12, r13, r14, r15; };
struct capture { struct frame *frames; size_t size, capacity; };
static _Unwind_Reason_Code collect(struct _Unwind_Context *ctx, void *arg) {
 struct capture *c = arg;
 if(c->size >= c->capacity) return _URC_END_OF_STACK;
 struct frame *f = &c->frames[c->size++];
 f->ip = _Unwind_GetIP(ctx); f->cfa = _Unwind_GetCFA(ctx);
 f->rbx = _Unwind_GetGR(ctx,3); f->rbp = _Unwind_GetGR(ctx,6);
 f->r12 = _Unwind_GetGR(ctx,12); f->r13 = _Unwind_GetGR(ctx,13);
 f->r14 = _Unwind_GetGR(ctx,14); f->r15 = _Unwind_GetGR(ctx,15);
 return _URC_NO_REASON;
}
size_t capture(struct frame *frames, size_t capacity) {
 struct capture c = {frames,0,capacity}; _Unwind_Backtrace(collect,&c); return c.size;
}
