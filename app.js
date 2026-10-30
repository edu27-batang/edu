/* 바탕화면 학우 화면 (V4): 로그인 · 홈 · 물품대여(상태 신고·대여 정지) · 강의실 예약(인원별 시간) · 건의 · 혜택 */
var APP = '바탕화면';
var ORG = store.get('org') || "교육학과 제45대 학생회 '바탕'";
var S = {
  home: null,
  // 물품 대여
  cat: null, tab: '전공서적', q: '', picked: [], mine: [], sel: [], result: null, reports: {},
  // 강의실
  room: null, group: null, month: null, day: null, range: null, roomMine: [], roomTarget: null, photos: [], roomResult: null,
  // 건의
  sgCat: null, sgText: '', anon: true, sgResult: null, sgList: [],
  links: null,
  me: store.get('user') || { studentId: '', name: '', phone: '', email: '', member: false }, // 로그인한 회원
  token: loadToken(),
  resetTok: null, forgotMail: '', who: 'rent'
};

/* ── 로그인 토큰: '로그인 상태 유지'면 localStorage, 아니면 이 탭에서만(sessionStorage) ── */
function loadToken() {
  try { return localStorage.getItem('bth_token') || sessionStorage.getItem('bth_token') || ''; } catch (e) { return ''; }
}
function saveLogin(token, user, keep) {
  S.token = token; S.me = user;
  try {
    localStorage.removeItem('bth_token'); sessionStorage.removeItem('bth_token');
    (keep ? localStorage : sessionStorage).setItem('bth_token', token);
  } catch (e) { }
  store.set('user', user);
}
function clearLogin() {
  S.token = ''; S.me = { studentId: '', name: '', phone: '', email: '', member: false };
  try { localStorage.removeItem('bth_token'); sessionStorage.removeItem('bth_token'); localStorage.removeItem('bth_user'); localStorage.removeItem('bth_me'); } catch (e) { }
  S.home = null; S.mine = []; S.roomMine = []; S.cat = null;
}
/* 서버 호출에 토큰을 붙이고, 로그인이 풀렸으면 로그인 화면으로 */
var rawCall = call;
call = function (name, payload) {
  var p = Object.assign({}, payload || {});
  if (S.token && !p.token && p.anonymous !== true) p.token = S.token;
  return rawCall(name, p).catch(function (e) {
    if (e && e.auth) { clearLogin(); stack = []; go('login'); }
    throw e;
  });
};
var AUTH_VIEWS = { login: 1, signup: 1, forgot: 1, forgotSent: 1, reset: 1, resetDone: 1 };
var stack = [];
var poll = null;

function go(view, push) {
  if (push !== false) stack.push(view);
  closeOverlay(document.getElementById('chk'));
  if (poll) { clearInterval(poll); poll = null; }
  if (!AUTH_VIEWS[view] && !S.token) { stack = ['login']; view = 'login'; }
  if (view === 'rent' && !S.me.member) { stack = ['home']; view = 'home'; }
  var back = navBack; navBack = false;
  if (noGhost) noGhost = false; else ghostOut($('#app'), back);
  $('#app').innerHTML = '<div class="fade' + (back ? ' back' : '') + '">' + VIEWS[view]() + '</div>';
  window.scrollTo(0, 0);
  document.body.classList.toggle('authed', !AUTH_VIEWS[view]);
  syncFab();
  if (AFTER[view]) AFTER[view]();
}
var navBack = false, noGhost = false; // 뒤로 갈 때는 반대 방향으로 미끄러지게
function back() { stack.pop(); navBack = true; go(stack.pop() || 'home'); }
function home() { stack = []; S.picked = []; S.reports = {}; S.sel = []; S.q = ''; S.range = null; S.photos = []; go('home'); }
function to(view) { go(view); }

function topbar(title, right) {
  return '<div class="top"><button class="icon-btn" onclick="back()" aria-label="뒤로">' + I.back + '</button>' +
    '<div class="ttl">' + (title || '') + '</div>' + (right || '<span style="width:44px"></span>') + '</div>';
}
/* '물품대여 화면'처럼 끝의 '화면'을 은은하게 강조 */
function hw(name) { return esc(name) + ' <span class="hl">화면</span>'; }
function hero(title, lead, pose, leadId) {
  return '<div class="hero"><div class="grow"><h1 class="title">' + title + '</h1>' +
    '<p class="lead"' + (leadId ? ' id="' + leadId + '"' : '') + '>' + lead + '</p></div>' + taang(pose, 104) + '</div>';
}
function doneMark(pose) { return taang(pose || 'success', 168); }
function oops(msg, pose) { return '<div class="oops">' + taang(pose || 'sorry', 110) + '<div>' + esc(msg) + '</div></div>'; }
function bottom(html) { return '<div class="bottom"><div class="in">' + html + '</div></div>'; }
/* 대여·예약 화면의 '누가' 카드: 회원 정보 그대로 */
function meCard() {
  return '<div class="card mecard"><div class="kv"><span>이름</span><b>' + esc(S.me.name) + ' · ' + esc(S.me.studentId) + '</b></div>' +
    '<div class="kv"><span>전화번호</span><b>' + esc(S.me.phone) + '</b></div><div class="kv"><span>이메일</span><b>' + esc(S.me.email) + '</b></div>' +
    '<button class="linkish" onclick="go(\'profile\')">연락처가 바뀌었나요? 내 정보에서 고쳐요</button></div>';
}
/* 숫자만 입력 */
function digitsOnly(el, max) { var v = el.value.replace(/\D/g, '').slice(0, max); if (v !== el.value) el.value = v; }
function personFields(prefix, full) {
  var m = S.me;
  return '<label class="field"><span>학번</span><input id="' + prefix + '_id" inputmode="numeric" maxlength="10" placeholder="20261234" value="' + esc(m.studentId) + '"></label>' +
    '<label class="field"><span>이름</span><input id="' + prefix + '_name" autocomplete="name" placeholder="김바탕" value="' + esc(m.name) + '"></label>' +
    (full ? '<label class="field"><span>전화번호</span><input id="' + prefix + '_phone" inputmode="tel" autocomplete="tel" placeholder="010-0000-0000" value="' + esc(m.phone) + '"></label>' +
      '<label class="field"><span>이메일 · 안내 메일을 받아요</span><input id="' + prefix + '_email" type="email" inputmode="email" autocomplete="email" placeholder="name@kookmin.ac.kr" value="' + esc(m.email) + '"></label>' : '');
}
function readPerson(prefix, full) {
  var f = { studentId: $('#' + prefix + '_id').value.trim(), name: $('#' + prefix + '_name').value.trim() };
  if (full) { f.phone = $('#' + prefix + '_phone').value.trim(); f.email = $('#' + prefix + '_email').value.trim(); }
  if (!/^\d{8,10}$/.test(f.studentId.replace(/\D/g, ''))) { toast('학번을 확인해 주세요'); $('#' + prefix + '_id').focus(); return null; }
  if (f.name.length < 2) { toast('이름을 확인해 주세요'); $('#' + prefix + '_name').focus(); return null; }
  if (full && !/^01\d{8,9}$/.test(f.phone.replace(/\D/g, ''))) { toast('전화번호를 확인해 주세요'); $('#' + prefix + '_phone').focus(); return null; }
  if (full && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) { toast('이메일을 확인해 주세요'); $('#' + prefix + '_email').focus(); return null; }
  return f;
}
function agreeBox(what) {
  return '<button class="agree' + (S.me.agree ? ' on' : '') + '" id="agree" onclick="this.classList.toggle(\'on\')"><span class="check">' + I.check + '</span><div><b>개인정보 수집·이용 동의 (필수)</b>' +
    '<small>학번·이름·전화번호·이메일을 ' + what + '에만 쓰고, 학기가 끝나면 지워요.</small></div></button>';
}
function agreed() { return $('#agree').classList.contains('on'); }

