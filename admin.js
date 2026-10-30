/* 바탕화면 관리자 화면: 물품 · 강의실 · 건의 */
var A = { token: null, data: null, sec: 'items', tab: { items: 'pending', rooms: 'toCheck', sug: 'open' } };
try { A.token = sessionStorage.getItem('bth_admin'); } catch (e) { }
try { var s0 = sessionStorage.getItem('bth_admin_sec'); if (s0) A.sec = s0; } catch (e) { }

function render() {
  if (!A.token) return renderLogin();
  if (!A.data) { $('#app').innerHTML = adminTop() + '<div class="list" style="margin-top:20px"><div class="skel"></div><div class="skel"></div></div>'; return refresh(); }
  var d = A.data;
  var cnt = { items: d.pending.length + d.overdue.length + d.reports.open.length, rooms: d.rooms.toCheck.length + d.rooms.noPhoto.length, sug: d.suggestions.open.filter(function (s) { return s.status === '접수'; }).length };
  var total = cnt.items + cnt.rooms + cnt.sug;
  document.title = (total ? '(' + total + ') ' : '') + '바탕화면 관리자';
  var html = adminTop();
  if (d.defaultPin) html += note('관리자 PIN이 처음 값(0000)이에요. 시트의 [설정]에서 바꿔 주세요.');
  if (!d.adminEmailsSet) html += note('관리자 이메일이 비어 있어 알림 메일을 받을 수 없어요. 시트의 [설정]에 적어 주세요.');
  html += '<div class="seg" style="margin-top:10px">' + secBtn('items', '물품', cnt.items) + secBtn('rooms', '강의실', cnt.rooms) + secBtn('sug', '건의', cnt.sug) + '</div>';
  if (d.mail && d.mail.skipped) html += note('오늘 메일 한도가 모자라 ' + d.mail.skipped + '통을 보내지 못했어요. 한도는 그날 첫 메일을 보낸 때부터 24시간 뒤에 다시 채워져요. 오른쪽 아래 [?] → 메일 한도를 참고해 주세요.');
  else if (d.mail && d.mail.left != null && d.mail.left < 15) html += note('오늘 보낼 수 있는 메일이 ' + d.mail.left + '통 남았어요.');
  html += SECTIONS[A.sec](d);
  html += '<p class="foot">' + (d.mail && d.mail.left != null ? '오늘 남은 메일 ' + d.mail.left + '통 · ' : '') + '관리자 즉시 알림 ' + (d.adminNotify ? '켜짐' : '꺼짐(아침 요약만)') + '</p>';
  $('#app').innerHTML = html;
  // 탭·구역을 바꿀 때만 내용이 부드럽게 들어온다(자동 새로고침 때는 그대로)
  if (A.anim) {
    (A.anim === 'sec' ? ['.stats', '.tabs', '#pane'] : ['#pane']).forEach(function (q, i) {
      var el = $(q); if (el) { el.classList.add('pane-in'); el.style.animationDelay = (i * 0.04) + 's'; }
    });
    A.anim = null;
  }
  var on = $('.tabs .on'); if (on) on.parentNode.scrollLeft = Math.max(0, on.offsetLeft - 24);
  syncFab();
}
function note(t) { return '<div class="note"><b class="mk">!</b><div>' + t + '</div></div>'; }
function secBtn(k, label, n) { return '<button class="' + (A.sec === k ? 'on' : '') + '" onclick="setSec(\'' + k + '\')">' + label + (n ? ' <span class="chip bad" style="height:20px;padding:0 6px;margin-left:2px">' + n + '</span>' : '') + '</button>'; }
function setSec(k) { A.sec = k; A.anim = 'sec'; try { sessionStorage.setItem('bth_admin_sec', k); } catch (e) { } render(); }
function adminTop() {
  return '<div class="top"><div class="brand">' + logoHw(132, 'top-logo') + '<span>관리자</span></div><div class="row" style="gap:4px">' +
    (A.token ? '<button class="icon-btn" aria-label="QR 인쇄" onclick="openQr()">' + I.qr + '</button>' +
      '<button class="icon-btn" aria-label="새로고침" onclick="refresh(true)">' + I.refresh + '</button>' : '') + '</div></div>';
}
function stats(list) {
  return '<div class="stats">' + list.map(function (s) {
    return '<button class="stat' + (s.hot ? ' hot' : '') + (A.tab[A.sec] === s.key ? ' on' : '') + '" onclick="setTab(\'' + s.key + '\')"><small>' + s.label + '</small><b>' + s.n + '</b></button>';
  }).join('') + '</div>';
}
function tabs(list) {
  return '<div class="tabs">' + list.map(function (t) { return '<button class="' + (A.tab[A.sec] === t[0] ? 'on' : '') + '" onclick="setTab(\'' + t[0] + '\')">' + t[1] + '</button>'; }).join('') + '</div>';
}
function setTab(t) { A.tab[A.sec] = t; A.anim = 'tab'; render(); }
function empty(t) { return '<div class="card empty" style="margin-top:10px">' + t + '</div>'; }
function who(r) { return esc(r.name) + ' · ' + esc(r.studentId) + ' · <a href="tel:' + esc(r.phone) + '">' + esc(r.phone) + '</a>'; }

