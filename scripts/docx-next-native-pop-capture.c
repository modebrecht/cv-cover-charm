/* Read-only original PopSdt local/range sampling; pinned AMD64 Linux engine only. */
#define _GNU_SOURCE
#include <stdint.h>
#include <stddef.h>
#include <signal.h>
#include <time.h>
#include <unistd.h>
#include <sys/syscall.h>
#include <ucontext.h>
#include <errno.h>
#include <string.h>
struct region {uintptr_t start,end;};
struct range {uintptr_t vtable,parent_vtable,node;uint32_t offset,ancestor_count,start_types[16],length;uint16_t text[200];};
struct sample {uintptr_t pc,ip;uint32_t in_callee,before_pool,is_start,cursor_valid,has_selection,tag_length;uint16_t tag[200];struct range start,end,point,mark;};
_Static_assert(sizeof(uintptr_t)==8,"Exact AMD64 ABI required");
_Static_assert(sizeof(struct range)==504,"Exact range snapshot ABI required");
_Static_assert(sizeof(struct sample)==2456,"Exact Pop snapshot ABI required");
size_t range_size(void){return sizeof(struct range);}
size_t sample_size(void){return sizeof(struct sample);}
static struct region regions[4096];static size_t region_count;static struct sample rows[512];
static volatile sig_atomic_t count,overflow,armed;static uintptr_t implementation,base,sw_base;static timer_t timer;static int signal_number;static struct sigaction previous;
static int readable(uintptr_t address,size_t length){
 if(!address||length>4096||address+length<address)return 0;
 size_t lo=0,hi=region_count;while(lo<hi){size_t mid=lo+(hi-lo)/2;if(address<regions[mid].start)hi=mid;else if(address>=regions[mid].end)lo=mid+1;else return address+length<=regions[mid].end;}return 0;
}
static int copy(void *out,uintptr_t address,size_t length){if(!readable(address,length))return 0;volatile const unsigned char *in=(volatile const unsigned char*)address;unsigned char *target=out;for(size_t i=0;i<length;i++)target[i]=in[i];return 1;}
static int name_is(uintptr_t vtable,const char *expected){
 uintptr_t type,name;char observed[32];if(!copy(&type,vtable-8,8)||!copy(&name,type+8,8)||!copy(observed,name,sizeof(observed)))return 0;
 for(unsigned i=0;i<32;i++){if(observed[i]!=expected[i])return 0;if(!observed[i])return 1;}return 0;
}
static int position(struct range *out,uintptr_t pos){
 uintptr_t ancestor,next,node_vtable,text;intptr_t adjustment;unsigned char kind;
 if(!copy(&out->node,pos+24,8)||!copy(&out->offset,pos+32,4)||!copy(&kind,out->node+19,1)||kind!=8||!copy(&ancestor,out->node+72,8)||!copy(&node_vtable,out->node,8)||!copy(&adjustment,node_vtable-16,8)||!copy(&text,out->node+adjustment+344,8)||!copy(&out->length,text+4,4)||out->length>200||out->offset>out->length||!copy(out->text,text+8,out->length*2))return 0;
 for(unsigned i=0;i<16;i++){uint32_t k;if(!copy(&k,ancestor+88,4)||k>5||!copy(&next,ancestor+72,8))return 0;out->start_types[i]=k;out->ancestor_count=i+1;if(!next||next==ancestor)return 1;ancestor=next;}return 0;
}
static int start_range(struct range *out,uintptr_t pointer){
 uintptr_t object,parent,mark;intptr_t adjustment;uint32_t range_kind;unsigned char in_cell,engaged;
 if(!copy(&out->vtable,pointer,8)||!name_is(out->vtable,"12SwXTextRange")||!copy(&adjustment,out->vtable-16,8))return 0;
 object=pointer+adjustment;
 if(!copy(&range_kind,object+104,4)||range_kind!=0||!copy(&in_cell,object+108,1)||in_cell!=0||!copy(&parent,object+120,8)||!copy(&out->parent_vtable,parent,8)||!copy(&mark,object+136,8)||!copy(&engaged,mark+80,1)||engaged!=1)return 0;
 return position(out,mark+8);
}
static int cursor_range(struct range *point,struct range *mark,uintptr_t pointer,uint32_t *selection){
 uintptr_t object,parent,uno,uno_vtable,pam,p,m;intptr_t adjustment,vbase;
 if(!copy(&point->vtable,pointer,8)||!name_is(point->vtable,"13SwXTextCursor")||!copy(&adjustment,point->vtable-16,8))return 0;
 object=pointer+adjustment;
 if(!copy(&parent,object+176,8)||!copy(&point->parent_vtable,parent,8)||!copy(&uno,object+216,8)||!copy(&uno_vtable,uno,8)||!copy(&vbase,uno_vtable-24,8)||vbase<0||vbase>1024)return 0;
 pam=uno+vbase;
 if(!copy(&p,pam+168,8)||!copy(&m,pam+176,8)||(p!=pam+24&&p!=pam+96)||(m!=pam+24&&m!=pam+96))return 0;
 *selection=p!=m;mark->vtable=point->vtable;mark->parent_vtable=point->parent_vtable;return position(point,p)&&position(mark,m);
}
static void tick(int number,siginfo_t *info,void *context){
 (void)number;(void)info;int saved=errno;if(!armed){errno=saved;return;}
 struct sample row={0};ucontext_t *ctx=context;row.ip=ctx->uc_mcontext.gregs[REG_RIP];uintptr_t frame=ctx->uc_mcontext.gregs[REG_RBP],pop=0;
 uintptr_t attach=0;uint32_t attach_phase=0;
 if(row.ip>=sw_base+0xad0362&&row.ip<sw_base+0xad0699){attach=frame;attach_phase=1;}
 if(row.ip>=base+0x1489dc&&row.ip<base+0x149378){row.pc=row.ip-base;pop=frame;}
 else for(unsigned depth=0;depth<32;depth++){
  uintptr_t next,ret;if(!copy(&next,frame,8)||!copy(&ret,frame+8,8)||next<=frame||next-frame>1048576)break;
  if(ret>=sw_base+0xad0362&&ret<sw_base+0xad0699){attach=next;attach_phase=1;}
  if(ret==sw_base+0xad069f){attach=next;attach_phase=2;}
  if(ret>=base+0x1489dc&&ret<base+0x149378){row.pc=ret-base;pop=next;row.in_callee=1;break;}
  if(ret==base+0x1494e8&&attach){row.pc=ret-base;pop=next;row.in_callee=1;row.before_pool=attach_phase;break;}
  frame=next;
 }
 if(!pop)goto done;
 uintptr_t impl,helper,tag,start,end,copied_start;unsigned char flag;
 if(!copy(&impl,pop-0x138,8)||impl!=implementation||!copy(&helper,impl+2376,8)||!copy(&tag,helper+320,8)||!copy(&row.tag_length,tag+4,4)||row.tag_length>200||!copy(row.tag,tag+8,row.tag_length*2)||!copy(&flag,pop-0xe0,1)||flag>1||!copy(&start,pop-0x130,8)||!copy(&end,pop-0x128,8))goto done;
 static const char canonical[]="cv.section.person.heading";
 if(row.tag_length!=sizeof(canonical)-1)goto done;
 for(unsigned i=0;i<row.tag_length;i++)if(row.tag[i]!=(unsigned char)canonical[i])goto done;
 if(!copy(&copied_start,pop-0xd0,8)||copied_start!=start)goto done;
 row.is_start=flag;if(!start_range(&row.start,start))goto done;struct range end_mark={0};uint32_t end_selection;if(!cursor_range(&row.end,&end_mark,end,&end_selection)||end_selection)goto done;
 if(row.pc>=0x148a42){uintptr_t cursor;if(copy(&cursor,pop-0x118,8)&&cursor_range(&row.point,&row.mark,cursor,&row.has_selection))row.cursor_valid=1;}
 if(count&&rows[count-1].pc==row.pc&&rows[count-1].has_selection==row.has_selection&&rows[count-1].cursor_valid==row.cursor_valid&&rows[count-1].in_callee==row.in_callee){
  const unsigned char *a=(const unsigned char*)&rows[count-1].start,*b=(const unsigned char*)&row.start;size_t i;
  for(i=0;i<sizeof(struct range)*4;i++)if(a[i]!=b[i])break;
  if(i==sizeof(struct range)*4)goto done;
 }
 if(count>=512){overflow=1;goto done;}rows[count++]=row;
 done:errno=saved;
}
int start(uintptr_t impl,uintptr_t library,uintptr_t sw_library,const struct region *maps,size_t maps_count,unsigned interval){
 if(armed||!impl||!library||!sw_library||!maps||!maps_count||maps_count>4096||interval<10||interval>1000)return -1;
 implementation=impl;base=library;sw_base=sw_library;region_count=maps_count;for(size_t i=0;i<maps_count;i++)if(maps[i].start>=maps[i].end||(i&&maps[i-1].end>maps[i].start))return -9;memcpy(regions,maps,maps_count*sizeof(*maps));count=overflow=0;
 signal_number=SIGRTMIN+5;sigset_t blocked;sigprocmask(SIG_SETMASK,NULL,&blocked);if(sigismember(&blocked,signal_number))return -8;
 if(sigaction(signal_number,NULL,&previous)||previous.sa_handler!=SIG_DFL)return -2;
 struct sigaction action={0};action.sa_sigaction=tick;action.sa_flags=SA_SIGINFO|SA_RESTART;sigemptyset(&action.sa_mask);if(sigaction(signal_number,&action,NULL))return -3;
 struct sigevent event={0};event.sigev_notify=SIGEV_THREAD_ID;event.sigev_signo=signal_number;event._sigev_un._tid=(pid_t)syscall(SYS_gettid);
 if(timer_create(CLOCK_MONOTONIC,&event,&timer)){sigaction(signal_number,&previous,NULL);return -4;}
 struct itimerspec spec={0};spec.it_interval.tv_nsec=interval*1000;spec.it_value=spec.it_interval;armed=1;
 if(timer_settime(timer,0,&spec,NULL)){armed=0;timer_delete(timer);sigaction(signal_number,&previous,NULL);return -5;}return 0;
}
size_t stop(struct sample *out,size_t capacity,int *did_overflow){
 if(!armed||!out||!did_overflow||!capacity)return 0;
 armed=0;timer_delete(timer);
 sigset_t set,old;sigemptyset(&set);sigaddset(&set,signal_number);sigprocmask(SIG_BLOCK,&set,&old);struct timespec zero={0};while(sigtimedwait(&set,NULL,&zero)>=0){}
 sigaction(signal_number,&previous,NULL);sigprocmask(SIG_SETMASK,&old,NULL);size_t size=(size_t)count;if(size>capacity)size=capacity;memcpy(out,rows,size*sizeof(*out));*did_overflow=overflow;return size;
}
