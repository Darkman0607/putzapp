/* V1.4.0.8 Hotfix: deterministic, local-first daily task selection. */
(function(root,factory){const api=factory(root.PutzmanagerTasks||(typeof require==='function'?require('./task-model.js'):null),root.PutzmanagerClean||(typeof require==='function'?require('./clean-model.js'):null));root.PutzmanagerPlanModel=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;})(typeof window!=='undefined'?window:globalThis,function(TASKS,CLEAN){
'use strict';
const keyFromDate=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
function estimate(task){const t=String(task).toLowerCase();if(/fenster|backofen|kühlschrank|dusche|badewanne/.test(t))return 20;if(/boden wischen|saugen|küche|wc|wäsche/.test(t))return 10;return 5;}
function build(home,now=new Date(),budget=30,snoozes={}){
 const today=keyFromDate(now),items=[];
 for(const floor of home?.floors||[])for(const room of floor.rooms||[]){const score=CLEAN.roomScore(room.cleanliness);
  for(const task of TASKS.allTasks(room)){
   const normalized=TASKS.normalized(task),id=`${floor.id}|${room.id}|${task.id}`;
   if(typeof snoozes[id]==='string'&&snoozes[id]>today)continue;
   if(normalized.interval==='none' && normalized.done)continue;
   if(normalized.interval!=='none'&&normalized.nextDue&&normalized.nextDue>today)continue;
   const overdue=!!(normalized.nextDue&&normalized.nextDue<today);
   const todayDue=normalized.nextDue===today;
   const priority=(overdue?100:todayDue?80:60)+(100-score)/2;
   items.push({id,floorId:floor.id,roomId:room.id,taskId:task.id,floorName:floor.name,roomName:room.name,areaName:task.areaName,text:task.text,score,overdue,todayDue,minutes:estimate(task.text),priority});
  }
 }
 items.sort((a,b)=>b.priority-a.priority||a.minutes-b.minutes||a.id.localeCompare(b.id));
 const validBudget=[15,30,60].includes(Number(budget))?Number(budget):30;
 let used=0;const selected=[];
 for(const item of items){if(used+item.minutes<=validBudget){selected.push(item);used+=item.minutes;}}
 return {today,budget:validBudget,used,selected,remaining:items.filter(i=>!selected.includes(i)),all:items};
}
return Object.freeze({build,estimate,keyFromDate});
});