var VIEWS = {
  /* ───────── 홈 ───────── */
  home: function () {
    var h = S.home;
    var sub = function (k, fallback) { return h ? k : fallback; };
    return '<div class="home-head">' + logoHw(444, 'home-logo') +
      '<div class="home-sub"><p class="lead">교육학과 학우를 위한 페이지</p>' +
      '<button class="me-chip" onclick="go(\'profile\')" aria-label="내 정보">' + esc(S.me.name) + '님 ' + I.chev + '</button></div></div>' +
      '<div class="tiles' + (S.me.member ? '' : ' three') + '">' +
      (S.me.member ? tile('rent', 'book', hw('물품대여'), '전공서적·복지물품을 빌려요') : '') +
      tile('room', 'room', hw('강의실 예약'), esc((h && h.roomName) || '북악관 1005호') + '를 빌려요') +
      tile('suggest', 'letter', hw('건의'), '학생회에 건의해요') +
      tile('links', 'point', hw('혜택'), '대학생 혜택 화면 바로가기') +
      '</div>' +
      '<div id="myBox"></div>' +
      '<p class="foot" id="homeFoot">' + esc(ORG) + '</p>';
  },

  /* ───────── 물품 대여 ───────── */
  rent: function () {
    return topbar(hw('물품대여')) +
      hero('빌릴까요, 돌려줄까요?', '전공서적과 급할 때 쓰는 생활 물품', 'book', 'rentLead') +
      '<div class="stack">' +
      '<button class="big" onclick="startBorrow()"><span class="ico g">' + I.book + '</span><div class="grow"><b>빌리기</b><span>번호를 보고 골라요</span></div>' + I.chev + '</button>' +
      '<button class="big" onclick="loadMine(this, true)"><span class="ico">' + I.ret + '</span><div class="grow"><b>반납하기</b><span>제자리에 돌려놓은 뒤</span></div>' + I.chev + '</button>' +
      '</div><div id="rentNote"></div><div id="rentMine"></div>';
  },
  pick: function () {
    return topbar('빌리기') +
      '<h1 class="title">무엇을 빌릴까요?</h1>' +
      '<div class="seg" role="tablist" id="seg"></div>' +
      '<label class="search">' + I.search + '<input id="q" type="search" placeholder="이름이나 번호로 찾기" autocomplete="off" value="' + esc(S.q) + '"></label>' +
      '<div class="list" id="items"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div>' +
      bottom('<button class="btn primary" id="pickBtn" disabled onclick="openCheck()">골라 주세요</button>');
  },
  form: function () {
    var rentList = pickedItems().filter(function (it) { return !excluded(it.id); });
    var skipList = pickedItems().filter(function (it) { return excluded(it.id); });
    var row = function (it, chip) {
      return '<div class="row" style="padding:6px 0"><span class="num">' + esc(it.id) + '</span><span class="grow nm">' + esc(it.name) + '</span>' + (chip || '') + '</div>';
    };
    var label = rentList.length ? (skipList.length ? rentList.length + '개 빌리고 신고하기' : '빌리기') : '신고하기';
    return topbar('빌리기') +
      '<h1 class="title">' + (rentList.length ? '이대로 빌릴까요?' : '신고할까요?') + '</h1>' +
      (rentList.length ? '<div class="card" style="margin-bottom:12px">' + rentList.map(function (it) {
        return row(it, '');
      }).join('') + '</div>' : '') +
      (skipList.length ? '<div class="h2">' + (rentList.length ? '빼고 학생회에 알릴 물품' : '학생회에 알릴 물품') + '</div><div class="card" style="margin-bottom:12px">' + skipList.map(function (it) {
        return row(it, '<span class="chip bad">' + (S.reports[it.id].kind === 'missing' ? '자리에 없어요' : '파손') + '</span>');
      }).join('') + '</div>' : '') +
      '<button class="linkish" style="margin:0 4px 14px" onclick="openCheck()">물품 상태 다시 고르기</button>' +
      (rentList.length ? meCard() : '') +
      bottom('<button class="btn primary" id="rentBtn" onclick="submitRent(this)">' + label + '</button>');
  },
  rented: function () {
    var r = S.result, rep = r.reported || [];
    var repCard = rep.length ? '<div class="h2">학생회에 알린 물품</div><div class="card">' + rep.map(function (x) {
      var lab = x.kind === 'missing' ? '자리에 없어요' : '파손';
      return '<div class="row" style="padding:6px 0"><span class="num">' + esc(x.id) + '</span><span class="grow nm">' + esc(x.name) + '</span><span class="chip bad">' + lab + '</span></div>';
    }).join('') + '</div>' : '';
    if (!r.items.length) {
      return '<div class="done">' + doneMark('thanks') +
        '<h1 class="title" style="margin-top:14px">알려 줘서 고마워요</h1><p class="lead">학생회가 확인하고 정리할게요</p></div>' + repCard +
        bottom('<button class="btn primary" onclick="home()">확인</button>');
    }
    return '<div class="done">' + doneMark('success') +
      '<h1 class="title" style="margin-top:14px">빌렸어요</h1><p class="lead" style="margin:0">반납 기한</p>' +
      '<div class="due">' + esc(r.due) + '</div></div>' +
      '<div class="card" style="margin-top:26px">' + r.items.map(function (it) {
        return '<div class="row" style="padding:6px 0"><span class="num">' + esc(it.id) + '</span><span class="grow nm">' + esc(it.name) + '</span></div>';
      }).join('') + '</div>' + repCard +
      '<p class="foot" style="margin-top:16px">물품에 적힌 번호가 맞는지 확인해 주세요' + (r.location ? '<br>반납은 ' + esc(r.location) + '에' : '') + '</p>' +
      bottom('<button class="btn primary" onclick="home()">확인</button>');
  },
  who: function () {
    var room = S.who === 'room';
    return topbar(room ? '내 예약' : '반납하기') +
      '<h1 class="title">' + (room ? '누구의 예약인가요?' : '누구의 물품인가요?') + '</h1>' +
      '<p class="lead">' + (room ? '예약할 때 쓴 학번과 이름' : '빌릴 때 쓴 학번과 이름') + '</p>' +
      personFields('w', false) +
      bottom('<button class="btn primary" onclick="' + (room ? 'loadRoomMine(this)' : 'loadMine(this)') + '">다음</button>');
  },
  mine: function () {
    var open = S.mine.filter(function (r) { return r.status === '대여중'; });
    var waiting = S.mine.filter(function (r) { return r.status !== '대여중'; });
    var html = topbar('반납하기');
    if (!S.mine.length) {
      return html + '<div class="done">' + taang('thinking', 150) + '<h1 class="title" style="margin-top:14px">빌린 물품이 없어요</h1><p class="lead">학번과 이름이 빌릴 때와 같은지 확인해 주세요</p></div>' +
        bottom('<button class="btn soft" onclick="home()">처음으로</button>');
    }
    html += '<h1 class="title">무엇을 돌려놓았나요?</h1>' +
      '<p class="lead">' + esc(S.cat && S.cat.location ? S.cat.location + '에 두고 골라 주세요' : '제자리에 두고 골라 주세요') + '</p>';
    if (open.length) {
      html += '<div class="list">' + open.map(function (r) {
        var on = S.sel.indexOf(r.rid) >= 0;
        var chip = r.overdue ? '<span class="chip bad">' + r.daysLate + '일 지남</span>' : '<span class="chip mute">' + esc(r.due) + '까지</span>';
        return '<button class="item' + (on ? ' on' : '') + '" onclick="toggleSel(\'' + esc(r.rid) + '\', this)"><span class="num">' + esc(r.itemId) + '</span>' +
          '<div class="grow"><div class="nm">' + esc(r.itemName) + '</div><div class="ds">' + chip + '</div></div><span class="check">' + I.check + '</span></button>';
      }).join('') + '</div>';
    }
    if (waiting.length) {
      html += '<div class="h2">확인 중</div><div class="list">' + waiting.map(function (r) {
        return '<div class="item" disabled><span class="num">' + esc(r.itemId) + '</span><div class="grow"><div class="nm">' + esc(r.itemName) + '</div></div><span class="chip warn">확인 중</span></div>';
      }).join('') + '</div>';
    }
    html += open.length
      ? bottom('<button class="btn primary" id="retBtn" ' + (S.sel.length ? '' : 'disabled') + ' onclick="submitReturn(this)">' + (S.sel.length ? '제자리에 돌려놓았어요' : '골라 주세요') + '</button>')
      : bottom('<button class="btn soft" onclick="home()">처음으로</button>');
    return html;
  },
  returned: function () {
    return '<div class="done">' + doneMark('thanks') +
      '<h1 class="title" style="margin-top:14px">반납했어요</h1><p class="lead">학생회가 확인하면 메일로 알려 드려요</p></div>' +
      bottom('<button class="btn primary" onclick="home()">확인</button>');
  },

  /* ───────── 강의실 예약 ───────── */
  room: function () {
    return topbar(hw('강의실 예약'), '<button class="pill-btn" onclick="loadRoomMine(this, true)">' + I.list + '내 예약</button>') +
      '<div class="hero"><div class="grow"><h1 class="title" id="roomTitle">' + esc((S.room && S.room.room) || '북악관 1005호') + '</h1>' +
      '<p class="lead" id="roomLead" style="margin-bottom:14px">불러오는 중…</p></div>' + taang('room', 104) + '</div>' +
      '<div class="h2" style="margin-top:4px">몇 명이 쓰나요?</div><div class="seg group" id="groupSeg"></div>' +
      '<p class="hint" id="groupHint" style="margin:8px 4px 18px">팀 활동용 강의실이라 2명부터 예약할 수 있어요</p>' +
      '<div class="row" style="justify-content:space-between"><div class="months" id="months"></div><span class="live" id="live">실시간</span></div>' +
      '<p class="hint" id="openNote" style="margin-top:8px"></p>' +
      '<div class="cal" id="cal"><div class="skel" style="height:260px;border-radius:12px"></div></div>' +
      '<div id="dayBox"></div>' +
      bottom('<button class="btn primary" id="bookBtn" disabled onclick="go(\'roomForm\')">날짜와 시간을 골라 주세요</button>');
  },
  roomForm: function () {
    var r = S.room, g = S.range, two = S.group === 2, min3 = Math.max(3, r.minPeople || 2);
    if (!two && !(parseInt(S.people, 10) >= min3)) S.people = String(min3);
    return topbar('강의실 예약') +
      '<h1 class="title">' + (two ? '이대로 예약할까요?' : '몇 명이 쓰나요?') + '</h1>' +
      '<div class="card" style="margin-bottom:18px"><div class="kv"><span>강의실</span><b>' + esc(r.room) + '</b></div>' +
      '<div class="kv"><span>날짜</span><b>' + esc(dayLabel(S.day)) + '</b></div>' +
      '<div class="kv"><span>시간</span><b>' + hh(g.start) + '~' + hh(g.end) + ' · ' + (g.end - g.start) + '시간</b></div></div>' +
      (two ? '<div class="card" style="margin:-8px 0 18px"><div class="kv"><span>사용 인원</span><b>2명</b></div>' +
        '<button class="linkish" onclick="back()">3명 이상이면 인원을 바꿔 다시 골라요</button></div>' :
      '<div class="field"><span>사용 인원 · ' + min3 + '~' + (r.cap || 30) + '명</span><div class="stepper">' +
      '<button type="button" aria-label="한 명 줄이기" onclick="stepPeople(-1)">−</button>' +
      '<input id="k_people" inputmode="numeric" maxlength="3" value="' + (S.people || '') + '" placeholder="몇 명" aria-label="사용 인원" oninput="S.people=this.value.replace(/\\D/g,\'\')">' +
      '<span class="unit">명</span><button type="button" aria-label="한 명 늘리기" onclick="stepPeople(1)">+</button></div></div>') +
      '<label class="field"><span>사용 목적 (선택)</span><input id="k_purpose" maxlength="60" placeholder="예: 전공 스터디, 발표 연습"></label>' +
      meCard() +
      bottom('<button class="btn primary" id="roomBtn" onclick="submitRoom(this)">' + hh(g.start) + '~' + hh(g.end) + ' 예약하기</button>');
  },
  roomDone: function () {
    var r = S.roomResult;
    return '<div class="done">' + doneMark('success') +
      '<h1 class="title" style="margin-top:14px">예약했어요</h1><p class="lead" style="margin:0">' + esc(r.room) + '</p>' +
      '<div class="due">' + esc(r.dateLabel) + '</div><div class="due" style="font-size:26px;margin-top:0">' + esc(r.time) + '</div>' +
      '<p class="lead" style="margin:6px 0 0">' + r.people + '명이 써요</p></div>' +
      (r.entry ? '<div class="note info" style="margin-top:24px"><b class="mk">i</b><div>' + esc(r.entry) + '</div></div>' : '') +
      '<div class="note"><b class="mk">!</b><div>다 쓴 뒤에는 원래 상태로 정리하고, <b>내 예약 → 퇴실 사진 올리기</b>에서 강의실 사진을 올려 주세요.</div></div>' +
      bottom('<button class="btn primary" onclick="home()">확인</button>');
  },
  roomMine: function () {
    var list = S.roomMine;
    var html = topbar('내 예약');
    if (!list.length) {
      return html + '<div class="done">' + taang('thinking', 150) + '<h1 class="title" style="margin-top:14px">예약이 없어요</h1><p class="lead">최근 2주와 앞으로의 예약이 보여요</p></div>' +
        bottom('<button class="btn primary" onclick="stack=[\'home\'];go(\'room\')">예약하러 가기</button>');
    }
    html += '<h1 class="title">' + esc(S.me.name) + '님의 예약</h1><p class="lead">최근 2주와 앞으로의 예약</p>';
    html += list.map(function (r) {
      var chip = roomChip(r);
      var acts = '';
      if (r.canCheckout) acts += '<button class="btn primary" onclick="openCheckout(\'' + esc(r.rid) + '\')">' + I.cam.replace('<svg', '<svg width="20" height="20"') + ' 퇴실 사진 올리기</button>';
      if (r.canCancel) acts += '<button class="btn line" onclick="cancelRoom(\'' + esc(r.rid) + '\', this)">예약 취소</button>';
      return '<div class="rv"><div class="row"><div class="grow"><div class="when">' + esc(r.dateLabel) + '</div>' +
        '<div class="ds" style="font-size:15px;font-variant-numeric:tabular-nums">' + esc(r.time) + (r.people ? ' · ' + r.people + '명' : '') + (r.purpose ? ' · ' + esc(r.purpose) : '') + '</div></div>' + chip + '</div>' +
        (acts ? '<div class="acts">' + acts + '</div>' : '') + '</div>';
    }).join('');
    return html + bottom('<button class="btn soft" onclick="stack=[\'home\'];go(\'room\')">새로 예약하기</button>');
  },
  checkout: function () {
    var r = S.roomTarget, info = S.room || {};
    var slots = '';
    for (var i = 0; i < 3; i++) {
      slots += S.photos[i]
        ? '<div class="ph"><img src="' + S.photos[i] + '" alt="올릴 사진 ' + (i + 1) + '"><button class="x" aria-label="사진 빼기" onclick="dropPhoto(' + i + ')">' + I.close + '</button></div>'
        : (i === S.photos.length ? '<label class="ph add">' + I.cam + '사진 ' + (i + 1) + (i === 0 ? ' (필수)' : '') +
          '<input type="file" accept="image/*" class="hide" onchange="addPhotos(this)" multiple></label>' : '<div class="ph" style="background:var(--card2);box-shadow:none"></div>');
    }
    var orig = (info.originals || []);
    return topbar('퇴실하기') +
      '<h1 class="title">원래 상태 그대로,<br>강의실 사진을 찍어 주세요</h1>' +
      '<p class="lead">' + esc(r.dateLabel) + ' · ' + esc(r.time) + ' · 1~3장</p>' +
      '<div class="photos">' + slots + '</div>' +
      '<div class="h2" style="margin-top:30px">원본 상태</div>' +
      '<div class="note" style="margin-top:0"><b class="mk">!</b><div>' + esc(info.exit || '') + '</div></div>' +
      (orig.length
        ? '<div class="orig">' + orig.map(function (o) { return '<figure><img src="' + esc(o.url) + '" alt="' + esc(o.name) + '" loading="lazy"><figcaption>' + esc(o.name) + '</figcaption></figure>'; }).join('') + '</div>'
        : '<div class="orig-empty" style="margin-top:12px">원본 사진이 아직 없어요.<br>학생회가 드라이브에 올리면 여기에 보여요.</div>') +
      bottom('<button class="btn primary" id="outBtn" ' + (S.photos.length ? '' : 'disabled') + ' onclick="submitCheckout(this)">' +
        (S.photos.length ? '사진 ' + S.photos.length + '장 올리고 퇴실 완료' : '사진을 1장 이상 올려 주세요') + '</button>');
  },
  checkedOut: function () {
    return '<div class="done">' + doneMark('thanks') +
      '<h1 class="title" style="margin-top:14px">퇴실했어요</h1><p class="lead">깨끗하게 써 줘서 고마워요.<br>학생회가 사진을 확인해요.</p></div>' +
      bottom('<button class="btn primary" onclick="home()">확인</button>');
  },

  /* ───────── 건의함 ───────── */
  suggest: function () {
    var cats = [['해 주세요', '~해 주세요'], ['불편해요', '~이 불편해요'], ['기능 추가', '~기능을 넣어 주세요'], ['버그 신고', '~이 안 돼요'], ['기타', '그 밖의 이야기']];
    var mineN = (store.get('codes') || []).length;
    return topbar(hw('건의'), mineN ? '<button class="pill-btn" onclick="go(\'sgMine\')">' + I.list + '내 건의 ' + mineN + '</button>' : '<button class="pill-btn" onclick="go(\'sgMine\')">' + I.search + '찾기</button>') +
      hero('무엇이든 적어 주세요', '학생회만 읽어요. 언제든 보낼 수 있어요.', 'letter') +
      '<div class="h2" style="margin-top:6px">어떤 건의인가요?</div>' +
      '<div class="cats">' + cats.map(function (c) {
        return '<button class="cat' + (S.sgCat === c[0] ? ' on' : '') + '" onclick="pickCat(\'' + c[0] + '\', this)"><b>' + c[0] + '</b><small>' + c[1] + '</small></button>';
      }).join('') + '</div>' +
      '<div class="h2">내용</div>' +
      '<label class="field" style="margin-bottom:6px"><textarea id="sg_text" maxlength="1000" placeholder="예: 과방 콘센트가 부족해요. 멀티탭을 하나 더 놓아 주세요.">' + esc(S.sgText) + '</textarea>' +
      '<span class="count" id="sg_count">' + S.sgText.length + ' / 1000</span></label>' +
      '<div class="h2">보내는 사람</div>' +
      '<div class="seg"><button id="anonY" class="' + (S.anon ? 'on' : '') + '" onclick="setAnon(true)">익명</button><button id="anonN" class="' + (S.anon ? '' : 'on') + '" onclick="setAnon(false)">실명</button></div>' +
      '<div id="anonBox" style="margin-top:12px"></div>' +
      bottom('<button class="btn primary" id="sgBtn" onclick="submitSuggest(this)">보내기</button>');
  },
  sgDone: function () {
    var r = S.sgResult;
    return '<div class="done">' + doneMark('success') +
      '<h1 class="title" style="margin-top:14px">건의를 보냈어요</h1><p class="lead" style="margin:0">접수번호</p>' +
      '<div class="code">' + esc(r.code) + '</div>' +
      '<p class="lead" style="margin-top:6px">이 번호로 처리 상태와 답변을 볼 수 있어요.<br>이 휴대폰에는 자동으로 기억해 둘게요.</p>' +
      '<button class="btn sm soft" onclick="copyText(\'' + esc(r.code) + '\')">번호 복사</button></div>' +
      bottom('<button class="btn primary" onclick="home()">확인</button>');
  },
  sgMine: function () {
    return topbar('내 건의') +
      hero('처리 상태', '접수번호로 학생회 답변을 확인해요', 'thinking') +
      '<div class="row"><label class="search grow" style="margin-top:0">' + I.search + '<input id="sg_find" maxlength="8" placeholder="접수번호 6자리" autocomplete="off" style="text-transform:uppercase"></label>' +
      '<button class="btn sm primary" style="height:48px" onclick="findCode(this)">찾기</button></div>' +
      '<div id="sgList"><div class="list"><div class="skel"></div></div></div>';
  },

  /* ───────── KMU 혜택 ───────── */
  links: function () {
    return topbar(hw('혜택')) +
      hero('자주 찾는 곳, 한 번에', '국민대 시스템과 대학생 혜택 · 누르면 새 창으로 열려요', 'point') +
      '<div id="linkBox"><div class="list"><div class="skel"></div><div class="skel"></div><div class="skel"></div></div></div>';
  }
};

