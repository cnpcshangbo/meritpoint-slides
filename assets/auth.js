(function(){
  var css = '#mpAuth{position:fixed;top:12px;right:14px;z-index:4000;font-family:-apple-system,"Segoe UI",Roboto,sans-serif}'
    + '#mpAuth .chip{display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #D7E2EC;border-radius:999px;'
    + 'padding:5px 12px 5px 5px;box-shadow:0 3px 10px rgba(20,40,70,.12);cursor:pointer;font-size:13px;color:#21303F;text-decoration:none}'
    + '#mpAuth .av{width:26px;height:26px;border-radius:50%;background:#0F9DB0;color:#fff;display:flex;align-items:center;'
    + 'justify-content:center;font-weight:700;font-size:13px}'
    + '#mpAuth .menu{display:none;position:absolute;right:0;top:42px;background:#fff;border:1px solid #D7E2EC;border-radius:12px;'
    + 'box-shadow:0 8px 24px rgba(20,40,70,.16);min-width:230px;overflow:hidden}'
    + '#mpAuth.open .menu{display:block}'
    + '#mpAuth .who{padding:12px 14px;border-bottom:1px solid #EDF2F7}'
    + '#mpAuth .who b{display:block;color:#0C2D52;font-size:14px}'
    + '#mpAuth .who span{color:#5E7183;font-size:12px;word-break:break-all}'
    + '#mpAuth .menu a{display:block;padding:10px 14px;color:#21303F;text-decoration:none;font-size:13px}'
    + '#mpAuth .menu a:hover{background:#EEF4FA}'
    + '#mpAuth .menu a.out{color:#c0392b;border-top:1px solid #EDF2F7}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  fetch('/api/whoami').then(function(r){ return r.json(); }).then(function(d){
    var el = document.createElement('div'); el.id = 'mpAuth';
    if (d && d.user) {
      var label = d.user.name || d.user.email;
      var initial = label.charAt(0).toUpperCase();
      el.innerHTML = '<div class="chip" role="button" aria-haspopup="true">'
        + '<span class="av">' + initial + '</span><span>' + label.split(' ')[0].split('@')[0] + '</span></div>'
        + '<div class="menu"><div class="who"><b></b><span></span></div>'
        + '<a href="/ai-toolbox/">📚 My classes · 课程</a>'
        + '<a href="https://academic.hopeembark.org/assignments">📝 Assignments &amp; grades · 作业与成绩</a>'
        + '<a class="out" href="/auth/logout">Sign out · 退出登录</a></div>';
      el.querySelector('.who b').textContent = d.user.name || '(no name)';
      el.querySelector('.who span').textContent = d.user.email + (d.user.role ? ' · ' + d.user.role : '');
      el.querySelector('.chip').addEventListener('click', function(){ el.classList.toggle('open'); });
      document.addEventListener('click', function(e){ if (!el.contains(e.target)) el.classList.remove('open'); });
    } else {
      el.innerHTML = '<a class="chip" href="https://academic.hopeembark.org/login?next='
        + encodeURIComponent('https://courses.hopeembark.org' + location.pathname)
        + '"><span class="av">?</span><span>Sign in · 登录</span></a>';
    }
    document.body.appendChild(el);
  }).catch(function(){});
})();