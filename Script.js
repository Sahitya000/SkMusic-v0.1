// List of YouTube video IDs (you can replace with your own)
const songs = [
  { title: "Alone - Alan Walker", id: "60ItHLz5WEA" },
  { title: "Faded - Alan Walker", id: "60ItHLz5WEA" },
  { title: "Lily - Alan Walker", id: "mRD0-GxqHVo" },
  { title: "On My Way", id: "dhYOPzcsbGM" }
];

let current = 0;

function loadSong(index) {
  const videoId = songs[index].id;
  const title = songs[index].title;
  document.getElementById("player").src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
  document.getElementById("song-title").innerText = `Now Playing: ${title}`;
}

loadSong(current);

// Detect scroll direction
let lastScroll = 0;
window.addEventListener("wheel", (event) => {
  if (event.deltaY < 0) {
    // Scroll Up → next song
    current = (current + 1) % songs.length;
    loadSong(current);
  } else if (event.deltaY > 0) {
    // Scroll Down → previous song (optional)
    current = (current - 1 + songs.length) % songs.length;
    loadSong(current);
  }
});
