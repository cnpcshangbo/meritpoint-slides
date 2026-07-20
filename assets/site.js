
(function(){
  var cat=window.CATALOG,q=document.getElementById('q'),tagsEl=document.getElementById('tags'),resEl=document.getElementById('results'),countEl=document.getElementById('count'),active=new Set();
  var items=[];cat.courses.forEach(function(co){(co.decks||[]).forEach(function(d){items.push({co:co,d:d,hay:((co.title+' '+(d.title||'')+' '+(d.summary||'')+' '+((d.tags||[]).join(' '))+' '+((co.tags||[]).join(' '))).toLowerCase())})})});
  var tagSet={};cat.courses.forEach(function(co){(co.tags||[]).forEach(function(t){tagSet[t]=1});(co.decks||[]).forEach(function(d){(d.tags||[]).forEach(function(t){tagSet[t]=1})})});
  Object.keys(tagSet).sort().forEach(function(t){var c=document.createElement('span');c.className='chip';c.textContent=t;c.onclick=function(){if(active.has(t)){active.delete(t);c.classList.remove('on')}else{active.add(t);c.classList.add('on')}render()};tagsEl.appendChild(c)});
  function matches(it){var s=q.value.trim().toLowerCase();if(s&&it.hay.indexOf(s)<0)return false;if(active.size){var dt=new Set([].concat(it.d.tags||[],it.co.tags||[]));for(var t of active){if(!dt.has(t))return false}}return true}
  function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
  function render(){var shown=items.filter(matches);countEl.textContent=shown.length+' class'+(shown.length===1?'':'es')+(q.value||active.size?' match':' available');var html='';
    cat.courses.forEach(function(co){var ds=shown.filter(function(it){return it.co.id===co.id});if(!ds.length)return;
      html+='<section class="course"><h2>'+esc(co.title)+'</h2><p class="sub">'+esc(co.subtitle||'')+'</p><div class="grid">';
      ds.forEach(function(it){var d=it.d,ready=d.status==='ready',href=ready?co.id+'/'+d.id+'/':'#';
        var pdf=(ready&&!d.noPdf)?'<span class="pdf-link" data-pdf="'+href+'slides.pdf" title="Download these slides as a PDF">⬇ PDF</span>':'';
        html+='<a class="card '+(ready?'ready':'planned')+'" href="'+href+'"><div class="num">CLASS '+String(d.n).padStart(2,"0")+'</div><h3>'+esc(d.title||'')+'</h3><div class="asg-badge" data-deck="'+esc(d.id)+'"></div><p>'+esc(d.summary||'')+'</p><div class="ct">'+(d.tags||[]).slice(0,4).map(function(t){return '<span class="t">'+esc(t)+'</span>'}).join('')+pdf+'</div></a>'});
      html+='</div></section>'});
    resEl.innerHTML=html||'<p class="empty">No classes match. Try a different search or clear the tags.</p>';
    if(window.applyAsgBadges)window.applyAsgBadges();
    var tc=document.getElementById('tagCount'); if(tc) tc.innerHTML=active.size?'<span class="n">'+active.size+'</span>':'';}
  // pdf chips live inside the card link — swallow the card navigation
  resEl.addEventListener('click',function(e){var p=e.target.closest('.pdf-link');if(p){e.preventDefault();e.stopPropagation();location.href=p.dataset.pdf;}});
  // Tag filters are folded by default (they took a lot of space); toggle reveals them.
  var toggle=document.getElementById('tagToggle'),caret=document.getElementById('tagCaret');
  toggle.addEventListener('click',function(){var open=tagsEl.hasAttribute('hidden');
    if(open){tagsEl.removeAttribute('hidden');caret.textContent='▴';toggle.setAttribute('aria-expanded','true');}
    else{tagsEl.setAttribute('hidden','');caret.textContent='▾';toggle.setAttribute('aria-expanded','false');}});
  q.addEventListener('input',render);render();
})();