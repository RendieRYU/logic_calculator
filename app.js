/* Kalkulator Logika - Parser & Evaluator
   Fitur:
   - Operator: NOT (!, ¬), AND (&, ∧), OR (|, ∨), XOR (^), NAND, NOR, XNOR / EQUIV (<->, <=>), IMPLIES (->, =>)
   - Konstanta: TRUE, FALSE, 1, 0
   - Dukungan spasi bebas, case-insensitive untuk operator/konstanta
   - Tabel kebenaran
*/

(function(){
  const input = document.getElementById('exprInput');
  const btnEval = document.getElementById('btnEval');
  const btnTable = document.getElementById('btnTable');
  const btnClear = document.getElementById('btnClear');
  const btnExport = document.getElementById('btnExport');
  const btnShare = document.getElementById('btnShare');
  const themeToggle = document.getElementById('themeToggle');
  const compactToggle = document.getElementById('compactToggle');
  const themeIconUse = document.getElementById('themeIconUse');
  const compactIconUse = document.getElementById('compactIconUse');
  const varsContainer = document.getElementById('varsContainer');
  const evalResult = document.getElementById('evalResult');
  const errorBox = document.getElementById('errorBox');
  const tableContainer = document.getElementById('tableContainer');
  const chkSimplify = document.getElementById('chkSimplify');
  const historyBox = document.getElementById('history');

  const helperButtons = document.querySelectorAll('.helper-buttons button');
  helperButtons.forEach(b=>b.addEventListener('click',()=>{
    insertAtCursor(input, b.dataset.insert || b.textContent.trim());
    input.focus();
    updateVariables();
  }));

  input.addEventListener('input',()=>{
    debounce(updateVariables,300)();
  });

  btnEval.addEventListener('click',()=>{
    evaluateCurrent();
  });
  btnTable.addEventListener('click',()=>{
    buildTruthTable();
  });
  btnClear.addEventListener('click',()=>{
    input.value='';
    varsContainer.innerHTML='Belum ada variabel. Ketik ekspresi.';
    varsContainer.classList.add('empty');
    evalResult.textContent='—';
    evalResult.classList.remove('good','bad');
    tableContainer.innerHTML='Belum dibuat.';
    errorBox.hidden=true;errorBox.textContent='';
    historyBox.innerHTML='';
  })

  btnExport && btnExport.addEventListener('click',()=>{
    const csv = exportTruthTableCsv();
    if(!csv){
      flash(tableContainer,'shake');
      return;
    }
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download='truth_table.csv'; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
  });

  btnShare && btnShare.addEventListener('click',()=>{
    const expr= encodeURIComponent(input.value.trim());
    const params=new URLSearchParams(); if(expr) params.set('expr',expr);
    const u= location.origin + location.pathname + '?' + params.toString();
    navigator.clipboard.writeText(u).then(()=>{
      btnShare.textContent='✔'; setTimeout(()=>btnShare.textContent='🔗',1200);
    }).catch(()=>{
      alert('Gagal menyalin URL');
    });
  });

  themeToggle && themeToggle.addEventListener('click',()=>{
    const current=document.documentElement.getAttribute('data-theme');
    const next = current==='light' ? 'dark':'light';
    setTheme(next);
  });

  compactToggle && compactToggle.addEventListener('click',()=>{
    document.body.classList.toggle('compact');
    const isCompact=document.body.classList.contains('compact');
    localStorage.setItem('logicCompact', isCompact? '1':'0');
    if(compactIconUse) compactIconUse.setAttribute('href', isCompact? '#ico-expand':'#ico-compact');
  });

  function setTheme(theme){
    if(theme==='light') document.documentElement.setAttribute('data-theme','light');
    else document.documentElement.setAttribute('data-theme','dark');
    localStorage.setItem('logicTheme',theme);
    // update meta theme-color
    const meta=document.getElementById('themeColorMeta');
  if(meta){ meta.setAttribute('content', theme==='light'? '#f4f6f9':'#0f1115'); }
  if(themeIconUse){ themeIconUse.setAttribute('href', theme==='light'? '#ico-sun':'#ico-moon'); }
  }
  (function initTheme(){
    const saved=localStorage.getItem('logicTheme');
    if(saved) setTheme(saved); else if(matchMedia('(prefers-color-scheme: light)').matches) setTheme('light');
  })();

  (function initCompact(){
    if(localStorage.getItem('logicCompact')==='1'){
      document.body.classList.add('compact');
      if(compactIconUse) compactIconUse.setAttribute('href','#ico-expand');
    }
  })();

  // Enter key evaluate shortcut
  input.addEventListener('keydown',e=>{
    if(e.key==='Enter' && !e.shiftKey){
      e.preventDefault();
      evaluateCurrent();
    }
  });

  function insertAtCursor(el,text){
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = el.value.slice(0,start);
    const after = el.value.slice(end);
    el.value = before + (before && !/\s$/.test(before)?' ':'') + text + ' ' + after;
    const pos = before.length + text.length + 2;
    el.selectionStart = el.selectionEnd = pos;
    el.dispatchEvent(new Event('input'));
  }

  let debounceTimer; function debounce(fn,ms){return function(){clearTimeout(debounceTimer);debounceTimer=setTimeout(fn,ms)}}

  // Lexer
  const tokenSpec = [
    ['WS', /[\s]+/y],
    ['LPAREN', /\(/y],
    ['RPAREN', /\)/y],
    ['IMPLIES', /(?:->|=>)/iy],
    ['EQUIV', /(?:<->|<=>)/iy],
    ['NOT', /(?:NOT|!|¬)/iy],
    ['AND', /(?:AND|&|∧)/iy],
    ['NAND', /NAND/iy],
    ['NOR', /NOR/iy],
    ['OR', /(?:OR|\||∨)/iy],
    ['XOR', /(?:XOR|\^)/iy],
    ['XNOR', /XNOR|EQUIV/iy],
    ['TRUE', /(?:TRUE|1)/iy],
    ['FALSE', /(?:FALSE|0)/iy],
    ['IDENT', /[A-Za-z_][A-Za-z0-9_]*/y]
  ];

  function lex(input){
    const tokens=[]; let pos=0; while(pos < input.length){
      let match=false;
      for(const [type,regex] of tokenSpec){
        regex.lastIndex=pos;
        const m=regex.exec(input);
        if(m){
          match=true; pos=regex.lastIndex;
          if(type==='WS') break; // skip
          tokens.push({type,value:m[0]});
          break;
        }
      }
      if(!match){
        throw new SyntaxError('Token tidak dikenal di posisi '+pos+': "'+input.slice(pos,pos+10)+'"');
      }
    }
    return tokens;
  }

  // Parser (precedence climbing + recursive descent for unary & parentheses)
  // Precedence: NOT > AND/NAND > XOR > OR/NOR > IMPLIES > EQUIV/XNOR
  const PRECEDENCE = {
    'EQUIV':1,'XNOR':1,
    'IMPLIES':2,
    'OR':3,'NOR':3,
    'XOR':4,
    'AND':5,'NAND':5
  };

  function parse(tokens){
    let i=0;
    function peek(){return tokens[i];}
    function consume(type){
      const t=peek(); if(!t||t.type!==type) throw new SyntaxError('Diharapkan '+type+' tetapi menemukan '+ (t? t.type:'akhir input')); i++; return t;
    }

    function parsePrimary(){
      const t=peek(); if(!t) throw new SyntaxError('Ekspresi tidak lengkap');
      if(t.type==='LPAREN'){ consume('LPAREN'); const node=parseEquiv(); if(!peek()||peek().type!=='RPAREN') throw new SyntaxError('Kurung tutup hilang'); consume('RPAREN'); return node; }
      if(t.type==='NOT'){ consume('NOT'); return {type:'NOT', operand: parsePrimary()}; }
      if(t.type==='TRUE' || t.type==='FALSE'){ i++; return {type:'CONST', value: t.type==='TRUE'}; }
      if(t.type==='IDENT'){ i++; return {type:'VAR', name: t.value}; }
      throw new SyntaxError('Token tidak terduga: '+t.type);
    }

    function parseBinary(nextParser, ops){
      let left=nextParser();
      while(peek() && ops.includes(peek().type)){
        const op=peek().type; i++;
        let right=nextParser();
        left={type: op, left, right};
      }
      return left;
    }

    function parseRightAssociative(nextParser, ops){
      let left=nextParser();
      if(peek() && ops.includes(peek().type)){
        const op=peek().type; i++;
        const right=parseRightAssociative(nextParser, ops); // right-assoc
        return {type: op, left, right};
      }
      return left;
    }

    // Build precedence levels bottom-up
    function parseAnd(){
      return parseBinary(parsePrimary,['AND','NAND']);
    }
    function parseXor(){
      return parseBinary(parseAnd,['XOR']);
    }
    function parseOr(){
      return parseBinary(parseXor,['OR','NOR']);
    }
    function parseImplies(){
      return parseRightAssociative(parseOr,['IMPLIES']);
    }
    function parseEquiv(){
      return parseBinary(parseImplies,['EQUIV','XNOR']);
    }

    const ast=parseEquiv();
    if(i!==tokens.length) throw new SyntaxError('Token berlebih mulai dari: '+tokens[i].value);
    return ast;
  }

  function collectVars(ast,set=new Set()){
    if(!ast) return set;
    switch(ast.type){
      case 'VAR': set.add(ast.name); break;
      case 'NOT': collectVars(ast.operand,set); break;
      case 'CONST': break;
      default: collectVars(ast.left,set); collectVars(ast.right,set);
    }
    return set;
  }

  function evalAst(ast, env){
    switch(ast.type){
      case 'CONST': return ast.value;
      case 'VAR': if(!(ast.name in env)) throw new Error('Variabel '+ast.name+' belum diberi nilai'); return !!env[ast.name];
      case 'NOT': return !evalAst(ast.operand, env);
      case 'AND': return evalAst(ast.left,env) && evalAst(ast.right,env);
      case 'NAND': return !(evalAst(ast.left,env) && evalAst(ast.right,env));
      case 'OR': return evalAst(ast.left,env) || evalAst(ast.right,env);
      case 'NOR': return !(evalAst(ast.left,env) || evalAst(ast.right,env));
      case 'XOR': return !!(evalAst(ast.left,env) ^ evalAst(ast.right,env));
      case 'IMPLIES': return (!evalAst(ast.left,env)) || evalAst(ast.right,env);
      case 'EQUIV':
      case 'XNOR': return evalAst(ast.left,env) === evalAst(ast.right,env);
      default: throw new Error('Tipe node tidak dikenal: '+ast.type);
    }
  }

  let currentAst=null;

  function updateVariables(){
    const text=input.value.trim();
    if(!text){varsContainer.innerHTML='Belum ada variabel. Ketik ekspresi.';varsContainer.classList.add('empty');currentAst=null;return;}
    try {
      const tokens=lex(text);
      currentAst=parse(tokens);
      const vars=[...collectVars(currentAst)].sort();
      varsContainer.classList.remove('empty');
      if(!vars.length){
        varsContainer.innerHTML='<div class="var-chip">(Tidak ada variabel)</div>';
      } else {
        varsContainer.innerHTML='';
        vars.forEach(v=>{
          const chip=document.createElement('label');
          chip.className='var-chip';
          chip.innerHTML=`<input type="checkbox" data-var="${v}" /> ${v}`;
          varsContainer.appendChild(chip);
        });
        // restore states if previously set snapshot
      }
      errorBox.hidden=true; errorBox.textContent='';
    } catch(e){
      currentAst=null;
      varsContainer.innerHTML='<span style="color:#ff7070;font-size:.75rem">'+escapeHtml(e.message)+'</span>';
      varsContainer.classList.remove('empty');
    }
  }

  function getEnv(){
    const env={};
    varsContainer.querySelectorAll('input[type=checkbox][data-var]').forEach(chk=>{
      env[chk.dataset.var]=chk.checked;
    });
    return env;
  }

  function evaluateCurrent(){
    if(!currentAst){evalResult.textContent='—'; evalResult.classList.remove('good','bad'); return;}
    try {
      const env=getEnv();
      const val=evalAst(currentAst, env);
      evalResult.textContent=val? 'TRUE':'FALSE';
      evalResult.classList.remove('good','bad');
      evalResult.classList.add(val? 'good':'bad');
      errorBox.hidden=true; errorBox.textContent='';
  pushHistory(input.value.trim(), val, env);
    } catch(e){
      errorBox.hidden=false; errorBox.textContent=e.message;
    }
  }

  function buildTruthTable(){
    if(!currentAst){tableContainer.innerHTML='Tidak ada AST'; return;}
    const vars=[...collectVars(currentAst)].sort();
    if(vars.length>12){
      tableContainer.innerHTML='<div class="placeholder">Terlalu banyak variabel ('+vars.length+'>12) untuk tabel</div>';
      return;
    }
    if(vars.length>10){
      const proceed=confirm('Tabel akan memiliki '+(1<<vars.length)+' baris. Lanjutkan?');
      if(!proceed) return;
    }
    const rows=1<<vars.length;
    const simplify=chkSimplify.checked;
    const headers=[...vars,'Hasil'];

    let html='<table><thead><tr>'+headers.map(h=>'<th>'+escapeHtml(h)+'</th>').join('')+'</tr></thead><tbody>';
    for(let mask=0; mask<rows; mask++){
      const env={};
      vars.forEach((v,idx)=>{env[v]=!!(mask & (1<<(vars.length-idx-1)));});
      let val;
      try { val=evalAst(currentAst, env);} catch(e){ val='?'; }
      html+='<tr>'+vars.map(v=>'<td>'+(env[v]?1:0)+'</td>').join('')+'<td>'+(val?1:0)+'</td></tr>';
    }
    html+='</tbody></table>';
    tableContainer.classList.remove('placeholder');
    tableContainer.innerHTML=html;
  }

  function exportTruthTableCsv(){
    if(!currentAst) return '';
    const vars=[...collectVars(currentAst)].sort();
    if(vars.length>16){return '';} // safety
    const rows=1<<vars.length; const lines=[];
    lines.push([...vars,'Result'].join(','));
    for(let mask=0; mask<rows; mask++){
      const env={}; vars.forEach((v,idx)=>{env[v]=!!(mask & (1<<(vars.length-idx-1)));});
      const val=evalAst(currentAst, env);
      lines.push(vars.map(v=>env[v]?1:0).join(',')+','+(val?1:0));
    }
    return lines.join('\n');
  }

  function pushHistory(expr,val,env){
    if(!expr) return;
    const entry=document.createElement('div');
    entry.className='history-entry';
    const varsStr=Object.keys(env).sort().map(k=>k+'='+(env[k]?1:0)).join(' ');
    entry.innerHTML=`<span class="badge ${val? 'true':'false'}">${val? 'T':'F'}</span><span class="expr">${escapeHtml(expr)}</span><span class="vars" style="opacity:.6">${varsStr}</span>`;
    historyBox.prepend(entry);
    while(historyBox.children.length>25) historyBox.removeChild(historyBox.lastChild);
  }

  function flash(el,cls){
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(()=>el.classList.remove(cls),700);
  }

  function escapeHtml(str){return str.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));}
  // load expr from URL if any
  (function loadFromUrl(){
    const params=new URLSearchParams(location.search);
    const expr=params.get('expr');
    if(expr){
      try { input.value=decodeURIComponent(expr); updateVariables(); }
      catch{ /* ignore */ }
    }
  })();

  // Auto-init if existing default
  updateVariables();
  // Respect reduced motion preference by adding a class if desired (optional future use)
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){
    document.documentElement.classList.add('reduced-motion');
  }
})();
