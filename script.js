// Replace with your actual YouTube API key
const API_KEY = 'AIzaSyAz3LnhWy_Ciz6I74NvUVfb3J4XSj8Jw_M';
let player;
let currentVideoId = '';
let currentVideoIndex = -1;
let searchResults = [];
let isPlaying = false;
let progressInterval;
let touchStartY = 0;
let searchDebounceTimer;
let isDraggingProgress = false;
let lastPlayedIndex = -1;
let recentSongs = JSON.parse(localStorage.getItem('recentSongs')) || [];
let favoriteSongs = JSON.parse(localStorage.getItem('favoriteSongs')) || [];
let isShuffleOn = false;
let isRepeatOn = false;
let backgroundAudio = document.getElementById('backgroundAudio');
let audioContext;
let analyser;
let dataArray;
let animationId;
let visualizerBars = [];

// DOM Elements
const searchModal = document.getElementById('searchModal');
const searchInput = document.getElementById('searchInput');
const searchResultsDiv = document.getElementById('searchResults');
const resultsContainer = document.getElementById('results');
const loader = document.getElementById('loader');
const homeContent = document.getElementById('homeContent');
const libraryContent = document.getElementById('libraryContent');
const settingsContent = document.getElementById('settingsContent');
const recentSongsDiv = document.getElementById('recentSongs');
const favoritesList = document.getElementById('favoritesList');
const playerSection = document.getElementById('playerSection');
const likeBtn = document.getElementById('likeBtn');
const likeCount = document.getElementById('likeCount');
const nowPlayingTitle = document.getElementById('nowPlayingTitle');
const nowPlayingArtist = document.getElementById('nowPlayingArtist');
const likeContainer = document.getElementById('likeContainer');
const songBg = document.getElementById('songBg');
const songThumbnail = document.getElementById('songThumbnail');
const tapOverlay = document.getElementById('tapOverlay');
const tapIcon = document.getElementById('tapIcon');
const visualizer = document.getElementById('visualizer');
const visualizerAudio = document.getElementById('visualizerAudio');

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('touchstart', handleTouchStart, false);
    document.addEventListener('touchend', handleTouchEnd, false);
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('keypress', handleSearchKeyPress);
    updateRecentSongsDisplay();
    updateFavoritesDisplay();
    
    // Setup tap to play/pause
    tapOverlay.addEventListener('click', function(e) {
        togglePlayWithAnimation();
    });
    
    // Start background music
    playBackgroundMusic();
    
    // Initialize visualizer bars
    initVisualizer();
});

function initVisualizer() {
    visualizer.innerHTML = '';
    visualizerBars = [];
    
    for (let i = 0; i < 30; i++) {
        const bar = document.createElement('div');
        bar.className = 'visualizer-bar';
        bar.style.height = '1px';
        visualizer.appendChild(bar);
        visualizerBars.push(bar);
    }
}

function initAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        
        const source = audioContext.createMediaElementSource(visualizerAudio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
        
        dataArray = new Uint8Array(analyser.frequencyBinCount);
    }
}

function updateVisualizer() {
    if (!analyser) return;
    
    analyser.getByteFrequencyData(dataArray);
    
    for (let i = 0; i < visualizerBars.length; i++) {
        const index = Math.floor(i * (dataArray.length / visualizerBars.length));
        const value = dataArray[index] / 255;
        const height = value * 20;
        visualizerBars[i].style.height = `${height}px`;
        visualizerBars[i].style.opacity = 0.5 + (value * 0.5);
    }
    
    animationId = requestAnimationFrame(updateVisualizer);
}

function stopVisualizer() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    for (let bar of visualizerBars) {
        bar.style.height = '1px';
        bar.style.opacity = '0.5';
    }
}

