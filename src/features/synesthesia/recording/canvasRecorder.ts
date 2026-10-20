export interface RecorderOptions {
  canvas: HTMLCanvasElement;
  audioDestination?: GainNode | null;
  audioContext?: AudioContext | null;
  fps?: number;
}

export type RecorderState = 'idle' | 'recording' | 'processing' | 'finished' | 'error';

export class SynesthesiaRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private state: RecorderState = 'idle';
  private outputBlob: Blob | null = null;
  private outputUrl: string | null = null;

  public getState(): RecorderState {
    return this.state;
  }

  public getOutputUrl(): string | null {
    return this.outputUrl;
  }

  public getOutputBlob(): Blob | null {
    return this.outputBlob;
  }

  public startRecording(options: RecorderOptions): boolean {
    if (this.state === 'recording') return false;

    try {
      this.cleanupPrevious();

      const { canvas, audioDestination, audioContext, fps = 60 } = options;
      const canvasStream = canvas.captureStream(fps);

      let combinedStream = canvasStream;

      // If Web Audio is active, capture audio stream and combine
      if (audioDestination && audioContext && audioContext.createMediaStreamDestination) {
        const audioStreamDest = audioContext.createMediaStreamDestination();
        audioDestination.connect(audioStreamDest);
        const audioTracks = audioStreamDest.stream.getAudioTracks();
        if (audioTracks.length > 0) {
          combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...audioTracks,
          ]);
        }
      }

      // Check supported MIME types
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 4000000,
      });

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstart = () => {
        this.state = 'recording';
      };

      this.mediaRecorder.onerror = () => {
        this.state = 'error';
      };

      this.mediaRecorder.start(250); // Collect slice every 250ms
      return true;
    } catch (err) {
      console.error('Failed to initiate canvas recording:', err);
      this.state = 'error';
      return false;
    }
  }

  public stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.state !== 'recording') {
        reject(new Error('Recorder is not currently recording.'));
        return;
      }

      this.state = 'processing';

      this.mediaRecorder.onstop = () => {
        try {
          const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
          this.outputBlob = blob;
          this.outputUrl = URL.createObjectURL(blob);
          this.state = 'finished';
          resolve(blob);
        } catch (e) {
          this.state = 'error';
          reject(e);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  public downloadRecording(filename = 'sonara_synesthesia_visual.webm'): void {
    if (!this.outputUrl) return;

    const a = document.createElement('a');
    a.href = this.outputUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  public cleanupPrevious(): void {
    if (this.outputUrl) {
      URL.revokeObjectURL(this.outputUrl);
      this.outputUrl = null;
    }
    this.outputBlob = null;
    this.recordedChunks = [];
    this.state = 'idle';
  }
}