var SECTIONS = {
  /* ───────── 물품 ───────── */
  items: function (d) {
    return stats([{ key: 'pending', label: '반납 확인', n: d.pending.length, hot: d.pending.length > 0 },
      { key: 'reports', label: '물품 신고', n: d.reports.open.length, hot: d.reports.open.length > 0 }, { key: 'overdue', label: '연체', n: d.overdue.length, hot: d.overdue.length > 0 }]) +
      tabs([['pending', '반납 확인'], ['reports', '신고'], ['out', '대여 중'], ['overdue', '연체'], ['rbans', '대여 정지' + (d.rentBans.length ? ' ' + d.rentBans.length : '')], ['items', '물품'], ['recent', '기록']]) +
      '<div id="pane">' + ITEM_PANES[A.tab.items](d) + '</div>';
  },
  /* ───────── 강의실 ───────── */
  rooms: function (d) {
    var R = d.rooms;
    return stats([{ key: 'toCheck', label: '퇴실 확인', n: R.toCheck.length, hot: R.toCheck.length > 0 },
      { key: 'noPhoto', label: '사진 없음', n: R.noPhoto.length, hot: R.noPhoto.length > 0 }, { key: 'upcoming', label: '예정', n: R.upcoming.length }]) +
      tabs([['toCheck', '퇴실 확인'], ['noPhoto', '사진 없음'], ['upcoming', '예정·이용 중'], ['bans', '예약 중지' + (R.bans.length ? ' ' + R.bans.length : '')], ['recent', '기록']]) +
      '<div id="pane">' + ROOM_PANES[A.tab.rooms](R) + '</div>' +
      '<p class="foot">' + esc(d.roomName) + ' · 시간·규칙·안내문·중지 기간(' + R.banDays + '일)은 시트 [설정]에서, 원본 사진은 드라이브 「바탕화면 사진 › 강의실 원본 사진」에서 바꿔요</p>';
  },
  /* ───────── 건의 ───────── */
  sug: function (d) {
    var S2 = d.suggestions;
    var newN = S2.open.filter(function (s) { return s.status === '접수'; }).length;
    return stats([{ key: 'open', label: '새 건의', n: newN, hot: newN > 0 }, { key: 'review', label: '검토 중', n: S2.open.length - newN }, { key: 'done', label: '완료', n: S2.done.length }]) +
      tabs([['open', '처리할 것'], ['done', '완료']]) +
      '<div id="pane">' + SUG_PANE(A.tab.sug === 'done' ? S2.done : S2.open.filter(function (s) { return A.tab.sug !== 'review' || s.status === '검토 중'; })) + '</div>';
  }
};

