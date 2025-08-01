
class MusicPlayer {
    constructor() {
        this.audio = document.getElementById('audioPlayer');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.prevBtn = document.getElementById('prevBtn');
        this.nextBtn = document.getElementById('nextBtn');
        this.shuffleBtn = document.getElementById('shuffleBtn');
        this.repeatBtn = document.getElementById('repeatBtn');
        this.progressBar = document.querySelector('.progress-bar');
        this.progress = document.getElementById('progress');
        this.progressHandle = document.getElementById('progressHandle');
        this.currentTimeEl = document.getElementById('currentTime');
        this.durationEl = document.getElementById('duration');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.muteBtn = document.getElementById('muteBtn');
        this.trackTitle = document.getElementById('trackTitle');
        this.trackArtist = document.getElementById('trackArtist');
        this.albumArt = document.getElementById('albumArt');
        this.audioUpload = document.getElementById('audioUpload');
        this.playlistContainer = document.querySelector('.playlist-container');
        this.emptyPlaylist = document.getElementById('emptyPlaylist');
        this.trackCountEl = document.getElementById('trackCount');
        this.totalDurationEl = document.getElementById('totalDuration');
        this.clearPlaylistBtn = document.getElementById('clearPlaylistBtn');
        this.savePlaylistBtn = document.getElementById('savePlaylistBtn');
        this.contextMenu = document.getElementById('contextMenu');
        this.toastContainer = document.getElementById('toastContainer');
        this.volumeValue = document.querySelector('.volume-value');
        
        this.playlist = [];
        this.currentTrackIndex = 0;
        this.isPlaying = false;
        this.isDragging = false;
        this.lastProgressUpdate = 0;
        this.isShuffleMode = false;
        this.repeatMode = 'none'; // none, one, all
        this.isMuted = false;
        this.lastVolume = 50;
        this.currentContextTrackIndex = -1;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadStoredData();
        this.updateUI();
        this.showToast('Music Player loaded successfully!', 'success');
        console.log('🎵 Music Player initialized');
    }
    
    setupEventListeners() {
        // Play/Pause button
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        
        // Previous/Next buttons
        this.prevBtn.addEventListener('click', () => this.previousTrack());
        this.nextBtn.addEventListener('click', () => this.nextTrack());
        
        // Shuffle and repeat buttons
        this.shuffleBtn.addEventListener('click', () => this.toggleShuffle());
        this.repeatBtn.addEventListener('click', () => this.toggleRepeat());
        
        // Progress bar
        this.progressBar.addEventListener('click', (e) => this.setProgress(e));
        this.progressHandle.addEventListener('mousedown', () => this.startDragging());
        document.addEventListener('mousemove', (e) => this.handleDragging(e));
        document.addEventListener('mouseup', () => this.stopDragging());
        
        // Volume control
        this.volumeSlider.addEventListener('input', (e) => this.setVolume(e.target.value));
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        
        // Audio events
        this.audio.addEventListener('loadedmetadata', () => this.updateDuration());
        this.audio.addEventListener('timeupdate', () => this.updateProgress());
        this.audio.addEventListener('ended', () => this.handleTrackEnd());
        this.audio.addEventListener('error', (e) => this.handleAudioError(e));
        this.audio.addEventListener('loadstart', () => this.handleLoadStart());
        this.audio.addEventListener('canplay', () => this.handleCanPlay());
        
        // File upload
        this.audioUpload.addEventListener('change', (e) => this.handleFileUpload(e));
        
        // Playlist controls
        this.clearPlaylistBtn.addEventListener('click', () => this.clearPlaylist());
        this.savePlaylistBtn.addEventListener('click', () => this.savePlaylist());
        
        // Context menu
        document.addEventListener('contextmenu', (e) => this.handleRightClick(e));
        document.addEventListener('click', () => this.hideContextMenu());
        this.contextMenu.addEventListener('click', (e) => this.handleContextMenuClick(e));
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Window events
        window.addEventListener('beforeunload', () => this.saveStoredData());
        window.addEventListener('focus', () => this.handleWindowFocus());
        
        // Media Session API
        if ('mediaSession' in navigator) {
            this.setupMediaSession();
        }
    }
    