function tile(view, pose, name, sub) {
  return '<button class="tile" onclick="to(\'' + view + '\')">' + taang(pose, 86, 'tg') + '<div class="tt"><b>' + name + '</b><small>' + sub + '</small></div></button>';
}

var AFTER = {
  home: function () {
    call('home').then(function (h) {
      S.home = h;
      if (h.orgName && h.orgName !== ORG) { ORG = h.orgName; store.set('org', ORG); }
      var f = $('#homeFoot'); if (f) f.textContent = ORG;
    }).catch(function () { });
    loadMyBox();
  },
  rent: function () {
    loadCatalog(true).then(function (c) {
      var l = $('#rentLead'); if (l) l.textContent = (c.location ? c.location + ' · ' : '') + c.days + '일 대여 · 한 사람 ' + c.maxPerPerson + '개까지';
      renderRentNote(c);
    }).catch(function () { });
    if (S.me.studentId && S.me.name) {
      call('mine', { studentId: S.me.studentId, name: S.me.name }).then(function (list) {
        var box = $('#rentMine'); if (!box || !list.length) return;
        S.mine = list;
        var late = list.filter(function (r) { return r.overdue; }).length;
        var first = list.filter(function (r) { return r.status === '대여중'; })[0];
        box.innerHTML = '<div class="h2">' + esc(S.me.name) + '님이 빌린 물품</div>' +
          '<button class="big" style="padding:18px 20px" onclick="openMine()"><div class="grow"><b style="font-size:17px">' + list.length + '개</b>' +
          '<span>' + (late ? '반납 기한이 지났어요' : first ? esc(first.due) + '까지' : '반납 확인 중') + '</span></div>' +
          (late ? '<span class="chip bad">연체</span>' : '') + I.chev + '</button>';
      }).catch(function () { });
    }
  },
  pick: function () {
    var q = $('#q');
    q.addEventListener('input', function () { S.q = q.value; renderItems(); });
    loadCatalog(true).then(function () { renderSeg(); renderItems(); }).catch(function (e) { $('#items').innerHTML = oops(e.message); });
  },
  room: function () {
    loadRoom().catch(function (e) { $('#cal').innerHTML = oops(e.message); });
    poll = setInterval(function () { if (!document.hidden) loadRoom(true).catch(function () { }); }, 30000);
  },
  checkout: function () { },
  suggest: function () {
    var t = $('#sg_text');
    t.addEventListener('input', function () { S.sgText = t.value; $('#sg_count').textContent = t.value.length + ' / 1000'; });
    renderAnon();
  },
  sgMine: function () {
    $('#sg_find').addEventListener('keydown', function (e) { if (e.key === 'Enter') findCode(null); });
    loadCodes(store.get('codes') || []);
  },
  links: function () {
    (S.links ? Promise.resolve(S.links) : call('links')).then(function (g) {
      S.links = g;
      var box = $('#linkBox'); if (!box) return;
      box.innerHTML = g.length ? g.map(function (grp) {
        return '<div class="h2">' + esc(grp.group) + '</div><div class="list">' + grp.items.map(function (l) {
          return '<a class="lk" href="' + esc(l.url) + '" target="_blank" rel="noopener noreferrer"><div class="grow"><div class="nm">' + esc(l.name) + '</div>' +
            (l.desc ? '<div class="ds">' + esc(l.desc) + '</div>' : '') + '</div><span class="ext">' + I.ext + '</span></a>';
        }).join('') + '</div>';
      }).join('') : '<div class="card empty">아직 등록된 링크가 없어요</div>';
    }).catch(function (e) { var b = $('#linkBox'); if (b) b.innerHTML = '<div class="card">' + oops(e.message) + '</div>'; });
  }
};