function head(r, chip) { return '<div class="row"><span class="num">' + esc(r.itemId) + '</span><div class="grow nm">' + esc(r.itemName) + '</div>' + (chip || '') + '</div>'; }
function dueChip(r) { return r.overdue ? '<span class="chip bad">' + r.daysLate + '일 연체</span>' : '<span class="chip mute">' + esc(r.due) + '</span>'; }
var ITEM_PANES = {
  pending: function (d) {
    if (!d.pending.length) return empty('확인할 반납이 없어요');
    return (d.pending.length > 1 ? '<div class="row" style="justify-content:flex-end;margin-top:6px"><button class="btn sm dark" onclick="confirmAll(this)">모두 확인 ' + d.pending.length + '</button></div>' : '') +
      d.pending.map(function (r) {
        var lim = d.lateLimit;
        return '<div class="rc">' + head(r, r.late ? '<span class="chip bad">연체 반납</span>' : '') +
          '<div class="who">' + who(r) + '</div><div class="who">반납 신청 ' + esc(r.returnReq) + '</div>' +
          (r.late ? '<div class="who' + (r.lateNo >= lim ? ' warnline' : '') + '">확인하면 이번 학기 연체 ' + r.lateNo + '회째' +
            (r.lateNo >= lim && !r.bannedUntil ? ' → ' + d.rentBanDays + '일 대여 정지돼요' : '') + '</div>' : '') +
          (r.bannedUntil ? '<div class="who"><span class="chip bad">대여 정지 · ' + esc(r.bannedUntil) + '까지</span></div>' : '') +
          '<div class="acts"><button class="btn line" onclick="act(\'adminReject\',{rentalIds:[\'' + r.rid + '\']},this,\'자리에 없다고 알렸어요\')">자리에 없어요</button>' +
          '<button class="btn primary" onclick="act(\'adminConfirm\',{rentalIds:[\'' + r.rid + '\']},this,\'반납 확인했어요\')">확인</button></div></div>';
      }).join('');
  },
  out: function (d) {
    if (!d.out.length) return empty('대여 중인 물품이 없어요');
    return d.out.slice().sort(function (a, b) { return b.daysLate - a.daysLate; }).map(function (r) {
      return '<div class="rc">' + head(r, dueChip(r)) + '<div class="who">' + who(r) + '</div><div class="who">대여 ' + esc(r.rentedAt) + '</div>' +
        '<div class="acts"><button class="btn line" onclick="lost(\'' + r.rid + '\',this)">분실</button>' +
        '<button class="btn line" onclick="act(\'adminConfirm\',{rentalIds:[\'' + r.rid + '\']},this,\'반납 처리했어요\')">직접 반납 처리</button></div></div>';
    }).join('');
  },
  overdue: function (d) {
    if (!d.overdue.length) return empty('연체가 없어요');
    return d.overdue.map(function (r) {
      return '<div class="rc">' + head(r, dueChip(r)) + '<div class="who">' + who(r) + '</div>' +
        '<div class="acts"><a class="btn line" href="tel:' + esc(r.phone) + '">' + I.phone.replace('<svg', '<svg width="18" height="18"') + ' 전화</a>' +
        '<button class="btn primary" onclick="remind(\'' + r.rid + '\',this)">메일 다시 보내기</button></div></div>';
    }).join('');
  },
  reports: function (d) {
    var open = d.reports.open, done = d.reports.done;
    var html = '<p class="hint" style="margin-top:4px">학우가 빌리기 직전에 알려 온 물품 상태예요. 물품을 직접 보고, 직전 사용자 때문이면 [' + d.rentBanDays + '일 대여 정지]를 눌러요.</p>';
    html += open.length ? open.map(function (x) { return reportCard(x, d, true); }).join('') : empty('처리할 신고가 없어요');
    if (done.length) html += '<div class="h2">처리한 신고</div>' + done.map(function (x) { return reportCard(x, d, false); }).join('');
    return html + '<p class="foot">전체 기록은 시트의 [물품신고]에 있어요. 점검을 마친 물품은 [물품] 탭에서 점검중 → 대여가능으로 돌려요</p>';
  },
  rbans: function (d) {
    if (!d.rentBans.length) return empty('대여가 정지된 학우가 없어요');
    return '<p class="hint" style="margin-top:4px">정지된 동안에는 새로 빌릴 수 없고 반납만 돼요. 기간이 지나면 저절로 풀려요.</p>' +
      d.rentBans.map(function (b) {
        return '<div class="rc"><div class="row"><div class="grow"><div class="nm">' + esc(b.name || '이름 없음') + ' · ' + esc(b.studentId) + '</div>' +
          '<div class="ds">' + esc(b.start) + ' ~ ' + esc(b.until) + ' · ' + esc(b.reason) + '</div></div><span class="chip bad">' + esc(b.kind) + '</span></div>' +
          '<div class="acts"><button class="btn line" onclick="unbanRent(\'' + esc(b.studentId) + '\',this)">정지 풀기</button></div></div>';
      }).join('') + '<p class="foot">연체 ' + d.lateLimit + '회·분실은 자동으로, 파손·분실 신고는 [신고] 탭에서 정지돼요. 기준은 시트 [설정]에서 바꿔요</p>';
  },
  items: function (d) {
    if (!d.items.length) return empty('시트의 [물품]에 물품을 적어 주세요');
    var cls = { '대여가능': 'ok', '대여중': 'mute', '반납확인중': 'warn', '점검중': 'warn', '사용중지': 'bad' };
    return '<div class="list">' + d.items.map(function (it) {
      var canToggle = it.status === '대여가능' || it.status === '사용중지' || it.status === '점검중';
      return '<div class="item"><span class="num">' + esc(it.id) + '</span><div class="grow"><div class="nm">' + esc(it.name) + '</div><div class="ds">' + esc(it.type) + '</div></div>' +
        (canToggle ? '<button class="chip ' + cls[it.status] + '" style="height:32px;padding:0 12px" onclick="toggleItem(\'' + esc(it.id) + '\',\'' + it.status + '\',this)">' + it.status + '</button>'
          : '<span class="chip ' + (cls[it.status] || 'mute') + '">' + esc(it.status) + '</span>') + '</div>';
    }).join('') + '</div><p class="foot">물품 추가·이름 변경은 시트의 [물품]에서 해요. 상태를 누르면 대여가능 ↔ 사용중지, 점검중 → 대여가능</p>';
  },
  recent: function (d) {
    if (!d.recent.length) return empty('아직 기록이 없어요');
    return '<div class="list">' + d.recent.map(function (r) {
      return '<div class="item"><span class="num">' + esc(r.itemId) + '</span><div class="grow"><div class="nm">' + esc(r.itemName) + '</div><div class="ds">' + esc(r.name) + ' · ' + esc(r.returnOk) + '</div></div>' +
        '<span class="chip ' + (r.status === '분실' ? 'bad' : 'ok') + '">' + esc(r.status) + '</span></div>';
    }).join('') + '</div><p class="foot">전체 기록은 시트의 [대여기록]에 있어요</p>';
  }
};

