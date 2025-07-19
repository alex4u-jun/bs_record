// DOM 요소
const goToInputBtn = document.getElementById('goToInputBtn');
const hitterMenu = document.getElementById('hitterMenu');
const pitcherMenu = document.getElementById('pitcherMenu');
const rankingContent = document.getElementById('rankingContent');
const searchInput = document.getElementById('searchInput');
const recentMvpInfo = document.getElementById('recentMvpInfo');
const mvpRankingTableBody = document.querySelector('#mvpRankingTable tbody');
const teamStatsTableBody = document.querySelector('#teamStatsTable tbody');

const hitterStatsForRanking = ['타율', '홈랭', '출료율', 'OPS', '타점'];
const pitcherStatsForRanking = ['승리', '세이브', '홀드', '삼진', 'ERA', 'WHIP'];

let currentSort = { column: null, asc: true };
let players = []; // 전역에서 불러오는 데이터 저장

// fetch JSON from GitHub Pages 경로로 고정 (실제 퍼블릭 URL로 변경)
function fetchPlayers() {
  return fetch('https://alex4u-jun.github.io/players.json')
    .then(res => {
      if (!res.ok) throw new Error('불러오기 실패');
      return res.json();
    });
}

// MVP
function loadRecentMvp() {
  if (players.length === 0) {
    recentMvpInfo.textContent = '선택된 MVP가 없습니다.';
    return;
  }

  const mvp = players.reduce((acc, curr) => {
    return (curr.mvpCount || 0) > (acc.mvpCount || 0) ? curr : acc;
  }, { mvpCount: 0 });

  recentMvpInfo.innerHTML = `
    <img src="mvp_logo.png" alt="MVP" style="height:40px; margin-right:10px; vertical-align:middle;">
    <span>${mvp.name} (${mvp.team} / ${mvp.type})</span>
  `;
}

// 검색
function filterByName(players, keyword) {
  if (!keyword) return players;
  const lower = keyword.toLowerCase();
  return players.filter(p => p.name.toLowerCase().includes(lower));
}

// 통계 계산 함수들
function calculateAVG(p) {
  const H = (p.stats['1루타']||0)+(p.stats['2루타']||0)+(p.stats['3루타']||0)+(p.stats['홈런']||0);
  const AB = H + (p.stats['삼진']||0)+(p.stats['내야땅볼']||0)+(p.stats['플라이아웃']||0);
  return AB === 0 ? 0 : H / AB;
}
function calculateOBP(p) {
  const H = (p.stats['1루타']||0)+(p.stats['2루타']||0)+(p.stats['3루타']||0)+(p.stats['홈런']||0);
  const BB = p.stats['볼넷']||0;
  const SF = p.stats['희생플라이']||0;
  const AB = H + (p.stats['삼진']||0)+(p.stats['내야땅볼']||0)+(p.stats['플라이아웃']||0);
  const denom = AB + BB + SF;
  return denom === 0 ? 0 : (H + BB) / denom;
}
function calculateSLG(p) {
  const AB = (p.stats['1루타']||0)+(p.stats['2루타']||0)+(p.stats['3루타']||0)+(p.stats['홈런']||0)+(p.stats['삼진']||0)+(p.stats['내야땅볼']||0)+(p.stats['플라이아웃']||0);
  if (AB === 0) return 0;
  const totalBases = (p.stats['1루타']||0) + 2*(p.stats['2루타']||0) + 3*(p.stats['3루타']||0) + 4*(p.stats['홈런']||0);
  return totalBases / AB;
}
function calculateOPS(p) { return calculateOBP(p) + calculateSLG(p); }
function calculateERA(p) {
  const ER = p.stats['자책점']||0;
  const IP = p.stats['이닝']||0;
  return IP === 0 ? 0 : (ER * 9) / IP;
}
function calculateWHIP(p) {
  const BB = p.stats['볼넷']||0;
  const H = p.stats['피안타']||0;
  const IP = p.stats['이닝']||0;
  return IP === 0 ? 0 : (BB + H) / IP;
}

function getStatValue(player, stat) {
  switch (stat) {
    case '타율': return calculateAVG(player);
    case '출루율': return calculateOBP(player);
    case 'OPS': return calculateOPS(player);
    case '홈런': return player.stats['홈런'] || 0;
    case '타점': return player.stats['타점'] || 0;
    case '승리': return player.stats['승리'] || 0;
    case '세이브': return player.stats['세이브'] || 0;
    case '홀드': return player.stats['홀드'] || 0;
    case '삼진': return player.stats['삼진'] || 0;
    case 'ERA': return calculateERA(player);
    case 'WHIP': return calculateWHIP(player);
    default: return 0;
  }
}

function getStatDisplay(p, stat) {
  const val = getStatValue(p, stat);
  if (['타율', '출루율', 'OPS', 'WHIP'].includes(stat)) return val.toFixed(3);
  if (stat === 'ERA') return val.toFixed(2);
  return val;
}

function renderRanking(stat) {
  let filtered = players.filter(p => {
    return hitterStatsForRanking.includes(stat) ? p.type === '타자' : p.type === '투수';
  });

  const keyword = searchInput.value.trim();
  filtered = filterByName(filtered, keyword);

  filtered.sort((a, b) => {
    const valA = getStatValue(a, stat);
    const valB = getStatValue(b, stat);
    return currentSort.asc ? valA - valB : valB - valA;
  });

  rankingContent.innerHTML = '';
  if (filtered.length === 0) {
    rankingContent.innerHTML = '<p class="no-data">선수 기록이 없습니다.</p>';
    return;
  }

  const table = document.createElement('table');
  table.innerHTML = `
    <thead><tr><th>순위</th><th>이름</th><th>${stat}</th></tr></thead>
    <tbody>
      ${filtered.map((p, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${p.name}</td>
          <td>${getStatDisplay(p, stat)}</td>
        </tr>`).join('')}
    </tbody>`;
  rankingContent.appendChild(table);
}

function initMenus() {
  function handler(e, isPitcher) {
    if (e.target.tagName !== 'LI') return;
    [...(isPitcher ? pitcherMenu.children : hitterMenu.children)].forEach(li => li.classList.remove('active'));
    e.target.classList.add('active');
    currentSort.column = e.target.getAttribute('data-stat');
    currentSort.asc = true;
    renderRanking(currentSort.column);
  }

  hitterMenu.addEventListener('click', e => handler(e, false));
  pitcherMenu.addEventListener('click', e => handler(e, true));
}

searchInput.addEventListener('input', () => {
  if (currentSort.column) renderRanking(currentSort.column);
});

document.addEventListener('DOMContentLoaded', () => {
  fetchPlayers().then(data => {
    players = data;
    loadRecentMvp();
    renderRanking('타율'); // 초기값
    initMenus();
  }).catch(err => {
    console.error('데이터 로딩 실패:', err);
    recentMvpInfo.textContent = '선수 데이터를 불러올 수 없습니다.';
  });
});

goToInputBtn.addEventListener('click', () => {
  window.location.href = 'index.html';
});