    loadStoredData() {
        try {
            const storedData = localStorage.getItem('musicPlayerData');
            if (storedData) {
                const data = JSON.parse(storedData);
                this.playlist = data.playlist || [];
                this.currentTrackIndex = Math.max(0, Math.min(data.currentTrackIndex || 0, this.playlist.length - 1));
                this.isShuffleMode = data.isShuffleMode || false;
                this.repeatMode = data.repeatMode || 'none';
                this.lastVolume = data.volume || 50;
                this.setVolume(this.lastVolume);
                
                if (this.playlist.length > 0) {
                    this.loadTrack(this.currentTrackIndex);
                }
            }
        } catch (error) {
            console.error('Error loading stored data:', error);
            this.showToast('Error loading saved data', 'error');
        }
    }
    
    saveStoredData() {
        try {
            const data = {
                playlist: this.playlist,
                currentTrackIndex: this.currentTrackIndex,
                isShuffleMode: this.isShuffleMode,
                repeatMode: this.repeatMode,
                volume: this.volumeSlider.value
            };
            localStorage.setItem('musicPlayerData', JSON.stringify(data));
        } catch (error) {
            console.error('Error saving data:', error);
            this.showToast('Error saving data', 'error');
        }
    }
    
    togglePlayPause() {
        if (this.playlist.length === 0) {
            this.showToast('Please add some music to your playlist', 'warning');
            return;
        }
        
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }
    
    async play() {
        try {
            await this.audio.play();
            this.isPlaying = true;
            this.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
            document.body.classList.add('playing');
            this.updateMediaSession();
        } catch (error) {
            console.error('Error playing audio:', error);
            this.showToast('Error playing audio', 'error');
            this.isPlaying = false;
        }
    }
    
    pause() {
        this.audio.pause();
        this.isPlaying = false;
        this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        document.body.classList.remove('playing');
        this.updateMediaSession();
    }
    
    previousTrack() {
        if (this.playlist.length === 0) return;
        
        if (this.isShuffleMode) {
            this.currentTrackIndex = Math.floor(Math.random() * this.playlist.length);
        } else {
            this.currentTrackIndex = this.currentTrackIndex === 0 
                ? this.playlist.length - 1 
                : this.currentTrackIndex - 1;
        }
        
        this.loadTrack(this.currentTrackIndex);
        if (this.isPlaying) this.play();
    }
    
    nextTrack() {
        if (this.playlist.length === 0) return;
        
        if (this.isShuffleMode) {
            this.currentTrackIndex = Math.floor(Math.random() * this.playlist.length);
        } else {
            this.currentTrackIndex = (this.currentTrackIndex + 1) % this.playlist.length;
        }
        
        this.loadTrack(this.currentTrackIndex);
        if (this.isPlaying) this.play();
    }
    
    handleTrackEnd() {
        switch (this.repeatMode) {
            case 'one':
                this.audio.currentTime = 0;
                this.play();
                break;
            case 'all':
                this.nextTrack();
                break;
            default:
                if (this.currentTrackIndex < this.playlist.length - 1 || this.isShuffleMode) {
                    this.nextTrack();
                } else {
                    this.pause();
                    this.audio.currentTime = 0;
                }
                break;
        }
    }
    
    toggleShuffle() {
        this.isShuffleMode = !this.isShuffleMode;
        this.shuffleBtn.classList.toggle('active', this.isShuffleMode);
        this.showToast(`Shuffle ${this.isShuffleMode ? 'enabled' : 'disabled'}`, 'success');
        this.saveStoredData();
    }
    