var REPORT_CHIP = { '없어요': ['bad', '자리에 없어요'], '파손': ['warn', '파손'] };
function reportCard(x, d, open) {
  var c = REPORT_CHIP[x.kind] || ['mute', x.kind];
  var html = '<div class="rc"><div class="row"><span class="num">' + esc(x.itemId) + '</span><div class="grow nm">' + esc(x.itemName) + '</div>' +
    '<span class="chip ' + c[0] + '">' + esc(c[1]) + '</span>' + (x.action === '그대로 대여' ? '<span class="chip mute">빌려 감</span>' : '') + '</div>' +
    '<div class="who">신고 ' + esc(x.name) + ' · ' + esc(x.studentId) + ' · ' + esc(x.at) + ' · ' + esc(x.action) + '</div>' +
    (x.detail ? '<div class="quote">' + esc(x.detail) + '</div>' : '') +
    '<div class="prev"><small>직전 사용자</small>' + (x.prevSid
      ? '<b>' + esc(x.prevName) + ' · ' + esc(x.prevSid) + '</b><span>' + (x.prevPhone ? '<a href="tel:' + esc(x.prevPhone) + '">' + esc(x.prevPhone) + '</a> · ' : '') + '반납 ' + esc(x.prevAt || '-') + '</span>' +
        (x.prevBannedUntil ? '<span class="chip bad" style="margin-top:6px">대여 정지 · ' + esc(x.prevBannedUntil) + '까지</span>' : '')
      : '<b>기록 없음</b><span>이 물품을 빌린 기록이 없어요</span>') + '</div>';
  if (open) {
    html += '<div class="acts"><button class="btn line" onclick="decideReport(\'' + esc(x.code) + '\',\'none\',this)">' + (x.prevSid ? '정지 안 함' : '확인했어요') + '</button>' +
      (x.prevSid ? '<button class="btn danger" onclick="decideReport(\'' + esc(x.code) + '\',\'ban\',this,\'' + esc(x.prevName) + '\')">' + d.rentBanDays + '일 대여 정지</button>' : '') + '</div>';
  } else {
    html += '<div class="who">' + esc(x.status) + ' · ' + esc(x.doneAt) + '</div>';
  }
  return html + '</div>';
}

function roomHead(r, chip) {
  return '<div class="row"><div class="grow"><div class="nm" style="font-variant-numeric:tabular-nums">' + esc(r.dateLabel) + ' ' + esc(r.time) + '</div>' +
    '<div class="ds">' + (r.people ? r.people + '명' : '인원 미기재') + (r.purpose ? ' · ' + esc(r.purpose) : '') + '</div></div>' +
    (r.warnCount ? '<span class="chip bad">경고 ' + r.warnCount + '</span>' : '') + (chip || '') + '</div>';
}
/* 경고가 쌓인 학우: 예약 중지 버튼 또는 중지 표시 */
function banLine(r) {
  var days = A.data.rooms.banDays;
  if (r.bannedUntil) return '<div class="banline"><span class="chip bad">예약 중지 · ' + esc(r.bannedUntil) + '까지</span></div>';
  return '<div class="banline"><button class="btn sm danger" onclick="banStudent(\'' + esc(r.studentId) + '\',\'' + esc(r.name) + '\',this)">' + days + '일 예약 중지</button></div>';
}
function photoStrip(r) {
  if (!r.photos || !r.photos.length) return '';
  return '<div class="photos">' + r.photos.map(function (p, i) {
    return '<a class="ph" href="' + esc(p.view) + '" target="_blank" rel="noopener" aria-label="퇴실 사진 ' + (i + 1) + ' 크게 보기">' +
      '<img src="' + esc(p.thumb) + '" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement(\'span\'),{className:\'empty\',textContent:\'사진 ' + (i + 1) + ' 열기\'}))"></a>';
  }).join('') + '</div>';
}
var ROOM_STATUS_CHIP = { '확인완료': 'ok', '원상복구 안 됨': 'bad' };
var ROOM_PANES = {
  toCheck: function (R) {
    if (!R.toCheck.length) return empty('확인할 퇴실이 없어요');
    return R.toCheck.map(function (r) {
      return '<div class="rc">' + roomHead(r) + '<div class="who">' + who(r) + '</div><div class="who">퇴실 ' + esc(r.outAt) + ' · 사진 ' + r.photos.length + '장</div>' +
        photoStrip(r) + reviewActs(r) + (r.warnCount ? banLine(r) : '') + '</div>';
    }).join('');
  },
  noPhoto: function (R) {
    if (!R.noPhoto.length) return empty('사진 없이 끝난 예약이 없어요');
    return '<p class="hint" style="margin-top:4px">시간이 끝났는데 퇴실 사진을 올리지 않은 예약이에요. 강의실을 보고 판단해 주세요.</p>' +
      R.noPhoto.map(function (r) { return '<div class="rc">' + roomHead(r, '<span class="chip bad">사진 없음</span>') + '<div class="who">' + who(r) + '</div>' + reviewActs(r) + banLine(r) + '</div>'; }).join('');
  },
  upcoming: function (R) {
    if (!R.upcoming.length) return empty('예정된 예약이 없어요');
    return R.upcoming.map(function (r) {
      return '<div class="rc">' + roomHead(r, r.started ? '<span class="chip warn">이용 중</span>' : '') + '<div class="who">' + who(r) + '</div>' +
        (r.started ? '' : '<div class="acts"><button class="btn line" onclick="cancelRoom(\'' + r.rid + '\',this)">학생회 사정으로 취소</button></div>') +
        (r.warnCount ? banLine(r) : '') + '</div>';
    }).join('');
  },
  bans: function (R) {
    if (!R.bans.length) return empty('예약이 중지된 학우가 없어요');
    return '<p class="hint" style="margin-top:4px">중지된 동안에는 새 예약을 할 수 없어요. 기간이 지나면 저절로 풀려요.</p>' +
      R.bans.map(function (b) {
        return '<div class="rc"><div class="row"><div class="grow"><div class="nm">' + esc(b.name || '이름 없음') + ' · ' + esc(b.studentId) + '</div>' +
          '<div class="ds">' + esc(b.start) + ' ~ ' + esc(b.until) + (b.reason ? ' · ' + esc(b.reason) : '') + '</div></div>' +
          (b.warnCount ? '<span class="chip bad">경고 ' + b.warnCount + '</span>' : '') + '</div>' +
          '<div class="acts"><button class="btn line" onclick="unbanStudent(\'' + esc(b.studentId) + '\',this)">중지 풀기</button></div></div>';
      }).join('');
  },
  recent: function (R) {
    if (!R.recent.length) return empty('아직 기록이 없어요');
    return R.recent.map(function (r) {
      return '<div class="rc">' + roomHead(r, '<span class="chip ' + (ROOM_STATUS_CHIP[r.status] || 'mute') + '">' + esc(r.status) + '</span>') +
        '<div class="who">' + who(r) + '</div>' + (r.memo ? '<div class="who">메모 ' + esc(r.memo) + '</div>' : '') + photoStrip(r) +
        (r.status === '원상복구 안 됨' ? banLine(r) : '') + '</div>';
    }).join('') + '<p class="foot">전체 기록은 시트의 [예약]에 있어요</p>';
  }
};
function reviewActs(r) {
  return '<div class="acts"><button class="btn line" onclick="reviewRoom(\'' + r.rid + '\',\'warn\',this)">원상복구 안 됨</button>' +
    '<button class="btn primary" onclick="reviewRoom(\'' + r.rid + '\',\'ok\',this)">확인</button></div>';
}

