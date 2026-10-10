#define _GNU_SOURCE
#include <signal.h>
#include <stdint.h>
#include <stddef.h>
#include <string.h>
#include <ucontext.h>
#include <unistd.h>
#include <sys/syscall.h>
#include <time.h>
#include <errno.h>
#include <fcntl.h>
struct region{uintptr_t start,end;};
struct cols{int64_t left,right;uint32_t count,pad;int64_t pos[32];};
struct sample{uint64_t pc,table,parm;int64_t nw,ow;uint32_t kind,pad;struct cols newer,older;};
static struct region regions[4096];static size_t region_count;static struct sample samples[4096];static volatile sig_atomic_t armed,count,overflow,mode;static uintptr_t base;static timer_t timer;static int memory_fd=-1;static uintptr_t last_pc,last_frame;static int sig;static struct sigaction previous;
static int copy(void *dst,uintptr_t p,size_t n){if(!p||p+n<p)return 0;size_t lo=0,hi=region_count;while(lo<hi){size_t mid=lo+(hi-lo)/2;if(regions[mid].start<=p)lo=mid+1;else hi=mid;}if(lo&&p+n<=regions[lo-1].end){memcpy(dst,(void*)p,n);return 1;}return memory_fd>=0&&pread(memory_fd,dst,n,(off_t)p)==(ssize_t)n;}
static int cols(struct cols *dst,uintptr_t p){uintptr_t begin,end; if(!copy(&dst->left,p+8,8)||!copy(&dst->right,p+16,8)||!copy(&begin,p+40,8)||!copy(&end,p+48,8)||end<begin||(end-begin)%32||(end-begin)/32>32)return 0;dst->count=(end-begin)/32;for(unsigned i=0;i<dst->count;i++)if(!copy(&dst->pos[i],begin+i*32,8))return 0;return 1;}
static void tick(int number,siginfo_t *info,void *context){
 (void)number;(void)info;int saved=errno;if(!armed)goto done;
 ucontext_t *ctx=context;uintptr_t pc=ctx->uc_mcontext.gregs[REG_RIP]-base,frame=ctx->uc_mcontext.gregs[REG_RBP];struct sample s={0};s.pc=pc;
 if(mode==1){
  uintptr_t cursor=frame,parent=0,ret=0;
  for(unsigned depth=0;depth<40;depth++){
   if(!copy(&parent,cursor,8)||!copy(&ret,cursor+8,8))goto done;
   if(ret==base+0x92e48b){frame=cursor;s.parm=parent-0xc0;break;}
   if(parent<=cursor||parent-cursor>1048576)goto done;
   cursor=parent;
  }
  if(!s.parm)goto done;
  if(last_pc==pc&&last_frame==frame)goto done;
  last_pc=pc;last_frame=frame;
  s.kind=1;uintptr_t n,o;
  if(!copy(&s.table,frame-0xb0,8)||!copy(&n,s.parm,8)||!copy(&o,s.parm+8,8)||!copy(&s.nw,s.parm+16,8)||!copy(&s.ow,s.parm+24,8)||s.nw<=0||s.nw>65535||s.ow<=0||s.ow>65535||!cols(&s.newer,n)||!cols(&s.older,o))goto done;
 }else if(mode==2&&pc>=0x925f0f&&pc<0x926126&&!(pc>=0x9260b9&&pc<0x9260c8)){
  s.kind=2;if(!copy(&s.table,frame-0x40,8))goto done;
 }else goto done;
 if(count&&memcmp(&samples[count-1],&s,sizeof(s))==0)goto done;
 if(count>=4096){overflow=1;goto done;}samples[count++]=s;
 done:errno=saved;
}
int start(uintptr_t library,const struct region *r,size_t n,unsigned interval,unsigned phase){if(armed||!library||!n||n>4096||interval<1||interval>1000||phase<1||phase>2)return -1;memory_fd=open("/proc/self/mem",O_RDONLY|O_CLOEXEC);if(memory_fd<0)return -7;memcpy(regions,r,n*sizeof(*r));region_count=n;base=library;mode=phase;count=overflow=0;sig=SIGRTMIN+6;sigset_t blocked;sigprocmask(SIG_SETMASK,NULL,&blocked);if(sigismember(&blocked,sig))return -2;if(sigaction(sig,NULL,&previous)||previous.sa_handler!=SIG_DFL)return -3;struct sigaction action={0};action.sa_sigaction=tick;action.sa_flags=SA_SIGINFO|SA_RESTART;sigemptyset(&action.sa_mask);if(sigaction(sig,&action,NULL))return -4;struct sigevent event={0};event.sigev_notify=SIGEV_THREAD_ID;event.sigev_signo=sig;event._sigev_un._tid=syscall(SYS_gettid);if(timer_create(CLOCK_MONOTONIC,&event,&timer))return -5;armed=1;struct itimerspec t={0};t.it_value.tv_nsec=t.it_interval.tv_nsec=interval*1000;if(timer_settime(timer,0,&t,NULL))return -6;return 0;}
size_t stop(struct sample *dst,size_t capacity,int *bad){armed=0;timer_delete(timer);sigset_t set,old;sigemptyset(&set);sigaddset(&set,sig);sigprocmask(SIG_BLOCK,&set,&old);struct timespec zero={0};while(sigtimedwait(&set,NULL,&zero)>=0){}sigaction(sig,&previous,NULL);sigprocmask(SIG_SETMASK,&old,NULL);*bad=overflow||(size_t)count>capacity;size_t n=(size_t)count<capacity?(size_t)count:capacity;memcpy(dst,samples,n*sizeof(*dst));close(memory_fd);memory_fd=-1;return n;}
size_t sample_size(void){return sizeof(struct sample);}
