(function(){
  var cache=null,pending=null;
  function status(){ if(cache)return Promise.resolve(cache); if(pending)return pending;
    pending=fetch('/api/my/assignments').then(function(r){return r.json();}).then(function(d){cache=(d&&d.decks)||{};return cache;}).catch(function(){cache={};return cache;});
    return pending; }
  function badge(s){ if(!s||!s.total)return '';
    if(s.open>0){ if(s.anyLate)return '<span class="ab late">⚠️ '+s.open+' overdue 逾期 →</span>';
      var due=s.nextDueAt?' · due 截止 '+new Date(s.nextDueAt).toLocaleDateString():'';
      return '<span class="ab open">📝 '+s.open+' to do 待交'+due+' →</span>'; }
    if(s.graded===s.total)return '<span class="ab graded">✓ graded 已批改 →</span>';
    return '<span class="ab done">✓ submitted 已提交 →</span>'; }
  // The badge is a button: clicking it jumps to that class's homework on the
  // assignments page (and stops the card's own link to the deck from firing).
  function go(deck){ return function(ev){ ev.preventDefault(); ev.stopPropagation();
    window.location.href='https://academic.hopeembark.org/assignments#'+encodeURIComponent(deck); }; }
  window.applyAsgBadges=function(){ status().then(function(decks){
    var slots=document.querySelectorAll('.asg-badge[data-deck]');
    for(var i=0;i<slots.length;i++){ var deck=slots[i].getAttribute('data-deck'), s=decks[deck];
      slots[i].innerHTML=badge(s);
      if(s&&s.total){ slots[i].classList.add('clickable'); slots[i].setAttribute('title','查看作业 · View homework'); slots[i].onclick=go(deck); }
      else { slots[i].classList.remove('clickable'); slots[i].onclick=null; }
    }
  }); };
  window.applyAsgBadges();
})();