var SUG_CHIP = { '접수': 'bad', '검토 중': 'warn', '완료': 'ok' };
function SUG_PANE(list) {
  if (!list.length) return empty('여기에 해당하는 건의가 없어요');
  return list.map(function (s) {
    var real = !s.anonymous;
    return '<div class="sg" id="sg_' + s.code + '"><div class="row"><span class="chip mute">' + esc(s.category) + '</span>' +
      '<span class="meta grow">' + esc(s.code) + ' · ' + esc(s.at) + ' · ' + (real ? esc(s.name) + (s.email ? ' (메일 받음)' : '') : '익명') + '</span>' +
      '<span class="chip ' + (SUG_CHIP[s.status] || 'mute') + '">' + esc(s.status) + '</span></div>' +
      '<div class="txt">' + esc(s.content) + '</div>' +
      '<div class="seg" style="margin-top:12px" data-status="' + esc(s.status) + '">' + ['접수', '검토 중', '완료'].map(function (st) {
        return '<button class="' + (st === s.status ? 'on' : '') + '" onclick="pickSugStatus(this,\'' + st + '\')">' + st + '</button>';
      }).join('') + '</div>' +
      '<label class="field" style="margin:10px 0 0"><textarea maxlength="1000" style="min-height:84px" placeholder="답변 (선택) · 학우가 접수번호로 볼 수 있어요' + (real && s.email ? ', 메일로도 가요' : '') + '">' + esc(s.answer) + '</textarea></label>' +
      '<div class="acts" style="display:flex;justify-content:flex-end;margin-top:10px"><button class="btn sm primary" onclick="saveSug(\'' + s.code + '\',this)">저장</button></div></div>';
  }).join('');
}
function pickSugStatus(btn, st) {
  var seg = btn.parentNode; seg.dataset.status = st;
  $$('button', seg).forEach(function (b) { b.classList.toggle('on', b === btn); });
}