/* 홈 아래: 이 휴대폰으로 쓴 기록 */
function loadMyBox() {
  if (!(S.me.studentId && S.me.name)) return;
  var who = { studentId: S.me.studentId, name: S.me.name };
  Promise.all([call('mine', who).catch(function () { return []; }), call('roomMine', who).catch(function () { return []; })]).then(function (res) {
    var box = $('#myBox'); if (!box) return;
    var rows = '';
    var rent = res[0], rooms = res[1].filter(function (r) { return r.status === '예약확정'; });
    var bar = function (fn, icon, go, sub, chip, tone) {
      return '<button class="qbar' + (tone ? ' ' + tone : '') + '" onclick="' + fn + '()"><span class="qi">' + icon + '</span>' +
        '<span class="qt"><b>' + go + '</b><small>' + sub + '</small></span>' + (chip || '') + '<span class="qc" aria-hidden="true">›</span></button>';
    };
    if (rent.length && S.me.member) {
      var out = rent.filter(function (r) { return r.status === '대여중'; });
      var late = rent.filter(function (r) { return r.overdue; }).length;
      rows += out.length
        ? bar('openMineFromHome', I.box, '반납하기로 바로 가기',
            late ? '반납 기한이 지난 물품 ' + late + '개' : '빌린 물품 ' + rent.length + '개 · ' + esc(out[0].due) + '까지',
            late ? '<span class="chip bad">연체</span>' : '', late ? 'bad' : '')
        : bar('openMineFromHome', I.box, '대여 현황으로 바로 가기', '반납 확인 중 ' + rent.length + '개', '');
    }
    if (rooms.length) {
      var r0 = rooms[0], need = rooms.filter(function (r) { return r.canCheckout; }).length;
      rows += need
        ? bar('openRoomMineFromHome', I.cam, '퇴실 사진 올리기로 바로 가기', '강의실 사용이 끝나면 사진을 올려 주세요', '<span class="chip warn">퇴실</span>', 'warn')
        : bar('openRoomMineFromHome', I.door, '내 예약으로 바로 가기', esc(r0.dateLabel + ' ' + r0.time) + (rooms.length > 1 ? ' 외 ' + (rooms.length - 1) + '건' : ''), '');
    }
    if (rows) box.innerHTML = '<div class="h2" style="margin-top:30px">' + esc(S.me.name) + '님의 이용</div><div class="quick">' + rows + '</div>';
  });
}
function openMineFromHome() { stack = ['home', 'rent']; S.who = 'rent'; loadMine(null, true); }
function openRoomMineFromHome() { stack = ['home', 'room']; S.who = 'room'; loadRoomMine(null, true); }

/* ── 빌리기 ── */
function loadCatalog(force) {
  if (S.cat && !force) return Promise.resolve(S.cat);
  return call('catalog').then(function (c) { S.cat = c; return c; });
}
function startBorrow() {
  if (S.cat && S.cat.ban) { toast(S.cat.ban.until + '까지 물품 대여가 정지돼 있어요'); return; }
  S.picked = []; S.reports = {}; go('pick');
}
/* 물품대여 화면: 대여 정지 · 이번 학기 연체 횟수 안내 */
function renderRentNote(c) {
  var box = $('#rentNote'); if (!box) return;
  var rule = '이번 학기에 연체 횟수가 ' + c.lateLimit + '회가 되거나 분실·파손이 확인되면 ' + c.banDays + '일 동안 대여가 정지돼요.';
  if (c.ban) {
    box.innerHTML = '<div class="note bad"><b class="mk">!</b><div><b>' + esc(c.ban.until) + '까지 물품 대여가 정지돼 있어요</b><br>사유: ' + esc(c.ban.reason) +
      '<br>빌린 물품 반납은 그대로 할 수 있어요. 궁금한 점은 학생회에 문의해 주세요.</div></div>';
    var b = $('.big', $('#app')); if (b) b.classList.add('off');
  } else if (c.lateCount) {
    box.innerHTML = '<div class="note"><b class="mk">!</b><div>이번 학기 연체 횟수가 <b>' + c.lateCount + '회</b>예요. ' + rule + '</div></div>';
  } else {
    box.innerHTML = '<p class="hint" style="margin-top:14px">' + rule + '</p>';
  }
}
function pickedItems() {
  if (!S.cat) return [];
  return S.picked.map(function (id) { return S.cat.items.filter(function (it) { return it.id === id; })[0]; }).filter(Boolean);
}
function renderSeg() {
  var seg = $('#seg'); if (!seg) return;
  seg.innerHTML = ['전공서적', '복지물품'].map(function (t) {
    var n = S.cat.items.filter(function (it) { return it.type === t && it.available; }).length;
    return '<button role="tab" class="' + (S.tab === t ? 'on' : '') + '" onclick="setTab(\'' + t + '\')">' + t + ' ' + n + '</button>';
  }).join('');
}
function setTab(t) { S.tab = t; renderSeg(); renderItems(); }
function renderItems() {
  var box = $('#items'); if (!box || !S.cat) return;
  var q = S.q.trim().toLowerCase().replace(/\s/g, '');
  var list = S.cat.items.filter(function (it) {
    if (q) return (it.name + it.id + it.desc).toLowerCase().replace(/\s/g, '').indexOf(q) >= 0;
    return it.type === S.tab;
  });
  list.sort(function (a, b) { return (b.available - a.available) || a.id.localeCompare(b.id); });
  if (!list.length) box.innerHTML = oops(q ? '찾는 물품이 없어요' : '아직 등록된 물품이 없어요', q ? 'thinking' : 'sorry');
  else box.innerHTML = list.map(function (it) {
    var on = S.picked.indexOf(it.id) >= 0;
    var fix = it.status === '점검중';
    var sub = it.available ? esc(it.desc) : fix ? '학생회가 상태를 확인하고 있어요' : (it.due ? esc(it.due) + ' 반납 예정' : '대여 중');
    return '<button class="item' + (on ? ' on' : '') + '" ' + (it.available ? '' : 'disabled') + ' onclick="togglePick(\'' + esc(it.id) + '\')">' +
      '<span class="num">' + esc(it.id) + '</span><div class="grow"><div class="nm">' + esc(it.name) + '</div>' +
      (sub ? '<div class="ds">' + sub + '</div>' : '') + '</div>' +
      (it.available ? '<span class="check">' + I.check + '</span>' : '<span class="chip ' + (fix ? 'warn' : 'mute') + '">' + (fix ? '점검 중' : '대여 중') + '</span>') + '</button>';
  }).join('');
  var btn = $('#pickBtn');
  btn.disabled = !S.picked.length;
  btn.textContent = S.picked.length ? S.picked.length + '개 빌리기' : '골라 주세요';
}
function togglePick(id) {
  var i = S.picked.indexOf(id);
  if (i >= 0) { S.picked.splice(i, 1); delete S.reports[id]; }
  else {
    var max = (S.cat && S.cat.maxPerPerson) || 3;
    if (S.picked.length >= max) { toast('한 번에 ' + max + '개까지 빌릴 수 있어요'); return; }
    S.picked.push(id);
  }
  renderItems();
}
function submitRent(btn) {
  busy(btn, true);
  var reports = S.picked.filter(function (id) { return S.reports[id]; }).map(function (id) {
    var r = S.reports[id]; return { itemId: id, kind: r.kind, action: r.action, detail: r.detail || '' };
  });
  call('rent', { itemIds: S.picked, reports: reports })
    .then(function (r) { S.result = r; S.picked = []; S.reports = {}; S.cat = null; S.home = null; stack = []; go('rented'); })
    .catch(function (e) { busy(btn, false); toast(e.message); });
}

