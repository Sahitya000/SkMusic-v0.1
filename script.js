// Replace with your actual YouTube API key
const API_KEY = 'AIzaSyAz3LnhWy_Ciz6I74NvUVfb3J4XSj8Jw_M';
let player;
let currentVideoId = '';
let currentVideoIndex = 0;
let searchResults = [];
let lyrics = [];
let currentLyricIndex = 0;
let isPlaying = false;
let progressInterval;
let touchStartY = 0;
let searchDebounceTimer;

// DOM Elements
const searchModal = document.getElementById('searchModal');
const searchInput = document.getElementById('searchInput');
const searchResultsDiv = document.getElementById('searchResults');
const resultsContainer = document.getElementById('results');
const loader = document.getElementById('loader');

document.addEventListener('DOMContentLoaded', function() {
  loadYouTubeAPI();
  document.addEventListener('touchstart', handleTouchStart, false);
  document.addEventListener('touchend', handleTouchEnd, false);
  searchInput.addEventListener('input', handleSearchInput);
  searchInput.addEventListener('keypress', handleSearchKeyPress);
});

function loadYouTubeAPI() {
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

function onYouTubeIframeAPIReady() {
  player = new YT.Player('youtube-player', {
    height: '0',
    width: '0',
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange
    }
  });
}

function onPlayerReady(event) {
  console.log('YouTube player ready');
}

function onPlayerStateChange(event) {
  const timeDisplay = document.querySelector('.time');
  const progressBar = document.querySelector('.progress');
  const playBtn = document.querySelector('.play-btn');

  switch(event.data) {
    case YT.PlayerState.PLAYING:
      isPlaying = true;
      if (playBtn) playBtn.textContent = '❚❚';
      startProgressTracking();
      startLyricsTracking();
      break;

    case YT.PlayerState.PAUSED:
      isPlaying = false;
      if (playBtn) playBtn.textContent = '▶';
      clearInterval(progressInterval);
      break;

    case YT.PlayerState.ENDED:
      isPlaying = false;
      if (playBtn) playBtn.textContent = '▶';
      clearInterval(progressInterval);
      playNextVideo();
      break;
  }

  if (event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.PAUSED) {
    const duration = player.getDuration();
    if (timeDisplay) {
      timeDisplay.innerHTML = `
        <span>${formatTime(player.getCurrentTime())}</span>
        <span>${formatTime(duration)}</span>
      `;
    }
  }
}

function handleSearchInput(e) {
  clearTimeout(searchDebounceTimer);
  const query = e.target.value.trim();

  if (query.length > 2) {
    searchDebounceTimer = setTimeout(() => {
      searchYouTube(query);
    }, 500);
  } else {
    searchResultsDiv.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">Type at least 3 characters to search</div>';
  }
}

function handleSearchKeyPress(e) {
  if (e.key === 'Enter') {
    const query = searchInput.value.trim();
    if (query) {
      searchYouTube(query);
    }
  }
}

function switchTab(tab) {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });
  event.currentTarget.classList.add('active');

  if (tab === 'search') {
    openSearch();
  }
}

function openSearch() {
  searchModal.style.display = 'block';
  searchInput.focus();
}

function closeSearch() {
  searchModal.style.display = 'none';
  searchInput.value = '';
  searchResultsDiv.innerHTML = '';
}

