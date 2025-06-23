// All songs with categories
const allSongs = [
  {
    title: "Kesariya",
    artist: "Arijit Singh",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    thumbnail: "https://i.ytimg.com/vi/BddP6PYo2gs/hqdefault.jpg",
    category: "bollywood"
  },
  {
    title: "Lollipop Lagelu",
    artist: "Pawan Singh",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    thumbnail: "https://i.ytimg.com/vi/pK8xJWp1Aiw/hqdefault.jpg",
    category: "bhojpuri"
  },
  {
    title: "Zingaat",
    artist: "Ajay-Atul",
    audio: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    thumbnail: "https://i.ytimg.com/vi/UcZSOs1g6iU/hqdefault.jpg",
    category: "marathi"
  }
];

let filteredSongs = [...allSongs];
let current = 0;

function loadSong(index) {
  const song = filteredSongs[index];
  document.getElementById("audio").src = song.audio;
  document.getElementById("thumbnail").src = song.thumbnail;
  document.getElementById("song-title").textContent = song.title;
  document.getElementById("song-artist").textContent = song.artist;
}

function filterSongs(category) {
  if (category === 'all') {
    filteredSongs = [...allSongs];
  } else {
    filteredSongs = allSongs.filter(song => song.category === category);
  }
  current = 0;
  loadSong(current);
}

document.getElementById("search").addEventListener("input", function () {
  const keyword = this.value.toLowerCase();
  filteredSongs = allSongs.filter(song =>
    song.title.toLowerCase().includes(keyword) ||
    song.artist.toLowerCase().includes(keyword)
  );
  current = 0;
  loadSong(current);
});

window.addEventListener("wheel", (e) => {
  if (e.deltaY < 0) {
    current = (current + 1) % filteredSongs.length;
    loadSong(current);
    document.getElementById("audio").play();
  }
});

loadSong(current); // Load first song
