/**
 * BRAKE Pro - Audio Manager
 * Web Audio APIを使用して、称号獲得時などのサウンドエフェクトを再生します。
 */

class AudioManager {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isEnabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    // ユーザー操作後に初期化する必要があるため、ここでは何もしない
  }

  private initContext() {
    if (!this.context) {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);
      this.updateVolume();
    }
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.updateVolume();
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  private updateVolume() {
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.isEnabled ? this.volume : 0, this.context?.currentTime || 0, 0.01);
    }
  }

  /**
   * ド派手なお祝いサウンド（ファンファーレ風）を合成して再生
   */
  public playSuccessFanfare() {
    if (!this.isEnabled) return;
    this.initContext();
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;

    // メインのメロディ（トランペット風の矩形波）
    const playNote = (freq: number, start: number, duration: number, vol: number = 0.2) => {
      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();
      
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);
      
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      
      osc.connect(gain);
      gain.connect(this.masterGain!);
      
      osc.start(start);
      osc.stop(start + duration);
    };

    // C4, E4, G4, C5 のアルペジオから始まるファンファーレ
    const tempo = 0.12;
    playNote(261.63, now, tempo * 0.8); // C4
    playNote(329.63, now + tempo, tempo * 0.8); // E4
    playNote(392.00, now + tempo * 2, tempo * 0.8); // G4
    playNote(523.25, now + tempo * 3, tempo * 3, 0.3); // C5 (Long)

    // ハーモニー（サブ）
    playNote(329.63, now + tempo * 3, tempo * 3, 0.1); // E4
    playNote(392.00, now + tempo * 3, tempo * 3, 0.1); // G4

    // キラキラした高音（サイン波）
    const playSparkle = (freq: number, start: number) => {
      const osc = this.context!.createOscillator();
      const gain = this.context!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.2, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.connect(gain);
      gain.connect(this.masterGain!);
      osc.start(start);
      osc.stop(start + 0.5);
    };

    playSparkle(1046.50, now + tempo * 3); // C6
    playSparkle(1318.51, now + tempo * 3.5); // E6
    playSparkle(1567.98, now + tempo * 4); // G6
  }

  /**
   * レベルアップサウンド（上昇感のある力強い音）
   */
  public playLevelUp() {
    if (!this.isEnabled) return;
    this.initContext();
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const duration = 0.8;

    // メインの上昇音（ノコギリ波）
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now); // A3
    osc.frequency.exponentialRampToValueAtTime(880, now + duration); // A5
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(now);
    osc.stop(now + duration);

    // サブの和音（矩形波）
    const playHarmonic = (freq: number, start: number) => {
      const o = this.context!.createOscillator();
      const g = this.context!.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.05, start + 0.05);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
      o.connect(g);
      g.connect(this.masterGain!);
      o.start(start);
      o.stop(start + 0.4);
    };

    playHarmonic(440, now + 0.2); // A4
    playHarmonic(554.37, now + 0.4); // C#5
    playHarmonic(659.25, now + 0.6); // E5
  }

  /**
   * 短い成功音（通知用）
   */
  public playSuccessShort() {
    if (!this.isEnabled) return;
    this.initContext();
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.3);
  }
}

export const audioManager = new AudioManager();