/* ── 로그인 ── */
function renderLogin() {
  $('#app').innerHTML = '<div class="fade" style="max-width:400px;margin:0 auto;width:100%">' + adminTop() +
    '<div class="done" style="padding-top:20px">' + taang('hello', 168) + '<h1 class="title" style="margin-top:10px">관리자 PIN</h1></div>' +
    '<label class="field"><input id="pin" class="pin" type="password" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="••••"></label>' +
    '<button class="btn primary" id="loginBtn" onclick="login(this)">들어가기</button></div>';
  var p = $('#pin'); p.focus();
  p.addEventListener('keydown', function (e) { if (e.key === 'Enter') login($('#loginBtn')); });
}
function login(btn) {
  var pin = $('#pin').value.trim();
  if (!pin) return toast('PIN을 입력해 주세요');
  busy(btn, true);
  call('adminLogin', { pin: pin }).then(function (r) {
    A.token = r.token; try { sessionStorage.setItem('bth_admin', r.token); } catch (e) { }
    A.data = null; A.anim = 'sec'; render();
  }).catch(function (e) { busy(btn, false); $('#pin').value = ''; toast(e.message); });
}
function onAuthFail(e) {
  if (/로그인/.test(e.message)) { A.token = null; A.data = null; try { sessionStorage.removeItem('bth_admin'); } catch (x) { } render(); }
  toast(e.message);
}

/* ── 데이터 ── */
function refresh(manual) {
  return call('adminData', { token: A.token }).then(function (d) {
    A.data = d; var y = window.scrollY; render(); window.scrollTo(0, y); if (manual) toast('새로 불러왔어요');
  }).catch(onAuthFail);
}
function act(name, extra, btn, msg) {
  busy(btn, true);
  call(name, Object.assign({ token: A.token }, extra)).then(function (res) {
    var b = (res && res.banned) || [];
    toast(msg + (b.length ? ' · ' + b.map(function (x) { return x.name + ' ' + x.until + '까지 대여 정지'; }).join(', ') : ''));
    return refresh();
  })
    .catch(function (e) { busy(btn, false); onAuthFail(e); });
}
function confirmAll(btn) {
  act('adminConfirm', { rentalIds: A.data.pending.map(function (r) { return r.rid; }) }, btn, A.data.pending.length + '건 확인했어요');
}
function lost(rid, btn) {
  ask('분실로 처리할까요?', '물품은 사용중지로 바뀌고, 이 학우는 오늘부터 ' + A.data.rentBanDays + '일 동안 물품 대여가 정지돼요(메일로 알려요).', '분실 처리').then(function (yes) { if (yes) act('adminMarkLost', { rentalIds: [rid] }, btn, '분실 처리했어요'); });
}
function remind(rid, btn) {
  busy(btn, true);
  call('adminRemind', { token: A.token, rentalId: rid }).then(function () { busy(btn, false); btn.textContent = '보냈어요'; btn.disabled = true; toast('메일을 보냈어요'); })
    .catch(function (e) { busy(btn, false); onAuthFail(e); });
}
function decideReport(code, result, btn, name) {
  if (result === 'none') return act('adminReport', { code: code, result: 'none' }, btn, '정지 없이 처리했어요');
  var days = A.data.rentBanDays;
  ask(name + ' 님의 물품 대여를 ' + days + '일 동안 정지할까요?', '물품을 직접 보고 이 학우가 쓴 뒤에 생긴 문제라고 판단될 때 눌러 주세요. 학우에게 사유와 함께 메일이 가요.', days + '일 정지').then(function (yes) {
    if (!yes) return;
    busy(btn, true);
    call('adminReport', { token: A.token, code: code, result: 'ban' }).then(function (r) { toast(r.ban.until + '까지 대여를 정지했어요'); return refresh(); })
      .catch(function (e) { busy(btn, false); onAuthFail(e); });
  });
}
function unbanRent(sid, btn) { act('adminRentUnban', { studentId: sid }, btn, '대여 정지를 풀었어요'); }
function toggleItem(id, status, btn) {
  if (status === '점검중') {
    return ask(id + ' 점검을 마쳤나요?', '대여가능으로 돌리면 학우들이 다시 빌릴 수 있어요. 고칠 수 없으면 [물품] 탭에서 다시 눌러 사용중지로 바꿔요.', '대여가능으로').then(function (yes) {
      if (!yes) return;
      btn.disabled = true;
      call('adminItemStatus', { token: A.token, itemId: id, status: '대여가능' }).then(function () { toast(id + ' · 대여가능'); return refresh(); })
        .catch(function (e) { btn.disabled = false; onAuthFail(e); });
    });
  }
  var next = status === '대여가능' ? '사용중지' : '대여가능';
  btn.disabled = true;
  call('adminItemStatus', { token: A.token, itemId: id, status: next }).then(function () { toast(id + ' · ' + next); return refresh(); })
    .catch(function (e) { btn.disabled = false; onAuthFail(e); });
}
function reviewRoom(rid, result, btn) {
  if (result === 'ok') return act('adminRoomReview', { rid: rid, result: 'ok' }, btn, '퇴실을 확인했어요');
  ask('원상복구 안 됨으로 표시할까요?', '이 학우가 다음에 예약하면 관리자 화면에 경고가 보여요. 예약을 막지는 않아요.', '표시하기').then(function (yes) {
    if (yes) act('adminRoomReview', { rid: rid, result: 'warn' }, btn, '경고로 표시했어요');
  });
}
function cancelRoom(rid, btn) {
  ask('이 예약을 취소할까요?', '학우에게 취소 안내 메일이 가요.', '취소하기').then(function (yes) {
    if (yes) act('adminRoomCancel', { rid: rid }, btn, '예약을 취소하고 메일을 보냈어요');
  });
}
function banStudent(sid, name, btn) {
  var days = A.data.rooms.banDays;
  ask(name + ' 님의 강의실 예약을 ' + days + '일 동안 중지할까요?', '오늘부터 ' + days + '일 동안 새 예약을 할 수 없어요. 그 기간에 잡혀 있던 예약은 함께 취소되고, 학우에게 안내 메일이 가요.', days + '일 중지').then(function (yes) {
    if (!yes) return;
    busy(btn, true);
    call('adminRoomBan', { token: A.token, studentId: sid, name: name }).then(function (r) {
      toast(r.until + '까지 중지했어요' + (r.cancelled ? ' · 예약 ' + r.cancelled + '건 취소' : '')); return refresh();
    }).catch(function (e) { busy(btn, false); onAuthFail(e); });
  });
}
function unbanStudent(sid, btn) {
  act('adminRoomUnban', { studentId: sid }, btn, '중지를 풀었어요');
}
function saveSug(code, btn) {
  var box = $('#sg_' + code);
  var status = $('.seg', box).dataset.status, answer = $('textarea', box).value.trim();
  busy(btn, true);
  call('adminSuggest', { token: A.token, code: code, status: status, answer: answer }).then(function (r) {
    toast(r.mailed ? '저장하고 메일로 알렸어요' : '저장했어요'); return refresh();
  }).catch(function (e) { busy(btn, false); onAuthFail(e); });
}

