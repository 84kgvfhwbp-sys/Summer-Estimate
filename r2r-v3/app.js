(()=>{
  'use strict';
  const $=(s,r=document)=>r.querySelector(s);
  const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const body=document.body;
  const header=$('#siteHeader');
  const hero=$('.hero');
  const menu=$('#mobileMenu');
  const menuToggle=$('#menuToggle');
  const detailDrawer=$('#detailDrawer');
  const estimateModal=$('#estimateModal');
  const modalServiceSelect=$('#modalServiceSelect');

  const seasonContent={
    summer:{
      eyebrow:'R2R Property Care · New Brunswick',
      accent:'Built for every season.',
      lead:'Commercial and residential landscape maintenance, property improvements, snow removal and ice management across New Brunswick.'
    },
    winter:{
      eyebrow:'Snow & Ice Management · New Brunswick',
      accent:'Ready when winter moves in.',
      lead:'Commercial snow removal, sidewalk clearing and ice management built around access, dependable response and the needs of each property.'
    }
  };

  const equipment={
    loader:{image:'winter',kicker:'High-capacity winter operations',name:'Hitachi ZW150 Loader',copy:'Built for commercial snow routes, large lots and dependable storm response.'},
    tractor:{image:'school',kicker:'Versatile year-round support',name:'Kubota M5-111 Tractor',copy:'A flexible platform for property maintenance, site support and winter operations.'},
    plow:{image:'snowwalk',kicker:'Route and site response',name:'F-350 Plow & Spreader',copy:'Plowing and material application for coordinated commercial service routes.'},
    support:{image:'lawn',kicker:'Crew and equipment support',name:'R2R Support Fleet',copy:'Moving crews, tools and compact equipment between properties efficiently.'}
  };

  const imageClasses=['image--lawn','image--school','image--walk','image--winter','image--snowwalk','image--ice'];
  const lock=()=>body.classList.toggle('lock',menu.classList.contains('open')||detailDrawer.classList.contains('open')||estimateModal.classList.contains('open'));
  const imageClass=(el,key)=>{imageClasses.forEach(c=>el.classList.remove(c));el.classList.add(`image--${key}`)};

  const closeMenu=()=>{
    menu.classList.remove('open');
    menu.setAttribute('aria-hidden','true');
    menuToggle.setAttribute('aria-expanded','false');
    lock();
  };
  const openMenu=()=>{
    menu.classList.add('open');
    menu.setAttribute('aria-hidden','false');
    menuToggle.setAttribute('aria-expanded','true');
    lock();
  };
  menuToggle.addEventListener('click',openMenu);
  $('#menuClose').addEventListener('click',closeMenu);
  $$('.mobile-menu a').forEach(a=>a.addEventListener('click',closeMenu));

  window.addEventListener('scroll',()=>header.classList.toggle('scrolled',window.scrollY>30),{passive:true});

  const setFilter=filter=>{
    $$('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter===filter));
    $$('.service-card').forEach(card=>{
      card.hidden=filter!=='all'&&!card.dataset.category.split(' ').includes(filter);
    });
  };
  $$('[data-filter]').forEach(b=>b.addEventListener('click',()=>setFilter(b.dataset.filter)));

  const setSeason=season=>{
    hero.dataset.season=season;
    $('#heroEyebrow').textContent=seasonContent[season].eyebrow;
    $('#heroAccent').textContent=seasonContent[season].accent;
    $('#heroLead').textContent=seasonContent[season].lead;
    $$('[data-season]').forEach(b=>b.classList.toggle('active',b.dataset.season===season));
    setFilter(season==='winter'?'winter':'all');
  };
  $$('[data-season]').forEach(b=>b.addEventListener('click',()=>setSeason(b.dataset.season)));

  const clientJump=client=>{
    closeMenu();
    setFilter(client);
    $('#services').scrollIntoView({behavior:'smooth',block:'start'});
  };
  $$('[data-client-jump]').forEach(b=>b.addEventListener('click',()=>clientJump(b.dataset.clientJump)));

  const populateDrawer=data=>{
    $('#drawerKicker').textContent=data.kicker||'Page preview';
    $('#drawerTitle').textContent=data.title||'';
    $('#drawerCopy').textContent=data.copy||'';
    $('#drawerList').innerHTML=(data.list||'').split('|').filter(Boolean).map(item=>`<li>${item}</li>`).join('');
    imageClass($('#drawerImage'),data.image||'lawn');
    $('#drawerEstimate').dataset.service=data.title||'';
  };
  const openDrawer=data=>{
    populateDrawer(data);
    detailDrawer.classList.add('open');
    detailDrawer.setAttribute('aria-hidden','false');
    lock();
    setTimeout(()=>$('#drawerTitle').focus?.(),50);
  };
  const closeDrawer=()=>{
    detailDrawer.classList.remove('open');
    detailDrawer.setAttribute('aria-hidden','true');
    lock();
  };
  $$('[data-close-drawer]').forEach(b=>b.addEventListener('click',closeDrawer));

  $$('.service-card').forEach(card=>card.addEventListener('click',()=>openDrawer({
    title:card.dataset.service,
    kicker:card.dataset.kicker,
    image:card.dataset.image,
    copy:card.dataset.copy,
    list:card.dataset.list
  })));
  $$('.project-card').forEach(card=>card.addEventListener('click',()=>openDrawer({
    title:card.dataset.project,
    kicker:card.dataset.kicker,
    image:card.dataset.image,
    copy:card.dataset.copy,
    list:card.dataset.list
  })));
  $('[data-open-story]').addEventListener('click',()=>openDrawer({
    title:'The R2R Story',
    kicker:'About R2R',
    image:'lawn',
    copy:'The complete About page would introduce Jessica and Devlen, explain how R2R grew and connect that story to the systems, equipment and standards clients experience today.',
    list:'Locally owned in New Brunswick|Built around year-round property care|Commercial capability with personal accountability|A growing team, fleet and service area'
  }));

  const openEstimate=(service='')=>{
    closeMenu();
    closeDrawer();
    $('#modalEstimateForm').hidden=false;
    $('#modalSuccess').hidden=true;
    $('#modalEstimateForm').reset();
    if(service){
      const lower=service.toLowerCase();
      if(lower.includes('snow')||lower.includes('ice')||lower.includes('winter')) modalServiceSelect.value='Snow & ice management';
      else if(lower.includes('project')||lower.includes('walk')||lower.includes('improvement')) modalServiceSelect.value='Project or installation';
      else modalServiceSelect.value='Landscape & property care';
    }
    estimateModal.classList.add('open');
    estimateModal.setAttribute('aria-hidden','false');
    lock();
  };
  const closeEstimate=()=>{
    estimateModal.classList.remove('open');
    estimateModal.setAttribute('aria-hidden','true');
    lock();
  };
  $$('[data-open-estimate]').forEach(b=>b.addEventListener('click',()=>openEstimate()));
  $$('[data-close-estimate]').forEach(b=>b.addEventListener('click',closeEstimate));
  $('#drawerEstimate').addEventListener('click',e=>openEstimate(e.currentTarget.dataset.service));

  $('#modalEstimateForm').addEventListener('submit',e=>{
    e.preventDefault();
    e.currentTarget.hidden=true;
    $('#modalSuccess').hidden=false;
  });
  $('#inlineEstimateForm').addEventListener('submit',e=>{
    e.preventDefault();
    e.currentTarget.hidden=true;
    $('#inlineSuccess').hidden=false;
  });
  $('[data-reset-inline]').addEventListener('click',()=>{
    $('#inlineEstimateForm').reset();
    $('#inlineEstimateForm').hidden=false;
    $('#inlineSuccess').hidden=true;
  });

  $$('.accordion article>button').forEach(button=>button.addEventListener('click',()=>button.parentElement.classList.toggle('open')));

  const compare=$('#compare');
  const compareRange=$('#compareRange');
  const setCompare=value=>compare.style.setProperty('--position',`${value}%`);
  compareRange.addEventListener('input',e=>setCompare(e.target.value));
  let dragging=false;
  const moveCompare=clientX=>{
    const rect=compare.getBoundingClientRect();
    const value=Math.max(0,Math.min(100,((clientX-rect.left)/rect.width)*100));
    compareRange.value=value;
    setCompare(value);
  };
  compare.addEventListener('pointerdown',e=>{dragging=true;compare.setPointerCapture?.(e.pointerId);moveCompare(e.clientX)});
  compare.addEventListener('pointermove',e=>{if(dragging)moveCompare(e.clientX)});
  compare.addEventListener('pointerup',()=>dragging=false);
  compare.addEventListener('pointercancel',()=>dragging=false);

  const projectTrack=$('#projectTrack');
  $('[data-project-prev]').addEventListener('click',()=>projectTrack.scrollBy({left:-projectTrack.clientWidth*.82,behavior:'smooth'}));
  $('[data-project-next]').addEventListener('click',()=>projectTrack.scrollBy({left:projectTrack.clientWidth*.82,behavior:'smooth'}));

  let reviewIndex=0;
  const reviewCards=$$('.review-card');
  const reviewTrack=$('#reviewTrack');
  const dots=$('#reviewDots');
  reviewCards.forEach((_,index)=>{
    const dot=document.createElement('button');
    dot.type='button';
    dot.setAttribute('aria-label',`Show review ${index+1}`);
    dot.addEventListener('click',()=>showReview(index));
    dots.appendChild(dot);
  });
  const showReview=index=>{
    reviewIndex=(index+reviewCards.length)%reviewCards.length;
    reviewTrack.style.transform=`translateX(-${reviewIndex*100}%)`;
    $$('#reviewDots button').forEach((dot,i)=>dot.classList.toggle('active',i===reviewIndex));
  };
  showReview(0);
  setInterval(()=>{if(!document.hidden)showReview(reviewIndex+1)},6500);

  $$('[data-equipment]').forEach(button=>button.addEventListener('click',()=>{
    const data=equipment[button.dataset.equipment];
    imageClass($('#equipmentImage'),data.image);
    $('#equipmentKicker').textContent=data.kicker;
    $('#equipmentName').textContent=data.name;
    $('#equipmentCopy').textContent=data.copy;
    $$('[data-equipment]').forEach(b=>b.classList.toggle('active',b===button));
  }));

  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    if(estimateModal.classList.contains('open'))closeEstimate();
    else if(detailDrawer.classList.contains('open'))closeDrawer();
    else if(menu.classList.contains('open'))closeMenu();
  });
})();