function searchYouTube(query) {
  showLoader();
  searchResultsDiv.innerHTML = '';
  searchResults = [];

  fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query + ' music')}&type=video&key=${API_KEY}`)
    .then(response => {
      if (!response.ok) throw new Error('Network error');
      return response.json();
    })
    .then(data => {
      hideLoader();
      if (data.items && data.items.length > 0) {
        searchResults = data.items;
        displaySearchResults(data.items);
      } else {
        searchResultsDiv.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">No results found</div>';
      }
    })
    .catch(error => {
      hideLoader();
      console.error('Error fetching data:', error);
      searchResultsDiv.innerHTML = '<div style="color: var(--text-secondary); text-align: center; padding: 20px;">Error loading results. Please try again.</div>';
    });
}

function displaySearchResults(items) {
  searchResultsDiv.innerHTML = '';
  items.forEach((item, index) => {
    const videoId = item.id.videoId;
    const title = item.snippet.title;
    const channel = item.snippet.channelTitle;
    const thumbnail = item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url;

    const resultItem = document.createElement('div');
    resultItem.className = 'search-result-item';
    resultItem.onclick = () => {
      currentVideoIndex = index;
      playVideo(videoId, title, channel, thumbnail);
    };

    resultItem.innerHTML = `
      <img src="${thumbnail}" class="search-result-thumbnail">
      <div class="search-result-info">
        <div class="search-result-title">${title}</div>
        <div class="search-result-channel">${channel}</div>
      </div>
    `;

    searchResultsDiv.appendChild(resultItem);
  });
}

function playVideo(videoId, title, artist, thumbnail) {
  currentVideoId = videoId;
  resultsContainer.innerHTML = '';

  const songDiv = document.createElement('div');
  songDiv.className = 'song';
  songDiv.style.backgroundImage = `url(${thumbnail})`;
  songDiv.innerHTML = `
    <div class="overlay"></div>
    <div class="song-info">
      <h1 class="song-title">${title}</h1>
      <p class="song-artist">${artist}</p>
    </div>
    <div class="lyrics-container">
      <div class="lyrics" id="lyricsDisplay">
        <div class="lyrics-line">Loading lyrics...</div>
      </div>
    </div>
    <div class="player-controls">
      <div class="progress-container">
        <div class="progress-bar" id="progressBarContainer">
          <div class="progress" id="progressBar"></div>
          <div class="progress-handle"></div>
        </div>
        <div class="time" id="timeDisplay">
          <span>0:00</span>
          <span>0:00</span>
        </div>
      </div>
      <div class="controls">
        <button class="control-btn" onclick="toggleShuffle()">🔀</button>
        <button class="control-btn" onclick="playPreviousVideo()">⏮</button>
        <button class="play-btn" id="playBtn" onclick="togglePlay()">▶</button>
        <button class="control-btn" onclick="playNextVideo()">⏭</button>
        <button class="control-btn" onclick="toggleRepeat()">🔁</button>
      </div>
    </div>
  `;

  resultsContainer.appendChild(songDiv);
  closeSearch();
  if (player) {
    player.loadVideoById(videoId);
    player.playVideo();
  }
  fetchLyrics(title, artist);
}

function fetchLyrics(title, artist) {
  console.log(`Fetching lyrics for ${title} by ${artist}`);
  setTimeout(() => {
    lyrics = generateMockLyrics();
    currentLyricIndex = 0;
    const lyricsDisplay = document.getElementById('lyricsDisplay');
    if (lyricsDisplay) {
      lyricsDisplay.innerHTML = '';
      lyrics.forEach((line, index) => {
        const lineDiv = document.createElement('div');
        lineDiv.className = 'lyrics-line';
        lineDiv.textContent = line.text;
        if (index === 0) lineDiv.classList.add('active');
        lyricsDisplay.appendChild(lineDiv);
      });
    }
  }, 1000);
}

function generateMockLyrics() {
  const lines = [
    "This is the first line of the song",
    "This line comes a bit later",
    "The chorus starts here",
    "Sing it loud, sing it proud",
    "Back to the verse now",
    "The story continues",
    "Building up to the climax",
    "The most powerful part",
    "Coming down slowly",
    "Final words of the song"
  ];
  return lines.map((text, i) => ({ text: text, time: i * 10 }));
}

function togglePlay() {
  if (!player) return;
  if (isPlaying) {
    player.pauseVideo();
  } else {
    player.playVideo();
  }
}

function playNextVideo() {
  if (searchResults.length === 0) return;
  currentVideoIndex = (currentVideoIndex + 1) % searchResults.length;
  const nextVideo = searchResults[currentVideoIndex];
  playVideo(nextVideo.id.videoId, nextVideo.snippet.title, nextVideo.snippet.channelTitle, nextVideo.snippet.thumbnails?.medium?.url || nextVideo.snippet.thumbnails?.default?.url);
}

function playPreviousVideo() {
  if (searchResults.length === 0) return;
  currentVideoIndex = (currentVideoIndex - 1 + searchResults.length) % searchResults.length;
  const prevVideo = searchResults[currentVideoIndex];
  playVideo(prevVideo.id.videoId, prevVideo.snippet.title, prevVideo.snippet.channelTitle, prevVideo.snippet.thumbnails?.medium?.url || prevVideo.snippet.thumbnails?.default?.url);
}

function toggleShuffle() {
  console.log('Shuffle toggled');
}

function toggleRepeat() {
  console.log('Repeat toggled');
}

function startProgressTracking() {
  clearInterval(progressInterval);
  const progressBar = document.getElementById('progressBar');
  const timeDisplay = document.getElementById('timeDisplay');
  const progressBarContainer = document.getElementById('progressBarContainer');
  progressInterval = setInterval(() => {
    if (player && player.getCurrentTime) {
      const currentTime = player.getCurrentTime();
      const duration = player.getDuration();
      const progressPercent = (currentTime / duration) * 100;
      if (progressBar) progressBar.style.width = `${progressPercent}%`;
      if (timeDisplay) {
        timeDisplay.innerHTML = `
          <span>${formatTime(currentTime)}</span>
          <span>${formatTime(duration)}</span>
        `;
      }
    }
  }, 1000);
  if (progressBarContainer) {
    progressBarContainer.addEventListener('click', (e) => {
      if (!player || !player.getDuration) return;
      const rect = progressBarContainer.getBoundingClientRect();
      const clickPosition = (e.clientX - rect.left) / rect.width;
      const duration = player.getDuration();
      const seekTime = duration * clickPosition;
      player.seekTo(seekTime, true);
    });
  }
}

function startLyricsTracking() {
  const lyricsInterval = setInterval(() => {
    if (!isPlaying || lyrics.length === 0) return;
    const lyricsLines = document.querySelectorAll('.lyrics-line');
    if (lyricsLines.length === 0) {
      clearInterval(lyricsInterval);
      return;
    }
    lyricsLines.forEach(line => line.classList.remove('active'));
    currentLyricIndex = (currentLyricIndex + 1) % lyrics.length;
    lyricsLines[currentLyricIndex].classList.add('active');
    lyricsLines[currentLyricIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 3000);
}

function handleTouchStart(e) {
  touchStartY = e.touches[0].clientY;
}

function handleTouchEnd(e) {
  if (!touchStartY) return;
  const touchEndY = e.changedTouches[0].clientY;
  const diffY = touchStartY - touchEndY;
  if (Math.abs(diffY) > 50) {
    if (diffY > 0) playNextVideo();
    else playPreviousVideo();
  }
  touchStartY = 0;
}

function formatTime(seconds) {
  if (isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function showLoader() {
  loader.style.display = 'block';
}

function hideLoader() {
  loader.style.display = 'none';
}