/* ── QR 인쇄 ── */
function pageBase() { return location.origin + location.pathname.replace(/[^/]*$/, ''); }
function qrUrl() { return (A.data && A.data.appUrl) || (/^https?:/.test(location.protocol) ? pageBase() : ''); }
function openQr() {
  var url = qrUrl();
  $('#modal').innerHTML = '<div class="overlay" onclick="if(event.target===this)closeQr()"><div class="sheet">' +
    '<div class="row" style="justify-content:space-between;margin-bottom:12px"><b style="font-size:18px">과방·강의실에 붙일 QR</b><button class="icon-btn" aria-label="닫기" onclick="closeQr()">' + I.close + '</button></div>' +
    '<div class="poster">' + logoCircle(92) + '<h2>바탕화면</h2><p>교육학과 학우를 위한 한곳</p>' +
    '<div class="qr" id="qrBox"></div>' +
    '<div class="steps"><span>물품 대여</span><span>강의실 예약</span><span>건의함</span><span>KMU 혜택</span></div></div>' +
    (url ? '<p class="url">' + esc(url) + '</p>' : '<p class="url">배포한 뒤에 QR이 만들어져요</p>') +
    '<div class="row" style="margin-top:14px"><button class="btn soft" onclick="copyUrl()">주소 복사</button>' +
    (window.LocalApi ? '' : '<button class="btn primary" onclick="window.print()">인쇄</button>') + '</div>' +
    '</div></div>';
  if (url && window.QRCode) new QRCode($('#qrBox'), { text: url, width: 440, height: 440, colorDark: '#213536', colorLight: '#FFFFFF', correctLevel: QRCode.CorrectLevel.M });
}
function closeQr() { var o = $('#modal .overlay'); if (o) { closeOverlay(o); setTimeout(function () { if (!$('#modal .overlay')) $('#modal').innerHTML = ''; }, 220); } }
function copyUrl() {
  var url = qrUrl(), fallback = function () { toast('주소를 길게 눌러 복사해 주세요'); };
  try { navigator.clipboard.writeText(url).then(function () { toast('주소를 복사했어요'); }, fallback); } catch (e) { fallback(); }
}