/* ── 빌리기 직전: 물품 상태가 좋지 않나요? ── */
/* S.reports[id] = {kind:'missing'|'damaged', action:'skip'|'check'|'rent', detail} · 없으면 괜찮아요 */
function excluded(id) { var r = S.reports[id]; return !!r && r.action !== 'rent'; }
function openCheck() {
  if (!S.picked.length) return;
  var m = $('#chk');
  if (!m) { m = document.createElement('div'); m.className = 'overlay chk'; m.id = 'chk'; document.body.appendChild(m); }
  m.onclick = function (e) { if (e.target === m) closeCheck(); };
  renderCheck();
}
function closeCheck() { closeOverlay($('#chk')); }
function renderCheck() {
  var m = $('#chk'); if (!m) return;
  var y = m.firstChild ? m.firstChild.scrollTop : 0;
  var seg = function (id, val, cur, label, tone) {
    return '<button class="' + (cur === val ? 'on ' + tone : '') + '" onclick="setCheck(\'' + esc(id) + '\',\'' + val + '\')">' + label + '</button>';
  };
  var allOk = !S.picked.some(function (id) { return S.reports[id]; });
  m.innerHTML = '<div class="sheet chk-sheet" role="dialog" aria-modal="true" aria-labelledby="chkT">' +
    '<div class="chk-head">' + taang('surprised', 112) + '<div class="grow"><b id="chkT">물품 상태가 어떤가요?</b>' +
    '<small>가져가기 전에 한번 살펴봐 주세요.</small></div>' +
    '<button class="icon-btn" aria-label="닫기" onclick="closeCheck()">' + I.close + '</button></div>' +
    pickedItems().map(function (it) {
      var r = S.reports[it.id], cur = r ? r.kind : 'ok';
      var html = '<div class="ck"><div class="row"><span class="num">' + esc(it.id) + '</span><span class="grow nm">' + esc(it.name) + '</span></div>' +
        '<div class="ck-seg">' + seg(it.id, 'ok', cur, '좋아요', 'good') + seg(it.id, 'missing', cur, '자리에 없어요', 'bad') + seg(it.id, 'damaged', cur, '파손됐어요', 'bad') + '</div>';
      if (cur === 'missing') html += '<p class="ck-hint">이 물품은 빼고 빌려요. 학생회가 확인할게요.</p>';
      if (cur === 'damaged') {
        html += '<p class="ck-hint">이 물품은 빼고 빌려요. 학생회가 확인할게요.</p>' +
          '<label class="field ck-detail"><span>자세히 어느 부분이 어떻게 파손되어 있는지 알려주세요.</span>' +
          '<textarea id="ckd_' + esc(it.id) + '" maxlength="300" placeholder="예: 표지 모서리가 찢어졌고, 30~40쪽에 낙서가 있어요" oninput="S.reports[\'' + esc(it.id) + '\'].detail=this.value">' + esc(r.detail || '') + '</textarea></label>';
      }
      return html + '</div>';
    }).join('') +
    '<div class="row" style="margin-top:16px"><button class="btn soft" onclick="closeCheck()">닫기</button>' +
    '<button class="btn primary" onclick="checkNext()">' + (allOk ? '빌릴게요' : '다음') + '</button></div></div>';
  m.firstChild.scrollTop = y;
}
function setCheck(id, kind) {
  if (kind === 'ok') delete S.reports[id];
  else if (!S.reports[id] || S.reports[id].kind !== kind) S.reports[id] = { kind: kind, action: kind === 'missing' ? 'skip' : 'check', detail: '' };
  renderCheck();
  if (kind === 'damaged') { var t = $('#ckd_' + id); if (t) t.focus(); }
}
function checkNext() {
  for (var i = 0; i < S.picked.length; i++) {
    var id = S.picked[i], r = S.reports[id];
    if (!r) continue;
    if (r.kind === 'damaged' && String(r.detail || '').trim().length < 4) {
      toast('어느 부분이 어떻게 파손됐는지 알려 주세요'); var t = $('#ckd_' + id); if (t) t.focus(); return;
    }
  }
  closeCheck();
  go('form');
}

/* ── 반납하기 ── */
function loadMine(btn, fromHome) {
  busy(btn, true);
  Promise.all([call('mine', {}), loadCatalog().catch(function () { return null; })])
    .then(function (res) {
      S.mine = res[0]; S.sel = [];
      var open = S.mine.filter(function (r) { return r.status === '대여중'; });
      if (open.length === 1) S.sel = [open[0].rid];
      go('mine');
    })
    .catch(function (e) { busy(btn, false); toast(e.message); });
}
function openMine() {
  S.sel = [];
  var open = S.mine.filter(function (r) { return r.status === '대여중'; });
  if (open.length === 1) S.sel = [open[0].rid];
  go('mine');
}
function toggleSel(rid, el) {
  var i = S.sel.indexOf(rid);
  if (i >= 0) S.sel.splice(i, 1); else S.sel.push(rid);
  el.classList.toggle('on', S.sel.indexOf(rid) >= 0);
  var b = $('#retBtn');
  b.disabled = !S.sel.length;
  b.textContent = S.sel.length ? '제자리에 돌려놓았어요' : '골라 주세요';
}
function submitReturn(btn) {
  busy(btn, true);
  call('requestReturn', { studentId: S.me.studentId, name: S.me.name, rentalIds: S.sel })
    .then(function () { S.sel = []; S.cat = null; S.home = null; stack = []; go('returned'); })
    .catch(function (e) { busy(btn, false); toast(e.message); });
}

