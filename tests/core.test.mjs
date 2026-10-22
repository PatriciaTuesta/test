import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {validateBank,buildIndex,createRun,isValidRun,scoreRun,escapeHtml,shuffled} from '../assets/core.js';
import {CATALOG} from '../assets/catalog.js';

const banks=await Promise.all(CATALOG.map(async level=>JSON.parse(await readFile(new URL(`../data/${level.file}`,import.meta.url),'utf8'))));
// Los casos del motor usan datos de prueba propios para que ampliar los JSON
// no obligue a cambiar estas comprobaciones ni sus cantidades de referencia.
const fixture={
  schemaVersion:1,bankId:'fixture',version:'1.0.0',title:'Prueba',sources:[],
  settings:{examLength:20,defaultMinutes:30,passPercent:60,shuffleOptions:true},
  level:{id:'fixture',code:'F',title:'Prueba',description:'Datos de prueba',objective:'Comprobar el motor',topics:[
    {id:'fixture-topic',order:1,title:'Tema de prueba',subtopics:[1,2,3].map(i=>({id:`fixture-sub-${i}`,title:`Subtema ${i}`}))},
    {id:'fixture-empty',order:2,title:'Tema vacío',subtopics:[{id:'fixture-empty-sub',title:'Sin preguntas'}]}
  ]},
  questions:Array.from({length:24},(_,i)=>{
    const tf=i%4===0;
    return {id:`fixture-q-${i}`,levelId:'fixture',topicId:'fixture-topic',subtopicId:`fixture-sub-${Math.floor(i/8)+1}`,type:tf?'true-false':'single-choice',prompt:`Enunciado de prueba ${i}`,options:tf?[{id:'true',text:'Verdadero'},{id:'false',text:'Falso'}]:[{id:'a',text:'Opción correcta'},{id:'b',text:'Opción incorrecta'},{id:'c',text:'Otro distractor'}],answerId:tf?(i%8===0?'false':'true'):'a',explanation:'Explicación de prueba.'};
  })
};
let seed=48271;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const clone=value=>JSON.parse(JSON.stringify(value));

test('existen exactamente siete bancos y todos respetan el contrato',async()=>{
  const files=(await readdir(new URL('../data/',import.meta.url))).filter(f=>f.endsWith('.json'));
  assert.equal(files.length,7);
  banks.forEach((bank,i)=>assert.deepEqual(validateBank(bank,CATALOG[i].id),[]));
  assert.deepEqual(validateBank(fixture),[]);
});

for(const bank of banks){
  test(`${bank.level.code}: sortea veinte distintas y la corrección no depende del orden`,()=>{
    const index=buildIndex(bank),available=[...index.byTopic].find(([,qs])=>qs.length>=bank.settings.examLength);
    if(!available)return;
    const topic=available[0];
    const subsets=new Set();
    for(let round=0;round<20;round++){
      const run=createRun(bank,index,topic,{minutes:0},random);
      assert.equal(run.questionIds.length,bank.settings.examLength);assert.equal(new Set(run.questionIds).size,bank.settings.examLength);
      subsets.add([...run.questionIds].sort().join(','));
      for(const id of run.questionIds){
        const q=index.questions.get(id);
        assert.equal(q.topicId,topic);assert.equal(q.levelId,bank.level.id);
        assert.deepEqual([...run.optionOrders[id]].sort(),q.options.map(o=>o.id).sort());
        run.answers[id]=q.answerId;
      }
      assert.equal(isValidRun(clone(run),bank,index),true);
      const score=scoreRun(run,index);
      assert.equal(score.correct,run.questionIds.length);assert.equal(score.percent,100);assert.equal(score.grade,20);
    }
    if(index.byTopic.get(topic).length>bank.settings.examLength)assert.ok(subsets.size>1,'El sorteo debe cambiar también el subconjunto, no solo el orden');
  });
}

test('subtema corto: práctica usa ocho sin duplicarlas; examen insuficiente se rechaza',()=>{
  const bank=fixture,index=buildIndex(bank),topic=bank.level.topics.find(t=>index.byTopic.get(t.id).length===24),subtopicId=topic.subtopics[0].id;
  const run=createRun(bank,index,topic.id,{mode:'practice',subtopicId,minutes:0},random);
  assert.equal(run.questionIds.length,8);assert.ok(run.questionIds.every(id=>index.questions.get(id).subtopicId===subtopicId));
  assert.throws(()=>createRun(bank,index,topic.id,{mode:'exam',subtopicId}),/necesita 20/);
  const empty=bank.level.topics.find(t=>!index.byTopic.get(t.id).length);
  assert.throws(()=>createRun(bank,index,empty.id),/todavía no tiene/);
  assert.throws(()=>createRun(bank,index,topic.id,{subtopicId:'no-existe'}),/no pertenece/);
});