    toggleRepeat() {
        const modes = ['none', 'all', 'one'];
        const currentIndex = modes.indexOf(this.repeatMode);
        this.repeatMode = modes[(currentIndex + 1) % modes.length];
        
        this.repeatBtn.classList.remove('active');
        let icon = 'fas fa-redo';
        
        switch (this.repeatMode) {
            case 'all':
                this.repeatBtn.classList.add('active');
                icon = 'fas fa-redo';
                break;
            case 'one':
                this.repeatBtn.classList.add('active');
                icon = 'fas fa-redo';
                this.repeatBtn.innerHTML = '<i class="fas fa-redo"></i><span style="font-size: 0.6rem; position: absolute; bottom: 2px; right: 2px;">1</span>';
                break;
            default:
                icon = 'fas fa-redo';
                break;
        }
        
        if (this.repeatMode !== 'one') {
            this.repeatBtn.innerHTML = `<i class="${icon}"></i>`;
        }
        
        this.showToast(`Repeat: ${this.repeatMode}`, 'success');
        this.saveStoredData();
    }
    
    toggleMute() {
        if (this.isMuted) {
            this.setVolume(this.lastVolume);
            this.isMuted = false;
            this.muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        } else {
            this.lastVolume = this.volumeSlider.value;
            this.setVolume(0);
            this.isMuted = true;
            this.muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        }
    }
    
    loadTrack(index) {
        if (!this.playlist[index]) return;
        
        const track = this.playlist[index];
        this.audio.src = track.src;
        this.trackTitle.textContent = track.title;
        this.trackArtist.textContent = track.artist;
        this.albumArt.src = track.albumArt || this.getDefaultAlbumArt();
        
        this.updatePlaylistDisplay();
        this.resetProgress();
        this.updateMediaSession();
        this.saveStoredData();
    }
    
    setProgress(e) {
        if (this.audio.duration) {
            const rect = this.progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const newTime = percent * this.audio.duration;
            this.audio.currentTime = Math.max(0, Math.min(newTime, this.audio.duration));
        }
    }
    
    startDragging() {
        this.isDragging = true;
        this.progressBar.classList.add('dragging');
    }
    
    handleDragging(e) {
        if (!this.isDragging || !this.audio.duration) return;
        
        const rect = this.progressBar.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newTime = percent * this.audio.duration;
        this.audio.currentTime = newTime;
    }
    
    stopDragging() {
        this.isDragging = false;
        this.progressBar.classList.remove('dragging');
    }
    
    updateProgress() {
        const now = Date.now();
        if (!this.isDragging && this.audio.duration && (now - this.lastProgressUpdate > 100)) {
            this.lastProgressUpdate = now;
            requestAnimationFrame(() => {
                const percent = (this.audio.currentTime / this.audio.duration) * 100;
                this.progress.style.width = percent + '%';
                this.progressHandle.style.left = percent + '%';
                this.currentTimeEl.textContent = this.formatTime(this.audio.currentTime);
            });
        }
    }
    
    updateDuration() {
        this.durationEl.textContent = this.formatTime(this.audio.duration);
        this.updateTotalDuration();
    }
    
    resetProgress() {
        this.progress.style.width = '0%';
        this.progressHandle.style.left = '0%';
        this.currentTimeEl.textContent = '0:00';
        this.durationEl.textContent = '0:00';
    }
    
    setVolume(value) {
        this.audio.volume = Math.max(0, Math.min(1, value / 100));
        this.volumeSlider.value = value;
        this.volumeValue.textContent = Math.round(value) + '%';
        
        // Update mute button icon
        if (value == 0) {
            this.muteBtn.innerHTML = '<i class="fas fa-volume-mute"></i>';
        } else if (value < 50) {
            this.muteBtn.innerHTML = '<i class="fas fa-volume-down"></i>';
        } else {
            this.muteBtn.innerHTML = '<i class="fas fa-volume-up"></i>';
        }
    }
    
