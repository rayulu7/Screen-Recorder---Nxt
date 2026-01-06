class ProScreenRecorder {
    constructor() {
        
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.startTime = null;
        this.timerInterval = null;
        this.stream = null;
        this.facecamStream = null;
        this.facecamVideo = null;
        this.micStream = null;
        this.audioContext = null;
        this.currentVideoUrl = null;

        
        try {
            this.initializeElements();
            if (!this.startBtn || !this.videoPreview || !this.statusIndicator) {
                throw new Error('Required UI elements are missing. Check HTML structure.');
            }
                    this.attachEventListeners();
        this.initializeAnimations();
        this.initializeKeyboardShortcuts();
        this.updateStatusIndicator('Ready');
        } catch (error) {
            alert('Failed to initialize screen recorder: ' + error.message);
            return;
        }
        
        
        window.addEventListener('beforeunload', () => this.cleanup());
        
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isRecording) {
                this.checkStreamStatus();
            }
        });
        
        if (this.startBtn) this.startBtn.style.display = 'flex';
        if (this.stopBtn) this.stopBtn.style.display = 'none';
    }

    initializeElements() {
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.newRecordingBtn = document.getElementById('newRecordingBtn');
        this.deleteBtn = document.getElementById('deleteBtn');
        this.timer = document.getElementById('timer');
        this.statusIndicator = document.getElementById('statusIndicator');
        this.recordingInfo = document.getElementById('recordingInfo');
        this.downloadSection = document.getElementById('downloadSection');
    this.videoPreview = document.getElementById('recordedVideo');
    
    this.videoInfo = document.querySelector('.video-info') || null;
        this.includeAudio = document.getElementById('includeAudio');
        this.includeMicrophone = document.getElementById('includeMicrophone');
        this.includeFaceCam = document.getElementById('includeFaceCam');
        this.facecamPosition = document.getElementById('facecamPosition');
        this.facecamSize = document.getElementById('facecamSize');
        this.recordingControls = document.getElementById('recordingControls');
        this.facecamOptions = document.getElementById('facecamOptions');
        this.videoDuration = document.getElementById('videoDuration');
        this.videoSize = document.getElementById('videoSize');
    }

    attachEventListeners() {
        if (this.startBtn) this.startBtn.addEventListener('click', () => this.startRecording());
        if (this.stopBtn) this.stopBtn.addEventListener('click', () => this.stopRecording());
        if (this.downloadBtn) this.downloadBtn.addEventListener('click', () => this.downloadRecording());
        if (this.newRecordingBtn) this.newRecordingBtn.addEventListener('click', () => this.resetRecorder());
        if (this.deleteBtn) this.deleteBtn.addEventListener('click', () => this.deleteRecording());
        
        if (this.includeMicrophone) this.includeMicrophone.addEventListener('change', () => {
            if (this.isRecording) {
                this.handleMicrophoneToggle();
            }
        });

        if (this.includeAudio) this.includeAudio.addEventListener('change', () => {
            if (this.isRecording) {
                this.handleSystemAudioToggle();
            }
        });

        if (this.includeFaceCam) this.includeFaceCam.addEventListener('change', () => {
            if (this.includeFaceCam.checked) {
                if (this.facecamOptions) this.facecamOptions.style.display = 'block';
            } else {
                if (this.facecamOptions) this.facecamOptions.style.display = 'none';
            }
            if (this.isRecording) {
                this.handleFaceCamToggle();
            }
        });
        
        this.initializeFaceCamOptions();
    }

    initializeFaceCamOptions() {
        if (this.facecamPosition) this.facecamPosition.addEventListener('change', () => this.updateFaceCamStyle());
        if (this.facecamSize) this.facecamSize.addEventListener('change', () => this.updateFaceCamStyle());
    }

    updateFaceCamStyle() {
        if (!this.facecamVideo) return;
        
        const position = this.facecamPosition.value;
        const size = this.facecamSize.value;
        
        this.facecamVideo.style.position = 'absolute';
        this.facecamVideo.style.zIndex = '1000';
        this.facecamVideo.style.border = '2px solid #00c6ff';
        this.facecamVideo.style.borderRadius = '8px';
        this.facecamVideo.style.boxShadow = '0 4px 20px rgba(0, 198, 255, 0.3)';
        
        const sizeMap = {
            'small': '120px',
            'medium': '180px',
            'large': '250px'
        };
        
        this.facecamVideo.style.width = sizeMap[size] || '180px';
        this.facecamVideo.style.height = 'auto';
        
        const positionMap = {
            'top-left': { top: '20px', left: '20px' },
            'top-right': { top: '20px', right: '20px' },
            'bottom-left': { bottom: '20px', left: '20px' },
            'bottom-right': { bottom: '20px', right: '20px' }
        };
        
        const pos = positionMap[position] || positionMap['bottom-right'];
        Object.assign(this.facecamVideo.style, pos);
    }

    initializeAnimations() {
        this.loadingAnimation = document.createElement('div');
        this.loadingAnimation.className = 'loading-animation';
        this.loadingAnimation.innerHTML = `
            <div class="spinner"></div>
            <div class="loading-text">Initializing...</div>
        `;
        document.body.appendChild(this.loadingAnimation);
    }

    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            
            if (e.code === 'Escape' && this.isRecording) {
                e.preventDefault();
                if (confirm('Do you want to stop the recording?')) {
                    this.stopRecording();
                }
            }

            
            if ((e.code === 'KeyS' || e.code === 'Space') && !this.isRecording && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                if (!this.startBtn || this.startBtn.offsetParent === null) return; 
                this.startRecording();
            }
        });

       
        this.showKeyboardShortcuts();
    }

    showKeyboardShortcuts() {
        
        if (window.innerWidth > 768) {
            const hint = document.createElement('div');
            hint.className = 'keyboard-hint';
            hint.innerHTML = '<i class="fas fa-keyboard"></i> Press <kbd>Space</kbd> or <kbd>S</kbd> to start, <kbd>Esc</kbd> to stop';
            hint.style.display = 'none';
            document.body.appendChild(hint);

            
            setTimeout(() => {
                if (!this.isRecording) {
                    hint.style.display = 'block';
                    setTimeout(() => {
                        hint.style.opacity = '0';
                        setTimeout(() => hint.remove(), 300);
                    }, 4000);
                } else {
                    hint.remove();
                }
            }, 3000);
        }
    }

    showLoadingAnimation() {
        if (this.loadingAnimation) this.loadingAnimation.style.display = 'flex';
    }

    hideLoadingAnimation() {
        if (this.loadingAnimation) this.loadingAnimation.style.display = 'none';
    }

    async startRecording() {
        if (this.isRecording) {
            console.warn('Recording already in progress');
            return;
        }

        try {
            this.updateStatusIndicator('Initializing...');
            this.showLoadingAnimation();
            
           
            if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
                throw new Error('Your browser does not support screen recording. Please use Chrome, Firefox, or Edge.');
            }
            
            if (!navigator.mediaDevices.getDisplayMedia) {
                throw new Error('Screen capture is not supported in this browser. Please use Chrome, Firefox, or Edge.');
            }
            
            
            if (window.isSecureContext === false) {
                throw new Error('Screen recording requires a secure context (HTTPS or localhost).');
            }
            
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    mediaSource: 'screen',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 }
                },
                audio: this.includeAudio.checked
            });
            
            let combinedStream = screenStream;

            if (this.includeFaceCam.checked) {
                try {
                    const constraints = {
                        video: {
                            width: { ideal: 640 },
                            height: { ideal: 480 },
                            frameRate: { ideal: 30 }
                        }
                    };
                    
                    this.facecamStream = await navigator.mediaDevices.getUserMedia(constraints);
                    
                   
                    if (this.facecamStream && this.facecamStream.active) {
                        this.createFaceCamOverlay();
                        this.showNotification('Face cam enabled successfully!', 'success');
                    } else {
                        throw new Error('Face cam stream not active');
                    }
                } catch (facecamError) {
                    console.error('Face cam error:', facecamError);
                    this.includeFaceCam.checked = false;
                    if (this.facecamOptions) this.facecamOptions.style.display = 'none';
                    this.showNotification('Face cam access denied. Recording without face cam.', 'warning');
                }
            }

            if (this.includeMicrophone.checked) {
                try {
                    console.log('Requesting microphone permission...');
                    const micStream = await navigator.mediaDevices.getUserMedia({
                        audio: {
                            echoCancellation: true,
                            noiseSuppression: true,
                            sampleRate: 44100
                        }
                    });

                    console.log('Microphone permission granted!');
                    this.micStream = micStream;
                    this.audioContext = new AudioContext();

                    const destination = this.audioContext.createMediaStreamDestination();
                    const micAudio = this.audioContext.createMediaStreamSource(micStream);
                    micAudio.connect(destination);

                    
                    if (screenStream.getAudioTracks().length > 0) {
                        const screenAudio = this.audioContext.createMediaStreamSource(screenStream);
                        screenAudio.connect(destination);
                    }

                    combinedStream = new MediaStream([
                        ...screenStream.getVideoTracks(),
                        ...destination.stream.getAudioTracks()
                    ]);

                    this.showNotification('Microphone enabled successfully!', 'success');
                } catch (micError) {
                    console.log('Microphone permission denied:', micError);
                    this.includeMicrophone.checked = false;
                    this.showNotification('Microphone access denied. Recording with system audio only.', 'warning');
                }
            }

            this.stream = combinedStream;

            
            const options = {
                mimeType: this.getSupportedMimeType(),
                videoBitsPerSecond: 2500000, 
                audioBitsPerSecond: 128000 
            };

            this.mediaRecorder = new MediaRecorder(combinedStream, options);

            this.stream.getTracks().forEach(track => {
                track.addEventListener('ended', () => {
                    this.checkStreamStatus();
                });
            });

            this.recordedChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.createVideoBlob();
            };

            this.mediaRecorder.start(1000);
            this.isRecording = true;
            this.startTime = Date.now();

            this.updateButtonStates();
            this.showRecordingInfo();
            this.startTimer();
            this.updateStatusIndicator('Recording');

            this.showLivePreview(combinedStream);

            screenStream.getVideoTracks()[0].onended = () => {
                if (this.isRecording) {
                    this.stopRecording();
                }
            };
            
            if (this.includeMicrophone.checked && combinedStream && combinedStream.getAudioTracks().length > 0) {
                combinedStream.getAudioTracks().forEach(audioTrack => {
                    audioTrack.onended = () => {
                        this.showNotification('Microphone access ended', 'info');
                    };
                });
            }

            this.showNotification('Recording started successfully!', 'success');
            this.hideLoadingAnimation();

        } catch (error) {
            this.showNotification(`Failed to start recording: ${error.message}`, 'error');
            this.hideLoadingAnimation();
            this.updateStatusIndicator('Error');
        }
    }

    async handleMicrophoneToggle() {
        if (!this.isRecording) return;

        if (this.includeMicrophone.checked) {
            try {
                const micStream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        sampleRate: 44100
                    }
                });

                this.micStream = micStream;

                
                if (!this.audioContext) {
                    this.audioContext = new AudioContext();
                }

                const destination = this.audioContext.createMediaStreamDestination();
                const micAudio = this.audioContext.createMediaStreamSource(micStream);
                micAudio.connect(destination);

              
                const currentAudioTracks = this.stream.getAudioTracks();
                if (currentAudioTracks.length > 0) {
                    const screenAudio = this.audioContext.createMediaStreamSource(this.stream);
                    screenAudio.connect(destination);
                }

               
                const newAudioTracks = destination.stream.getAudioTracks();
                currentAudioTracks.forEach(track => {
                    this.stream.removeTrack(track);
                });
                newAudioTracks.forEach(track => {
                    this.stream.addTrack(track);
                });

                this.showNotification('Microphone enabled during recording', 'success');
            } catch (error) {
                this.includeMicrophone.checked = false;
                this.showNotification('Microphone access denied', 'error');
            }
        } else {
            if (this.micStream) {
                this.micStream.getTracks().forEach(track => track.stop());
                this.micStream = null;
            }

            
            if (!this.audioContext) {
                this.audioContext = new AudioContext();
            }

            const destination = this.audioContext.createMediaStreamDestination();
            const currentAudioTracks = this.stream.getAudioTracks();

            
            currentAudioTracks.forEach(track => {
                if (!track.label.includes('microphone') && !track.label.includes('mic')) {
                    const screenAudio = this.audioContext.createMediaStreamSource(new MediaStream([track]));
                    screenAudio.connect(destination);
                }
            });

           
            const newAudioTracks = destination.stream.getAudioTracks();
            currentAudioTracks.forEach(track => {
                this.stream.removeTrack(track);
            });
            newAudioTracks.forEach(track => {
                this.stream.addTrack(track);
            });

            this.showNotification('Microphone disabled during recording', 'info');
        }
    }

    handleSystemAudioToggle() {
        this.showNotification('System audio cannot be changed during recording', 'info');
    }

    async handleFaceCamToggle() {
        if (this.includeFaceCam.checked) {
            
            if (!this.isRecording) {
                return;
            }
            
            
            if (!this.facecamStream) {
                try {
                    const constraints = {
                        video: {
                            width: { ideal: 640 },
                            height: { ideal: 480 },
                            frameRate: { ideal: 30 }
                        }
                    };
                    
                    this.facecamStream = await navigator.mediaDevices.getUserMedia(constraints);
                    
                    if (this.facecamStream && this.facecamStream.active) {
                        this.createFaceCamOverlay();
                        this.showNotification('Face cam enabled successfully!', 'success');
                    } else {
                        throw new Error('Face cam stream not active');
                    }
                } catch (error) {
                    console.error('Face cam error:', error);
                    this.includeFaceCam.checked = false;
                    this.showNotification('Face cam access denied', 'warning');
                }
            } else {
                this.createFaceCamOverlay();
            }
        } else {
            this.removeFaceCamOverlay();
        }
    }

    createFaceCamOverlay() {
        if (this.facecamVideo || !this.facecamStream) return;

        this.facecamVideo = document.createElement('video');
        this.facecamVideo.srcObject = this.facecamStream;
        this.facecamVideo.autoplay = true;
        this.facecamVideo.muted = true;
        this.facecamVideo.playsInline = true;
        this.facecamVideo.setAttribute('playsinline', '');
        this.facecamVideo.className = 'facecam-overlay';
        
        
        this.updateFaceCamStyle();
        
       
        document.body.appendChild(this.facecamVideo);
        
        
        this.facecamVideo.onloadedmetadata = () => {
            this.facecamVideo.play().catch(err => {
                console.error('Error playing facecam:', err);
            });
        };
    }

    removeFaceCamOverlay() {
        if (this.facecamVideo) {
            this.facecamVideo.remove();
            this.facecamVideo = null;
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.isRecording = false;
            if (this.stream) {
                this.stream.getTracks().forEach(track => {
                    track.stop();
                });
                this.stream = null;
            }
            if (this.facecamStream) {
                this.facecamStream.getTracks().forEach(track => {
                    track.stop();
                });
                this.facecamStream = null;
            }
            if (this.micStream) {
                this.micStream.getTracks().forEach(track => {
                    track.stop();
                });
                this.micStream = null;
            }
            if (this.audioContext) {
                this.audioContext.close();
                this.audioContext = null;
            }
            this.removeFaceCamOverlay();
            if (this.timerInterval) {
                clearInterval(this.timerInterval);
                this.timerInterval = null;
            }
            if (this.timer) {
                this.timer.textContent = '00:00:00';
            }
            this.updateButtonStates();
            this.hideRecordingInfo();
            this.showDownloadSection();
            this.updateStatusIndicator('Processing...');
            this.showNotification('Recording completed successfully!', 'success');
            
            setTimeout(() => {
                if (this.stream) {
                    this.stream.getTracks().forEach(track => {
                        if (track.readyState !== 'ended') {
                            track.stop();
                        }
                    });
                }
            }, 100);
        }
    }

    createVideoBlob() {
        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        this.currentVideoUrl = URL.createObjectURL(blob);
        this.showVideoPreview();
        this.updateStatusIndicator('Ready');
    }

    showVideoPreview() {
        if (this.videoPreview && this.currentVideoUrl) {
            this.videoPreview.src = this.currentVideoUrl;
            this.videoPreview.style.display = 'block';
            
            this.videoPreview.onloadedmetadata = () => {
                const duration = this.videoPreview.duration;
                const size = this.getFileSize();
                const durationText = this.formatDuration(duration);
                
                if (this.videoDuration) {
                    this.videoDuration.textContent = `Duration: ${durationText}`;
                }
                if (this.videoSize) {
                    this.videoSize.textContent = `Size: ${size}`;
                }
            };
        }
    }

    formatDuration(seconds) {
        if (!isFinite(seconds) || isNaN(seconds) || seconds <= 0) {
            const timerText = this.timer ? this.timer.textContent : '00:00:00';
            return timerText;
        }
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    getFileSize() {
        if (!this.currentVideoUrl) return 'Unknown';
        
        const blob = this.recordedChunks.reduce((acc, chunk) => acc + chunk.size, 0);
        const sizeInMB = (blob / (1024 * 1024)).toFixed(2);
        return `${sizeInMB} MB`;
    }

    downloadRecording() {
        if (this.currentVideoUrl) {
            const a = document.createElement('a');
            a.href = this.currentVideoUrl;
            a.download = `Nxt7Screens_Recording_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.webm`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            this.showNotification('Download started!', 'success');
        }
    }

    deleteRecording() {
        if (this.currentVideoUrl) {
            URL.revokeObjectURL(this.currentVideoUrl);
            this.currentVideoUrl = null;
        }
        if (this.videoPreview) this.videoPreview.style.display = 'none';
        
        if (this.videoDuration) this.videoDuration.textContent = 'Duration: 00:00:00';
        if (this.videoSize) this.videoSize.textContent = 'Size: 0 MB';
        if (this.videoInfo) {
            try { this.videoInfo.innerHTML = ''; } catch (e) { /* ignore */ }
        }
        this.hideDownloadSection();
        this.showNotification('Recording deleted', 'info');
    }

    resetRecorder() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                track.stop();
            });
            this.stream = null;
        }
        if (this.facecamStream) {
            this.facecamStream.getTracks().forEach(track => {
                track.stop();
            });
            this.facecamStream = null;
        }
        if (this.micStream) {
            this.micStream.getTracks().forEach(track => {
                track.stop();
            });
            this.micStream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.removeFaceCamOverlay();
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        if (this.timer) {
            this.timer.textContent = '00:00:00';
        }
        if (this.currentVideoUrl) {
            URL.revokeObjectURL(this.currentVideoUrl);
            this.currentVideoUrl = null;
        }
        this.recordedChunks = [];
        this.isRecording = false;
        this.startTime = null;
        this.mediaRecorder = null;
        this.updateButtonStates();
        this.hideRecordingInfo();
        this.hideDownloadSection();
        this.updateStatusIndicator('Ready');
        this.showNotification('Recorder reset', 'info');
    }

    updateButtonStates() {
        if (this.isRecording) {
            if (this.startBtn) this.startBtn.style.display = 'none';
            if (this.stopBtn) this.stopBtn.style.display = 'flex';
        } else {
            if (this.startBtn) this.startBtn.style.display = 'flex';
            if (this.stopBtn) this.stopBtn.style.display = 'none';
        }
    }

    showRecordingInfo() {
        if (this.recordingInfo) {
            this.recordingInfo.style.display = 'block';
        }
    }

    hideRecordingInfo() {
        if (this.recordingInfo) {
            this.recordingInfo.style.display = 'none';
        }
    }

    showDownloadSection() {
        if (this.downloadSection) {
            this.downloadSection.style.display = 'block';
        }
    }

    hideDownloadSection() {
        if (this.downloadSection) {
            this.downloadSection.style.display = 'none';
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            if (this.startTime) {
                const elapsed = Date.now() - this.startTime;
                const hours = Math.floor(elapsed / 3600000);
                const minutes = Math.floor((elapsed % 3600000) / 60000);
                const seconds = Math.floor((elapsed % 60000) / 1000);
                this.timer.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }

    showLivePreview(stream) {
        const preview = document.getElementById('videoPreview');
        if (preview) {
            const video = document.createElement('video');
            video.srcObject = stream;
            video.autoplay = true;
            video.muted = true;
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.objectFit = 'cover';
            
            preview.innerHTML = '';
            preview.appendChild(video);
        }
    }

    updateStatusIndicator(status) {
        const statusText = this.statusIndicator.querySelector('span');
        const statusDot = this.statusIndicator.querySelector('.status-dot');
        
        if (statusText) statusText.textContent = status;
        
        if (statusDot) {
            statusDot.className = 'status-dot';
            if (status === 'Recording') {
                statusDot.classList.add('recording');
            } else if (status === 'Paused') {
                statusDot.classList.add('paused');
            } else if (status === 'Processing...') {
                statusDot.classList.add('processing');
            }
        }
    }

    checkStreamStatus() {
        if (this.isRecording && this.stream) {
            const videoTracks = this.stream.getVideoTracks();
            if (videoTracks.length === 0 || videoTracks.every(track => track.readyState === 'ended')) {
                this.stopRecording();
            }
        }
    }

    getSupportedMimeType() {
        const types = [
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm;codecs=h264,opus',
            'video/webm;codecs=h264',
            'video/webm',
            'video/mp4',
            ''
        ];
        
       
        if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
            for (const type of types) {
                try {
                    if (type && MediaRecorder.isTypeSupported(type)) {
                        return type;
                    }
                } catch (e) {
                    
                }
            }
        }
        return ''; 
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        
        notification.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
        
        document.body.appendChild(notification);
        
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                if (track.readyState !== 'ended') {
                    track.stop();
                }
            });
            this.stream = null;
        }
        if (this.facecamStream) {
            this.facecamStream.getTracks().forEach(track => {
                if (track.readyState !== 'ended') {
                    track.stop();
                }
            });
            this.facecamStream = null;
        }
        if (this.micStream) {
            this.micStream.getTracks().forEach(track => {
                if (track.readyState !== 'ended') {
                    track.stop();
                }
            });
            this.micStream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        this.removeFaceCamOverlay();
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        if (this.currentVideoUrl) {
            URL.revokeObjectURL(this.currentVideoUrl);
            this.currentVideoUrl = null;
        }
        this.isRecording = false;
        this.startTime = null;
    }
}


window.addEventListener('load', () => {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            alert('Screen recording is not supported in your browser. Please use Chrome, Firefox, or Edge.');
            return;
        }
        new ProScreenRecorder();
    } catch (error) {
        console.error('Failed to initialize screen recorder:', error);
        alert('Could not initialize screen recorder. Please check console for details.');
    }
});
