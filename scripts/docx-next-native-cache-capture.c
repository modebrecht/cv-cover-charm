/* Read-only, same-thread, bounded original importer cache sampling; AMD64 Linux only. */
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
struct sample {uintptr_t ip,stack[10],bookmark[3],vtable,parent_vtable; uint32_t range_position,range_in_cell,node_type,content_offset,ancestor_count,start_types[16],paragraph_length; uint16_t paragraph[200]; uint32_t tag_length; uint16_t tag[200];};
struct layout {uint32_t sdt,helper,tag,range_position,range_in_cell,range_parent,range_mark,mark_position,optional_engaged,node_index_node,position_content,content_index_value,node_type,node_start,start_type,text;};
_Static_assert(sizeof(uintptr_t)==8,"AMD64 pointer width required");
_Static_assert(sizeof(struct layout)==16*sizeof(uint32_t),"Exact layout field array required");
static struct layout fields;
static struct region regions[4096];
static struct sample rows[2048];
static volatile sig_atomic_t count,overflow,armed;
static size_t region_count;
static uintptr_t implementation;
static timer_t timer;
static int signal_number;
static struct sigaction previous;
static int readable(uintptr_t address,size_t length) {
 if(!address||length>4096||address+length<address)return 0;
 for(size_t i=0;i<region_count;i++)if(address>=regions[i].start&&address+length<=regions[i].end)return 1;
 return 0;
}
static int copy(void *out,uintptr_t address,size_t length) {
 if(!readable(address,length))return 0;
 volatile const unsigned char *in=(volatile const unsigned char *)address;
 unsigned char *target=out;for(size_t i=0;i<length;i++)target[i]=in[i];return 1;
}
static void tick(int number,siginfo_t *info,void *context) {
 (void)number;(void)info; int saved_errno=errno;
 if(!armed){errno=saved_errno;return;}
 struct sample row={0}; uintptr_t helper,tag_pointer;
 row.ip=((ucontext_t*)context)->uc_mcontext.gregs[REG_RIP];
 if(!copy(row.stack,implementation+fields.sdt,80)||row.stack[2]==row.stack[6])goto done;
 uintptr_t entry;
 if(row.stack[6]!=row.stack[7])entry=row.stack[6]-24;
 else {uintptr_t previous_node;if(!copy(&previous_node,row.stack[9]-8,8))goto done;entry=previous_node+480;}
 if(entry!=row.stack[2])goto done;
 if(!copy(row.bookmark,entry,24)||(row.bookmark[0]&255)>1||!row.bookmark[2]||!copy(&row.vtable,row.bookmark[2],8))goto done;
 intptr_t adjustment;uintptr_t range,parent;unsigned char in_cell;
 if(!copy(&adjustment,row.vtable-16,8))goto done;
 range=row.bookmark[2]+adjustment;
 if(!copy(&row.range_position,range+fields.range_position,4)||!copy(&in_cell,range+fields.range_in_cell,1)||in_cell>1||!copy(&parent,range+fields.range_parent,8)||!parent||!copy(&row.parent_vtable,parent,8))goto done;
 row.range_in_cell=in_cell;
 uintptr_t mark,node,ancestor,next;unsigned char engaged,node_type;
 if(!copy(&mark,range+fields.range_mark,8)||!copy(&engaged,mark+fields.mark_position+fields.optional_engaged,1)||engaged!=1||!copy(&node,mark+fields.mark_position+fields.node_index_node,8)||!copy(&row.content_offset,mark+fields.mark_position+fields.position_content+fields.content_index_value,4)||!copy(&node_type,node+fields.node_type,1)||!copy(&ancestor,node+fields.node_start,8))goto done;
 row.node_type=node_type;
 uintptr_t node_text,node_vtable;intptr_t node_adjustment;
 if(node_type!=8||!copy(&node_vtable,node,8)||!copy(&node_adjustment,node_vtable-16,8)||!copy(&node_text,node+node_adjustment+fields.text,8)||!copy(&row.paragraph_length,node_text+4,4)||row.paragraph_length>200||!copy(row.paragraph,node_text+8,row.paragraph_length*2))goto done;
 for(unsigned i=0;i<16;i++){
  uint32_t kind;if(!copy(&kind,ancestor+fields.start_type,4)||kind>5||!copy(&next,ancestor+fields.node_start,8))goto done;
  row.start_types[i]=kind;row.ancestor_count=i+1;if(next==ancestor||!next)break;ancestor=next;
  if(i==15)goto done;
 }
 if(!copy(&helper,implementation+fields.helper,8)||!copy(&tag_pointer,helper+fields.tag,8)||!copy(&row.tag_length,tag_pointer+4,4)||row.tag_length>200||!copy(row.tag,tag_pointer+8,row.tag_length*2))goto done;
 if(count&&rows[count-1].bookmark[0]==row.bookmark[0]&&rows[count-1].bookmark[2]==row.bookmark[2]&&rows[count-1].tag_length==row.tag_length) {
  size_t i;for(i=0;i<row.tag_length;i++)if(rows[count-1].tag[i]!=row.tag[i])break;
  if(i==row.tag_length)goto done;
 }
 if(count>=2048){overflow=1;goto done;}
 rows[count]=row;count++;
 done:errno=saved_errno;
}
int start(uintptr_t impl,const struct region *maps,size_t maps_count,unsigned interval_us,const struct layout *layout) {
 if(armed||!impl||!maps||!maps_count||maps_count>4096||interval_us<5||interval_us>1000)return -1;
 if(!layout)return -6;
 uint32_t offsets[16];memcpy(offsets,layout,sizeof(offsets));for(unsigned i=0;i<16;i++)if(offsets[i]>4096)return -7;
 fields=*layout;implementation=impl;region_count=maps_count;memcpy(regions,maps,maps_count*sizeof(*maps));count=overflow=0;
 signal_number=SIGRTMIN+5;sigset_t blocked;sigprocmask(SIG_SETMASK,NULL,&blocked);if(sigismember(&blocked,signal_number))return -8;
 if(sigaction(signal_number,NULL,&previous)||previous.sa_handler!=SIG_DFL)return -2;
 struct sigaction action={0};action.sa_sigaction=tick;action.sa_flags=SA_SIGINFO|SA_RESTART;sigemptyset(&action.sa_mask);
 if(sigaction(signal_number,&action,NULL))return -3;
 struct sigevent event={0};event.sigev_notify=SIGEV_THREAD_ID;event.sigev_signo=signal_number;event._sigev_un._tid=(pid_t)syscall(SYS_gettid);
 if(timer_create(CLOCK_MONOTONIC,&event,&timer)){sigaction(signal_number,&previous,NULL);return -4;}
 struct itimerspec spec={0};spec.it_interval.tv_nsec=interval_us*1000;spec.it_value=spec.it_interval;armed=1;
 if(timer_settime(timer,0,&spec,NULL)){armed=0;timer_delete(timer);sigaction(signal_number,&previous,NULL);return -5;}
 return 0;
}
size_t stop(struct sample *out,size_t capacity,int *did_overflow) {
 if(!armed||!out||!did_overflow||!capacity)return 0;
 armed=0;timer_delete(timer);
 sigset_t set,old;sigemptyset(&set);sigaddset(&set,signal_number);sigprocmask(SIG_BLOCK,&set,&old);
 struct timespec zero={0};while(sigtimedwait(&set,NULL,&zero)>=0){}
 sigaction(signal_number,&previous,NULL);sigprocmask(SIG_SETMASK,&old,NULL);
 size_t size=(size_t)count;if(size>capacity)size=capacity;memcpy(out,rows,size*sizeof(*out));*did_overflow=overflow;return size;
}