/* ── 강의실 예약 ── */
function hh(h) { return (h < 10 ? '0' : '') + h + ':00'; }
var WEEK = ['일', '월', '화', '수', '목', '금', '토'];
function parseYmd(s) { var t = s.split('-').map(Number); return new Date(t[0], t[1] - 1, t[2]); }
function ymd(d) { return d.getFullYear() + '-' + (d.getMonth() < 9 ? '0' : '') + (d.getMonth() + 1) + '-' + (d.getDate() < 10 ? '0' : '') + d.getDate(); }
function dayLabel(s) { var d = parseYmd(s); return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + WEEK[d.getDay()] + ')'; }
function takenMap(date) {
  var m = {};
  (S.room.booked || []).forEach(function (b) { if (b.date === date) for (var h = b.start; h < b.end; h++) m[h] = true; });
  return m;
}
function hourPassed(date, h) {
  var r = S.room;
  if (date !== r.today) return false;
  return h + 1 <= r.nowHour; // 그 시간이 이미 끝났다
}
function freeCount(date) {
  var r = S.room, t = takenMap(date), n = 0, total = r.end - r.start;
  var d = parseYmd(date).getDay();
  if (!r.weekend && (d === 0 || d === 6)) return { free: 0, total: total };
  for (var h = r.start; h < r.end; h++) if (!t[h] && !hourPassed(date, h)) n++;
  return { free: n, total: total };
}
function loadRoom(silent) {
  return call('roomInfo').then(function (r) {
    S.room = r;
    if (!S.month) S.month = r.today.slice(0, 7);
    if (S.day && (S.day < r.today || S.day > r.until)) { S.day = null; S.range = null; }
    if (S.range && S.day) {
      var t = takenMap(S.day), clash = false;
      for (var h = S.range.start; h < S.range.end; h++) if (t[h] || hourPassed(S.day, h)) clash = true;
      if (clash) { S.range = null; toast('고른 시간이 방금 예약됐어요. 다시 골라 주세요'); }
    }
    if (!$('#cal')) return;
    $('#roomTitle').textContent = r.room;
    $('#roomLead').textContent = '1시간 단위 · ' + hh(r.start) + '~' + hh(r.end) + (r.weekend ? '' : ' · 평일만');
    renderGroup();
    renderRoom();
  });
}
/* 인원 고르기: 2명 → 하루 2시간까지, 3명 이상 → 3시간까지 */
function maxHours() { var r = S.room; return S.group === 2 ? r.maxTwo : r.maxPer; }
function renderGroup() {
  var r = S.room, seg = $('#groupSeg'); if (!seg) return;
  var opt = function (g, label, sub) {
    return '<button class="' + (S.group === g ? 'on' : '') + '" onclick="setGroup(' + g + ')"><b>' + label + '</b><small>' + sub + '</small></button>';
  };
  seg.innerHTML = (r.minPeople <= 2 ? opt(2, '2명', '하루 ' + r.maxTwo + '시간까지') : '') + opt(3, '3명 이상', '한 번에 ' + r.maxPer + '시간까지');
  $('#groupHint').textContent = '팀 활동용 강의실이라 ' + r.minPeople + '명부터 예약할 수 있어요';
}
function setGroup(g) {
  S.group = g; S.people = g === 2 ? '2' : '';
  if (S.range && S.range.end - S.range.start > maxHours()) { S.range = null; toast('2명은 ' + maxHours() + '시간까지라 시간을 다시 골라 주세요'); }
  renderGroup(); renderDay();
}
function renderRoom() {
  var r = S.room;
  // 열린 달 목록
  var months = [], d0 = parseYmd(r.today), last = parseYmd(r.until);
  for (var m = new Date(d0.getFullYear(), d0.getMonth(), 1); m <= last; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) months.push(ymd(m).slice(0, 7));
  if (months.indexOf(S.month) < 0) S.month = months[0];
  $('#months').innerHTML = months.map(function (mm) {
    return '<button class="' + (mm === S.month ? 'on' : '') + '" onclick="S.month=\'' + mm + '\';renderRoom()">' + Number(mm.slice(5)) + '월</button>';
  }).join('');
  $('#openNote').textContent = r.openNote;
  // 달력
  var first = parseYmd(S.month + '-01'), y = first.getFullYear(), mo = first.getMonth();
  var cells = '';
  for (var i = 0; i < first.getDay(); i++) cells += '<span></span>';
  var dim = new Date(y, mo + 1, 0).getDate();
  for (var dd = 1; dd <= dim; dd++) {
    var ds = ymd(new Date(y, mo, dd));
    var inWin = ds >= r.today && ds <= r.until;
    var fc = inWin ? freeCount(ds) : { free: 0, total: 1 };
    var cls = 'day' + (ds === r.today ? ' today' : '') + (ds === S.day ? ' on' : '') + (inWin && fc.free === 0 ? ' full' : '');
    cells += '<button class="' + cls + '" ' + (inWin ? '' : 'disabled') + ' onclick="pickDay(\'' + ds + '\')" aria-label="' + dayLabel(ds) + (inWin ? ' 빈 시간 ' + fc.free + '칸' : '') + '">' +
      dd + '<i><em style="width:' + (inWin ? Math.round(fc.free / fc.total * 100) : 0) + '%"></em></i></button>';
  }
  $('#cal').innerHTML = '<div class="wk">' + WEEK.map(function (w) { return '<span>' + w + '</span>'; }).join('') + '</div>' +
    '<div class="days">' + cells + '</div><div class="legend"><span><i></i>빈 시간</span></div>';
  renderDay();
}
function pickDay(ds) {
  if (S.day !== ds) S.range = null;
  S.day = ds; renderRoom();
  setTimeout(function () { var b = $('#dayBox'); if (b) b.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30);
}
function renderDay() {
  var box = $('#dayBox'), btn = $('#bookBtn'); if (!box) return;
  var r = S.room;
  if (!S.day) { box.innerHTML = '<p class="hint" style="text-align:center;margin-top:16px">날짜를 누르면 시간을 고를 수 있어요</p>'; btn.disabled = true; btn.textContent = '날짜와 시간을 골라 주세요'; return; }
  var d = parseYmd(S.day).getDay();
  var closed = !r.weekend && (d === 0 || d === 6);
  var t = takenMap(S.day), g = S.range;
  var html = '<div class="h2" style="margin-top:22px">' + dayLabel(S.day) + '</div>';
  if (closed) html += '<div class="card empty">주말에는 예약할 수 없어요</div>';
  else {
    html += '<div class="slots">';
    for (var h = r.start; h < r.end; h++) {
      var past = hourPassed(S.day, h), taken = t[h];
      var on = g && h >= g.start && h < g.end;
      html += '<button class="slot' + (on ? ' on' : '') + '" ' + (past || taken ? 'disabled' : '') + ' onclick="pickHour(' + h + ')">' +
        '<b>' + hh(h) + '</b><small>' + (taken ? '예약됨' : past ? '지남' : '~' + hh(h + 1)) + '</small></button>';
    }
    html += '</div><p class="hint">시작 시간과 끝 시간을 차례로 누르면 이어서 잡혀요 · ' + (S.group === 2 ? '2명은 하루 ' + r.maxTwo + '시간까지' : S.group ? '한 번에 ' + r.maxPer + '시간까지' : '먼저 위에서 인원을 골라 주세요') + '</p>';
  }
  box.innerHTML = html;
  btn.disabled = !g || !S.group;
  btn.textContent = !S.group ? '몇 명이 쓰는지 골라 주세요' : g ? hh(g.start) + '~' + hh(g.end) + ' · ' + (g.end - g.start) + '시간 예약' : '시간을 골라 주세요';
}
function pickHour(h) {
  if (!S.group) { toast('먼저 몇 명이 쓰는지 골라 주세요'); var gs = $('#groupSeg'); if (gs) gs.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
  var r = S.room, g = S.range, t = takenMap(S.day), mx = maxHours();
  var single = { start: h, end: h + 1 };
  if (!g) S.range = single;
  else if (h >= g.start && h < g.end) S.range = (g.end - g.start === 1) ? null : single;
  else {
    var lo = Math.min(g.start, h), hi = Math.max(g.end, h + 1), freeAll = true;
    for (var k = lo; k < hi; k++) if (t[k] || hourPassed(S.day, k)) freeAll = false;
    if (freeAll && hi - lo <= mx) S.range = { start: lo, end: hi };
    else { S.range = single; if (freeAll) toast(S.group === 2 ? '2명은 하루 ' + mx + '시간까지 예약할 수 있어요' : '한 번에 ' + mx + '시간까지 예약할 수 있어요'); }
  }
  renderDay();
}
function stepPeople(d) {
  var el = $('#k_people'), cap = (S.room && S.room.cap) || 30, min3 = Math.max(3, (S.room && S.room.minPeople) || 2);
  var v = Math.min(cap, Math.max(min3, (parseInt(el.value, 10) || 0) + d));
  el.value = v; S.people = String(v);
}
function submitRoom(btn) {
  var cap = (S.room && S.room.cap) || 30, two = S.group === 2;
  var people = two ? 2 : parseInt($('#k_people').value, 10), min3 = Math.max(3, (S.room && S.room.minPeople) || 2);
  if (!two && !(people >= 1)) { toast('사용 인원을 적어 주세요'); return $('#k_people').focus(); }
  if (!two && people < min3) { toast('2명이면 앞 화면에서 [2명]을 골라 주세요'); return $('#k_people').focus(); }
  if (people > cap) { toast('이 강의실은 ' + cap + '명까지 쓸 수 있어요'); return $('#k_people').focus(); }
  busy(btn, true);
  call('roomBook', { date: S.day, start: S.range.start, end: S.range.end, people: people, purpose: $('#k_purpose').value.trim() })
    .then(function (r) { S.roomResult = r; S.range = null; S.home = null; stack = []; go('roomDone'); })
    .catch(function (e) {
      busy(btn, false); toast(e.message);
      if (/방금 다른 사람이|지난 시간/.test(e.message)) { S.range = null; loadRoom(true).catch(function () { }); }
    });
}
function loadRoomMine(btn, fromHome) {
  busy(btn, true);
  call('roomMine', {}).then(function (list) {
    S.roomMine = list; go('roomMine');
  }).catch(function (e) { busy(btn, false); toast(e.message); });
}
function roomChip(r) {
  if (r.status === '예약확정') {
    if (r.noPhoto) return '<span class="chip bad">사진 필요</span>';
    if (r.started) return '<span class="chip warn">이용 중</span>';
    return '<span class="chip g">예약확정</span>';
  }
  if (r.status === '퇴실확인중') return '<span class="chip warn">확인 중</span>';
  if (r.status === '확인완료') return '<span class="chip ok">퇴실 완료</span>';
  if (r.status === '원상복구 안 됨') return '<span class="chip bad">원상복구 안 됨</span>';
  return '<span class="chip mute">' + esc(r.status) + '</span>';
}
function refreshRoomMine() {
  return call('roomMine', { studentId: S.me.studentId, name: S.me.name }).then(function (l) { S.roomMine = l; });
}
function cancelRoom(rid, btn) {
  ask('예약을 취소할까요?', '취소한 시간은 바로 다른 학우가 예약할 수 있어요.', '취소하기').then(function (yes) {
    if (!yes) return;
    busy(btn, true);
    call('roomCancel', { studentId: S.me.studentId, name: S.me.name, rid: rid })
      .then(function () { toast('예약을 취소했어요'); S.home = null; return refreshRoomMine(); })
      .then(function () { go('roomMine', false); })
      .catch(function (e) { busy(btn, false); toast(e.message); });
  });
}
function openCheckout(rid) {
  S.roomTarget = S.roomMine.filter(function (r) { return r.rid === rid; })[0];
  S.photos = [];
  var next = function () { go('checkout'); };
  (S.room ? Promise.resolve() : call('roomInfo').then(function (r) { S.room = r; })).then(next, next);
}
function addPhotos(input) {
  var files = Array.prototype.slice.call(input.files || []).slice(0, 3 - S.photos.length);
  if (!files.length) return;
  Promise.all(files.map(shrinkPhoto)).then(function (urls) {
    S.photos = S.photos.concat(urls).slice(0, 3);
    if ((input.files || []).length > files.length) toast('사진은 3장까지 올릴 수 있어요');
    go('checkout', false);
  }).catch(function (e) { toast(e.message); });
}
function dropPhoto(i) { S.photos.splice(i, 1); go('checkout', false); }
function submitCheckout(btn) {
  busy(btn, true);
  call('roomCheckout', { studentId: S.me.studentId, name: S.me.name, rid: S.roomTarget.rid, photos: S.photos })
    .then(function () { S.photos = []; S.home = null; stack = []; go('checkedOut'); })
    .catch(function (e) { busy(btn, false); toast(e.message); });
}

/* ── 건의함 ── */
function pickCat(c, el) { S.sgCat = c; $$('.cat').forEach(function (b) { b.classList.toggle('on', b === el); }); }
function setAnon(a) {
  S.anon = a; $('#anonY').classList.toggle('on', a); $('#anonN').classList.toggle('on', !a); renderAnon();
}
function renderAnon() {
  var box = $('#anonBox'); if (!box) return;
  box.innerHTML = S.anon
    ? '<div class="note info" style="margin-top:0"><b class="mk">i</b><div>이름·학번을 전혀 저장하지 않아요. 보낸 뒤 나오는 <b>접수번호</b>로만 처리 상태를 볼 수 있어요.</div></div>'
    : '<div class="note info" style="margin-top:0"><b class="mk">i</b><div><b>' + esc(S.me.name) + '</b> 이름으로 보내요. 처리되면 <b>' + esc(S.me.email) + '</b>(으)로 알려 드려요.</div></div>';
}
function submitSuggest(btn) {
  var text = $('#sg_text').value.trim();
  if (!S.sgCat) return toast('어떤 건의인지 골라 주세요');
  if (text.length < 5) { toast('내용을 5자 이상 적어 주세요'); return $('#sg_text').focus(); }
  var p = { category: S.sgCat, content: text, anonymous: S.anon };
  busy(btn, true);
  call('suggest', p).then(function (r) {
    var codes = store.get('codes') || []; codes.unshift(r.code); store.set('codes', codes.slice(0, 20));
    S.sgResult = r; S.sgText = ''; S.sgCat = null; stack = []; go('sgDone');
  }).catch(function (e) { busy(btn, false); toast(e.message); });
}
function copyText(t) {
  try { navigator.clipboard.writeText(t).then(function () { toast('복사했어요'); }, function () { toast('번호를 길게 눌러 복사해 주세요'); }); }
  catch (e) { toast('번호를 길게 눌러 복사해 주세요'); }
}
var SG_CHIP = { '접수': 'mute', '검토 중': 'warn', '완료': 'ok' };
function loadCodes(codes) {
  var box = $('#sgList');
  if (!codes.length) { box.innerHTML = '<div class="card" style="margin-top:14px">' + oops('이 휴대폰으로 보낸 건의가 없어요. 접수번호가 있다면 위에서 찾아 주세요.', 'default') + '</div>'; return Promise.resolve(); }
  return call('suggestStatus', { codes: codes }).then(function (list) {
    S.sgList = list;
    box.innerHTML = list.length ? list.map(function (s) {
      return '<div class="sg"><div class="row"><span class="chip mute">' + esc(s.category) + '</span><span class="meta grow">' + esc(s.code) + ' · ' + esc(s.at) + '</span>' +
        '<span class="chip ' + (SG_CHIP[s.status] || 'mute') + '">' + esc(s.status) + '</span></div>' +
        '<div class="txt">' + esc(s.content) + '</div>' +
        (s.answer ? '<div class="answer"><b>학생회 답변</b>' + esc(s.answer) + '</div>' : '') + '</div>';
    }).join('') : '<div class="card empty" style="margin-top:14px">찾는 건의가 없어요</div>';
  }).catch(function (e) { box.innerHTML = '<div class="card empty">' + esc(e.message) + '</div>'; });
}
function findCode(btn) {
  var c = $('#sg_find').value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (c.length !== 6) return toast('접수번호 6자리를 적어 주세요');
  busy(btn, true);
  call('suggestStatus', { codes: [c] }).then(function (l) {
    busy(btn, false);
    if (!l.length) return toast('그 번호의 건의가 없어요');
    var codes = store.get('codes') || [];
    if (codes.indexOf(c) < 0) { codes.unshift(c); store.set('codes', codes.slice(0, 20)); }
    loadCodes(store.get('codes') || [c]);
  }).catch(function (e) { busy(btn, false); toast(e.message); });
}

/* ── 사용 설명서 (? 버튼) ── */
var HELP_OF = { login: 'account', signup: 'account', forgot: 'account', forgotSent: 'account', reset: 'account', resetDone: 'account', profile: 'account', home: 'start', rent: 'rent', pick: 'rent', form: 'rent', rented: 'rent', who: 'rent', mine: 'rent', returned: 'rent',
  room: 'room', roomForm: 'room', roomDone: 'room', roomMine: 'room', checkout: 'room', checkedOut: 'room',
  suggest: 'suggest', sgDone: 'suggest', sgMine: 'suggest', links: 'links' };
function helpSections() {
  var h = S.home || {}, n = function (v, d) { return v != null && v !== '' ? v : d; };
  var days = n(h.rentDays, 7), maxP = n(h.maxPerPerson, 3), loc = h.location || '보관 장소';
  var rs = n(h.roomStart, 9), re = n(h.roomEnd, 22), rmax = n(h.roomMaxPer, 3), rday = n(h.roomMaxDay, 3), od = n(h.openDay, 1);
  var room = h.roomName || '북악관 1005호';
  return [
    { key: 'start', title: '바탕화면은 어떤 곳인가요?', html:
      '<p>교육학과 학우를 위한 페이지예요. 과방·강의실에 붙은 QR 하나로 네 가지를 할 수 있어요.</p>' +
      '<ul><li><b>물품대여 화면</b> 전공서적·복지물품 빌리고 돌려주기</li><li><b>강의실 예약 화면</b> ' + esc(room) + ' 시간 단위 예약</li>' +
      '<li><b>건의 화면</b> 학생회에 건의하기(익명 가능)</li><li><b>혜택 화면</b> 학교 시스템·대학생 혜택 바로가기</li></ul>' +
      '<div class="tip">물품대여 화면은 학생회비 납부자에게만 보여요. 납부했는데 안 보이면 학생회에 문의해 주세요.</div>' },
    { key: 'rent', title: '물품대여 화면', html:
      '<p><b>빌리기</b></p><ol><li>[빌리기]에서 물품을 골라요. 한 사람이 동시에 ' + maxP + '개까지예요.</li>' +
      '<li><b>물품 상태가 어떤가요?</b> 창에서 물품을 살펴보고 골라요. <b>자리에 없어요</b>나 <b>파손됐어요</b>(어디가 어떻게 파손됐는지 적기)면 그 물품은 빼고 빌리고, 학생회가 확인해요.</li>' +
      '<li>회원 정보(이름·연락처)가 맞는지 보고 [빌리기].</li>' +
      '<li>물품에 붙은 번호(B-001, W-001)가 화면과 같은지 보고 가져가요.</li></ol>' +
      '<p><b>반납하기</b></p><ol><li>물품을 ' + esc(loc) + '에 돌려놓아요.</li><li>[반납하기] → 돌려놓은 물품을 골라 [제자리에 돌려놓았어요].</li><li>학생회가 확인하면 메일이 와요.</li></ol>' +
      '<p><b>대여 정지</b></p><ul><li>이번 학기 연체 횟수가 <b>3회</b>가 되면 7일 동안 빌릴 수 없어요. 학기가 바뀌거나 정지가 끝나면 0회부터 다시 세요.</li>' +
      '<li>분실하거나, 내가 쓴 뒤 파손·분실 신고가 들어와 학생회가 확인하면 7일 동안 빌릴 수 없어요.</li><li>정지 중에도 반납은 할 수 있어요.</li></ul>' +
      '<div class="tip">대여 기간은 ' + days + '일이에요. 기한 하루 전과 연체 때 메일로 알려 드려요. 연체 중에는 새로 빌릴 수 없어요.</div>' },
    { key: 'room', title: '강의실 예약 화면', html:
      '<ol><li><b>몇 명이 쓰는지</b> 골라요. 팀 활동용이라 <b>2명부터</b> 예약할 수 있어요.<br>2명: 하루 ' + n(h.roomMaxTwo, 2) + '시간까지 · 3명 이상: 한 번에 ' + rmax + '시간(하루 ' + rday + '시간)까지</li>' +
      '<li>날짜를 눌러요. 날짜 아래 막대가 길수록 빈 시간이 많아요.</li><li>시작 시간과 끝 시간을 차례로 눌러요. ' + pad(rs) + ':00~' + pad(re) + ':00 사이예요.</li>' +
      '<li>3명 이상이면 사용 인원(최대 ' + n(h.roomCap, 30) + '명)을 적고 예약하면 바로 확정돼요. 확정 메일이 와요.</li></ol>' +
      '<p><b>다 쓴 뒤에는</b> 원래 상태로 정리하고 [내 예약] → [퇴실 사진 올리기]에서 사진 1~3장을 올려요. 화면 아래 원본 사진과 같게 정리해 주세요.</p>' +
      '<div class="tip">매달 ' + od + '일에 다음 달 예약이 열려요. 취소는 시작 전까지 [내 예약]에서 할 수 있어요. 사진을 올리지 않거나 원상복구가 안 되면 예약이 한동안 중지될 수 있어요.</div>' },
    { key: 'suggest', title: '건의 화면', html:
      '<ol><li>어떤 건의인지 골라요: 해 주세요 · 불편해요 · 기능 추가 · 버그 신고 · 기타</li><li>내용을 적고 익명 또는 실명을 골라 보내요.</li></ol>' +
      '<p><b>익명</b>이면 이름·학번을 전혀 저장하지 않아요. 보낸 뒤 나오는 <b>접수번호 6자리</b>로만 처리 상태와 답변을 볼 수 있어요.</p>' +
      '<p><b>실명</b>이면 내 이름으로 보내고, 처리될 때 가입한 이메일로 알려 드려요.</p>' },
    { key: 'links', title: '혜택 화면', html: '<p>국민대 시스템(강의실 대여, 학식, 셔틀, 도서관 DB 등)과 대학생 할인·AI 도구 혜택을 모아 두었어요. 누르면 새 창으로 열려요.</p>' },
    { key: 'account', title: '로그인·회원가입', html:
      '<ol><li><b>처음이면 회원가입</b>: 학번·이름·비밀번호(숫자 6자리)·이메일·전화번호를 한 번만 적어요.</li>' +
      '<li><b>다음부터는 학번과 비밀번호</b>만 넣으면 돼요.</li><li><b>로그인 상태 유지</b>를 켜 두면 로그아웃할 때까지 다시 묻지 않아요.</li></ol>' +
      '<p><b>비밀번호를 잊었다면</b> 로그인 화면의 [비밀번호를 잊었어요] → 가입한 이메일로 온 버튼을 30분 안에 눌러 새로 정해요.</p>' +
      '<p>연락처는 홈 오른쪽 위 <b>내 이름</b>을 눌러 고쳐요. 다 쓰면 왼쪽 아래 <b>로그아웃</b>.</p>' }
  ];
}
function pad(n) { return (n < 10 ? '0' : '') + n; }

var VIEW_NAME = { home: '홈', rent: '물품대여 화면', pick: '물품 고르기', form: '대여 정보 입력', rented: '대여 완료', who: '학번·이름 확인', mine: '반납 고르기', returned: '반납 완료',
  room: '강의실 예약 화면', roomForm: '예약 정보 입력', roomDone: '예약 완료', roomMine: '내 예약', checkout: '퇴실 사진', checkedOut: '퇴실 완료',
  suggest: '건의 화면', sgDone: '건의 완료', sgMine: '내 건의', links: '혜택 화면',
  login: '로그인', signup: '회원가입', forgot: '비밀번호 찾기', forgotSent: '재설정 메일 보냄', reset: '비밀번호 다시 정하기', resetDone: '비밀번호 변경 완료', profile: '내 정보' };
helpFab(helpSections, function () { return HELP_OF[stack[stack.length - 1]] || 'start'; },
  function () { var v = stack[stack.length - 1]; return (VIEW_NAME[v] || v || '홈') + (v === 'room' && S.day ? ' (' + S.day + ')' : ''); });

/* ───────── 로그인 · 회원가입 · 비밀번호 재설정 · 내 정보 ───────── */
function numField(id, label, max, ph, extra) {
  return '<label class="field"><span>' + label + '</span><input id="' + id + '" inputmode="numeric" pattern="[0-9]*" maxlength="' + max + '" placeholder="' + ph + '" autocomplete="off"' +
    ' oninput="digitsOnly(this,' + max + ')"' + (extra || '') + '></label>';
}
Object.assign(VIEWS, {
  login: function () {
    var last = store.get('lastSid') || '';
    return '<div class="login">' +
      '<div class="login-hero">' + logoHw(260) +
      '<div class="parade" aria-hidden="true">' +
      taang('book', 78, 'p1') + taang('room', 78, 'p2') + taang('hello', 118, 'p3') + taang('letter', 78, 'p4') + taang('point', 78, 'p5') +
      '</div></div>' +
      '<div class="card login-card">' +
      numField('l_id', '학번', 8, '20261234', ' value="' + esc(last) + '" autocomplete="username"') +
      '<label class="field"><span>비밀번호</span><input id="l_pw" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="••••••" autocomplete="current-password" oninput="digitsOnly(this,6)"></label>' +
      '<button class="agree on keep" id="keep" onclick="this.classList.toggle(\'on\')"><span class="check">' + I.check + '</span><div><b>로그인 상태 유지</b></div></button>' +
      '<button class="btn primary" id="loginBtn" style="margin-top:14px" onclick="doLogin(this)">로그인</button>' +
      '<div class="login-links"><button onclick="go(\'forgot\')">비밀번호를 잊었어요</button></div></div>' +
      '<div class="join"><button class="btn soft" onclick="go(\'signup\')">회원가입</button></div>' +
      '<p class="foot">' + esc(ORG) + '</p></div>';
  },
  signup: function () {
    return topbar('회원가입') +
      hero('처음 한 번만<br>적어 주세요', '다음부터는 학번과 비밀번호로 로그인해요', 'guide') +
      numField('s_id', '학번', 8, '20261234') +
      '<label class="field"><span>이름</span><input id="s_name" autocomplete="name" maxlength="20" placeholder="김바탕"></label>' +
      '<label class="field"><span>비밀번호 · 숫자 6자리</span><input id="s_pw" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="••••••" autocomplete="new-password" oninput="digitsOnly(this,6)"></label>' +
      '<label class="field"><span>비밀번호 확인</span><input id="s_pw2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="••••••" autocomplete="new-password" oninput="digitsOnly(this,6)"></label>' +
      '<label class="field"><span>이메일 · 안내 메일과 비밀번호 찾기에 써요</span><input id="s_email" type="email" inputmode="email" autocomplete="email" placeholder="name@kookmin.ac.kr"></label>' +
      '<label class="field"><span>전화번호</span><input id="s_phone" inputmode="tel" autocomplete="tel" placeholder="010-0000-0000"></label>' +
      '<div class="consent"><button class="agree" id="agree" onclick="this.classList.toggle(\'on\')"><span class="check">' + I.check + '</span><div><b>개인정보 수집·이용에 동의해요 (필수)</b>' +
      '<small>자세한 사항은 아래를 참고해 주세요</small></div></button>' +
      '<details class="consent-more"><summary>자세히 보기</summary><table>' +
      '<tr><th>수집 항목</th><td>학번, 이름, 이메일, 전화번호, 비밀번호(암호화해 저장)</td></tr>' +
      '<tr><th>이용 목적</th><td>본인 확인과 로그인, 학생회비 납부 여부 확인, 물품대여·강의실 예약 관리, 반납·예약·건의 안내 메일, 비밀번호 재설정</td></tr>' +
      '<tr><th>보관 기간</th><td>탈퇴를 요청하거나 졸업할 때까지. 대여·예약 기록은 학기가 끝나면 정리해요</td></tr>' +
      '<tr><th>보관 곳</th><td>교육학과 학생회 \'바탕\' 공용 구글 계정의 시트(학생회 임원만 열람)</td></tr>' +
      '</table></details></div>' +
      bottom('<button class="btn primary" id="signupBtn" onclick="doSignup(this)">가입하기</button>');
  },
  forgot: function () {
    return topbar('비밀번호 찾기') +
      hero('비밀번호를<br>잊었나요?', '가입한 이메일로 새로 정하는 링크를 보내 드려요', 'thinking') +
      numField('f_id', '학번', 8, '20261234', ' value="' + esc(store.get('lastSid') || '') + '"') +
      bottom('<button class="btn primary" onclick="doForgot(this)">재설정 메일 받기</button>');
  },
  forgotSent: function () {
    return '<div class="done">' + taang('letter', 168) +
      '<h1 class="title" style="margin-top:14px">메일을 보냈어요</h1>' +
      '<p class="lead" style="margin:0"><b>' + esc(S.forgotMail) + '</b></p>' +
      '<p class="lead" style="margin-top:8px">30분 안에 메일 속 [비밀번호 다시 정하기]를 눌러 주세요.<br>메일이 안 보이면 스팸함도 확인해 주세요.</p></div>' +
      bottom('<button class="btn primary" onclick="stack=[];go(\'login\')">로그인으로</button>');
  },
  reset: function () {
    return '<div class="top"><span></span></div>' +
      hero('새 비밀번호<br>정하기', '숫자 6자리로 정해 주세요', 'guide') +
      '<label class="field"><span>새 비밀번호</span><input id="r_pw" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="••••••" autocomplete="new-password" oninput="digitsOnly(this,6)"></label>' +
      '<label class="field"><span>새 비밀번호 확인</span><input id="r_pw2" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="••••••" autocomplete="new-password" oninput="digitsOnly(this,6)"></label>' +
      bottom('<button class="btn primary" onclick="doReset(this)">바꾸기</button>');
  },
  resetDone: function () {
    return '<div class="done">' + taang('success', 168) +
      '<h1 class="title" style="margin-top:14px">비밀번호를 바꿨어요</h1><p class="lead">새 비밀번호로 로그인해 주세요.<br>다른 기기의 로그인은 모두 풀렸어요.</p></div>' +
      bottom('<button class="btn primary" onclick="stack=[];go(\'login\')">로그인하기</button>');
  },
  profile: function () {
    var m = S.me;
    return topbar('내 정보') +
      hero(esc(m.name) + '님', esc(m.studentId) + ' · ' + (m.member ? '학생회비 납부자' : '학생회비 미납부'), m.member ? 'hello' : 'default') +
      '<label class="field"><span>이메일</span><input id="p_email" type="email" inputmode="email" value="' + esc(m.email) + '"></label>' +
      '<label class="field"><span>전화번호</span><input id="p_phone" inputmode="tel" value="' + esc(m.phone) + '"></label>' +
      '<button class="btn soft" onclick="saveProfile(this)">연락처 저장</button>' +
      '<div class="row" style="margin-top:12px"><button class="btn line" onclick="pwByMail(this)">비밀번호 바꾸기</button><button class="btn line" onclick="logout()">로그아웃</button></div>' +
      '<p class="foot">학번·이름을 바꾸려면 학생회에 문의해 주세요</p>';
  }
});

function doLogin(btn) {
  var sid = $('#l_id').value, pw = $('#l_pw').value, keep = $('#keep').classList.contains('on');
  if (sid.length !== 8) { toast('학번 8자리를 적어 주세요'); return $('#l_id').focus(); }
  if (pw.length !== 6) { toast('비밀번호 6자리를 적어 주세요'); return $('#l_pw').focus(); }
  busy(btn, true);
  rawCall('login', { studentId: sid, password: pw }).then(function (r) {
    store.set('lastSid', sid);
    saveLogin(r.token, r.user, keep);
    leaveThen(function () { stack = []; go('home'); document.body.classList.add('arrive'); setTimeout(function () { document.body.classList.remove('arrive'); }, 900); toast(r.user.name + '님, 반가워요'); });
  }).catch(function (e) { busy(btn, false); $('#l_pw').value = ''; toast(e.message); });
}
/* 지금 화면을 부드럽게 내보낸 뒤 다음 화면으로 */
function leaveThen(next) {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return next();
  var app = $('#app'); app.classList.add('leaving');
  setTimeout(function () { app.classList.remove('leaving'); noGhost = true; next(); }, 320);
}
function doSignup(btn) {
  var f = { studentId: $('#s_id').value, name: $('#s_name').value.trim(), password: $('#s_pw').value,
    email: $('#s_email').value.trim(), phone: $('#s_phone').value.trim() };
  if (f.studentId.length !== 8) { toast('학번 8자리를 적어 주세요'); return $('#s_id').focus(); }
  if (f.name.length < 2) { toast('이름을 적어 주세요'); return $('#s_name').focus(); }
  if (f.password.length !== 6) { toast('비밀번호를 숫자 6자리로 정해 주세요'); return $('#s_pw').focus(); }
  if (f.password !== $('#s_pw2').value) { toast('비밀번호 확인이 달라요'); return $('#s_pw2').focus(); }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) { toast('이메일을 확인해 주세요'); return $('#s_email').focus(); }
  if (!/^01\d{8,9}$/.test(f.phone.replace(/\D/g, ''))) { toast('전화번호를 확인해 주세요'); return $('#s_phone').focus(); }
  if (!$('#agree').classList.contains('on')) return toast('개인정보 수집·이용 동의가 필요해요');
  f.agree = true;
  busy(btn, true);
  rawCall('signup', f).then(function (r) {
    store.set('lastSid', f.studentId);
    saveLogin(r.token, r.user, true);
    leaveThen(function () { stack = []; go('home'); document.body.classList.add('arrive'); setTimeout(function () { document.body.classList.remove('arrive'); }, 900); toast('가입했어요. ' + r.user.name + '님, 반가워요'); });
  }).catch(function (e) { busy(btn, false); toast(e.message); });
}
function doForgot(btn) {
  var sid = $('#f_id').value;
  if (sid.length !== 8) { toast('학번 8자리를 적어 주세요'); return $('#f_id').focus(); }
  busy(btn, true);
  rawCall('forgot', { studentId: sid }).then(function (r) { S.forgotMail = r.email; stack = ['login']; go('forgotSent'); })
    .catch(function (e) { busy(btn, false); toast(e.message); });
}
function doReset(btn) {
  var pw = $('#r_pw').value;
  if (pw.length !== 6) { toast('비밀번호를 숫자 6자리로 정해 주세요'); return $('#r_pw').focus(); }
  if (pw !== $('#r_pw2').value) { toast('비밀번호 확인이 달라요'); return $('#r_pw2').focus(); }
  busy(btn, true);
  rawCall('resetPw', { reset: S.resetTok, password: pw }).then(function (r) {
    store.set('lastSid', r.studentId); clearLogin(); clearHash(); stack = []; go('resetDone');
  }).catch(function (e) { busy(btn, false); toast(e.message); });
}
function saveProfile(btn) {
  var email = $('#p_email').value.trim(), phone = $('#p_phone').value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return toast('이메일을 확인해 주세요');
  if (!/^01\d{8,9}$/.test(phone.replace(/\D/g, ''))) return toast('전화번호를 확인해 주세요');
  busy(btn, true);
  call('updateProfile', { email: email, phone: phone }).then(function (u) {
    busy(btn, false); S.me = u; store.set('user', u); toast('저장했어요');
  }).catch(function (e) { busy(btn, false); toast(e.message); });
}
function pwByMail(btn) {
  busy(btn, true);
  rawCall('forgot', { studentId: S.me.studentId }).then(function (r) { busy(btn, false); toast(r.email + '로 비밀번호 변경 메일을 보냈어요'); })
    .catch(function (e) { busy(btn, false); toast(e.message); });
}
function logout() {
  ask('로그아웃할까요?', '다시 쓰려면 학번과 비밀번호로 로그인해요.', '로그아웃').then(function (y) {
    if (!y) return;
    clearLogin(); leaveThen(function () { stack = []; go('login'); toast('로그아웃했어요'); });
  });
}

/* 재설정 링크(#reset-…)로 들어왔는지 */
function clearHash() { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { try { location.hash = ''; } catch (x) { } } }
function readResetHash(cb) {
  var pick = function (h) { var m = /^#?reset-([A-Za-z0-9]+)$/.exec(h || ''); cb(m ? m[1] : null); };
  if (window.google && google.script && google.script.url) google.script.url.getLocation(function (loc) { pick(loc.hash); });
  else pick(location.hash);
}
window.addEventListener('hashchange', function () { readResetHash(function (t) { if (t) { S.resetTok = t; stack = []; go('reset'); } }); });

/* 왼쪽 아래 로그아웃 버튼 */
(function () {
  var b = document.createElement('button');
  b.className = 'logout-fab'; b.setAttribute('aria-label', '로그아웃');
  b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H10"/><path d="M15 8l4 4-4 4M19 12H9.5"/></svg><span>로그아웃</span>';
  b.onclick = logout;
  document.body.appendChild(b);
})();

/* 시작: 재설정 링크 → 로그인 확인 → 홈 */
function boot() {
  readResetHash(function (t) {
    if (t) { S.resetTok = t; stack = []; return go('reset'); }
    if (!S.token) return go('login');
    $('#app').innerHTML = '<div class="done" style="padding-top:120px">' + taang('loading', 150) + '<p class="lead">불러오는 중…</p></div>';
    rawCall('me', { token: S.token }).then(function (u) {
      S.me = u; store.set('user', u); go('home');
    }).catch(function (e) {
      if (e && e.auth) { clearLogin(); go('login'); }
      else if (S.me && S.me.studentId) { go('home'); toast(e.message); } // 연결이 잠깐 끊긴 경우: 저장된 정보로
      else go('login');
    });
  });
}
boot();