/* ── 관리자 사용 설명서 ── */
function adminHelp() {
  var d = A.data || {}, R = d.rooms || {}, days = R.banDays || 7;
  return [
    { key: 'daily', title: '매일 할 일', html: '<ol><li>아침 9시에 <b>오늘 확인할 것</b> 메일이 와요.</li><li>과방·강의실에 들를 때 이 화면의 빨간 숫자부터 처리해요.</li><li>물품은 [반납 확인], 강의실은 [퇴실 확인]·[사진 없음], 건의는 [새 건의] 순서로 보면 돼요.</li></ol>' },
    { key: 'items', title: '물품', html: '<ul><li><b>확인</b>: 물품이 제자리에 있으면 눌러요. 학우에게 반납 완료 메일이 가요.</li><li><b>자리에 없어요</b>: 다시 대여 중으로 돌리고 학우에게 알려요.</li>' +
      '<li><b>직접 반납 처리</b>: 학우가 앱 없이 손으로 건넨 경우.</li><li><b>분실</b>: 끝내 돌아오지 않을 때. 물품은 사용중지가 되고 학우는 바로 대여 정지돼요.</li><li>물품 추가·이름 변경은 시트 [물품]에서 해요.</li></ul>' +
      '<p><b>신고</b> (빌리기 직전 학우가 알려 온 물품 상태)</p><ul><li><b>자리에 없어요·파손</b>: 그 물품은 <b>점검중</b>이 되어 아무도 못 빌려요. 물품을 보고 [물품] 탭에서 대여가능으로 돌려요.</li>' +
      '<li><b>직전 사용자 N일 대여 정지</b>: 직전 사용자가 망가뜨리거나 잃어버린 게 맞을 때만 눌러요. 허위 신고일 수 있으니 꼭 물품을 직접 확인해요.</li>' +
      '</ul>' +
      '<p><b>대여 정지</b></p><ul><li>이번 학기 연체 횟수가 <b>' + (d.lateLimit || 3) + '회</b>가 되면 반납 확인 순간 자동으로 ' + (d.rentBanDays || 7) + '일 정지돼요. 학기(3월 1일·9월 1일)가 바뀌거나 연체로 정지되면 0회부터 다시 세요.</li>' +
      '<li>[대여 정지] 탭에서 정지를 풀 수 있어요. 기준 횟수·기간은 시트 [설정]에서 바꿔요.</li></ul>' },
    { key: 'rooms', title: '강의실', html: '<ul><li><b>퇴실 확인</b>: 학우가 올린 사진을 원본과 비교해 [확인] 또는 [원상복구 안 됨].</li><li><b>사진 없음</b>: 시간이 끝났는데 사진을 안 올린 예약이에요. 강의실을 보고 판단해요.</li>' +
      '<li><b>인원 규칙</b>: 2명부터 예약할 수 있어요. 2명은 하루 2시간까지, 3명 이상은 한 번에 3시간까지예요. 시트 [설정]의 최소 사용 인원·2인 최대 예약(시간)·1회 최대 예약(시간)에서 바꿔요.</li><li><b>경고 N</b>: 원상복구 안 됨 + 사진 없음 횟수예요.</li><li><b>' + days + '일 예약 중지</b>: 오늘부터 ' + days + '일 동안 새 예약을 막고, 그 기간의 예약은 취소하며 학우에게 메일을 보내요. 기간은 시트 [설정]의 <b>예약 중지 기간(일)</b>에서 바꿔요.</li>' +
      '<li><b>예약 중지</b> 탭에서 중지를 풀 수 있어요. 기간이 지나면 저절로 풀려요.</li><li>원본 사진은 드라이브 「바탕화면 사진 › 강의실 원본 사진」에 올려요. 파일 이름 순서대로 보여요.</li></ul>' },
    { key: 'sug', title: '건의', html: '<ul><li>상태(접수 → 검토 중 → 완료)를 고르고 답변을 적은 뒤 [저장].</li><li>학우는 접수번호로 상태와 답변을 봐요.</li><li>실명이고 이메일을 적은 건의는 저장할 때 메일로도 알려요. 익명은 메일이 가지 않아요.</li></ul>' },
    { key: 'mail', title: '메일 한도', html: '<p>Google이 정한 하루 메일 한도는 <b>받는 사람 수</b>로 세요. 학생회 계정(Google Workspace Business Starter)은 <b>하루 1,500명</b>이에요(같은 Workspace 도메인 안은 2,000명). 한도는 첫 메일을 보낸 때부터 24시간 뒤에 다시 채워져요.</p><p>Workspace를 <b>무료 체험</b>으로 쓰는 동안에는 한도가 더 낮을 수 있고, 유료로 바뀐 뒤 올라가요.</p>' +
      '<ul><li>한도가 모자라면 앱이 멈추지 않고 그 메일만 건너뛰어요. 이 화면 위에 몇 통을 못 보냈는지 나와요.</li><li>관리자 이메일을 여러 명 적으면 알림 한 번에 그 수만큼 써요.</li>' +
      '<li>아끼려면 시트 [설정]의 <b>관리자 즉시 알림</b>을 <b>사용 안 함</b>으로 바꿔요. 반납·퇴실·건의 알림이 아침 요약 한 통으로 모여요.</li></ul>' },
    { key: 'sheet', title: '시트에서 바꾸는 것', html: '<ul><li>[설정]: 대여 기간, 최대 수, PIN, 관리자 이메일, 강의실 시간·규칙, 출입·퇴실 안내문, 예약 중지 기간</li><li>[물품] [납부자]: 물품 목록과 납부자 명단</li><li>[혜택]: 혜택 화면의 링크·설명·순서</li><li>[예약] [예약중지] [건의] [대여기록]: 기록이에요. 가능하면 이 화면에서 처리해요.</li></ul>' }
  ];
}
helpFab(adminHelp, function () { return { items: 'items', rooms: 'rooms', sug: 'sug' }[A.sec] || 'daily'; },
  function () { return '관리자 · ' + ({ items: '물품', rooms: '강의실', sug: '건의' }[A.sec] || '') + ' · ' + (A.tab[A.sec] || ''); });

render();
setInterval(function () { if (A.token && A.data && !document.hidden && !$('#modal').innerHTML && !document.activeElement.matches('textarea,input')) refresh(); }, 60000);