function playBackgroundMusic() {
    // You can replace this with your background music URL
    backgroundAudio.src = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
    backgroundAudio.volume = 0.3; // Lower volume for background music
    backgroundAudio.play().catch(e => console.log('Background audio play failed:', e));
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
    const timeDisplay = document.getElementById('timeDisplay');
    const progressBar = document.getElementById('progressBar');
    const playBtn = document.getElementById('playBtn');
    
    switch(event.data) {
        case YT.PlayerState.PLAYING:
            isPlaying = true;
            if (playBtn) playBtn.textContent = '❚❚';
            startProgressTracking();
            
            // Start visualizer when playing
            initAudioContext();
            visualizerAudio.src = `https://www.youtube.com/watch?v=${currentVideoId}`;
            visualizerAudio.play().catch(e => console.log('Visualizer audio play failed:', e));
            updateVisualizer();
            break;
            
        case YT.PlayerState.PAUSED:
            isPlaying = false;
            if (playBtn) playBtn.textContent = '▶';
            if (!isDraggingProgress) {
                clearInterval(progressInterval);
            }
            
            // Pause visualizer
            visualizerAudio.pause();
            stopVisualizer();
            break;
            
        case YT.PlayerState.ENDED:
            isPlaying = false;
            if (playBtn) playBtn.textContent = '▶';
            clearInterval(progressInterval);
            
            // Stop visualizer
            visualizerAudio.pause();
            stopVisualizer();
            
            if (isRepeatOn) {
                player.playVideo();
            } else {
                playNextVideo();
            }
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
    
    // Hide all content sections
    homeContent.style.display = 'none';
    libraryContent.style.display = 'none';
    settingsContent.style.display = 'none';
    playerSection.style.display = 'none';
    likeContainer.style.display = 'none';
    searchModal.style.display = 'none';
    
    // Show the selected tab content
    if (tab === 'home') {
        homeContent.style.display = 'block';
    } else if (tab === 'search') {
        openSearch();
    } else if (tab === 'library') {
        libraryContent.style.display = 'block';
        updateFavoritesDisplay();
    } else if (tab === 'settings') {
        settingsContent.style.display = 'block';
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
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
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
        // Use high quality thumbnail if available
        const thumbnail = item.snippet.thumbnails?.high?.url || 
                         item.snippet.thumbnails?.medium?.url || 
                         item.snippet.thumbnails?.default?.url;
        
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
    // If this song is from recent/favorites but not in current search results,
    // create a temporary search result item
    const isFromSearch = searchResults.some(item => item.id.videoId === videoId);
    if (!isFromSearch) {
        searchResults = [{
            id: { videoId: videoId },
            snippet: {
                title: title,
                channelTitle: artist,
                thumbnails: {
                    default: { url: thumbnail },
                    medium: { url: thumbnail },
                    high: { url: thumbnail }
                }
            }
        }];
        currentVideoIndex = 0;
    }
    
    if (lastPlayedIndex === currentVideoIndex && currentVideoId === videoId) {
        return;
    }
    
    currentVideoId = videoId;
    lastPlayedIndex = currentVideoIndex;
    
    // Add to recent songs if not already there
    addToRecentSongs({
        videoId,
        title,
        artist,
        thumbnail
    });
    
    // Update the player section with HD thumbnail
    const hdThumbnail = thumbnail.replace('default.jpg', 'hqdefault.jpg') || 
                       thumbnail.replace('mqdefault.jpg', 'hqdefault.jpg') || 
                       thumbnail;
    
    songBg.style.backgroundImage = `url(${hdThumbnail})`;
    songThumbnail.src = hdThumbnail;
    nowPlayingTitle.textContent = title;
    nowPlayingArtist.textContent = artist;
    
    // Activate background and thumbnail
    songBg.classList.add('active');
    songThumbnail.classList.add('active');
    
    // Hide all content sections and show player
    homeContent.style.display = 'none';
    libraryContent.style.display = 'none';
    settingsContent.style.display = 'none';
    searchModal.style.display = 'none';
    
    // Activate player section
    playerSection.classList.add('active');
    playerSection.style.display = 'flex';
    
    // Show like button
    likeContainer.style.display = 'flex';
    
    // Update like button
    updateLikeButton();
    
    // Initialize YouTube player if not already done
    if (typeof YT === 'undefined' || typeof YT.Player === 'undefined') {
        loadYouTubeAPI();
        // Wait for API to load
        const checkReady = setInterval(() => {
            if (typeof YT !== 'undefined' && typeof YT.Player !== 'undefined') {
                clearInterval(checkReady);
                initAndPlayVideo(videoId);
            }
        }, 100);
    } else {
        initAndPlayVideo(videoId);
    }
    
    setupProgressBarDrag();
}

function initAndPlayVideo(videoId) {
    if (!player) {
        player = new YT.Player('youtube-player', {
            height: '0',
            width: '0',
            videoId: videoId,
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange
            }
        });
    } else {
        player.loadVideoById(videoId);
        if (isPlaying) {
            player.playVideo();
        }
    }
}

function updateLikeButton() {
    const isFavorite = favoriteSongs.some(song => song.videoId === currentVideoId);
    likeBtn.innerHTML = isFavorite ? '❤️' : '🤍';
    likeBtn.classList.toggle('active', isFavorite);
}

function addToRecentSongs(song) {
    // Remove if already exists
    recentSongs = recentSongs.filter(s => s.videoId !== song.videoId);
    
    // Add to beginning
    recentSongs.unshift(song);
    
    // Keep only the last 10 songs
    if (recentSongs.length > 10) {
        recentSongs = recentSongs.slice(0, 10);
    }
    
    // Save to localStorage
    localStorage.setItem('recentSongs', JSON.stringify(recentSongs));
    
    // Update the display
    updateRecentSongsDisplay();
}

function updateRecentSongsDisplay() {
    recentSongsDiv.innerHTML = '';
    
    if (recentSongs.length === 0) {
        recentSongsDiv.innerHTML = '<div style="color: var(--text-secondary); grid-column: span 2; text-align: center;">No recently played songs</div>';
        return;
    }
    
    recentSongs.forEach(song => {
        // Use high quality thumbnail if available
        const hdThumbnail = song.thumbnail.replace('default.jpg', 'hqdefault.jpg') || 
                           song.thumbnail.replace('mqdefault.jpg', 'hqdefault.jpg') || 
                           song.thumbnail;
        
        const songCard = document.createElement('div');
        songCard.className = 'song-card';
        songCard.onclick = () => {
            // Update searchResults to include this song if it's not already there
            const existsInSearch = searchResults.some(item => item.id.videoId === song.videoId);
            if (!existsInSearch) {
                searchResults = [{
                    id: { videoId: song.videoId },
                    snippet: {
                        title: song.title,
                        channelTitle: song.artist,
                        thumbnails: {
                            default: { url: song.thumbnail },
                            medium: { url: song.thumbnail },
                            high: { url: hdThumbnail }
                        }
                    }
                }, ...searchResults];
            }
            
            // Find the index in searchResults
            currentVideoIndex = searchResults.findIndex(item => item.id.videoId === song.videoId);
            playVideo(song.videoId, song.title, song.artist, hdThumbnail);
        };
        
        songCard.innerHTML = `
            <img src="${hdThumbnail}" class="song-card-thumbnail">
            <div class="song-card-info">
                <div class="song-card-title">${song.title}</div>
                <div class="song-card-artist">${song.artist}</div>
            </div>
        `;
        
        recentSongsDiv.appendChild(songCard);
    });
}

function toggleFavorite() {
    const videoId = currentVideoId;
    const currentSong = {
        videoId,
        title: nowPlayingTitle.textContent,
        artist: nowPlayingArtist.textContent,
        thumbnail: songThumbnail.src
    };
    
    // Check if already a favorite
    const existingIndex = favoriteSongs.findIndex(song => song.videoId === videoId);
    
    if (existingIndex >= 0) {
        // Remove from favorites
        favoriteSongs.splice(existingIndex, 1);
        likeBtn.innerHTML = '🤍';
        likeBtn.classList.remove('active');
    } else {
        // Add to favorites
        favoriteSongs.push(currentSong);
        likeBtn.innerHTML = '❤️';
        likeBtn.classList.add('active');
        
        // Animation effect
        likeBtn.style.transform = 'scale(1.2)';
        setTimeout(() => {
            likeBtn.style.transform = 'scale(1)';
        }, 200);
    }
    
    // Save to localStorage
    localStorage.setItem('favoriteSongs', JSON.stringify(favoriteSongs));
    
    // Update favorites display if we
