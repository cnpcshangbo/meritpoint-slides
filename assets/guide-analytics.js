(function(){
  var metadata={"github-terminal":{"title":"The Terminal, File Paths, VS Code, Git & GitHub, SSH","publishedAt":"2026-07-19","domain":"developer-tools"},"git-for-gamers":{"title":"Git & the Terminal — The Video Game Edition","publishedAt":"2026-07-19","domain":"developer-tools"},"video-game-research":{"title":"Your First Video-Game Research Project","publishedAt":"2026-07-19","domain":"gaming-research"},"publish-research":{"title":"Publish Your Research — a Real Website on GitHub Pages","publishedAt":"2026-07-19","domain":"research-workflow"},"terminal-quest":{"title":"Terminal Quest — Launch Night","publishedAt":"2026-07-19","domain":"developer-tools"},"download-right-data":{"title":"Downloading the Right Data","publishedAt":"2026-07-31","domain":"data-literacy"},"claude-code-manuscript":{"title":"From a Colab Script to a Conference Manuscript with Claude Code","publishedAt":"2026-08-02","domain":"research-workflow"},"health-datasets":{"title":"Healthcare Datasets & 100+ Research Questions","publishedAt":"2026-08-08","domain":"healthcare"},"cybersecurity-datasets":{"title":"Grades 9–12 Cybersecurity Research Topic Pack","publishedAt":"2026-08-30","domain":"cybersecurity"},"biomedical-ai":{"title":"Grades 9–12 Biomedical AI Research Topic Pack","publishedAt":"2026-08-30","domain":"biomedical-ai"},"biomedical-ai-shorts":{"title":"Biomedical AI 60-Second Shorts · English / 中文","publishedAt":"2026-08-30","domain":"biomedical-ai"}};
  var currentPayload={guides:{}};
  var detailId=(location.pathname.match(/^\/guides\/([^/]+)(?:\/|$)/)||[])[1]||'';
  var verify=new URLSearchParams(location.search).has('verify');
  var optedOut=navigator.globalPrivacyControl===true||String(navigator.doNotTrack||window.doNotTrack||'')==='1';
  var style=document.createElement('style');
  style.textContent='.guide-public-meta{display:flex;flex-wrap:wrap;align-items:center;gap:8px 18px;margin:12px 0 18px;padding:10px 14px;border:1px solid #d7e2ec;border-radius:10px;background:#f6f9fc;color:#5e7183;font:600 12.5px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.guide-public-meta strong{color:#0f9db0;font-variant-numeric:tabular-nums}.guide-public-meta time{color:#21303f}.guide-public-meta .scope{font-weight:400;font-size:11px;margin-left:auto}.guide-public-meta.compact{margin:0 8px;padding:5px 9px;border-color:rgba(255,255,255,.2);background:rgba(255,255,255,.08);color:#cfe0ef;white-space:nowrap}.guide-public-meta.compact time{color:#fff}.guide-public-meta.compact .scope{display:none}@media(max-width:720px){.guide-public-meta .scope{width:100%;margin-left:0}.guide-public-meta.compact{display:none}}';
  document.head.appendChild(style);
  var nextStyle=document.createElement('style');
  nextStyle.textContent='.guide-next-step{position:fixed;left:16px;right:16px;bottom:14px;z-index:58;display:grid;grid-template-columns:minmax(150px,.9fr) repeat(3,minmax(118px,1fr));align-items:center;gap:8px;max-width:920px;margin:auto;padding:9px;border:1px solid rgba(17,49,79,.14);border-radius:16px;background:rgba(255,255,255,.96);box-shadow:0 14px 42px rgba(12,45,82,.22);backdrop-filter:blur(14px);font:600 13px/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.guide-next-step .guide-next-label{padding:0 8px;color:#31465b}.guide-next-step a{display:flex;min-height:42px;align-items:center;justify-content:center;padding:0 12px;border:1px solid #bed0df;border-radius:10px;color:#16334e;background:#f7fafc;text-align:center;text-decoration:none}.guide-next-step a:hover,.guide-next-step a:focus-visible{border-color:#0f9db0;background:#edf9fa;outline:none}.guide-next-step a.primary{border-color:#0f9db0;background:#0f9db0;color:#fff}.guide-next-step a.primary:hover,.guide-next-step a.primary:focus-visible{background:#087f91}.guide-next-step-visible{padding-bottom:94px!important}.guide-next-step-visible #termBtn{bottom:92px}@media(max-width:720px){.guide-next-step{left:8px;right:8px;bottom:8px;grid-template-columns:repeat(3,1fr);gap:5px;padding:6px;border-radius:13px}.guide-next-step .guide-next-label{display:none}.guide-next-step a{min-height:46px;padding:0 6px;font-size:11.5px}.guide-next-step-visible{padding-bottom:84px!important}.guide-next-step-visible #termBtn{bottom:84px}}@media print{.guide-next-step{display:none!important}.guide-next-step-visible{padding-bottom:0!important}}';
  document.head.appendChild(nextStyle);

  function finiteCount(value){
    var number=Number(value);
    return Number.isFinite(number)&&number>=0?Math.floor(number):null;
  }
  function language(){return document.body&&document.body.dataset.lang==='zh'||/^zh/i.test(document.documentElement.lang||'')?'zh':'en'}
  function formatDate(value,lang){var bits=String(value||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!bits)return value||'';return new Date(Date.UTC(Number(bits[1]),Number(bits[2])-1,Number(bits[3]))).toLocaleDateString(lang==='zh'?'zh-CN':'en-US',{year:'numeric',month:lang==='zh'?'long':'short',day:'numeric',timeZone:'UTC'})}
  function detailMetric(){return currentPayload.guides&&currentPayload.guides[detailId]||{}}
  function detailHtml(){var meta=metadata[detailId],metric=detailMetric(),lang=language(),views=finiteCount(metric.views),date=formatDate(meta&&meta.publishedAt,lang),since=currentPayload.trackedSince?formatDate(currentPayload.trackedSince,lang):'';if(lang==='zh')return '<span>发布于 <time datetime="'+meta.publishedAt+'">'+date+'</time></span><span>浏览 <strong data-detail-guide-views>'+(views==null?'—':views.toLocaleString())+'</strong> 次</span><span class="scope">近似值 · 机器人过滤、30 分钟去重'+(since?' · 统计自 '+since:'')+'</span>';return '<span>Published <time datetime="'+meta.publishedAt+'">'+date+'</time></span><span><strong data-detail-guide-views>'+(views==null?'—':views.toLocaleString())+'</strong> views</span><span class="scope">Approximate · bot-filtered, 30-minute dedupe'+(since?' · tracked since '+since:'')+'</span>'}
  function paintDetail(){var el=document.getElementById('guidePublicMeta');if(el)el.innerHTML=detailHtml()}
  function installDetail(){
    if(!metadata[detailId]||document.getElementById('guidePublicMeta'))return;
    var el=document.createElement('div');el.id='guidePublicMeta';el.className='guide-public-meta';el.setAttribute('data-guide-id',detailId);el.setAttribute('data-guide-published-at',metadata[detailId].publishedAt);el.innerHTML=detailHtml();
    var crumb=document.querySelector('.crumb');
    if(crumb)crumb.insertAdjacentElement('afterend',el);
    else{var bar=document.getElementById('bar');if(bar){el.classList.add('compact');bar.insertBefore(el,bar.children[2]||null)}else{var main=document.querySelector('main')||document.body;main.insertBefore(el,main.firstChild)}}
    if(document.body&&window.MutationObserver)new MutationObserver(paintDetail).observe(document.body,{attributes:true,attributeFilter:['data-lang']});
  }
  function cleanCampaign(value){return String(value||'').toLowerCase().replace(/[^a-z0-9._-]+/g,'-').replace(/^[^a-z0-9]+|[^a-z0-9]+$/g,'').slice(0,64)}
  var pageParams=new URLSearchParams(location.search);
  var campaignId=cleanCampaign(pageParams.get('mp_campaign')||pageParams.get('utm_campaign'));
  function experimentCode(){return campaignId||cleanCampaign('guide-'+detailId)}
  function nextUrl(base,action){var url=new URL(base,location.href),code=experimentCode();url.searchParams.set('utm_source','meritpoint-guide');url.searchParams.set('utm_medium','owned');url.searchParams.set('utm_campaign',code);url.searchParams.set('utm_content',action);if(action==='next-assessment')url.searchParams.set('channel',code);return url.href}
  function paintNextSteps(){
    var nav=document.getElementById('guideNextStep');if(!nav)return;var lang=language();
    var assessment=nextUrl('https://academic.hopeembark.org/research-assessment','next-assessment');
    var courses=nextUrl('https://academic.hopeembark.org/courses','next-group-course');
    var oneToOne=nextUrl(lang==='zh'?'https://mpa.hopeembark.org/index.php/zh/ai-stem-research-1to1-cn/':'https://mpa.hopeembark.org/index.php/ai-stem-research-1to1/','next-one-to-one');
    nav.setAttribute('aria-label',lang==='zh'?'科研资料下一步':'Next steps after this research guide');
    nav.innerHTML='<span class="guide-next-label">'+(lang==='zh'?'喜欢这个方向？选择下一步':'Like this topic? Choose a next step')+'</span><a class="primary" data-analytics-id="next-assessment" href="'+assessment+'">'+(lang==='zh'?'免费方向评估':'Free fit assessment')+'</a><a data-analytics-id="next-group-course" href="'+courses+'">'+(lang==='zh'?'查看团课':'Group courses')+'</a><a data-analytics-id="next-one-to-one" href="'+oneToOne+'">'+(lang==='zh'?'1 对 1 科研':'1:1 research')+'</a>';
  }
  function installNextSteps(){
    if(!metadata[detailId]||document.getElementById('guideNextStep')||!document.body)return;
    var nav=document.createElement('nav');nav.id='guideNextStep';nav.className='guide-next-step';document.body.appendChild(nav);document.body.classList.add('guide-next-step-visible');paintNextSteps();
    if(window.MutationObserver)new MutationObserver(paintNextSteps).observe(document.body,{attributes:true,attributeFilter:['data-lang']});
  }
  function apply(payload){
    currentPayload=payload&&payload.guides?payload:{guides:payload||{}};
    var guides=currentPayload.guides||{};
    document.querySelectorAll('[data-guide-id]').forEach(function(card){
      var metric=guides[card.getAttribute('data-guide-id')];
      if(!metric)return;
      var count=finiteCount(metric.views);
      if(count==null)return;
      card.querySelectorAll('[data-guide-reads],[data-guide-views]').forEach(function(slot){
        slot.textContent=count.toLocaleString();
        slot.setAttribute('data-value',String(count));
      });
    });
    paintDetail();
  }
  function referrerHost(){try{return document.referrer?new URL(document.referrer).hostname.toLowerCase():'direct'}catch(e){return'direct'}}
  function postFor(guideId,event,target,videoId,milestone){
    if(!metadata[guideId]||verify||optedOut)return;
    fetch('/api/guides/events',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({guideId:guideId,event:event,target:target||'',videoId:videoId||'',milestone:milestone||'',language:language(),referrerHost:referrerHost(),campaignId:campaignId}),keepalive:true,credentials:'same-origin'}).catch(function(){});
  }
  function clean(value){return String(value||'').toLowerCase().replace(/[^a-z0-9:._\/-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,120)}
  function clickTarget(node){
    var explicit=node.closest('[data-analytics-id]');if(explicit)return clean('action:'+explicit.getAttribute('data-analytics-id'));
    var link=node.closest('a[href]');if(link){try{var url=new URL(link.href,location.href);return clean(url.origin===location.origin?'link:'+url.pathname:'outbound:'+url.hostname)}catch(e){return'link:invalid'}}
    var button=node.closest('button,input[type="button"],input[type="submit"]');if(button)return clean('button:'+(button.id||String(button.className||'').split(/\s+/)[0]||button.tagName));
    return'';
  }
  function startTracking(){
    if(verify||optedOut)return;
    if(detailId&&metadata[detailId]&&document.visibilityState==='visible')postFor(detailId,'view','');
    document.addEventListener('click',function(event){
      if(detailId&&metadata[detailId]){var target=clickTarget(event.target);if(target)postFor(detailId,'click',target);return}
      var card=event.target.closest&&event.target.closest('[data-guide-id]');
      if(card&&metadata[card.getAttribute('data-guide-id')]&&event.target.closest('a[href],button'))postFor(card.getAttribute('data-guide-id'),'click','catalog:open-guide');
    },true);
    if(!detailId||!metadata[detailId])return;
    var visibleMs=0,maxDepth=0,readSent=false,last=Date.now();
    function depth(){var root=document.documentElement,h=Math.max(root.scrollHeight,document.body?document.body.scrollHeight:0),seen=scrollY+innerHeight;maxDepth=Math.max(maxDepth,h<=innerHeight?1:seen/h)}
    function tick(){var now=Date.now();if(document.visibilityState==='visible')visibleMs+=Math.min(1500,now-last);last=now;depth();if(!readSent&&((visibleMs>=15000&&maxDepth>=.25)||visibleMs>=45000)){readSent=true;postFor(detailId,'read','')}}
    addEventListener('scroll',depth,{passive:true});document.addEventListener('visibilitychange',function(){last=Date.now()});setInterval(tick,1000);depth();
  }
  var boundPlayers=typeof WeakSet==='function'?new WeakSet():null;
  function bindVideo(binding){
    if(!binding||!metadata[binding.guideId]||!binding.player)return;
    var player=binding.player;if(boundPlayers&&boundPlayers.has(player))return;if(boundPlayers)boundPlayers.add(player);
    var open=false,reached={};
    function active(){try{return !binding.isActive||binding.isActive()}catch(e){return false}}
    function emit(milestone){if(active())postFor(binding.guideId,'video','',binding.videoId,milestone)}
    player.addEventListener('playing',function(){if(!active()||open)return;open=true;reached={};emit('start')});
    player.addEventListener('timeupdate',function(){
      if(!active()||!open)return;var duration=Number(player.duration)||0,current=Number(player.currentTime)||0;if(duration<=0)return;
      [25,50,75].forEach(function(mark){if(!reached[mark]&&current/duration>=mark/100){reached[mark]=true;emit(String(mark))}});
    });
    player.addEventListener('ended',function(){if(!active()||!open)return;emit('complete');open=false;reached={}});
  }
  window.MeritPointGuideAnalytics={apply:apply,bindVideo:bindVideo};installDetail();installNextSteps();startTracking();
  (window.MeritPointGuideVideoPlayers||[]).forEach(bindVideo);
  document.addEventListener('meritpoint:guide-video-player',function(event){bindVideo(event.detail)});
  document.addEventListener('meritpoint:guide-cards-rendered',function(){apply(currentPayload)});
  fetch('/api/guides/metrics',{credentials:'same-origin'}).then(function(response){if(!response.ok)throw new Error('metrics');return response.json()}).then(apply).catch(function(){});
  document.addEventListener('meritpoint:guide-metrics',function(event){apply(event.detail);});
})();