test('puntúa correctas, errores y omitidas; acepta la opción false por ID',()=>{
  const bank=fixture,index=buildIndex(bank),topic=bank.level.topics.find(t=>index.byTopic.get(t.id).length===24);
  const run=createRun(bank,index,topic.id,{minutes:0},random);
  run.answers[run.questionIds[0]]=index.questions.get(run.questionIds[0]).answerId;
  const q=index.questions.get(run.questionIds[1]);run.answers[q.id]=q.options.find(o=>o.id!==q.answerId).id;
  const score=scoreRun(run,index);
  assert.equal(score.correct,1);assert.equal(score.wrong,1);assert.equal(score.skipped,18);assert.equal(score.grade,1);
  assert.equal(score.groups.reduce((n,g)=>n+g.total,0),20);
  const falseQ=bank.questions.find(q=>q.answerId==='false');
  const tfRun={...run,questionIds:[falseQ.id],answers:{[falseQ.id]:'false'}};
  assert.equal(scoreRun(tfRun,index).correct,1);
});

test('no cuenta como activas las preguntas deshabilitadas',()=>{
  const bank=clone(fixture);bank.questions[0].enabled=false;
  assert.deepEqual(validateBank(bank),[]);
  const index=buildIndex(bank);assert.equal(index.questions.size,23);
  const run=createRun(bank,index,bank.questions[0].topicId,{minutes:0},random);
  assert.ok(!run.questionIds.includes(bank.questions[0].id));
});

test('rechaza duplicados, referencias rotas, respuestas inexistentes y objetos incompletos sin fallar',()=>{
  for(const mutate of [
    b=>b.questions.push(clone(b.questions[0])),
    b=>b.questions[0].subtopicId='no-existe',
    b=>b.questions[0].topicId=b.level.topics[1].id,
    b=>b.questions[0].answerId='z',
    b=>b.questions[0].options=[null],
    b=>b.questions[0].options[0].text=undefined,
    b=>b.questions[0].id='constructor',
    b=>b.questions[0].type='ensayo',
    b=>b.level.topics[0].subtopics.push(clone(b.level.topics[0].subtopics[0]))
    ,b=>b.sources='invalid'
    ,b=>b.questions[0].sourceIds=['no-existe']
  ]){const bad=clone(fixture);mutate(bad);assert.ok(validateBank(bad).length>0);}
  for(const bad of [null,[],{},'bad',{level:{}},{level:{topics:[null]},questions:[null]}])assert.ok(validateBank(bad).length>0);
});

test('restaurar conserva orden, respuestas y marcas; rechaza sesiones corruptas y versiones antiguas',()=>{
  const bank=fixture,index=buildIndex(bank),topic=bank.questions[0].topicId;
  const run=createRun(bank,index,topic,{minutes:30},random);run.position=3;run.answers[run.questionIds[0]]=index.questions.get(run.questionIds[0]).answerId;run.flags=[run.questionIds[4]];
  const restored=clone(run);assert.ok(isValidRun(restored,bank,index));assert.deepEqual(restored,run);
  for(const mutate of [r=>r.bankVersion='old',r=>r.answers.fake='a',r=>r.questionIds[1]=r.questionIds[0],r=>r.optionOrders[r.questionIds[0]]=['fake'],r=>r.position=999,r=>r.deadline+=100,r=>r.checked=[r.questionIds[2]]]){
    const bad=clone(run);mutate(bad);assert.equal(isValidRun(bad,bank,index),false);
  }
});

test('al expirar, limita el tiempo registrado a la duración del examen',()=>{
  const bank=fixture,index=buildIndex(bank),run=createRun(bank,index,bank.questions[0].topicId,{minutes:20},random);
  assert.equal(scoreRun(run,index,run.deadline+60000).elapsed,20*60000);
});

test('el contenido JSON se escapa como texto y el barajado no modifica la entrada',()=>{
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
  const input=[1,2,3,4],output=shuffled(input,()=>0);assert.deepEqual(input,[1,2,3,4]);assert.deepEqual([...output].sort(),input);assert.notDeepEqual(output,input);
});