    formatTime(seconds) {
        if (isNaN(seconds) || seconds === Infinity) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    async handleFileUpload(e) {
        const files = Array.from(e.target.files);
        let addedCount = 0;
        
        for (const file of files) {
            if (file.type.startsWith('audio/')) {
                try {
                    const track = await this.createTrackFromFile(file);
                    this.playlist.push(track);
                    addedCount++;
                } catch (error) {
                    console.error('Error processing file:', file.name, error);
                    this.showToast(`Error processing ${file.name}`, 'error');
                }
            }
        }
        
        if (addedCount > 0) {
            this.updatePlaylistDisplay();
            this.updateUI();
            this.saveStoredData();
            this.showToast(`Added ${addedCount} track${addedCount > 1 ? 's' : ''} to playlist`, 'success');
            
            // If no track is loaded, load the first uploaded track
            if (this.playlist.length === addedCount) {
                this.loadTrack(0);
            }
        }
        
        // Clear the file input
        e.target.value = '';
    }
    
    async createTrackFromFile(file) {
        const url = URL.createObjectURL(file);
        
        // Extract metadata if possible
        const metadata = await this.extractMetadata(file);
        
        return {
            title: metadata.title || file.name.replace(/\.[^/.]+$/, ""),
            artist: metadata.artist || 'Unknown Artist',
            album: metadata.album || 'Unknown Album',
            src: url,
            albumArt: metadata.albumArt || this.getDefaultAlbumArt(),
            duration: metadata.duration || 0,
            fileSize: file.size,
            originalFile: file
        };
    }
    
    async extractMetadata(file) {
        // Basic metadata extraction (can be enhanced with jsmediatags library)
        return new Promise((resolve) => {
            const audio = new Audio();
            const url = URL.createObjectURL(file);
            
            audio.addEventListener('loadedmetadata', () => {
                resolve({
                    duration: audio.duration,
                    title: null,
                    artist: null,
                    album: null,
                    albumArt: null
                });
                URL.revokeObjectURL(url);
            });
            
            audio.addEventListener('error', () => {
                resolve({
                    duration: 0,
                    title: null,
                    artist: null,
                    album: null,
                    albumArt: null
                });
                URL.revokeObjectURL(url);
            });
            
            audio.src = url;
        });
    }
    
    updatePlaylistDisplay() {
        // Remove existing playlist items
        const existingItems = this.playlistContainer.querySelectorAll('.playlist-item:not(.upload-section)');
        existingItems.forEach(item => item.remove());
        
        if (this.playlist.length === 0) {
            this.emptyPlaylist.style.display = 'block';
            return;
        }
        
        this.emptyPlaylist.style.display = 'none';
        
        this.playlist.forEach((track, index) => {
            const item = document.createElement('div');
            item.className = `playlist-item ${index === this.currentTrackIndex ? 'active' : ''}`;
            item.dataset.index = index;
            item.innerHTML = `
                <i class="fas fa-music"></i>
                <div class="track-details">
                    <span class="track-name">${this.escapeHtml(track.title)}</span>
                    <span class="track-artist">${this.escapeHtml(track.artist)}</span>
                </div>
                <span class="track-duration">${this.formatTime(track.duration)}</span>
            `;
            
            item.addEventListener('click', () => {
                this.currentTrackIndex = index;
                this.loadTrack(index);
                if (this.isPlaying) this.play();
            });
            
            item.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.currentContextTrackIndex = index;
                this.showContextMenu(e.clientX, e.clientY);
            });
            
            // Insert before upload section
            this.playlistContainer.insertBefore(item, this.playlistContainer.querySelector('.upload-section'));
        });
    }
    
    updateUI() {
        this.trackCountEl.textContent = `${this.playlist.length} track${this.playlist.length !== 1 ? 's' : ''}`;
        this.updateTotalDuration();
        this.shuffleBtn.classList.toggle('active', this.isShuffleMode);
        this.repeatBtn.classList.toggle('active', this.repeatMode !== 'none');
    }
    
    updateTotalDuration() {
        const totalSeconds = this.playlist.reduce((total, track) => total + (track.duration || 0), 0);
        this.totalDurationEl.textContent = this.formatTime(totalSeconds) + ' total';
    }
    
    clearPlaylist() {
        if (this.playlist.length === 0) {
            this.showToast('Playlist is already empty', 'warning');
            return;
        }
        
        if (confirm(`Are you sure you want to clear all ${this.playlist.length} tracks from the playlist?`)) {
            // Revoke object URLs to free memory
            this.playlist.forEach(track => {
                if (track.src.startsWith('blob:')) {
                    URL.revokeObjectURL(track.src);
                }
            });
            
            this.playlist = [];
            this.currentTrackIndex = 0;
            this.pause();
            this.audio.src = '';
            this.trackTitle.textContent = 'Select a song';
            this.trackArtist.textContent = 'Unknown Artist';
            this.albumArt.src = this.getDefaultAlbumArt();
            this.resetProgress();
            this.updatePlaylistDisplay();
            this.updateUI();
            this.saveStoredData();
            this.showToast('Playlist cleared', 'success');
        }
    }
    
    savePlaylist() {
        if (this.playlist.length === 0) {
            this.showToast('No tracks to save', 'warning');
            return;
        }
        
        const playlistData = {
            name: `My Playlist - ${new Date().toLocaleDateString()}`,
            tracks: this.playlist.map(track => ({
                title: track.title,
                artist: track.artist,
                album: track.album,
                duration: track.duration
            })),
            createdAt: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(playlistData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `playlist-${Date.now()}.json`;
        link.click();
        
        URL.revokeObjectURL(link.href);
        this.showToast('Playlist saved successfully', 'success');
    }
    
    handleRightClick(e) {
        const playlistItem = e.target.closest('.playlist-item:not(.upload-section)');
        if (playlistItem) {
            e.preventDefault();
            this.currentContextTrackIndex = parseInt(playlistItem.dataset.index);
            this.showContextMenu(e.clientX, e.clientY);
        }
    }
    
    showContextMenu(x, y) {
        this.contextMenu.style.left = x + 'px';
        this.contextMenu.style.top = y + 'px';
        this.contextMenu.classList.add('show');
        
        // Adjust position if menu goes off-screen
        const rect = this.contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            this.contextMenu.style.left = (x - rect.width) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            this.contextMenu.style.top = (y - rect.height) + 'px';
        }
    }
    
    hideContextMenu() {
        this.contextMenu.classList.remove('show');
    }
    
    handleContextMenuClick(e) {
        const action = e.target.closest('.context-item')?.dataset.action;
        if (!action || this.currentContextTrackIndex === -1) return;
        
        const track = this.playlist[this.currentContextTrackIndex];
        
        switch (action) {
            case 'play':
                this.currentTrackIndex = this.currentContextTrackIndex;
                this.loadTrack(this.currentTrackIndex);
                this.play();
                break;
            case 'remove':
                this.removeTrack(this.currentContextTrackIndex);
                break;
            case 'info':
                this.showTrackInfo(track);
                break;
        }
        
        this.hideContextMenu();
        this.currentContextTrackIndex = -1;
    }
    
    removeTrack(index) {
        if (index < 0 || index >= this.playlist.length) return;
        
        const track = this.playlist[index];
        
        // Revoke object URL if it's a blob
        if (track.src.startsWith('blob:')) {
            URL.revokeObjectURL(track.src);
        }
        
        this.playlist.splice(index, 1);
        
        // Adjust current track index
        if (index === this.currentTrackIndex) {
            if (this.playlist.length === 0) {
                this.pause();
                this.audio.src = '';
                this.trackTitle.textContent = 'Select a song';
                this.trackArtist.textContent = 'Unknown Artist';
                this.albumArt.src = this.getDefaultAlbumArt();
                this.resetProgress();
                this.currentTrackIndex = 0;
            } else {
                this.currentTrackIndex = Math.min(this.currentTrackIndex, this.playlist.length - 1);
                this.loadTrack(this.currentTrackIndex);
            }
        } else if (index < this.currentTrackIndex) {
            this.currentTrackIndex--;
        }
        
        this.updatePlaylistDisplay();
        this.updateUI();
        this.saveStoredData();
        this.showToast('Track removed from playlist', 'success');
    }
    
    showTrackInfo(track) {
        const info = `
            Title: ${track.title}
            Artist: ${track.artist}
            Album: ${track.album || 'Unknown Album'}
            Duration: ${this.formatTime(track.duration)}
            File Size: ${this.formatFileSize(track.fileSize)}
        `;
        alert(info);
    }
    
    formatFileSize(bytes) {
        if (!bytes) return 'Unknown';
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    handleKeyboard(e) {
        // Prevent keyboard actions when typing in input fields
        if (e.target.tagName === 'INPUT') return;
        
        switch(e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePlayPause();
                break;
            case 'ArrowLeft':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.previousTrack();
                } else {
                    e.preventDefault();
                    this.audio.currentTime = Math.max(0, this.audio.currentTime - 10);
                }
                break;
            case 'ArrowRight':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.nextTrack();
                } else {
                    e.preventDefault();
                    this.audio.currentTime = Math.min(this.audio.duration, this.audio.currentTime + 10);
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                const newVolumeUp = Math.min(100, parseInt(this.volumeSlider.value) + 10);
                this.setVolume(newVolumeUp);
                break;
            case 'ArrowDown':
                e.preventDefault();
                const newVolumeDown = Math.max(0, parseInt(this.volumeSlider.value) - 10);
                this.setVolume(newVolumeDown);
                break;
            case 'KeyM':
                e.preventDefault();
                this.toggleMute();
                break;
            case 'KeyS':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.toggleShuffle();
                }
                break;
            case 'KeyR':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.toggleRepeat();
                }
                break;
        }
    }
    
    handleAudioError(e) {
        console.error('Audio error:', e);
        this.pause();
        this.showToast('Error playing audio file', 'error');
    }
    
    handleLoadStart() {
        this.trackTitle.style.opacity = '0.5';
        this.trackArtist.style.opacity = '0.5';
    }
    
    handleCanPlay() {
        this.trackTitle.style.opacity = '1';
        this.trackArtist.style.opacity = '1';
    }
    
    handleWindowFocus() {
        // Refresh audio context if needed
        if (this.audio.paused && this.isPlaying) {
            this.pause();
        }
    }
    
    setupMediaSession() {
        navigator.mediaSession.setActionHandler('play', () => this.play());
        navigator.mediaSession.setActionHandler('pause', () => this.pause());
        navigator.mediaSession.setActionHandler('previoustrack', () => this.previousTrack());
        navigator.mediaSession.setActionHandler('nexttrack', () => this.nextTrack());
        navigator.mediaSession.setActionHandler('seekbackward', () => {
            this.audio.currentTime = Math.max(0, this.audio.currentTime - 10);
        });
        navigator.mediaSession.setActionHandler('seekforward', () => {
            this.audio.currentTime = Math.min(this.audio.duration, this.audio.currentTime + 10);
        });
    }
    
    updateMediaSession() {
        if ('mediaSession' in navigator && this.playlist[this.currentTrackIndex]) {
            const track = this.playlist[this.currentTrackIndex];
            navigator.mediaSession.metadata = new MediaMetadata({
                title: track.title,
                artist: track.artist,
                album: track.album || 'Unknown Album',
                artwork: [
                    { src: track.albumArt, sizes: '200x200', type: 'image/png' }
                ]
            });
        }
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        
        this.toastContainer.appendChild(toast);
        
        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Remove toast after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }
    
    getDefaultAlbumArt() {
        return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%23667eea' width='200' height='200'/%3E%3Ccircle cx='100' cy='100' r='80' fill='%23764ba2' opacity='0.8'/%3E%3Ccircle cx='100' cy='100' r='40' fill='%23fff' opacity='0.9'/%3E%3Ccircle cx='100' cy='100' r='15' fill='%23333'/%3E%3C/svg%3E";
    }
    
    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }
}

// Initialize the music player when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MusicPlayer();
    
    // Service worker registration for PWA features (optional)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(err => {
            console.log('Service worker registration failed:', err);
        });
    }
});
